import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const poleId = searchParams.get('poleId'); // 'all' or specific poleId
    const yearParam = searchParams.get('year');
    const now = new Date();
    const targetYear = yearParam && !isNaN(Number(yearParam)) ? Number(yearParam) : now.getFullYear();

    const startOfYear = new Date(targetYear, 0, 1, 0, 0, 0);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    // ========================================================
    // 1. MEMBER PERSONAL STATS
    // ========================================================
    if (userId && userId !== 'all') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          poleMemberships: {
            include: { pole: true }
          }
        }
      });

      if (!user) {
        return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
      }

      // Member assignments in the selected year
      const whereYearAssignments: any = {
        userId,
        event: {
          startsAt: {
            gte: startOfYear,
            lte: endOfYear
          }
        }
      };
      if (poleId && poleId !== 'all') {
        whereYearAssignments.poleId = poleId;
      }

      const yearAssignments = await prisma.assignment.findMany({
        where: whereYearAssignments,
        include: {
          event: true,
          pole: true
        },
        orderBy: { event: { startsAt: 'desc' } }
      });

      // All-time assignments
      const whereAllAssignments: any = { userId };
      if (poleId && poleId !== 'all') {
        whereAllAssignments.poleId = poleId;
      }
      const totalAllTime = await prisma.assignment.count({ where: whereAllAssignments });

      // Monthly breakdown
      const monthlyBreakdown = Array(12).fill(0);
      const poleCountMap: Record<string, { name: string; color: string; count: number }> = {};
      const roleMap: Record<string, number> = {};

      yearAssignments.forEach((a) => {
        const d = new Date(a.event.startsAt);
        const m = d.getMonth(); // 0 to 11
        if (m >= 0 && m < 12) {
          monthlyBreakdown[m]++;
        }

        // By pole
        const pId = a.poleId;
        if (!poleCountMap[pId]) {
          poleCountMap[pId] = {
            name: a.pole.name,
            color: a.pole.color,
            count: 0
          };
        }
        poleCountMap[pId].count++;

        // By role tag
        const role = a.roleTag || 'Membre affecté';
        roleMap[role] = (roleMap[role] || 0) + 1;
      });

      // Member validations in year
      const validations = await prisma.serviceValidation.findMany({
        where: {
          userId,
          status: 'VALIDATED',
          event: {
            startsAt: {
              gte: startOfYear,
              lte: endOfYear
            }
          }
        }
      });

      const validatedCount = validations.length;
      const validationRate = yearAssignments.length > 0 ? Math.round((validatedCount / yearAssignments.length) * 100) : 100;
      
      const totalRatings = validations.reduce((sum, v) => sum + (v.rating || 5), 0);
      const averageRating = validatedCount > 0 ? Number((totalRatings / validatedCount).toFixed(1)) : 5.0;

      // Pole breakdown list
      const totalYearServices = yearAssignments.length;
      const poleBreakdown = Object.entries(poleCountMap).map(([id, val]) => ({
        poleId: id,
        name: val.name,
        color: val.color,
        count: val.count,
        percentage: totalYearServices > 0 ? Math.round((val.count / totalYearServices) * 100) : 0
      }));

      // Top roles
      const topRoles = Object.entries(roleMap)
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      return NextResponse.json({
        type: 'MEMBER',
        year: targetYear,
        kpis: {
          totalServicesYear: totalYearServices,
          totalServicesAllTime: totalAllTime,
          validationRate,
          averageRating,
          activePolesCount: user.poleMemberships.length
        },
        monthlyStats: monthNames.map((name, i) => ({
          month: name,
          monthNumber: i + 1,
          count: monthlyBreakdown[i]
        })),
        poleBreakdown,
        topRoles,
        recentServices: yearAssignments.slice(0, 5).map((a) => ({
          id: a.id,
          eventTitle: a.event.title,
          eventDate: a.event.startsAt,
          poleName: a.pole.name,
          poleColor: a.pole.color,
          roleTag: a.roleTag
        }))
      });
    }

    // ========================================================
    // 2. LEADER / ADMIN DEPARTMENT & POLE STATS
    // ========================================================
    const wherePoleFilter = poleId && poleId !== 'all' ? { id: poleId } : {};

    // Fetch active members
    let membersWhere: any = { status: 'ACTIVE' };
    if (poleId && poleId !== 'all') {
      membersWhere.poleMemberships = {
        some: { poleId }
      };
    }

    const members = await prisma.user.findMany({
      where: membersWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        gender: true,
        birthDate: true,
        createdAt: true,
        poleMemberships: {
          include: { pole: true }
        }
      }
    });

    const totalMembers = members.length;

    // Gender breakdown
    let menCount = 0;
    let womenCount = 0;

    members.forEach((m) => {
      // If gender is set to FEMME, count as female; otherwise count as male
      if (m.gender === 'FEMME') {
        womenCount++;
      } else {
        menCount++;
      }
    });

    const menPercentage = totalMembers > 0 ? Math.round((menCount / totalMembers) * 100) : 50;
    const womenPercentage = totalMembers > 0 ? Math.round((womenCount / totalMembers) * 100) : 50;

    // Age groups breakdown
    let under25 = 0;
    let age25to35 = 0;
    let age35to50 = 0;
    let over50 = 0;
    let unknownAge = 0;

    members.forEach((m) => {
      if (!m.birthDate) {
        unknownAge++;
        return;
      }
      const bdate = new Date(m.birthDate);
      if (isNaN(bdate.getTime())) {
        unknownAge++;
        return;
      }
      const age = now.getFullYear() - bdate.getFullYear();
      if (age < 25) under25++;
      else if (age <= 35) age25to35++;
      else if (age <= 50) age35to50++;
      else over50++;
    });

    const knownAgeTotal = totalMembers - unknownAge;
    const ageGroups = [
      { label: '< 25 ans', key: 'under25', count: under25, percentage: knownAgeTotal > 0 ? Math.round((under25 / knownAgeTotal) * 100) : 0, color: '#ec4899' },
      { label: '25 - 35 ans', key: 'age25to35', count: age25to35, percentage: knownAgeTotal > 0 ? Math.round((age25to35 / knownAgeTotal) * 100) : 0, color: '#6366f1' },
      { label: '36 - 50 ans', key: 'age35to50', count: age35to50, percentage: knownAgeTotal > 0 ? Math.round((age35to50 / knownAgeTotal) * 100) : 0, color: '#3b82f6' },
      { label: '> 50 ans', key: 'over50', count: over50, percentage: knownAgeTotal > 0 ? Math.round((over50 / knownAgeTotal) * 100) : 0, color: '#10b981' }
    ];

    // Events & Assignments in Year
    const whereEvents: any = {
      startsAt: {
        gte: startOfYear,
        lte: endOfYear
      }
    };
    if (poleId && poleId !== 'all') {
      whereEvents.organizerPoleId = poleId;
    }

    const eventsInYear = await prisma.event.findMany({
      where: whereEvents,
      include: {
        assignments: true
      }
    });

    const totalEvents = eventsInYear.length;

    // All assignments in Year
    const whereAssignments: any = {
      event: {
        startsAt: {
          gte: startOfYear,
          lte: endOfYear
        }
      }
    };
    if (poleId && poleId !== 'all') {
      whereAssignments.poleId = poleId;
    }

    const allAssignmentsInYear = await prisma.assignment.findMany({
      where: whereAssignments,
      include: {
        user: true,
        pole: true,
        event: true
      }
    });

    const totalAssignmentsCount = allAssignmentsInYear.length;
    const avgVolunteersPerEvent = totalEvents > 0 ? Number((totalAssignmentsCount / totalEvents).toFixed(1)) : 0;

    // Monthly mobilization evolution
    const monthlyEvents = Array(12).fill(0);
    const monthlyAssignments = Array(12).fill(0);

    eventsInYear.forEach((ev) => {
      const m = new Date(ev.startsAt).getMonth();
      if (m >= 0 && m < 12) monthlyEvents[m]++;
    });

    allAssignmentsInYear.forEach((a) => {
      const m = new Date(a.event.startsAt).getMonth();
      if (m >= 0 && m < 12) monthlyAssignments[m]++;
    });

    // Validations & Checklists rate
    const whereValidations: any = {
      event: {
        startsAt: {
          gte: startOfYear,
          lte: endOfYear
        }
      }
    };
    if (poleId && poleId !== 'all') whereValidations.poleId = poleId;

    const validatedCount = await prisma.serviceValidation.count({
      where: { ...whereValidations, status: 'VALIDATED' }
    });

    const validationRate = totalAssignmentsCount > 0 ? Math.round((validatedCount / totalAssignmentsCount) * 100) : 100;

    // Top active volunteers
    const volunteerCountMap: Record<string, { user: any; count: number }> = {};
    allAssignmentsInYear.forEach((a) => {
      if (!volunteerCountMap[a.userId]) {
        volunteerCountMap[a.userId] = { user: a.user, count: 0 };
      }
      volunteerCountMap[a.userId].count++;
    });

    const topVolunteers = Object.values(volunteerCountMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((v) => ({
        id: v.user.id,
        name: `${v.user.firstName} ${v.user.lastName}`,
        avatar: v.user.avatar,
        email: v.user.email,
        servicesCount: v.count
      }));

    // Poles activity summary (for all poles)
    const allPoles = await prisma.pole.findMany({
      include: {
        _count: {
          select: { memberships: true, assignments: true }
        }
      }
    });

    const polesActivity = allPoles.map((p) => {
      const poleAssignmentsYear = allAssignmentsInYear.filter((a) => a.poleId === p.id).length;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        membersCount: p._count.memberships,
        servicesYearCount: poleAssignmentsYear
      };
    });

    return NextResponse.json({
      type: 'LEADER',
      year: targetYear,
      kpis: {
        totalMembers,
        totalEvents,
        totalAssignmentsCount,
        avgVolunteersPerEvent,
        validationRate
      },
      demographics: {
        gender: {
          menCount,
          womenCount,
          menPercentage,
          womenPercentage
        },
        ageGroups
      },
      monthlyEvolution: monthNames.map((name, i) => ({
        month: name,
        monthNumber: i + 1,
        events: monthlyEvents[i],
        assignments: monthlyAssignments[i]
      })),
      topVolunteers,
      polesActivity
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
