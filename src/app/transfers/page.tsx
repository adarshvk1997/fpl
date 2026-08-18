import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBootstrapStatic, getCurrentOrNextEvent } from "@/lib/fpl/client";
import { findPlayer } from "@/lib/fpl/analysis";
import AppShell from "@/components/AppShell";
import TransferCard from "./TransferCard";

export default async function TransfersPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase.from("app_settings").select("*").single();
  if (!settings?.onboarded_at) redirect("/onboarding");

  const event = await getCurrentOrNextEvent();

  const { data: snapshot } = await supabase
    .from("squad_snapshots")
    .select("id")
    .eq("gameweek", event.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: transfers } = snapshot
    ? await supabase
        .from("transfer_suggestions")
        .select("*")
        .eq("snapshot_id", snapshot.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const bootstrap = await getBootstrapStatic();

  return (
    <AppShell deadlineIso={event.deadline_time} gameweekLabel={event.name}>
      <h1 className="mb-6 text-2xl font-semibold text-white">Transfers — {event.name}</h1>

      {!transfers?.length ? (
        <p className="text-sm text-neutral-400">
          No transfers suggested for this gameweek — the AI likes your current squad as-is.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {transfers.map((t) => (
            <TransferCard
              key={t.id}
              transfer={t}
              playerOutName={findPlayer(bootstrap, t.player_out_id)?.web_name ?? `#${t.player_out_id}`}
              playerInName={findPlayer(bootstrap, t.player_in_id)?.web_name ?? `#${t.player_in_id}`}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
