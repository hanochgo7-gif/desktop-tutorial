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
`npm run test:db` applies every file in `supabase/migrations/` to PGlite (Postgres in WASM) and checks RLS, quotas
and AI metering as real roles. It has one connection, so it checks the locking logic, not real concurrency.
Edge function tests need Deno: `cd lucid/supabase/functions/lucid-ai && deno test --allow-env --allow-net --allow-read handler_test.ts`
(the first run downloads the npm and JSR imports). `deno check index.ts` type-checks the entry point.
Browser tests: `npm run test:e2e` (uses the pre-installed Playwright Chromium; serves the repository on port 8765).

## 2. Before you turn on accounts

Two things must be in place first. Both are about keeping Lucid apart from other apps.

### 2.1 Serve Lucid from its own origin

Browsers keep `localStorage`, IndexedDB, Cache Storage and service workers per **origin** (scheme, host and port),
not per path. Today GitHub Pages serves Lucid at `https://<account>.github.io/desktop-tutorial/lucid/`, the same
origin as every other site in this repository and every other Pages site of the account. Some of those pages load
scripts from CDNs without integrity checks or allow inline scripts. Lucid's own Content Security Policy protects only
Lucid's pages, not theirs. So any script that runs on any of those pages, through an XSS bug or a compromised CDN
file, could:

- read Lucid's session (`localStorage['lucid-session']`, with the access **and refresh** token) and act as the learner;
- read every essay, chat and answer in Lucid's IndexedDB;
- put files in Lucid's offline cache, which Lucid's service worker then serves as if they were Lucid's own code.

Before you set `supabaseUrl` in `config.js`, serve Lucid from an origin that hosts nothing else. For example, give it
its own subdomain (`lucid.example.org`) on a separate repository's GitHub Pages site, or use any other static host.
Then use that origin as the Supabase Site URL and in `LUCID_ALLOWED_ORIGINS`.
Device-only mode on the shared origin has no tokens to steal, but its IndexedDB data can still be read by sibling
pages, so the move is worth making even without accounts.

### 2.2 Use a dedicated Supabase project

Create a new Supabase project used only by Lucid. Do not add Lucid to an existing project, even though every table
is prefixed `lucid_`. The prefix only avoids name clashes; it does not isolate anything:

- **Account deletion.** "Delete my account" removes the person's `auth.users` row, so that every Lucid table is
  deleted with it. In a shared project, that row is also the person's identity in the other app, and anything that
  cascades from it goes too. In this repository's CRM, for example, `crm_members` rows are deleted on cascade,
  which would remove the person from their CRM workspace.
- **Sign-up.** Lucid needs open email sign-up. An invite-only app (the CRM requires "Allow new users to sign up" to
  be off) cannot share the project, because that setting applies to the whole project.
- **Limits.** Auth settings (CAPTCHA, password rules, email templates, redirect URLs), the database size and the
  storage and AI limits below all apply per project. They assume Lucid is the only tenant.

## 3. Accounts and sync (Supabase)

1. Create the dedicated project (section 2.2).
2. Run the migrations in order in the SQL editor (or `supabase db push`): `supabase/migrations/001_lucid_core.sql`,
   then `002_lucid_hardening.sql`, then `003_lucid_export_account.sql`. All can be run again safely. Without 003
   the data export lacks the account email and dates that the privacy page says it includes.
3. Authentication → URL configuration: set the Site URL to Lucid's own origin (section 2.1) and add it to the
   redirect URLs, for confirmation and password-reset links. Email + password sign-in must be enabled.
4. Authentication settings (dashboard names as of October 2026; they move from time to time):
   - **Confirm email: on.** New accounts cannot sign in until the address is confirmed. Lucid handles the
     confirmation link, but it signs the learner in from a confirmation or reset link only in the browser where
     they signed up or asked for the reset, within an hour, and only for the email typed there. Opened anywhere
     else, the link still confirms the address; the learner then signs in with their password (a reset link must
     be requested again).
   - **Secure password change** ("Require reauthentication when changing password"): **on.** Supabase then asks
     for a code sent by email before a session older than 24 hours can change the password. Lucid does not handle
     that code. Its password form asks for the current password and signs in with it again just before the change,
     which starts a new session, so the form should pass this check; this has not been tested against a live
     project. If it is refused, the learner can use "Forgot password": the reset link starts a fresh session.
   - **Require current password when changing password: leave off.** Lucid checks the current password by signing
     in again; it does not send it with the update, so with this setting on Lucid's password form would be refused.
   - **Refresh token reuse detection** (Sessions, advanced settings): on by default; leave it on.
   - **Rate limits:** review the sign-up and email limits.
   - **CAPTCHA:** Supabase supports hCaptcha and Cloudflare Turnstile on sign-up, sign-in and password reset.
     **Lucid's client does not send a CAPTCHA token yet, so turning this on now blocks sign-up, sign-in and password
     reset in Lucid.** Adding it needs client work: load the widget (and allow its script in the CSP) and send the
     token with those three requests. Until then, scripted sign-ups are limited only by email confirmation,
     Supabase's rate limits, the project-wide AI budget (section 4) and the Anthropic spend limit.
5. Put the project URL and its **publishable (anon) key** in `lucid/config.js`:
   ```js
   export const CONFIG = { supabaseUrl: 'https://<project>.supabase.co', supabaseKey: '<publishable key>', aiEnabled: false, aiFunction: 'lucid-ai' };
   ```
   The publishable key is meant to be public; row-level security protects the data. Never put the service-role
   key in the client.
6. Turn on Supabase usage and spend alerts for the organisation. A free-plan database becomes read-only above
   500 MB, which would stop sync for every learner.

**Storage limits.** Each account can keep at most **100,000 records and 50 MB** of JSON in `lucid_records`
(migration 002). A write that would go over is refused with SQLSTATE `54000`. Deleting or shrinking records is always
allowed. Lucid does not yet tidy up old exercise answers, and every answered item is one record. So a learner who
answers about 150 items a day reaches the record limit in roughly two years. From then on, sync fails for that
account until the limit is raised. To change the limits, re-create the function:
```sql
create or replace function public.lucid_storage_limits(out max_records int, out max_bytes bigint)
language sql immutable set search_path = '' as $$ select 200000, 100::bigint * 1024 * 1024 $$;
```
On the free plan, a handful of accounts at the limit could fill the database. Keep the sign-up protections above on
and watch the usage alerts.

## 4. AI features (Anthropic API)

1. Create an API key in the Anthropic Console, in a workspace used only by Lucid, and give that workspace a
   **monthly spend limit**. If everything else fails, this is the limit that holds.
2. Deploy the function and its secrets:
   ```
   supabase secrets set ANTHROPIC_API_KEY=<key> LUCID_ALLOWED_ORIGINS=https://<lucid's own origin>
   supabase functions deploy lucid-ai
   ```
   The function needs migration 002. Optional secrets:

   | Secret | Default | Meaning |
   |---|---|---|
   | `LUCID_MODEL` | `claude-opus-5-5` | model id |
   | `LUCID_HOURLY_UNITS` | 40 | units per learner in the last hour |
   | `LUCID_DAILY_UNITS` | 200 | units per learner in the last 24 hours |
   | `LUCID_GLOBAL_DAILY_UNITS` | 1000 | units for **all learners together** per UTC day (resets at 00:00 UTC). `0` pauses AI for everyone |
   | `LUCID_MAX_IN_FLIGHT` | 2 | AI requests one learner can have running at once |
   | `LUCID_EVAL_RUNS` | 1 | 2-3 scores each essay that many times and reports the median plus low-confidence flags, at that multiple of the cost and units |

   A missing or malformed number falls back to its default. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
   provided by Supabase.
3. Set `aiEnabled: true` in `lucid/config.js`.
4. Learners must sign in and turn on "AI feedback" in Settings (an explicit consent, stored on their profile).

**Cost control.** Writing evaluation costs 3 units per scoring run (3, 6 or 9), conversation feedback 2, and each
roleplay or tutor turn 1.
- Before every model call, the function reserves the units in one database transaction (`lucid_ai_reserve`, which
  only the service role may run). It takes a per-learner lock, checks the learner's last hour, last 24 hours and
  open requests, checks the project's total for the UTC day, and writes the usage row. Parallel requests therefore
  cannot get past the limits.
- A reserved request stays counted however it ends: success, a refusal, a reply cut off at the token cap, or an
  upstream error (including "busy"). The call may have been billed. The usage row records the outcome and token
  counts. Requests still open after 10 minutes stay counted but no longer block new ones.
- If the database cannot be reached, AI requests are refused rather than let through.
- Deleting an account removes its usage rows but not its units from the project's daily total.
- Worst case per unit: the output caps are 6,000 tokens for a tutor turn, 4,000 for a roleplay turn, 8,000 for
  feedback (2 units) and 16,000 per essay run (3 units). So one unit allows at most about 6,000 output tokens, plus
  input. `LUCID_GLOBAL_DAILY_UNITS` x 6,000 x your model's output price gives a rough ceiling on daily output spend.
  Set the Anthropic spend limit to match.

## 5. Deploy

GitHub Pages deploys `main` automatically (`.github/workflows/pages.yml`); Lucid is served at `/lucid/`. The
deploy step excludes `lucid/tools`, `lucid/tests`, `lucid/supabase`, `lucid/docs/research/data` and
`lucid/node_modules`. With each deploy that changes Lucid's files, bump `RELEASE` at the top of `lucid/sw.js`.
Code reaches learners on their next load either way (it is fetched network-first), but the new value makes
browsers download a fresh app shell and drop the old cache (lessons are cached again as they are opened). That address shares its origin with the repository's other sites. It is fine for trying
Lucid in device-only mode, but move Lucid to its own origin before turning on accounts (section 2.1).

Before inviting real learners (especially 16-17-year-olds), fill in the two boxes marked "To be filled in before
public launch" in `privacy.html`, in Hebrew and English: the operator's name and a contact address for privacy
questions and complaints, and how long Anthropic keeps API data under the terms of the workspace you use. The page
says until then that there is no operator to contact.
