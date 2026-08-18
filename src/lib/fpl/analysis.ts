import "server-only";
import type { FplBootstrapStatic, FplFixture, FplPlayer } from "./types";

/** Fixture difficulty for one team across the next `count` gameweeks, so the
 *  AI can weigh fixture swings 3-5 GWs out rather than just the next match. */
export function getTeamFixtureRun(
  teamId: number,
  fixtures: FplFixture[],
  fromEvent: number,
  count = 5
): { event: number; opponent: number; isHome: boolean; difficulty: number }[] {
  return fixtures
    .filter(
      (f) =>
        f.event !== null &&
        f.event >= fromEvent &&
        f.event < fromEvent + count &&
        (f.team_h === teamId || f.team_a === teamId)
    )
    .sort((a, b) => (a.event ?? 0) - (b.event ?? 0))
    .map((f) => {
      const isHome = f.team_h === teamId;
      return {
        event: f.event!,
        opponent: isHome ? f.team_a : f.team_h,
        isHome,
        difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
      };
    });
}

/** Human-readable flag for anything the FPL API itself already knows about a
 *  player's fitness/availability — this is the free, structured, no-scraping
 *  layer described in the spec. Web search fills in what this can't see. */
export function playerStatusFlag(p: FplPlayer): string | null {
  if (p.status === "a" && !p.news) return null;
  const statusLabel: Record<FplPlayer["status"], string> = {
    a: "Available",
    d: "Doubtful",
    i: "Injured",
    n: "Not in squad",
    s: "Suspended",
    u: "Unavailable",
  };
  const parts = [statusLabel[p.status]];
  if (p.chance_of_playing_this_round !== null) {
    parts.push(`${p.chance_of_playing_this_round}% chance this round`);
  }
  if (p.news) parts.push(p.news);
  return parts.join(" — ");
}

/** Cheap £m formatting from FPL's tenths-of-a-million integers. */
export function formatCost(tenths: number): string {
  return `£${(tenths / 10).toFixed(1)}m`;
}

export function findPlayer(data: FplBootstrapStatic, id: number): FplPlayer | undefined {
  return data.elements.find((p) => p.id === id);
}

export function positionShort(elementType: FplPlayer["element_type"]): "GKP" | "DEF" | "MID" | "FWD" {
  return (["GKP", "DEF", "MID", "FWD"] as const)[elementType - 1];
}
