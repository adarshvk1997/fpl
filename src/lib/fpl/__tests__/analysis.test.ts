import { describe, it, expect } from "vitest";
import { formatCost, positionShort, playerStatusFlag, getTeamFixtureRun, findPlayer } from "../analysis";
import type { FplPlayer, FplFixture, FplBootstrapStatic } from "../types";

function makePlayer(overrides: Partial<FplPlayer> = {}): FplPlayer {
  return {
    id: 1,
    first_name: "Test",
    second_name: "Player",
    web_name: "Player",
    team: 1,
    element_type: 3,
    now_cost: 100,
    total_points: 0,
    event_points: 0,
    points_per_game: "0.0",
    selected_by_percent: "0.0",
    form: "0.0",
    minutes: 0,
    status: "a",
    news: "",
    news_added: null,
    chance_of_playing_this_round: null,
    chance_of_playing_next_round: null,
    ...overrides,
  };
}

describe("formatCost", () => {
  it("formats tenths-of-a-million integers as £m", () => {
    expect(formatCost(105)).toBe("£10.5m");
    expect(formatCost(45)).toBe("£4.5m");
    expect(formatCost(40)).toBe("£4.0m");
  });

  it("handles zero", () => {
    expect(formatCost(0)).toBe("£0.0m");
  });
});

describe("positionShort", () => {
  it("maps FPL element_type 1-4 to position codes", () => {
    expect(positionShort(1)).toBe("GKP");
    expect(positionShort(2)).toBe("DEF");
    expect(positionShort(3)).toBe("MID");
    expect(positionShort(4)).toBe("FWD");
  });
});

describe("playerStatusFlag", () => {
  it("returns null for a fully available player with no news", () => {
    expect(playerStatusFlag(makePlayer({ status: "a", news: "" }))).toBeNull();
  });

  it("flags a doubtful player with chance-of-playing percentage", () => {
    const flag = playerStatusFlag(
      makePlayer({ status: "d", chance_of_playing_this_round: 75, news: "Knock" })
    );
    expect(flag).toBe("Doubtful — 75% chance this round — Knock");
  });

  it("flags an injured player even with no explicit news text", () => {
    const flag = playerStatusFlag(makePlayer({ status: "i", news: "" }));
    expect(flag).toBe("Injured");
  });

  it("still surfaces news text on an otherwise-available player", () => {
    // status 'a' but non-empty news — e.g. a minor knock that hasn't
    // changed official availability yet. Should NOT be null.
    const flag = playerStatusFlag(makePlayer({ status: "a", news: "Precautionary rest" }));
    expect(flag).toBe("Available — Precautionary rest");
  });

  it("omits the chance-of-playing segment when null", () => {
    const flag = playerStatusFlag(
      makePlayer({ status: "s", chance_of_playing_this_round: null, news: "Suspended" })
    );
    expect(flag).toBe("Suspended — Suspended");
  });
});

describe("findPlayer", () => {
  it("finds a player by id in bootstrap data", () => {
    const bootstrap: FplBootstrapStatic = {
      events: [],
      teams: [],
      elements: [makePlayer({ id: 42 }), makePlayer({ id: 43 })],
      element_types: [],
    };
    expect(findPlayer(bootstrap, 43)?.id).toBe(43);
    expect(findPlayer(bootstrap, 999)).toBeUndefined();
  });
});

describe("getTeamFixtureRun", () => {
  const fixtures: FplFixture[] = [
    { id: 1, event: 5, team_h: 10, team_a: 20, team_h_difficulty: 2, team_a_difficulty: 4, kickoff_time: null, finished: false },
    { id: 2, event: 6, team_h: 20, team_a: 10, team_h_difficulty: 3, team_a_difficulty: 3, kickoff_time: null, finished: false },
    { id: 3, event: 11, team_h: 10, team_a: 30, team_h_difficulty: 1, team_a_difficulty: 5, kickoff_time: null, finished: false }, // out of window
    { id: 4, event: null, team_h: 10, team_a: 40, team_h_difficulty: 3, team_a_difficulty: 3, kickoff_time: null, finished: false }, // no event yet
  ];

  it("returns only fixtures within the [fromEvent, fromEvent+count) window for the given team", () => {
    const run = getTeamFixtureRun(10, fixtures, 5, 5);
    expect(run).toHaveLength(2);
    expect(run.map((f) => f.event)).toEqual([5, 6]);
  });

  it("reports home/away and the difficulty from the team's own perspective", () => {
    const run = getTeamFixtureRun(10, fixtures, 5, 5);
    expect(run[0]).toMatchObject({ isHome: true, opponent: 20, difficulty: 2 }); // team 10 home in fixture 1
    expect(run[1]).toMatchObject({ isHome: false, opponent: 20, difficulty: 3 }); // team 10 away in fixture 2
  });

  it("excludes fixtures with no assigned gameweek yet", () => {
    const run = getTeamFixtureRun(10, fixtures, 5, 10);
    expect(run.every((f) => f.event !== null)).toBe(true);
  });

  it("returns an empty array when the team has no fixtures in range", () => {
    expect(getTeamFixtureRun(999, fixtures, 5, 5)).toEqual([]);
  });
});
