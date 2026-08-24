import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { enrichEvent } from "./events";
import { Doc } from "./_generated/dataModel";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireAuth(ctx);
    const now = Date.now();

    const [allUsers, allPoles, allUpcomingEvents, pendingRequestsRaw, usersWithBirthdays] = await Promise.all([
      ctx.db.query("users").withIndex("status", (q) => q.eq("status", "ACTIVE")).collect(),
      ctx.db.query("poles").withIndex("status", (q) => q.eq("status", "ACTIVE")).collect(),
      ctx.db.query("events").withIndex("startsAt", (q) => q.gte("startsAt", now)).collect(),
      ctx.db.query("membershipRequests").withIndex("status", (q) => q.eq("status", "PENDING")).order("desc").take(10),
      ctx.db.query("users").withIndex("by_creation_time").collect(),
    ]);

    const totalUsers = allUsers.length;
    const totalPoles = allPoles.length;
    const upcomingEventsCount = allUpcomingEvents.length;

    const validatedValidations = await ctx.db.query("serviceValidations").withIndex("status", (q) => q.eq("status", "VALIDATED")).collect();
    const totalValidations = validatedValidations.length;

    const pendingRequests = await Promise.all(
      pendingRequestsRaw.map(async (r) => ({ ...r, user: await ctx.db.get(r.userId), pole: await ctx.db.get(r.poleId) }))
    );

    const sortedUpcoming = [...allUpcomingEvents].sort((a, b) => a.startsAt - b.startsAt).slice(0, 6);
    const upcomingEvents = await Promise.all(sortedUpcoming.map((e) => enrichEvent(ctx, e)));

    const allPolesWithCounts = await Promise.all(
      allPoles.map(async (p) => {
        const [memberships, assignments] = await Promise.all([
          ctx.db.query("poleMemberships").withIndex("poleAndStatus", (q) => q.eq("poleId", p._id)).collect(),
          ctx.db.query("assignments").withIndex("poleId", (q) => q.eq("poleId", p._id)).collect(),
        ]);
        return { ...p, membershipsCount: memberships.length, assignmentsCount: assignments.length };
      })
    );
    const totalMemberships = allPolesWithCounts.reduce((acc, p) => acc + p.membershipsCount, 0);
    const poleDistribution = allPolesWithCounts.map((p) => ({
      name: p.name,
      percentage: totalMemberships > 0 ? Math.round((p.membershipsCount / totalMemberships) * 100) : 0,
      color: p.color,
    }));

    const nowDate = new Date(now);
    const currentDayOfWeek = (nowDate.getDay() + 6) % 7;
    const startOfWeek = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - currentDayOfWeek, 0, 0, 0);
    const endOfWeek = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - currentDayOfWeek + 6, 23, 59, 59);

    const weekBirthdays: any[] = [];
    usersWithBirthdays.forEach((u) => {
      if (!u.birthDate) return;
      const bdate = new Date(u.birthDate);
      if (isNaN(bdate.getTime())) return;

      const thisYearBdate = new Date(nowDate.getFullYear(), bdate.getMonth(), bdate.getDate());
      if (thisYearBdate >= startOfWeek && thisYearBdate <= endOfWeek) {
        const age = nowDate.getFullYear() - bdate.getFullYear();
        const isToday = bdate.getDate() === nowDate.getDate() && bdate.getMonth() === nowDate.getMonth();
        const diffDays = Math.round(
          (new Date(nowDate.getFullYear(), bdate.getMonth(), bdate.getDate()).getTime() -
            new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        let countdownLabel = `${bdate.getDate()} ${bdate.toLocaleString("fr-FR", { month: "short" })}`;
        if (isToday) countdownLabel = "Aujourd'hui 🎉";
        else if (diffDays === 1) countdownLabel = "Demain 🎈";
        else if (diffDays > 1) countdownLabel = `Dans ${diffDays}j`;

        weekBirthdays.push({
          _id: u._id,
          name: `${u.firstName} ${u.lastName}`,
          avatar: u.avatar,
          day: bdate.getDate(),
          month: bdate.toLocaleString("fr-FR", { month: "short" }),
          age,
          isToday,
          countdownLabel,
          diffDays,
          dateFormatted: `${bdate.getDate()} ${bdate.toLocaleString("fr-FR", { month: "long" })}`,
        });
      }
    });
    weekBirthdays.sort((a, b) => a.diffDays - b.diffDays);

    let memberData: any = null;
    const userAssignments = await ctx.db.query("assignments").withIndex("userId", (q) => q.eq("userId", currentUser._id)).collect();
    const myUnavailabilities = await ctx.db.query("unavailabilities").withIndex("userId", (q) => q.eq("userId", currentUser._id)).collect();
    myUnavailabilities.sort((a, b) => a.startsAt - b.startsAt);

    const myAssignments = await Promise.all(
      userAssignments.map(async (a) => {
        const event = await ctx.db.get(a.eventId);
        const pole = await ctx.db.get(a.poleId);
        let assignedChecklist = null;
        if (event) {
          const eventChecklists = await ctx.db.query("eventChecklists").withIndex("eventId", (q) => q.eq("eventId", event._id)).collect();
          for (const ec of eventChecklists) {
            const checklist = await ctx.db.get(ec.checklistId);
            if (checklist?.poleId === a.poleId) {
              assignedChecklist = checklist;
              break;
            }
          }
          if (!assignedChecklist && eventChecklists.length > 0) {
            assignedChecklist = await ctx.db.get(eventChecklists[0].checklistId);
          }
        }
        return { ...a, event, pole, assignedChecklist };
      })
    );
    myAssignments.sort((a, b) => (a.event?.startsAt || 0) - (b.event?.startsAt || 0));

    const upcomingAssignments = myAssignments.filter((a) => a.event && a.event.endsAt >= now);
    const nextAssignment = upcomingAssignments.length > 0 ? upcomingAssignments[0] : null;

    const myPoleMemberships = await ctx.db.query("poleMemberships").withIndex("userId", (q) => q.eq("userId", currentUser._id)).collect();
    const myPoles = await Promise.all(myPoleMemberships.map((pm) => ctx.db.get(pm.poleId)));

    memberData = {
      myAssignments: upcomingAssignments,
      myUnavailabilities,
      myPoles,
      nextService: nextAssignment?.event || null,
      nextAssignmentRole: nextAssignment?.roleTag || "Membre de service",
      nextAssignmentPole: nextAssignment?.pole || null,
      nextAssignmentChecklist: nextAssignment?.assignedChecklist || null,
    };

    return {
      currentUserRole: currentUser.role,
      memberData,
      kpis: {
        activeMembers: totalUsers,
        activeMembersDiff: totalUsers > 0 ? `+${totalUsers} ce mois` : "0",
        polesCount: totalPoles,
        upcomingEventsCount,
        serviceHours: (totalValidations * 3).toLocaleString("fr-FR"),
        serviceHoursPeriod: "Ce mois",
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
        { month: "Jan", count: 0 },
        { month: "Fév", count: 0 },
        { month: "Mar", count: 0 },
        { month: "Avr", count: 0 },
        { month: "Mai", count: 0 },
        { month: "Juin", count: 0 },
        { month: "Juil", count: 0 },
        { month: "Août", count: totalValidations },
        { month: "Sep", count: 0 },
        { month: "Oct", count: 0 },
        { month: "Nov", count: 0 },
        { month: "Déc", count: 0 },
      ],
      poleDistribution,
      upcomingEvents,
      pendingRequests,
      birthdays: weekBirthdays,
      annualSummary: {
        totalServices: totalValidations,
        serviceHours: totalValidations * 3,
        activeMembers: totalUsers,
        newMembers: totalUsers,
      },
    };
  },
});
