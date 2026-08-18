"use client";

import { useState, useTransition } from "react";
import { onboardWithTeamId, onboardManually } from "./actions";
import PlayerPicker, { type PickablePlayer } from "./PlayerPicker";

export default function OnboardingForms({ players }: { players: PickablePlayer[] }) {
  const [mode, setMode] = useState<"team-id" | "manual">("team-id");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <div className="flex gap-2 rounded-lg bg-neutral-900 p-1">
        <button
          type="button"
          onClick={() => setMode("team-id")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            mode === "team-id" ? "bg-emerald-600 text-white" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          I have an FPL team ID
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            mode === "manual" ? "bg-emerald-600 text-white" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Enter my squad manually
        </button>
      </div>

      {mode === "team-id" ? (
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await onboardWithTeamId(formData);
              if (result && !result.ok) setError(result.message);
            });
          }}
        >
          <label htmlFor="teamId" className="text-sm text-neutral-300">
            FPL Team ID
          </label>
          <input
            id="teamId"
            name="teamId"
            type="number"
            required
            placeholder="e.g. 1234567"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-emerald-500"
          />
          <p className="text-xs text-neutral-500">
            Find this in your FPL team URL: fantasy.premierleague.com/entry/
            <span className="text-neutral-300">1234567</span>/event/1
          </p>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-emerald-600 px-3 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? "Pulling your squad…" : "Continue"}
          </button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await onboardManually(formData);
              if (result && !result.ok) setError(result.message);
            });
          }}
        >
          <PlayerPicker players={players} />
          <label htmlFor="bank" className="text-sm text-neutral-300">
            Bank balance (£m)
          </label>
          <input
            id="bank"
            name="bank"
            type="number"
            step="0.1"
            min="0"
            required
            placeholder="e.g. 1.5"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-emerald-600 px-3 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Continue"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
