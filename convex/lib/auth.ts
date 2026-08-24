import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

const LEADER_ROLES = ["SUPER_ADMIN", "DEPARTMENT_LEADER", "POLE_LEADER", "CALENDAR_MANAGER"];

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  const user = await ctx.db.get(userId);
  if (!user || user.status === "INACTIVE") return null;
  return user;
}

export async function requireAuth(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Non authentifié. Veuillez vous connecter.");
  }
  return user;
}

export function isLeaderOrAdmin(user: Doc<"users">): boolean {
  return LEADER_ROLES.includes(user.role);
}

export async function requireLeaderOrAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireAuth(ctx);
  if (!LEADER_ROLES.includes(user.role)) {
    throw new Error("Accès interdit. Privilèges de responsable requis.");
  }
  return user;
}

export async function requireDepartmentLeaderOrAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireAuth(ctx);
  if (user.role !== "SUPER_ADMIN" && user.role !== "DEPARTMENT_LEADER") {
    throw new Error("Accès interdit. Réservé aux responsables de département et administrateurs.");
  }
  return user;
}

export async function requirePoleLeaderOrAdmin(ctx: Ctx, poleId: Id<"poles">): Promise<Doc<"users">> {
  const user = await requireAuth(ctx);
  const isSuperOrDept = user.role === "SUPER_ADMIN" || user.role === "DEPARTMENT_LEADER";
  if (isSuperOrDept) return user;

  const leadership = await ctx.db
    .query("poleLeaders")
    .withIndex("poleAndUser", (q) => q.eq("poleId", poleId).eq("userId", user._id))
    .first();

  if (!leadership) {
    throw new Error("Accès interdit. Vous devez être responsable de ce pôle.");
  }
  return user;
}
