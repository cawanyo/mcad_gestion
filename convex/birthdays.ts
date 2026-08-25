import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAuth, getCurrentUser } from "./lib/auth";

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MONTH_SHORT_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export const list = query({
  args: { poleId: v.optional(v.id("poles")), search: v.optional(v.string()) },
  handler: async (ctx, { poleId, search }) => {
    await requireAuth(ctx);

    let users = await ctx.db.query("users").withIndex("status", (q) => q.eq("status", "ACTIVE")).collect();
    users.sort((a, b) => a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName));

    if (poleId) {
      const memberIds = new Set(
        (await ctx.db.query("poleMemberships").withIndex("poleAndStatus", (q) => q.eq("poleId", poleId).eq("status", "ACTIVE")).collect()).map(
          (m) => m.userId
        )
      );
      users = users.filter((u) => memberIds.has(u._id));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      users = users.filter((u) => u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q));
    }

    const usersWithMemberships = await Promise.all(
      users.map(async (u) => {
        const memberships = await ctx.db.query("poleMemberships").withIndex("userId", (q) => q.eq("userId", u._id)).collect();
        const withPole = await Promise.all(memberships.map(async (m) => ({ ...m, pole: await ctx.db.get(m.poleId) })));
        return { ...u, poleMemberships: withPole };
      })
    );

    const now = new Date();
    const currentMonthIndex = now.getMonth();
    const currentDay = now.getDate();

    const allBirthdays: any[] = [];
    const missingBirthdates: any[] = [];
    const monthlyGroupsData: Record<number, any[]> = {};
    for (let i = 0; i < 12; i++) monthlyGroupsData[i] = [];

    usersWithMemberships.forEach((u) => {
      if (!u.birthDate) {
        missingBirthdates.push({
          _id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          name: `${u.firstName} ${u.lastName}`,
          phone: u.phone,
          gender: u.gender,
          avatar: u.avatar,
          role: u.role,
          poleMemberships: u.poleMemberships,
        });
        return;
      }

      const bdate = new Date(u.birthDate);
      if (isNaN(bdate.getTime())) return;

      const birthMonth = bdate.getMonth();
      const birthDay = bdate.getDate();
      const isToday = birthMonth === currentMonthIndex && birthDay === currentDay;

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
        _id: u._id,
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
        birthMonth: birthMonth + 1,
        birthMonthIndex: birthMonth,
        monthName: MONTH_NAMES[birthMonth],
        monthShortName: MONTH_SHORT_NAMES[birthMonth],
        dateFormatted: `${birthDay} ${MONTH_NAMES[birthMonth]}`,
        isToday,
        isThisWeek,
        isThisMonth,
        daysUntil,
      };

      allBirthdays.push(item);
      monthlyGroupsData[birthMonth].push(item);
    });

    const monthlyGroups = MONTH_NAMES.map((name, idx) => {
      const members = monthlyGroupsData[idx].sort((a, b) => a.birthDay - b.birthDay);
      return {
        monthNumber: idx + 1,
        monthIndex: idx,
        monthName: name,
        monthShortName: MONTH_SHORT_NAMES[idx],
        count: members.length,
        isCurrentMonth: idx === currentMonthIndex,
        members,
      };
    });

    const upcomingBirthdays = [...allBirthdays].sort((a, b) => a.daysUntil - b.daysUntil);
    const birthdaysToday = allBirthdays.filter((b) => b.isToday);
    const birthdaysThisWeek = upcomingBirthdays.filter((b) => b.isThisWeek);
    const birthdaysNext30Days = upcomingBirthdays.filter((b) => b.daysUntil > 0 && b.daysUntil <= 30);

    return {
      birthdays: upcomingBirthdays,
      birthdaysToday,
      birthdaysThisWeek,
      birthdaysNext30Days,
      upcomingBirthdays: upcomingBirthdays.slice(0, 10),
      monthlyGroups,
      monthlyCounts: monthlyGroups.map((g) => ({
        monthNumber: g.monthNumber,
        monthName: g.monthName,
        monthShortName: g.monthShortName,
        count: g.count,
        isCurrentMonth: g.isCurrentMonth,
      })),
      kpis: {
        todayCount: birthdaysToday.length,
        thisWeekCount: allBirthdays.filter((b) => b.isThisWeek).length,
        thisMonthCount: allBirthdays.filter((b) => b.isThisMonth).length,
        totalWithBirthdate: allBirthdays.length,
        missingCount: missingBirthdates.length,
      },
      membersWithoutBirthdate: missingBirthdates,
      currentMonthIndex: currentMonthIndex + 1,
    };
  },
});

export const sendWish = mutation({
  args: { targetUserId: v.id("users"), message: v.string() },
  handler: async (ctx, { targetUserId, message }) => {
    const sender = await getCurrentUser(ctx);
    if (!targetUserId || !message) throw new ConvexError("Membre et message requis.");

    const senderName = sender ? `${sender.firstName} ${sender.lastName}` : "L'équipe MCAD";

    await ctx.db.insert("notifications", {
      userId: targetUserId,
      title: `🎂 Joyeux Anniversaire de la part de ${senderName} !`,
      message: message.trim(),
      type: "BIRTHDAY_WISH",
      isRead: false,
      linkUrl: "/birthdays",
    });

    return { success: true, message: "Souhait d'anniversaire envoyé avec succès !" };
  },
});

export const updateBirthdate = mutation({
  args: { targetUserId: v.id("users"), birthDate: v.number() },
  handler: async (ctx, { targetUserId, birthDate }) => {
    await requireAuth(ctx);
    if (!targetUserId || !birthDate) throw new ConvexError("Membre et date de naissance requis.");

    await ctx.db.patch(targetUserId, { birthDate });
    return { success: true, user: await ctx.db.get(targetUserId) };
  },
});
