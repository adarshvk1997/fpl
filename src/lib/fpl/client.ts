// Thin, typed wrapper around the official public FPL API. Free, no API key.
// Base URL and endpoints per the community-documented (unofficial but stable)
// contract: https://fantasy.premierleague.com/api/
import "server-only";
import type {
  FplBootstrapStatic,
  FplEntry,
  FplEntryEventPicks,
  FplEvent,
  FplEventLive,
  FplFixture,
} from "./types";

const BASE = "https://fantasy.premierleague.com/api";

async function fplFetch<T>(path: string, revalidateSeconds: number): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    // Next.js data cache — bootstrap-static and fixtures change slowly, so we
    // don't need to hit the FPL API on every request.
    next: { revalidate: revalidateSeconds },
    headers: { "User-Agent": "fpl-ai-advisor (personal use)" },
  });
  if (!res.ok) {
    throw new Error(`FPL API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Players, teams, gameweeks (events) — the core reference data. Refreshed hourly. */
export function getBootstrapStatic(): Promise<FplBootstrapStatic> {
  return fplFetch<FplBootstrapStatic>("/bootstrap-static/", 3600);
}

/** All fixtures for the season, including future gameweek difficulty ratings. */
export function getFixtures(): Promise<FplFixture[]> {
  return fplFetch<FplFixture[]>("/fixtures/", 3600);
}

/** Fixtures for a single gameweek only. */
export function getFixturesForEvent(event: number): Promise<FplFixture[]> {
  return fplFetch<FplFixture[]>(`/fixtures/?event=${event}`, 3600);
}

/** A manager's team summary (name, current gameweek, bank/value at last deadline). */
export function getEntry(teamId: number): Promise<FplEntry> {
  return fplFetch<FplEntry>(`/entry/${teamId}/`, 300);
}

/** A manager's picks (15-man squad, captain/VC, active chip, bank) for one gameweek. */
export function getEntryEventPicks(teamId: number, event: number): Promise<FplEntryEventPicks> {
  return fplFetch<FplEntryEventPicks>(`/entry/${teamId}/event/${event}/picks/`, 300);
}

/** Live per-player stats for a gameweek (points as they update during matches). */
export function getEventLive(event: number): Promise<FplEventLive> {
  return fplFetch<FplEventLive>(`/event/${event}/live/`, 60);
}

/** Convenience: pull just the `events` array (all 38 gameweeks + deadlines). */
export async function getEvents(): Promise<FplEvent[]> {
  const data = await getBootstrapStatic();
  return data.events;
}

/** The gameweek that is currently open for transfers (not yet started). */
export async function getCurrentOrNextEvent(): Promise<FplEvent> {
  const events = await getEvents();
  const next = events.find((e) => e.is_next);
  const current = events.find((e) => e.is_current);
  const found = next ?? current;
  if (!found) throw new Error("Could not determine current/next gameweek from FPL events");
  return found;
}

/** The most recently finished gameweek, if its data is fully checked. */
export async function getLastFinishedEvent(): Promise<FplEvent | undefined> {
  const events = await getEvents();
  return [...events].reverse().find((e) => e.finished && e.data_checked);
}
