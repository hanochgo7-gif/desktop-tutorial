# Lucid: final report

Branch `claude/lucid-english-platform`, 2026-10-31. This report says what was researched, what was built, how it was
tested, what needs configuration, and what is still open. Every statement links to a file where it can be checked.

**In one paragraph.** Lucid is a complete, working static web app that teaches English to Hebrew speakers aged 16+
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
| Daily plan | 10, 20, 35 or 50 minutes; warm-up, review, lesson (split into parts when long), targeted practice, a goal-shaped "use it" block; each block says why | `js/core/adaptive.js`, `js/views/today.js` |
| Writing lab | Ten stages, 20 exercises, 10 advanced assignments with invented source packs, free writing as essay, email or message; automatic checks; AI feedback on a 12-category rubric with a task-fulfilment gate, a hint ladder that needs an attempt before the correction, at most three rounds, a CEFR range only on the final draft, version comparison | `js/views/essay.js`, `js/core/writing-analyzer.js`, `supabase/functions/lucid-ai/` |
| Real-Life English | 36 scenarios in 8 modules (airport, hotel, restaurant, transport, shopping, social, emergency, work) with phrases, a model dialogue, scripted practice and AI roleplay; 60 expressions with meaning, formality, region, examples, mistakes and when not to use them | `content/real-life/`, `js/views/scenario.js`, `js/views/slang.js` |
| AI tutor | 8 modes, learner-controlled correction intensity, never writes the learner's work | `js/views/tutor.js`, `supabase/functions/lucid-ai/prompts.ts` |
| Progress | Weekly and monthly reports, levels with their evidence, no XP, no streak pressure | `js/views/progress.js` |
| Accounts and data | Device-only by default; optional Supabase accounts with sync, export (including the account itself) and deletion; age gate 16+, birth year only | `js/core/api.js`, `js/core/session.js`, `supabase/migrations/` |
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

1. A dedicated Supabase project with migrations 001, 002 and 003, and the auth settings in `setup.md`.
2. An Anthropic API key stored as an edge-function secret (never in the client), the allowed origins, the per-learner
   and project-wide AI unit limits, and a spend limit in the Anthropic console.
3. Lucid served from its own origin before accounts are enabled (the GitHub Pages address is shared with other apps).
4. The operator's name and contact on the privacy page (a marked placeholder now), and a legal and minors review.
5. CAPTCHA keys and the client change to send the token (documented, not built).
6. A live end-to-end run against the real services, and a native Hebrew review of all Hebrew text.

## 5. Tests run and results

Run on the final tree:

| Suite | Result |
|---|---|
| Unit (`npm test`, 18 files) | 142 of 142 pass |
| Database (`npm run test:db`, PGlite) | 9 of 9 pass |
| Edge function (Deno) | 20 of 20 pass |
| Browser end-to-end (`tests/e2e/run.mjs`) | 52 of 52 checks pass, covering the brief's 17 acceptance criteria and the QA findings |
| Accessibility (axe-core, WCAG 2.0-2.2 A/AA rules) | 0 violations on 24 routes plus Welcome and onboarding, in 5 configurations (Hebrew and English, light and dark, phone and desktop, Pre-A1, B1 and C1) |
| Content validator | 75 lessons and every content file: 0 errors |
| Performance (throttled 1.6 Mbps, 150 ms, 4x CPU) | first visit ready in about 2.3 s, 264 KB uncompressed; repeat visits from the service worker |

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
- **Content review**: every lesson, scenario, expression and writing task was written by one AI agent and reviewed by
  another that solved each item before reading its key, checked keys against the app's real grader, and corrected
  English, Hebrew and level. A content-wide test checks that no authored wrong answer is accepted. No human teacher
  or native Hebrew editor has reviewed the content yet.
- **Specification review**: writing the specification from the code found 8 further defects (contrast at B1 and C1,
  an unreachable Profile, an unkept promise in onboarding and others), all fixed.

## 7. Assumptions made

The brief asked for no questions, so these were decided and are recorded here:

- The product name "Lucid" and the visual direction (a dual-legend Hebrew/English keyboard) are working choices.
- Static hosting with optional Supabase and Anthropic, rather than a server framework, so the core works with no
  configuration and offline (ADR-1 in `architecture.md`).
- Default model `claude-opus-5-5`, configurable with `LUCID_MODEL`.
- Learners must be 16 or older; only the birth year is stored; under-18s cannot opt into marketing.
- British spelling in explanations; US and UK variants are both taught where they differ.
- Content is original: invented people, places and sources, labelled as invented; no real exam items.
- Speaking is practice, never graded by speech recognition; Lucid does not claim to assess speaking level.

## 8. Known limitations

- No real learner has used Lucid; efficacy, retention and placement accuracy are unmeasured.
- AI features have never run against a live model; their quality and cost are unknown until they do.
- Browser speech synthesis and recognition vary by device and send audio to the browser vendor's service.
- All content was authored and reviewed by AI agents; it needs a human teacher's and a native Hebrew editor's review.
- The remaining partial items are listed in `qa/fix-log.md`, `qa/fix-log-r2.md` and section 15 of the specification.

## 9. Next phase

`09-roadmap.md` orders the work: launch blockers first (section 4 above), then a small consented pilot with real
learners to measure delayed retention, placement calibration and AI feedback accuracy against a human-rated set,
then improvements chosen by that evidence.
