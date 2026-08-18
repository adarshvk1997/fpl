import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrNextEvent } from "@/lib/fpl/client";
import AppShell from "@/components/AppShell";
import NewsFeed from "./NewsFeed";

export default async function NewsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase.from("app_settings").select("*").single();
  if (!settings?.onboarded_at) redirect("/onboarding");

  const event = await getCurrentOrNextEvent();

  const { data: items } = await supabase
    .from("news_items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AppShell deadlineIso={event.deadline_time} gameweekLabel={event.name}>
      <h1 className="mb-6 text-2xl font-semibold text-white">News feed</h1>
      <NewsFeed items={items ?? []} />
    </AppShell>
  );
}
