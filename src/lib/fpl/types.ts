// Shapes for the subset of the official FPL public API this app uses.
// https://fantasy.premierleague.com/api/... (no key required, unofficial but
// widely relied upon and stable in practice).

export interface FplEvent {
  id: number;
  name: string; // "Gameweek 5"
  deadline_time: string; // ISO 8601
  finished: boolean;
  data_checked: boolean; // true once official stats are finalized
  is_current: boolean;
  is_next: boolean;
  is_previous: boolean;
  average_entry_score: number;
  highest_score: number | null;
}

export interface FplTeam {
  id: number;
  name: string;
  short_name: string;
  strength: number;
}

export interface FplPlayer {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number; // FplTeam.id
  element_type: 1 | 2 | 3 | 4; // 1=GKP 2=DEF 3=MID 4=FWD
  now_cost: number; // tenths of £m, e.g. 105 = £10.5m
  total_points: number;
  event_points: number;
  points_per_game: string;
  selected_by_percent: string;
  form: string;
  minutes: number;
  status: "a" | "d" | "i" | "n" | "s" | "u"; // available/doubtful/injured/not-in-squad/suspended/unavailable
  news: string;
  news_added: string | null;
  chance_of_playing_this_round: number | null; // 0-100 or null if fit
  chance_of_playing_next_round: number | null;
}

export interface FplBootstrapStatic {
  events: FplEvent[];
  teams: FplTeam[];
  elements: FplPlayer[];
  element_types: { id: number; singular_name_short: string }[];
}

export interface FplFixture {
  id: number;
  event: number | null; // gameweek
  team_h: number;
  team_a: number;
  team_h_difficulty: number; // 1 (easy) - 5 (hard)
  team_a_difficulty: number;
  kickoff_time: string | null;
  finished: boolean;
}

export interface FplPick {
  element: number; // player id
  position: number; // 1-15, 1-11 starting, 12-15 bench
  multiplier: number; // 0=benched, 1=starting, 2=captain, 3=triple captain
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FplEntryEventPicks {
  active_chip: string | null;
  picks: FplPick[];
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    bank: number; // tenths of £m
    value: number; // tenths of £m, squad value
    event_transfers: number;
    event_transfers_cost: number;
  };
}

export interface FplEntry {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  current_event: number;
  last_deadline_bank: number;
  last_deadline_value: number;
  last_deadline_total_transfers: number;
}

export interface FplLiveElementStats {
  minutes: number;
  total_points: number;
  goals_scored: number;
  assists: number;
  bonus: number;
}

export interface FplEventLive {
  elements: { id: number; stats: FplLiveElementStats }[];
}
