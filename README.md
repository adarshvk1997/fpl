# FPL AI Advisor

A personal Fantasy Premier League "pundit" — an AI that reviews your squad every gameweek, suggests
transfers, captains, and chip usage with a written rationale, and tracks how its picks actually
performed. Built to run on free tiers plus a few dollars a year of Claude API usage.

**This app never touches your real FPL team.** It reads your squad from the public FPL API (or a
manual entry), records its own suggestions, and lets you compare/apply them yourself on the official
FPL site. There is no official public "submit transfer" endpoint, and this app deliberately doesn't
reverse-engineer one.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + Tailwind, deployed on Vercel |
| Auth + DB | Supabase (Postgres + magic-link auth), single-user gate |
| AI | Claude Sonnet 5 (`claude-sonnet-5`) via the Anthropic API, with the `web_search` server tool |
| FPL data | Official public FPL API — no key required |
| Scheduling | GitHub Actions cron (every 20 min) — **not** Vercel Cron, whose free tier is capped at once/day |

## Why GitHub Actions instead of Vercel Cron

Vercel's Hobby (free) tier now limits Cron Jobs to once per day, which is too coarse to catch a
"2 hours before deadline" window precisely. Instead, a GitHub Actions workflow (`.github/workflows/cron.yml`)
hits `/api/cron/tick` every 20 minutes. That route derives all timing from the FPL API's own
`deadline_time` / `finished` / `data_checked` fields — nothing is hardcoded — so it doesn't matter
that the check isn't running exactly on the second.

## One-time setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. In **Authentication → URL Configuration**, add your site URL and `<site>/auth/callback` as a redirect URL.
4. In **Authentication → Providers**, confirm Email (magic link) is enabled.
5. Copy your Project URL, anon key, and service role key into `.env.local` (see `.env.example`).

### 2. Anthropic

1. Get an API key at [console.anthropic.com](https://console.anthropic.com).
2. Set `ANTHROPIC_API_KEY`.

### 3. Local development

```bash
cp .env.example .env.local
# fill in the values
npm install
npm run dev
```

Visit `http://localhost:3000`, sign in with the email you set as `ALLOWED_USER_EMAIL`, and complete
onboarding (paste your FPL team ID, or enter your 15 players manually).

### 4. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel, set the same environment variables as `.env.local` (with `NEXT_PUBLIC_SITE_URL`
   set to your production URL).
3. Deploy.

### 5. Wire up the GitHub Actions cron

In your GitHub repo's **Settings → Secrets and variables → Actions**, add:

- `APP_URL` — your deployed Vercel URL (e.g. `https://fpl-ai-advisor.vercel.app`)
- `CRON_SECRET` — the same random string you set in Vercel's `CRON_SECRET` env var

The workflow in `.github/workflows/cron.yml` runs automatically every 20 minutes once merged to the
default branch. Trigger it manually from the Actions tab (**Run workflow**) to test it immediately.

## How the AI calls are budgeted

Claude is called at most a handful of times per gameweek, never per page load:

1. **Gameweek opens** → one generation (`draft`), picked up by the cron tick.
2. **You hit "Refresh"** → one generation (`refresh`) — rate this yourself by how often you click it.
3. **T-2h before deadline** → one generation (`lock`), the permanent record for that gameweek.
4. **After a gameweek finishes** → one short post-mortem call (no web search, ~1K tokens).

Each generation is itself two Claude calls internally (a scoped web-search research pass, then a
structured-output squad-generation pass) — never more, regardless of squad size.

### Cost estimate (not literally $0)

Using Claude Sonnet 5 pricing (~$2–3 / $10–15 per million input/output tokens) and web search at
$10 per 1,000 searches:

- Per generation: ~5K input + ~2K output tokens + ~4 web searches ≈ **$0.06–0.08**
- 3 generations/gameweek × 38 gameweeks ≈ **$7–9/season**
- Even with heavy manual refreshing, realistically **under $20/season**

Supabase, Vercel, and GitHub Actions all stay within their free tiers for a single-user app at this
volume. The only recurring cost is a small Anthropic API balance.

## Project structure

```
src/
  app/
    login/            magic-link sign-in (gated to ALLOWED_USER_EMAIL)
    auth/callback/     exchanges the magic-link code for a session
    onboarding/        FPL team ID or manual 15-player entry
    dashboard/          suggested squad, captain/vice, countdown, refresh
    transfers/          recommended transfers with rationale, apply/ignore tracking
    news/                filterable news feed
    history/             past gameweeks: suggested vs actual, post-mortem
    settings/            chip status, team ID, free transfers, notification prefs
    api/generate/        manual refresh endpoint (authenticated)
    api/cron/tick/       scheduled endpoint (secret-gated, called by GitHub Actions)
  lib/
    fpl/                 typed public FPL API client + fixture/deadline analysis
    ai/                  Claude client, research pass, structured squad generation, post-mortem
    orchestration/       ties FPL data + AI + persistence together for each trigger
    supabase/            browser/server/admin Supabase clients
    types/database.ts    hand-written DB types (regenerate via Supabase CLI once linked)
supabase/migrations/     SQL schema
.github/workflows/       the cron workflow
```

## Known simplifications / follow-ups

- **No real FPL write access.** By design (see top of this file) — transfers, captaincy, and chip
  usage are all *suggestions* you action yourself on FPL.com.
- **Post-mortem scoring is an approximation**, not official FPL scoring (bonus-point timing, autosubs,
  and the captain-blanked-passes-to-VC rule aren't fully simulated) — good enough for the review
  narrative, not for penny-perfect points reconciliation.
- **Email notifications** are a stored preference only; no email provider is wired up yet.
- **Single user only**, by design — see the auth gate in `src/app/login/actions.ts`.
