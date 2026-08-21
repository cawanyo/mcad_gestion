import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastUpdate } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // '1' to '12', 'all'
    const poleId = searchParams.get('poleId');
    const search = searchParams.get('search');

    const now = new Date();
    const currentMonthIndex = now.getMonth(); // 0 to 11
    const currentDay = now.getDate();

    // Fetch users with active status and pole memberships
    const where: any = {
      status: 'ACTIVE'
    };

    if (poleId && poleId !== 'all') {
      where.poleMemberships = {
        some: { poleId }
      };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        poleMemberships: {
          include: {
            pole: true
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const monthShortNames = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
    ];

    // Compute enriched birthday objects
    const allBirthdays: any[] = [];
    const missingBirthdates: any[] = [];
    const monthlyGroupsData: { [key: number]: any[] } = {};
    for (let i = 0; i < 12; i++) {
      monthlyGroupsData[i] = [];
    }

    users.forEach((u) => {
      if (!u.birthDate) {
        missingBirthdates.push({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          name: `${u.firstName} ${u.lastName}`,
          phone: u.phone,
          gender: u.gender,
          avatar: u.avatar,
          role: u.role,
          poleMemberships: u.poleMemberships
        });
        return;
      }

      const bdate = new Date(u.birthDate);
      if (isNaN(bdate.getTime())) return;

      const birthMonth = bdate.getMonth(); // 0 to 11
      const birthDay = bdate.getDate();

      // Is Birthday Today?
      const isToday = birthMonth === currentMonthIndex && birthDay === currentDay;

      // Next Birthday Date calculation
      const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let nextBirthday = new Date(now.getFullYear(), birthMonth, birthDay);
      if (nextBirthday < todayZero) {
        nextBirthday = new Date(now.getFullYear() + 1, birthMonth, birthDay);
      }

      const diffMs = nextBirthday.getTime() - todayZero.getTime();
      const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const isThisWeek = daysUntil >= 0 && daysUntil <= 7;
      const isThisMonth = birthMonth === currentMonthIndex;

      const item = {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName} ${u.lastName}`,
        phone: u.phone,
        gender: u.gender,
        avatar: u.avatar,
        role: u.role,
        poleMemberships: u.poleMemberships,
        birthDate: u.birthDate,
        birthDay,
        birthMonth: birthMonth + 1, // 1 to 12
        birthMonthIndex: birthMonth,
        monthName: monthNames[birthMonth],
        monthShortName: monthShortNames[birthMonth],
        dateFormatted: `${birthDay} ${monthNames[birthMonth]}`,
        isToday,
        isThisWeek,
        isThisMonth,
        daysUntil
      };

      allBirthdays.push(item);
      monthlyGroupsData[birthMonth].push(item);
    });

    // Sort members inside each monthly group by day of month
    const monthlyGroups = monthNames.map((name, idx) => {
      const members = monthlyGroupsData[idx].sort((a, b) => a.birthDay - b.birthDay);
      return {
        monthNumber: idx + 1,
        monthIndex: idx,
        monthName: name,
        monthShortName: monthShortNames[idx],
        count: members.length,
        isCurrentMonth: idx === currentMonthIndex,
        members
      };
    });

    // Upcoming birthdays sorted by countdown (closest first)
    const upcomingBirthdays = [...allBirthdays].sort((a, b) => a.daysUntil - b.daysUntil);
    const birthdaysToday = allBirthdays.filter((b) => b.isToday);
    const birthdaysThisWeek = upcomingBirthdays.filter((b) => b.isThisWeek);
    const birthdaysNext30Days = upcomingBirthdays.filter((b) => b.daysUntil > 0 && b.daysUntil <= 30);

    return NextResponse.json({
      birthdays: upcomingBirthdays,
      birthdaysToday,
      birthdaysThisWeek,
      birthdaysNext30Days,
      upcomingBirthdays: upcomingBirthdays.slice(0, 10), // Next 10 upcoming birthdays
      monthlyGroups,
      monthlyCounts: monthlyGroups.map((g) => ({
        monthNumber: g.monthNumber,
        monthName: g.monthName,
        monthShortName: g.monthShortName,
        count: g.count,
        isCurrentMonth: g.isCurrentMonth
      })),
      kpis: {
        todayCount: birthdaysToday.length,
        thisWeekCount: allBirthdays.filter((b) => b.isThisWeek).length,
        thisMonthCount: allBirthdays.filter((b) => b.isThisMonth).length,
        totalWithBirthdate: allBirthdays.length,
        missingCount: missingBirthdates.length
      },
      membersWithoutBirthdate: missingBirthdates,
      currentMonthIndex: currentMonthIndex + 1
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error('Error fetching birthdays:', error);
    return NextResponse.json({ error: 'Failed to fetch birthdays' }, { status: 500 });
  }
}

// Send birthday wish or update birthdate
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, targetUserId, senderUserId, message, birthDate } = body;

    if (action === 'SEND_WISH') {
      if (!targetUserId || !message) {
        return NextResponse.json({ error: 'Membre et message requis.' }, { status: 400 });
      }

      let senderName = 'L\'équipe MCAD';
      if (senderUserId) {
        const sender = await prisma.user.findUnique({ where: { id: senderUserId } });
        if (sender) {
          senderName = `${sender.firstName} ${sender.lastName}`;
        }
      }

      const notification = await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: `🎂 Joyeux Anniversaire de la part de ${senderName} !`,
          message: message.trim(),
          type: 'BIRTHDAY_WISH',
          linkUrl: '/birthdays'
        }
      });

      broadcastUpdate('BIRTHDAY_WISH_SENT', {
        targetUserId,
        senderUserId,
        notificationId: notification.id
      });

      return NextResponse.json({ success: true, message: 'Souhait d\'anniversaire envoyé avec succès !' });
    }

    if (action === 'UPDATE_BIRTHDATE') {
      if (!targetUserId || !birthDate) {
        return NextResponse.json({ error: 'Membre et date de naissance requis.' }, { status: 400 });
      }

      const dateObj = new Date(birthDate);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json({ error: 'Date invalide.' }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { birthDate: dateObj }
      });

      broadcastUpdate('USER_UPDATED', { userId: targetUserId });

      return NextResponse.json({ success: true, user: updated });
    }

    return NextResponse.json({ error: 'Action non reconnue.' }, { status: 400 });
  } catch (error) {
    console.error('Error in birthdays POST:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
