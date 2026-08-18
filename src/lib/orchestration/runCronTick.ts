import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEvents, getBootstrapStatic, getEventLive } from "@/lib/fpl/client";
import { getEventsEnteringLockWindow } from "@/lib/fpl/deadlines";
import { runGeneration } from "./runGeneration";
import { generatePostMortem } from "@/lib/ai/postMortem";
import type { Database } from "@/lib/types/database";

export interface CronTickSummary {
  draftsGenerated: number[];
  locksGenerated: number[];
  postMortemsGenerated: number[];
  errors: string[];
}

/**
 * Called on a schedule (every 15-30 min via GitHub Actions). All timing is
 * derived from the FPL API's own `deadline_time` / `finished` / `data_checked`
 * flags — nothing here hardcodes a day-of-week or kickoff schedule.
 *
 * Three independent checks per run, each idempotent (guarded by a DB lookup
 * before ever calling Claude), so a tick that fires slightly early/late or
 * twice in a row never double-generates:
 *   1. A gameweek just opened and has no "draft" snapshot yet -> generate one.
 *   2. A gameweek has entered its T-2h window and has no "lock" snapshot yet
 *      -> generate + mark final.
 *   3. A gameweek finished and is fully data-checked but has no post-mortem
 *      yet -> score the locked squad against actual results and write the
 *      review (the next gameweek's draft is picked up by check 1 on the
 *      following tick, once FPL flips `is_next`).
 */
export async function runCronTick(supabase: SupabaseClient<Database>): Promise<CronTickSummary> {
  const summary: CronTickSummary = {
    draftsGenerated: [],
    locksGenerated: [],
    postMortemsGenerated: [],
    errors: [],
  };

  const { data: settings } = await supabase.from("app_settings").select("*").single();
  if (!settings || (!settings.fpl_team_id && !settings.manual_squad_player_ids?.length)) {
    // Nothing to do until onboarding is complete.
    return summary;
  }

  const events = await getEvents();

  // --- 1. Gameweek-open drafts ---------------------------------------------
  const openEvent = events.find((e) => e.is_next || e.is_current);
  if (openEvent) {
    const { data: existingDraft } = await supabase
      .from("squad_snapshots")
      .select("id")
      .eq("gameweek", openEvent.id)
      .eq("trigger_type", "draft")
      .limit(1);
    if (!existingDraft?.length) {
      try {
        await runGeneration(supabase, "draft");
        summary.draftsGenerated.push(openEvent.id);
      } catch (err) {
        summary.errors.push(`draft GW${openEvent.id}: ${errMsg(err)}`);
      }
    }
  }

  // --- 2. T-2h locks ---------------------------------------------------------
  const lockCandidates = await getEventsEnteringLockWindow();
  for (const event of lockCandidates) {
    const { data: existingLock } = await supabase
      .from("squad_snapshots")
      .select("id")
      .eq("gameweek", event.id)
      .eq("trigger_type", "lock")
      .limit(1);
    if (!existingLock?.length) {
      try {
        await runGeneration(supabase, "lock");
        summary.locksGenerated.push(event.id);
      } catch (err) {
        summary.errors.push(`lock GW${event.id}: ${errMsg(err)}`);
      }
    }
  }

  // --- 3. Post-mortems for finished gameweeks --------------------------------
  const finishedEvents = events.filter((e) => e.finished && e.data_checked);
  for (const event of finishedEvents) {
    const { data: existingResult } = await supabase
      .from("gameweek_results")
      .select("id")
      .eq("gameweek", event.id)
      .limit(1);
    if (existingResult?.length) continue;

    const { data: lockedSnapshot } = await supabase
      .from("squad_snapshots")
      .select("*")
      .eq("gameweek", event.id)
      .eq("trigger_type", "lock")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lockedSnapshot) continue; // nothing was ever locked for this GW (e.g. app installed mid-season)

    try {
      const [bootstrap, live] = await Promise.all([getBootstrapStatic(), getEventLive(event.id)]);
      const pointsByPlayer: Record<number, number> = {};
      for (const el of live.elements) pointsByPlayer[el.id] = el.stats.total_points;

      // starting_xi/bench are already typed as SquadSlot[] on SquadSnapshotRow —
      // no cast needed, the DB row type covers the jsonb shape directly.
      const startingXi = lockedSnapshot.starting_xi;
      const bench = lockedSnapshot.bench;
      // Approximation for the review narrative only — this does not reproduce
      // official FPL scoring (bonus-point timing, autosubs, or the
      // captain-blanked-so-armband-passes-to-VC rule). It doubles whichever
      // of captain/VC actually has points recorded, which is close enough for
      // "here's roughly how the week went" without needing full live-service
      // simulation.
      const captainPoints = pointsByPlayer[lockedSnapshot.captain_id] ?? 0;
      const viceCaptainPoints = pointsByPlayer[lockedSnapshot.vice_captain_id] ?? 0;
      const captainBonus = captainPoints > 0 ? captainPoints : viceCaptainPoints;
      const totalPoints =
        startingXi.reduce((sum, s) => sum + (pointsByPlayer[s.player_id] ?? 0), 0) + captainBonus;

      const postMortem = await generatePostMortem({
        gameweekLabel: event.name,
        rationaleGivenAtTheTime: lockedSnapshot.rationale_summary,
        startingXi,
        bench,
        captainId: lockedSnapshot.captain_id,
        viceCaptainId: lockedSnapshot.vice_captain_id,
        actualPointsByPlayer: pointsByPlayer,
        totalPoints,
        bootstrap,
      });

      await supabase.from("gameweek_results").insert({
        gameweek: event.id,
        locked_snapshot_id: lockedSnapshot.id,
        actual_points: totalPoints,
        actual_starting_xi: startingXi.map((s) => ({ ...s, points: pointsByPlayer[s.player_id] ?? 0 })),
        post_mortem: postMortem,
      });
      summary.postMortemsGenerated.push(event.id);
    } catch (err) {
      summary.errors.push(`post-mortem GW${event.id}: ${errMsg(err)}`);
    }
  }

  return summary;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
