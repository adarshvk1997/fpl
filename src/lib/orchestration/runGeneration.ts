import "server-only";
import { ApiError } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBootstrapStatic, getFixtures, getEntryEventPicks, getCurrentOrNextEvent } from "@/lib/fpl/client";
import { generateSquadSuggestion } from "@/lib/ai/generateSquad";
import { persistSquadSuggestion } from "@/lib/ai/persist";
import type { Database, SnapshotTrigger, AppSettingsRow } from "@/lib/types/database";

export interface RunGenerationResult {
  snapshotId: string;
  gameweek: number;
}

/**
 * End-to-end: load settings + current squad (from FPL if a team ID is on
 * file, else the manually-entered squad) + FPL reference data, call Gemini,
 * persist the result. This is the one function every trigger path — manual
 * refresh, the gameweek-open cron, and the T-2h lock cron — calls, so the
 * "only a handful of AI calls per gameweek" budget is enforced by callers
 * choosing when to invoke this, not by anything in here.
 */
export async function runGeneration(
  supabase: SupabaseClient<Database>,
  trigger: SnapshotTrigger
): Promise<RunGenerationResult> {
  const { data: settings, error: settingsError } = await supabase
    .from("app_settings")
    .select("*")
    .single();
  if (settingsError || !settings) {
    throw new Error(`No app settings found — has onboarding been completed? ${settingsError?.message ?? ""}`);
  }
  if (!settings.fpl_team_id && !settings.manual_squad_player_ids?.length) {
    throw new Error("Onboarding incomplete: no FPL team ID or manual squad on file.");
  }

  const [bootstrap, fixtures, event] = await Promise.all([
    getBootstrapStatic(),
    getFixtures(),
    getCurrentOrNextEvent(),
  ]);

  const { playerIds, bank, freeTransfers } = await resolveCurrentSquad(settings, event.id);

  const chipsUsedThisSeason = (settings.chips_used ?? []).map((c) => c.chip);

  let suggestion;
  try {
    ({ suggestion } = await generateSquadSuggestion({
      gameweek: event.id,
      gameweekLabel: event.name,
      trigger,
      squad: {
        playerIds,
        bank,
        freeTransfers,
        activeChip: settings.active_chip,
        chipsUsedThisSeason,
        watchlistPlayerIds: settings.watchlist_player_ids ?? [],
      },
      bootstrap,
      fixtures,
    }));
  } catch (err) {
    throw new Error(describeGeminiError(err), { cause: err });
  }

  const snapshotId = await persistSquadSuggestion(supabase, {
    gameweek: event.id,
    trigger,
    suggestion,
    bank,
    freeTransfers,
    isLocked: trigger === "lock",
  });

  return { snapshotId, gameweek: event.id };
}

/** Turns the Gemini SDK's raw error shapes into something a non-developer
 *  can act on, instead of the raw HTTP status + JSON body. Unlike the
 *  Anthropic SDK, @google/genai has one ApiError class (status: number)
 *  rather than a distinct subclass per status code, so branch on status. */
function describeGeminiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "AI generation failed: the Gemini API key in .env.local is missing or invalid. " +
        "Get a free key at aistudio.google.com/app/apikey (no billing account required) and set GEMINI_API_KEY.";
    }
    if (err.status === 429) {
      return "AI generation failed: rate-limited by Gemini — wait a bit and try again (this can happen on the free tier).";
    }
    return `AI generation failed: ${err.message}`;
  }
  return err instanceof Error ? err.message : "AI generation failed for an unknown reason.";
}

async function resolveCurrentSquad(
  settings: AppSettingsRow,
  gameweek: number
): Promise<{ playerIds: number[]; bank: number; freeTransfers: number }> {
  if (settings.fpl_team_id) {
    // Pull the manager's actual live squad from FPL — the real source of
    // truth, since the manager still makes real transfers on FPL.com
    // themselves (this app records suggestions, it doesn't submit them).
    // Fall back a gameweek if the current one has no picks published yet
    // (e.g. right after a new gameweek opens, before the manager rolls over).
    try {
      const picks = await getEntryEventPicks(settings.fpl_team_id, gameweek);
      return {
        playerIds: picks.picks.map((p) => p.element),
        bank: picks.entry_history.bank / 10,
        freeTransfers: settings.free_transfers ?? 1,
      };
    } catch {
      const picks = await getEntryEventPicks(settings.fpl_team_id, Math.max(1, gameweek - 1));
      return {
        playerIds: picks.picks.map((p) => p.element),
        bank: picks.entry_history.bank / 10,
        freeTransfers: settings.free_transfers ?? 1,
      };
    }
  }

  return {
    playerIds: settings.manual_squad_player_ids ?? [],
    bank: settings.bank_balance ?? 0,
    freeTransfers: settings.free_transfers ?? 1,
  };
}
