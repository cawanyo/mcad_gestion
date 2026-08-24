import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireDepartmentLeaderOrAdmin } from "./lib/auth";
import { retrieveAccount, modifyAccountCredentials } from "@convex-dev/auth/server";
import { normalizePhone } from "./phone";
import { api } from "./_generated/api";

const VALID_ROLES = ["MEMBER", "POLE_LEADER", "CALENDAR_MANAGER", "DEPARTMENT_LEADER", "SUPER_ADMIN"];

const ROLE_FR: Record<string, string> = {
  SUPER_ADMIN: "Administrateur",
  DEPARTMENT_LEADER: "Responsable de Département",
  POLE_LEADER: "Responsable de Pôle",
  CALENDAR_MANAGER: "Gestionnaire Calendrier",
};
function roleFr(r: string) {
  return ROLE_FR[r] || "Membre de service";
}

export const list = query({
  args: { poleId: v.optional(v.id("poles")), search: v.optional(v.string()) },
  handler: async (ctx, { poleId, search }) => {
    await requireAuth(ctx);

    let members = await ctx.db.query("users").withIndex("status", (q) => q.eq("status", "ACTIVE")).collect();
    members.sort((a, b) => a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName));

    if (poleId) {
      const memberIds = new Set(
        (await ctx.db.query("poleMemberships").withIndex("poleAndStatus", (q) => q.eq("poleId", poleId).eq("status", "ACTIVE")).collect()).map(
          (m) => m.userId
        )
      );
      members = members.filter((m) => memberIds.has(m._id));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      members = members.filter(
        (m) => m.firstName.toLowerCase().includes(q) || m.lastName.toLowerCase().includes(q) || m.phone?.toLowerCase().includes(q)
      );
    }

    return await Promise.all(
      members.map(async (m) => {
        const [memberships, leaderships, unavailabilities] = await Promise.all([
          ctx.db.query("poleMemberships").withIndex("userId", (q) => q.eq("userId", m._id)).collect(),
          ctx.db.query("poleLeaders").withIndex("userId", (q) => q.eq("userId", m._id)).collect(),
          ctx.db.query("unavailabilities").withIndex("userId", (q) => q.eq("userId", m._id)).collect(),
        ]);
        const membershipsWithPole = await Promise.all(memberships.map(async (pm) => ({ ...pm, pole: await ctx.db.get(pm.poleId) })));
        const leadershipsWithPole = await Promise.all(leaderships.map(async (pl) => ({ ...pl, pole: await ctx.db.get(pl.poleId) })));

        return {
          ...m,
          poleMemberships: membershipsWithPole,
          poleLeaderships: leadershipsWithPole,
          unavailabilities: unavailabilities.map((u) => ({ _id: u._id, startsAt: u.startsAt, endsAt: u.endsAt, reason: u.reason })),
        };
      })
    );
  },
});

export const updateRole = mutation({
  args: { userId: v.id("users"), role: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, { userId, role, status }) => {
    const admin = await requireDepartmentLeaderOrAdmin(ctx);

    const patch: Record<string, unknown> = {};
    if (role) {
      if (!VALID_ROLES.includes(role)) throw new Error("Rôle invalide");
      patch.role = role;
    }
    if (status) patch.status = status;

    const before = await ctx.db.get(userId);
    await ctx.db.patch(userId, patch);
    const updatedUser = (await ctx.db.get(userId))!;

    if (role) {
      await ctx.db.insert("notifications", {
        userId,
        title: "Mise à jour de vos autorisations",
        message: `Votre rôle sur la plateforme a été mis à jour en : "${roleFr(role)}".`,
        type: "ROLE_UPDATE",
        isRead: false,
        linkUrl: "/dashboard",
      });
    }

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      action: "MEMBER_ROLE_UPDATED",
      targetType: "USER",
      targetId: userId,
      details: JSON.stringify({ previousRole: before?.role, newRole: role, status }),
    });

    const [memberships, leaderships] = await Promise.all([
      ctx.db.query("poleMemberships").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("poleLeaders").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
    ]);

    return {
      success: true,
      user: { ...updatedUser, poleMemberships: memberships, poleLeaderships: leaderships },
      message: `Rôle mis à jour avec succès en ${roleFr(role || updatedUser.role)}.`,
    };
  },
});

export const remove = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const admin = await requireDepartmentLeaderOrAdmin(ctx);

    if (admin._id === userId) {
      throw new Error("Vous ne pouvez pas supprimer votre propre compte depuis cette vue.");
    }

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Membre introuvable");

    // Postgres cascaded every one of these off User via `onDelete: Cascade`
    // (or SetNull for assignedBy/reviewedBy); Convex requires doing it by hand.
    const [
      poleLeaderships,
      poleMemberships,
      membershipRequests,
      reviewedRequests,
      assignments,
      assignedByAssignments,
      memberInterests,
      unavailabilities,
      checklistExecutions,
      serviceValidations,
      notifications,
      auditLogs,
      trainingProgress,
      lessonCompletions,
    ] = await Promise.all([
      ctx.db.query("poleLeaders").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("poleMemberships").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("membershipRequests").withIndex("userAndStatus", (q) => q.eq("userId", userId)).collect(),
      ctx.db
        .query("membershipRequests")
        .withIndex("by_creation_time")
        .filter((q) => q.eq(q.field("reviewedById"), userId))
        .collect(),
      ctx.db.query("assignments").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
      ctx.db
        .query("assignments")
        .withIndex("by_creation_time")
        .filter((q) => q.eq(q.field("assignedById"), userId))
        .collect(),
      ctx.db.query("memberInterests").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("unavailabilities").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("checklistExecutions").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("serviceValidations").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("notifications").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("auditLogs").withIndex("actorId", (q) => q.eq("actorId", userId)).collect(),
      ctx.db.query("trainingModuleProgress").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("trainingLessonCompletions").withIndex("userId", (q) => q.eq("userId", userId)).collect(),
    ]);

    for (const l of poleLeaderships) await ctx.db.delete(l._id);
    for (const m of poleMemberships) await ctx.db.delete(m._id);
    for (const r of membershipRequests) await ctx.db.delete(r._id);
    for (const r of reviewedRequests) await ctx.db.patch(r._id, { reviewedById: undefined });
    for (const a of assignedByAssignments) await ctx.db.patch(a._id, { assignedById: undefined });

    for (const execution of checklistExecutions) {
      const execSteps = await ctx.db
        .query("checklistExecutionSteps")
        .withIndex("executionId", (q) => q.eq("executionId", execution._id))
        .collect();
      for (const es of execSteps) await ctx.db.delete(es._id);
      await ctx.db.delete(execution._id);
    }
    for (const a of assignments) await ctx.db.delete(a._id);
    for (const i of memberInterests) await ctx.db.delete(i._id);
    for (const u of unavailabilities) await ctx.db.delete(u._id);
    for (const sv of serviceValidations) await ctx.db.delete(sv._id);
    for (const n of notifications) await ctx.db.delete(n._id);
    for (const log of auditLogs) await ctx.db.delete(log._id);
    for (const p of trainingProgress) await ctx.db.delete(p._id);
    for (const c of lessonCompletions) await ctx.db.delete(c._id);

    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const acc of authAccounts) await ctx.db.delete(acc._id);
    const authSessions = await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", userId)).collect();
    for (const s of authSessions) await ctx.db.delete(s._id);

    await ctx.db.delete(userId);

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      action: "MEMBER_DELETED",
      targetType: "USER",
      targetId: userId,
      details: JSON.stringify({ name: `${user.firstName} ${user.lastName}`, phone: user.phone, role: user.role, deletedAt: Date.now() }),
    });

    return { success: true, message: `Le membre ${user.firstName} ${user.lastName} a été définitivement supprimé de la plateforme.` };
  },
});

export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    birthDate: v.optional(v.number()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    if (args.phone) {
      const normalized = normalizePhone(args.phone);
      const existing = await ctx.db.query("users").withIndex("phone", (q) => q.eq("phone", normalized)).first();
      if (existing && existing._id !== user._id) {
        throw new Error("Ce numéro de téléphone est déjà utilisé par un autre compte");
      }
    }

    const patch: Record<string, unknown> = {};
    if (args.firstName) patch.firstName = args.firstName.trim();
    if (args.lastName) patch.lastName = args.lastName.trim();
    if (args.phone !== undefined) patch.phone = args.phone ? normalizePhone(args.phone) : undefined;
    if (args.gender === "HOMME" || args.gender === "FEMME") patch.gender = args.gender;
    if (args.birthDate !== undefined) patch.birthDate = args.birthDate || undefined;
    if (args.avatar !== undefined) patch.avatar = args.avatar;

    await ctx.db.patch(user._id, patch);
    const updated = (await ctx.db.get(user._id))!;

    const [memberships, leaderships] = await Promise.all([
      ctx.db.query("poleMemberships").withIndex("userId", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("poleLeaders").withIndex("userId", (q) => q.eq("userId", user._id)).collect(),
    ]);

    return {
      success: true,
      user: {
        _id: updated._id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        gender: updated.gender,
        role: updated.role,
        avatar: updated.avatar,
        birthDate: updated.birthDate,
        poleMemberships: memberships,
        poleLeaderships: leaderships,
      },
    };
  },
});

// Password changes go through Convex Auth's own account-secret storage
// (authAccounts), not a `password` field on `users`, so this has to run as
// an action calling retrieveAccount/modifyAccountCredentials rather than a
// plain mutation patching a column like the old Prisma route did.
export const changePassword = action({
  args: {
    currentPassword: v.optional(v.string()),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const user = await ctx.runQuery(api.users.viewer, {});
    if (!user) throw new Error("Non autorisé");
    if (!user.phone) throw new Error("Utilisateur introuvable");

    if (newPassword.trim().length < 8) {
      throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    }

    if (currentPassword) {
      try {
        await retrieveAccount(ctx, {
          provider: "phone-password",
          account: { id: user.phone, secret: currentPassword },
        });
      } catch {
        throw new Error("Le mot de passe actuel est incorrect");
      }
    }

    await modifyAccountCredentials(ctx, {
      provider: "phone-password",
      account: { id: user.phone, secret: newPassword },
    });

    return { success: true };
  },
});
