"use client";

// A custom global-error boundary. Next.js auto-generates one if this file is
// absent, and (as of Next 16.3.1) that auto-generated page fails to
// prerender with an internal "workStore not initialized" invariant error —
// a Next.js bug, not something in this app's code. Supplying our own avoids
// triggering that code path.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100">
        <div className="flex flex-col items-center gap-4 px-4 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-md text-sm text-neutral-400">
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => reset()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
