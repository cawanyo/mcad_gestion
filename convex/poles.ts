import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  requireAuth,
  requireDepartmentLeaderOrAdmin,
  requirePoleLeaderOrAdmin,
} from "./lib/auth";

const USER_CARD_FIELDS = (u: any) => ({
  _id: u._id,
  firstName: u.firstName,
  lastName: u.lastName,
  phone: u.phone,
  avatar: u.avatar,
  role: u.role,
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const poles = await ctx.db.query("poles").withIndex("by_creation_time").collect();
    poles.sort((a, b) => a.orderIndex - b.orderIndex);

    return await Promise.all(
      poles.map(async (pole) => {
        const [leaders, memberships, checklists, requirements] = await Promise.all([
          ctx.db.query("poleLeaders").withIndex("poleId", (q) => q.eq("poleId", pole._id)).collect(),
          ctx.db
            .query("poleMemberships")
            .withIndex("poleAndStatus", (q) => q.eq("poleId", pole._id).eq("status", "ACTIVE"))
            .collect(),
          ctx.db.query("checklists").withIndex("poleId", (q) => q.eq("poleId", pole._id)).collect(),
          ctx.db.query("eventRequirements").withIndex("poleId", (q) => q.eq("poleId", pole._id)).collect(),
        ]);

        const leadersWithUsers = await Promise.all(
          leaders.map(async (l) => {
            const user = await ctx.db.get(l.userId);
            return { ...l, user: user ? USER_CARD_FIELDS(user) : null };
          })
        );
        const membersWithUsers = await Promise.all(
          memberships.map(async (m) => {
            const user = await ctx.db.get(m.userId);
            return { ...m, user: user ? USER_CARD_FIELDS(user) : null };
          })
        );

        return {
          ...pole,
          leaders: leadersWithUsers,
          memberships: membersWithUsers,
          membersCount: memberships.length,
          leadersCount: leaders.length,
          checklistsCount: checklists.length,
          eventRequirementsCount: requirements.length,
        };
      })
    );
  },
});

export const get = query({
  args: { poleId: v.id("poles") },
  handler: async (ctx, { poleId }) => {
    await requireAuth(ctx);

    const pole = await ctx.db.get(poleId);
    if (!pole) throw new ConvexError("Pôle introuvable");

    const [leaders, memberships, checklists, pendingRequests, requirements] = await Promise.all([
      ctx.db.query("poleLeaders").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect(),
      ctx.db
        .query("poleMemberships")
        .withIndex("poleAndStatus", (q) => q.eq("poleId", poleId).eq("status", "ACTIVE"))
        .collect(),
      ctx.db.query("checklists").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect(),
      ctx.db
        .query("membershipRequests")
        .withIndex("poleId", (q) => q.eq("poleId", poleId))
        .filter((q) => q.eq(q.field("status"), "PENDING"))
        .order("desc")
        .collect(),
      ctx.db.query("eventRequirements").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect(),
    ]);

    const leadersWithUsers = await Promise.all(
      leaders.map(async (l) => ({ ...l, user: USER_CARD_FIELDS((await ctx.db.get(l.userId))!) }))
    );
    const membersWithUsers = await Promise.all(
      memberships.map(async (m) => ({ ...m, user: USER_CARD_FIELDS((await ctx.db.get(m.userId))!) }))
    );

    const activeChecklists = (
      await Promise.all(
        checklists
          .filter((c) => c.status === "ACTIVE")
          .map(async (c) => {
            const steps = await ctx.db.query("checklistSteps").withIndex("checklistId", (q) => q.eq("checklistId", c._id)).collect();
            steps.sort((a, b) => a.orderIndex - b.orderIndex);
            const eventChecklists = await ctx.db.query("eventChecklists").withIndex("checklistId", (q) => q.eq("checklistId", c._id)).collect();
            const eventChecklistsWithEvent = await Promise.all(
              eventChecklists.map(async (ec) => ({ ...ec, event: await ctx.db.get(ec.eventId) }))
            );
            return { ...c, steps, eventChecklists: eventChecklistsWithEvent };
          })
      )
    ).sort((a, b) => a.orderIndex - b.orderIndex);

    const pendingRequestsWithUsers = await Promise.all(
      pendingRequests.map(async (r) => ({
        ...r,
        user: USER_CARD_FIELDS((await ctx.db.get(r.userId))!),
      }))
    );

    const now = Date.now();
    const upcomingRequirements = (
      await Promise.all(
        requirements.map(async (r) => {
          const event = await ctx.db.get(r.eventId);
          if (!event || event.startsAt < now) return null;
          const assignments = await ctx.db
            .query("assignments")
            .withIndex("eventId", (q) => q.eq("eventId", r.eventId))
            .filter((q) => q.eq(q.field("poleId"), poleId))
            .collect();
          const assignmentsWithUsers = await Promise.all(
            assignments.map(async (a) => ({ ...a, user: USER_CARD_FIELDS((await ctx.db.get(a.userId))!) }))
          );
          return { ...r, event: { ...event, assignments: assignmentsWithUsers } };
        })
      )
    )
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.event.startsAt - b.event.startsAt);

    return {
      ...pole,
      leaders: leadersWithUsers,
      memberships: membersWithUsers,
      checklists: activeChecklists,
      membershipRequests: pendingRequestsWithUsers,
      eventRequirements: upcomingRequirements,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    await requireDepartmentLeaderOrAdmin(ctx);

    const name = args.name.trim();
    if (!name) throw new ConvexError("Nom du pôle obligatoire");

    let departmentId = args.departmentId;
    if (!departmentId) {
      const firstDept = await ctx.db.query("departments").first();
      if (!firstDept) throw new ConvexError("Aucun département configuré");
      departmentId = firstDept._id;
    }

    const poleId = await ctx.db.insert("poles", {
      departmentId,
      name,
      description: args.description?.trim() || undefined,
      color: args.color || "#3b68f0",
      icon: args.icon || "Users",
      orderIndex: 0,
      status: "ACTIVE",
    });

    return await ctx.db.get(poleId);
  },
});

export const update = mutation({
  args: {
    poleId: v.id("poles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { poleId, name, description, color, icon }) => {
    await requirePoleLeaderOrAdmin(ctx, poleId);

    const patch: Record<string, unknown> = {};
    if (name) patch.name = name.trim();
    if (description !== undefined) patch.description = description?.trim() || undefined;
    if (color) patch.color = color;
    if (icon) patch.icon = icon;

    await ctx.db.patch(poleId, patch);
    return await ctx.db.get(poleId);
  },
});

export const remove = mutation({
  args: { poleId: v.id("poles") },
  handler: async (ctx, { poleId }) => {
    await requireDepartmentLeaderOrAdmin(ctx);

    // Postgres enforced these cascades via `onDelete: Cascade` at the DB
    // level; Convex has no equivalent, so every dependent table that used
    // to cascade off Pole must be deleted here explicitly, children first.
    const [leaders, memberships, requests, requirements, assignments, checklists, trainingModules] =
      await Promise.all([
        ctx.db.query("poleLeaders").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect(),
        ctx.db.query("poleMemberships").withIndex("poleAndStatus", (q) => q.eq("poleId", poleId)).collect(),
        ctx.db.query("membershipRequests").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect(),
        ctx.db.query("eventRequirements").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect(),
        ctx.db.query("assignments").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect(),
        ctx.db.query("checklists").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect(),
        ctx.db.query("trainingModules").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect(),
      ]);

    for (const l of leaders) await ctx.db.delete(l._id);
    for (const m of memberships) await ctx.db.delete(m._id);
    for (const r of requests) await ctx.db.delete(r._id);
    for (const r of requirements) await ctx.db.delete(r._id);
    for (const a of assignments) await ctx.db.delete(a._id);

    for (const checklist of checklists) {
      const steps = await ctx.db.query("checklistSteps").withIndex("checklistId", (q) => q.eq("checklistId", checklist._id)).collect();
      const eventChecklists = await ctx.db.query("eventChecklists").withIndex("checklistId", (q) => q.eq("checklistId", checklist._id)).collect();
      const executions = await ctx.db.query("checklistExecutions").withIndex("checklistId", (q) => q.eq("checklistId", checklist._id)).collect();
      for (const execution of executions) {
        const execSteps = await ctx.db
          .query("checklistExecutionSteps")
          .withIndex("executionId", (q) => q.eq("executionId", execution._id))
          .collect();
        for (const es of execSteps) await ctx.db.delete(es._id);
        await ctx.db.delete(execution._id);
      }
      for (const ec of eventChecklists) await ctx.db.delete(ec._id);
      for (const s of steps) await ctx.db.delete(s._id);
      await ctx.db.delete(checklist._id);
    }

    for (const module of trainingModules) {
      const lessons = await ctx.db.query("trainingLessons").withIndex("moduleId", (q) => q.eq("moduleId", module._id)).collect();
      for (const lesson of lessons) {
        const completions = await ctx.db.query("trainingLessonCompletions").withIndex("lessonId", (q) => q.eq("lessonId", lesson._id)).collect();
        for (const c of completions) await ctx.db.delete(c._id);
        await ctx.db.delete(lesson._id);
      }
      const progress = await ctx.db.query("trainingModuleProgress").withIndex("moduleId", (q) => q.eq("moduleId", module._id)).collect();
      for (const p of progress) await ctx.db.delete(p._id);
      await ctx.db.delete(module._id);
    }

    const poleServiceValidations = await ctx.db
      .query("serviceValidations")
      .filter((q) => q.eq(q.field("poleId"), poleId))
      .collect();
    for (const sv of poleServiceValidations) await ctx.db.delete(sv._id);

    await ctx.db.delete(poleId);
    return { success: true };
  },
});

export const removeMember = mutation({
  args: { poleId: v.id("poles"), userId: v.id("users") },
  handler: async (ctx, { poleId, userId }) => {
    await requirePoleLeaderOrAdmin(ctx, poleId);

    const memberships = await ctx.db
      .query("poleMemberships")
      .withIndex("userAndPole", (q) => q.eq("userId", userId).eq("poleId", poleId))
      .collect();
    for (const m of memberships) await ctx.db.delete(m._id);

    const leaderships = await ctx.db
      .query("poleLeaders")
      .withIndex("poleAndUser", (q) => q.eq("poleId", poleId).eq("userId", userId))
      .collect();
    for (const l of leaderships) await ctx.db.delete(l._id);

    // If the user's global role was POLE_LEADER, check if they lead any other pole
    const targetUser = await ctx.db.get(userId);
    if (targetUser && targetUser.role === "POLE_LEADER") {
      const remainingLeaderships = await ctx.db
        .query("poleLeaders")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect();
      if (remainingLeaderships.length === 0) {
        await ctx.db.patch(userId, { role: "MEMBER" });
      }
    }

    return { success: true, message: "Membre retiré du pôle" };
  },
});

export const toggleLeader = mutation({
  args: { poleId: v.id("poles"), userId: v.id("users"), roleTitle: v.optional(v.string()) },
  handler: async (ctx, { poleId, userId, roleTitle }) => {
    const actor = await requirePoleLeaderOrAdmin(ctx, poleId);

    const targetUser = await ctx.db.get(userId);
    if (!targetUser) throw new ConvexError("Membre introuvable");

    const existing = await ctx.db
      .query("poleLeaders")
      .withIndex("poleAndUser", (q) => q.eq("poleId", poleId).eq("userId", userId))
      .first();

    const pole = await ctx.db.get(poleId);

    if (existing) {
      await ctx.db.delete(existing._id);

      // Check if user still leads any other pole
      if (targetUser.role === "POLE_LEADER") {
        const remaining = await ctx.db
          .query("poleLeaders")
          .withIndex("userId", (q) => q.eq("userId", userId))
          .collect();
        const otherLeaderships = remaining.filter((l) => l._id !== existing._id);
        if (otherLeaderships.length === 0) {
          await ctx.db.patch(userId, { role: "MEMBER" });
        }
      }
    } else {
      await ctx.db.insert("poleLeaders", {
        poleId,
        userId,
        roleTitle: roleTitle || "Responsable de pôle",
      });

      // Automatically upgrade user role from MEMBER to POLE_LEADER
      if (targetUser.role === "MEMBER") {
        await ctx.db.patch(userId, { role: "POLE_LEADER" });
      }

      await ctx.db.insert("notifications", {
        userId,
        title: "Nomination comme Responsable",
        message: `Vous avez été nommé(e) responsable du pôle "${pole?.name || 'Département'}". Vos accès de gestion ont été activés.`,
        type: "ROLE_UPDATE",
        isRead: false,
        linkUrl: "/dashboard",
      });

      await ctx.db.insert("auditLogs", {
        actorId: actor._id,
        action: "POLE_LEADER_ASSIGNED",
        targetType: "USER",
        targetId: userId,
        details: JSON.stringify({ poleId, poleName: pole?.name, previousRole: targetUser.role, newRole: "POLE_LEADER" }),
      });
    }

    return { success: true };
  },
});

export const addMember = mutation({
  args: { poleId: v.id("poles"), userId: v.id("users") },
  handler: async (ctx, { poleId, userId }) => {
    await requirePoleLeaderOrAdmin(ctx, poleId);

    const existing = await ctx.db
      .query("poleMemberships")
      .withIndex("userAndPole", (q) => q.eq("userId", userId).eq("poleId", poleId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { status: "ACTIVE", updatedAt: Date.now() });
    } else {
      await ctx.db.insert("poleMemberships", {
        userId,
        poleId,
        status: "ACTIVE",
        joinedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
