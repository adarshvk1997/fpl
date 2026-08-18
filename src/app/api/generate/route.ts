import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runGeneration } from "@/lib/orchestration/runGeneration";

// Manual "Refresh" button — re-runs the AI analysis on demand with the
// latest FPL data and news. Requires a signed-in session (enforced by
// middleware for everything outside /login, but double-checked here since
// this route has real cost attached to every call).
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await runGeneration(supabase, "refresh");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[/api/generate]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
