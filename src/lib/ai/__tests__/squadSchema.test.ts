import { describe, it, expect } from "vitest";
import { squadSuggestionSchema } from "../squadSchema";

function validSlots(count: number, position: "GKP" | "DEF" | "MID" | "FWD") {
  return Array.from({ length: count }, (_, i) => ({ player_id: i + 1, position }));
}

function baseSuggestion() {
  return {
    starting_xi: [
      ...validSlots(1, "GKP"),
      ...validSlots(4, "DEF"),
      ...validSlots(4, "MID"),
      ...validSlots(2, "FWD"),
    ],
    bench: [...validSlots(1, "GKP"), ...validSlots(3, "DEF")].map((s, i) => ({ ...s, player_id: 100 + i })),
    captain_id: 1,
    vice_captain_id: 2,
    formation: "4-4-2",
    predicted_points: 55.5,
    chip_recommended: null,
    rationale_summary: "A solid gameweek pick.",
    transfers: [],
    news_items: [],
  };
}

describe("squadSuggestionSchema", () => {
  it("accepts a well-formed suggestion", () => {
    const result = squadSuggestionSchema.safeParse(baseSuggestion());
    expect(result.success).toBe(true);
  });

  it("rejects a starting XI that isn't exactly 11 players", () => {
    const bad = baseSuggestion();
    bad.starting_xi = bad.starting_xi.slice(0, 10);
    expect(squadSuggestionSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a bench that isn't exactly 4 players", () => {
    const bad = baseSuggestion();
    bad.bench = bad.bench.slice(0, 3);
    expect(squadSuggestionSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an invalid position value", () => {
    const bad = baseSuggestion();
    // @ts-expect-error deliberately invalid for the test
    bad.starting_xi[0].position = "STRIKER";
    expect(squadSuggestionSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an invalid chip name", () => {
    const bad = baseSuggestion();
    // @ts-expect-error deliberately invalid for the test
    bad.chip_recommended = "super_sub";
    expect(squadSuggestionSchema.safeParse(bad).success).toBe(false);
  });

  it("allows chip_recommended to be null", () => {
    const ok = baseSuggestion();
    ok.chip_recommended = null;
    expect(squadSuggestionSchema.safeParse(ok).success).toBe(true);
  });

  it("accepts a valid transfer entry", () => {
    const withTransfer = baseSuggestion();
    withTransfer.transfers = [
      { player_out_id: 5, player_in_id: 105, points_hit: 4, rationale: "Fixture swing." },
    ] as never;
    expect(squadSuggestionSchema.safeParse(withTransfer).success).toBe(true);
  });

  it("rejects a news item with an invalid category", () => {
    const bad = baseSuggestion();
    bad.news_items = [
      {
        player_id: 1,
        player_name: "Someone",
        category: "gossip", // not a valid category
        headline: "h",
        summary: "s",
        relevance: "my_squad",
      },
    ] as never;
    expect(squadSuggestionSchema.safeParse(bad).success).toBe(false);
  });

  it("allows a news item with a null player_id (team-level news)", () => {
    const ok = baseSuggestion();
    ok.news_items = [
      {
        player_id: null,
        player_name: "Team News",
        category: "other",
        headline: "h",
        summary: "s",
        relevance: "watchlist",
      },
    ] as never;
    expect(squadSuggestionSchema.safeParse(ok).success).toBe(true);
  });
});
