import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrNextEvent } from "@/lib/fpl/client";
import AppShell from "@/components/AppShell";
import SettingsForms from "./SettingsForms";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase.from("app_settings").select("*").single();
  if (!settings?.onboarded_at) redirect("/onboarding");

  const event = await getCurrentOrNextEvent();

  return (
    <AppShell deadlineIso={event.deadline_time} gameweekLabel={event.name}>
      <h1 className="mb-6 text-2xl font-semibold text-white">Settings</h1>
      <SettingsForms settings={settings} />
    </AppShell>
  );
}
