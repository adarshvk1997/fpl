import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

/** Playwright's test process isn't run through Next.js, so .env.local isn't
 *  loaded automatically the way it is for `npm run dev`. Read it directly. */
function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local not found — copy .env.example and fill it in before running e2e tests.");
  }
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

export function adminClient() {
  const env = loadEnvLocal();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Snapshot the single app_settings row so a test can freely mutate it and
 *  have this restore the real values afterward — this app has no separate
 *  test database, so tests share state with your actual configuration. */
export async function backupAppSettings() {
  const supabase = adminClient();
  const { data } = await supabase.from("app_settings").select("*").single();
  return async function restore() {
    if (!data) return;
    await supabase.from("app_settings").update(data).eq("id", true);
  };
}
