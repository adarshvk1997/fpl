// Service-role Supabase client — SERVER-ONLY, bypasses Row Level Security.
// Used exclusively by the cron routes (/api/cron/*), which run without a
// logged-in user session but still need to write AI-generated snapshots.
// Never import this from a Client Component or expose SUPABASE_SERVICE_ROLE_KEY
// to the browser.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
