"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntry, getEntryEventPicks, getCurrentOrNextEvent } from "@/lib/fpl/client";
import { runGeneration } from "@/lib/orchestration/runGeneration";

export interface OnboardResult {
  ok: boolean;
  message: string;
}

/** Path 1: paste an FPL team ID — pull the real squad via the public API. */
export async function onboardWithTeamId(formData: FormData): Promise<OnboardResult> {
  const teamId = Number(formData.get("teamId"));
  if (!teamId || !Number.isInteger(teamId) || teamId <= 0) {
    return { ok: false, message: "Enter a valid numeric FPL team ID." };
  }

  const supabase = await createClient();

  let bank = 0;
  const freeTransfers = 1;
  try {
    await getEntry(teamId); // validates the ID exists
    const event = await getCurrentOrNextEvent();
    const picks = await getEntryEventPicks(teamId, Math.max(1, event.id - 1)).catch(() =>
      getEntryEventPicks(teamId, event.id)
    );
    bank = picks.entry_history.bank / 10;
  } catch {
    return { ok: false, message: "Couldn't find that FPL team ID — double-check it and try again." };
  }

  const { error } = await supabase
    .from("app_settings")
    .update({
      fpl_team_id: teamId,
      manual_squad_player_ids: null,
      bank_balance: bank,
      free_transfers: freeTransfers,
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) {
    return { ok: false, message: `Saved failed: ${error.message}` };
  }

  await kickOffFirstGeneration(supabase);
  redirect("/dashboard");
}

/** Path 2: manually enter 15 players + bank balance (e.g. brand-new team, or
 *  prefer not to share a team ID). */
export async function onboardManually(formData: FormData): Promise<OnboardResult> {
  const playerIdsRaw = formData.get("playerIds");
  const bankRaw = formData.get("bank");

  let playerIds: number[];
  try {
    playerIds = JSON.parse(String(playerIdsRaw ?? "[]"));
  } catch {
    return { ok: false, message: "Invalid player selection." };
  }
  if (!Array.isArray(playerIds) || playerIds.length !== 15) {
    return { ok: false, message: `Select exactly 15 players (got ${playerIds?.length ?? 0}).` };
  }

  const bank = Number(bankRaw);
  if (Number.isNaN(bank) || bank < 0) {
    return { ok: false, message: "Enter a valid bank balance (e.g. 1.5)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      fpl_team_id: null,
      manual_squad_player_ids: playerIds,
      bank_balance: bank,
      free_transfers: 1,
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) {
    return { ok: false, message: `Save failed: ${error.message}` };
  }

  await kickOffFirstGeneration(supabase);
  redirect("/dashboard");
}

async function kickOffFirstGeneration(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    await runGeneration(supabase, "draft");
  } catch (err) {
    // Don't block onboarding on generation failure — the dashboard's
    // refresh button (or the next cron tick) can retry. Surface via logs.
    console.error("[onboarding] initial generation failed:", err);
  }
}
