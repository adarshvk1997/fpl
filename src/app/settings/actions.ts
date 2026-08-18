"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEntry } from "@/lib/fpl/client";

export interface SettingsResult {
  ok: boolean;
  message: string;
}

export async function updateTeamId(formData: FormData): Promise<SettingsResult> {
  const teamId = Number(formData.get("teamId"));
  if (!teamId || !Number.isInteger(teamId) || teamId <= 0) {
    return { ok: false, message: "Enter a valid numeric FPL team ID." };
  }

  try {
    await getEntry(teamId);
  } catch {
    return { ok: false, message: "Couldn't find that FPL team ID." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ fpl_team_id: teamId, manual_squad_player_ids: null, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/settings");
  return { ok: true, message: "Team ID updated." };
}

export async function clearActiveChip(): Promise<SettingsResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ active_chip: null, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Active chip cleared." };
}

export async function setNotifyEmail(enabled: boolean): Promise<SettingsResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ notify_email: enabled, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/settings");
  return { ok: true, message: "Saved." };
}

export async function setFreeTransfers(formData: FormData): Promise<SettingsResult> {
  const value = Number(formData.get("freeTransfers"));
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    return { ok: false, message: "Enter a number between 0 and 5." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ free_transfers: value, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/settings");
  return { ok: true, message: "Saved." };
}
