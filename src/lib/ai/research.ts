import "server-only";
import { genai, AI_MODEL } from "./client";

/**
 * Web search pass: fills in the gaps the FPL API's own status/news fields
 * can't cover — rotation risk, press-conference quotes, tactical changes,
 * new-signing minutes, and anything that hasn't hit FPL's own flags yet.
 * Uses Gemini's Google Search grounding tool — unlike Claude's web_search
 * tool, it has no explicit per-call use-count cap, so scoping search volume
 * relies on the prompt instruction below rather than a `max_uses` parameter.
 *
 * Returns free-text findings that get fed as context into the structured
 * squad-generation call — kept separate from that call so the strict JSON
 * schema request never has to also manage search-tool output.
 */
export async function researchCurrentNews(params: {
  squadPlayerNames: string[];
  watchlistPlayerNames: string[];
  gameweekLabel: string;
}): Promise<{ findings: string; webSearchCount: number }> {
  const { squadPlayerNames, watchlistPlayerNames, gameweekLabel } = params;

  const response = await genai.models.generateContent({
    model: AI_MODEL,
    config: {
      systemInstruction:
        "You are researching the latest Premier League team news ahead of a Fantasy Premier League " +
        "gameweek deadline. You have web search available. Use it efficiently — a handful of targeted " +
        "queries, not one per player. Prioritize: injuries and fitness doubts not yet public knowledge, " +
        "manager press-conference quotes on team selection, confirmed or rumored lineup changes, and " +
        "rotation risk from fixture congestion (cup replays, European away trips). Ignore players with " +
        "no notable news. Cite what you find plainly (source and rough date) so a downstream summary can " +
        "use it.",
      tools: [{ googleSearch: {} }],
    },
    contents:
      `Ahead of ${gameweekLabel}, find current team news relevant to these players.\n\n` +
      `My squad: ${squadPlayerNames.join(", ")}\n\n` +
      `Watchlist (players I'm considering transferring in): ${
        watchlistPlayerNames.length ? watchlistPlayerNames.join(", ") : "none specified"
      }\n\n` +
      "For each player with genuinely notable news, give a short dated note. Skip players with " +
      "nothing new to report.",
  });

  const findings = response.text ?? "";
  const webSearchCount = response.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length ?? 0;

  return { findings, webSearchCount };
}
