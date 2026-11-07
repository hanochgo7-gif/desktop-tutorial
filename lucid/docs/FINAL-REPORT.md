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
| Accounts and data | Device-only by default; optional Supabase accounts with sync, export (including the account itself) and deletion; no minimum age (since November 2026), birth year only, protections under 18 and under 16 | `js/core/api.js`, `js/core/session.js`, `supabase/migrations/` |
| Interface | 21 core screens plus help, checkpoint, drill, review, account and privacy; Hebrew RTL with isolated English; light and dark; text size up to 150%; offline use | `js/views/`, `css/app.css`, `sw.js` |

Stack: static ES modules with no build step (hosted with the repository's GitHub Pages workflow), IndexedDB on the
device, optional Supabase (Postgres with row-level security, Auth, an Edge Function in Deno), and the Anthropic
Messages API from the edge function only (official TypeScript SDK, structured outputs, refusal fallback, cached
prompts). The architecture and its decisions are in `docs/architecture.md`.

## 3. Status of features

The full table with one status per feature is in `08-product-specification.md`. In short:

- **Built and tested**: everything that runs in the browser, including placement, lessons, review, the daily plan,
  progress, the writing lab's automatic checks, scripted real-life practice, expressions, settings, offline use,
  data export and wipe on the device.
- **Built, tested with mocks only** (needs configuration, see section 4): accounts, sync, server export and account
  deletion, AI writing feedback, AI roleplay and its report, the AI tutor. The edge function's logic is covered by
  20 Deno tests with injected fakes, the database by 9 tests on PGlite (Postgres in WebAssembly), and the browser
  flows by e2e checks against mocked endpoints. No call was made to a live model or a live Supabase project.
- **Partial**: items listed in `qa/fix-log.md` (7, mostly operator actions) and section 15 of the specification.
- **Not built**: see the specification's non-goals and `09-roadmap.md`.

## 4. What needs credentials or decisions before launch

Lucid runs without any of this; these switch on accounts and AI and make a public launch responsible. The steps are
in `docs/setup.md`; the order and owners are in `09-roadmap.md`.

1. A dedicated Supabase project with migrations 001, 002, 003 and 004, and the auth settings in `setup.md`.
2. An Anthropic API key stored as an edge-function secret (never in the client), the allowed origins, the per-learner
   and project-wide AI unit limits, and a spend limit in the Anthropic console.
3. Lucid served from its own origin before accounts are enabled (the GitHub Pages address is shared with other apps).
4. The operator's name and contact on the privacy page (a marked placeholder now), and a legal and minors review,
   including the legal basis for children's data now that there is no minimum age (a marked placeholder too).
5. CAPTCHA keys and the client change to send the token (documented, not built).
6. A live end-to-end run against the real services, and a native Hebrew review of all Hebrew text.

## 5. Tests run and results

Run on the final tree:

| Suite | Result |
|---|---|
| Unit (`npm test`, 24 files) | 302 of 302 pass |
| Database (`npm run test:db`, PGlite) | 9 of 9 pass |
| Edge function (Deno) | 20 of 20 pass |
| Browser end-to-end (`tests/e2e/run.mjs`) | 56 of 56 checks pass, covering the brief's 17 acceptance criteria and the QA findings |
| UX round 3 browser suites (`tests/e2e/<lane>.mjs`, 15 files) | 226 of 226 checks pass; each final-round check was also run once against the code without its fix and failed there |
| Accessibility (axe-core, WCAG 2.0-2.2 A/AA rules) | 0 violations on 29 routes plus Welcome and onboarding, in 5 configurations (Hebrew and English interface, light and dark, phone and desktop, Hebrew support full, minimal and off) |
| Content validator | 75 lessons and every content file: 0 errors and 1 warning: 818 authored first-try notes give the answer without naming a rule, so the app holds them back before a second try (rewriting them is open content work) (the checks include the checks for split brackets and quote marks and for answer-length cues) |
| Performance (throttled 1.6 Mbps, 150 ms, 4x CPU, no compression) | first visit to Welcome ready in about 2.9 s, 374 KB uncompressed (GitHub Pages serves it compressed); repeat visits and offline use come from the service worker |

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
  list covers this year and the 110 years before it. Age is still the current year minus the birth year.
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
- A learner under 16 who signs up before onboarding sends only the email to the sign-in service; the profile and
  progress are not sent until the box is ticked (onboarding asks for it when signed in).
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
- The remaining partial items are listed in `qa/fix-log.md`, `qa/fix-log-r2.md` and section 15 of the specification.

## 9. Next phase

`09-roadmap.md` orders the work: launch blockers first (section 4 above), then a small consented pilot with real
learners to measure delayed retention, placement calibration and AI feedback accuracy against a human-rated set,
then improvements chosen by that evidence.
