import { internalMutation, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { notifyUser } from "./lib/notify";
import { requireAuth } from "./lib/auth";

/**
 * Calcule l'horodatage exact (en ms epoch) correspondant à 18h00 heure de Paris
 * la veille d'un événement (startsAt).
 */
export function getEveAt18hTimestamp(eventStartsAt: number): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(new Date(eventStartsAt));
  const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10);
  const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);

  let candidate = Date.UTC(year, month - 1, day - 1, 16, 0, 0);
  const parisHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Paris",
      hour: "numeric",
      hour12: false,
    }).format(new Date(candidate)),
    10
  );
  const diffHours = 18 - parisHour;
  candidate += diffHours * 3600 * 1000;
  return candidate;
}

/**
 * Formatage de l'horaire en français (ex: "09:30 à 11:30").
 */
function formatEventTime(startsAt: number, endsAt?: number): string {
  const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  });
  const startStr = timeFormatter.format(new Date(startsAt));
  if (!endsAt) return startStr;
  const endStr = timeFormatter.format(new Date(endsAt));
  return `${startStr} à ${endStr}`;
}

async function doCheckAndSendEveReminders(ctx: MutationCtx, force = false) {
  const now = Date.now();

  const parisHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Paris",
      hour: "numeric",
      hour12: false,
    }).format(new Date(now)),
    10
  );

  // Si on n'est pas après 18h à Paris et que l'envoi n'est pas forcé, ne rien faire
  if (!force && parisHour < 18) {
    return { skipped: true, reason: "Paris time is before 18:00", parisHour };
  }

  // Événements dans les prochaines 36 heures
  const thirtySixHoursAhead = now + 36 * 3600 * 1000;
  const upcomingEvents = await ctx.db
    .query("events")
    .withIndex("startsAt", (q) => q.gte("startsAt", now).lte("startsAt", thirtySixHoursAhead))
    .collect();

  let sentCount = 0;

  for (const event of upcomingEvents) {
    if (event.status === "CANCELLED") continue;

    const eve18h = getEveAt18hTimestamp(event.startsAt);
    if (!force && now < eve18h) continue;

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("eventId", (q) => q.eq("eventId", event._id))
      .collect();

    for (const assignment of assignments) {
      if (assignment.status === "CANCELLED" || assignment.status === "DECLINED") continue;

      const validation = await ctx.db
        .query("serviceValidations")
        .withIndex("eventUserPole", (q) =>
          q.eq("eventId", assignment.eventId).eq("userId", assignment.userId).eq("poleId", assignment.poleId)
        )
        .first();

      if (validation && validation.reminderSentAt) continue;

      const [user, pole] = await Promise.all([
        ctx.db.get(assignment.userId),
        ctx.db.get(assignment.poleId),
      ]);
      if (!user || !pole) continue;

      const timeStr = formatEventTime(event.startsAt, event.endsAt);
      const greeting = user.firstName ? `Bonjour ${user.firstName}` : "Bonjour";

      await notifyUser(ctx, {
        userId: assignment.userId,
        title: `Rappel de service pour demain : ${event.title}`,
        message: `${greeting}, vous êtes en service demain pour "${event.title}" avec le pôle ${pole.name} (${timeStr}). Bon service et sois béni(e) !`,
        type: "SERVICE_REMINDER",
        linkUrl: `/calendar?eventId=${event._id}`,
      });

      if (validation) {
        await ctx.db.patch(validation._id, {
          reminderSentAt: Date.now(),
          reminderCount: (validation.reminderCount || 0) + 1,
          updatedAt: Date.now(),
        });
      }

      sentCount++;
    }
  }

  return { success: true, sentCount, parisHour };
}

/**
 * Envoi ponctuel de rappel pour une affectation individuelle (scheduler runAt)
 */
export const sendReminderForSingleAssignment = internalMutation({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, { assignmentId }) => {
    const assignment = await ctx.db.get(assignmentId);
    if (!assignment || assignment.status === "CANCELLED" || assignment.status === "DECLINED") {
      return { skipped: true, reason: "Assignment cancelled or not found" };
    }

    const event = await ctx.db.get(assignment.eventId);
    if (!event || event.status === "CANCELLED") {
      return { skipped: true, reason: "Event cancelled or not found" };
    }

    const validation = await ctx.db
      .query("serviceValidations")
      .withIndex("eventUserPole", (q) =>
        q.eq("eventId", assignment.eventId).eq("userId", assignment.userId).eq("poleId", assignment.poleId)
      )
      .first();

    if (validation && validation.reminderSentAt) {
      return { skipped: true, reason: "Reminder already sent" };
    }

    const [user, pole] = await Promise.all([
      ctx.db.get(assignment.userId),
      ctx.db.get(assignment.poleId),
    ]);
    if (!user || !pole) return { skipped: true, reason: "User or pole not found" };

    const timeStr = formatEventTime(event.startsAt, event.endsAt);
    const greeting = user.firstName ? `Bonjour ${user.firstName}` : "Bonjour";

    await notifyUser(ctx, {
      userId: assignment.userId,
      title: `Rappel de service pour demain : ${event.title}`,
      message: `${greeting}, vous êtes en service demain pour "${event.title}" avec le pôle ${pole.name} (${timeStr}). Bon service et sois béni(e) !`,
      type: "SERVICE_REMINDER",
      linkUrl: `/calendar?eventId=${event._id}`,
    });

    if (validation) {
      await ctx.db.patch(validation._id, {
        reminderSentAt: Date.now(),
        reminderCount: (validation.reminderCount || 0) + 1,
        updatedAt: Date.now(),
      });
    }

    return { success: true, userId: assignment.userId, eventId: event._id };
  },
});

/**
 * Exécuté automatiquement par le cron pour vérifier et envoyer les rappels de veille à 18h
 */
export const checkAndSendEveReminders = internalMutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    return await doCheckAndSendEveReminders(ctx, force || false);
  },
});

/**
 * Déclenchement manuel ou test pour responsables/admins
 */
export const triggerEveRemindersNow = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await doCheckAndSendEveReminders(ctx, true);
  },
});
