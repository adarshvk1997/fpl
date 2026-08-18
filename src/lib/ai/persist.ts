import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SnapshotTrigger } from "@/lib/types/database";
import type { SquadSuggestion } from "./squadSchema";

/** Writes one generation's output into squad_snapshots + transfer_suggestions
 *  + news_items. Shared by the manual-refresh route and the cron routes so
 *  the write shape never drifts between the two triggers. */
export async function persistSquadSuggestion(
  supabase: SupabaseClient<Database>,
  args: {
    gameweek: number;
    trigger: SnapshotTrigger;
    suggestion: SquadSuggestion;
    bank: number;
    freeTransfers: number;
    isLocked: boolean;
  }
): Promise<string> {
  const { gameweek, trigger, suggestion, bank, freeTransfers, isLocked } = args;

  const { data: snapshot, error: snapshotError } = await supabase
    .from("squad_snapshots")
    .insert({
      gameweek,
      trigger_type: trigger,
      starting_xi: suggestion.starting_xi,
      bench: suggestion.bench,
      captain_id: suggestion.captain_id,
      vice_captain_id: suggestion.vice_captain_id,
      formation: suggestion.formation,
      predicted_points: suggestion.predicted_points,
      chip_recommended: suggestion.chip_recommended,
      rationale_summary: suggestion.rationale_summary,
      bank_balance: bank,
      free_transfers: freeTransfers,
      is_locked: isLocked,
      raw_ai_response: suggestion,
    })
    .select("id")
    .single();

  if (snapshotError || !snapshot) {
    throw new Error(`Failed to save squad snapshot: ${snapshotError?.message}`);
  }

  if (suggestion.transfers.length > 0) {
    const { error: transfersError } = await supabase.from("transfer_suggestions").insert(
      suggestion.transfers.map((t) => ({
        snapshot_id: snapshot.id,
        player_out_id: t.player_out_id,
        player_in_id: t.player_in_id,
        points_hit: t.points_hit,
        rationale: t.rationale,
        status: "suggested" as const,
      }))
    );
    if (transfersError) {
      throw new Error(`Failed to save transfer suggestions: ${transfersError.message}`);
    }
  }

  if (suggestion.news_items.length > 0) {
    const { error: newsError } = await supabase.from("news_items").insert(
      suggestion.news_items.map((n) => ({
        gameweek,
        player_id: n.player_id,
        player_name: n.player_name,
        category: n.category,
        headline: n.headline,
        summary: n.summary,
        source_url: null,
        relevance: n.relevance,
        published_at: null,
      }))
    );
    if (newsError) {
      throw new Error(`Failed to save news items: ${newsError.message}`);
    }
  }

  return snapshot.id;
}
