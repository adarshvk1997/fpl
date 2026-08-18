"use client";

import { useTransition } from "react";
import { setTransferStatus } from "./actions";
import type { TransferSuggestionRow } from "@/lib/types/database";

export default function TransferCard({
  transfer,
  playerOutName,
  playerInName,
}: {
  transfer: TransferSuggestionRow;
  playerOutName: string;
  playerInName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-100">
          <span className="text-red-400">{playerOutName}</span>
          {" → "}
          <span className="text-emerald-400">{playerInName}</span>
        </span>
        {transfer.points_hit > 0 && (
          <span className="rounded bg-amber-900/40 px-2 py-0.5 text-xs text-amber-300">
            −{transfer.points_hit} pts
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-neutral-300">{transfer.rationale}</p>
      <div className="mt-1 flex items-center gap-2">
        <StatusButton
          label="Applied on FPL"
          active={transfer.status === "applied"}
          onClick={() => startTransition(() => setTransferStatus(transfer.id, "applied"))}
          disabled={pending}
          activeClass="bg-emerald-600 text-white"
        />
        <StatusButton
          label="Ignore"
          active={transfer.status === "ignored"}
          onClick={() => startTransition(() => setTransferStatus(transfer.id, "ignored"))}
          disabled={pending}
          activeClass="bg-neutral-700 text-white"
        />
        {transfer.status !== "suggested" && (
          <button
            onClick={() => startTransition(() => setTransferStatus(transfer.id, "suggested"))}
            disabled={pending}
            className="text-xs text-neutral-500 underline hover:text-neutral-300"
          >
            reset
          </button>
        )}
      </div>
    </div>
  );
}

function StatusButton({
  label,
  active,
  onClick,
  disabled,
  activeClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
        active ? activeClass : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
      }`}
    >
      {label}
    </button>
  );
}
