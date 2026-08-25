"use node";

import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { createHash } from "crypto";
import { getAuthUserId } from "@convex-dev/auth/server";

// Mirrors src/app/api/upload/signature/route.ts on the web, but callable
// directly from any Convex client (mobile included) — the web route only
// authenticates via a Next.js cookie, which a native client has no way to
// send, so it can't be reused as-is here. Convex Auth already covers
// authentication for any Convex function, cookie or not.
export const getUploadSignature = action({
  args: {
    folder: v.optional(v.string()),
    resourceType: v.optional(v.string()),
  },
  handler: async (ctx, { folder = "mcad_media", resourceType = "auto" }) => {
    // Actions have no ctx.db, so the shared requireAuth() (built for
    // query/mutation ctx) can't be reused here — this signing action only
    // needs to know the caller has a valid session, not the full user doc.
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Non authentifié. Veuillez vous connecter.");
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ConvexError("Configuration Cloudinary incomplète");
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash("sha1").update(paramsToSign).digest("hex");

    return {
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType === "image" ? "image" : resourceType === "video" ? "video" : "auto"}/upload`,
    };
  },
});
