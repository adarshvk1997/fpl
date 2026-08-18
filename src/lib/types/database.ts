// Minimal hand-written types matching supabase/migrations/0001_init.sql.
// Once the project is linked to a real Supabase instance, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/types/database.ts
// This hand-written version is enough to develop against until then.

export type ChipName = "wildcard" | "free_hit" | "bench_boost" | "triple_captain";
export type SnapshotTrigger = "draft" | "refresh" | "lock";
export type TransferStatus = "suggested" | "applied" | "ignored";
export type NewsCategory =
  | "injury"
  | "suspension"
  | "rotation"
  | "press_conference"
  | "lineup"
  | "transfer"
  | "other";
export type NewsRelevance = "my_squad" | "watchlist";

// NOTE: these are `type` aliases (object type literals), not `interface`s.
// TypeScript treats interfaces as "open" (augmentable via declaration
// merging), so they don't structurally satisfy index-signature checks like
// `Record<string, unknown>` even when every property matches — and
// @supabase/postgrest-js's GenericTable constraint requires exactly that.
// An interface here silently collapses every `.from(...)` call's inferred
// type to `never` instead of raising a visible error, so plain `type` is
// required, not just a style preference.

export type SquadSlot = {
  player_id: number;
  position: "GKP" | "DEF" | "MID" | "FWD";
  predicted_points?: number;
};

export type AppSettingsRow = {
  id: true;
  fpl_team_id: number | null;
  manual_squad_player_ids: number[] | null;
  bank_balance: number | null;
  free_transfers: number;
  active_chip: ChipName | null;
  chips_used: { chip: ChipName; gameweek: number; used_at: string }[];
  watchlist_player_ids: number[];
  notify_email: boolean;
  onboarded_at: string | null;
  updated_at: string;
};

export type SquadSnapshotRow = {
  id: string;
  gameweek: number;
  trigger_type: SnapshotTrigger;
  starting_xi: SquadSlot[];
  bench: SquadSlot[];
  captain_id: number;
  vice_captain_id: number;
  formation: string;
  predicted_points: number | null;
  chip_recommended: ChipName | null;
  rationale_summary: string;
  bank_balance: number | null;
  free_transfers: number | null;
  is_locked: boolean;
  raw_ai_response: unknown;
  created_at: string;
};

export type TransferSuggestionRow = {
  id: string;
  snapshot_id: string;
  player_out_id: number;
  player_in_id: number;
  points_hit: number;
  rationale: string;
  status: TransferStatus;
  created_at: string;
};

export type NewsItemRow = {
  id: string;
  gameweek: number | null;
  player_id: number | null;
  player_name: string | null;
  category: NewsCategory;
  headline: string;
  summary: string;
  source_url: string | null;
  relevance: NewsRelevance;
  published_at: string | null;
  created_at: string;
};

export type GameweekResultRow = {
  id: string;
  gameweek: number;
  locked_snapshot_id: string | null;
  actual_points: number | null;
  actual_starting_xi: unknown;
  post_mortem: string | null;
  created_at: string;
};

export type WatchlistPlayerRow = {
  id: string;
  fpl_player_id: number;
  player_name: string | null;
  added_at: string;
};

export type GenerationRunRow = {
  id: string;
  gameweek: number;
  trigger_type: SnapshotTrigger;
  status: "running" | "succeeded" | "failed";
  input_tokens: number | null;
  output_tokens: number | null;
  web_search_count: number | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

// Supabase-JS generic Database shape (subset needed for typed .from() calls).
// Every table entry needs Relationships (even empty) and the schema needs
// Views/Functions (even empty) — @supabase/postgrest-js's GenericTable /
// GenericSchema constraints require them, and omitting them silently
// collapses every .from(...) call's inferred type to `never` instead of
// erroring where you'd notice.
export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: AppSettingsRow;
        Insert: Partial<AppSettingsRow>;
        Update: Partial<AppSettingsRow>;
        Relationships: [];
      };
      squad_snapshots: {
        Row: SquadSnapshotRow;
        Insert: Omit<SquadSnapshotRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<SquadSnapshotRow>;
        Relationships: [];
      };
      transfer_suggestions: {
        Row: TransferSuggestionRow;
        Insert: Omit<TransferSuggestionRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<TransferSuggestionRow>;
        Relationships: [];
      };
      news_items: {
        Row: NewsItemRow;
        Insert: Omit<NewsItemRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<NewsItemRow>;
        Relationships: [];
      };
      gameweek_results: {
        Row: GameweekResultRow;
        Insert: Omit<GameweekResultRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<GameweekResultRow>;
        Relationships: [];
      };
      watchlist_players: {
        Row: WatchlistPlayerRow;
        Insert: Omit<WatchlistPlayerRow, "id" | "added_at"> & { id?: string; added_at?: string };
        Update: Partial<WatchlistPlayerRow>;
        Relationships: [];
      };
      generation_runs: {
        Row: GenerationRunRow;
        Insert: Omit<GenerationRunRow, "id" | "started_at"> & { id?: string; started_at?: string };
        Update: Partial<GenerationRunRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
