import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runCronTick } from "@/lib/orchestration/runCronTick";

// Hit by the GitHub Actions scheduled workflow every 15-30 minutes. Not a
// Vercel Cron job — Vercel's free tier is capped at once/day, too coarse
// for a precise T-2h-before-deadline check — so this is a plain API route
// guarded by a shared secret instead.
export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const summary = await runCronTick(supabase);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron tick failed";
    console.error("[/api/cron/tick]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Allow a quick manual GET-based trigger for testing (still secret-gated).
export async function GET(req: NextRequest) {
  return POST(req);
}
