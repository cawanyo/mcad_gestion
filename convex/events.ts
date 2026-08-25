import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { requireAuth, requireLeaderOrAdmin } from "./lib/auth";

const USER_CARD_FIELDS = (u: Doc<"users">) => ({
  _id: u._id,
  firstName: u.firstName,
  lastName: u.lastName,
  phone: u.phone,
  avatar: u.avatar,
  role: u.role,
});

export async function enrichEvent(ctx: any, event: Doc<"events">) {
  const organizerPole = event.organizerPoleId ? await ctx.db.get(event.organizerPoleId) : null;
  const [requirements, assignments, eventChecklists] = await Promise.all([
    ctx.db.query("eventRequirements").withIndex("eventId", (q: any) => q.eq("eventId", event._id)).collect(),
    ctx.db.query("assignments").withIndex("eventId", (q: any) => q.eq("eventId", event._id)).collect(),
    ctx.db.query("eventChecklists").withIndex("eventId", (q: any) => q.eq("eventId", event._id)).collect(),
  ]);

  const requirementsWithPole = await Promise.all(
    requirements.map(async (r: Doc<"eventRequirements">) => ({ ...r, pole: await ctx.db.get(r.poleId) }))
  );
  const assignmentsWithUserAndPole = await Promise.all(
    assignments.map(async (a: Doc<"assignments">) => ({
      ...a,
      user: USER_CARD_FIELDS(await ctx.db.get(a.userId)),
      pole: await ctx.db.get(a.poleId),
    }))
  );
  const eventChecklistsWithChecklist = await Promise.all(
    eventChecklists.map(async (ec: Doc<"eventChecklists">) => {
      const checklist = await ctx.db.get(ec.checklistId);
      if (!checklist) return { ...ec, checklist: null };
      const [pole, steps] = await Promise.all([
        ctx.db.get(checklist.poleId),
        ctx.db.query("checklistSteps").withIndex("checklistId", (q: any) => q.eq("checklistId", checklist._id)).collect(),
      ]);
      steps.sort((a: Doc<"checklistSteps">, b: Doc<"checklistSteps">) => a.orderIndex - b.orderIndex);
      return { ...ec, checklist: { ...checklist, pole, steps } };
    })
  );

  return {
    ...event,
    organizerPole,
    requirements: requirementsWithPole,
    assignments: assignmentsWithUserAndPole,
    eventChecklists: eventChecklistsWithChecklist,
  };
}

async function eventInvolvesPole(ctx: any, event: Doc<"events">, poleId: Id<"poles">) {
  if (event.organizerPoleId === poleId) return true;

  const requirement = await ctx.db
    .query("eventRequirements")
    .withIndex("eventId", (q: any) => q.eq("eventId", event._id))
    .filter((q: any) => q.eq(q.field("poleId"), poleId))
    .first();
  if (requirement) return true;

  const assignment = await ctx.db
    .query("assignments")
    .withIndex("eventId", (q: any) => q.eq("eventId", event._id))
    .filter((q: any) => q.eq(q.field("poleId"), poleId))
    .first();
  if (assignment) return true;

  const eventChecklists = await ctx.db.query("eventChecklists").withIndex("eventId", (q: any) => q.eq("eventId", event._id)).collect();
  for (const ec of eventChecklists) {
    const checklist = await ctx.db.get(ec.checklistId);
    if (checklist?.poleId === poleId) return true;
  }
  return false;
}

export const list = query({
  args: {
    poleId: v.optional(v.id("poles")),
    month: v.optional(v.string()), // "YYYY-MM"
    status: v.optional(v.string()),
  },
  handler: async (ctx, { poleId, month, status }) => {
    await requireAuth(ctx);

    let events: Doc<"events">[];
    if (month) {
      const [year, m] = month.split("-").map(Number);
      const startOfMonth = new Date(year, m - 1, 1).getTime();
      const endOfMonth = new Date(year, m, 0, 23, 59, 59, 999).getTime();
      events = await ctx.db
        .query("events")
        .withIndex("startsAt", (q) => q.gte("startsAt", startOfMonth).lte("startsAt", endOfMonth))
        .collect();
    } else if (status) {
      events = await ctx.db.query("events").withIndex("status", (q) => q.eq("status", status)).collect();
    } else {
      events = await ctx.db.query("events").withIndex("by_creation_time").collect();
    }

    if (status && month) {
      events = events.filter((e) => e.status === status);
    }

    if (poleId) {
      const flags = await Promise.all(events.map((e) => eventInvolvesPole(ctx, e, poleId)));
      events = events.filter((_, i) => flags[i]);
    }

    events.sort((a, b) => a.startsAt - b.startsAt);
    return await Promise.all(events.map((e) => enrichEvent(ctx, e)));
  },
});

export const get = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    await requireAuth(ctx);

    const event = await ctx.db.get(eventId);
    if (!event) throw new ConvexError("Événement introuvable");

    const enriched = await enrichEvent(ctx, event);

    const [interests, serviceValidations] = await Promise.all([
      ctx.db.query("memberInterests").withIndex("eventId", (q) => q.eq("eventId", eventId)).collect(),
      ctx.db.query("serviceValidations").withIndex("eventUserPole", (q) => q.eq("eventId", eventId)).collect(),
    ]);

    const interestsWithUserAndPole = await Promise.all(
      interests.map(async (i) => ({
        ...i,
        user: USER_CARD_FIELDS((await ctx.db.get(i.userId))!),
        pole: await ctx.db.get(i.poleId),
      }))
    );
    const validationsWithUserAndPole = await Promise.all(
      serviceValidations.map(async (sv) => ({
        ...sv,
        user: USER_CARD_FIELDS((await ctx.db.get(sv.userId))!),
        pole: await ctx.db.get(sv.poleId),
      }))
    );

    return {
      ...enriched,
      interests: interestsWithUserAndPole,
      serviceValidations: validationsWithUserAndPole,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    location: v.string(),
    organizerPoleId: v.optional(v.id("poles")),
    coverImage: v.optional(v.string()),
    requirements: v.optional(
      v.array(v.object({ poleId: v.id("poles"), requiredCount: v.optional(v.number()), notes: v.optional(v.string()) }))
    ),
    checklistIds: v.optional(v.array(v.id("checklists"))),
    recurrenceRule: v.optional(v.string()), // NONE, WEEKLY, BIWEEKLY, MONTHLY
    recurrenceCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireLeaderOrAdmin(ctx);

    const title = args.title.trim();
    const location = args.location.trim();
    if (!title || !args.startsAt || !args.endsAt || !location) {
      throw new ConvexError("Titre, date début, date fin et lieu requis");
    }

    const dept = await ctx.db.query("departments").first();
    if (!dept) throw new ConvexError("Department not found");

    const recurrenceRule = args.recurrenceRule || "NONE";
    const count = Math.max(1, Math.min(52, Math.floor(args.recurrenceCount || 1)));
    const durationMs = args.endsAt - args.startsAt;
    const recurrenceGroupId = count > 1 ? `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : undefined;

    const createdEventIds: Id<"events">[] = [];

    for (let i = 0; i < count; i++) {
      let occStart = new Date(args.startsAt);
      if (recurrenceRule === "WEEKLY") {
        occStart.setDate(occStart.getDate() + i * 7);
      } else if (recurrenceRule === "BIWEEKLY") {
        occStart.setDate(occStart.getDate() + i * 14);
      } else if (recurrenceRule === "MONTHLY") {
        occStart = new Date(occStart.getFullYear(), occStart.getMonth() + i, occStart.getDate(), occStart.getHours(), occStart.getMinutes(), occStart.getSeconds());
      }
      const occStartMs = occStart.getTime();
      const occEndMs = occStartMs + durationMs;

      const eventId = await ctx.db.insert("events", {
        departmentId: dept._id,
        title,
        description: args.description?.trim() || undefined,
        startsAt: occStartMs,
        endsAt: occEndMs,
        location,
        organizerPoleId: args.organizerPoleId || undefined,
        coverImage: args.coverImage,
        status: "PUBLISHED",
        recurrenceRule: recurrenceRule !== "NONE" ? recurrenceRule : undefined,
        recurrenceGroupId,
        updatedAt: Date.now(),
      });

      if (args.requirements?.length) {
        for (const r of args.requirements) {
          await ctx.db.insert("eventRequirements", {
            eventId,
            poleId: r.poleId,
            requiredCount: r.requiredCount || 1,
            notes: r.notes,
            updatedAt: Date.now(),
          });
        }
      }

      if (args.checklistIds?.length) {
        for (const checklistId of args.checklistIds) {
          await ctx.db.insert("eventChecklists", { eventId, checklistId });
        }
      }

      createdEventIds.push(eventId);
    }

    const createdEvents = await Promise.all(
      createdEventIds.map(async (id) => enrichEvent(ctx, (await ctx.db.get(id))!))
    );

    return createdEvents.length === 1 ? createdEvents[0] : createdEvents;
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    organizerPoleId: v.optional(v.union(v.id("poles"), v.null())),
    requirements: v.optional(
      v.array(v.object({ poleId: v.id("poles"), requiredCount: v.optional(v.number()), notes: v.optional(v.string()) }))
    ),
    checklistIds: v.optional(v.array(v.id("checklists"))),
    associateChecklistId: v.optional(v.id("checklists")),
    dissociateChecklistId: v.optional(v.id("checklists")),
  },
  handler: async (ctx, args) => {
    await requireLeaderOrAdmin(ctx);
    const { eventId } = args;

    if (args.associateChecklistId) {
      const existing = await ctx.db
        .query("eventChecklists")
        .withIndex("eventAndChecklist", (q) => q.eq("eventId", eventId).eq("checklistId", args.associateChecklistId!))
        .first();
      if (!existing) {
        await ctx.db.insert("eventChecklists", { eventId, checklistId: args.associateChecklistId });
      }
    }

    if (args.dissociateChecklistId) {
      const existing = await ctx.db
        .query("eventChecklists")
        .withIndex("eventAndChecklist", (q) => q.eq("eventId", eventId).eq("checklistId", args.dissociateChecklistId!))
        .collect();
      for (const ec of existing) await ctx.db.delete(ec._id);
    }

    if (args.checklistIds) {
      const existing = await ctx.db.query("eventChecklists").withIndex("eventId", (q) => q.eq("eventId", eventId)).collect();
      for (const ec of existing) await ctx.db.delete(ec._id);
      for (const checklistId of args.checklistIds) {
        await ctx.db.insert("eventChecklists", { eventId, checklistId });
      }
    }

    if (args.requirements) {
      const existing = await ctx.db.query("eventRequirements").withIndex("eventId", (q) => q.eq("eventId", eventId)).collect();
      for (const r of existing) await ctx.db.delete(r._id);
      for (const r of args.requirements) {
        await ctx.db.insert("eventRequirements", {
          eventId,
          poleId: r.poleId,
          requiredCount: r.requiredCount || 1,
          notes: r.notes,
          updatedAt: Date.now(),
        });
      }
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title) patch.title = args.title.trim();
    if (args.description !== undefined) patch.description = args.description?.trim() || undefined;
    if (args.startsAt) patch.startsAt = args.startsAt;
    if (args.endsAt) patch.endsAt = args.endsAt;
    if (args.location) patch.location = args.location.trim();
    if (args.status) patch.status = args.status;
    if (args.coverImage !== undefined) patch.coverImage = args.coverImage;
    if (args.organizerPoleId !== undefined) patch.organizerPoleId = args.organizerPoleId || undefined;

    await ctx.db.patch(eventId, patch);

    return await enrichEvent(ctx, (await ctx.db.get(eventId))!);
  },
});

export const remove = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    await requireLeaderOrAdmin(ctx);

    const [assignments, requirements, eventChecklists, executions, serviceValidations] = await Promise.all([
      ctx.db.query("assignments").withIndex("eventId", (q) => q.eq("eventId", eventId)).collect(),
      ctx.db.query("eventRequirements").withIndex("eventId", (q) => q.eq("eventId", eventId)).collect(),
      ctx.db.query("eventChecklists").withIndex("eventId", (q) => q.eq("eventId", eventId)).collect(),
      ctx.db.query("checklistExecutions").withIndex("eventId", (q) => q.eq("eventId", eventId)).collect(),
      ctx.db.query("serviceValidations").withIndex("eventUserPole", (q) => q.eq("eventId", eventId)).collect(),
    ]);

    for (const a of assignments) await ctx.db.delete(a._id);
    for (const r of requirements) await ctx.db.delete(r._id);
    for (const ec of eventChecklists) await ctx.db.delete(ec._id);
    for (const execution of executions) {
      const execSteps = await ctx.db
        .query("checklistExecutionSteps")
        .withIndex("executionId", (q) => q.eq("executionId", execution._id))
        .collect();
      for (const es of execSteps) await ctx.db.delete(es._id);
      await ctx.db.delete(execution._id);
    }
    for (const sv of serviceValidations) await ctx.db.delete(sv._id);

    await ctx.db.delete(eventId);
    return { success: true };
  },
});
