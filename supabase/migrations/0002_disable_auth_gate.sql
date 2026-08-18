-- Removes the login requirement (see src/middleware.ts removal in git history).
-- Without a signed-in session, every request from the app now hits Postgres as
-- the `anon` role, so the original "authenticated only" policies would reject
-- everything. This app has no login anymore, so RLS is opened up to anyone who
-- can reach the (unlisted, personal) URL instead of gating on auth.role().

drop policy if exists "authenticated full access" on app_settings;
drop policy if exists "authenticated full access" on squad_snapshots;
drop policy if exists "authenticated full access" on transfer_suggestions;
drop policy if exists "authenticated full access" on news_items;
drop policy if exists "authenticated full access" on gameweek_results;
drop policy if exists "authenticated full access" on watchlist_players;
drop policy if exists "authenticated full access" on generation_runs;

create policy "open access" on app_settings for all using (true) with check (true);
create policy "open access" on squad_snapshots for all using (true) with check (true);
create policy "open access" on transfer_suggestions for all using (true) with check (true);
create policy "open access" on news_items for all using (true) with check (true);
create policy "open access" on gameweek_results for all using (true) with check (true);
create policy "open access" on watchlist_players for all using (true) with check (true);
create policy "open access" on generation_runs for all using (true) with check (true);
