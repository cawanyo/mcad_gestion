import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Timestamps are stored as epoch-ms numbers (Date.now()), matching Convex
// convention. Convex has no schema-level defaults or unique constraints —
// defaults are applied by the mutation on insert, and any field that was
// `@@unique(...)` in Prisma has a matching index below but the uniqueness
// itself must still be checked by the mutation before inserting.

export default defineSchema({
  ...authTables,

  // Overrides authTables.users to add MCAD's own fields on top of the
  // base fields Convex Auth requires (name, email, phone, image, ...).
  // `password` isn't here: Convex Auth stores the hashed secret on the
  // linked authAccounts document, not on the user itself.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    firstName: v.string(),
    lastName: v.string(),
    gender: v.optional(v.string()), // HOMME, FEMME
    birthDate: v.optional(v.number()),
    avatar: v.optional(v.string()),
    role: v.string(), // SUPER_ADMIN, DEPARTMENT_LEADER, POLE_LEADER, CALENDAR_MANAGER, MEMBER
    status: v.string(), // ACTIVE, INACTIVE, ...
    departmentId: v.optional(v.id("departments")),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("status", ["status"])
    .index("departmentId", ["departmentId"]),

  departments: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    settings: v.optional(v.string()), // JSON string
  }),

  poles: defineTable({
    departmentId: v.id("departments"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
    icon: v.string(),
    orderIndex: v.number(),
    status: v.string(), // ACTIVE, ARCHIVED
  })
    .index("departmentId", ["departmentId"])
    .index("status", ["status"]),

  poleLeaders: defineTable({
    poleId: v.id("poles"),
    userId: v.id("users"),
    roleTitle: v.optional(v.string()),
  })
    .index("poleAndUser", ["poleId", "userId"]) // @@unique([poleId, userId])
    .index("poleId", ["poleId"])
    .index("userId", ["userId"]),

  poleMemberships: defineTable({
    userId: v.id("users"),
    poleId: v.id("poles"),
    status: v.string(), // ACTIVE, INACTIVE, SUSPENDED
    joinedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("userAndPole", ["userId", "poleId"]) // @@unique([userId, poleId])
    .index("poleAndStatus", ["poleId", "status"])
    .index("userId", ["userId"]),

  membershipRequests: defineTable({
    userId: v.id("users"),
    poleId: v.id("poles"),
    status: v.string(), // PENDING, APPROVED, REJECTED
    motivation: v.optional(v.string()),
    reviewedById: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("status", ["status"])
    .index("userAndStatus", ["userId", "status"])
    .index("poleId", ["poleId"]),

  events: defineTable({
    departmentId: v.id("departments"),
    organizerPoleId: v.optional(v.id("poles")),
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    location: v.string(),
    status: v.string(), // DRAFT, PUBLISHED, COMPLETED, CANCELLED
    coverImage: v.optional(v.string()),
    recurrenceRule: v.optional(v.string()), // NONE, WEEKLY, BIWEEKLY, MONTHLY
    recurrenceGroupId: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("departmentId", ["departmentId"])
    .index("startsAt", ["startsAt"])
    .index("status", ["status"])
    .index("organizerPoleId", ["organizerPoleId"]),

  eventRequirements: defineTable({
    eventId: v.id("events"),
    poleId: v.id("poles"),
    requiredCount: v.number(),
    notes: v.optional(v.string()),
    roleExpected: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("eventAndPole", ["eventId", "poleId"]) // @@unique([eventId, poleId])
    .index("eventId", ["eventId"])
    .index("poleId", ["poleId"]),

  assignments: defineTable({
    eventId: v.id("events"),
    poleId: v.id("poles"),
    userId: v.id("users"),
    assignedById: v.optional(v.id("users")),
    roleTag: v.optional(v.string()),
    status: v.string(), // CONFIRMED, DECLINED, PENDING
    updatedAt: v.number(),
  })
    .index("eventAndUser", ["eventId", "userId"]) // @@unique([eventId, userId])
    .index("userId", ["userId"])
    .index("poleId", ["poleId"])
    .index("eventId", ["eventId"]),

  memberInterests: defineTable({
    eventId: v.id("events"),
    poleId: v.id("poles"),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  })
    .index("eventUserPole", ["eventId", "userId", "poleId"]) // @@unique
    .index("eventId", ["eventId"])
    .index("userId", ["userId"]),

  unavailabilities: defineTable({
    userId: v.id("users"),
    startsAt: v.number(),
    endsAt: v.number(),
    reason: v.optional(v.string()),
    recurrence: v.string(), // NONE, WEEKLY, BIWEEKLY, MONTHLY
    updatedAt: v.number(),
  }).index("userId", ["userId"]),

  checklists: defineTable({
    poleId: v.id("poles"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // ACTIVE, ARCHIVED
    orderIndex: v.number(),
    updatedAt: v.number(),
  })
    .index("poleId", ["poleId"])
    .index("status", ["status"]),

  checklistSteps: defineTable({
    checklistId: v.id("checklists"),
    orderIndex: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    details: v.optional(v.string()),
    mediaType: v.string(), // NONE, PHOTO, VIDEO, TEXT
    mediaUrl: v.optional(v.string()),
    mediaThumbnail: v.optional(v.string()),
    isRequired: v.boolean(),
    updatedAt: v.number(),
  }).index("checklistId", ["checklistId"]),

  eventChecklists: defineTable({
    eventId: v.id("events"),
    checklistId: v.id("checklists"),
  })
    .index("eventAndChecklist", ["eventId", "checklistId"]) // @@unique
    .index("eventId", ["eventId"])
    .index("checklistId", ["checklistId"]),

  checklistExecutions: defineTable({
    eventId: v.optional(v.id("events")),
    checklistId: v.id("checklists"),
    userId: v.id("users"),
    poleId: v.optional(v.id("poles")),
    status: v.string(), // IN_PROGRESS, COMPLETED, VALIDATED
    comment: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("userId", ["userId"])
    .index("checklistId", ["checklistId"])
    .index("poleId", ["poleId"])
    .index("eventId", ["eventId"]),

  checklistExecutionSteps: defineTable({
    executionId: v.id("checklistExecutions"),
    stepId: v.id("checklistSteps"),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
  })
    .index("executionAndStep", ["executionId", "stepId"]) // @@unique
    .index("executionId", ["executionId"]),

  serviceValidations: defineTable({
    eventId: v.id("events"),
    poleId: v.id("poles"),
    userId: v.id("users"),
    checklistExecutionId: v.optional(v.id("checklistExecutions")), // @unique
    status: v.string(), // PENDING, VALIDATED, REJECTED
    comment: v.optional(v.string()),
    rating: v.optional(v.number()),
    validatedAt: v.optional(v.number()),
    reminderSentAt: v.optional(v.number()),
    reminderCount: v.number(),
    updatedAt: v.number(),
  })
    .index("eventUserPole", ["eventId", "userId", "poleId"]) // @@unique
    .index("userId", ["userId"])
    .index("status", ["status"])
    .index("checklistExecutionId", ["checklistExecutionId"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.string(), // INFO, WARNING, SUCCESS, ...
    isRead: v.boolean(),
    linkUrl: v.optional(v.string()),
  }).index("userId", ["userId"]),

  auditLogs: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    details: v.optional(v.string()), // JSON string
  }).index("actorId", ["actorId"]),

  trainingModules: defineTable({
    poleId: v.id("poles"),
    title: v.string(),
    description: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    level: v.string(), // BEGINNER, INTERMEDIATE, ADVANCED
    estimatedDuration: v.optional(v.string()),
    orderIndex: v.number(),
    status: v.string(), // ACTIVE, DRAFT, ARCHIVED
    updatedAt: v.number(),
  })
    .index("poleId", ["poleId"])
    .index("status", ["status"]),

  trainingLessons: defineTable({
    moduleId: v.id("trainingModules"),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    mediaType: v.string(), // NONE, VIDEO, PHOTO, DOCUMENT
    mediaUrl: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    orderIndex: v.number(),
    updatedAt: v.number(),
  }).index("moduleId", ["moduleId"]),

  trainingLessonCompletions: defineTable({
    userId: v.id("users"),
    lessonId: v.id("trainingLessons"),
    completedAt: v.number(),
  })
    .index("userAndLesson", ["userId", "lessonId"]) // @@unique
    .index("userId", ["userId"])
    .index("lessonId", ["lessonId"]),

  trainingModuleProgress: defineTable({
    userId: v.id("users"),
    moduleId: v.id("trainingModules"),
    status: v.string(), // NOT_STARTED, IN_PROGRESS, COMPLETED
    progressPercent: v.number(),
    completedLessonsCount: v.number(),
    totalLessonsCount: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    lastAccessedAt: v.number(),
  })
    .index("userAndModule", ["userId", "moduleId"]) // @@unique
    .index("userId", ["userId"])
    .index("moduleId", ["moduleId"]),
});
