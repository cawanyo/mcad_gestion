import { convexAuth, createAccount, retrieveAccount, modifyAccountCredentials } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import bcrypt from "bcryptjs";
import { v, ConvexError } from "convex/values";
import { normalizePhone } from "./phone";
import { internal } from "./_generated/api";
import { action, internalQuery } from "./_generated/server";
import { requireAuth } from "./lib/auth";

const PROVIDER_ID = "phone-password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    ConvexCredentials({
      id: PROVIDER_ID,
      // bcryptjs matches the hashing MCAD's existing Postgres auth uses,
      // so migrated password hashes stay verifiable after the Convex switch.
      // Must use the *sync* API: bcryptjs's async functions chunk work via
      // setTimeout, which Convex's mutation runtime (used internally by
      // createAccount/retrieveAccount) doesn't allow.
      crypto: {
        hashSecret: async (secret) => bcrypt.hashSync(secret, 10),
        verifySecret: async (secret, hash) => bcrypt.compareSync(secret, hash),
      },
      authorize: async (params, ctx) => {
        const phone = normalizePhone(String(params.phone ?? ""));
        const password = String(params.password ?? "");
        const flow = String(params.flow ?? "signIn");

        if (!phone || !password) {
          throw new Error("Numéro de téléphone et mot de passe requis.");
        }

        if (flow === "signUp") {
          const firstName = String(params.firstName ?? "").trim();
          const lastName = String(params.lastName ?? "").trim();
          if (!firstName || !lastName) {
            throw new Error("Prénom et nom requis.");
          }
          if (password.length < 4) {
            throw new Error("Le mot de passe doit comporter au moins 4 caractères.");
          }

          const birthDateRaw = params.birthDate ? String(params.birthDate) : "";
          const departmentId = await ctx.runQuery(internal.registration.getDefaultDepartmentId, {});

          const { user } = await createAccount(ctx, {
            provider: PROVIDER_ID,
            account: { id: phone, secret: password },
            profile: {
              phone,
              firstName,
              lastName,
              gender: params.gender ? String(params.gender) : "HOMME",
              role: "MEMBER",
              status: "ACTIVE",
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firstName + lastName)}`,
              // Spread in rather than set to `undefined`: Convex documents
              // don't have a concept of a field explicitly set to
              // undefined, only present-or-absent.
              ...(birthDateRaw ? { birthDate: new Date(birthDateRaw).getTime() } : {}),
              ...(departmentId ? { departmentId } : {}),
            },
          });

          const poleIds = Array.isArray(params.poleIds) ? (params.poleIds as string[]) : [];
          await ctx.runMutation(internal.registration.completeSignUp, {
            userId: user._id,
            poleIds,
            motivation: params.motivation ? String(params.motivation) : undefined,
          });

          return { userId: user._id };
        }

        const { user } = await retrieveAccount(ctx, {
          provider: PROVIDER_ID,
          account: { id: phone, secret: password },
        });
        return { userId: user._id };
      },
    }),
  ],
});

// Internal: resolves and authorizes the reset-password action's target.
// modifyAccountCredentials only runs from an action (it needs
// ActionCtx to reach the authAccounts table through the auth
// component), and actions have no ctx.db of their own — so the
// SUPER_ADMIN check and the phone lookup both happen here first.
export const getPasswordResetTarget = internalQuery({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, { targetUserId }) => {
    const actor = await requireAuth(ctx);
    if (actor.role !== "SUPER_ADMIN") {
      throw new ConvexError("Réservé aux super administrateurs.");
    }
    const target = await ctx.db.get(targetUserId);
    if (!target) throw new ConvexError("Membre introuvable.");
    if (!target.phone) throw new ConvexError("Ce membre n'a pas de numéro de téléphone associé.");
    return { phone: target.phone };
  },
});

export const adminResetPassword = action({
  args: { targetUserId: v.id("users"), newPassword: v.string() },
  handler: async (ctx, { targetUserId, newPassword }): Promise<{ success: true }> => {
    const trimmed = newPassword.trim();
    if (trimmed.length < 4) {
      throw new ConvexError("Le mot de passe doit comporter au moins 4 caractères.");
    }

    const { phone } = await ctx.runQuery(internal.auth.getPasswordResetTarget, { targetUserId });

    await modifyAccountCredentials(ctx, {
      provider: PROVIDER_ID,
      account: { id: phone, secret: trimmed },
    });

    return { success: true };
  },
});
