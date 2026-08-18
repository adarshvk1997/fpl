"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TransferStatus } from "@/lib/types/database";

/** "Apply" / "Ignore" only update a local status flag for your own tracking
 *  — the app never touches your real FPL team. You still make the actual
 *  transfer yourself on the official FPL site if you agree with it. */
export async function setTransferStatus(id: string, status: TransferStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("transfer_suggestions").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/transfers");
}
