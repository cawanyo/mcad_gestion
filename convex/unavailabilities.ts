import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, isLeaderOrAdmin } from "./lib/auth";
import { Doc } from "./_generated/dataModel";

async function enrichWithUser(ctx: any, u: Doc<"unavailabilities">) {
  const user = await ctx.db.get(u.userId);
  if (!user) return { ...u, user: null };
  const memberships = await ctx.db.query("poleMemberships").withIndex("userId", (q: any) => q.eq("userId", user._id)).collect();
  const membershipsWithPole = await Promise.all(memberships.map(async (m: Doc<"poleMemberships">) => ({ ...m, pole: await ctx.db.get(m.poleId) })));
  return {
    ...u,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      gender: user.gender,
      avatar: user.avatar,
      role: user.role,
      poleMemberships: membershipsWithPole,
    },
  };
}

export const list = query({
  args: {
    userId: v.optional(v.id("users")),
    poleId: v.optional(v.id("poles")),
    search: v.optional(v.string()),
    scope: v.optional(v.union(v.literal("active"), v.literal("upcoming"), v.literal("past"), v.literal("all"))),
  },
  handler: async (ctx, { userId, poleId, search, scope }) => {
    await requireAuth(ctx);

    let items: Doc<"unavailabilities">[];
    if (userId) {
      items = await ctx.db.query("unavailabilities").withIndex("userId", (q) => q.eq("userId", userId)).collect();
    } else {
      items = await ctx.db.query("unavailabilities").withIndex("by_creation_time").collect();
    }

    const now = Date.now();
    if (scope === "active") {
      items = items.filter((u) => u.startsAt <= now && u.endsAt >= now);
    } else if (scope === "upcoming") {
      items = items.filter((u) => u.startsAt >= now);
    } else if (scope === "past") {
      items = items.filter((u) => u.endsAt < now);
    }

    if (poleId) {
      const poleMemberUserIds = new Set(
        (await ctx.db.query("poleMemberships").withIndex("poleAndStatus", (q) => q.eq("poleId", poleId)).collect()).map((m) => m.userId)
      );
      items = items.filter((u) => poleMemberUserIds.has(u.userId));
    }

    items.sort((a, b) => a.startsAt - b.startsAt);
    let enriched = await Promise.all(items.map((u) => enrichWithUser(ctx, u)));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(
        (u) =>
          u.reason?.toLowerCase().includes(q) ||
          u.user?.firstName.toLowerCase().includes(q) ||
          u.user?.lastName.toLowerCase().includes(q) ||
          u.user?.phone?.toLowerCase().includes(q)
      );
    }

    return enriched;
  },
});

export const create = mutation({
  args: {
    userId: v.optional(v.id("users")),
    startsAt: v.number(),
    endsAt: v.number(),
    reason: v.optional(v.string()),
    recurrence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuth(ctx);
    const targetUserId = args.userId || currentUser._id;

    if (targetUserId !== currentUser._id && !isLeaderOrAdmin(currentUser)) {
      throw new Error("Action non autorisée pour un autre membre.");
    }

    if (!args.startsAt || !args.endsAt) {
      throw new Error("Veuillez renseigner la date de début et la date de fin.");
    }
    if (args.endsAt < args.startsAt) {
      throw new Error("La date de fin ne peut pas être antérieure à la date de début.");
    }

    const unavailabilityId = await ctx.db.insert("unavailabilities", {
      userId: targetUserId,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      reason: args.reason?.trim() || "Indisponible",
      recurrence: args.recurrence || "NONE",
      updatedAt: Date.now(),
    });

    const userAssignments = await ctx.db.query("assignments").withIndex("userId", (q) => q.eq("userId", targetUserId)).collect();
    const conflicts = (
      await Promise.all(
        userAssignments.map(async (a) => {
          const event = await ctx.db.get(a.eventId);
          if (!event || event.startsAt > args.endsAt || event.endsAt < args.startsAt) return null;
          return { ...a, event, pole: await ctx.db.get(a.poleId) };
        })
      )
    ).filter((c): c is NonNullable<typeof c> => c !== null);

    const created = await enrichWithUser(ctx, (await ctx.db.get(unavailabilityId))!);
    return { ...created, hasConflicts: conflicts.length > 0, conflicts };
  },
});

export const update = mutation({
  args: {
    unavailabilityId: v.id("unavailabilities"),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    reason: v.optional(v.string()),
    recurrence: v.optional(v.string()),
  },
  handler: async (ctx, { unavailabilityId, startsAt, endsAt, reason, recurrence }) => {
    const currentUser = await requireAuth(ctx);

    const existing = await ctx.db.get(unavailabilityId);
    if (!existing) throw new Error("Indisponibilité introuvable.");

    if (existing.userId !== currentUser._id && !isLeaderOrAdmin(currentUser)) {
      throw new Error("Action non autorisée sur cette indisponibilité.");
    }

    const nextStart = startsAt ?? existing.startsAt;
    const nextEnd = endsAt ?? existing.endsAt;
    if (nextEnd < nextStart) {
      throw new Error("La date de fin ne peut pas être antérieure à la date de début.");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (startsAt) patch.startsAt = startsAt;
    if (endsAt) patch.endsAt = endsAt;
    if (reason !== undefined) patch.reason = reason?.trim() || undefined;
    if (recurrence !== undefined) patch.recurrence = recurrence;

    await ctx.db.patch(unavailabilityId, patch);
    return await enrichWithUser(ctx, (await ctx.db.get(unavailabilityId))!);
  },
});

export const remove = mutation({
  args: { unavailabilityId: v.id("unavailabilities") },
  handler: async (ctx, { unavailabilityId }) => {
    const currentUser = await requireAuth(ctx);

    const existing = await ctx.db.get(unavailabilityId);
    if (!existing) throw new Error("Indisponibilité introuvable.");

    if (existing.userId !== currentUser._id && !isLeaderOrAdmin(currentUser)) {
      throw new Error("Action non autorisée sur cette indisponibilité.");
    }

    await ctx.db.delete(unavailabilityId);
    return { success: true, id: unavailabilityId };
  },
});
