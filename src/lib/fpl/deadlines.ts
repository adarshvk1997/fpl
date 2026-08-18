import "server-only";
import type { FplEvent } from "./types";
import { getEvents } from "./client";

const LOCK_WINDOW_MS = 2 * 60 * 60 * 1000; // T-2h

export interface DeadlineStatus {
  event: FplEvent;
  deadline: Date;
  msUntilDeadline: number;
  msUntilLockWindow: number; // negative once we're inside the T-2h window
  isPastLockWindow: boolean;
  isPastDeadline: boolean;
}

/** Deadline math for the given (or current/next) gameweek, driven entirely by
 *  the FPL API's own `deadline_time` — no schedule is hardcoded anywhere. */
export async function getDeadlineStatus(event?: FplEvent): Promise<DeadlineStatus> {
  const target = event ?? (await pickTargetEvent());
  const deadline = new Date(target.deadline_time);
  const now = Date.now();
  const msUntilDeadline = deadline.getTime() - now;
  const msUntilLockWindow = msUntilDeadline - LOCK_WINDOW_MS;

  return {
    event: target,
    deadline,
    msUntilDeadline,
    msUntilLockWindow,
    isPastLockWindow: msUntilLockWindow <= 0,
    isPastDeadline: msUntilDeadline <= 0,
  };
}

async function pickTargetEvent(): Promise<FplEvent> {
  const events = await getEvents();
  const next = events.find((e) => e.is_next);
  const current = events.find((e) => e.is_current);
  const chosen = next ?? current;
  if (!chosen) throw new Error("No current/next gameweek found in FPL events");
  return chosen;
}

/** Every upcoming gameweek whose T-2h lock window has just opened and hasn't
 *  fired yet — used by the cron route to decide which snapshot(s) to lock. */
export async function getEventsEnteringLockWindow(): Promise<FplEvent[]> {
  const events = await getEvents();
  const now = Date.now();
  return events.filter((e) => {
    if (e.finished) return false;
    const deadline = new Date(e.deadline_time).getTime();
    const lockAt = deadline - LOCK_WINDOW_MS;
    return now >= lockAt && now < deadline;
  });
}
