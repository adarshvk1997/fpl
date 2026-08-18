"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ChipName } from "@/lib/types/database";

/** The AI can only *suggest* a chip — this is the explicit confirmation step
 *  the spec calls for ("let me confirm before it's used"). Confirming here
 *  just records it in this app's own history; you still have to actually
 *  play the chip yourself on the official FPL site. */
export async function confirmChip(chip: ChipName, gameweek: number) {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("app_settings").select("chips_used").single();
  const chipsUsed = settings?.chips_used ?? [];

  const { error } = await supabase
    .from("app_settings")
    .update({
      active_chip: chip,
      chips_used: [...chipsUsed, { chip, gameweek, used_at: new Date().toISOString() }],
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
