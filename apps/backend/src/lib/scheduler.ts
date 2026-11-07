import { prisma } from "./prisma";

export type ShopSchedule = {
  workingHoursStart: string; // "09:00"
  workingHoursEnd: string; // "18:00"
  lunchBreakStart: string | null; // "13:00"
  lunchBreakEnd: string | null; // "14:00"
  daysOff: string[]; // e.g. ["Sunday"]
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULTS: ShopSchedule = {
  workingHoursStart: "09:00",
  workingHoursEnd: "18:00",
  lunchBreakStart: "13:00",
  lunchBreakEnd: "14:00",
  daysOff: ["Sunday"],
};

// FR-6.1: working hours / lunch break / days off are admin-configurable via
// the Config key-value table. Falls back to sane defaults if unset so the
// scheduler never crashes on a fresh, unseeded database.
export async function loadShopSchedule(): Promise<ShopSchedule> {
  const rows = await prisma.config.findMany({
    where: {
      key: {
        in: ["working_hours_start", "working_hours_end", "lunch_break_start", "lunch_break_end", "days_off"],
      },
    },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  let daysOff: string[] = DEFAULTS.daysOff;
  if (map.days_off) {
    try {
      const parsed = JSON.parse(map.days_off);
      if (Array.isArray(parsed)) daysOff = parsed;
    } catch {
      // ignore malformed config, fall back to default
    }
  }

  return {
    workingHoursStart: map.working_hours_start ?? DEFAULTS.workingHoursStart,
    workingHoursEnd: map.working_hours_end ?? DEFAULTS.workingHoursEnd,
    lunchBreakStart: map.lunch_break_start ?? DEFAULTS.lunchBreakStart,
    lunchBreakEnd: map.lunch_break_end ?? DEFAULTS.lunchBreakEnd,
    daysOff,
  };
}

function parseTime(value: string): { hours: number; minutes: number } {
  const [h, m] = value.split(":").map(Number);
  return { hours: h ?? 0, minutes: m ?? 0 };
}

function atTime(date: Date, time: string): Date {
  const { hours, minutes } = parseTime(time);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function isDayOff(date: Date, schedule: ShopSchedule): boolean {
  return schedule.daysOff.includes(DAY_NAMES[date.getDay()]);
}

function startOfNextDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Walk forward to the next moment that is (a) on a working day, (b) within
// business hours, (c) outside the lunch break, and (d) leaves enough room
// before closing to fit `durationMinutes`. If closing time would be
// exceeded, carries the job forward to the next working day's opening time
// (FR-2.4).
function nextAvailableSlot(cursor: Date, durationMinutes: number, schedule: ShopSchedule): Date {
  let candidate = new Date(cursor);

  // Safety cap: at most 30 day-rolls, so a misconfigured "every day off"
  // schedule fails fast instead of looping forever.
  for (let i = 0; i < 30; i++) {
    if (isDayOff(candidate, schedule)) {
      candidate = atTime(startOfNextDay(candidate), schedule.workingHoursStart);
      continue;
    }

    const open = atTime(candidate, schedule.workingHoursStart);
    const close = atTime(candidate, schedule.workingHoursEnd);

    if (candidate < open) {
      candidate = open;
    }

    if (candidate >= close) {
      candidate = atTime(startOfNextDay(candidate), schedule.workingHoursStart);
      continue;
    }

    if (schedule.lunchBreakStart && schedule.lunchBreakEnd) {
      const lunchStart = atTime(candidate, schedule.lunchBreakStart);
      const lunchEnd = atTime(candidate, schedule.lunchBreakEnd);
      if (candidate >= lunchStart && candidate < lunchEnd) {
        candidate = lunchEnd;
        continue;
      }
    }

    const finishBy = new Date(candidate.getTime() + durationMinutes * 60_000);
    if (finishBy > close) {
      candidate = atTime(startOfNextDay(candidate), schedule.workingHoursStart);
      continue;
    }

    return candidate;
  }

  return candidate;
}

export type QueueItem = {
  ticketId: number;
  durationMinutes: number;
  /** Set only for the ticket currently IN_PROGRESS: its real start time, not calculated. */
  fixedStart?: Date;
};

export type ScheduledItem = {
  ticketId: number;
  estimatedStartTime: Date;
};

// FR-2.2 / FR-2.3: given the queue in order (in-progress ticket first, if
// any, then WAITING tickets by queuePosition), compute each ticket's
// estimated start time. Single-technician assumption (SRS 2.5): one job
// runs at a time, so each ticket's start is the previous ticket's start +
// duration, adjusted to skip non-working time.
export function computeQueueSchedule(now: Date, items: QueueItem[], schedule: ShopSchedule): ScheduledItem[] {
  const results: ScheduledItem[] = [];
  let cursor = now;

  for (const item of items) {
    let start: Date;
    if (item.fixedStart) {
      start = item.fixedStart;
    } else {
      start = nextAvailableSlot(cursor, item.durationMinutes, schedule);
    }
    results.push({ ticketId: item.ticketId, estimatedStartTime: start });
    cursor = new Date(start.getTime() + item.durationMinutes * 60_000);
  }

  return results;
}

// Recalculates and persists estimated_start_time for every active
// (IN_PROGRESS or WAITING) ticket. Call after registration, status changes,
// reorder, or cancellation (FR-2.3).
export async function recalculateQueue(): Promise<void> {
  const schedule = await loadShopSchedule();

  const inProgress = await prisma.ticket.findFirst({
    where: { status: "IN_PROGRESS" },
    include: { repairType: true },
  });

  const waiting = await prisma.ticket.findMany({
    where: { status: "WAITING" },
    include: { repairType: true },
    orderBy: { queuePosition: "asc" },
  });

  const items: QueueItem[] = [];
  if (inProgress) {
    items.push({
      ticketId: inProgress.id,
      durationMinutes: inProgress.repairType.estimatedDurationMinutes,
      fixedStart: inProgress.startedAt ?? new Date(),
    });
  }
  for (const t of waiting) {
    items.push({ ticketId: t.id, durationMinutes: t.repairType.estimatedDurationMinutes });
  }

  const schedule_ = computeQueueSchedule(new Date(), items, schedule);

  await prisma.$transaction(
    schedule_.map((s) =>
      prisma.ticket.update({
        where: { id: s.ticketId },
        data: { estimatedStartTime: s.estimatedStartTime },
      })
    )
  );

  // Also keep queuePosition contiguous (1..N) for the WAITING tickets, in
  // case a cancellation left gaps.
  await prisma.$transaction(
    waiting.map((t, index) =>
      prisma.ticket.update({ where: { id: t.id }, data: { queuePosition: index + 1 } })
    )
  );
}
