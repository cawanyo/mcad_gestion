import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { requireAuth, requireLeaderOrAdmin } from "./lib/auth";

const STEP_INPUT = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  details: v.optional(v.string()),
  mediaType: v.optional(v.string()),
  mediaUrl: v.optional(v.string()),
  mediaThumbnail: v.optional(v.string()),
});

async function enrichChecklist(ctx: any, checklist: Doc<"checklists">) {
  const [pole, steps, eventChecklists] = await Promise.all([
    ctx.db.get(checklist.poleId),
    ctx.db.query("checklistSteps").withIndex("checklistId", (q: any) => q.eq("checklistId", checklist._id)).collect(),
    ctx.db.query("eventChecklists").withIndex("checklistId", (q: any) => q.eq("checklistId", checklist._id)).collect(),
  ]);
  steps.sort((a: Doc<"checklistSteps">, b: Doc<"checklistSteps">) => a.orderIndex - b.orderIndex);
  const eventChecklistsWithEvent = await Promise.all(
    eventChecklists.map(async (ec: Doc<"eventChecklists">) => ({ ...ec, event: await ctx.db.get(ec.eventId) }))
  );
  const executions = await ctx.db.query("checklistExecutions").withIndex("checklistId", (q: any) => q.eq("checklistId", checklist._id)).collect();

  return {
    ...checklist,
    pole,
    steps,
    eventChecklists: eventChecklistsWithEvent,
    stepsCount: steps.length,
    executionsCount: executions.length,
  };
}

export const list = query({
  args: {
    poleId: v.optional(v.id("poles")),
    eventId: v.optional(v.id("events")),
  },
  handler: async (ctx, { poleId, eventId }) => {
    await requireAuth(ctx);

    let checklists: Doc<"checklists">[];
    if (poleId) {
      checklists = await ctx.db.query("checklists").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect();
    } else {
      checklists = await ctx.db.query("checklists").withIndex("status", (q) => q.eq("status", "ACTIVE")).collect();
    }
    checklists = checklists.filter((c) => c.status === "ACTIVE");

    if (eventId) {
      const eventChecklistIds = new Set(
        (await ctx.db.query("eventChecklists").withIndex("eventId", (q) => q.eq("eventId", eventId)).collect()).map((ec) => ec.checklistId)
      );
      checklists = checklists.filter((c) => eventChecklistIds.has(c._id));
    }

    checklists.sort((a, b) => a.orderIndex - b.orderIndex);
    return await Promise.all(checklists.map((c) => enrichChecklist(ctx, c)));
  },
});

export const get = query({
  args: { checklistId: v.id("checklists") },
  handler: async (ctx, { checklistId }) => {
    await requireAuth(ctx);
    const checklist = await ctx.db.get(checklistId);
    if (!checklist) throw new ConvexError("Checklist not found");
    return await enrichChecklist(ctx, checklist);
  },
});

export const create = mutation({
  args: {
    poleId: v.id("poles"),
    title: v.string(),
    description: v.optional(v.string()),
    steps: v.optional(v.array(STEP_INPUT)),
  },
  handler: async (ctx, { poleId, title, description, steps }) => {
    await requireLeaderOrAdmin(ctx);

    const trimmedTitle = title.trim();
    if (!poleId || !trimmedTitle) throw new ConvexError("Pôle et titre requis");

    const checklistId = await ctx.db.insert("checklists", {
      poleId,
      title: trimmedTitle,
      description: description?.trim() || undefined,
      status: "ACTIVE",
      orderIndex: 0,
      updatedAt: Date.now(),
    });

    if (steps?.length) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await ctx.db.insert("checklistSteps", {
          checklistId,
          orderIndex: i + 1,
          title: s.title.trim(),
          description: s.description?.trim() || undefined,
          details: s.details?.trim() || undefined,
          mediaType: s.mediaType || "NONE",
          mediaUrl: s.mediaUrl,
          mediaThumbnail: s.mediaThumbnail,
          isRequired: true,
          updatedAt: Date.now(),
        });
      }
    }

    return await enrichChecklist(ctx, (await ctx.db.get(checklistId))!);
  },
});

export const update = mutation({
  args: {
    checklistId: v.id("checklists"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    steps: v.optional(v.array(STEP_INPUT)),
    associateEventId: v.optional(v.id("events")),
    dissociateEventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    await requireLeaderOrAdmin(ctx);
    const { checklistId } = args;

    if (args.associateEventId) {
      const existing = await ctx.db
        .query("eventChecklists")
        .withIndex("eventAndChecklist", (q) => q.eq("eventId", args.associateEventId!).eq("checklistId", checklistId))
        .first();
      if (!existing) {
        await ctx.db.insert("eventChecklists", { eventId: args.associateEventId, checklistId });
      }
    }

    if (args.dissociateEventId) {
      const existing = await ctx.db
        .query("eventChecklists")
        .withIndex("eventAndChecklist", (q) => q.eq("eventId", args.dissociateEventId!).eq("checklistId", checklistId))
        .collect();
      for (const ec of existing) await ctx.db.delete(ec._id);
    }

    if (args.steps) {
      const existingSteps = await ctx.db.query("checklistSteps").withIndex("checklistId", (q) => q.eq("checklistId", checklistId)).collect();
      for (const s of existingSteps) await ctx.db.delete(s._id);
      for (let i = 0; i < args.steps.length; i++) {
        const s = args.steps[i];
        await ctx.db.insert("checklistSteps", {
          checklistId,
          orderIndex: i + 1,
          title: s.title.trim(),
          description: s.description?.trim() || undefined,
          details: s.details?.trim() || undefined,
          mediaType: s.mediaType || "NONE",
          mediaUrl: s.mediaUrl,
          mediaThumbnail: s.mediaThumbnail,
          isRequired: true,
          updatedAt: Date.now(),
        });
      }
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title) patch.title = args.title.trim();
    if (args.description !== undefined) patch.description = args.description?.trim() || undefined;
    if (args.status) patch.status = args.status;

    await ctx.db.patch(checklistId, patch);
    return await enrichChecklist(ctx, (await ctx.db.get(checklistId))!);
  },
});

export const remove = mutation({
  args: { checklistId: v.id("checklists") },
  handler: async (ctx, { checklistId }) => {
    await requireLeaderOrAdmin(ctx);

    const checklist = await ctx.db.get(checklistId);
    if (!checklist) throw new ConvexError("Checklist introuvable");

    const [eventChecklists, steps, executions] = await Promise.all([
      ctx.db.query("eventChecklists").withIndex("checklistId", (q) => q.eq("checklistId", checklistId)).collect(),
      ctx.db.query("checklistSteps").withIndex("checklistId", (q) => q.eq("checklistId", checklistId)).collect(),
      ctx.db.query("checklistExecutions").withIndex("checklistId", (q) => q.eq("checklistId", checklistId)).collect(),
    ]);

    for (const ec of eventChecklists) await ctx.db.delete(ec._id);
    for (const execution of executions) {
      const execSteps = await ctx.db
        .query("checklistExecutionSteps")
        .withIndex("executionId", (q) => q.eq("executionId", execution._id))
        .collect();
      for (const es of execSteps) await ctx.db.delete(es._id);
      await ctx.db.delete(execution._id);
    }
    for (const s of steps) await ctx.db.delete(s._id);

    await ctx.db.delete(checklistId);
    return { success: true };
  },
});

export const listExecutions = query({
  args: {
    checklistId: v.optional(v.id("checklists")),
    poleId: v.optional(v.id("poles")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { checklistId, poleId, userId }) => {
    await requireAuth(ctx);

    let executions: Doc<"checklistExecutions">[];
    if (checklistId) {
      executions = await ctx.db.query("checklistExecutions").withIndex("checklistId", (q) => q.eq("checklistId", checklistId)).collect();
    } else if (userId) {
      executions = await ctx.db.query("checklistExecutions").withIndex("userId", (q) => q.eq("userId", userId)).collect();
    } else if (poleId) {
      executions = await ctx.db.query("checklistExecutions").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect();
    } else {
      executions = await ctx.db.query("checklistExecutions").withIndex("by_creation_time").collect();
    }
    if (checklistId && poleId) executions = executions.filter((e) => e.poleId === poleId);
    if (checklistId && userId) executions = executions.filter((e) => e.userId === userId);

    executions.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

    return await Promise.all(
      executions.map(async (e) => {
        const [user, checklist, event, stepsCompleted] = await Promise.all([
          ctx.db.get(e.userId),
          ctx.db.get(e.checklistId),
          e.eventId ? ctx.db.get(e.eventId) : Promise.resolve(null),
          ctx.db.query("checklistExecutionSteps").withIndex("executionId", (q) => q.eq("executionId", e._id)).collect(),
        ]);
        const stepsCompletedWithStep = await Promise.all(
          stepsCompleted.map(async (sc) => ({ ...sc, step: await ctx.db.get(sc.stepId) }))
        );
        return {
          ...e,
          user: user && { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, avatar: user.avatar },
          checklist: checklist && { _id: checklist._id, title: checklist.title, poleId: checklist.poleId },
          event: event && { _id: event._id, title: event.title, startsAt: event.startsAt },
          stepsCompleted: stepsCompletedWithStep,
        };
      })
    );
  },
});

export const createExecution = mutation({
  args: {
    checklistId: v.id("checklists"),
    userId: v.id("users"),
    poleId: v.optional(v.id("poles")),
    eventId: v.optional(v.id("events")),
    completedStepIds: v.optional(v.array(v.id("checklistSteps"))),
    comment: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let finalPoleId = args.poleId;
    if (!finalPoleId) {
      const checklist = await ctx.db.get(args.checklistId);
      finalPoleId = checklist?.poleId;
    }

    const executionId = await ctx.db.insert("checklistExecutions", {
      checklistId: args.checklistId,
      userId: args.userId,
      poleId: finalPoleId,
      eventId: args.eventId,
      status: args.status || "COMPLETED",
      comment: args.comment?.trim() || undefined,
      startedAt: Date.now(),
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (args.completedStepIds?.length) {
      for (const stepId of args.completedStepIds) {
        await ctx.db.insert("checklistExecutionSteps", {
          executionId,
          stepId,
          completed: true,
          completedAt: Date.now(),
        });
      }
    }

    const execution = (await ctx.db.get(executionId))!;
    const [user, checklist, stepsCompleted] = await Promise.all([
      ctx.db.get(args.userId),
      ctx.db.get(args.checklistId),
      ctx.db.query("checklistExecutionSteps").withIndex("executionId", (q) => q.eq("executionId", executionId)).collect(),
    ]);
    const checklistSteps = checklist
      ? await ctx.db.query("checklistSteps").withIndex("checklistId", (q) => q.eq("checklistId", checklist._id)).collect()
      : [];
    checklistSteps.sort((a, b) => a.orderIndex - b.orderIndex);
    const stepsCompletedWithStep = await Promise.all(stepsCompleted.map(async (sc) => ({ ...sc, step: await ctx.db.get(sc.stepId) })));

    return {
      ...execution,
      user: user && { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, avatar: user.avatar },
      checklist: checklist && { ...checklist, steps: checklistSteps },
      stepsCompleted: stepsCompletedWithStep,
    };
  },
});
