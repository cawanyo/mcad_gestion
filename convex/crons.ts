import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Rappel de service chaque veille à 18h (heure locale Paris)
// S'exécute toutes les 30 minutes : dès qu'il est 18h00 à Paris, tous les membres
// en service le lendemain reçoivent leur notification de rappel.
crons.interval(
  "eve-of-service-reminders",
  { minutes: 30 },
  internal.reminders.checkAndSendEveReminders,
  {}
);

export default crons;
