"use client";

import { useMemo, useState } from "react";
import type { NewsCategory, NewsItemRow, NewsRelevance } from "@/lib/types/database";

const CATEGORY_LABEL: Record<NewsCategory, string> = {
  injury: "Injury",
  suspension: "Suspension",
  rotation: "Rotation risk",
  press_conference: "Press conference",
  lineup: "Lineup news",
  transfer: "Transfer",
  other: "Other",
};

const CATEGORY_COLOR: Record<NewsCategory, string> = {
  injury: "bg-red-900/40 text-red-300",
  suspension: "bg-red-900/40 text-red-300",
  rotation: "bg-amber-900/40 text-amber-300",
  press_conference: "bg-sky-900/40 text-sky-300",
  lineup: "bg-violet-900/40 text-violet-300",
  transfer: "bg-emerald-900/40 text-emerald-300",
  other: "bg-neutral-800 text-neutral-300",
};

export default function NewsFeed({ items }: { items: NewsItemRow[] }) {
  const [filter, setFilter] = useState<NewsRelevance | "all">("all");

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.relevance === filter)),
    [items, filter]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(["all", "my_squad", "watchlist"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              filter === f ? "bg-emerald-600 text-white" : "bg-neutral-900 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {f === "all" ? "All" : f === "my_squad" ? "My squad" : "Watchlist"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-400">No news items yet — run a refresh to pull the latest.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((item) => (
            <li key={item.id} className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_COLOR[item.category]}`}>
                  {CATEGORY_LABEL[item.category]}
                </span>
                {item.player_name && (
                  <span className="text-sm font-medium text-neutral-200">{item.player_name}</span>
                )}
                <span className="ml-auto text-xs text-neutral-500">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm font-medium text-neutral-100">{item.headline}</p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-400">{item.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
