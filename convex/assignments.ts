import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";
import { Doc } from "./_generated/dataModel";

export const list = query({
  args: {
    eventId: v.optional(v.id("events")),
    poleId: v.optional(v.id("poles")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { eventId, poleId, userId }) => {
    await requireAuth(ctx);

    let assignments: Doc<"assignments">[];
    if (eventId) {
      assignments = await ctx.db.query("assignments").withIndex("eventId", (q) => q.eq("eventId", eventId)).order("desc").collect();
    } else if (userId) {
      assignments = await ctx.db.query("assignments").withIndex("userId", (q) => q.eq("userId", userId)).order("desc").collect();
    } else if (poleId) {
      assignments = await ctx.db.query("assignments").withIndex("poleId", (q) => q.eq("poleId", poleId)).order("desc").collect();
    } else {
      assignments = await ctx.db.query("assignments").withIndex("by_creation_time").order("desc").collect();
    }

    if (eventId && poleId) assignments = assignments.filter((a) => a.poleId === poleId);
    if (eventId && userId) assignments = assignments.filter((a) => a.userId === userId);
    if (poleId && userId && !eventId) assignments = assignments.filter((a) => a.userId === userId);

    return await Promise.all(
      assignments.map(async (a) => ({
        ...a,
        user: await ctx.db.get(a.userId),
        pole: await ctx.db.get(a.poleId),
        event: await ctx.db.get(a.eventId),
      }))
    );
  },
});

export const create = mutation({
  args: {
    eventId: v.id("events"),
    poleId: v.id("poles"),
    userId: v.id("users"),
    roleTag: v.optional(v.string()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, { eventId, poleId, userId, roleTag, force }) => {
    const actor = await requireAuth(ctx);

    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Événement non trouvé");

    const targetUser = await ctx.db.get(userId);
    if (!targetUser) throw new Error("Utilisateur non trouvé");

    const isPrivileged = targetUser.role === "SUPER_ADMIN" || targetUser.role === "DEPARTMENT_LEADER";
    const membership = await ctx.db
      .query("poleMemberships")
      .withIndex("userAndPole", (q) => q.eq("userId", userId).eq("poleId", poleId))
      .first();

    if (!isPrivileged && !membership) {
      throw new Error("Vous ne pouvez vous positionner que dans un pôle auquel vous appartenez.");
    }

    const existingOnEvent = await ctx.db
      .query("assignments")
      .withIndex("eventAndUser", (q) => q.eq("eventId", eventId).eq("userId", userId))
      .first();

    if (existingOnEvent) {
      const existingPole = await ctx.db.get(existingOnEvent.poleId);
      throw new Error(
        `Ce membre est déjà affecté à cet événement sur le pôle "${existingPole?.name}". Une double affectation est interdite.`
      );
    }

    const userUnavailabilities = await ctx.db.query("unavailabilities").withIndex("userId", (q) => q.eq("userId", userId)).collect();
    const overlappingUnavailability = userUnavailabilities.find(
      (u) => u.startsAt <= event.endsAt && u.endsAt >= event.startsAt
    );
    if (overlappingUnavailability && !force) {
      throw new Error(
        `Le membre a déclaré une indisponibilité sur ce créneau (${overlappingUnavailability.reason || "Non spécifié"}).`
      );
    }

    const userAssignments = await ctx.db.query("assignments").withIndex("userId", (q) => q.eq("userId", userId)).collect();
    for (const a of userAssignments) {
      if (a.eventId === eventId || a.status === "CANCELLED") continue;
      const otherEvent = await ctx.db.get(a.eventId);
      if (otherEvent && otherEvent.startsAt <= event.endsAt && otherEvent.endsAt >= event.startsAt) {
        if (!force) {
          throw new Error(`Le membre est déjà affecté à "${otherEvent.title}" sur le même créneau horaire.`);
        }
        break;
      }
    }

    const assignmentId = await ctx.db.insert("assignments", {
      eventId,
      poleId,
      userId,
      assignedById: actor._id,
      roleTag: roleTag || "Membre affecté",
      status: "CONFIRMED",
      updatedAt: Date.now(),
    });

    const existingValidation = await ctx.db
      .query("serviceValidations")
      .withIndex("eventUserPole", (q) => q.eq("eventId", eventId).eq("userId", userId).eq("poleId", poleId))
      .first();
    if (!existingValidation) {
      await ctx.db.insert("serviceValidations", {
        eventId,
        userId,
        poleId,
        status: "PENDING",
        reminderCount: 0,
        updatedAt: Date.now(),
      });
    }

    const pole = await ctx.db.get(poleId);
    await ctx.db.insert("notifications", {
      userId,
      title: "Nouvelle affectation de service",
      message: `Vous avez été affecté(e) au service "${event.title}" pour le pôle ${pole?.name}.`,
      type: "ASSIGNMENT",
      isRead: false,
      linkUrl: `/events/${eventId}`,
    });

    const assignment = await ctx.db.get(assignmentId);
    return { ...assignment, user: targetUser, pole, event };
  },
});

export const remove = mutation({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, { assignmentId }) => {
    await requireAuth(ctx);

    const assignment = await ctx.db.get(assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    await ctx.db.delete(assignmentId);

    const pendingValidation = await ctx.db
      .query("serviceValidations")
      .withIndex("eventUserPole", (q) =>
        q.eq("eventId", assignment.eventId).eq("userId", assignment.userId).eq("poleId", assignment.poleId)
      )
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();
    for (const sv of pendingValidation) await ctx.db.delete(sv._id);

    return { success: true };
  },
});
