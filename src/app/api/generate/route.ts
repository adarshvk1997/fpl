import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runGeneration } from "@/lib/orchestration/runGeneration";

// Manual "Refresh" button — re-runs the AI analysis on demand with the
// latest FPL data and news. No login is required in this deployment (see
// the auth-removal note in git history), so this uses the admin client
// directly rather than a session-based one — there's no user session to
// read. Each call hits the Gemini API (Flash tier, free-tier-friendly).
export async function POST() {
  const supabase = createAdminClient();

  try {
    const result = await runGeneration(supabase, "refresh");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[/api/generate]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
