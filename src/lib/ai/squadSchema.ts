import { z } from "zod";

const squadSlotSchema = z.object({
  player_id: z.number().int(),
  position: z.enum(["GKP", "DEF", "MID", "FWD"]),
});

const transferSchema = z.object({
  player_out_id: z.number().int(),
  player_in_id: z.number().int(),
  points_hit: z.number().int(),
  rationale: z.string(),
});

const newsItemSchema = z.object({
  player_id: z.number().int().nullable(),
  player_name: z.string(),
  category: z.enum([
    "injury",
    "suspension",
    "rotation",
    "press_conference",
    "lineup",
    "transfer",
    "other",
  ]),
  headline: z.string(),
  summary: z.string(),
  relevance: z.enum(["my_squad", "watchlist"]),
});

/** The full shape a single AI generation run must return. Used both to build
 *  the structured-output schema sent to Gemini and to validate the response. */
export const squadSuggestionSchema = z.object({
  starting_xi: z.array(squadSlotSchema).length(11),
  bench: z.array(squadSlotSchema).length(4),
  captain_id: z.number().int(),
  vice_captain_id: z.number().int(),
  formation: z.string(),
  predicted_points: z.number(),
  chip_recommended: z
    .enum(["wildcard", "free_hit", "bench_boost", "triple_captain"])
    .nullable(),
  rationale_summary: z
    .string()
    .describe(
      "A confident, expert-pundit-toned overview of this gameweek's picks (3-6 sentences), " +
        "written like a seasoned analyst explaining choices to a fellow manager, not a stats dump."
    ),
  transfers: z.array(transferSchema),
  news_items: z.array(newsItemSchema),
});

export type SquadSuggestion = z.infer<typeof squadSuggestionSchema>;
