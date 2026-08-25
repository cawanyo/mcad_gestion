import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";

export const list = query({
  args: {
    eventId: v.optional(v.id("events")),
    poleId: v.optional(v.id("poles")),
    userId: v.optional(v.id("users")),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { eventId, poleId, userId, status, search }) => {
    await requireAuth(ctx);

    let validations: Doc<"serviceValidations">[];
    if (eventId) {
      validations = await ctx.db.query("serviceValidations").withIndex("eventUserPole", (q) => q.eq("eventId", eventId)).collect();
    } else if (userId) {
      validations = await ctx.db.query("serviceValidations").withIndex("userId", (q) => q.eq("userId", userId)).collect();
    } else if (status) {
      validations = await ctx.db.query("serviceValidations").withIndex("status", (q) => q.eq("status", status.toUpperCase())).collect();
    } else {
      validations = await ctx.db.query("serviceValidations").withIndex("by_creation_time").collect();
    }

    if (poleId) validations = validations.filter((v) => v.poleId === poleId);
    if (eventId && userId) validations = validations.filter((v) => v.userId === userId);
    if (status && (eventId || userId)) validations = validations.filter((v) => v.status === status.toUpperCase());

    const baseFiltered = validations;
    const allCount = baseFiltered.length;
    const validatedCount = baseFiltered.filter((v) => v.status === "VALIDATED").length;
    const pendingCount = baseFiltered.filter((v) => v.status === "PENDING").length;

    let enriched = await Promise.all(
      validations.map(async (val) => {
        const user = await ctx.db.get(val.userId);
        const pole = await ctx.db.get(val.poleId);
        const event = await ctx.db.get(val.eventId);
        const execution = val.checklistExecutionId ? await ctx.db.get(val.checklistExecutionId) : null;
        const memberships = user
          ? await ctx.db.query("poleMemberships").withIndex("userId", (q) => q.eq("userId", user._id)).collect()
          : [];
        const membershipsWithPole = await Promise.all(memberships.map(async (m) => ({ ...m, pole: await ctx.db.get(m.poleId) })));

        let checklistExecution = null;
        if (execution) {
          const [stepsCompleted, checklist] = await Promise.all([
            ctx.db.query("checklistExecutionSteps").withIndex("executionId", (q) => q.eq("executionId", execution._id)).collect(),
            ctx.db.get(execution.checklistId),
          ]);
          const checklistSteps = checklist
            ? await ctx.db.query("checklistSteps").withIndex("checklistId", (q) => q.eq("checklistId", checklist._id)).collect()
            : [];
          checklistExecution = { ...execution, stepsCompleted, checklist: checklist && { ...checklist, steps: checklistSteps } };
        }

        return {
          ...val,
          user: user && { ...user, poleMemberships: membershipsWithPole },
          pole,
          event,
          checklistExecution,
        };
      })
    );

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(
        (v) =>
          v.comment?.toLowerCase().includes(q) ||
          v.user?.firstName.toLowerCase().includes(q) ||
          v.user?.lastName.toLowerCase().includes(q) ||
          v.event?.title.toLowerCase().includes(q)
      );
    }

    return {
      validations: enriched,
      counts: { all: allCount, validated: validatedCount, pending: pendingCount, unassigned: 0 },
    };
  },
});

export const submit = mutation({
  args: {
    eventId: v.id("events"),
    poleId: v.id("poles"),
    userId: v.id("users"),
    comment: v.string(),
    rating: v.optional(v.number()),
    checklistExecutionId: v.optional(v.id("checklistExecutions")),
  },
  handler: async (ctx, { eventId, poleId, userId, comment, rating, checklistExecutionId }) => {
    await requireAuth(ctx);

    if (!eventId || !poleId || !userId) {
      throw new ConvexError("Culte, pôle et membre sont obligatoires pour la validation.");
    }
    if (!comment || comment.trim().length === 0) {
      throw new ConvexError("Le commentaire / retour d'expérience est obligatoire pour valider votre service.");
    }

    const existing = await ctx.db
      .query("serviceValidations")
      .withIndex("eventUserPole", (q) => q.eq("eventId", eventId).eq("userId", userId).eq("poleId", poleId))
      .first();

    const patch = {
      comment: comment.trim(),
      rating: Number(rating) || 5,
      status: "VALIDATED",
      validatedAt: Date.now(),
      checklistExecutionId,
      updatedAt: Date.now(),
    };

    let validationId;
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      validationId = existing._id;
    } else {
      validationId = await ctx.db.insert("serviceValidations", {
        eventId,
        userId,
        poleId,
        reminderCount: 0,
        ...patch,
      });
    }

    if (checklistExecutionId) {
      await ctx.db.patch(checklistExecutionId, { status: "VALIDATED", completedAt: Date.now(), updatedAt: Date.now() });
    }

    await ctx.db.insert("auditLogs", {
      actorId: userId,
      action: "SERVICE_VALIDATED",
      targetType: "EVENT",
      targetId: eventId,
      details: JSON.stringify({ comment, rating: rating || 5, validatedAt: Date.now() }),
    });

    const [user, pole, event] = await Promise.all([ctx.db.get(userId), ctx.db.get(poleId), ctx.db.get(eventId)]);

    const poleLeaders = await ctx.db.query("poleLeaders").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect();
    for (const pl of poleLeaders) {
      if (pl.userId !== userId) {
        await ctx.db.insert("notifications", {
          userId: pl.userId,
          title: `Service validé : ${user?.firstName} ${user?.lastName}`,
          message: `${user?.firstName} a validé son service pour "${event?.title}" (${pole?.name}) avec une note de ${rating || 5}/5.`,
          type: "SERVICE_VALIDATION",
          isRead: false,
          linkUrl: "/validations",
        });
      }
    }

    return { ...(await ctx.db.get(validationId)), user, pole, event };
  },
});

export const validateOnBehalf = mutation({
  args: {
    validationId: v.id("serviceValidations"),
    comment: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, { validationId, comment, rating }) => {
    await requireAuth(ctx);

    const val = await ctx.db.get(validationId);
    if (!val) throw new ConvexError("Validation not found");

    await ctx.db.patch(validationId, {
      status: "VALIDATED",
      validatedAt: Date.now(),
      comment: comment || "Validé par le responsable",
      rating: Number(rating) || 5,
      updatedAt: Date.now(),
    });

    const [user, event, pole] = await Promise.all([ctx.db.get(val.userId), ctx.db.get(val.eventId), ctx.db.get(val.poleId)]);
    return { success: true, validation: { ...(await ctx.db.get(validationId)), user, event, pole } };
  },
});

export const sendReminder = mutation({
  args: { validationId: v.id("serviceValidations") },
  handler: async (ctx, { validationId }) => {
    await requireAuth(ctx);

    const val = await ctx.db.get(validationId);
    if (!val) throw new ConvexError("Validation not found");

    await ctx.db.patch(validationId, {
      reminderSentAt: Date.now(),
      reminderCount: val.reminderCount + 1,
      updatedAt: Date.now(),
    });

    const [event, pole] = await Promise.all([ctx.db.get(val.eventId), ctx.db.get(val.poleId)]);
    await ctx.db.insert("notifications", {
      userId: val.userId,
      title: "🔔 Rappel : Validation de votre service",
      message: `N'oubliez pas de valider votre service pour le culte "${event?.title}" (${pole?.name}). Remplissez votre retour d'expérience !`,
      type: "SERVICE_REMINDER",
      isRead: false,
      linkUrl: "/validations",
    });

    return { success: true, message: "Rappel envoyé avec succès" };
  },
});
