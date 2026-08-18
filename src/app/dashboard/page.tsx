import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBootstrapStatic, getCurrentOrNextEvent } from "@/lib/fpl/client";
import { toDisplaySquad } from "@/lib/fpl/display";
import type { SquadSlot } from "@/lib/types/database";
import AppShell from "@/components/AppShell";
import SquadView from "@/components/SquadView";
import RefreshButton from "@/components/RefreshButton";
import ChipSuggestion from "@/components/ChipSuggestion";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase.from("app_settings").select("*").single();
  if (!settings?.onboarded_at) {
    redirect("/onboarding");
  }

  const event = await getCurrentOrNextEvent();

  const { data: snapshot } = await supabase
    .from("squad_snapshots")
    .select("*")
    .eq("gameweek", event.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: lastResult } = await supabase
    .from("gameweek_results")
    .select("*")
    .order("gameweek", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <AppShell deadlineIso={event.deadline_time} gameweekLabel={event.name}>
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{event.name}</h1>
            {snapshot ? (
              <p className="mt-1 text-xs text-neutral-500">
                {snapshotStatusLabel(snapshot.trigger_type, snapshot.is_locked)} · generated{" "}
                {new Date(snapshot.created_at).toLocaleString()}
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-400">
                No suggestion generated yet for this gameweek — hit refresh to run one now.
              </p>
            )}
          </div>
          <RefreshButton />
        </div>

        {snapshot && (
          <>
            <section className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
              <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-sm text-neutral-400">
                  Predicted points: <span className="font-semibold text-white">{snapshot.predicted_points ?? "—"}</span>
                </span>
                {snapshot.chip_recommended && (
                  <ChipSuggestion
                    chip={snapshot.chip_recommended}
                    gameweek={event.id}
                    alreadyActive={settings.active_chip === snapshot.chip_recommended}
                  />
                )}
              </div>
              <p className="text-sm leading-relaxed text-neutral-200">{snapshot.rationale_summary}</p>
            </section>

            <SquadSection
              gameweek={event.id}
              startingXi={snapshot.starting_xi as SquadSlot[]}
              bench={snapshot.bench as SquadSlot[]}
              captainId={snapshot.captain_id}
              viceCaptainId={snapshot.vice_captain_id}
              formation={snapshot.formation}
            />
          </>
        )}

        {lastResult && (
          <section className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-300">
              Last Gameweek Review — GW{lastResult.gameweek} ({lastResult.actual_points ?? "—"} pts)
            </h2>
            <p className="text-sm leading-relaxed text-neutral-300">{lastResult.post_mortem}</p>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function snapshotStatusLabel(trigger: string, isLocked: boolean): string {
  if (isLocked) return "Final (locked 2h before deadline)";
  if (trigger === "draft") return "Draft";
  return "Refreshed";
}

async function SquadSection({
  startingXi,
  bench,
  captainId,
  viceCaptainId,
  formation,
}: {
  gameweek: number;
  startingXi: SquadSlot[];
  bench: SquadSlot[];
  captainId: number;
  viceCaptainId: number;
  formation: string;
}) {
  const bootstrap = await getBootstrapStatic();
  const displayXi = toDisplaySquad(bootstrap, startingXi, captainId, viceCaptainId);
  const displayBench = toDisplaySquad(bootstrap, bench, captainId, viceCaptainId);
  return <SquadView startingXi={displayXi} bench={displayBench} formation={formation} />;
}
