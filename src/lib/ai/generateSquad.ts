import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, AI_MODEL } from "./client";
import { squadSuggestionSchema, type SquadSuggestion } from "./squadSchema";
import { researchCurrentNews } from "./research";
import type { FplBootstrapStatic, FplFixture } from "@/lib/fpl/types";
import { findPlayer, formatCost, getTeamFixtureRun, playerStatusFlag, positionShort } from "@/lib/fpl/analysis";
import type { ChipName, SnapshotTrigger } from "@/lib/types/database";

export interface CurrentSquadContext {
  playerIds: number[]; // 15-man squad
  bank: number; // £m
  freeTransfers: number;
  activeChip: ChipName | null;
  chipsUsedThisSeason: ChipName[];
  previousCaptainId?: number;
  watchlistPlayerIds?: number[];
}

export interface GenerateSquadParams {
  gameweek: number;
  gameweekLabel: string; // e.g. "Gameweek 12"
  trigger: SnapshotTrigger;
  squad: CurrentSquadContext;
  bootstrap: FplBootstrapStatic;
  fixtures: FplFixture[];
  /** Free-form recap of how the previous gameweek's picks actually performed,
   *  fed in so the AI can reference "what worked / what I'd change" — the
   *  spec's "Last Gameweek Review" — without a separate API call. */
  previousGameweekRecap?: string;
}

export interface GenerateSquadResult {
  suggestion: SquadSuggestion;
  usage: {
    researchInputTokens: number;
    researchOutputTokens: number;
    webSearchCount: number;
    squadInputTokens: number;
    squadOutputTokens: number;
  };
}

function playerLine(bootstrap: FplBootstrapStatic, fixtures: FplFixture[], gameweek: number, id: number): string {
  const p = findPlayer(bootstrap, id);
  if (!p) return `Player ${id} (not found in current FPL data)`;
  const team = bootstrap.teams.find((t) => t.id === p.team);
  const run = getTeamFixtureRun(p.team, fixtures, gameweek, 5)
    .map((f) => {
      const opp = bootstrap.teams.find((t) => t.id === f.opponent)?.short_name ?? "?";
      return `${f.isHome ? "" : "@"}${opp}(${f.difficulty})`;
    })
    .join(", ");
  const status = playerStatusFlag(p);
  return (
    `#${p.id} ${p.web_name} (${positionShort(p.element_type)}, ${team?.short_name ?? "?"}, ${formatCost(p.now_cost)}) — ` +
    `form ${p.form}, PPG ${p.points_per_game}, ${p.selected_by_percent}% owned` +
    (status ? ` — ${status}` : "") +
    (run ? ` — next 5: ${run}` : "")
  );
}

/**
 * The single most important call in the app: assembles official FPL data +
 * web-search-sourced news + season context into one prompt and asks Claude
 * for a structured squad suggestion with a pundit-toned rationale. Runs at
 * most a few times per gameweek (gameweek open / manual refresh / T-2h
 * lock) — never per page load; callers cache the result in squad_snapshots.
 */
export async function generateSquadSuggestion(
  params: GenerateSquadParams
): Promise<GenerateSquadResult> {
  const { gameweek, gameweekLabel, trigger, squad, bootstrap, fixtures, previousGameweekRecap } = params;

  const squadNames = squad.playerIds
    .map((id) => findPlayer(bootstrap, id)?.web_name)
    .filter((n): n is string => !!n);
  const watchlistNames = (squad.watchlistPlayerIds ?? [])
    .map((id) => findPlayer(bootstrap, id)?.web_name)
    .filter((n): n is string => !!n);

  const research = await researchCurrentNews({
    squadPlayerNames: squadNames,
    watchlistPlayerNames: watchlistNames,
    gameweekLabel,
  });

  const squadLines = squad.playerIds
    .map((id) => playerLine(bootstrap, fixtures, gameweek, id))
    .join("\n");

  const watchlistLines = (squad.watchlistPlayerIds ?? [])
    .map((id) => playerLine(bootstrap, fixtures, gameweek, id))
    .join("\n");

  const triggerContext: Record<SnapshotTrigger, string> = {
    draft: "This is the first draft for the gameweek, generated as soon as it opened for transfers.",
    refresh: "The manager just asked for a fresh look — re-run the analysis with the latest data and news.",
    lock: "This is the FINAL suggestion, being locked in automatically 2 hours before the deadline. Use the freshest data available; there will be no further review before the deadline.",
  };

  const response = await anthropic.messages.parse({
    model: AI_MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(squadSuggestionSchema) },
    messages: [
      {
        role: "user",
        content: [
          `## ${gameweekLabel} — ${triggerContext[trigger]}`,
          "",
          "### Current 15-man squad",
          squadLines,
          "",
          `Bank: ${squad.bank.toFixed(1)}m — Free transfers available: ${squad.freeTransfers}`,
          squad.activeChip ? `Chip currently active this gameweek: ${squad.activeChip}` : "No chip currently played this gameweek.",
          squad.chipsUsedThisSeason.length
            ? `Chips already used this season: ${squad.chipsUsedThisSeason.join(", ")}`
            : "No chips used yet this season.",
          "",
          watchlistLines ? `### Watchlist (players I'm tracking as transfer targets)\n${watchlistLines}` : "",
          "",
          "### Web research on current news (injuries, rotation, press conferences, lineup rumors)",
          research.findings || "No notable news surfaced by search.",
          "",
          previousGameweekRecap ? `### How last gameweek actually went\n${previousGameweekRecap}` : "",
          "",
          "Give me your starting XI, bench order, captain and vice-captain, formation, predicted total points, " +
            "any transfers you'd make (respecting free transfers — extra transfers cost 4 points each unless a " +
            "chip is active), whether to consider a chip this week, and news items worth flagging. Weigh fixtures " +
            "3-5 gameweeks ahead for any transfer, not just the next match.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Claude did not return a parseable squad suggestion");
  }

  return {
    suggestion: response.parsed_output,
    usage: {
      researchInputTokens: 0, // captured separately if needed later
      researchOutputTokens: 0,
      webSearchCount: research.webSearchCount,
      squadInputTokens: response.usage.input_tokens,
      squadOutputTokens: response.usage.output_tokens,
    },
  };
}

const SYSTEM_PROMPT = `You are a Fantasy Premier League analyst with two decades of experience following the \
Premier League and the FPL game specifically — the kind of pundit whose gameweek preview a manager reads \
before making any transfer. You write with the confidence of someone who has watched thousands of matches \
and knows the difference between a genuine rotation risk and a manager's throwaway press-conference line.

When you pick a squad, weigh: official FPL data (price, ownership, form, points-per-game, fixture difficulty, \
minutes), the FPL API's own status/news/chance-of-playing fields, and — most importantly — the web research \
findings you're given, which cover what the structured data can't: rotation risk, tactical setup, new-signing \
integration, and manager quotes. Consider fixture swings 3-5 gameweeks out for any transfer, not just the next \
match — a transfer that looks good for one gameweek but walks into a brutal run afterward is a bad transfer. \
Respect the free-transfer count given; extra transfers cost 4 points each, so only recommend a hit when the \
points upside clearly justifies it. Only recommend a chip when it is clearly favorable this gameweek, not just \
technically available — chip suggestions are surfaced to the manager for confirmation, never auto-applied.

Write the rationale summary the way a pundit writes a gameweek column: state the headline decisions and why, \
in plain confident prose, not a bullet-pointed stats dump. Reference specific news when it drove a decision \
(e.g. "...after his manager confirmed a knock in Friday's press conference").`;
