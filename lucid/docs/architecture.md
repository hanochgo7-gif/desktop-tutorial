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

**ADR-2. Local-first data with optional sync.** Everything a learner does is saved first in IndexedDB on the
device (memory fallback in private browsing), so the full course works with no account and no server
("device-only mode"). When Supabase is configured and the learner signs in, a two-way sync pushes local changes
and pulls server changes since a cursor. The server stamps `updated_at`; a record still waiting to be pushed is
never overwritten by an older server copy. Tested in `tests/unit/store-sync.test.mjs`.

**ADR-3. Curriculum is versioned static JSON, not database rows.** Lessons, scenarios, expressions, writing tasks
and the placement bank are JSON files validated against a schema (`docs/content-schema.md`,
`tools/validate-content.mjs`). This keeps content reviewable in git, cacheable by the service worker for offline
use, and testable in CI. The database stores only learner data. New lessons are added by adding files; no code
changes. (A "database-backed curriculum" was considered and rejected: it would add latency to every lesson, break
offline use and remove content review from version control, for no learner benefit.)

**ADR-4. One server-side function for all AI.** `supabase/functions/lucid-ai` (Deno) is the only place that talks
to the model. The API key never reaches the browser. It authenticates the user's JWT, checks AI-processing consent
on the server profile, validates input with Zod, applies per-user rate limits, calls Claude through the official
Anthropic TypeScript SDK with structured outputs, and logs usage.

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
  store.js                      collections in IndexedDB + memory, change events, dirty tracking
  sync.js                       push/pull against lucid_records
  api.js                        Supabase over fetch: auth (email+password, refresh, recovery), PostgREST, RPC, AI call
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
supabase/migrations/            schema, RLS, age gate, export and deletion functions
supabase/functions/lucid-ai/    AI edge function (handler, prompts, rubric, schemas, tests)
tests/unit, tests/db, tests/e2e engine, database and browser tests
tools/                          content validator, curriculum outline, manifest, research collectors
```

## 3. Data model (server)

| Table | Contents | Access |
|---|---|---|
| `lucid_profiles` | display name, **birth year only**, UI language, Hebrew support, variant, goals, daily minutes, level, consent timestamps (terms, AI), marketing opt-in | owner only (RLS). Trigger rejects under-16s and forces marketing off for under-18s |
| `lucid_records` | the synced collections (`progress`, `attempts`, `cards`, `writing`, `chats`, `settings`, `placement`, `events`) as JSON documents, max 64 KB each, with a soft-delete flag | owner only (RLS); collection allow-list enforced by a check constraint |
| `lucid_ai_usage` | route, units, token counts, time | owner can read; only the edge function (service role) writes |
| `lucid_export()` | everything stored about the caller as JSON | caller only |
| `lucid_delete_account()` | deletes the auth user; every table cascades | caller only |

All of this is exercised on real Postgres (PGlite) in `tests/db/schema.test.mjs`: age gate, minors, cross-user
isolation for reads, inserts and updates, anon denial, size and collection limits, read-only usage, scoped export,
and cascading deletion.

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
- Rate limits by weighted units (writing evaluation 3, feedback 2, turns 1): 40 per hour and 200 per day by
  default (`LUCID_HOURLY_UNITS`, `LUCID_DAILY_UNITS`).
- Wire format verified against a local mock of the Messages API with the real SDK; handler logic covered by Deno
  tests with injected fakes. Live calls were not made in this build (no API key was available).

## 6. Security and privacy

- **No secrets in the client.** `config.js` holds only the Supabase URL and its publishable key (public by design;
  RLS protects every table). The Anthropic key lives in Supabase secrets.
- **Content Security Policy:** scripts, styles, fonts and images from the same origin only; network connections only
  to the same origin and `*.supabase.co`; no inline scripts.
- **Escaping by default:** all markup goes through the `html` template, which escapes every interpolation; the only
  raw HTML is generated by the app itself (icons, an escaped-then-bolded tutor reply).
- **Input validation** on the server (Zod, bounded strings, 64 KB body limit) and in the database (check
  constraints, document size limit, collection allow-list).
- **Ages 16+**: enforced in onboarding and by a database trigger; only the birth year is stored; under-18s get no
  marketing and protective defaults. AI processing requires an explicit opt-in, stored with a timestamp on the
  server profile and checked by the edge function.
- **Data rights**: export (device data plus the server export RPC) and deletion (device wipe plus account deletion
  RPC) from Settings.
- Threat model and review: `docs/qa/security-review.md`.

## 7. Offline and performance

A service worker caches the app shell, fonts and content; lessons work offline after first load. Fonts are
self-hosted subsets (Rubik Hebrew and Latin, about 64 KB). Views load on demand. No third-party scripts or trackers.

## 8. Configuration

See `docs/setup.md`: create a Supabase project, run the migration, deploy the edge function with an Anthropic key,
set `LUCID_ALLOWED_ORIGINS`, and fill `config.js`.
