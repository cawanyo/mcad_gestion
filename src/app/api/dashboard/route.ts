import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = cookies();
    const sessionUserId = searchParams.get('userId') || cookieStore.get('auth_session')?.value;

    let currentUser = null;
    if (sessionUserId) {
      currentUser = await prisma.user.findUnique({
        where: { id: sessionUserId },
        include: {
          poleMemberships: { include: { pole: true } },
          poleLeaderships: { include: { pole: true } },
          membershipRequests: { include: { pole: true } },
          unavailabilities: true
        }
      });
    }

    const totalUsers = await prisma.user.count({ where: { status: 'ACTIVE' } });
    const totalPoles = await prisma.pole.count({ where: { status: 'ACTIVE' } });
    const upcomingEventsCount = await prisma.event.count({
      where: { startsAt: { gte: new Date() } }
    });
    const totalValidations = await prisma.serviceValidation.count({
      where: { status: 'VALIDATED' }
    });

    const pendingRequests = await prisma.membershipRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: true, pole: true },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    const upcomingEvents = await prisma.event.findMany({
      where: { startsAt: { gte: new Date() } },
      include: {
        organizerPole: true,
        requirements: { include: { pole: true } },
        assignments: { include: { user: true, pole: true } },
        eventChecklists: {
          include: {
            checklist: {
              include: { pole: true, steps: { orderBy: { orderIndex: 'asc' } } }
            }
          }
        }
      },
      orderBy: { startsAt: 'asc' },
      take: 6
    });

    const poles = await prisma.pole.findMany({
      include: {
        _count: { select: { memberships: true, assignments: true } }
      }
    });

    // Real Pole Distribution
    const totalMemberships = poles.reduce((acc, p) => acc + p._count.memberships, 0);
    const poleDistribution = poles.map((p) => ({
      name: p.name,
      percentage: totalMemberships > 0 ? Math.round((p._count.memberships / totalMemberships) * 100) : 0,
      color: p.color
    }));

    // Current Week Birthdays (Monday to Sunday of current week)
    const usersWithBirthdays = await prisma.user.findMany({
      where: { birthDate: { not: null } },
      select: { id: true, firstName: true, lastName: true, birthDate: true, avatar: true }
    });

    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDayOfWeek, 0, 0, 0);
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDayOfWeek + 6, 23, 59, 59);

    const weekBirthdays: any[] = [];

    usersWithBirthdays.forEach((u) => {
      const bdate = new Date(u.birthDate!);
      if (isNaN(bdate.getTime())) return;

      const thisYearBdate = new Date(now.getFullYear(), bdate.getMonth(), bdate.getDate());

      if (thisYearBdate >= startOfWeek && thisYearBdate <= endOfWeek) {
        const age = now.getFullYear() - bdate.getFullYear();
        const isToday = bdate.getDate() === now.getDate() && bdate.getMonth() === now.getMonth();
        const diffDays = Math.round(
          (new Date(now.getFullYear(), bdate.getMonth(), bdate.getDate()).getTime() -
            new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        let countdownLabel = `${bdate.getDate()} ${bdate.toLocaleString('fr-FR', { month: 'short' })}`;
        if (isToday) countdownLabel = "Aujourd'hui 🎉";
        else if (diffDays === 1) countdownLabel = "Demain 🎈";
        else if (diffDays > 1) countdownLabel = `Dans ${diffDays}j`;

        weekBirthdays.push({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          avatar: u.avatar,
          day: bdate.getDate(),
          month: bdate.toLocaleString('fr-FR', { month: 'short' }),
          age,
          isToday,
          countdownLabel,
          diffDays,
          dateFormatted: `${bdate.getDate()} ${bdate.toLocaleString('fr-FR', { month: 'long' })}`
        });
      }
    });

    weekBirthdays.sort((a, b) => a.diffDays - b.diffDays);
    const birthdays = weekBirthdays;

    // Member Specific Data
    let memberData = null;
    if (currentUser) {
      const rawAssignments = await prisma.assignment.findMany({
        where: { userId: currentUser.id },
        include: {
          event: {
            include: {
              organizerPole: true,
              eventChecklists: {
                include: {
                  checklist: {
                    include: { pole: true, steps: { orderBy: { orderIndex: 'asc' } } }
                  }
                }
              }
            }
          },
          pole: true
        },
        orderBy: { event: { startsAt: 'asc' } }
      });

      // Enrich assignments with the specific checklist linked for that pole
      const myAssignments = rawAssignments.map((a) => {
        const associatedChecklist = a.event?.eventChecklists
          ?.map((ec) => ec.checklist)
          ?.find((chk) => chk.poleId === a.poleId)
          || a.event?.eventChecklists?.[0]?.checklist
          || null;

        return {
          ...a,
          assignedChecklist: associatedChecklist
        };
      });

      const myPendingRequests = await prisma.membershipRequest.findMany({
        where: { userId: currentUser.id, status: 'PENDING' },
        include: { pole: true },
        orderBy: { createdAt: 'desc' }
      });

      const myValidations = await prisma.serviceValidation.findMany({
        where: { userId: currentUser.id },
        include: { event: true, pole: true },
        orderBy: { createdAt: 'desc' }
      });

      const myUnavailabilities = await prisma.unavailability.findMany({
        where: { userId: currentUser.id },
        orderBy: { startsAt: 'asc' }
      });

      // Next service for this member: prioritize upcoming, or fallback to first assigned
      const now = new Date();
      const upcomingAssignments = myAssignments.filter(a => new Date(a.event.endsAt) >= now);
      const nextAssignment = upcomingAssignments.length > 0 ? upcomingAssignments[0] : (myAssignments.length > 0 ? myAssignments[0] : null);

      memberData = {
        myAssignments,
        myPendingRequests,
        myValidations,
        myUnavailabilities,
        myPoles: currentUser.poleMemberships.map(pm => pm.pole),
        nextService: nextAssignment ? nextAssignment.event : null,
        nextAssignmentRole: nextAssignment?.roleTag || 'Membre de service',
        nextAssignmentPole: nextAssignment?.pole || null,
        nextAssignmentChecklist: nextAssignment?.assignedChecklist || null,
        memberKpis: {
          upcomingServicesCount: myAssignments.length,
          completedServicesCount: myValidations.filter(v => v.status === 'VALIDATED').length,
          activePolesCount: currentUser.poleMemberships.length,
          pendingRequestsCount: myPendingRequests.length
        }
      };
    }

    return NextResponse.json({
      currentUserRole: currentUser?.role || 'MEMBER',
      memberData,
      kpis: {
        activeMembers: totalUsers,
        activeMembersDiff: totalUsers > 0 ? `+${totalUsers} ce mois` : '0',
        polesCount: totalPoles,
        upcomingEventsCount: upcomingEventsCount,
        serviceHours: (totalValidations * 3).toLocaleString('fr-FR'),
        serviceHoursPeriod: 'Ce mois'
      },
      serviceTrend: [
        { day: 1, services: totalValidations > 0 ? Math.min(totalValidations, 2) : 0 },
        { day: 5, services: totalValidations > 0 ? Math.min(totalValidations, 5) : 0 },
        { day: 10, services: totalValidations > 0 ? Math.min(totalValidations, 8) : 0 },
        { day: 15, services: totalValidations > 0 ? Math.min(totalValidations, 12) : 0 },
        { day: 20, services: totalValidations > 0 ? Math.min(totalValidations, 15) : 0 },
        { day: 25, services: totalValidations > 0 ? Math.min(totalValidations, 20) : 0 },
        { day: 30, services: totalValidations },
      ],
      annualStats: [
        { month: 'Jan', count: 0 },
        { month: 'Fév', count: 0 },
        { month: 'Mar', count: 0 },
        { month: 'Avr', count: 0 },
        { month: 'Mai', count: 0 },
        { month: 'Juin', count: 0 },
        { month: 'Juil', count: 0 },
        { month: 'Août', count: totalValidations },
        { month: 'Sep', count: 0 },
        { month: 'Oct', count: 0 },
        { month: 'Nov', count: 0 },
        { month: 'Déc', count: 0 },
      ],
      poleDistribution,
      upcomingEvents,
      pendingRequests,
      birthdays,
      annualSummary: {
        totalServices: totalValidations,
        serviceHours: totalValidations * 3,
        activeMembers: totalUsers,
        newMembers: totalUsers
      }
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
