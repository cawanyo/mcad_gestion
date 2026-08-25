import { query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAuth } from "./lib/auth";

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export const get = query({
  args: {
    userId: v.optional(v.id("users")),
    poleId: v.optional(v.id("poles")),
    year: v.optional(v.number()),
  },
  handler: async (ctx, { userId, poleId, year }) => {
    await requireAuth(ctx);

    const now = new Date();
    const targetYear = year || now.getFullYear();
    const startOfYear = new Date(targetYear, 0, 1, 0, 0, 0).getTime();
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59).getTime();

    if (userId) {
      const user = await ctx.db.get(userId);
      if (!user) throw new ConvexError("Membre non trouvé");

      const memberships = await ctx.db.query("poleMemberships").withIndex("userId", (q) => q.eq("userId", userId)).collect();

      let userAssignments = await ctx.db.query("assignments").withIndex("userId", (q) => q.eq("userId", userId)).collect();
      const assignmentsWithEvent = await Promise.all(
        userAssignments.map(async (a) => ({ ...a, event: await ctx.db.get(a.eventId), pole: await ctx.db.get(a.poleId) }))
      );

      const totalAllTime = poleId
        ? assignmentsWithEvent.filter((a) => a.poleId === poleId).length
        : assignmentsWithEvent.length;

      let yearAssignments = assignmentsWithEvent.filter(
        (a) => a.event && a.event.startsAt >= startOfYear && a.event.startsAt <= endOfYear
      );
      if (poleId) yearAssignments = yearAssignments.filter((a) => a.poleId === poleId);
      yearAssignments.sort((a, b) => (b.event?.startsAt || 0) - (a.event?.startsAt || 0));

      const monthlyBreakdown = Array(12).fill(0);
      const poleCountMap: Record<string, { name: string; color: string; count: number }> = {};
      const roleMap: Record<string, number> = {};

      yearAssignments.forEach((a) => {
        const m = new Date(a.event!.startsAt).getMonth();
        if (m >= 0 && m < 12) monthlyBreakdown[m]++;

        const pId = a.poleId;
        if (!poleCountMap[pId]) {
          poleCountMap[pId] = { name: a.pole?.name || "", color: a.pole?.color || "#3b68f0", count: 0 };
        }
        poleCountMap[pId].count++;

        const role = a.roleTag || "Membre affecté";
        roleMap[role] = (roleMap[role] || 0) + 1;
      });

      const yearValidations = await ctx.db.query("serviceValidations").withIndex("userId", (q) => q.eq("userId", userId)).collect();
      const validationsWithEvent = await Promise.all(
        yearValidations.map(async (val) => ({ ...val, event: await ctx.db.get(val.eventId) }))
      );
      const validations = validationsWithEvent.filter(
        (v) => v.status === "VALIDATED" && v.event && v.event.startsAt >= startOfYear && v.event.startsAt <= endOfYear
      );

      const validatedCount = validations.length;
      const validationRate = yearAssignments.length > 0 ? Math.round((validatedCount / yearAssignments.length) * 100) : 100;
      const totalRatings = validations.reduce((sum, v) => sum + (v.rating || 5), 0);
      const averageRating = validatedCount > 0 ? Number((totalRatings / validatedCount).toFixed(1)) : 5.0;

      const totalYearServices = yearAssignments.length;
      const poleBreakdown = Object.entries(poleCountMap).map(([id, val]) => ({
        poleId: id,
        name: val.name,
        color: val.color,
        count: val.count,
        percentage: totalYearServices > 0 ? Math.round((val.count / totalYearServices) * 100) : 0,
      }));

      const topRoles = Object.entries(roleMap)
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      return {
        type: "MEMBER" as const,
        year: targetYear,
        kpis: {
          totalServicesYear: totalYearServices,
          totalServicesAllTime: totalAllTime,
          validationRate,
          averageRating,
          activePolesCount: memberships.length,
        },
        monthlyStats: MONTH_NAMES.map((name, i) => ({ month: name, monthNumber: i + 1, count: monthlyBreakdown[i] })),
        poleBreakdown,
        topRoles,
        recentServices: yearAssignments.slice(0, 5).map((a) => ({
          _id: a._id,
          eventTitle: a.event?.title,
          eventDate: a.event?.startsAt,
          poleName: a.pole?.name,
          poleColor: a.pole?.color,
          roleTag: a.roleTag,
        })),
      };
    }

    let members = await ctx.db.query("users").withIndex("status", (q) => q.eq("status", "ACTIVE")).collect();
    if (poleId) {
      const memberUserIds = new Set(
        (await ctx.db.query("poleMemberships").withIndex("poleAndStatus", (q) => q.eq("poleId", poleId)).collect()).map((m) => m.userId)
      );
      members = members.filter((m) => memberUserIds.has(m._id));
    }
    const totalMembers = members.length;

    let menCount = 0;
    let womenCount = 0;
    members.forEach((m) => (m.gender === "FEMME" ? womenCount++ : menCount++));
    const menPercentage = totalMembers > 0 ? Math.round((menCount / totalMembers) * 100) : 50;
    const womenPercentage = totalMembers > 0 ? Math.round((womenCount / totalMembers) * 100) : 50;

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
      { label: "< 25 ans", key: "under25", count: under25, percentage: knownAgeTotal > 0 ? Math.round((under25 / knownAgeTotal) * 100) : 0, color: "#ec4899" },
      { label: "25 - 35 ans", key: "age25to35", count: age25to35, percentage: knownAgeTotal > 0 ? Math.round((age25to35 / knownAgeTotal) * 100) : 0, color: "#6366f1" },
      { label: "36 - 50 ans", key: "age35to50", count: age35to50, percentage: knownAgeTotal > 0 ? Math.round((age35to50 / knownAgeTotal) * 100) : 0, color: "#3b82f6" },
      { label: "> 50 ans", key: "over50", count: over50, percentage: knownAgeTotal > 0 ? Math.round((over50 / knownAgeTotal) * 100) : 0, color: "#10b981" },
    ];

    let eventsInYear = await ctx.db
      .query("events")
      .withIndex("startsAt", (q) => q.gte("startsAt", startOfYear).lte("startsAt", endOfYear))
      .collect();
    if (poleId) eventsInYear = eventsInYear.filter((e) => e.organizerPoleId === poleId);
    const totalEvents = eventsInYear.length;

    const allEventsThisYear = await ctx.db
      .query("events")
      .withIndex("startsAt", (q) => q.gte("startsAt", startOfYear).lte("startsAt", endOfYear))
      .collect();
    const yearEventIds = new Set(allEventsThisYear.map((e) => e._id));

    const allAssignments = await ctx.db.query("assignments").withIndex("by_creation_time").collect();
    let allAssignmentsInYear = await Promise.all(
      allAssignments
        .filter((a) => yearEventIds.has(a.eventId))
        .map(async (a) => ({ ...a, user: await ctx.db.get(a.userId), pole: await ctx.db.get(a.poleId), event: await ctx.db.get(a.eventId) }))
    );
    if (poleId) allAssignmentsInYear = allAssignmentsInYear.filter((a) => a.poleId === poleId);

    const totalAssignmentsCount = allAssignmentsInYear.length;
    const avgVolunteersPerEvent = totalEvents > 0 ? Number((totalAssignmentsCount / totalEvents).toFixed(1)) : 0;

    const monthlyEvents = Array(12).fill(0);
    const monthlyAssignments = Array(12).fill(0);
    eventsInYear.forEach((ev) => {
      const m = new Date(ev.startsAt).getMonth();
      if (m >= 0 && m < 12) monthlyEvents[m]++;
    });
    allAssignmentsInYear.forEach((a) => {
      if (!a.event) return;
      const m = new Date(a.event.startsAt).getMonth();
      if (m >= 0 && m < 12) monthlyAssignments[m]++;
    });

    const allValidations = await ctx.db.query("serviceValidations").withIndex("status", (q) => q.eq("status", "VALIDATED")).collect();
    let validatedInYear = allValidations.filter((v) => yearEventIds.has(v.eventId));
    if (poleId) validatedInYear = validatedInYear.filter((v) => v.poleId === poleId);
    const validatedCount = validatedInYear.length;
    const validationRate = totalAssignmentsCount > 0 ? Math.round((validatedCount / totalAssignmentsCount) * 100) : 100;

    const volunteerCountMap: Record<string, { user: any; count: number }> = {};
    allAssignmentsInYear.forEach((a) => {
      if (!a.user) return;
      if (!volunteerCountMap[a.userId]) volunteerCountMap[a.userId] = { user: a.user, count: 0 };
      volunteerCountMap[a.userId].count++;
    });
    const topVolunteers = Object.values(volunteerCountMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((v) => ({
        _id: v.user._id,
        name: `${v.user.firstName} ${v.user.lastName}`,
        avatar: v.user.avatar,
        email: v.user.email,
        servicesCount: v.count,
      }));

    const allPoles = await ctx.db.query("poles").withIndex("by_creation_time").collect();
    const polesActivity = await Promise.all(
      allPoles.map(async (p) => {
        const memberships = await ctx.db.query("poleMemberships").withIndex("poleAndStatus", (q) => q.eq("poleId", p._id)).collect();
        const poleAssignmentsYear = allAssignmentsInYear.filter((a) => a.poleId === p._id).length;
        return {
          _id: p._id,
          name: p.name,
          color: p.color,
          membersCount: memberships.length,
          servicesYearCount: poleAssignmentsYear,
        };
      })
    );

    return {
      type: "LEADER" as const,
      year: targetYear,
      kpis: { totalMembers, totalEvents, totalAssignmentsCount, avgVolunteersPerEvent, validationRate },
      demographics: { gender: { menCount, womenCount, menPercentage, womenPercentage }, ageGroups },
      monthlyEvolution: MONTH_NAMES.map((name, i) => ({
        month: name,
        monthNumber: i + 1,
        events: monthlyEvents[i],
        assignments: monthlyAssignments[i],
      })),
      topVolunteers,
      polesActivity,
    };
  },
});
