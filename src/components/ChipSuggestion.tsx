"use client";

import { useTransition } from "react";
import { confirmChip } from "@/app/dashboard/actions";
import type { ChipName } from "@/lib/types/database";

export default function ChipSuggestion({
  chip,
  gameweek,
  alreadyActive,
}: {
  chip: ChipName;
  gameweek: number;
  alreadyActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (alreadyActive) {
    return (
      <span className="rounded bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-300">
        {chip.replace("_", " ")} confirmed
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-amber-900/40 px-2 py-0.5 text-xs text-amber-300">
        Suggests: {chip.replace("_", " ")}
      </span>
      <button
        onClick={() => startTransition(() => confirmChip(chip, gameweek))}
        disabled={pending}
        className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300 transition hover:bg-neutral-700 disabled:opacity-50"
      >
        {pending ? "Confirming…" : "Confirm"}
      </button>
    </div>
  );
}
