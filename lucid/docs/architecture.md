# Deliverable 7: Technical architecture

## 1. Decisions (with the alternatives considered)

**ADR-1. Static ES-module single-page app, no build step, hosted with the rest of this repository.**
The brief suggested evaluating Next.js, React, TypeScript, Tailwind and Supabase. This repository is a set of
static sites deployed by one GitHub Pages workflow (`.github/workflows/pages.yml`), and its existing app (`crm/`)
already proves the pattern: plain ES modules, an escaping `html` template helper, a hash router with lazy views,
and Supabase over `fetch`. Lucid follows it because:
- the learning experience is client-side (lessons, exercises, spaced repetition, the learner model), so server
  rendering buys little, while an offline-capable static app gives instant navigation and works on a train;
- no build means no toolchain drift, and every file the browser runs is the file in the repository (easy to audit);
- GitHub Pages hosting is free and already configured; Next.js would need a separate host (e.g. Vercel) for its
  server routes, which Lucid does not need because the only server logic is one Supabase Edge Function.
Trade-offs accepted: no TypeScript in the client (mitigated by small modules, unit tests and `node --check`), no
component framework (mitigated by a strict view-module contract), manual code splitting (lazy `import()` per view).
Hosting with the rest of the repository shares one web origin with its other sites, so it is only suitable for
device-only mode. Accounts need Lucid on its own origin first (section 6, `docs/setup.md` 2.1).

**ADR-2. Local-first data with optional sync.** Everything a learner does is saved first in IndexedDB on the
device (memory fallback in private browsing), so the full course works with no account and no server
("device-only mode"). When Supabase is configured and the learner signs in, a two-way sync pushes local changes
and pulls server changes since a cursor. The server stamps `updated_at`; a record still waiting to be pushed is
never overwritten by an older server copy. A deletion is a tombstone that keeps only the record id, on the device
and on the server (it is pushed with an empty document). The device remembers which account its data belongs to,
and sync runs only for that account, after its server profile exists (`js/core/session.js`). Tested in
`tests/unit/store-sync.test.mjs` and `tests/unit/session.test.mjs`.

**ADR-3. Curriculum is versioned static JSON, not database rows.** Lessons, scenarios, expressions, writing tasks
and the placement bank are JSON files validated against a schema (`docs/content-schema.md`,
`tools/validate-content.mjs`). This keeps content reviewable in git, cacheable by the service worker for offline
use, and testable in CI. The database stores only learner data. New lessons are added by adding files; no code
changes. (A "database-backed curriculum" was considered and rejected: it would add latency to every lesson, break
offline use and remove content review from version control, for no learner benefit.)

**ADR-4. One server-side function for all AI.** `supabase/functions/lucid-ai` (Deno) is the only place that talks
to the model. The API key never reaches the browser. It authenticates the user's JWT, checks AI-processing consent
on the server profile, validates input with Zod, reserves AI units atomically in the database (per-learner limits
and a project-wide daily budget) before calling Claude through the official Anthropic TypeScript SDK with
structured outputs, and records each call's outcome and token counts.

**ADR-5. Objective spaced repetition on FSRS.** `ts-fsrs` 5.4.2 (MIT) is vendored unmodified
(`vendor/ts-fsrs.mjs`). Cards are graded from what the learner did, never by self-rating buttons (research C1).

**ADR-6. Speech uses the browser.** Speech synthesis for every listening item and speech recognition where the
browser provides it. Recognition never produces a grade on its own (research C2, D34/D37), and there is a
self-assessment fallback.

## 2. Components

```
index.html                      shell (strict CSP), loads js/app.js
config.js                       public runtime config: Supabase URL, publishable key, aiEnabled
css/app.css                     design system (tokens, keycap components, layouts, RTL via logical properties)
js/app.js                       boot: open store, load curriculum, apply settings, draw shell, route, sync
js/core/
  store.js                      collections in IndexedDB + memory, change events, dirty tracking, data owner, device erase
  sync.js                       push/pull against lucid_records, behind a guard
  api.js                        Supabase over fetch: auth (email+password, refresh, recovery), PostgREST, RPC, AI call
  session.js                    around sign-in: whose data is on the device, server profile, when sync may run
  content.js                    content loader (lessons on demand)
  learner.js                    profile, settings, attempts, lesson progress, cards, memoised learner model
  adaptive.js                   topic mastery, recurring errors, per-skill levels, daily plan, reports
  srs.js                        FSRS wrapper, objective grading, retrieval ladder, workload governor
  placement.js                  adaptive staircase placement
  pool.js                       exercise pool, targeted drills (with competing topics), level checks
  grading.js                    answer normalisation, contractions, typo tolerance, word alignment
  writing-analyzer.js           deterministic writing checks (no AI)
  diff.js                       word-level draft comparison
  speech.js                     speech synthesis and recognition
  i18n.js                       Hebrew/English UI strings, Hebrew support level, dual legends
  router.js                     hash router, lazy views, onboarding guard
js/ui/                          components, icons (Lucide, ISC), exercise renderers, set player
js/views/                       one module per screen (21 screens)
content/                        taxonomy, curriculum map, lessons, placement, real-life, writing
supabase/migrations/            001 schema, RLS, age gate, export and deletion; 002 AI metering, storage quota, hardening
supabase/functions/lucid-ai/    AI edge function (handler, prompts, rubric, schemas, tests)
tests/unit, tests/db, tests/e2e engine, database and browser tests
tools/                          content validator, curriculum outline, manifest, research collectors
```

## 3. Data model (server)

| Table | Contents | Access |
|---|---|---|
| `lucid_profiles` | display name, **birth year only**, UI language, Hebrew support, variant, goals (at most 8, 640 characters in all), daily minutes, level, consent timestamps (terms, AI), marketing opt-in | owner only (RLS). Trigger rejects under-16s and forces marketing off for under-18s |
| `lucid_records` | the synced collections (`progress`, `attempts`, `cards`, `writing`, `chats`, `settings`, `placement`, `events`) as JSON documents, max 64 KB each, with a soft-delete flag | owner only (RLS), and only once the owner has a profile, so an account refused by the age gate stores nothing; collection allow-list enforced by a check constraint; per-account quota (below) |
| `lucid_storage` | running record and byte totals per account, kept by an `AFTER` trigger on `lucid_records` | internal (no learner access). Writes that would take an account past `lucid_storage_limits()` (100,000 records, 50 MB) are refused |
| `lucid_ai_usage` | route, units, outcome (`pending`, `ok`, `refused`, `incomplete`, `error`), token counts, time | owner can read; only the edge function (service role) writes |
| `lucid_ai_budget` | units reserved per UTC day across all learners | internal (no learner access); not reduced when an account is deleted |
| `lucid_ai_reserve()` | checks the learner's hour, day and in-flight limits and the project's daily budget under a per-learner advisory lock, then writes a `pending` usage row, in one transaction | service role only |
| `lucid_export()` | everything stored about the caller as JSON | caller only |
| `lucid_delete_account()` | deletes the auth user; every table cascades | caller only |

`anon` has no table access. `authenticated` has no `TRUNCATE`, `REFERENCES` or `TRIGGER` on any Lucid table
(Supabase's default privileges would otherwise grant them, and `TRUNCATE` ignores RLS).

All of this is exercised on real Postgres (PGlite) in `tests/db/schema.test.mjs`, with Supabase's default
privileges simulated: age gate, minors, records only with a profile, cross-user isolation for reads, inserts and
updates, anon denial, size and collection limits, the storage quota (upserts counted once, shrinking allowed over
the limit), AI reservations (hour, day, in-flight and project limits, service-role only), revoked privileges,
read-only usage, scoped export, cascading deletion, and that the migrations can be applied twice. PGlite has a
single connection, so real concurrency is not tested there; the edge-function tests send parallel requests to an
atomic in-memory ledger instead.

## 4. The learner model

- **Attempts** are the source of truth: one record per answered item (topic, skill, level, correctness, error
  type, hint use, latency, the response truncated to 300 characters).
- **Topic mastery** is time-weighted accuracy with a neutral prior (half-life 21 days). "Mastered" also needs at
  least 6 answers on at least 2 different days, so one good sitting is not mastery.
- **Recurring errors** need 3+ occurrences on 2+ days in 30 days; trends compare the last 14 days with the 14
  before.
- **Per-skill levels** start from placement and move only on evidence: a level is demonstrated at 75% over 6+
  items at that level; clear failure (under 50% over 8+) lowers it; writing uses assessed texts only. Levels are
  labelled "Lucid estimate, aligned to CEFR descriptors".
- **The daily plan** follows the research session template (warm-up recall, due reviews, new learning, targeted
  practice, use it, exit check) scaled to 10, 20, 35 or 50 minutes, and says why each block is there.

## 5. AI integration

| Route | Output | Model settings |
|---|---|---|
| `evaluate_writing` | structured: task-fulfilment gate, CEFR estimate with a low-high range, 12 rubric categories (0-5 bands relative to the stage target, applicability), errors (verbatim quote, type, severity, explanation EN/HE, hint, correction), required elements, revision tasks, progress since the previous draft | effort high, 16k max tokens |
| `roleplay_turn` | structured: reply, scene complete, optional Hebrew hint | effort low |
| `roleplay_feedback` | structured: scores (0-100) for the conversation, grammar, vocabulary, naturalness, better alternatives quoting the learner, practice | effort medium |
| `tutor_turn` | text | effort low |

- Model: `claude-opus-5-5` by default, configurable with `LUCID_MODEL`. Server-side refusal fallback is enabled
  (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`); a refusal returns a safe message.
- System prompts are static and cached (`cache_control`); learner context goes in messages.
- Learner text is wrapped in tags and treated strictly as data (prompt-injection resistant framing).
- Minimal-edit enforcement after the model (research C2, D26-D27): an error whose quote is not verbatim in the
  learner's text, or whose correction is much longer than its span, is dropped and counted.
- Writing rubric protocol (research E, sections 8-9) enforced in code after the model, not only requested in the
  prompt: categories that do not apply at the task's stage are forced to N/A (never 0); a "partial" task caps the
  argument categories at 2 and lowers the estimate one level, "off_topic" caps every category at 1; with
  `LUCID_EVAL_RUNS` > 1 (max 3) the scores are the median of independent runs and categories whose runs differ by
  more than one band are flagged low-confidence ("~" in the UI); the CEFR range always contains the estimate.
- Client side of the same protocol: the overall level range appears only on a final draft (or after the last
  round), at most three AI rounds per task (draft plus two revisions), a hint ladder (locate, name the error type,
  clue, correction) that starts one rung higher for A1-A2 grammar and opens the correction only after the learner
  has tried a fix in the text, and self-assessment before feedback from stage 7.
- Rate limits by weighted units (writing evaluation 3 per scoring run, feedback 2, turns 1): 40 per hour and 200
  per day per learner, at most 2 requests running at once per learner, and 1,000 units per UTC day for the whole
  project, by default (`LUCID_HOURLY_UNITS`, `LUCID_DAILY_UNITS`, `LUCID_MAX_IN_FLIGHT`,
  `LUCID_GLOBAL_DAILY_UNITS`). The request is built first, then the units are reserved by `lucid_ai_reserve` in one
  transaction, then the model is called, so parallel requests cannot overspend. A reserved call stays counted
  whether it succeeds, is refused, is cut off at the token cap or fails upstream; its usage row is then updated
  with the outcome and token counts. If the reservation cannot be made (database unreachable), the request is
  refused. Refusal codes: `rate_limited` and `in_flight` (429), `budget_exhausted` and `unavailable` (503).
- Wire format verified against a local mock of the Messages API with the real SDK; handler logic covered by Deno
  tests with injected fakes. Live calls were not made in this build (no API key was available).

## 6. Security and privacy

- **No secrets in the client.** `config.js` holds only the Supabase URL and its publishable key (public by design;
  RLS protects every table). The Anthropic key lives in Supabase secrets.
- **Content Security Policy:** scripts, styles, fonts and images from the same origin only; network connections only
  to the same origin and `*.supabase.co`; no inline scripts.
- **Escaping by default:** all markup goes through the `html` template, which escapes every interpolation; the only
  raw HTML is generated by the app itself (icons, an escaped-then-bolded tutor reply).
- **Input validation** on the server (Zod, bounded strings, a 64 KiB body limit counted in bytes: a larger
  `Content-Length` is refused before sign-in is checked, and the body is read with a byte counter that stops at the
  limit) and in the database (check constraints, document size limit, collection allow-list, per-account quota).
- **Abuse and cost limits**: per-learner AI limits and a project-wide daily AI budget, reserved atomically (section
  5); a storage quota per account (section 3). `docs/setup.md` covers the settings outside the code: email
  confirmation, secure password change, an Anthropic workspace spend limit and usage alerts. CAPTCHA is not
  supported by the client yet.
- **Isolation**: Lucid needs its own web origin before accounts are turned on, because browser storage (the session
  tokens, IndexedDB, the offline cache) is per origin, and the GitHub Pages address is shared with the repository's
  other sites. It also needs a dedicated Supabase project, because account deletion removes the `auth.users` row and
  sign-up settings are per project (`docs/setup.md` section 2).
- **Ages 16+**: enforced in onboarding and by a database trigger; only the birth year is stored; under-18s get no
  marketing and protective defaults. AI processing requires an explicit opt-in, stored with a timestamp on the
  server profile and checked by the edge function.
- **Email links** (confirmation and password reset) return with session tokens in the URL fragment. They are used
  only in the browser that asked for them, within an hour, and only when the account's email matches the one typed
  there; otherwise the tokens are removed from the address bar and ignored. The session's user is then fetched from
  `/auth/v1/user`. (Supabase's PKCE flow would bind links more strongly; it is not used yet.)
- **Shared devices**: local data records its owner (account id). Signing in as a different account never merges:
  the learner removes the other account's data from the device or cancels. Data made without an account moves into
  an account only on sign-up (the screen says so) or after the learner agrees. Settings offers "Sign out and remove
  my data from this device".
- **Password change** asks for the current password and signs in with it again before sending the new one, except
  within 30 minutes of a password-reset link used in the same tab.
- **Data rights**: export (device data plus the server export RPC) and deletion (account deletion RPC, then a
  device erase) from Settings. The erase removes only Lucid's data: the `lucid` IndexedDB database, keys starting
  with `lucid-` in local and session storage, and `lucid-…` caches; other apps on the origin are not touched. In the
  tutor, the learner can delete the conversation on screen and, in one step, all other saved tutor conversations;
  essays and roleplay chats cannot be deleted one by one yet (only with the whole account or device data).
- Threat model and review: `docs/qa/security-review.md`.

## 7. Offline and performance

A service worker caches the app shell, fonts and content; lessons work offline after first load. Code (pages,
`config.js`, `js/`, `css/`) is fetched network-first, falling back to the cache when offline or after 4 seconds, so a
fix reaches learners on their next load. Fonts, content and other files are served from the cache and refreshed in
the background. The cache is named `lucid-<RELEASE>` (the constant at the top of `sw.js`); bumping it on a deploy
installs a new worker, which deletes older `lucid-` caches and nothing else. Tested in `tests/unit/sw.test.mjs`.
Fonts are self-hosted subsets (Rubik Hebrew and Latin, about 64 KB). Views load on demand. No third-party scripts
or trackers.

## 8. Configuration

See `docs/setup.md`: serve Lucid from its own origin, create a dedicated Supabase project, run migrations 001 and
002, set the Auth options, deploy the edge function with an Anthropic key (and a workspace spend limit), set
`LUCID_ALLOWED_ORIGINS` and the AI limits, and fill `config.js`.
