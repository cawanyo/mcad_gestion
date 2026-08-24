import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Overrides authTables.users to add MCAD's own fields on top of the
  // base fields Convex Auth requires (name, email, phone, image, ...).
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
    departmentId: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("status", ["status"]),
});
