"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import webpush from "web-push";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BNANWZmwx66ZgZuJrUEDcR7ZyJyn4a8UxmnFLnW9NI8qOxRXv9BOeyJAmHMcQ96ZrP_USWmDvtQ0fObNSTjfoZ0";

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "iuJbNueLL4RIBcqa-l67Vs06ivez6rn-Sz9bVT6QooM";

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:notifications@mcad-eglise.org";

try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
} catch (e) {
  console.warn("[Convex WebPush] Configuration VAPID:", e);
}

export const sendWebPush = internalAction({
  args: {
    subscriptionJson: v.string(),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  handler: async (_ctx, { subscriptionJson, title, body, url, data }) => {
    try {
      const subscription = JSON.parse(subscriptionJson);
      if (!subscription || !subscription.endpoint) {
        return { success: false, error: "Souscription invalide" };
      }

      const payload = JSON.stringify({
        title,
        body,
        url: url || (data && data.linkUrl) || "/dashboard",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        tag: "mcad-" + Date.now(),
        timestamp: Date.now(),
        data: data || {},
      });

      await webpush.sendNotification(subscription, payload);
      return { success: true };
    } catch (err: any) {
      // 404 or 410 means subscription expired or unsubscribed
      console.warn("[Convex WebPush] Échec envoi:", err?.statusCode, err?.message || err);
      return { success: false, statusCode: err?.statusCode, error: err?.message };
    }
  },
});
