# FPL AI Advisor

A personal Fantasy Premier League "pundit" — an AI that reviews your squad every gameweek, suggests
transfers, captains, and chip usage with a written rationale, and tracks how its picks actually
performed. Built to run entirely on free tiers, including AI usage (Gemini Flash's free tier).

**This app never touches your real FPL team.** It reads your squad from the public FPL API (or a
manual entry), records its own suggestions, and lets you compare/apply them yourself on the official
FPL site. There is no official public "submit transfer" endpoint, and this app deliberately doesn't
reverse-engineer one.

**No login.** This deployment has no auth gate — anyone with the URL can view/use it and trigger AI
generations. Fine for a private, unlisted personal deployment; don't post the link publicly. (The
magic-link login code is still in git history if you want it back later.)

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind, deployed on Vercel |
| DB | Supabase Postgres, open row-level-security policies (no login, see above) |
| AI | Gemini Flash (`gemini-2.5-flash`) via the Gemini API, with the Google Search grounding tool |
| FPL data | Official public FPL API — no key required |
| Scheduling | GitHub Actions cron (every 20 min) — **not** Vercel Cron, whose free tier is capped at once/day |

**Pinned to Next.js 15.x** (see `package.json`) — every Next 16.x release through 16.3.1 fails
`next build` with an upstream bug prerendering the internal `/_global-error` route
([vercel/next.js#87719](https://github.com/vercel/next.js/issues/87719), unresolved as of this
writing). Revisit the pin once that's fixed upstream.

## Why GitHub Actions instead of Vercel Cron

Vercel's Hobby (free) tier now limits Cron Jobs to once per day, which is too coarse to catch a
"2 hours before deadline" window precisely. Instead, a GitHub Actions workflow (`.github/workflows/cron.yml`)
hits `/api/cron/tick` every 20 minutes. That route derives all timing from the FPL API's own
`deadline_time` / `finished` / `data_checked` fields — nothing is hardcoded — so it doesn't matter
that the check isn't running exactly on the second.

## One-time setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then `0002_disable_auth_gate.sql`.
3. Copy your Project URL, anon key, and service role key into `.env.local` (see `.env.example`) from
   **Settings → API**.

### 2. Gemini

1. Get a free API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) —
   no payment method required (see cost estimate below).
2. Set `GEMINI_API_KEY`.

### 3. Local development

```bash
cp .env.example .env.local
# fill in the values
npm install
npm run dev
```

Visit `http://localhost:3000` — it goes straight to onboarding (paste your FPL team ID, or enter
your 15 players manually), no sign-in step.

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

## Testing

```bash
npm test          # Vitest — pure logic (FPL data helpers, squad schema validation)
npm run test:e2e  # Playwright — full app flows against your real dev server + Supabase project
```

There's no separate test database — this app has one shared `app_settings` row, so the e2e suite is
deliberately scoped to stay safe to run anytime:

- **Onboarding tests** only exercise validation paths (bad team ID, wrong player count) that fail
  before any database write or AI call.
- **Settings tests** back up and restore the `app_settings` row around each test.
- **Not covered by e2e**: actually completing onboarding and letting it kick off a real Gemini
  generation. Automating that would either eat into the free-tier rate limit on every test run, or
  require mocking the AI call — more infrastructure than this app warrants. That path is best
  verified by hand once in a while (sign up, click through, confirm a real suggestion appears).

`npm run test:e2e` starts its own dev server if one isn't already running (see `playwright.config.ts`).
If you already have `npm run dev` running in another terminal, Playwright reuses it.

## How the AI calls are budgeted

Gemini is called at most a handful of times per gameweek, never per page load:

1. **Gameweek opens** → one generation (`draft`), picked up by the cron tick.
2. **You hit "Refresh"** → one generation (`refresh`) — rate this yourself by how often you click it.
3. **T-2h before deadline** → one generation (`lock`), the permanent record for that gameweek.
4. **After a gameweek finishes** → one short post-mortem call (no web search, ~1K tokens).

Each generation is itself two Gemini calls internally (a scoped web-search research pass, then a
structured-output squad-generation pass) — never more, regardless of squad size.

### Cost estimate (should be $0)

Gemini Flash has a genuinely free tier (rate-limited, not a trial credit) — no payment method needed
to get a key at all. At this app's real usage pattern (a handful of generations per gameweek, not per
page load), normal use should stay comfortably inside the free tier's request-per-day and
request-per-minute limits for the whole season. If you ever did exceed it, Flash's paid pricing is
low enough (well under $1/million tokens) that even heavy refreshing would cost pennies, not dollars.

Supabase, Vercel, and GitHub Actions all stay within their free tiers for a single-user app at this
volume too, so the realistic total recurring cost for this app is **$0**.

## Project structure

```
src/
  app/
    onboarding/          FPL team ID or manual 15-player entry
    dashboard/            suggested squad, captain/vice, countdown, refresh
    transfers/            recommended transfers with rationale, apply/ignore tracking
    news/                  filterable news feed
    history/               past gameweeks: suggested vs actual, post-mortem
    settings/              chip status, team ID, free transfers, notification prefs
    api/generate/          manual refresh endpoint
    api/cron/tick/         scheduled endpoint (secret-gated, called by GitHub Actions)
    login/, auth/          unused — magic-link auth code, kept in case login is re-added later
  lib/
    fpl/                   typed public FPL API client + fixture/deadline analysis
    ai/                    Gemini client, research pass, structured squad generation, post-mortem
    orchestration/         ties FPL data + AI + persistence together for each trigger
    supabase/              browser/server/admin Supabase clients
    types/database.ts      hand-written DB types (regenerate via Supabase CLI once linked)
supabase/migrations/       SQL schema
.github/workflows/         the cron workflow
e2e/                        Playwright end-to-end tests
src/**/__tests__/           Vitest unit tests (co-located with the code they test)
```

## Known simplifications / follow-ups

- **No real FPL write access.** By design (see top of this file) — transfers, captaincy, and chip
  usage are all *suggestions* you action yourself on FPL.com.
- **No login**, by design (see top of this file) — don't share the deployed URL publicly.
- **Post-mortem scoring is an approximation**, not official FPL scoring (bonus-point timing, autosubs,
  and the captain-blanked-passes-to-VC rule aren't fully simulated) — good enough for the review
  narrative, not for penny-perfect points reconciliation.
- **Email notifications** are a stored preference only; no email provider is wired up yet.
- **e2e coverage stops short of a real AI generation** — see Testing above.
