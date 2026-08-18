"use client";

import { useState, useTransition } from "react";
import {
  updateTeamId,
  clearActiveChip,
  setNotifyEmail,
  setFreeTransfers,
  type SettingsResult,
} from "./actions";
import type { AppSettingsRow } from "@/lib/types/database";

export default function SettingsForms({ settings }: { settings: AppSettingsRow }) {
  return (
    <div className="flex flex-col gap-8">
      <TeamIdSection currentTeamId={settings.fpl_team_id} />
      <ChipSection activeChip={settings.active_chip} chipsUsed={settings.chips_used} />
      <FreeTransfersSection current={settings.free_transfers} />
      <NotificationSection enabled={settings.notify_email} />
    </div>
  );
}

function Feedback({ result }: { result: SettingsResult | null }) {
  if (!result) return null;
  return <p className={`text-sm ${result.ok ? "text-emerald-400" : "text-red-400"}`}>{result.message}</p>;
}

function TeamIdSection({ currentTeamId }: { currentTeamId: number | null }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SettingsResult | null>(null);

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 className="text-sm font-semibold text-neutral-300">FPL team ID</h2>
      <p className="text-xs text-neutral-500">
        Current: {currentTeamId ?? "manually entered squad, no team ID linked"}
      </p>
      <form
        className="flex gap-2"
        action={(formData) => {
          setResult(null);
          startTransition(async () => setResult(await updateTeamId(formData)));
        }}
      >
        <input
          name="teamId"
          type="number"
          placeholder="New team ID"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          Update
        </button>
      </form>
      <Feedback result={result} />
    </section>
  );
}

function ChipSection({
  activeChip,
  chipsUsed,
}: {
  activeChip: AppSettingsRow["active_chip"];
  chipsUsed: AppSettingsRow["chips_used"];
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SettingsResult | null>(null);

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 className="text-sm font-semibold text-neutral-300">Chip status</h2>
      <p className="text-sm text-neutral-200">
        Active this gameweek: {activeChip ? activeChip.replace("_", " ") : "none"}
      </p>
      {activeChip && (
        <button
          onClick={() => startTransition(async () => setResult(await clearActiveChip()))}
          disabled={pending}
          className="w-fit rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-700 disabled:opacity-50"
        >
          Clear active chip
        </button>
      )}
      <div className="mt-2 flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-neutral-500">Used this season</span>
        {chipsUsed.length === 0 ? (
          <span className="text-sm text-neutral-500">None yet</span>
        ) : (
          chipsUsed.map((c, i) => (
            <span key={i} className="text-sm text-neutral-300">
              {c.chip.replace("_", " ")} — Gameweek {c.gameweek}
            </span>
          ))
        )}
      </div>
      <Feedback result={result} />
    </section>
  );
}

function FreeTransfersSection({ current }: { current: number }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SettingsResult | null>(null);

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 className="text-sm font-semibold text-neutral-300">Free transfers</h2>
      <p className="text-xs text-neutral-500">
        Manually keep this in sync with FPL if it drifts (e.g. after banking one).
      </p>
      <form
        className="flex gap-2"
        action={(formData) => {
          setResult(null);
          startTransition(async () => setResult(await setFreeTransfers(formData)));
        }}
      >
        <input
          name="freeTransfers"
          type="number"
          min={0}
          max={5}
          defaultValue={current}
          className="w-24 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          Save
        </button>
      </form>
      <Feedback result={result} />
    </section>
  );
}

function NotificationSection({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SettingsResult | null>(null);
  const [checked, setChecked] = useState(enabled);

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 className="text-sm font-semibold text-neutral-300">Notifications</h2>
      <label className="flex items-center gap-2 text-sm text-neutral-200">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            const value = e.target.checked;
            setChecked(value);
            startTransition(async () => setResult(await setNotifyEmail(value)));
          }}
          disabled={pending}
          className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
        />
        Email me when a gameweek is locked in
      </label>
      <p className="text-xs text-neutral-500">
        Preference only — wiring up an email provider is a follow-up (not required to run the app).
      </p>
      <Feedback result={result} />
    </section>
  );
}
