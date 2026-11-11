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
Each other file in `tests/e2e/` is a suite of its own (its header names its port variable); `tests/e2e/move.mjs`
checks the move to Lucid's own address between two local origins. CI runs all of them
(`.github/workflows/lucid-verify.yml`).

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
Section 5.1 sets this up on Vercel. Then use that origin as the Supabase Site URL, in `LUCID_ALLOWED_ORIGINS` and as
`NEW_HOME` in `config.js`: the app refuses to use a server anywhere else, and always on `*.github.io`
(`js/core/home.js`), and the deploy check (`tools/build/verify.mjs`) fails a `config.js` with `supabaseUrl` set and no
such `NEW_HOME`.
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
   then `002_lucid_hardening.sql`, then `003_lucid_export_account.sql`, then `004_lucid_no_age_limit.sql`. All can
   be run again safely, in this order. Without 003 the data export lacks the account email and dates that the
   privacy page says it includes. Without 004 the database still refuses learners under 16 (there is no minimum
   age since November 2026) and lacks the `guardian_consent_at` column the app sends for them; re-running 001
   alone brings that refusal back, so always finish with 004.
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
     Lucid's client supports both, and ships with CAPTCHA **off**. While it is off, scripted sign-ups are limited
     only by email confirmation, Supabase's rate limits, the project-wide AI budget (section 4) and the Anthropic
     spend limit. Turning it on is the section "CAPTCHA" below; do all of it in one change, or sign-up, sign-in and
     password reset stop working in Lucid.
5. Put the project URL and its **publishable (anon) key** in `lucid/config.js`:
   ```js
   export const CONFIG = { supabaseUrl: 'https://<project>.supabase.co', supabaseKey: '<publishable key>', aiEnabled: false, aiFunction: 'lucid-ai' };
   ```
   The publishable key is meant to be public; row-level security protects the data. Never put the service-role
   key in the client.
6. Turn on Supabase usage and spend alerts for the organisation. A free-plan database becomes read-only above
   500 MB, which would stop sync for every learner.

### 3.1 CAPTCHA

Lucid's client sends a CAPTCHA token with sign-up, sign-in, password reset and the sign-in that checks the current
password before a password change, in the field Supabase Auth reads (`gotrue_meta_security.captcha_token`). It is
off until `config.js` names a provider and a site key (`js/core/captcha.js`). With Turnstile the widget runs in
"interaction-only" mode, so most people see no puzzle (decision D19); hCaptcha shows its checkbox. A trade-off to
record with D19: the widget loads a script from the provider, which then sees the visitor's IP address and browser
when they sign in, sign up or reset a password (nothing else in Lucid loads a third-party script). Say so in
`privacy.html` before turning it on.

The page's Content Security Policy is a `<meta>` tag in `index.html`, so it cannot change with `config.js` at
runtime: the provider's hosts are added to it by hand, in the same change that sets the key. Steps, all in one
commit and one deploy:

1. Create the site key and secret key with the provider (Cloudflare Turnstile or hCaptcha), for Lucid's own origin.
2. In Supabase (Authentication, Attack Protection), turn on CAPTCHA protection, choose the same provider and paste
   the **secret** key there. The secret key never goes in the client.
3. In `lucid/config.js` set `captchaProvider` to `'turnstile'` or `'hcaptcha'` and `captchaSiteKey` to the
   **site** key (it is public by design).
4. Replace the CSP in `lucid/index.html` (the `Content-Security-Policy` meta tag) with the one for the provider below,
   and the `Content-Security-Policy` header in `lucid/vercel.json` with the same policy followed by
   `; frame-ancestors 'none'` (`tests/unit/vercel.test.mjs` fails while the two differ). Each
   differs from today's policy only by the provider's hosts (Turnstile: `script-src` and a new `frame-src`;
   hCaptcha: `script-src`, `style-src`, `connect-src` and a new `frame-src`).

   Turnstile (from Cloudflare's CSP reference, developers.cloudflare.com/turnstile/reference/content-security-policy):
   <!-- csp:turnstile -->
   ```
   default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self' blob:; connect-src 'self' https://*.supabase.co; base-uri 'self'; form-action 'self'; object-src 'none'; frame-src https://challenges.cloudflare.com
   ```
   hCaptcha:
   <!-- csp:hcaptcha -->
   ```
   default-src 'self'; script-src 'self' https://hcaptcha.com https://*.hcaptcha.com; style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; img-src 'self' data:; font-src 'self'; media-src 'self' blob:; connect-src 'self' https://*.supabase.co https://hcaptcha.com https://*.hcaptcha.com; base-uri 'self'; form-action 'self'; object-src 'none'; frame-src https://hcaptcha.com https://*.hcaptcha.com
   ```
5. Regenerate the release files from `lucid/` (`node tools/build-manifest.mjs`) and run the tests:
   `tests/unit/captcha.test.mjs` fails while `config.js` and the CSP disagree, in either direction.
6. After the deploy, sign up, sign in, reset a password and change a password once each on the live site, with a
   keyboard and a screen reader as well. A refused token shows "We could not verify the request. Try again."

To turn CAPTCHA off again, do the same in reverse: switch it off in Supabase first, then empty `captchaProvider`
and `captchaSiteKey` and restore today's CSP:
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self' blob:; connect-src 'self' https://*.supabase.co; base-uri 'self'; form-action 'self'; object-src 'none'
```

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
3. Set `aiEnabled: true` in `lucid/config.js`. Leave `aiScoring: 'hidden'` until the gold set meets the scoring
   gate (roadmap LB-08): learners then see located mistakes, hints and comments, but no category bands, no CEFR range
   on a final draft and no AI-based writing level. `'shown'` shows them.
   Before real learners use AI, check the safety rule live (roadmap LB-04 and LB-10): every prompt tells the model
   to step out of the exercise or role when a learner discloses distress, self-harm, abuse or danger, answer
   briefly and kindly, and flag `safety_concern`; the app then shows its own help card (`js/core/support.js`, with
   Israeli numbers checked in November 2026: 101, 100, 1201 and 105) and records no score. Have the operator or legal
   confirm those numbers and run scripted disclosures, in Hebrew and English, against the deployed function.
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

Lucid moves to its own address on Vercel (section 2.1, LB-01). Until the owner has made the edits in 5.2, the
GitHub Pages copy stays the one learners use, and nothing changes for them.

**GitHub Pages (today, and the old address afterwards).** `.github/workflows/pages.yml` deploys `main`; Lucid is
served at `/desktop-tutorial/lucid/`. The deploy minifies Lucid in place (`tools/build/build.mjs`, falling back to
the source on any error) and leaves out `lucid/tools`, `lucid/tests`, `lucid/supabase`, `lucid/docs`,
`lucid/PRODUCT.md`, `lucid/README.md`, `lucid/node_modules` and the package files. Source maps are published on
purpose, so the shipped code can be checked against the repository. `RELEASE` and `LISTING` in `sw.js` are generated
(`node tools/build-manifest.mjs`); never edit them by hand.

**Vercel (Lucid's own address).** `lucid/vercel.json` holds everything: Vercel installs only esbuild
(`npm ci --prefix tools/build`), runs `node tools/build/vercel-build.mjs` and publishes `dist/`. That build copies
only the files Lucid ships (`tools/build/shipped.mjs`), minifies them, checks them (`tools/build/verify.mjs
--shipped`) and fails on any error, so Vercel keeps the last good deployment. `vercel.json` also sends the headers
GitHub Pages cannot: the page's Content Security Policy plus `frame-ancestors 'none'`, `X-Frame-Options: DENY`,
`nosniff`, the referrer policy, a Permissions-Policy that allows the microphone for Lucid only, and the same caching
as GitHub Pages (`no-cache` for the pages, `sw.js` and `release.json`, ten minutes for the rest; the service worker
relies on it). Do not add a `Cross-Origin-Opener-Policy` header: it would cut the link between the two windows that
the one-click move (5.2) uses. To try the built site locally: `node tools/build/vercel-build.mjs`, then
`node tools/build/serve.mjs --root dist --port 8090` (the same headers) and open `http://127.0.0.1:8090/`.

### 5.1 Create the Vercel project

1. In the Vercel dashboard: Add New, Project, import this GitHub repository.
2. Set **Root Directory** to `lucid`. Leave everything else as it is: `vercel.json` sets the framework (none), the
   install and build commands and the output directory. No environment variables are needed.
3. Deploy. The address Vercel gives (or your own domain, added under Settings, Domains) is Lucid's new address.

Each push to `main` deploys again. Branches get preview deployments, which are not the new address.

### 5.2 Launch switch

The exact edits, in one commit, once the project above exists. `node tools/launch-check.mjs` (from `lucid/`) lists
what is still missing and exits with an error until all of it is done. It also keeps `privacy.html`'s "Hosting" line
honest: while `vercel.json` is in `lucid/`, the line must name Vercel (and GitHub Pages, for the earlier address)
and say that the host receives the visitor's IP address, in Hebrew and English. If Lucid moves to another host,
change that line in both languages.

1. **Contact.** Fill in `js/core/contact.js` (`name_he`, `name_en`, `email`: Help's "יצירת קשר / Contact" answer
   reads it). In `privacy.html` and `accessibility.html`, replace the boxes marked "להשלמה לפני הפעלה ציבורית" /
   "To be filled in before public launch" with the real text, in Hebrew and English: the same name, the same email
   as a `mailto:` link, and in `privacy.html` the outcome of the legal review (see "Launch blocker" below).
   `tests/unit/contact.test.mjs` fails until the three files agree; then change e2e RL6 in `tests/e2e/run.mjs`,
   which asserts the placeholder today, to assert the real contact. Nobody else can supply these.
2. **New address.** In `config.js`, set `NEW_HOME` to the new address with `https://` and a final `/`, for example
   `export const NEW_HOME = 'https://lucid.example.org/';`. From then on:
   - the GitHub Pages copy shows "Lucid עבר לכתובת חדשה" with **להעביר את ההתקדמות שלי**, which opens the new
     address and hands the learner's progress over (the learner confirms there before anything is saved), and
     **הורדת גיבוי** as the fallback (restore it at the new address with **יש לי גיבוי** on the welcome screen);
   - the Vercel build adds the canonical link, `og:url`, an absolute share-image address, `sitemap.xml` and the
     sitemap line in `robots.txt`;
   - accounts and AI, if turned on later, run only at this address (`js/core/home.js`; never on `*.github.io`).
3. **Indexing.** Remove `<meta name="robots" content="noindex, nofollow">` from `index.html`, `privacy.html` and
   `accessibility.html` (`404.html` keeps its noindex). Do this only after step 1.
4. Commit, push to `main`, and check the new address: the app loads, Help says device-only mode, and a browser's
   developer tools show the headers above.

Keep the GitHub Pages copy online with the banner for as long as learners still arrive there: their progress is only
in that origin's browser storage until they move it. Never just delete `lucid/` from GitHub Pages.

**Launch blocker.** Before inviting real learners (especially learners under 18; Lucid has no minimum age), fill in the boxes marked "To be
filled in before public launch", in Hebrew and English: in `privacy.html` the operator's name and a contact address for privacy
questions and complaints, and the outcome of the legal review of children's data (whether the ticked
parent-or-guardian box under 16 is enough); in `accessibility.html` the contact for accessibility requests. The
pages say until then that there is no operator to contact. The AI retention box was replaced at launch by a
statement that AI is off on this site: before `aiEnabled` is set to `true`, `privacy.html` must say how long the AI
provider keeps API data under the workspace's terms (`tests/unit/launch-honesty.test.mjs` fails otherwise).
