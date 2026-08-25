import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireAuth, requireLeaderOrAdmin } from "./lib/auth";

const LESSON_INPUT = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  content: v.optional(v.string()),
  mediaType: v.optional(v.string()),
  mediaUrl: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
});

function computeStatus(progressPercent: number, totalLessons: number, hasProgressRecord: boolean, completedLessons: number) {
  if (progressPercent === 100 && totalLessons > 0) return "COMPLETED" as const;
  if (completedLessons > 0 || hasProgressRecord) return "IN_PROGRESS" as const;
  return "NOT_STARTED" as const;
}

async function formatModule(ctx: any, moduleDoc: Doc<"trainingModules">, currentUserId: Id<"users">) {
  const [pole, lessons, progressRecords] = await Promise.all([
    ctx.db.get(moduleDoc.poleId),
    ctx.db.query("trainingLessons").withIndex("moduleId", (q: any) => q.eq("moduleId", moduleDoc._id)).collect(),
    ctx.db
      .query("trainingModuleProgress")
      .withIndex("userAndModule", (q: any) => q.eq("userId", currentUserId).eq("moduleId", moduleDoc._id))
      .collect(),
  ]);
  lessons.sort((a: Doc<"trainingLessons">, b: Doc<"trainingLessons">) => a.orderIndex - b.orderIndex);

  const lessonsWithCompletion = await Promise.all(
    lessons.map(async (l: Doc<"trainingLessons">) => {
      const completion = await ctx.db
        .query("trainingLessonCompletions")
        .withIndex("userAndLesson", (q: any) => q.eq("userId", currentUserId).eq("lessonId", l._id))
        .first();
      return { ...l, isCompleted: !!completion };
    })
  );

  const totalLessons = lessons.length;
  const completedLessons = lessonsWithCompletion.filter((l) => l.isCompleted).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const userProgressStatus = computeStatus(progressPercent, totalLessons, progressRecords.length > 0, completedLessons);

  return {
    ...moduleDoc,
    pole,
    lessonsCount: totalLessons,
    completedLessonsCount: completedLessons,
    progressPercent,
    userProgressStatus,
    lessons: lessonsWithCompletion,
  };
}

export const list = query({
  args: {
    poleId: v.optional(v.id("poles")),
    level: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { poleId, level, search }) => {
    const user = await requireAuth(ctx);

    let modules: Doc<"trainingModules">[];
    if (poleId) {
      modules = await ctx.db.query("trainingModules").withIndex("poleId", (q) => q.eq("poleId", poleId)).collect();
    } else {
      modules = await ctx.db.query("trainingModules").withIndex("status", (q) => q.eq("status", "ACTIVE")).collect();
    }
    modules = modules.filter((m) => m.status === "ACTIVE");
    if (level) modules = modules.filter((m) => m.level === level);

    modules.sort((a, b) => a.poleId.localeCompare(b.poleId) || a.orderIndex - b.orderIndex);

    let formatted = await Promise.all(modules.map((m) => formatModule(ctx, m, user._id)));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      formatted = formatted.filter((m) => m.title.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
    }

    return formatted;
  },
});

export const get = query({
  args: { moduleId: v.id("trainingModules") },
  handler: async (ctx, { moduleId }) => {
    const user = await requireAuth(ctx);
    const moduleDoc = await ctx.db.get(moduleId);
    if (!moduleDoc) throw new ConvexError("Module de formation introuvable");
    return await formatModule(ctx, moduleDoc, user._id);
  },
});

export const create = mutation({
  args: {
    poleId: v.id("poles"),
    title: v.string(),
    description: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    level: v.optional(v.string()),
    estimatedDuration: v.optional(v.string()),
    lessons: v.optional(v.array(LESSON_INPUT)),
  },
  handler: async (ctx, args) => {
    await requireLeaderOrAdmin(ctx);

    const title = args.title.trim();
    if (!args.poleId || !title) throw new ConvexError("Le pôle et le titre sont requis.");

    const moduleId = await ctx.db.insert("trainingModules", {
      poleId: args.poleId,
      title,
      description: args.description?.trim() || undefined,
      coverImage: args.coverImage || undefined,
      level: args.level || "BEGINNER",
      estimatedDuration: args.estimatedDuration?.trim() || "30 min",
      orderIndex: 0,
      status: "ACTIVE",
      updatedAt: Date.now(),
    });

    if (args.lessons?.length) {
      for (let i = 0; i < args.lessons.length; i++) {
        const l = args.lessons[i];
        await ctx.db.insert("trainingLessons", {
          moduleId,
          title: l.title.trim(),
          description: l.description?.trim() || undefined,
          content: l.content?.trim() || undefined,
          mediaType: l.mediaType || "NONE",
          mediaUrl: l.mediaUrl,
          durationMinutes: l.durationMinutes || 10,
          orderIndex: i + 1,
          updatedAt: Date.now(),
        });
      }
    }

    const pole = await ctx.db.get(args.poleId);
    const lessons = await ctx.db.query("trainingLessons").withIndex("moduleId", (q) => q.eq("moduleId", moduleId)).collect();
    lessons.sort((a, b) => a.orderIndex - b.orderIndex);
    return { ...(await ctx.db.get(moduleId)), pole, lessons };
  },
});

export const update = mutation({
  args: {
    moduleId: v.id("trainingModules"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    level: v.optional(v.string()),
    estimatedDuration: v.optional(v.string()),
    status: v.optional(v.string()),
    poleId: v.optional(v.id("poles")),
    lessons: v.optional(v.array(LESSON_INPUT)),
  },
  handler: async (ctx, args) => {
    await requireLeaderOrAdmin(ctx);
    const { moduleId } = args;

    if (args.lessons) {
      const existing = await ctx.db.query("trainingLessons").withIndex("moduleId", (q) => q.eq("moduleId", moduleId)).collect();
      for (const l of existing) {
        const completions = await ctx.db.query("trainingLessonCompletions").withIndex("lessonId", (q) => q.eq("lessonId", l._id)).collect();
        for (const c of completions) await ctx.db.delete(c._id);
        await ctx.db.delete(l._id);
      }
      for (let i = 0; i < args.lessons.length; i++) {
        const l = args.lessons[i];
        await ctx.db.insert("trainingLessons", {
          moduleId,
          title: l.title.trim(),
          description: l.description?.trim() || undefined,
          content: l.content?.trim() || undefined,
          mediaType: l.mediaType || "NONE",
          mediaUrl: l.mediaUrl,
          durationMinutes: l.durationMinutes || 10,
          orderIndex: i + 1,
          updatedAt: Date.now(),
        });
      }
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title) patch.title = args.title.trim();
    if (args.description !== undefined) patch.description = args.description?.trim() || undefined;
    if (args.coverImage !== undefined) patch.coverImage = args.coverImage;
    if (args.level) patch.level = args.level;
    if (args.estimatedDuration !== undefined) patch.estimatedDuration = args.estimatedDuration;
    if (args.status) patch.status = args.status;
    if (args.poleId) patch.poleId = args.poleId;

    await ctx.db.patch(moduleId, patch);

    const updated = (await ctx.db.get(moduleId))!;
    const pole = await ctx.db.get(updated.poleId);
    const lessons = await ctx.db.query("trainingLessons").withIndex("moduleId", (q) => q.eq("moduleId", moduleId)).collect();
    lessons.sort((a, b) => a.orderIndex - b.orderIndex);
    return { ...updated, pole, lessons };
  },
});

export const remove = mutation({
  args: { moduleId: v.id("trainingModules") },
  handler: async (ctx, { moduleId }) => {
    await requireLeaderOrAdmin(ctx);

    const moduleDoc = await ctx.db.get(moduleId);
    if (!moduleDoc) throw new ConvexError("Module introuvable");

    const progress = await ctx.db.query("trainingModuleProgress").withIndex("moduleId", (q) => q.eq("moduleId", moduleId)).collect();
    for (const p of progress) await ctx.db.delete(p._id);

    const lessons = await ctx.db.query("trainingLessons").withIndex("moduleId", (q) => q.eq("moduleId", moduleId)).collect();
    for (const l of lessons) {
      const completions = await ctx.db.query("trainingLessonCompletions").withIndex("lessonId", (q) => q.eq("lessonId", l._id)).collect();
      for (const c of completions) await ctx.db.delete(c._id);
      await ctx.db.delete(l._id);
    }

    await ctx.db.delete(moduleId);
    return { success: true };
  },
});

export const updateProgress = mutation({
  args: {
    action: v.union(v.literal("START_MODULE"), v.literal("TOGGLE_LESSON"), v.literal("COMPLETE_LESSON")),
    moduleId: v.id("trainingModules"),
    lessonId: v.optional(v.id("trainingLessons")),
  },
  handler: async (ctx, { action, moduleId, lessonId }) => {
    const currentUser = await requireAuth(ctx);

    const moduleDoc = await ctx.db.get(moduleId);
    if (!moduleDoc) throw new ConvexError("Module introuvable.");

    const lessons = await ctx.db.query("trainingLessons").withIndex("moduleId", (q) => q.eq("moduleId", moduleId)).collect();
    const totalLessons = lessons.length;

    async function countUserCompletions() {
      const completions = await ctx.db.query("trainingLessonCompletions").withIndex("userId", (q) => q.eq("userId", currentUser._id)).collect();
      const lessonIds = new Set(lessons.map((l) => l._id));
      return completions.filter((c) => lessonIds.has(c.lessonId)).length;
    }

    async function upsertProgress(status: string, progressPercent: number, completedCount: number, isCompleted: boolean) {
      const existing = await ctx.db
        .query("trainingModuleProgress")
        .withIndex("userAndModule", (q) => q.eq("userId", currentUser._id).eq("moduleId", moduleId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          status,
          progressPercent,
          completedLessonsCount: completedCount,
          totalLessonsCount: totalLessons,
          completedAt: isCompleted ? Date.now() : undefined,
          lastAccessedAt: Date.now(),
        });
        return await ctx.db.get(existing._id);
      }
      const id = await ctx.db.insert("trainingModuleProgress", {
        userId: currentUser._id,
        moduleId,
        status,
        progressPercent,
        completedLessonsCount: completedCount,
        totalLessonsCount: totalLessons,
        startedAt: Date.now(),
        completedAt: isCompleted ? Date.now() : undefined,
        lastAccessedAt: Date.now(),
      });
      return await ctx.db.get(id);
    }

    if (action === "START_MODULE") {
      const completedCount = await countUserCompletions();
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const isCompleted = progressPercent === 100 && totalLessons > 0;
      const progress = await upsertProgress(isCompleted ? "COMPLETED" : "IN_PROGRESS", progressPercent, completedCount, isCompleted);
      return { success: true, progress };
    }

    if (action === "TOGGLE_LESSON" || action === "COMPLETE_LESSON") {
      if (!lessonId) throw new ConvexError("ID de la leçon requis.");

      const existingCompletion = await ctx.db
        .query("trainingLessonCompletions")
        .withIndex("userAndLesson", (q) => q.eq("userId", currentUser._id).eq("lessonId", lessonId))
        .first();

      let isNowCompleted = false;
      const hadCompletionBefore = !!existingCompletion;

      if (existingCompletion) {
        if (action === "TOGGLE_LESSON") {
          await ctx.db.delete(existingCompletion._id);
          isNowCompleted = false;
        } else {
          isNowCompleted = true;
        }
      } else {
        await ctx.db.insert("trainingLessonCompletions", {
          userId: currentUser._id,
          lessonId,
          completedAt: Date.now(),
        });
        isNowCompleted = true;
      }

      const completedCount = await countUserCompletions();
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const isCompleted = progressPercent === 100 && totalLessons > 0;
      const progressStatus = isCompleted ? "COMPLETED" : "IN_PROGRESS";

      await upsertProgress(progressStatus, progressPercent, completedCount, isCompleted);

      if (isCompleted && (!hadCompletionBefore || progressStatus === "COMPLETED")) {
        await ctx.db.insert("notifications", {
          userId: currentUser._id,
          title: "Félicitations ! 🎓",
          message: `Vous avez validé avec succès le module de formation "${moduleDoc.title}".`,
          type: "TRAINING_COMPLETED",
          isRead: false,
          linkUrl: "/training",
        });
      }

      return {
        success: true,
        isLessonCompleted: isNowCompleted,
        progressPercent,
        completedCount,
        totalLessons,
        progressStatus,
      };
    }

    throw new ConvexError("Action non reconnue.");
  },
});
