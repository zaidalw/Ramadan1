# Ramadan Daily Challenge (Arabic-first PWA)

Mobile-first competitive game app (RTL) for a private group (default 7 players, supports 2 to 20).

## Public Share Link

- Play now (GitHub Pages): `https://zaidalw.github.io/Ramadan1/`
- Repo: `https://github.com/zaidalw/Ramadan1`

## Instant Share Mode

If Supabase env vars are not configured, the app automatically opens:

- `/quick-play` - a no-login local game mode (works immediately after deploy)

Use this when you want a fast shareable link with zero setup.

## Features

- Arabic-only UI with RTL layout
- PWA installable on iPhone/Android
- Daily scoring (max 10 points)
  - Quran: 0 to 3
  - Hadith and application: 0 to 3
  - Fiqh (صح/خطأ): correct = 2 (auto-scored)
  - Impact task: done = 2
- Private groups with invite code and invite link
- Roles
  - Supervisor (مشرفة): edit content, see answer key, override totals with reason (audit log), export CSV, print scoreboard
  - Player (مشاركة): submit daily results, see history and leaderboards
- Cutoff lock for players (default 23:59 America/Chicago), supervisor can still edit
- Quick-play local mode for instant sharing without backend setup

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS (RTL via `dir="rtl"` and logical spacing)
- Supabase
  - Auth (email/password)
  - Postgres + Row Level Security (RLS)
  - Triggers for server-side scoring

## Setup

### 1) Create Supabase Project

1. Create a new Supabase project.
2. In Supabase SQL Editor, run:
   - `supabase/migrations/0001_init.sql`

### 2) Seed The 30-Day Templates (Required)

This app seeds a private `day_templates` table once. Every new group clones those 30 days into its own group tables.

1. Copy `.env.example` to `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Put the exact 30-day plan + answer key into:
   - `supabase/seed/day-templates.json`
3. Run:

```bash
npm run seed:templates
```

Note: seeding uses the service role key, keep it private.

### 3) Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deployment (GitHub + Vercel)

1. Push this repo to GitHub.
2. Create a new Vercel project from the GitHub repo.
3. Add the same environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

If you want to run the seed script from CI, add `SUPABASE_SERVICE_ROLE_KEY` as well (not required for the app runtime).

## Data Privacy And Security

- Group data is private via Supabase RLS:
  - Only group members can read group data.
  - Players cannot read `group_day_answer_keys` (answer key).
  - Players can only insert/update their own submissions, and only before cutoff.
- Fiqh scoring happens in a database trigger, not in the client.

## Manual Tests

See `TESTING.md`.
