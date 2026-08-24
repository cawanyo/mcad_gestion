import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Mirrors src/app/api/auth/register/route.ts: new accounts join the (only)
// existing department by default, matching how the old Postgres route
// picked `prisma.department.findFirst()`.
export const getDefaultDepartmentId = internalQuery({
  args: {},
  handler: async (ctx) => {
    const dept = await ctx.db.query("departments").first();
    return dept?._id ?? null;
  },
});

// Runs right after createAccount() in convex/auth.ts's signUp flow, since
// that happens before the new user has a session (requireAuth would fail).
export const completeSignUp = internalMutation({
  args: {
    userId: v.id("users"),
    // Loosely typed on purpose: during the hybrid migration period the
    // register page's pole picker still lists poles from the old Postgres
    // API, so ids submitted here may not be real Convex ids yet. Each one
    // is checked with normalizeId below instead of validated as v.id(...),
    // which would hard-reject the whole signUp (and thus the account
    // creation that already happened earlier in the same action).
    poleIds: v.array(v.string()),
    motivation: v.optional(v.string()),
  },
  handler: async (ctx, { userId, poleIds, motivation }) => {
    for (const raw of poleIds) {
      const poleId = ctx.db.normalizeId("poles", raw);
      if (!poleId) continue;
      await ctx.db.insert("membershipRequests", {
        userId,
        poleId,
        status: "PENDING",
        motivation: motivation?.trim() || "Demande formulée lors de l'inscription.",
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("notifications", {
      userId,
      title: "Bienvenue sur MCAD !",
      message: "Votre compte a été créé avec succès. Vos demandes d'adhésion aux pôles sont transmises aux responsables.",
      type: "WELCOME",
      isRead: false,
    });
  },
});
