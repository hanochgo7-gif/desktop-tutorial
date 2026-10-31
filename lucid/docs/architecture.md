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
browser provides it. Recognition never produces a grade (research C2, D34/D37): speaking items show what was
recognised next to the target in its own spelling, with "Try again" and "Continue"; they are stored with no score
and no mistake type, never come back as retries and are left out of the lesson score and its denominator.
Self-rating ("I said it clearly", "I need more practice") is always offered, and "Can't speak right now" skips an
item with no attempt recorded. Shadowing in the Speaking lab uses the same unscored item. Recognition is the
browser's own service (in Chrome, for example, the audio is sent to the browser maker's servers); Lucid receives
only the recognised text and keeps no audio. Before the first microphone use in a browser, a notice says so;
"Use the microphone" is remembered under the `lucid-mic-notice` key in local storage (the device erase removes
it), and "Not now" keeps the microphone off for that try. The tutor's pronunciation mode says that it reads
text and cannot hear the learner.

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
  placement.js                  adaptive staircase placement with confirmation and resume
  pool.js                       exercise pool, targeted drills (with competing topics), level checks
  grading.js                    answer normalisation, contractions, typo tolerance, word alignment
  writing-analyzer.js           deterministic writing checks (no AI); a/an by sound, no run-on flag after a
                                linker or short opening phrase, low-precision rules off at C1-C2, a title
                                line and a closing reference list are not checked or counted
  diff.js                       draft comparison (any two versions, paragraph breaks kept); follows a quoted
                                mistake into the current text by its sentence
  speech.js                     speech synthesis and recognition
  i18n.js                       Hebrew/English UI strings, Hebrew support level, dual legends, bidi isolation of
                                English inside Hebrew (isolateLatin, below)
  reallife.js                   real-life track logic without the DOM: how a scenario fits the learner's level,
                                "Start here" and next-scenario suggestions, the key-word check on a free reply,
                                word-start search for expressions
  router.js                     hash router, lazy views, onboarding guard
js/ui/                          components, icons (Lucide, ISC), exercise renderers, set player
js/views/                       one module per screen (21 screens)
content/                        taxonomy, curriculum map, lessons, placement, real-life, writing
supabase/migrations/            001 schema, RLS, age gate, export and deletion; 002 AI metering, storage quota, hardening
supabase/functions/lucid-ai/    AI edge function (handler, prompts, rubric, schemas, tests)
tests/unit, tests/db, tests/e2e engine, database and browser tests
tools/                          content validator, curriculum outline, manifest, research collectors
```

**Bidirectional text.** Every Hebrew string that can contain English (legends, `bi()`, glosses, AI hints and
summaries) goes through `isolateLatin()`, which wraps each English run in `<bdi dir="ltr" lang="en">` at render
time (research C3, R2 and R5). The isolate holds the English with its own `?`, `!` and `...` and the quote marks or
brackets around it; what joins it to the Hebrew stays outside and follows the Hebrew direction (a prefix hyphen as
in `ב-am`, a colon or comma, ` = ` before a translation, the Hebrew sentence's final full stop). A legend's Hebrew
line is left out when it has no Hebrew letters. Option-and-feedback pairs are two block lines, each with its own
direction; a Hebrew placeholder in an English field is shown right to left until the learner types (CSS on
`:placeholder-shown`). Unit tests: `tests/unit/i18n.test.mjs`; rendered positions: e2e RL5.

**Layout.** No screen may scroll sideways at 320-1440px or at 130-150% text (e2e 14-15, which also covers Welcome
and onboarding before there is a profile). The Welcome keyboard sizes its keys from the viewport, keys wrap their
labels on phones and at large text sizes, and Today's plan rows put the time under the text at 130-150% on phones.

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
  type, hint use, latency, the response truncated to 300 characters). Practice that is never scored (speaking,
  and writing inside lessons) has `score: null` and stays out of mastery, levels and accuracy. On an open rewrite
  ("transform") from B1 up, the key is shown as "one model answer" and the learner may mark an equivalent answer
  as correct: the attempt becomes right with `self_judged: true`, and a `self-judged` event keeps the answer for
  content review. Lucid does not check that judgement.
- **The lesson player** counts only the first try of scored exercises toward the score (70% completes a lesson
  unless the lesson sets its own mark). The step counter keeps the first-pass total fixed and counts retries
  apart ("3 of 14 · 2 to revisit", written in words so it reads correctly in Hebrew). After "Nearly there" the
  main action redoes only the exercises missed on the first try; the earlier right answers keep counting, so
  fixing the misses can complete the lesson. Every stage and exercise opens at the top of the page; the intro,
  explanation and summary move focus to their heading. A link to a
  lesson with no file says it is still being written and offers the next ready lesson; a listed lesson that
  fails to load is treated as a connection problem.
- **Topic mastery** is time-weighted accuracy with a neutral prior (half-life 21 days). "Mastered" also needs at
  least 6 answers on at least 2 different days, so one good sitting is not mastery.
- **Recurring errors** need 3+ occurrences on 2+ days in 30 days; trends compare the last 14 days with the 14
  before.
- **Per-skill levels** need evidence for that skill, at that level (`adaptive.skillLevels`). Practice (lessons,
  drills, reviews) shows a level at 75%+ over 6+ answers at it, on at least 2 different days. Placement gives only
  a "first estimate" for grammar, vocabulary, reading and listening, from 2+ placement questions at the level in
  that skill, and never above B2 (higher answers show as "B2+"): multiple-choice items alone never establish C1 or
  C2. Writing gets a level only from final drafts assessed by AI feedback, one per task (2+ tasks on 2+ days; the
  median of the last three, the lower of two); a draft still being revised never counts, and drafts show no level
  anywhere. Lucid does not assess speaking level, so speaking always reads "not yet assessed", as
  does any skill without evidence; the overall placement level is never copied into a skill. Clear failure (under
  50% over 8+) lowers a level one step as a first estimate. Levels are labelled "Lucid estimate, aligned to CEFR
  descriptors", and each one shows its source and evidence count.
- **Placement** (`placement.js`) is a staircase over blocks of four. 3 of 4 passes a level for the moment; a
  level counts only when a second passing block confirms it (6 of 8 at the level, or 3+ of 4 at the level above),
  so the test asks a confirming block before it ends and never places above the highest confirmed level. Answers
  are saved after each question (`placement/inprogress`), so a learner who leaves can continue or start again
  from Today; until there is a result (and while no lesson has been completed), Today shows the test instead of a
  plan, or lets the learner start at their own onboarding estimate, or from the basics, by choice. Choosing a level
  on the path also settles it (recorded as the learner's own estimate). Retaking or moving level uses the same
  rule: lessons below the start are "placed out"; placed-out lessons from the new start up become regular lessons
  again.
- **The path** skips lessons that have no file yet (`content/manifest.json`): Today and the path never link to
  them, the path labels them "In preparation", and Today names the lesson it skipped. Opening a placed-out lesson
  to revise it leaves it placed out (a pass completes it, a miss records the score), so revision never moves the
  course level back. Hebrew support is re-applied whenever the course level moves.
- **The daily plan** follows the research session template (warm-up recall, due reviews, new learning, targeted
  practice, use it, exit check) scaled to 10, 20, 35 or 50 minutes, and says why each block is there. The lesson
  gets the time the other blocks leave; when the lesson's real length (from its file) does not fit, the plan
  takes a part ("up to exercise 9 of 16") and the lesson's saved place carries the rest to the next day, where
  the main button says "Continue". From A1 and 20 minutes, the learner's goals choose the "use it" block: travel
  and conversation name a real-life scenario at or below their level (travel: airport, hotel and emergencies
  first), exams and academic writing alternate reading and a Writing lab task, and work uses workplace scenarios
  when they exist (there are none yet, which onboarding says).
- **New words** enter spaced repetition at the daily new-word limit; the rest are queued for the next days.
  Learners placed above the early levels can add the words of placed-out lessons on request (Today and the path).
- **Active minutes** in reports include the session that is still open (sessions are logged when the tab is
  hidden, capped at an hour).

- **Real-life track.** Scenarios are open at every level. Real life and Conversations show the learner's course
  level in words, mark each scenario "below", "at", "a small stretch" (one level up) or "challenging", start with
  up to three scenarios not done yet at or below the level, in goal order, then one level up
  (`reallife.recommendScenarios`), and list each topic folded to two scenarios, with topic and level filters.
  Scripted practice records each reply as a speaking attempt, ends with how many replies were the most natural and
  a next scenario (the main action unless AI roleplay can start), and checks a reply in the learner's own words
  only for whole key words or a question back, said as a suggestion. AI roleplay sends the learner's correction
  setting, and Hebrew tips follow the scene's level or the learner's choice (a checkbox), not the course level;
  "I'm stuck" shows the goal and the scene's phrases (no AI call). The report leads with the outcome and the
  learner's strengths, opens at its heading, and keeps the scores folded. Expressions sort by level up to A2 (A-Z
  from B1), filter to the learner's level and search word starts; the Reading centre lists the recommended level
  first, then the levels above, then easier texts.

## 5. AI integration

| Route | Output | Model settings |
|---|---|---|
| `evaluate_writing` | structured: task-fulfilment gate, CEFR estimate with a low-high range, 12 rubric categories (0-5 bands relative to the stage target, applicability), errors (verbatim quote, type, severity, explanation EN/HE, hint, correction), required elements, revision tasks, progress since the previous draft | effort high, 16k max tokens |
| `roleplay_turn` | structured: reply, scene complete, optional Hebrew hint; follows the learner's correction setting (`off`, `light`, `standard`, `intensive`; only `intensive` lets the partner confirm a meaning with the correct form, at most once per turn) | effort low |
| `roleplay_feedback` | structured: scores (0-100) for the conversation, grammar, vocabulary, naturalness, strengths quoting the learner (at most 3), better alternatives quoting the learner, practice | effort medium |
| `tutor_turn` | text | effort low |

- Model: `claude-opus-5-5` by default, configurable with `LUCID_MODEL`. Server-side refusal fallback is enabled
  (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`); a refusal returns a safe message.
- System prompts are static and cached (`cache_control`); learner context goes in messages.
- Learner text, the task instructions and the scene brief are wrapped in tags and treated strictly as data
  (prompt-injection resistant framing). Our tag names typed inside client text are neutralised (their "<" becomes
  "‹"), so a learner cannot close a wrapper; other characters are left as typed so quotes still match. The scene
  brief and roleplay history are still sent by the client (security review S-10: resolving them from content
  bundled with the function is not done).
- Size limits: an essay (and its previous draft) up to 24,000 characters each, enough for a 2,200-word paper with
  its reference list, task instructions up to 4,000, inside the 64 KiB body limit. The client checks length and
  body size before sending, sends a long paper without its previous draft when both do not fit (and says so), and
  shows every refusal in plain Hebrew or English, never the server's raw message.
- Minimal-edit enforcement after the model (research C2, D26-D27): an error whose quote is not verbatim in the
  learner's text, or whose correction is much longer than its span, is dropped and counted. In roleplay feedback,
  a "better alternative" whose "you said" is not in the learner's lines is dropped, and the number kept follows the
  correction setting and level (off 0; light 2; standard 4, or 3 at Pre-A1 to A2; intensive 6, or 4).
- Source-based writing (stages 9-10, research tasks, tasks with sources): the prompt forbids saying a source is
  real or correctly quoted and asks for a `verification_note` naming what the learner should check; the UI always
  states that AI feedback does not read sources and cannot check whether they exist, are quoted accurately or say
  what the learner reports. A closing reference list does not count toward the word range (prompt and client).
- Writing rubric protocol (research E, sections 8-9) enforced in code after the model, not only requested in the
  prompt: categories that do not apply at the task's stage are forced to N/A (never 0); a "partial" task caps the
  argument categories at 2 and lowers the estimate one level, "off_topic" caps every category at 1; with
  `LUCID_EVAL_RUNS` > 1 (max 3) the scores are the median of independent runs and categories whose runs differ by
  more than one band are flagged low-confidence ("~" in the UI); the CEFR range always contains the estimate.
- Client side of the same protocol: the overall level range appears only on a final draft, which the learner marks
  or which the third round sets automatically; at most three AI rounds per task (draft plus two revisions); a hint
  ladder (locate, name the error type, clue, correction) that starts one rung higher for A1-A2 grammar and opens the
  correction only after the learner has tried a fix in the text; and self-assessment before feedback from stage 7.
  "Looks fixed" is said only when the sentence that held the mistake now has the correction in its place (found by
  the unchanged text around it); any other edit reads "You changed this".
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
- **Ages 16+**: enforced in onboarding and by a database trigger; only the birth year is stored, so age is
  computed from the year alone (someone born late in the year counts as a year older from January: a deliberate
  trade-off for storing less). Onboarding asks for the year without stating the threshold, and a refusal is a
  separate screen that holds for the browser session (`lucid-age-refused` in session storage), so another year
  cannot simply be tried; nothing about the refused person is stored. The only rule specific to under-18s is the
  database forcing marketing consent off (Lucid sends no marketing to anyone); every other default is the same
  for all ages, and `privacy.html`, onboarding and Profile say exactly that. AI processing requires an explicit
  opt-in, stored with a timestamp on the server profile and checked by the edge function.
- **What the privacy page discloses** (`privacy.html`, checked against the code in e2e RL6): speech recognition is
  the browser's service (in Chrome and Edge the audio goes to the browser maker; Lucid gets only text), and the
  preferred voices may be online (the text read aloud goes to that service); the fields each AI route sends
  (writing, roleplay, and the tutor's goals, weak topics, recurring mistake types and last five lessons; never
  the name, email or birth year); what the server keeps about AI requests (no text); that the download does not
  yet include the account email and creation date. Two items are marked on the page as to be filled in before
  public launch: Anthropic's API data retention terms, and the operator's name and contact.
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
  tutor, the learner can delete the conversation on screen and, in one step, all other saved tutor conversations.
  In the Writing lab, "Delete this text" removes a task's text, versions, draft and feedback, and clears the quoted
  mistakes from its attempts (scores and mistake types stay). Roleplay chats cannot be deleted one by one yet (only
  with the whole account or device data).
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
