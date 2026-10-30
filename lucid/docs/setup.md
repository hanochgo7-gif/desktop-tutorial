# Setting up Lucid

Lucid runs in two modes.

| | Device-only (default) | With Supabase (and optionally AI) |
|---|---|---|
| Lessons, exercises, placement, spaced review, real-life practice, automatic writing checks, progress | yes | yes |
| Accounts, sync across devices, server export and account deletion | no | yes |
| AI writing feedback, AI roleplay, AI tutor | no | yes, after the AI steps below |

## 1. Run locally

```
cd desktop-tutorial
python3 -m http.server 8765
# open http://localhost:8765/lucid/
```

Tests (Node 20+): `cd lucid && npm install && npm test && npm run test:db && npm run validate`.
Edge function tests need Deno: `cd lucid/supabase/functions/lucid-ai && deno test`.
Browser tests: `npm run test:e2e` (uses the pre-installed Playwright Chromium; serves the repository on port 8765).

## 2. Accounts and sync (Supabase)

1. Create a Supabase project (or reuse one: every Lucid table is prefixed `lucid_`).
2. Run `supabase/migrations/001_lucid_core.sql` in the SQL editor (or `supabase db push`).
3. Authentication → URL configuration: add the site URL where Lucid is hosted (for confirmation and password-reset
   links). Email + password sign-in must be enabled.
4. Put the project URL and its **publishable (anon) key** in `lucid/config.js`:
   ```js
   export const CONFIG = { supabaseUrl: 'https://<project>.supabase.co', supabaseKey: '<publishable key>', aiEnabled: false, aiFunction: 'lucid-ai' };
   ```
   The publishable key is meant to be public; row-level security protects the data. Never put the service-role
   key in the client.

## 3. AI features (Anthropic API)

1. Create an API key in the Anthropic Console.
2. Deploy the function and its secrets:
   ```
   supabase secrets set ANTHROPIC_API_KEY=<key> LUCID_ALLOWED_ORIGINS=https://<your-site>
   supabase functions deploy lucid-ai
   ```
   Optional secrets: `LUCID_MODEL` (default `claude-opus-5-5`), `LUCID_HOURLY_UNITS` (default 40),
   `LUCID_DAILY_UNITS` (default 200). `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase.
3. Set `aiEnabled: true` in `lucid/config.js`.
4. Learners must sign in and turn on "AI feedback" in Settings (an explicit consent, stored on their profile).

Cost control: each request is metered in `lucid_ai_usage`; the hourly and daily unit limits cap spend per learner.
Writing evaluation costs 3 units, conversation feedback 2, each roleplay or tutor turn 1.

## 4. Deploy

GitHub Pages deploys `main` automatically (`.github/workflows/pages.yml`); Lucid is served at `/lucid/`. The
deploy step excludes `lucid/tools`, `lucid/tests`, `lucid/supabase`, `lucid/docs/research/data` and
`lucid/node_modules`.
