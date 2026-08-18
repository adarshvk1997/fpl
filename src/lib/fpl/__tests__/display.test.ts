import { describe, it, expect } from "vitest";
import { toDisplaySquad } from "../display";
import type { FplBootstrapStatic, FplPlayer } from "../types";

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

const bootstrap: FplBootstrapStatic = {
  events: [],
  teams: [
    { id: 1, name: "Arsenal", short_name: "ARS", strength: 4 },
    { id: 2, name: "Liverpool", short_name: "LIV", strength: 5 },
  ],
  elements: [
    makePlayer({ id: 10, web_name: "Saka", team: 1, now_cost: 95 }),
    makePlayer({ id: 20, web_name: "Salah", team: 2, now_cost: 130 }),
  ],
  element_types: [],
};

describe("toDisplaySquad", () => {
  it("enriches slots with player name, team, and formatted cost", () => {
    const display = toDisplaySquad(
      bootstrap,
      [
        { player_id: 10, position: "MID" },
        { player_id: 20, position: "FWD" },
      ],
      10,
      20
    );
    expect(display[0]).toMatchObject({ id: 10, name: "Saka", team: "ARS", cost: "£9.5m" });
    expect(display[1]).toMatchObject({ id: 20, name: "Salah", team: "LIV", cost: "£13.0m" });
  });

  it("marks the captain and vice-captain correctly", () => {
    const display = toDisplaySquad(
      bootstrap,
      [
        { player_id: 10, position: "MID" },
        { player_id: 20, position: "FWD" },
      ],
      10,
      20
    );
    expect(display[0]).toMatchObject({ isCaptain: true, isViceCaptain: false });
    expect(display[1]).toMatchObject({ isCaptain: false, isViceCaptain: true });
  });

  it("falls back gracefully when a player id isn't found in bootstrap data", () => {
    const display = toDisplaySquad(bootstrap, [{ player_id: 999, position: "DEF" }], 10, 20);
    expect(display[0]).toMatchObject({ name: "#999", team: "?", cost: "—" });
  });
});
