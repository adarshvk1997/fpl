import "server-only";
import type { FplBootstrapStatic } from "./types";
import { findPlayer, formatCost } from "./analysis";
import type { SquadSlot } from "@/lib/types/database";

export interface DisplayPlayer {
  id: number;
  name: string;
  team: string;
  position: SquadSlot["position"];
  cost: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export function toDisplaySquad(
  bootstrap: FplBootstrapStatic,
  slots: SquadSlot[],
  captainId: number,
  viceCaptainId: number
): DisplayPlayer[] {
  return slots.map((slot) => {
    const p = findPlayer(bootstrap, slot.player_id);
    const team = p ? bootstrap.teams.find((t) => t.id === p.team) : undefined;
    return {
      id: slot.player_id,
      name: p?.web_name ?? `#${slot.player_id}`,
      team: team?.short_name ?? "?",
      position: slot.position,
      cost: p ? formatCost(p.now_cost) : "—",
      isCaptain: slot.player_id === captainId,
      isViceCaptain: slot.player_id === viceCaptainId,
    };
  });
}
