export interface UnavailabilityLike {
  startsAt: number;
  endsAt: number;
  recurrence?: string;
}

/**
 * Checks whether an unavailability record overlaps with an event's time interval.
 * Accounts for:
 * 1. Date-range unavailabilities where endsAt was saved at 00:00:00 (expanded to full day end).
 * 2. Timezone offsets between browser local time and server UTC.
 * 3. Calendar date matching (YYYY-MM-DD).
 * 4. Recurrence rules (WEEKLY, BIWEEKLY, MONTHLY).
 */
export function isUnavailabilityOverlapping(
  u: UnavailabilityLike,
  eventStart: number,
  eventEnd: number
): boolean {
  if (!u || !u.startsAt || !u.endsAt || !eventStart || !eventEnd) return false;

  // 1. Expand unavailability bounds to cover the entire start and end calendar days.
  // Many records in the database were saved with endsAt = 00:00:00 of the final day.
  const uStartDate = new Date(u.startsAt);
  const uEndDate = new Date(u.endsAt);

  const startOfDayLocal = new Date(
    uStartDate.getFullYear(),
    uStartDate.getMonth(),
    uStartDate.getDate(),
    0, 0, 0, 0
  ).getTime();
  const startOfDayUTC = Date.UTC(
    uStartDate.getUTCFullYear(),
    uStartDate.getUTCMonth(),
    uStartDate.getUTCDate(),
    0, 0, 0, 0
  );
  const effectiveUStart = Math.min(u.startsAt, startOfDayLocal, startOfDayUTC);

  const endOfDayLocal = new Date(
    uEndDate.getFullYear(),
    uEndDate.getMonth(),
    uEndDate.getDate(),
    23, 59, 59, 999
  ).getTime();
  const endOfDayUTC = Date.UTC(
    uEndDate.getUTCFullYear(),
    uEndDate.getUTCMonth(),
    uEndDate.getUTCDate(),
    23, 59, 59, 999
  );
  const effectiveUEnd = Math.max(u.endsAt, endOfDayLocal, endOfDayUTC);

  // Direct timestamp overlap with day expansion
  if (effectiveUStart <= eventEnd && effectiveUEnd >= eventStart) {
    return true;
  }

  // 2. Calendar date string matching (handles cross-timezone day comparisons)
  const toDateStrLocal = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const toDateStrUTC = (ms: number) => {
    const d = new Date(ms);
    return d.toISOString().slice(0, 10);
  };

  const uStartLocal = toDateStrLocal(u.startsAt);
  const uEndLocal = toDateStrLocal(u.endsAt);
  const evStartLocal = toDateStrLocal(eventStart);
  const evEndLocal = toDateStrLocal(eventEnd);

  if (
    (evStartLocal >= uStartLocal && evStartLocal <= uEndLocal) ||
    (evEndLocal >= uStartLocal && evEndLocal <= uEndLocal) ||
    (uStartLocal >= evStartLocal && uStartLocal <= evEndLocal)
  ) {
    return true;
  }

  const uStartUTC = toDateStrUTC(u.startsAt);
  const uEndUTC = toDateStrUTC(u.endsAt);
  const evStartUTC = toDateStrUTC(eventStart);
  const evEndUTC = toDateStrUTC(eventEnd);

  if (
    (evStartUTC >= uStartUTC && evStartUTC <= uEndUTC) ||
    (evEndUTC >= uStartUTC && evEndUTC <= uEndUTC) ||
    (uStartUTC >= evStartUTC && uStartUTC <= evEndUTC)
  ) {
    return true;
  }

  // 3. Recurrence handling
  const recurrence = u.recurrence || 'NONE';
  if (recurrence !== 'NONE') {
    const evDate = new Date(eventStart);
    // Don't apply recurrence to events that happened before the initial unavailability start date
    if (evDate.getTime() < effectiveUStart && evStartLocal < uStartLocal && evStartUTC < uStartUTC) {
      return false;
    }

    const uDayLocal = uStartDate.getDay();
    const uEndDayLocal = uEndDate.getDay();
    const evDayLocal = evDate.getDay();

    const uDayUTC = uStartDate.getUTCDay();
    const uEndDayUTC = uEndDate.getUTCDay();
    const evDayUTC = evDate.getUTCDay();

    const matchesDayOfWeek = (startDay: number, endDay: number, day: number) => {
      if (startDay <= endDay) {
        return day >= startDay && day <= endDay;
      }
      return day >= startDay || day <= endDay;
    };

    const dayMatches =
      matchesDayOfWeek(uDayLocal, uEndDayLocal, evDayLocal) ||
      matchesDayOfWeek(uDayUTC, uEndDayUTC, evDayUTC);

    if (recurrence === 'WEEKLY') {
      if (dayMatches) return true;
    } else if (recurrence === 'BIWEEKLY') {
      const diffDays = Math.round(Math.abs(eventStart - u.startsAt) / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffWeeks % 2 === 0 && dayMatches) {
        return true;
      }
    } else if (recurrence === 'MONTHLY') {
      const evDateNum = evDate.getDate();
      const uStartDateNum = uStartDate.getDate();
      const uEndDateNum = uEndDate.getDate();
      if (evDateNum >= uStartDateNum && evDateNum <= uEndDateNum) {
        return true;
      }
    }
  }

  return false;
}
