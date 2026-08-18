"use server";

import { createClient } from "@/lib/supabase/server";

export interface LoginResult {
  ok: boolean;
  message: string;
}

/** Sends a Supabase magic link, but only to the single allowed email — this
 *  is the entire "auth system" for a personal, single-user app. Rejecting
 *  any other address here means we never even ask Supabase to send mail to
 *  someone who isn't you, on top of Supabase's own auth check. */
export async function requestMagicLink(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const allowed = process.env.ALLOWED_USER_EMAIL?.trim().toLowerCase();

  if (!allowed) {
    return { ok: false, message: "Server misconfigured: ALLOWED_USER_EMAIL is not set." };
  }
  if (email !== allowed) {
    // Deliberately vague — don't confirm/deny which email is the real one.
    return { ok: false, message: "If that's the right address, check your inbox for a sign-in link." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, message: "Check your inbox for a sign-in link." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
