import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, AI_MODEL } from "./client";

/**
 * Web search pass: fills in the gaps the FPL API's own status/news fields
 * can't cover — rotation risk, press-conference quotes, tactical changes,
 * new-signing minutes, and anything that hasn't hit FPL's own flags yet.
 * Deliberately scoped to a handful of targeted queries (max_uses) to keep
 * token/tool-call spend predictable, per a few generations a gameweek.
 *
 * Returns free-text findings (with the model's own citations woven in) that
 * get fed as context into the structured squad-generation call — kept
 * separate from that call so a strict JSON schema request never has to also
 * manage a multi-turn tool loop.
 */
export async function researchCurrentNews(params: {
  squadPlayerNames: string[];
  watchlistPlayerNames: string[];
  gameweekLabel: string;
}): Promise<{ findings: string; webSearchCount: number }> {
  const { squadPlayerNames, watchlistPlayerNames, gameweekLabel } = params;

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system:
      "You are researching the latest Premier League team news ahead of a Fantasy Premier League " +
      "gameweek deadline. You have web search available. Use it efficiently — a handful of targeted " +
      "queries, not one per player. Prioritize: injuries and fitness doubts not yet public knowledge, " +
      "manager press-conference quotes on team selection, confirmed or rumored lineup changes, and " +
      "rotation risk from fixture congestion (cup replays, European away trips). Ignore players with " +
      "no notable news. Cite what you find plainly (source and rough date) so a downstream summary can " +
      "use it.",
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
    messages: [
      {
        role: "user",
        content:
          `Ahead of ${gameweekLabel}, find current team news relevant to these players.\n\n` +
          `My squad: ${squadPlayerNames.join(", ")}\n\n` +
          `Watchlist (players I'm considering transferring in): ${
            watchlistPlayerNames.length ? watchlistPlayerNames.join(", ") : "none specified"
          }\n\n` +
          "For each player with genuinely notable news, give a short dated note. Skip players with " +
          "nothing new to report.",
      },
    ],
  });

  const findings = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n");

  const webSearchCount = response.content.filter((b) => b.type === "server_tool_use").length;

  return { findings, webSearchCount };
}
