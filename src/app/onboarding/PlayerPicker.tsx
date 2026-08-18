"use client";

import { useMemo, useState } from "react";

export interface PickablePlayer {
  id: number;
  name: string;
  team: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  cost: string; // formatted, e.g. "£10.5m"
}

const REQUIRED_COUNT = 15;
const POSITION_QUOTA: Record<PickablePlayer["position"], number> = {
  GKP: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

export default function PlayerPicker({ players }: { players: PickablePlayer[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PickablePlayer[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return players
      .filter((p) => !selected.some((s) => s.id === p.id))
      .filter((p) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))
      .slice(0, 20);
  }, [query, players, selected]);

  const countByPosition = useMemo(() => {
    const counts: Record<PickablePlayer["position"], number> = { GKP: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const p of selected) counts[p.position]++;
    return counts;
  }, [selected]);

  function addPlayer(p: PickablePlayer) {
    if (selected.length >= REQUIRED_COUNT) return;
    setSelected((prev) => [...prev, p]);
    setQuery("");
  }

  function removePlayer(id: number) {
    setSelected((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="playerIds" value={JSON.stringify(selected.map((p) => p.id))} />

      <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
        {(Object.keys(POSITION_QUOTA) as (keyof typeof POSITION_QUOTA)[]).map((pos) => (
          <span
            key={pos}
            className={
              countByPosition[pos] === POSITION_QUOTA[pos]
                ? "rounded bg-emerald-900/50 px-2 py-1 text-emerald-300"
                : "rounded bg-neutral-800 px-2 py-1"
            }
          >
            {pos} {countByPosition[pos]}/{POSITION_QUOTA[pos]}
          </span>
        ))}
        <span className="rounded bg-neutral-800 px-2 py-1">
          Total {selected.length}/{REQUIRED_COUNT}
        </span>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a player to add…"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-emerald-500"
        />
        {filtered.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-neutral-700 bg-neutral-900 shadow-lg">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addPlayer(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-800"
                >
                  <span>
                    {p.name} <span className="text-neutral-500">({p.team})</span>
                  </span>
                  <span className="text-neutral-400">
                    {p.position} · {p.cost}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {selected.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-md bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
          >
            <span>
              {p.name} <span className="text-neutral-500">({p.team})</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-neutral-400">
                {p.position} · {p.cost}
              </span>
              <button
                type="button"
                onClick={() => removePlayer(p.id)}
                className="text-red-400 hover:text-red-300"
                aria-label={`Remove ${p.name}`}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
