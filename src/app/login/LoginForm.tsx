"use client";

import { useState, useTransition } from "react";
import { requestMagicLink } from "./actions";

export default function LoginForm() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-3"
      action={(formData) => {
        setStatus(null);
        startTransition(async () => {
          const result = await requestMagicLink(formData);
          setStatus(result);
        });
      }}
    >
      <label htmlFor="email" className="text-sm font-medium text-neutral-300">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-emerald-500"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 px-3 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send sign-in link"}
      </button>
      {status && (
        <p className={`text-sm ${status.ok ? "text-emerald-400" : "text-red-400"}`}>{status.message}</p>
      )}
    </form>
  );
}
