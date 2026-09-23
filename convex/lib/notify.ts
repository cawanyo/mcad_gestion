import { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Every call site that used to do a bare ctx.db.insert("notifications", ...)
// now goes through here instead, so the in-app bell and the phone's actual
// push notification never fall out of sync — the push is scheduled
// (fire-and-forget, via convex/push.ts's sendPushToUser) rather than sent
// inline, since fetch() isn't available in a mutation.
export async function notifyUser(
  ctx: MutationCtx,
  args: { userId: Id<"users">; title: string; message: string; type: string; linkUrl?: string }
) {
  await ctx.db.insert("notifications", {
    userId: args.userId,
    title: args.title,
    message: args.message,
    type: args.type,
    isRead: false,
    linkUrl: args.linkUrl,
  });

  await ctx.scheduler.runAfter(0, internal.push.sendPushToUser, {
    userId: args.userId,
    title: args.title,
    body: args.message,
    data: args.linkUrl ? { linkUrl: args.linkUrl } : undefined,
  });
}
