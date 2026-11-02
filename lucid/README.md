# Lucid

An English course for Hebrew-speaking learners aged 16 and over, from the alphabet (Pre-A1) to C2 argumentative and
research writing, with a second track of real-life English (travel, social situations, work, slang). The interface
is in Hebrew for beginners and can switch to English as the level rises.

Lucid is a static web app (ES modules, no build step) that works on its own in the browser. Accounts and sync
(Supabase) and AI feedback (an Anthropic model behind a Supabase Edge Function) are optional and need configuration;
without them everything else works and AI screens say plainly that AI is not set up.

**Status.** Built and tested with automated tests; never used by real learners. Accounts, sync and every AI feature
were tested only against mocks (no live Supabase project or API key was available). Levels shown in the app are
"Lucid estimates, aligned to CEFR descriptors", not certificates. See `docs/FINAL-REPORT.md`.

## Run it

```
cd lucid
python3 -m http.server 8765        # then open http://localhost:8765/
```

Nothing else is needed for device-only mode. To enable accounts and AI, follow `docs/setup.md`.

## Tests

```
npm install                        # test tools only (PGlite, axe-core)
npm test                           # unit tests
npm run test:db                    # database migrations, RLS and functions on PGlite
npm run test:e2e                   # browser end-to-end checks (Playwright/Chromium)
node tests/e2e/a11y.mjs            # axe-core accessibility audit
npm run validate                   # content validator
node tools/inventory.mjs           # content counts against the brief's minimums
```

Edge function tests: `cd supabase/functions/lucid-ai && deno test --allow-env --allow-net --allow-read handler_test.ts`.

## Where things are

| Path | What |
|---|---|
| `index.html`, `js/`, `css/`, `sw.js` | The app: router, views, learner model, spaced repetition, grading, offline support |
| `content/` | Curriculum (75 lessons), placement bank, real-life scenarios and expressions, writing lab, taxonomy |
| `supabase/` | Database migrations (RLS, age gate, quotas, export, deletion) and the `lucid-ai` edge function |
| `tools/` | Content validator, manifest builder, inventory, research data collectors |
| `tests/` | Unit, database and browser tests |
| `docs/` | Research, specification, architecture, setup, QA |

## Deliverables

| # | Deliverable | File |
|---|---|---|
| 1 | Market research report | `docs/research/01-market-research.md` |
| 2 | Competitor comparison matrix | `docs/research/02-competitor-matrix.md` |
| 3 | User review analysis | `docs/research/03-user-review-analysis.md` (data: `docs/research/data/`) |
| 4 | Learning methodology report | `docs/research/04-methodology.md` |
| 5 | Product differentiation strategy | `docs/research/05-differentiation-strategy.md` |
| 6 | UX and UI recommendations | `docs/research/06-ux-recommendations.md` |
| 7 | Technical architecture | `docs/architecture.md` |
| 8 | Complete product specification | `docs/08-product-specification.md` |
| 9 | Prioritised roadmap | `docs/09-roadmap.md` |
| - | Final report | `docs/FINAL-REPORT.md` |

Team research reports behind deliverables 1-6: `docs/research/A-*.md` (competitors), `B-web-reviews.md`,
`C1-memory-practice.md`, `C2-pedagogy-feedback.md`, `C3-hebrew-l1.md`, `D-ux.md`, `E-advanced-writing.md`.
QA: `docs/qa/` (security review, simulated persona panels, fix logs).
