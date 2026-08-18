import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBootstrapStatic, getCurrentOrNextEvent } from "@/lib/fpl/client";
import { findPlayer } from "@/lib/fpl/analysis";
import AppShell from "@/components/AppShell";

export default async function HistoryPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase.from("app_settings").select("*").single();
  if (!settings?.onboarded_at) redirect("/onboarding");

  const event = await getCurrentOrNextEvent();

  const { data: results } = await supabase
    .from("gameweek_results")
    .select("*")
    .order("gameweek", { ascending: false });

  const bootstrap = await getBootstrapStatic();

  return (
    <AppShell deadlineIso={event.deadline_time} gameweekLabel={event.name}>
      <h1 className="mb-6 text-2xl font-semibold text-white">Gameweek history</h1>

      {!results?.length ? (
        <p className="text-sm text-neutral-400">
          No completed gameweeks yet — this fills in automatically once a gameweek finishes.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {results.map((r) => {
            const xi = (r.actual_starting_xi as { player_id: number; points: number }[] | null) ?? [];
            const sorted = [...xi].sort((a, b) => b.points - a.points);
            return (
              <details
                key={r.id}
                className="group rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <span className="font-medium text-neutral-100">Gameweek {r.gameweek}</span>
                  <span className="text-sm text-neutral-400">{r.actual_points ?? "—"} pts</span>
                </summary>
                <div className="mt-3 flex flex-col gap-3 border-t border-neutral-800 pt-3">
                  {r.post_mortem && (
                    <p className="text-sm leading-relaxed text-neutral-300">{r.post_mortem}</p>
                  )}
                  {sorted.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 text-xs text-neutral-400 sm:grid-cols-3">
                      {sorted.map((s) => (
                        <span key={s.player_id}>
                          {findPlayer(bootstrap, s.player_id)?.web_name ?? `#${s.player_id}`}: {s.points} pts
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
