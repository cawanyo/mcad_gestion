import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAuth, requireLeaderOrAdmin, requirePoleLeaderOrAdmin } from "./lib/auth";
import { Doc } from "./_generated/dataModel";

export const list = query({
  args: {
    status: v.optional(v.string()),
    poleId: v.optional(v.id("poles")),
  },
  handler: async (ctx, { status, poleId }) => {
    await requireLeaderOrAdmin(ctx);

    let requests: Doc<"membershipRequests">[];
    if (poleId) {
      requests = await ctx.db.query("membershipRequests").withIndex("poleId", (q) => q.eq("poleId", poleId)).order("desc").collect();
    } else if (status && status !== "ALL") {
      requests = await ctx.db.query("membershipRequests").withIndex("status", (q) => q.eq("status", status)).order("desc").collect();
    } else {
      requests = await ctx.db.query("membershipRequests").withIndex("by_creation_time").order("desc").collect();
    }

    if (poleId && status && status !== "ALL") {
      requests = requests.filter((r) => r.status === status);
    }

    return await Promise.all(
      requests.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        const pole = await ctx.db.get(r.poleId);
        const reviewedBy = r.reviewedById ? await ctx.db.get(r.reviewedById) : null;
        const poleMemberships = user
          ? await ctx.db
              .query("poleMemberships")
              .withIndex("userAndPole", (q) => q.eq("userId", r.userId))
              .filter((q) => q.eq(q.field("status"), "ACTIVE"))
              .collect()
          : [];
        const poleMembershipsWithPole = await Promise.all(
          poleMemberships.map(async (pm) => ({ ...pm, pole: await ctx.db.get(pm.poleId) }))
        );

        return {
          ...r,
          user: user && {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            gender: user.gender,
            phone: user.phone,
            avatar: user.avatar,
            role: user.role,
            poleMemberships: poleMembershipsWithPole,
          },
          pole,
          reviewedBy: reviewedBy && {
            _id: reviewedBy._id,
            firstName: reviewedBy.firstName,
            lastName: reviewedBy.lastName,
          },
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    poleId: v.id("poles"),
    motivation: v.optional(v.string()),
  },
  handler: async (ctx, { poleId, motivation }) => {
    const user = await requireAuth(ctx);

    const existing = await ctx.db
      .query("membershipRequests")
      .withIndex("userAndStatus", (q) => q.eq("userId", user._id).eq("status", "PENDING"))
      .filter((q) => q.eq(q.field("poleId"), poleId))
      .first();

    if (existing) {
      throw new ConvexError("Une demande est déjà en cours pour ce pôle");
    }

    const requestId = await ctx.db.insert("membershipRequests", {
      userId: user._id,
      poleId,
      motivation: motivation?.trim() || "Souhaite rejoindre l'équipe.",
      status: "PENDING",
      updatedAt: Date.now(),
    });

    return await ctx.db.get(requestId);
  },
});

export const review = mutation({
  args: {
    requestId: v.id("membershipRequests"),
    status: v.union(v.literal("APPROVED"), v.literal("REJECTED")),
  },
  handler: async (ctx, { requestId, status }) => {
    const request = await ctx.db.get(requestId);
    if (!request) throw new ConvexError("Demande introuvable");

    const reviewer = await requirePoleLeaderOrAdmin(ctx, request.poleId);
    const pole = await ctx.db.get(request.poleId);

    await ctx.db.patch(requestId, {
      status,
      reviewedById: reviewer._id,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (status === "APPROVED") {
      const existingMembership = await ctx.db
        .query("poleMemberships")
        .withIndex("userAndPole", (q) => q.eq("userId", request.userId).eq("poleId", request.poleId))
        .first();

      if (existingMembership) {
        await ctx.db.patch(existingMembership._id, { status: "ACTIVE", updatedAt: Date.now() });
      } else {
        await ctx.db.insert("poleMemberships", {
          userId: request.userId,
          poleId: request.poleId,
          status: "ACTIVE",
          joinedAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      await ctx.db.insert("notifications", {
        userId: request.userId,
        title: "Adhésion approuvée !",
        message: `Votre demande pour rejoindre le pôle ${pole?.name} a été acceptée par ${reviewer.firstName} ${reviewer.lastName}.`,
        type: "MEMBERSHIP_APPROVED",
        isRead: false,
        linkUrl: "/poles",
      });
    } else {
      await ctx.db.insert("notifications", {
        userId: request.userId,
        title: "Demande d'adhésion",
        message: `Votre demande pour rejoindre le pôle ${pole?.name} n'a pas été retenue.`,
        type: "MEMBERSHIP_REJECTED",
        isRead: false,
        linkUrl: "/poles",
      });
    }

    return await ctx.db.get(requestId);
  },
});
