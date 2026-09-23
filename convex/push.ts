import { mutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./lib/auth";

// Called by the mobile app right after it obtains an Expo push token
// (src/lib/pushNotifications.ts), and again whenever that token changes.
// Tokens are looked up by their own value (not userId+platform) because the
// same physical device can end up registering the same token for a
// different account after a logout/login — reassign it rather than leaving
// a stale row pointing at the previous user.
export const registerToken = mutation({
  args: { token: v.string(), platform: v.optional(v.string()) },
  handler: async (ctx, { token, platform }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { success: false };

    const existing = await ctx.db.query("pushTokens").withIndex("token", (q) => q.eq("token", token)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { userId: user._id, platform, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("pushTokens", { userId: user._id, token, platform, updatedAt: Date.now() });
    }
    return { success: true };
  },
});

// Called on logout so a shared/reset device stops receiving notifications
// meant for the account that just signed out.
export const unregisterToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const existing = await ctx.db.query("pushTokens").withIndex("token", (q) => q.eq("token", token)).first();
    if (existing) await ctx.db.delete(existing._id);
    return { success: true };
  },
});

export const getTokensForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db.query("pushTokens").withIndex("userId", (q) => q.eq("userId", userId)).collect();
    return rows.map((r) => r.token);
  },
});

// Scheduled (fire-and-forget) by convex/lib/notify.ts every time an in-app
// notification is created, so the two channels never drift apart. Uses
// Expo's push service directly (https://exp.host/--/api/v2/push/send) since
// every token registered by src/lib/pushNotifications.ts is an Expo push
// token, not a raw FCM/APNs one.
export const sendPushToUser = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, { userId, title, body, data }) => {
    const tokens: string[] = await ctx.runQuery(internal.push.getTokensForUser, { userId });
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      sound: "default",
      data: data || {},
    }));

    // Expo caps a single push request at 100 messages.
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(chunk),
        });
      } catch {
        // Best-effort: a failed push must never break the mutation that
        // triggered it (the in-app notification row is already written).
      }
    }
  },
});
