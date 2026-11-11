# Lucid: final report

Branch `claude/lucid-english-platform`, 2026-10-31. This report says what was researched, what was built, how it was
tested, what needs configuration, and what is still open. Every statement links to a file where it can be checked.

**In one paragraph.** Lucid is a complete, working static web app that teaches English to Hebrew speakers of any age
from the alphabet to C2 research writing, with a real-life track for travel, social situations and work. All 75
lessons, 36 real-life scenarios, 60 expressions, 20 writing exercises, 10 advanced assignments and an 84-item
placement bank exist and pass the content validator. The learning engine (placement, learner model, spaced
repetition, daily plan, evidence-based levels) runs in the browser with no server. Accounts, sync and the AI features
(writing feedback, roleplay, tutor) are fully implemented on Supabase and an Anthropic model, but were tested only
against mocks, because no project or API key was available. Nobody but automated tests and AI-simulated personas has
used Lucid; nothing here shows that real learners learn with it.

## 1. What was researched

Research came first and was verified before it was used. Every team report has a verification log: a second agent
opened the cited sources and corrected or removed what did not hold.

| Team | Report(s) | Method | Verification |
|---|---|---|---|
| A, market and competitors | `research/A-*.md` (4 reports), deliverables 1 and 2 | 17 products profiled from their own pages, store listings and independent reviews; no hands-on accounts | Citations re-opened; vendor claims labelled as such |
| B, user reviews | `research/B-web-reviews.md`, deliverable 3, `research/data/` | 16,143 unique App Store and Google Play reviews collected for 14 apps; 878 coded against a fixed codebook; counts computed by script, not by a model; Trustpilot, Hacker News, Tapuz and press | All 265 quoted review excerpts checked mechanically to be verbatim (265 of 265) |
| C, learning science | `research/C1-memory-practice.md`, `C2-pedagogy-feedback.md`, `C3-hebrew-l1.md`, deliverable 4 | Peer-reviewed studies and meta-analyses on spacing, retrieval, feedback, CEFR, Hebrew-English transfer | 149 sources re-checked; 51 claims corrected, 19 removed or marked unverified; decisions that lost support are now labelled design choices with planned A/B tests (`04-methodology.md` section 5) |
| D, UX | `research/D-ux.md`, deliverable 6 | Design principles, WCAG 2.2, cognitive accessibility, RTL and bidi, dark patterns, minors (ICO code, DSA) | 67 sources re-checked, 21 corrections |
| E, advanced writing | `research/E-advanced-writing.md` | Ten-stage writing curriculum, 12-category rubric, feedback protocol | 73 sources re-checked, 20 corrections, 3 removals |

Limits that apply throughout: Reddit and Stack Exchange were blocked from this environment and are not cited; some
vendor pages returned 403 and are listed as unreadable in each report; no competitor product was used hands-on;
Hebrew-L1 claims are framed as hypotheses where the evidence is indirect.

## 2. What was built

| Area | What it is | Where |
|---|---|---|
| Curriculum | 75 lessons, Pre-A1 10, A1 15, A2 15, B1 12, B2 10, C1 8, C2 5; 1,139 exercises of 12 types; 922 vocabulary entries; 163 Hebrew-speaker pitfalls; a level check and a final writing task per level | `content/`, `js/views/lesson.js`, `js/ui/exercise.js` |
| Placement | Adaptive staircase over 84 items; a level counts only when confirmed by a second block; resumable | `js/core/placement.js`, `js/views/placement.js` |
| Learner model | Topic mastery, recurring errors, per-skill levels from first-try evidence on at least two days; skills without evidence say "not yet assessed" | `js/core/adaptive.js`, `js/core/learner.js` |
| Spaced repetition | FSRS (ts-fsrs), objective grading instead of self-rating, recognition-to-recall ladder, workload governor | `js/core/srs.js`, `js/views/review.js` |
| Word game | Vocabulary quiz and word completion per level in three stages (meaning, English word, typed completion); every answer is marked right or wrong at once; 10 points per right answer; a calm pace by default (nothing moves on by itself, no speed bonus), and an opt-in speed challenge in Settings or on the games hub adds a speed bonus with its own bests; an unfinished round can be resumed; a best round per stage, the next stage opening at 70%; missed words can be replayed or added to review. Practice only: it does not change the learner's level | `js/core/wordgame.js`, `js/views/wordgame.js` |
| Words and pictures | A second game on the same page: English words matched to pictures, 3 boards a round of 4, 5 or 6 pairs; each pair is marked right or wrong the moment it is chosen; 10 points a pair; in the calm default a wrong pair costs nothing and a finished board waits for the learner; in the speed challenge 3 off a mistake and a speed bonus per board; three levels (150 everyday, home and travel, tools and nature words with Hebrew meanings), each opening at 70% accuracy in the one before; missed words can be replayed. The pictures are Lucide icons (ISC licence) chosen to be unambiguous; for screen readers each picture is announced by its Hebrew meaning. Practice only | `content/pictures.json`, `js/core/picturegame.js`, `js/views/picturegame.js`, `tools/build-picture-icons.mjs` |
| Memory game | Cards face down: turn two at a time to find each picture and its English word; 12, 16 or 20 cards over the same three levels; every turn is marked at once; in the calm default a mismatch stays face up until the next tap, the result is pairs in turns with no penalty, a smaller 8-card board is offered at large text, and levels open up to the learner's course level and above it on the picture game's 70%; in the speed challenge a "slip" (a mismatch when the first card's pair had already been seen) costs 3 and few turns earn a bonus; 10 points a pair; slipped words can be replayed. Practice only | `js/core/memorygame.js`, `js/views/memorygame.js` |
| Daily plan | 10, 20, 35 or 50 minutes; warm-up, review, lesson (split into parts when long), targeted practice, a goal-shaped "use it" block; each block says why | `js/core/adaptive.js`, `js/views/today.js` |
| Writing lab | Ten stages, 20 exercises, 10 advanced assignments with invented source packs, free writing as essay, email or message; automatic checks; AI feedback on a 12-category rubric with a task-fulfilment gate, a hint ladder that needs an attempt before the correction, at most three rounds, a CEFR range only on the final draft, version comparison | `js/views/essay.js`, `js/core/writing-analyzer.js`, `supabase/functions/lucid-ai/` |
| Real-Life English | 36 scenarios in 8 modules (airport, hotel, restaurant, transport, shopping, social, emergency, work) with phrases, a model dialogue, scripted practice and AI roleplay; 60 expressions with meaning, formality, region, examples, mistakes and when not to use them | `content/real-life/`, `js/views/scenario.js`, `js/views/slang.js` |
| AI tutor | 8 modes, learner-controlled correction intensity, never writes the learner's work | `js/views/tutor.js`, `supabase/functions/lucid-ai/prompts.ts` |
| Progress | Weekly and monthly reports, levels with their evidence, no XP, no streak pressure | `js/views/progress.js` |
| Accounts and data | Device-only by default; optional Supabase accounts with sync, export (including the account itself and the preferences kept in the browser) and deletion; a restore screen for a backup on a new device; a one-click move of the learner's data to Lucid's own address, off until that address exists; no minimum age (since November 2026), birth year only, protections under 18 and under 16 | `js/core/api.js`, `js/core/session.js`, `js/core/backup.js`, `js/core/move.js`, `supabase/migrations/` |
| Interface | 21 core screens plus help (with a Contact answer), checkpoint, drill, review, account, restore, privacy policy, accessibility statement and a 404 page; Hebrew RTL with isolated English; light and dark; text size up to 150%; offline use; install icons and a share preview | `js/views/`, `css/app.css`, `sw.js`, `privacy.html`, `accessibility.html`, `404.html` |

Stack: static ES modules with no build step in the repository (hosted with the repository's GitHub Pages workflow
today, and ready for Lucid's own address on Vercel, `vercel.json`), IndexedDB on the device, optional Supabase (Postgres with row-level security, Auth, an Edge Function in Deno), and the Anthropic
Messages API from the edge function only (official TypeScript SDK, structured outputs, refusal fallback, cached
prompts). The architecture and its decisions are in `docs/architecture.md`.

## 2a. Speed (2026-11-07)

A speed programme (`perf/plan.json`, results `perf/after.md`, raw numbers `perf/after.json`) measured the app on a
throttled phone profile against the production tree, changed it, and went through seven adversarial review rounds
before release. Numbers are medians of 3 alternated runs in one window; the full tables, the misses and the method
are in `perf/after.md`.

- **What changed.** GitHub Pages now serves a minified build (`tools/build/build.mjs`, checked by `verify.mjs`; the
  deploy falls back to the source tree on any build error). Code is served cache-first from a per-release cache
  checked against `release.json` (128-bit hashes anchored in `sw.js`); a release downloads only what changed and
  keeps saved lessons; content is split into per-item files with generated indexes; modules are preloaded by route.
  `js/core/compat.js` keeps a tab opened on the previous release working, with the age filter, until it reloads.
- **Cold loads, phone:** welcome 2050 → 1511 ms (first paint 2072 → 632 ms), Today 3695 → 1701 ms, reading
  7172 → 2295 ms, level check A1 7320 → 2095 ms.
- **Returning visits, against production `d83a500`:** warm Today 372-405 ms in every HTTP-cache state, against
  460 ms (fresh), 1385 ms (stale), 2120 ms (after a push) and 16481 ms (lie-fi); a heavy-history learner's warm
  Today 681 vs 1084 ms (-37 %; 30-43 % across windows).
- **Not met:** welcome 1511 against a 1450 ms target, the drill route, request counts on two routes, cold Today
  261 KB gz against 180, first-session Today → reading 730-891 ms against 300, and a lesson's warm TBT of 45-61 ms
  against 0 for the base.
- **Security:** the worker was reviewed for S-15 in every round (`qa/security-review.md` 5a); the last round's
  reviewers approved (one with a condition, met by a fix), and the lead signed off.
- **At launch (2026-11-11), against production `c1dac85`:** cold welcome 1548 vs 1497 ms and cold Today 1719 vs
  1682 ms (small costs of the launch changes), warm Today 432 vs 434 ms (`perf/after.md`, "Launch").
- **Known limits, documented in `architecture.md` section 7:** on a nearly full origin some files are fetched
  rather than kept offline; with no `release.json` on a first visit nothing is stored for offline use; the one load
  that hands over to a new release is about 0.85 s slower, once per deploy.

## 2b. Launch (2026-11-11)

The owner asked for a finished product to launch, and decided three things: the operator's name and contact stay a
placeholder until the owner supplies them; Lucid launches without accounts and AI (`supabaseUrl` empty, `aiEnabled`
false); Lucid moves to its own address on Vercel, which does not exist yet. An AI audit in six lenses found 78
problems (AI skeptics checked each); five lanes fixed them and the lead merged them (`qa/fix-log.md`, "Launch
audit": 63 fixed, 11 partial, 2 open, 2 kept). What changed for learners and the operator:

- **Honest about this site.** No terms of use are claimed (onboarding asks only that the privacy policy was read);
  without AI no screen offers the tutor, AI conversations, AI feedback or an AI writing level; counts of lessons and
  scenarios come from the content; the privacy page says AI is not active and nothing is sent to Anthropic, and
  names the web hosts (Vercel, GitHub Pages) that serve the pages and receive the visitor's IP address; Help
  has a Contact answer that says plainly that the address is not published yet. The profile notes for under-16s and
  under-18s describe this site, not accounts it does not have.
- **Published pages.** An accessibility statement (Hebrew and English, facts from the repository only, no claim of
  conformance, legal review pending), a 404 page, and links to both policies from Welcome, Help and Settings.
- **Learner data.** A backup can be restored on a new device from Welcome ("יש לי גיבוי"); the backup also holds the
  browser preferences (never the sign-in session or other account state); a backup this device cannot save is
  refused and leaves its data as it was; after "Delete all data" Welcome stays in the learner's language.
  Once `NEW_HOME` is set, the GitHub Pages copy offers a one-click move of the learner's progress to the new address
  (exact origins, the window it opened and a one-time nonce; nothing is written before the learner confirms), with a
  backup download as the fallback.
- **Own address, ready.** `vercel.json` and `tools/build/vercel-build.mjs` publish only the shipped files, minified
  and verified, with the response headers GitHub Pages cannot send (a CSP with `frame-ancestors`, no framing,
  `nosniff`, a referrer policy and a Permissions-Policy). Accounts and AI can never be switched on at a `*.github.io`
  origin (`js/core/home.js`). Internal docs are no longer published on Pages.
- **Install and share.** PNG and maskable icons, a favicon, theme colours computed from the app's own ground colour,
  a Hebrew title and description, Open Graph and Twitter tags with a share image. Pages stay `noindex` until the
  contact is filled in.
- **Content.** Seven answer-key fixes (among them "to a certain extent" in `c1-03`, "any advice" in `a2-11`, and a
  short-form item that a copied long form used to pass); one final writing task per level, the lesson items renamed
  practice; place names like "Tel-Aviv" and digits for small numbers accepted in learner rewrites up to B1; social
  scenarios no longer coach giving a phone number or a social account to a stranger; "do not type real personal
  details" in every writing step.
- **Hebrew.** An AI proofread fixed 22 findings (plural address, grammar, spelling, one word per concept) and the copy
  check now catches singular address and the fixed phrases. It is not the native review LB-11.
- **AI, ready for later.** With AI still off: the prompts step out of role when a learner discloses distress and the
  app shows a fixed help card with checked Israeli numbers; AI scores can be hidden and are hidden by default (LB-08);
  the client can send a CAPTCHA token (LB-07). Not tested against a live model.
- **CI.** `lucid-verify.yml` runs every suite on the source, built and Vercel trees, the Deno tests and the upgrade
  from the release live at launch (`c1dac85`, served as `87265cced809`). It reports; it does not gate the Pages deploy.

## 3. Status of features

The full table with one status per feature is in `08-product-specification.md`. In short:

- **Built and tested**: everything that runs in the browser, including placement, lessons, review, the daily plan,
  progress, the writing lab's automatic checks, scripted real-life practice, expressions, settings, offline use,
  data export, restore and wipe on the device, and the move to a new address (between three local origins).
- **Built, waiting for the owner**: the Vercel deployment (`vercel.json`, tested with its headers locally) and the
  move banner, which switch on when the project exists and `NEW_HOME` is set.
- **Built, tested with mocks only** (needs configuration, see section 4): accounts, sync, server export and account
  deletion, AI writing feedback, AI roleplay and its report, the AI tutor, the AI safety card, hidden AI scores and
  CAPTCHA. The edge function's logic is covered by 24 Deno tests with injected fakes, the database by 9 tests on PGlite (Postgres in WebAssembly), and the browser
  flows by e2e checks against mocked endpoints. No call was made to a live model or a live Supabase project.
- **Partial**: items listed in `qa/fix-log.md` (7 from round 1, mostly operator actions; 11 from the launch audit,
  all waiting for the owner or a review) and section 15 of the specification.
- **Not built**: see the specification's non-goals and `09-roadmap.md`.

## 4. What needs credentials or decisions before launch

Lucid runs without any of this. The steps are in `docs/setup.md` (section 5 for the launch); the order and owners
are in `09-roadmap.md` section 2, whose status table says what is done. `node tools/launch-check.mjs` lists what the
repository still shows as missing and exits 1 until it is done; on 2026-11-11 it lists exactly the owner's items:
the contact (`privacy.html` has no `mailto:`, `js/core/contact.js` has no email), the placeholder boxes on
`privacy.html` and `accessibility.html`, `noindex` on `index.html`, `privacy.html` and `accessibility.html`, and an
empty `NEW_HOME`.

For the launch, by the owner:

1. Create the Vercel project: import the repository, Root Directory `lucid`, nothing else (`setup.md` 5.1).
2. Supply the operator's name and a contact email: in `js/core/contact.js` and in the boxes of `privacy.html` and
   `accessibility.html`, in Hebrew and English (`tests/unit/contact.test.mjs` fails until they agree), then change
   e2e RL6 to assert the real contact. Nothing was invented in their place.
3. Set `NEW_HOME` in `config.js` to the new https address with a final `/`: the GitHub Pages copy then offers the
   move, the Vercel build adds the canonical link and sitemap, and accounts and AI may run only there.
4. Remove `noindex` from `index.html`, `privacy.html` and `accessibility.html`, after step 2.
5. Optional: in Vercel, require the GitHub checks before production (CI does not gate Vercel's own build, which
   verifies and fails on any error).

Before a public launch to real learners, and before accounts or AI:

6. Legal: the legal basis for children's data and the description of the hosting services (the boxes on
   `privacy.html`), whether Israeli accessibility rules apply
   and what the statement then needs, and terms of use if legal wants them (then a `terms.html` with its own field
   and box; `consent_terms_at` now means "privacy policy acknowledged" and must not be reused).
7. A native Hebrew review (LB-11; the new launch copy too: the banner, restore screen, 404, share text) and a
   qualified teacher's English audit (LB-12).
8. For accounts: a dedicated Supabase project with migrations 001 to 004 and the auth settings in `setup.md`, served
   only from the new address. CAPTCHA keys if wanted (the client is ready; the CSP changes in `index.html` and
   `vercel.json`).
9. For AI: an Anthropic key as an edge-function secret (never in the client), allowed origins, unit limits and a
   spend limit; `privacy.html` must state the provider's retention first (a unit test keeps `aiEnabled` false until
   it does). Nobody reads the "Mark a mistake" marks yet.
10. A live end-to-end run against the real services (LB-10).

## 5. Tests run and results

Run on the launch integration (2026-11-11) and again after the launch-verify fixes (`qa/fix-log.md`, VER-1 to VER-6), on the source tree, on the tree GitHub Pages deploys (minified by
`tools/build/build.mjs`, checked by `verify.mjs`) and, where marked, on the Vercel build served with `vercel.json`'s
headers:

| Suite | Result |
|---|---|
| Unit (`CI=true npm test`) | 512 of 512 pass |
| Database (`npm run test:db`, PGlite) | 13 of 13 pass |
| Edge function (Deno 2.5.6) | type check clean; 24 of 24 pass |
| Content validator and generated files | 0 errors and 1 warning: 817 authored first-try notes give the answer without naming a rule, so the app holds them back before a second try (rewriting them is open content work); the content index, route dependencies and manifest are current; both release fixtures are current |
| Browser end-to-end (`tests/e2e/run.mjs`) | 64 of 64 on the source and the built tree; 65 of 65 on the Vercel build (V1, the 404 page, runs there only) |
| Launch suites (`move`, `launch-honesty`, `launch-content`) | 8, 16 and 5 of them pass on the source and built trees; `move` also on the Vercel build (three local origins) |
| Earlier lane suites (15 files) | all pass on the source and the built tree |
| Speed and upgrade suites | `perf-boot` 13/13 and `perf-runtime` 9/9 on both trees; `upgrade.mjs` 25/25 on both, from `d83a500` (U1-U20) and from `c1dac85`, the release live at launch, built as production serves it (U21) |
| Accessibility (axe-core, WCAG 2.0-2.2 A/AA rules) | 0 violations on 30 routes plus Welcome, onboarding, `privacy.html` and `accessibility.html`, in 5 configurations, on both trees |
| Builds | `verify.mjs`: ok (73 modules); `vercel-build.mjs`: ok (265 files, nothing internal in `dist`; release `d2eaacf41760` after the launch-verify fixes) |
| Launch check (`node tools/launch-check.mjs`) | exits 1 with the owner's items only (section 4) |
| Performance (phone profile, `tools/perf.mjs`) | against production `c1dac85` in one window: cold welcome +51 ms (+3 %) and cold Today +37 ms (+2 %), from counting content on Welcome and the new icons; the first-visit precache +0.55 s (new modules in the offline list); warm and returning visits unchanged within noise (`perf/after.md`, "Launch") |

Three lane tests failed first on the built or Vercel tree and were fixed in the tests (`qa/fix-log.md` INT-11);
of the two timing flakes the lanes reported, RW-12 recurred once under parallel load in the launch verify and its probe
now waits for the layout to settle (VER-6; reproduced by delaying animation frames), and U17 did not recur.

The mapping from each acceptance criterion to its checks, and which are covered only with mocks, is in section 13 of
the specification.

## 6. Quality assurance

- **Security review** (`qa/security-review.md`): 18 findings, each tried by a second reviewer: 17 confirmed, 1 false
  positive. Fixed: login CSRF via email links, an atomic AI unit reservation with a project budget, per-account
  storage quotas, RLS that requires a profile, a targeted device wipe, shared-device ownership, a versioned service
  worker, byte-counted request limits, escaping of prompt wrappers and others. Still partial (operator actions or
  scoped follow-ups): own origin, CAPTCHA, operator contact, server-side scenario text.
- **Persona panels** (`qa/persona-panels.md`): eight personas played by an AI drove the real app in two rounds.
  Round 1 found 85 issues (1 blocker, 38 major); all were fixed or partly fixed (`qa/fix-log.md`). In round 2 the
  same personas re-tested every finding (71 resolved, 21 partly resolved, none regressed) and found 43 new issues
  (6 major, none blocking); all 64 round 2 items are fixed (`qa/fix-log-r2.md`). These are simulated reviews, not
  user research.
- **UX round 3** (`qa/ux-round3.md`): fifteen AI-simulated panels (two designers, three UX specialists, six
  learners aged 16 to 68, four teachers) used the real app and reported 247 findings; nine lanes fixed them; the same
  panels re-tested (156 fixed, 79 partly, 12 not fixed, of which 10 were deferred on purpose, none regressed) and
  found 153 new issues (18 major); a final round of six lanes fixed 77 planned items, all majors included. Simulated
  reviews, not user research.
- **Content review**: every lesson, scenario, expression and writing task was written by one AI agent and reviewed by
  another that solved each item before reading its key, checked keys against the app's real grader, and corrected
  English, Hebrew and level. The real-life practice options were rewritten so the best reply is no longer usually
  the longest (it was in 77-95% of turns; now about a third), and the validator warns if that cue returns. A content-wide test checks that no authored wrong answer is accepted. No human teacher
  or native Hebrew editor has reviewed the content yet.
- **Specification review**: writing the specification from the code found 8 further defects (contrast at B1 and C1,
  an unreachable Profile, an unkept promise in onboarding and others), all fixed.

## 7. Assumptions made

The brief asked for no questions, so these were decided and are recorded here:

- The product name "Lucid" and the visual direction (a dual-legend Hebrew/English keyboard) are working choices.
- Static hosting with optional Supabase and Anthropic, rather than a server framework, so the core works with no
  configuration and offline (ADR-1 in `architecture.md`).
- Default model `claude-opus-5-5`, configurable with `LUCID_MODEL`.
- ~~Learners must be 16 or older~~ (replaced, see below); only the birth year is stored; under-18s cannot opt into
  marketing.
- British spelling in explanations; US and UK variants are both taught where they differ.
- Content is original: invented people, places and sources, labelled as invented; no real exam items.
- Speaking is practice, never graded by speech recognition; Lucid does not claim to assess speaking level.

**No age limit (owner's decision, 7 November 2026: "תעשה שאין הגבלת גיל").** There is no minimum age any more;
anyone of any age can register. The decision came without details, so these were assumed and are recorded here
(the change itself is in `docs/qa/fix-log.md`, "No age limit"):

- The year of birth is still asked, and only the year (data minimisation), because protections depend on age. The
  list covers this year and the 110 years before it. Only the year is known, so the real age is the current year
  minus the birth year, or one less before the birthday. The sanity bound (at most 120) uses the older value, so
  nobody is turned away; the protections use the younger one (first version used the older one, so a 15-year-old
  born in December counted as 16; fixed after review), in the app and in the trigger alike.
- Age is decided when it is used (`js/core/age.js`), not from the `minor` flag frozen at onboarding, which is still
  written for compatibility.
- Under 18 nothing new: marketing consent stays forced off in the database, and Lucid sends no marketing anyway.
- Under 16 is the new group. Two protections were added: (1) content flagged `sensitive` (offensive, vulgar, sexual,
  alcohol) is not shown; no item is flagged today, so today this hides nothing, and the mechanism is tested with a
  test entry; (2) where data would leave the device (an account and its sync, or AI feedback), one required box
  records that a parent or guardian agreed, with its time. It is self-declared, like the birth year.
- The ages 16 and 18 were kept as the thresholds because the code and the docs already used them; whether 16 is
  the right age for the guardian box, and whether a ticked box is a sufficient legal basis, must be reviewed
  before a public launch (`privacy.html` and roadmap LB-04 say so). The live site has no accounts and no AI, so
  there nothing leaves the device and the box never appears.
- The browser's own speech services (recognition in Chrome and Edge, online voices) are not behind the guardian box:
  the microphone already has its own notice and is optional, and `privacy.html` describes these services for every
  age. This is left for the legal review.
- A learner under 16 who signs up before onboarding sends only the email and password to the sign-in service (the
  age is not known yet); the profile and progress are not sent until the box is ticked. Onboarding offers the box
  when signed in but does not require it: finishing without it keeps the account's sync paused and the progress
  on the device, and Settings takes the agreement later (a required box there would have been a hidden refusal).
  `privacy.html` says this in both languages.
- A second device adopts the agreement (and the terms consent) from the server profile, and Settings says sync is
  paused only when the last profile check paused it for that reason.
- The in-app notes for under-16s say only that content flagged as not suitable for the age is hidden; the list of
  flags is in `privacy.html` and the docs, with the fact that no item carries one today (a unit test keeps that
  sentence true).
- The roleplay prompt no longer forbids asking for personal details outright, because some scenes need an
  address or a passport number: the partner asks for invented ones and never real ones. The roleplay and tutor
  screens say not to type real personal details. Not tested against the live model.
- Profiles created under the old 16+ rule whose year is now treated as possibly under 16 keep syncing, because
  `session.js` creates the server profile only once; if such a profile is updated, the trigger asks for the
  agreement. Accounts are off on the live site, so no such profile exists there.
- The AI prompts no longer say "16+": every prompt asks for output suitable for a child, whoever the learner is,
  because the birth year is never sent to the model. Not tested against the live model.
- The new database rule is migration `004_lucid_no_age_limit.sql`, not `003_...` as first planned, because
  `003_lucid_export_account.sql` already exists; 001 and 002 were not edited. Re-running 001 alone would bring the
  old guard back, so `setup.md` says to run the files in order, 004 last.
- Research, persona and panel documents are left as they were: they record past work done when the limit was 16+.

## 8. Known limitations

- No real learner has used Lucid; efficacy, retention and placement accuracy are unmeasured.
- AI features have never run against a live model; their quality and cost are unknown until they do.
- Browser speech synthesis and recognition vary by device and send audio to the browser vendor's service.
- All content was authored and reviewed by AI agents; it needs a human teacher's and a native Hebrew editor's review.
- In the workplace scenarios the best reply is still the middle-length option in 16 of 30 turns, and one character
  name (Priya) is used for two different people in neighbouring scenarios.
- Until the owner creates the Vercel project and sets `NEW_HOME`, Lucid runs on the GitHub Pages origin it shares with
  other sites; accounts and AI cannot be switched on there (by design), and a learner's progress lives only in that
  origin's browser storage until it is moved or backed up.
- Until the owner supplies a contact, nobody can be reached from the app, the privacy policy and the accessibility
  statement say so, and the pages stay out of search engines.
- The accessibility statement records automated checks only (axe, text size); no assistive-technology user has
  tested Lucid, and legal review of the statement is pending.
- The install icons were not checked on a real iOS or Android device; the manifest has no screenshots.
- With JavaScript off, a mistyped `/desktop-tutorial/lucid/...` address still follows the shared site's 404 redirect
  (the root `404.html` belongs to the shared site).
- The AI safety card, CAPTCHA and hidden AI scores are tested with mocks only; the help numbers were checked on
  11 November 2026 and should be re-checked before AI is turned on.
- The remaining partial items are listed in `qa/fix-log.md`, `qa/fix-log-r2.md` and section 15 of the specification.

## 9. Next phase

`09-roadmap.md` orders the work: launch blockers first (section 4 above), then a small consented pilot with real
learners to measure delayed retention, placement calibration and AI feedback accuracy against a human-rated set,
then improvements chosen by that evidence.
