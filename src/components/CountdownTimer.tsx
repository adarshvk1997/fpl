"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Deadline passed";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function CountdownTimer({ deadlineIso, label }: { deadlineIso: string; label: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Render a placeholder on the server (and on first client render, to
    // match) — the real value is only meaningful client-side, and this app
    // is time-zone/clock sensitive enough that we don't want to trust
    // whatever the server's Date.now() happened to be. Deferring the first
    // tick to a macrotask (rather than calling setNow synchronously here)
    // avoids the cascading-render footgun the set-state-in-effect rule
    // warns about, while still updating within a moment of mount.
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  const deadline = new Date(deadlineIso).getTime();
  const remaining = now === null ? null : deadline - now;

  return (
    <div className="flex flex-col items-end text-right">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      <span className="font-mono text-sm text-neutral-100">
        {remaining === null ? "…" : formatRemaining(remaining)}
      </span>
    </div>
  );
}
