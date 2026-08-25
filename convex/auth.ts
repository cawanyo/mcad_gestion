import { convexAuth, createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import bcrypt from "bcryptjs";
import { normalizePhone } from "./phone";
import { internal } from "./_generated/api";

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
