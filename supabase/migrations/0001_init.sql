-- FPL AI Advisor — initial schema
-- This app is single-user. Auth is Supabase magic-link, gated at the application
-- layer to one allowed email (ALLOWED_USER_EMAIL). RLS below simply requires
-- "any authenticated user" rather than modeling multi-tenant ownership, since
-- there is only ever one legitimate signed-in user.

-- ---------------------------------------------------------------------------
-- app_settings: single-row table holding the user's FPL context.
-- ---------------------------------------------------------------------------
create table if not exists app_settings (
  id                boolean primary key default true,      -- singleton row trick
  fpl_team_id       integer,                                 -- set when onboarded via team ID
  manual_squad_player_ids integer[],                         -- set when onboarded via manual 15-player entry (fpl_team_id null)
  bank_balance      numeric(4,1),                            -- in £m, e.g. 1.5 — authoritative when manual_squad_player_ids is set
  free_transfers    integer default 1,
  active_chip       text check (active_chip in ('wildcard','free_hit','bench_boost','triple_captain')),
  chips_used        jsonb default '[]'::jsonb,                -- history: [{chip, gameweek, used_at}]
  watchlist_player_ids integer[] default '{}',
  notify_email      boolean default false,
  onboarded_at      timestamptz,
  updated_at        timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);

-- ---------------------------------------------------------------------------
-- squad_snapshots: one row per (gameweek, trigger) — the AI's suggested squad.
-- trigger_type distinguishes the gameweek-open draft, an on-demand manual
-- refresh, and the automatic T-2h lock. The dashboard always reads the most
-- recent snapshot for the current gameweek; the T-2h "lock" snapshot is the
-- permanent record used for gameweek-history comparisons.
-- ---------------------------------------------------------------------------
create table if not exists squad_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  gameweek           integer not null,
  trigger_type       text not null check (trigger_type in ('draft','refresh','lock')),
  starting_xi        jsonb not null,     -- [{player_id, position, predicted_points}, ...] (11)
  bench              jsonb not null,     -- ordered [{player_id, position}, ...] (4), bench[0] first sub
  captain_id         integer not null,
  vice_captain_id    integer not null,
  formation          text not null,      -- e.g. "3-4-3"
  predicted_points   numeric(5,1),
  chip_recommended   text check (chip_recommended in ('wildcard','free_hit','bench_boost','triple_captain')),
  rationale_summary  text not null,      -- pundit-style overview for the dashboard
  bank_balance       numeric(4,1),
  free_transfers     integer,
  is_locked          boolean not null default false,   -- true once this is the T-2h final record
  raw_ai_response    jsonb,              -- full model output, kept for debugging/audit
  created_at         timestamptz not null default now()
);
create index if not exists idx_squad_snapshots_gw on squad_snapshots (gameweek, trigger_type, created_at desc);

-- ---------------------------------------------------------------------------
-- transfer_suggestions: individual in/out recommendations tied to a snapshot.
-- ---------------------------------------------------------------------------
create table if not exists transfer_suggestions (
  id                uuid primary key default gen_random_uuid(),
  snapshot_id       uuid not null references squad_snapshots(id) on delete cascade,
  player_out_id     integer not null,
  player_in_id      integer not null,
  points_hit        integer not null default 0,   -- 0 if within free transfers, else 4/8/...
  rationale         text not null,
  status            text not null default 'suggested' check (status in ('suggested','applied','ignored')),
  created_at        timestamptz not null default now()
);
create index if not exists idx_transfer_suggestions_snapshot on transfer_suggestions (snapshot_id);

-- ---------------------------------------------------------------------------
-- news_items: AI-curated news feed entries, tied to specific players.
-- ---------------------------------------------------------------------------
create table if not exists news_items (
  id                uuid primary key default gen_random_uuid(),
  gameweek          integer,
  player_id         integer,
  player_name       text,
  category          text not null check (category in ('injury','suspension','rotation','press_conference','lineup','transfer','other')),
  headline          text not null,
  summary           text not null,
  source_url        text,
  relevance         text not null check (relevance in ('my_squad','watchlist')),
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists idx_news_items_gw on news_items (gameweek, created_at desc);
create index if not exists idx_news_items_player on news_items (player_id);

-- ---------------------------------------------------------------------------
-- gameweek_results: post-mortem once a gameweek's matches are complete.
-- ---------------------------------------------------------------------------
create table if not exists gameweek_results (
  id                uuid primary key default gen_random_uuid(),
  gameweek          integer not null unique,
  locked_snapshot_id uuid references squad_snapshots(id),
  actual_points     integer,
  actual_starting_xi jsonb,     -- what was actually recorded as played, with per-player points
  post_mortem       text,       -- "what worked, what didn't, what the AI would change"
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- watchlist_players: players tracked for news beyond the current 15-man squad.
-- ---------------------------------------------------------------------------
create table if not exists watchlist_players (
  id                uuid primary key default gen_random_uuid(),
  fpl_player_id     integer not null unique,
  player_name       text,
  added_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- generation_runs: audit log of AI generation jobs (for cost/debug visibility).
-- ---------------------------------------------------------------------------
create table if not exists generation_runs (
  id                uuid primary key default gen_random_uuid(),
  gameweek          integer not null,
  trigger_type      text not null check (trigger_type in ('draft','refresh','lock')),
  status            text not null default 'running' check (status in ('running','succeeded','failed')),
  input_tokens      integer,
  output_tokens     integer,
  web_search_count  integer,
  error_message     text,
  started_at        timestamptz not null default now(),
  finished_at       timestamptz
);

-- ---------------------------------------------------------------------------
-- Row Level Security — single-user app: any authenticated session may read/write.
-- The real access boundary is the magic-link email allowlist at the app layer.
-- ---------------------------------------------------------------------------
alter table app_settings enable row level security;
alter table squad_snapshots enable row level security;
alter table transfer_suggestions enable row level security;
alter table news_items enable row level security;
alter table gameweek_results enable row level security;
alter table watchlist_players enable row level security;
alter table generation_runs enable row level security;

create policy "authenticated full access" on app_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on squad_snapshots for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on transfer_suggestions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on news_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on gameweek_results for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on watchlist_players for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on generation_runs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Seed the singleton settings row so the app can always update-in-place.
insert into app_settings (id) values (true) on conflict (id) do nothing;
