import "server-only";
import { anthropic, AI_MODEL } from "./client";
import type { FplBootstrapStatic } from "@/lib/fpl/types";
import { findPlayer } from "@/lib/fpl/analysis";
import type { SquadSlot } from "@/lib/types/database";

export interface PostMortemInput {
  gameweekLabel: string;
  rationaleGivenAtTheTime: string;
  startingXi: SquadSlot[];
  bench: SquadSlot[];
  captainId: number;
  viceCaptainId: number;
  actualPointsByPlayer: Record<number, number>; // player_id -> points scored this GW
  totalPoints: number;
  bootstrap: FplBootstrapStatic;
}

/** Generates the "Last Gameweek Review" write-up: what worked, what didn't,
 *  what the AI would change. One short Claude call, plain text — no tools,
 *  no structured output needed since this is narrative-only. */
export async function generatePostMortem(input: PostMortemInput): Promise<string> {
  const lines = [...input.startingXi, ...input.bench].map((slot) => {
    const p = findPlayer(input.bootstrap, slot.player_id);
    const name = p?.web_name ?? `#${slot.player_id}`;
    const pts = input.actualPointsByPlayer[slot.player_id] ?? 0;
    const isCaptain = slot.player_id === input.captainId ? " (C)" : "";
    const isVice = slot.player_id === input.viceCaptainId ? " (VC)" : "";
    const benched = input.bench.some((b) => b.player_id === slot.player_id) ? " [benched]" : "";
    return `${name}${isCaptain}${isVice}${benched}: ${pts} pts`;
  });

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system:
      "You are an FPL pundit reviewing how last gameweek's suggested squad actually performed. Be honest " +
      "and specific: name the picks that paid off, the ones that didn't, and what you'd do differently with " +
      "hindsight. 3-5 sentences, confident pundit tone, no bullet-point stats dump.",
    messages: [
      {
        role: "user",
        content:
          `${input.gameweekLabel} result: ${input.totalPoints} points.\n\n` +
          `What was suggested and why:\n${input.rationaleGivenAtTheTime}\n\n` +
          `How each player actually scored:\n${lines.join("\n")}`,
      },
    ],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");
}
