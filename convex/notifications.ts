import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { notifications: [], unreadCount: 0 };

    const all = await ctx.db.query("notifications").withIndex("userId", (q) => q.eq("userId", user._id)).order("desc").collect();
    const notifications = all.slice(0, 20);
    const unreadCount = all.filter((n) => !n.isRead).length;

    return { notifications, unreadCount };
  },
});

export const markRead = mutation({
  args: {
    notificationId: v.optional(v.id("notifications")),
    markAllRead: v.optional(v.boolean()),
  },
  handler: async (ctx, { notificationId, markAllRead }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { success: true };

    if (markAllRead) {
      const unread = await ctx.db
        .query("notifications")
        .withIndex("userId", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("isRead"), false))
        .collect();
      for (const n of unread) await ctx.db.patch(n._id, { isRead: true });
      return { success: true };
    }

    if (notificationId) {
      await ctx.db.patch(notificationId, { isRead: true });
      return await ctx.db.get(notificationId);
    }

    return { success: true };
  },
});
