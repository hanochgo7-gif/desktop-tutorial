# Deliverable 8: Complete product specification

This document specifies Lucid as it is built at commit `ae58048` (branch `claude/lucid-english-platform`),
checked on 2026-10-31. It was first written at commit `f8a202c` and has been updated for everything committed
since then (`git log f8a202c..HEAD`: persona panel round 2 fixes in `docs/qa/fix-log-r2.md`, the "At work"
module and workplace expressions, text types in free writing, contrast fixes and 14 new browser checks). While it
was updated, three source files of the scenario content (`content/real-life/parts/scenarios-1.json`, `-2.json`,
`-3.json`) had uncommitted wording edits made by another lane. They are not merged into
`content/real-life/scenarios.json`, the file the app loads, which is unchanged from the commit, so they are not
part of what is described here. It describes the product that exists, not the product that is planned. Every
statement about Lucid was checked against the code (`js/`, `css/`, `index.html`, `sw.js`, `supabase/`), the
content (`content/`) or the tests (`tests/`, `supabase/functions/lucid-ai/handler_test.ts`).

Two facts frame everything below:

- **No real learner has used Lucid.** Nothing here is a learning outcome, and no feature is described as
  helping learners. The findings in `docs/qa/fix-log.md` and `docs/qa/fix-log-r2.md` came from a security review
  and two rounds of a simulated persona panel whose personas were played by an AI. They are QA input, not user
  research.
- **No live service was used.** This build has no Supabase project and no Anthropic API key
  (`config.js`: `supabaseUrl: ''`, `aiEnabled: false`). Accounts, sync, server export and deletion, AI writing
  feedback, AI roleplay and the AI tutor have only been tested against stand-ins.

Levels in Lucid are Lucid estimates aligned to CEFR descriptors (on screen, the string `level.estimate` in
`js/core/i18n.js`: "Lucid estimate, aligned to CEFR descriptors"). They are not certificates. The course contains
C2 lessons, but neither the course nor this document promises that a learner will reach C2 or any other level
(`js/views/progress.js` says so on screen).

## How to read this document

### Status labels

Each feature carries one status.

| Status | Meaning |
|---|---|
| **Built and tested** | The code exists and a named automated test covers it. The test was run on 2026-10-31 unless the entry says otherwise. |
| **Built, tested with mocks only** | The feature needs a Supabase project or an Anthropic API key. Its tests replace the server, database or model with stand-ins. It has never run against a live service. |
| **Partial** | Part of it exists; the entry says what is missing. Code that exists but that no automated test covers is also reported as Partial ("no test"), because a feature is not described as working without a test. |
| **Not built** | Planned or promised somewhere, but no code exists. |

### Test references

| Short form | Meaning |
|---|---|
| `e2e 7`, `e2e L5`, `e2e PS3`, `e2e RW2` ... | The check with that id in `tests/e2e/run.mjs` (Playwright, Chromium; 52 checks). Accounts and AI run against a mock Supabase and a mock `lucid-ai` function injected by request interception (`installMockServer`). |
| `unit <file>: "<name>"` | A test in `tests/unit/<file>.test.mjs` (Node test runner; 141 tests in 18 files). |
| `db: "<name>"` | A test in `tests/db/schema.test.mjs`: the migrations applied to PGlite (Postgres in WASM) with Supabase roles and default privileges simulated. It is real Postgres, but not a Supabase project, and has one connection. |
| `deno: "<name>"` | A test in `supabase/functions/lucid-ai/handler_test.ts` (20 tests), with a fake Claude client and fake auth and database functions. **None was run for this document**: Deno is not installed here. `docs/qa/fix-log-r2.md` reports 20 of 20 passing on 2026-10-31. |
| `axe` | `tests/e2e/a11y.mjs`: axe-core on 24 routes, plus Welcome and the first onboarding step before a learner exists, in 5 configurations (section 11.1). |

### Verification snapshot (2026-10-31)

| Suite | Command | Result |
|---|---|---|
| Browser acceptance tests | `cd lucid && E2E_PORT=8841 node tests/e2e/run.mjs` | **52 of 52 checks pass** (run on 2026-10-31 while this document was updated; no page errors reported) |
| Unit tests | `npm test` | 141 of 141 pass |
| Database tests | `npm run test:db` | 9 of 9 pass |
| Content validator | `npm run validate` | 75 lesson files plus the placement, scenario, expression and writing files; 0 errors, 0 warnings |
| Accessibility audit | `A11Y_PORT=8846 node tests/e2e/a11y.mjs` | 0 violations across 24 routes, plus Welcome and the first onboarding step, x 5 configurations |
| Edge-function tests | `deno test ...` | **Not run here**: Deno is not installed in this environment. `docs/qa/fix-log-r2.md` reports 20 of 20 passing on 2026-10-31. |
| Content inventory | `node tools/inventory.mjs` | Section 14 |

---

## 1. Product summary

### 1.1 Who Lucid is for

Lucid is an English course for Hebrew speakers aged 16 and over, taught from Hebrew. It covers learners
who cannot yet read the Latin alphabet through to learners who must write argumentative essays and
research-based papers in English (`PRODUCT.md`, Users). The typical situations in `PRODUCT.md` (a high-school
student preparing for the Bagrut, a university student, a working adult, a traveller) are marked there as
inferred: the owner did not confirm them, and no learner was interviewed.

### 1.2 Who Lucid is not for

| Not for | Why, as built |
|---|---|
| Anyone under 16 | Onboarding refuses under-16s and the database rejects their profile (section 2.1). |
| Learners who need a certificate or an exam score (IELTS, TOEFL, Bagrut, AMIRNET) | Lucid gives estimates only and has no score predictor (`docs/research/04-methodology.md`, section 2). |
| Learners motivated mainly by streaks, points and competition | No streak, XP, league or leaderboard code exists (a code search for these terms in `js/` finds "streak" only in copy that says there is none, in `onboarding.js` and `welcome.js`, and "xp-" only as element ids in `slang.js`). |
| Learners who want an accent score or accent reduction | Speech recognition is shown as "what was recognised", never as a score (section 5.6). |
| Learners who want live conversation with a person | Lucid has no human tutors. |
| People who want a tool that fixes text they must submit | The AI prompts tell the model not to rewrite learner text; for writing feedback the server also drops corrections much longer than the quoted span. Nothing in code checks tutor or roleplay replies (sections 6.4 and 8.4). |
| Learners whose first language is not Hebrew | Explanations, contrast notes and the interface are written for Hebrew speakers. |

### 1.3 The two tracks

| Track | What it contains | Where |
|---|---|---|
| **English Mastery** | A path of 75 lessons from Pre-A1 to C2 in 7 levels, a level check and a final writing task per level, spaced vocabulary review, targeted drills, the practice labs (vocabulary, grammar, reading, listening, speaking), a 10-stage Writing lab with 20 exercises and 10 assignments, and the AI tutor | `#/today`, `#/path`, `#/practice` and the lab routes; `content/curriculum.json`, `content/lessons/`, `content/writing/` |
| **Real-Life English** | 36 scenarios in 8 modules (six travel modules, social, and "At work"), each with phrases, a model dialogue, scripted practice and an optional AI roleplay; 60 expressions (48 informal or very informal, 12 neutral), 10 of them workplace expressions; a Conversations list of every scenario as an AI roleplay | `#/real-life`, `#/scenario/:id`, `#/expressions`, `#/conversations`; `content/real-life/` |

Real-life scenarios are open at every course level (`js/views/reallife.js`). From A1 and a 20-minute plan,
a travel, conversation or work goal puts a real-life scenario into the daily plan when one fits the course level
(section 5.4; the workplace scenarios start at A2).

### 1.4 Principles and how the build reflects them

| Principle (`PRODUCT.md`) | How the build reflects it |
|---|---|
| Demonstrated ability over activity | Skill levels come only from evidence at that level, with thresholds (section 5.2). Progress shows no points and no score for time spent (`js/views/progress.js`). |
| Teach, don't tell | Hints before answers in lessons; writing feedback that asks the learner to fix each mistake and opens the correction only after an attempt (section 6.5); the tutor prompt forbids writing the learner's work (section 8). |
| Respect the adult | No loss-framed streaks, no energy or hearts, no ads; a weekly goal where "a day off erases nothing" (`js/views/today.js`, `js/views/onboarding.js`). |
| Hebrew as scaffolding, English as the destination | Hebrew support fades by course level and stays one tap away (section 5.5). |
| Useful today | Daily plans of 20 minutes or more include a "use it" block (speaking, writing or reading); from A1, the learner's goals choose it (section 5.4). |

### 1.5 What makes it different

The differentiation strategy is in `docs/research/05-differentiation-strategy.md` (deliverable 5). Its
differentiators D1 to D11 map to this build as follows. Statuses in that document describe an earlier
snapshot (58 lesson files, no writing exercise bank); the statuses in this specification supersede them.

| Differentiator (05) | Where it is specified here |
|---|---|
| D1 Hebrew from the first letter | Section 4 (Pre-A1 lessons), section 5.5 |
| D2 Hebrew that fades on schedule | Section 5.5 |
| D3 Writing feedback that makes the learner do the fixing | Section 6.5 |
| D4 A bounded rubric that is open about uncertainty | Section 6.4 |
| D5 A path to C1-C2 argumentative writing | Sections 4.5 and 6 |
| D6 Levels that come from evidence | Section 5.2 |
| D7 A memory and mistake engine | Sections 5.2 and 5.3 |
| D8 Speaking feedback about being understood | Section 5.6 |
| D9 Real-life English usable without AI | Section 7 |
| D10 Calm motivation | Sections 1.4 and 9 |
| D11 Trust and control of data | Section 10 |

05 also limits how the positioning may be used: the research supports "none of the 17 products profiled
teaches English from Hebrew from zero", not "the only", and no differentiator may be presented as a
learner benefit until the proof points in its section 5 have been measured.

---

## 2. Users and constraints

### 2.1 Age gate (16+)

| Feature | Behaviour | Status |
|---|---|---|
| Neutral birth-year question | Step 1 of onboarding asks for the year of birth from a list with an empty "Choose" option. The help text says only the year is stored and does not state the threshold (`js/views/onboarding.js`). | Built and tested: `e2e 1` asserts the threshold is not shown before the answer |
| Refusal | An age under 16 (computed from the year alone) shows a separate refusal screen. The refusal holds for 24 hours in this browser, also in a new tab (`lucid-age-refused` in local storage holds only the time of the refusal), so another year cannot simply be tried. Nothing about the refused person is stored. | Built and tested: `e2e 1` (a new tab, the stored value, the end of the 24 hours) |
| Server enforcement | The `lucid_profiles_guard` trigger rejects a birth year that makes the person under 16 or over 120 (`supabase/migrations/001_lucid_core.sql`). Learner records need a profile, so a refused account stores nothing. | Built and tested on PGlite: `db: "age gate, minors and RLS on profiles"`, `db: "records need a profile: a refused or missing profile stores nothing (S-05)"` |
| Age from the year only | Someone born late in the year counts as a year older from 1 January. This is a deliberate trade-off for storing less, stated in `privacy.html`. | Built and tested as part of the age gate: `e2e 1`, `db: "age gate, minors and RLS on profiles"` |

### 2.2 Learners aged 16 and 17

What is different for them, as built:

| Difference | Status |
|---|---|
| For accounts, the database forces `marketing_opt_in` to false for anyone under 18. Lucid sends no marketing to anyone, so this has no visible effect today. | Built and tested on PGlite: `db: "age gate, minors and RLS on profiles"` |
| Onboarding (privacy step) and Profile show an under-18 notice that says exactly this, and that every other default is the same for all ages. `privacy.html` says the same. | Built and tested in part: `e2e RL6` checks that `privacy.html` says it "refuses marketing consent", that Profile mentions marketing for a 17-year-old and that neither screen claims stricter settings. No assertion reads the onboarding notice itself. |
| The profile record stores a `minor` flag on the device (`onboarding.js`, `finish()`). | Partial: stored, but no code reads it |

Nothing else differs by age. AI feedback is off by default for everyone; the roleplay and tutor prompts
ask for content "appropriate for a 16-year-old" for every learner (`supabase/functions/lucid-ai/prompts.ts`).
Extra under-18 defaults recommended by the UX research (no weekly goal by default, a break suggestion after
45 minutes, age-specific AI explanations; `docs/research/06-ux-recommendations.md`, D53) are **Not built**.

`PRODUCT.md`, the comment on `lucid_profiles` in migration 001, the code, `privacy.html`, onboarding and
`docs/architecture.md` section 6 now agree that marketing consent is the only difference (the earlier "protective
defaults" wording in `PRODUCT.md` and the migration comment was corrected after commit `f8a202c`).

### 2.3 Right-to-left and bidirectional text

| Feature | Behaviour | Status |
|---|---|---|
| Interface language | Hebrew (right to left, the default) or English (left to right), chosen in onboarding and Settings. `setUiLang` sets `lang` and `dir` on the document (`js/core/i18n.js`). | Built and tested: `e2e 14-15` checks both languages on Welcome and onboarding |
| Suggestion to switch to an English interface | Onboarding says Lucid will suggest switching to English as the level rises. From course level B1, Today shows a banner to a learner with the Hebrew interface ("An English interface is extra daily practice, and you can switch back in Settings at any time") with "Switch to English" and "Not now". "Not now" hides it until the course level rises again; it is never shown again after the learner switches (`js/views/today.js`, `ui_switch_answered`). | Partial: built, no test |
| Learning content | The shared renderers (`bi()` and `legend()` in `js/core/i18n.js`, the lesson and exercise views) mark English learning material `lang="en" dir="ltr"` and Hebrew explanations `lang="he" dir="rtl"`. Listening transcripts, review examples, recognised speech, long answers, final-task topics and "Must include" lists are separate left-to-right blocks. No test checks every screen. | Built and tested for lessons and the essay editor: `e2e PS7` (English blocks left-aligned, tables laid out from their first column), `e2e PL6` (the transcript is a left-to-right block), `e2e RW3` (final-task topics and "Must include" read left to right) |
| English inside Hebrew | `isolateLatin()` wraps each English run inside Hebrew text in `<bdi dir="ltr" lang="en">`, keeping the English punctuation with the English and the Hebrew punctuation (a prefix hyphen, a colon, the final full stop) with the Hebrew. A bracket pair stays together: both brackets inside the English, or both with the Hebrew. Error-type notes and vocabulary glosses also go through it. The content validator warns when an isolate would hold half of a bracket pair (no warning on the current content). | Built and tested: `unit i18n` (5 isolation tests, including "bracket pairs stay together: both inside the English, or both with the Hebrew" and "no isolate ever holds half of a bracket pair"), `e2e RL5` (rendered positions), `e2e PL1` (brackets in a verdict and a key point) |
| Dual legends | Titles show the English target and the Hebrew scaffold in two inks; a "Hebrew" line with no Hebrew letters is left out. | Built and tested: `unit i18n: "a legend leaves out a \"Hebrew\" line that is not Hebrew"`, `e2e RL5` |
| Placeholders | A Hebrew placeholder in an English field reads right to left until the learner types (CSS `:placeholder-shown`). | Built and tested: `e2e RL5` |
| Layout | CSS logical properties; direction-aware chevrons (`css/app.css`). | Built and tested for overflow: `e2e 14-15` |

### 2.4 Devices

- Phone layout below 64rem: a sticky top bar (brand, title, Help, Settings) and a bottom tab bar with five
  items. Desktop layout from 64rem: a side rail with the five items, a "Labs" group, Help, Settings, the sync
  status and the learner's name (`js/app.js`). On the rail, a lab route (for example `writing` or `writing/:id`)
  marks only its own Labs entry as current, not Practice as well (`e2e RW3`). When the browser reports no
  connection, an "Offline" badge appears in the phone top bar and in the rail, and goes when the connection returns
  (`e2e RW4`, phone).
- Touch targets: on coarse pointers the CSS gives small keys, segmented buttons, chips, the Hebrew reveal button
  and sort-bin labels a minimum height of 2.75rem (44 px), and icon-only keys a 44 px width (`css/app.css`,
  `@media (pointer: coarse)`); options and match items are taller by default. No test measures target sizes.
- Widths checked for sideways scrolling by `e2e 14-15` (**Built and tested**): Welcome and onboarding, before a
  profile exists, at 320, 360 and 390 px in both languages; 24 routes after onboarding at 320, 390, 768 and
  1440 px; 13 routes at 130% text (390 px) and 150% text (390 and 320 px). `e2e RW1` adds Today at 390 px (130 and
  150%), 320 px (150%) and 1440 px (130%), with level-rail labels that never overlap, list titles at least 8em
  wide on Path, Real life and the Writing lab at 390 px and 150%, and skill rows that stack at 320 px; `e2e RW2`
  checks a scenario header at 390 px and 130%; `e2e RW4` checks that no Settings option sits alone on a line at
  390 px. No other width (for example 1280 px) is checked for overflow.
- Browsers: every automated test runs in Chromium only. Speech recognition depends on the browser (the UI names
  Chrome, Edge and Safari); speech synthesis voices vary by device (`js/core/speech.js`).
- A web app manifest (`manifest.webmanifest`) allows installation as a standalone app. Installation is not tested.

### 2.5 Offline

Lucid works without a connection after its service worker has installed. See section 11.4.

---

## 3. Information architecture

### 3.1 Every route

All routes are defined in `js/core/router.js`. "Bare" routes hide the shell (focus mode); "public" routes work
before onboarding has created a profile. Every other route redirects to `#/welcome` until a profile exists, and
an unknown or malformed hash goes to Today (or Welcome without a profile).

| Route | Screen | View file | Purpose | Navigation group | Shell |
|---|---|---|---|---|---|
| `welcome` | Welcome | `js/views/welcome.js` | What Lucid is, with the dual-legend keyboard | none | bare, public |
| `start` | Onboarding (registration on the device) | `js/views/onboarding.js` | Language, name, birth year, goals, daily time, starting point, privacy; four steps | none | bare, public |
| `account` | Account | `js/views/account.js` | Sign up, sign in, password reset (with Supabase); in device-only mode, explains that the device profile is the account | none | public |
| `placement` | Placement test | `js/views/placement.js` | Adaptive placement; resume or restart | none | bare |
| `today` | Today (dashboard) | `js/views/today.js` | The daily plan, why each block is there, evidence of progress; from B1, an offer to switch to the English interface | Today | shell |
| `path`, `path/:level` | Curriculum map | `js/views/path.js` | All lessons by level, level check, final writing task, level moves, placement retake; while a placement is unfinished, the test instead of a current level | Path | shell |
| `lesson/:id` | Lesson player | `js/views/lesson.js` | Intro, explanation, practice, summary | none | bare |
| `checkpoint/:level` | Level check | `js/views/checkpoint.js` | An unassisted test across a level | none | bare |
| `review` | Spaced review | `js/views/review.js` | Due words; also `?mode=warmup`, `exit`, `early` | none | bare |
| `practice` | Practice hub | `js/views/practice.js` | Recurring mistakes, weak topics, due words, then every lab | Practice | shell |
| `drill` | Targeted drill | `js/views/drill.js` | `?topic=` or `?error=`: a short interleaved set | none | bare |
| `vocab` | Vocabulary notebook | `js/views/vocab.js` | Every learned word with its review status | Practice (Labs) | shell |
| `grammar` | Grammar lab | `js/views/grammar.js` | Grammar topics by level, mastery, lesson link, drill | Practice (Labs) | shell |
| `reading` | Reading centre | `js/views/reading.js` | Reading passages from the lessons, by level | Practice (Labs) | shell |
| `listening` | Listening centre | `js/views/listening.js` | Listening items and dictations, with a speed control | Practice (Labs) | shell |
| `speaking` | Speaking lab | `js/views/speaking.js` | Sound contrasts, shadowing, notes on recognition | Practice (Labs) | shell |
| `writing` | Writing lab | `js/views/writing.js` | Ten stages, exercises, assignments, final tasks, the learner's drafts | Practice (Labs) | shell |
| `writing/:id` | Essay editor | `js/views/essay.js` | Write, check, get feedback, revise, compare, delete (`free`, with a text type: essay or opinion, email, message; `final-<level>`; an exercise or assignment id) | Practice (Labs) | shell |
| `tutor` | AI tutor | `js/views/tutor.js` | Eight teaching modes | Practice (Labs) | shell |
| `real-life` | Real-life English hub | `js/views/reallife.js` | Scenarios by topic (travel, social, at work) and level, a start strip for the learner, a link to offline use | Real life | shell |
| `scenario/:id` | Scenario | `js/views/scenario.js` | Prepare, model dialogue, practise, AI roleplay | Real life | shell |
| `expressions` | Expressions dictionary | `js/views/slang.js` | 60 expressions, grouped by level or by letter and folded | Real life | shell |
| `conversations` | Conversation simulations | `js/views/simulations.js` | Every scenario as an AI roleplay; past conversations | Real life | shell |
| `progress` | Progress | `js/views/progress.js` | Weekly or monthly report, skill levels, level checks, mistakes, topics, a link to Profile | Progress | shell |
| `profile` | Profile | `js/views/profile.js` | Name, goals, start level, birth year | Progress ("My profile") | shell |
| `settings` | Settings | `js/views/settings.js` | Interface, learning load (with placement and level links), feedback, AI consent, account and sync, offline use (`?section=offline` scrolls to it), data | Settings | shell |
| `help` | Help | `js/views/help.js` | How Lucid works, in plain language, including offline use | Help | public |

Outside the router, `privacy.html` is a static bilingual page (privacy policy and terms) linked from onboarding
and Settings.

Navigation findings checked in the code:

- **Profile** is reached from Progress ("My profile", the only `href` to `#/profile` in `js/`; the desktop rail
  shows the learner's name as plain text). No test follows that link.
- The placement test can be reached again from the path ("Retake the placement test", `#/placement?restart=1`)
  and from Settings, under "Learning load" ("Retake the placement test", or "Continue the placement test" while
  one is unfinished, next to "Choose a level on the path"). While a test is unfinished, Today and the path both
  offer "Continue the test" (`#/placement?resume=1`). The path part is tested (`e2e LP3`); the Settings links
  have no test beyond the route loading in `e2e 14-15`.

### 3.2 The 21 core screens of the brief

| # | Brief screen | Route(s) | Status and tests |
|---|---|---|---|
| 1 | Welcome | `welcome` | Built and tested: `e2e 14-15` (no sideways scroll before a profile, both languages, 320-390 px), `axe` (audited before a learner exists, in all 5 configurations) |
| 2 | Registration | `start` (device profile); `account?mode=signup` (server account) | Device profile: Built and tested, `e2e 1`. Server account: Built, tested with mocks only, `e2e 18`, `e2e 19`, `unit auth` |
| 3 | Onboarding | `start` | Built and tested: `e2e 1`, `e2e 3`, `e2e 14-15`, `e2e RL6` (privacy step). `axe` audits the first step only. |
| 4 | Placement | `placement` | Built and tested: `e2e 2`, `e2e L1`, `e2e L2`, `e2e LP4` (the result screen); `unit engine`, `unit learner-logic` and `unit learner-evidence` placement tests. Not in `axe`. |
| 5 | Dashboard / Today | `today` | Built and tested: `e2e 7`, `e2e L1`-`L6`, `e2e LP1`, `e2e LP2`, `e2e RW1`, `axe`. The English-interface offer and the weekly goal have no test (Partial for those). |
| 6 | Curriculum map | `path`, `path/:level` | Built and tested: `e2e L3`, `e2e L4`, `e2e LP3`, `e2e RW1`, `e2e RW4` (titles aligned to one edge), `e2e 14-15`, `axe` |
| 7 | Lesson player | `lesson/:id` | Built and tested: `e2e 4-6`, `e2e PS1`-`PS5`, `e2e PS7`, `e2e PL1`-`PL3`, `e2e PL5`, `e2e PL6`; `unit player`. `axe` sees only the explanation stage. |
| 8 | Vocabulary trainer | `vocab`, `review` | Built and tested: `e2e 8`, `e2e PS6`, `e2e OF1`; `unit engine` FSRS tests |
| 9 | Grammar lab | `grammar` (drills at `drill?topic=`) | Built and tested for rendering: `e2e 14-15`, `axe`. Drills open from the plan in `e2e 7`. No test uses the topic list. |
| 10 | Reading | `reading` | Built and tested: `e2e RL4` (opens at the learner's level), `e2e 14-15`, `axe` |
| 11 | Listening | `listening` | Built and tested for rendering only: `e2e 14-15`, `axe` |
| 12 | Speaking lab | `speaking` | Sound tabs and shadowing: Built and tested, `e2e PS6` (shadowing has no verdict, sound tabs name example words), `e2e PL4` (shadowing grouped by level and open at the learner's level, "Next sentence for you"), `axe`. The "Which did you hear?" drill and the "Say it" check: Partial, no test. Live speech recognition cannot run in headless Chromium; `e2e PS1` and `e2e PL5` stub it. |
| 13 | Writing lab | `writing` | Built and tested: `e2e 13`, `e2e 11-12` ("My drafts" shows the final range), `e2e RW1` (rows at 150% text), `e2e RW3` (rail highlight), `axe`. No test opens a writing exercise (`we-01` to `we-20`) or runs its items (Partial for those). |
| 14 | Essay editor | `writing/:id` | Automatic checks, text types in free writing, versions, comparison and deletion: Built and tested, `e2e 11-12`, `e2e RW3`, `unit writing-analyzer`, `unit diff`. AI feedback and its protocol: Built, tested with mocks only, `e2e 11-12`, `e2e 13`, `e2e RW3` |
| 15 | AI tutor | `tutor` | "Not configured" notice: Built and tested, `e2e 17`. Conversation: Built, tested with mocks only, `e2e 17`, `e2e 20` |
| 16 | Travel English | `real-life`, `scenario/:id` | Built and tested: `e2e 9`, `e2e RL1`, `e2e RL2`, `e2e RW2`, `e2e LP2`, `axe`; workplace scenarios: `unit work-content` (no browser check opens one) |
| 17 | Slang dictionary | `expressions` | Built and tested: `e2e 10` (grouped and folded, search), `e2e RL4`, `unit work-content` (workplace searches), `axe` |
| 18 | Conversation simulations | `conversations`, `scenario/:id?tab=roleplay` | List, filters and notice: Built and tested, `e2e RL1`, `e2e 17`. Deleting a past conversation: Built and tested, `e2e RL7`. Account options on the roleplay tab: tested with mocks only, `e2e RW2`. AI roleplay and report: Built, tested with mocks only, `e2e RL3`, `e2e RW2` |
| 19 | Progress | `progress` | Built and tested: `e2e L3`, `e2e L7`, `e2e L2`, `e2e LP4` (recommendations and folded level checks); `unit engine: "period report compares with the previous period and counts retention"`, `unit learner-evidence` (first-try accuracy) |
| 20 | Profile | `profile` | Built and tested for rendering and its privacy wording: `e2e 14-15`, `e2e RL6`, `axe`. Linked from Progress. Saving the name and goals has no test (Partial for that). |
| 21 | Settings | `settings` | Built and tested: `e2e 16`, `e2e 20` (with mocks for the account part), `e2e OF1`, `e2e RW4` (layout at 390 px, the offline section anchor), `axe`. Theme toggle, backup restore and the placement links have no test. |

### 3.3 Extra screens

| Screen | Route | Status and tests |
|---|---|---|
| Help | `help` | Built and tested for rendering: `e2e 14-15`, `axe`; its offline answer links to Settings: `e2e RW4` |
| Level check | `checkpoint/:level` | Partial: the intro renders (`e2e 14-15`, `checkpoint/PreA1`), but no test runs a level check or checks its 75% rule |
| Targeted drill | `drill` | Built and tested: opens from the plan, `e2e 7` (the check accepts either an exercise or the empty state), `e2e LP2` (every plan link opens content). For a real-life topic the empty state points to scenarios. The 70/30 mix with competing topics has no test. |
| Spaced review | `review` | Built and tested: `e2e 8`, `e2e PS6`, `e2e OF1` |
| Account | `account` | Device-only explanation: renders in `e2e 14-15`, `axe`. Sign-up, sign-in, return to the previous screen: Built, tested with mocks only, `e2e 18`-`20`, `e2e RW2`, `e2e RW3`, `unit auth` |
| Privacy page | `privacy.html` | Built and tested in part: `e2e RL6` checks that it contains named statements (microphone and voice, what is not sent, recurring mistake types, the pre-launch placeholders, refusal of marketing consent) and no longer contains earlier claims ("strictest", "none of this leaves the device"). It does not compare every sentence with the code. Two boxes are placeholders (section 15). |

---

## 4. Curriculum

### 4.1 Levels, units and lessons

Source: `content/curriculum.json` (generated by `tools/curriculum-outline.mjs`). Each level has one unit.
Minutes are the authored lesson lengths summed per level. Lesson counts are planned and written lessons
(all 75 written; section 14).

| Level | Unit (EN / HE) | Lessons | Authored minutes | Lessons (titles from the curriculum) |
|---|---|---|---|---|
| Pre-A1 | Foundations / יסודות | 10 | 177 | The English alphabet; Letter sounds; Hello and goodbye; Numbers 0-100; I am, you are: the verb be; Questions and negatives with be; Colours and things around me; Days, months and time; Where are you from?; My first sentences |
| A1 | Everyday life / חיי היום-יום | 15 | 346 | Present simple: I, you, we, they; Present simple: he, she, it; Do you...? I don't...; My day; Family and possessives; One and many: plurals; a, an, the; Food and drink; Places in town; In, on, at: time; Describing people and things; Can and can't; Questions, questions; Reading short messages; Writing about me |
| A2 | Experiences and plans / חוויות ותוכניות | 15 | 348 | What are you doing?; Usually vs right now; Was and were; Past simple: regular verbs; Past simple: irregular verbs; Did you...?; Going to and will; Plans and arrangements; Bigger, better, more interesting; The best and the worst; How much? How many?; Must, have to, should; Common phrasal verbs; Let's...: suggestions and invitations; Telling a story |
| B1 | Opinions and reasons / דעות ונימוקים | 12 | 320 | Have you ever...?; Present perfect or past simple?; While it was raining; If it rains...; If I had a million dollars; It was made in...: the passive; She said that...; The person who...; Enjoy doing, want to do; In my opinion; Pros and cons; Writing an opinion essay |
| B2 | Arguments and nuance / טיעונים ודקויות | 10 | 250 | Narrative tenses and the past perfect; If I had known: third and mixed conditionals; It is said that...: advanced passive; He denied taking it: reporting; Furthermore, nevertheless, whereas; Words that go together; Idioms in context; Formal or informal?; Reading critically; Building an argument |
| C1 | Academic argument / טיעון אקדמי | 8 | 200 | Academic vocabulary and nominalisation; Sophisticated sentence structures; Hedging and stance; A thesis worth arguing; Evaluating evidence and sources; Logical fallacies; Rhetoric and persuasion; Concise, precise, edited |
| C2 | Mastery / שליטה | 5 | 125 | Style and connotation; Irony and implicature; Synthesising sources; Argument architecture; Research-based writing |

Topics: each curriculum lesson lists one to three topic ids from `content/taxonomy.json` (86 topics, 6
skills, 35 error types, each error type with a Hebrew "why" note). Each curriculum entry also carries a
one-line can-do statement and a "cover" line.

### 4.2 Lesson anatomy

Defined in `docs/content-schema.md` and enforced by `tools/validate-content.mjs`. Across the 75 files:
13-16 exercises, 8-15 vocabulary items and 15-40 authored minutes per lesson. (The schema document says
10-25 minutes; the validator accepts 5-40, and `b1-11` (30) and `b1-12` (40) exceed 25.) The validator rejects a
lesson without at least one input exercise (`read`, `listen` or `dictation`) and one free-production exercise
(`write` or `speak`); every lesson passes.

Sample: `content/lessons/a2-04.json`, "Past simple: regular verbs".

| Part | Content in the sample | How the player uses it (`js/views/lesson.js`) |
|---|---|---|
| `minutes`, `objectives` | 25 minutes; 4 can-do objectives (EN and HE) | Intro stage: "By the end of this lesson", time, resume banner |
| `warmup` | "Think about yesterday evening: three things you watched, cooked, studied or played..." | Intro stage |
| `explanation` | 9 blocks: p, rule, rule, table, p, table, warning, tip, p | Learn stage; "Skip to practice" is offered |
| `examples` | 8 model sentences | Learn stage |
| `hebrew_pitfalls` | 2 notes (for example the weak `/ɪd/` in *wanted*), each with an error type | Learn stage, hidden when Hebrew support is off |
| `vocab` | 12 entries (word, part of speech, Hebrew, definition, example, IPA, collocations, level) | Learn stage; enter spaced review when the lesson is passed |
| `exercises` | 16: categorize x2, mcq x2, listen, gap x2, correct x3, transform x2, read, dictation, speak, write; 8 with a hint | Practice stage |
| `review.key_points` | 4 points | Summary: "Key points", plus "Worth watching" (this run's mistake types) |
| `completion.pass_score` | 0.7 (every lesson uses 0.7) | Pass mark on first-try points |

Lesson flow and scoring (`js/views/lesson.js`, `js/ui/player.js`):

- Only the first try of each scored exercise counts. Points per answer: right 1; right with a spelling slip 0.9;
  right after a hint 0.75; wrong up to 0.5 (partial credit from the exercise). The lesson passes at 70% of
  first-try points over scored exercises. Speaking and writing are practice: they never enter the score or its
  denominator. Built and tested: `unit player: "speaking and writing never count toward the lesson score or its
  denominator"`, `unit player: "answer points and the missed list"`.
- Below the pass mark the score is rounded down (0.696 shows 69%, never "70%"), and when partial credit caused the
  miss a line explains it (a right answer after a hint counts three quarters, one with a spelling slip 90%).
  "Lesson complete" appears only on a pass. Built and tested: `unit player: "R2-26: a score under the pass mark is
  rounded down and never reads as the mark"`, `e2e PL2`.
- A wrong answer shows the right answer at once and comes back once at the end of the set. The step counter keeps
  the first-pass total fixed and counts retries apart ("2 of 14 · 1 to revisit", in words in Hebrew). The verdict
  leads with the result and the right form; the explanation waits behind "Why?", which shows the item's own
  explanation and adds the error type's general Hebrew note only when the item has nothing of its own. Built and
  tested: `e2e PS2`, `e2e PL1`, `unit player` (counter tests; `"R2-04: \"Why?\" shows the item's own
  explanation, not the general note of its error type"`).
- After "Nearly there", the main action redoes only the exercises missed on the first try; earlier right answers
  keep counting, so fixing the misses can complete the lesson. This choice survives leaving: the lesson intro then
  shows a "Nearly there" banner with the last score, and its main action (also on Enter) is "Practise the N I
  missed", with "Practise everything again" as a second option. Built and tested: `e2e PS3`, `e2e PL2`.
- The learner's place is saved; Today's main button says "Continue". Built and tested: `e2e L5`, `e2e LP1`.
- The intro states the whole lesson length and, when the daily plan takes only a part, today's part ("up to
  exercise 5 of 16, about 10 min"), or the minutes left when resuming. When the first pass reaches the end of
  today's part, the player shows "Today's part is done" with "Stop here" (back to Today; the place is saved) or
  "Keep going". It shows this once, never in a run of only the missed exercises, and never at the end of the first
  pass. Built and tested: `e2e PL3`, `unit player: "R2-28: today's part ends once, on the first pass, when
  exercises are left after it"`.
- A table wider than the screen gets a line saying it scrolls sideways, a fade on the hidden side until the far
  side is reached, and keyboard focus (`markWideTables`). Built and tested: `e2e PL6`.
- Every scored exercise offers "I don't know", and a hint when one is authored. Keyboard: Enter checks and
  continues, 1-6 choose an option. "I don't know" is used in `e2e 4-6`; the hint button and the keyboard shortcuts
  inside exercises have no test (Partial).
- A lesson whose file is missing says it is still being written and links to the next ready lesson. Built and
  tested: `e2e PS5`, `e2e L4` (all 75 files exist now, so the tests simulate a missing file). A lesson that
  cannot load while offline says what works offline, offers word review when there are cards, lists up to three
  lessons found in the offline cache, and links to "Offline use" in Settings. The pointer to Settings is tested
  (`e2e PL6`); the list of cached lessons needs the service worker and has no test.

### 4.3 The 12 exercise types and how each is graded

Grading code: `js/core/grading.js` (normalisation and matching) and `js/ui/exercise.js` (each renderer's
`check()`). Typed answers are normalised: case, surrounding spaces and final punctuation are ignored; curly and
straight apostrophes and quotes are equal; standard contractions equal their full forms (`don't` = `do not`; `'s`
after a pronoun or question word reads as *is* or *has*; `'d` as *would* or *had*). A one-edit slip (or a swap of
two letters) in one word of 5+ letters is accepted as "Almost - check the spelling", except inside an
inflectional ending (*-ing, -ied, -ies, -ed, -es, -s*) and except when the answer exactly matches an authored
wrong answer. Built and tested: `unit grading` (9 tests), `unit content-keys: "no authored wrong answer passes as
correct or as a typo"`.

| Type | Count in lessons | What the learner does | How it is graded | Score |
|---|---|---|---|---|
| `mcq` | 203 | Picks one of 3-4 options | Exact index. Option-specific feedback and an option-specific error type when authored | 1 or 0 |
| `gap` | 113 | Types into one or more blanks, or taps a word bank | Each blank by `checkTyped` against its accepted answers, with authored wrong-answer feedback | 1 if all right; otherwise 0.5 x the share of right blanks |
| `order` | 51 | Taps tokens into a sentence | The token order, or any extra accepted sentence (no typo tolerance) | 1 or 0 |
| `match` | 49 | Pairs 4-6 items; wrong pairs shake and stay open | Correct only with no wrong tries; letter tiles have a play button | 1 - wrong tries / pairs (minimum 0) |
| `categorize` | 87 | Sorts items into categories | Per item; the verdict lists only the misplaced items under where they belong | Share of items in the right place |
| `transform` | 143 | Rewrites a sentence | `checkTyped` against the answers. From B1, the key is shown as "one model answer" and the learner may mark an equivalent answer correct ("My answer is also correct"): the attempt becomes right with `self_judged: true` and a `self-judged` event is logged for content review. Lucid does not check that judgement. | 1 or 0 |
| `correct` | 130 | Fixes the error in a sentence (pre-filled) | `checkTyped`; Check stays disabled until the text changes. From B1, as for `transform`: "one model answer" and "My answer is also correct" | 1 or 0 |
| `listen` | 81 | Hears text-to-speech (normal or slow), picks an option | Exact index; the transcript is shown after. Without speech synthesis the transcript is shown instead of audio | 1 or 0 |
| `dictation` | 51 | Hears a sentence and types it | Exact match, or word accuracy of 0.85 or more by word alignment; missed words are marked | Word accuracy (0-1) |
| `speak` | 79 | Hears the target, says it, and/or rates themselves | **Never graded.** Recognition (where available) shows what was heard next to the target; the learner can try again, mark "I said it clearly" or "I need more practice", or skip with "Can't speak right now" (no attempt recorded, no retry). Stored with `score: null` and no error type. | none |
| `read` | 73 | Reads a passage (optionally read aloud) and answers 146 true/false, 186 multiple-choice and 67 gap questions in all | Per question (gap questions by `checkTyped`) | Share right; correct only when all are right |
| `write` | 79 | Writes a short text with a word target and required words | **Never graded.** Shows automatic checks (section 6.6), a self-check list and a model answer | none |

`tf` exists only inside `read`. An answer that exactly matches an authored wrong answer never gets "one model
answer" or the self-judgement button (`unit player: "R1-E2: a \"Find and fix\" item from B1 offers \"My answer is
also correct\"; an authored wrong answer never does"`). For `speak`, words that recognition did not catch are
grey with a dotted underline and "(not caught)" for screen readers, not marked like errors; a target that spells
letters adds that recognition often cannot show spelled letters; "Hear it" and "Say it" come straight after the
target, sharing one row at 130-150% text, where the pronunciation tip is folded. The content schema
(`docs/content-schema.md`) now also describes `speak` as practice that is never graded (research decision
C2-D34/D37, `e2e PS1`).

Statuses: `e2e 4-6` answers a whole lesson, `pa1-05`, which has ten of the twelve types (it skips the speaking
item, which `e2e PS1` covers). `mcq`, `gap`, `order`, `match`, `categorize`, `transform`, `correct`, `listen`,
`speak` and `write` are therefore **Built and tested**, with specific behaviour in `e2e PS1` (speak), `e2e PS2`
(categorize verdict), `e2e PS4` (open rewrites), `e2e PS6` (letter tiles in match), `e2e PL5` (speak at 150%
text, words not caught), `e2e PL6` (an equivalent answer to a C1 `correct` item counted; the listening transcript
as a left-to-right block), `unit player` and `unit grading`. `read` and `dictation`: **Partial**. No browser test renders or answers either one; only their
grading functions are unit-tested (`unit grading: "word accuracy aligns dictation and speech to the target"`,
and `checkTyped` for gap questions).

### 4.4 Level checks

`js/views/checkpoint.js`, `js/core/pool.js` (`checkpointSet`): 16 auto-graded items drawn from every
written lesson of the level (one item from each lesson in turn, for up to four rounds: one or two per lesson at most
levels, three or four at C2, which has five lessons; shuffled), with no hints and no explanations until the end, and
no AI. 75% of points or more marks the level check as passed ("demonstrated") in the progress record
`check:<level>`; a miss lists the missed items with a drill link. The check needs at least 6 items to run. Its
answers are recorded as attempts with their level, so they also count as practice evidence for skill levels
(section 5.2). The level's final writing task is presented as a separate part of the evidence.
**Partial**: no test runs a level check.

### 4.5 Each level's final writing task

From `final_assessment` in `content/curriculum.json`. Each opens in the essay editor at `#/writing/final-<level>`
and is listed on the path and in the Writing lab. Every level, B2 to C2 included, has Hebrew instructions, Hebrew
required elements and Hebrew topics (`e2e 13` asserts this). The editor shows the English first; at minimal or off
Hebrew support (B1 and above by default) the Hebrew is one tap away. Topic options and the "Must include" list read
left to right (`e2e RW3`).

| Level | Task | Words | Writing stage | Kind | Topic choice | Required elements |
|---|---|---|---|---|---|---|
| Pre-A1 | Introduce yourself in 5-6 simple sentences | 25-70 | 1 | paragraph | none | 5 |
| A1 | A short introduction about yourself and your daily life | 60-100 | 1 | paragraph | none | 4 |
| A2 | A structured description of a personal experience with a beginning, middle and end | 100-160 | 2 | paragraph | 3 topics | 4 |
| B1 | An opinion essay of about 300 words | 250-380 | 3 | essay | 3 questions | 5 |
| B2 | A 500-word argumentative essay with a thesis, three arguments, evidence, a counterargument, a rebuttal and a conclusion | 450-600 | 6 | essay | 3 questions | 5 |
| C1 | An 800-1,000-word analytical argumentative essay | 750-1,100 | 8 | essay | 3 questions; one uses the source pack of assignment `wa-05` | 6 |
| C2 | A 1,500-2,000-word research-based argumentative paper; the reference list does not count | 1,400-2,200 | 10 | research | 4 questions; three use the source packs of `wa-08`, `wa-09`, `wa-10`; the fourth is the learner's own question with real sources | 7 |

Status: briefs and topic choice **Built and tested** (`e2e 13` checks every brief, Hebrew at every level, a topic
choice from B1, and that each pack referenced exists; `e2e RW3` checks the B2 brief's Hebrew and direction). Submitting a final task for AI feedback: **Built, tested with mocks
only** (`e2e 13`).

---

## 5. Learning engine

### 5.1 Placement

Code: `js/core/placement.js`, `js/views/placement.js`; bank: `content/placement.json` (84 items, 12 per level: 4
grammar, 4 vocabulary, 2 reading, 2 listening; 10 multiple-choice and 2 listening items per level).

| Rule | Behaviour |
|---|---|
| Who takes it | Onboarding's starting point picks the start: "I know some basics" A1, "simple conversations" A2, "fairly comfortable" B1, "advanced" B2. "I don't know any English" skips the test and opens lesson `pa1-01` with start level Pre-A1. |
| Staircase | Items come in blocks of four at one level, rotating grammar, vocabulary, reading and listening. 3 of 4 passes the level for the moment and the test climbs; 0-1 of 4 fails it and the test descends; 2 of 4 asks a second block at the same level, which then needs 6 of 8. |
| Confirmation | A level counts only when confirmed: 75% or more over 8 items at that level, or a passing block (3+ of 4) at the level above. Before finishing, the test asks a confirming block at the highest level passed, and it never places above the highest confirmed level. A level that cannot be confirmed is dropped and the level below must stand on its own. |
| Length | At most 28 items ("about 10 minutes" on screen). |
| During the test | "I don't know" is always allowed and counts as not known. No right or wrong is shown. |
| Resume | Answers are saved after each question (`placement/inprogress`). Today offers "Continue the test" or "Start again"; until there is a result (and no lesson is completed) Today shows no lesson link. The path shows the same choice, with no current level and no "Next" mark, and its bottom link reads "Continue the placement test" (`e2e LP3`). |
| Result | The highest confirmed level ("demonstrated"); the course starts at that level. C1 and C2 are the academic track: a learner whose goals are all non-academic (work, travel, conversation, everyday) starts at B2, and the result says so and offers "Start at C1". The headline names only what was confirmed (C1, or C2 after a confirmed C2). Per-skill first estimates for grammar, vocabulary, reading and listening (section 5.2), never above the confirmed level. A perfect run is reported as the top band, cautiously; the note about C1, C2 and "B2+" appears only when an estimate reaches B2. Tested: `unit learner-evidence` (R1-Y2, R2-29, R2-38), `e2e LP4`. |
| Learner control | Start lower than the result, start from the basics, move level from the path ("Start from <level>", recorded as the learner's own estimate), or retake from the path or Settings. Lessons below the start become "placed out"; moving down returns placed-out lessons to regular lessons. |

Status: **Built and tested**: `e2e 2`, `e2e L1`, `e2e L2`, `e2e L3`, `e2e LP3`, `e2e LP4`; `unit engine: "placement finds the boundary
for learners of known ability"`, `"placement tolerates an occasional slip (1 in 8)"`; `unit learner-logic:
"placement never claims a level on one lucky block"`, `"every level the placement reports is confirmed by a second
block"`, `"an interrupted placement resumes where it stopped and ends the same way"`, `"a perfect score is the top
band, and skill estimates stay at B2+"`; `unit learner-evidence: "R1-Y2: the course starts at the confirmed level;
non-academic goals are not started on the C1 track"`.

Limits: the bank is expert-levelled, not calibrated on real responses (Rasch calibration is deferred,
`04-methodology.md` section 3). There is no productive (writing or speaking) sample in placement.

### 5.2 Learner model

Code: `js/core/adaptive.js`, `js/core/learner.js`. Everything is computed from recorded attempts (one record per
answered item: topic, skill, level, correctness, score, error type, hint use, latency, the response cut to 300
characters). Placement answers and unscored practice (`score: null`) are left out of mastery, levels and accuracy.

**Topic mastery.** Time-weighted accuracy (an attempt's weight halves every 21 days) with a neutral prior:
`(points + 1) / (n + 2)`, where each answer adds its score (partial credit counts) and `n` is the weighted number
of answers. Only first tries count: the first answer to an item (source, lesson and exercise) on a given day, so
end-of-set retries and same-day redos of missed or all exercises are left out, while the same item on a later day
counts (`firstTries`; the same rule applies to skill levels and report accuracy). Status: "learning" below 0.6;
"mastered" at 0.85 or more with at least 6 answers on at least 2 different days; otherwise "practising". Weak
topics: 3+ answers and mastery below 0.7 (up to 5).

**Topic attribution.** A review answer belongs to the topic and level of the lesson its word came from (older
review records filed under a fixed "daily-life-vocab" topic are re-read that way). Feedback on an essay in the
Writing lab never moves a topic: its mistakes feed recurring errors and its assessed final drafts feed the writing
level. Auto-graded writing exercise items still count. Scripted practice and roleplay in the travel modules count
toward `travel-functional`; social and workplace scenarios toward `social-functional`. Each weak topic carries
where it can be practised: a drill when an available lesson teaches it no more than one level above the course
level, the scenario with the lowest score for the two real-life topics, or nowhere, and then Today, Practice and
Progress do not link to it.

**Built and tested**: `unit engine: "mastery needs accuracy, enough evidence and two different days"`; `unit
learner-evidence`: "R2-12: first-try accuracy and topic mastery leave retries out", "R2-37: essay feedback never
moves a topic; auto-graded writing items still count", "R2-37 in the store: a review answer carries the topic of its
word's lesson; old records are re-read", "R2-24 in the store: weak real-life topics route to the scenario with the
lowest score; topics with no exercises route nowhere".

**Recurring errors.** An error type is recurring with 3+ occurrences on 2+ different days within 30 days. Trend
compares the last 14 days with the 14 before: "improving" below 0.6 times, "worsening" above 1.4 times, "new"
with nothing earlier. Errors come from authored error types on exercises and options, authored wrong-answer
feedback, the weaker options in scripted scenario practice, and (with AI feedback) the error types of writing
mistakes that are not "style". **Built and tested**:
`unit engine: "recurring errors need repetition across days; trends are reported"`, `e2e 7`.

**Evidence-based skill levels** (`skillLevels`, constants in `EVIDENCE`):

| Skill | Source of a level | Threshold |
|---|---|---|
| Grammar, vocabulary, reading, listening | Practice: lessons, drills, reviews, level checks, centre exercises | 6+ first-try answers at the level (an end-of-lesson retry or a same-day redo does not count; the same item on a later day does), 75%+ right, on 2+ different days; the highest such level |
| Same four | Placement ("first estimate", provisional) | 2+ placement items at the level in that skill, 2 of 2 or 67%+ of more, never above the overall level the test confirmed. Capped at B2 and shown as "B2+" with where the answers were ("2 of 2 at C1"): multiple-choice items alone never establish C1 or C2. Practice evidence at the same or a higher level replaces it. |
| Writing | Final drafts assessed by AI feedback, one per task | 2+ tasks on 2+ different days; the median of the last three (the lower of two). A draft still being revised never counts; drafts show no level anywhere. |
| Speaking | none | Always "not yet assessed": recognition never grades, and scenario choices do not count toward a speaking level |
| Any skill | Clear failure | Under 50% over 8+ answers at the current level lowers it one step, as a first estimate |

The overall placement level is never copied into a skill. Each level shows its source and evidence count and the
label "Lucid estimate, aligned to CEFR descriptors". The course level (the level of the next lesson) is shown
separately from skill levels. **Built and tested**: `unit learner-logic` (4 skill-level tests), `unit
writing-level` (2 tests), `unit engine: "skill levels come from evidence; placement is a starting point that
evidence can move"`, `unit learner-evidence` ("R2-12: retries and same-day redos are not skill evidence; a lesson
passed only through retries does not raise the level", "R2-29: a skill's placement estimate never goes above the
confirmed level, and says where its answers were"), `e2e L2`, `e2e LP4`. The writing level only receives evidence when AI feedback runs, which was tested
with mocks only.

### 5.3 Spaced repetition

Code: `js/core/srs.js` (FSRS through `ts-fsrs` 5.4.2, vendored unmodified as `vendor/ts-fsrs.mjs`),
`js/views/review.js`, `js/core/learner.js`.

| Part | Behaviour | Status |
|---|---|---|
| Scheduler | FSRS with a retention target of 0.90 ("Standard"), 0.85 ("Light") or 0.95 ("Exam") from Settings; maximum interval 3,650 days; interval fuzz on | Built and tested: `unit engine: "FSRS cards schedule forward, lapse back, and unlock form recall at stability >= 7"` |
| Objective grading | No self-rating buttons. Wrong = Again; right after a hint or slowly = Hard; right = Good; Easy only when fast (under 2.5 s) and the card has 2+ previous reviews. "Slow" is above the learner's 80th-percentile review latency once there are 20 timed reviews (12 s before that). | Built and tested: `unit engine: "objective grading: wrong=Again, hint/slow=Hard, right=Good, Easy only when fast and proven"`, `e2e 8` |
| Retrieval ladder | Meaning cards: recognise the Hebrew meaning among options for the first two reviews (when there are enough other words to build the options), then type the meaning in Hebrew (with "That is what I meant" when Lucid misjudges a typed answer). A form card (see the Hebrew and a gapped example, type the English word) unlocks when the meaning card's stability reaches 7 days. "Count it" is never offered on a picked option. | Built and tested: `unit engine` (unlock at stability 7), `e2e 8`, `e2e PS6` |
| Order | Due cards, lowest retrievability first | Built and tested: `unit engine: "due cards come most-forgotten first; vocab cards are not duplicated; workload governor"` |
| Modes | Review (due cards), warm-up (words learned 1-3 days ago, up to 8), exit check (words learned today, up to 12), extra practice (the next 20 cards by due date) | Review and extra practice: Built and tested, `e2e 8`, `e2e OF1`, `e2e PS6`. Warm-up and exit check: Partial, no test |
| Card creation | Passing a lesson adds its words (`finishLesson` in `js/core/learner.js`). Learners placed above the early levels can add the words of placed-out lessons on request (Today and the path). | Placed-out import: Built and tested, `e2e L6`, `unit learner-logic: "P-82: ..."`. Adding the words of a passed lesson: Partial, no direct assertion (`e2e 8` creates its cards by calling `addVocabCards` itself). |
| Workload governor | New words per day from Settings (4, 8, 12 or 15; default 8), cut to 4 when the coming week's reviews would take more than about 12 minutes a day (8 s per review). Words beyond today's limit are queued on later days rather than dropped. | Built and tested: `unit engine` (governor), `e2e L6` (new words due at once never exceed the daily limit). The code comment in `srs.js` mentions raising the limit to 15 when reviews are light; the code returns the setting unchanged. |
| Retention measures | Recall on due reviews; "recall after 30 days" from reviews of cards created 25-40 days earlier, shown once there are 5 such reviews; "stable words" = stability of 21+ days | Built and tested: `unit engine: "period report compares with the previous period and counts retention"`. Deliberate 1/7/30-day probe items are not built (`04-methodology.md` section 3). |

### 5.4 Daily plan

Code: `adaptive.dailyPlan` and `learner.todayPlan`; screen `js/views/today.js`. The learner chooses 10, 20, 35
or 50 minutes (onboarding and Settings). Each block says why it is there.

| Block | 10 min | 20 min | 35 min | 50 min | Condition |
|---|---|---|---|---|---|
| Warm-up recall | - | - | 3 | 3 | Words learned 1-3 days ago exist |
| Due reviews | 5 | 6 | 10 | 12 | Cards are due |
| New lesson | 5 | 10 | 10 | 15 | Gets the time the other blocks leave (at least 5 minutes; the review time too when nothing is due) |
| Targeted practice | - | 4 | 4 | 6 | A recurring error (first) or a weak topic exists |
| Use it | - | 4 | 8 | 10 | Always, at these lengths |
| Exit check | - | - | 4 | 4 | Words were added today |

- **Lesson slice.** The plan uses the lesson's real length from its file. When it does not fit, it takes a part
  ("up to exercise 9 of 16"); the saved place carries the rest to the next day, where the main button says
  "Continue". The explanation and examples are sized by their English word count (about 120 words per exercise
  slot, 1 to 6 slots; a planning heuristic, not a measured rate). The plan counts a saved run as the player does:
  the first pass has a fixed total and retries are counted apart ("Continue: <title> · 6 of 16"; "exercise 6 of
  16, and 2 to revisit at the end"). The player marks the end of today's part (section 4.2). Built and tested:
  `e2e L5`, `e2e LP1`, `e2e PL3`, `unit learner-logic: "the plan shows the real lesson length and splits long
  lessons across days"`, `unit learner-evidence: "R1-D3: a long explanation takes more of the lesson time than a
  short one"`, `"R2-17: Today's step counts match the player's counter for every saved state"`.
- **After "Nearly there"** the lesson block's main action practises only the missed exercises ("Practise the N you
  missed"; the row says that right answers are kept and that fixing the misses can complete the lesson), unless a
  run is in progress. A run of only the missed exercises that was left halfway resumes with its own counter.
  Built and tested: `e2e LP1`, `unit learner-evidence: "R2-02/R2-25: after \"Nearly there\" the plan's lesson is the
  missed exercises, unless a run is in progress"`.
- **Goals.** Onboarding offers six goals: travel, work, exams and university, confidence in conversation,
  academic writing, everyday English. From A1 and 20 minutes, goals choose the "use it" block: travel and
  conversation name a real-life scenario at or below the course level, not done yet (travel: airport, hotel and
  emergencies first); work names a workplace scenario at or below the course level, not done yet (the six start at
  A2, so at A1, or once every workplace scenario at or below the level is done, a work goal alone leaves the
  default mix);
  exams and academic writing alternate reading and a Writing lab task at or below the level; the kind practised
  least recently comes first. Once a goal's kind was practised today, the block shows what was done, ticked,
  instead of moving on to the next one. A block's reason names only a goal the learner chose, and its icon matches
  the kind of block. Without a usable goal, speaking and writing alternate (speaking at Pre-A1 and A1). Built and
  tested: `e2e L6` (travel), `e2e LP1` (reasons and icons), `e2e LP2` (ticks), `unit learner-logic: "goals shape
  the plan: travel names a scenario, studies pick reading and writing"`, `unit work-content: "a work goal picks a
  workplace scenario for the plan and for \"Start here\""` (at A2, B1 and B2), `unit learner-evidence` (R2-27,
  R2-39). No browser check asserts that Today names a workplace scenario (`e2e LP1` uses a work goal only
  alongside academic writing, and checks the reading block).
- **Writing blocks** are timed from the task's word range (about 5 words a minute up to A2, 7 at B1-B2 and 9 from
  C1, or half a minute per item for sentence sets; a heuristic, as the code comment says). A longer text is
  planned as a start ("The whole text takes about 30 min, so today is a start"), and a task with a saved draft
  comes first next time. Built and tested: `unit learner-evidence: "R2-16: a writing block is timed from the task's
  word range and planned as a part when it is longer"`.
- **Targeted practice** links to `drill?error=` for a recurring error, or for a weak topic to where it can be
  practised (section 5.2, topic attribution): a drill only when an available lesson teaches the topic no more than
  one level above the course level, and never for a topic practised only more than one level below the course
  level; weak real-life topics (travel, social) link to the scenario with the lowest score instead. A topic with
  nowhere to practise is not planned. A practice or "use it" block is ticked only for what was done (that drill,
  that scenario or task). Built and tested: `e2e 7`, `e2e LP2` (every plan link opens content), `unit
  learner-evidence` (R2-24, R2-37).
- **Unwritten lessons** are skipped and named; **pending placement** replaces the plan with the test, or lets the
  learner start at their own estimate. Built and tested: `e2e L4`, `e2e L1`.
- **Level by skill** on Today is a fold with a one-line summary: folded on phones, open on wide screens; Progress
  keeps the full sources. Built and tested: `e2e L2` (folded on a phone, no C1/C2 from placement alone, opens on a
  tap), `e2e RW1` (rows stack at 320 px and 150% text).
- **Vocabulary import card** (for placed learners): "Not now" hides it on Today for that level; the path keeps it.
  The import itself is tested (`e2e L6`); "Not now" has no test.
- **Weekly goal**: 2-7 days (default 5), counted Monday to Sunday from days with attempts. "A day off erases
  nothing." Partial: built, no test.

### 5.5 Hebrew support fading

Code: `js/core/i18n.js` (`SUPPORT_BY_LEVEL`, `supportLevel()`, `bi()`, `legend()`), `learner.applySupport()` and
`learner.shownLevel()`.

"By level" follows the level the learner has shown, never above the course level: the placement test's confirmed
level (or the level the learner chose themselves), raised by the highest level of a completed lesson. With
nothing shown yet, the course level is used. A placement that confirmed A2 and starts the course at B1 therefore
keeps A2 support until a B1 lesson is completed.

| Level shown (capped at the course level) | Pre-A1, A1 | A2 | B1, B2 | C1, C2 |
|---|---|---|---|---|
| "By level" (default) | full: Hebrew before the English | partial: English first, Hebrew after; an explanation paragraph of more than 24 English words gets a "בעברית" toggle instead of a second full copy | minimal: English only; Hebrew behind a "עב" button; Hebrew legend lines in a quieter colour | off: English only; Hebrew behind "עב"; legend lines hidden |

- The learner can override in Settings (full, partial, minimal, off). At "off", lesson pitfalls and the Hebrew
  "why" notes on error labels are hidden. The articulation note of a speaking item or shadowing sentence shows its
  Hebrew at every support level except "off".
- At partial support, short lines (objectives, key points, prompts, feedback) and Hebrew pitfalls stay doubled; the
  fold applies to the learn stage's paragraph, rule, tip and warning blocks.
- Support is re-applied whenever the course level or the level shown moves (placement, retake, level move, lesson
  progress). Built and tested: `unit i18n: "\"By level\" Hebrew support follows the level shown, not the level the
  course starts at"`, `unit i18n: "partial support folds the Hebrew of a long paragraph behind \"בעברית\"; short
  lines stay doubled"`, `unit learner-logic: "P-48 and P-45: after \"Start from B2\", a finished lesson is recorded
  and the plan moves on"` (asserts the support attribute changes right after the move), `e2e PL4` (support partial
  after a placement that showed A2; long paragraphs folded; the articulation note in Hebrew).
- The same support level is sent to the AI routes, which follow a Hebrew policy (section 8).
- The comment above `SUPPORT_BY_LEVEL` now matches the map that runs.
- The suggestion to switch the interface to English, promised in onboarding, is shown on Today from B1
  (section 2.3; Partial, no test).
- Contrast at minimal support: the quieter legend colour (`--ink-he-quiet`) replaced the earlier 0.6 opacity,
  which failed WCAG 1.4.3; the B1 configuration of the audit now covers it (section 11.1).

### 5.6 Speech

- Text-to-speech (browser voices, international, US or UK by the "English for listening and roleplay" setting, three speeds) for
  listening items, dictation, examples, vocabulary, passages and the roleplay partner's lines.
- Speech recognition where the browser has it: in lesson `speak` items, the Speaking lab and dictation into the
  scenario and roleplay reply boxes and the tutor. It is the browser's service (in Chrome and Edge the audio goes
  to the browser maker); Lucid receives only text and keeps no audio. A one-time notice comes before the first
  microphone use (`lucid-mic-notice`); "Not now" keeps the microphone off. Built and tested: `e2e PS1`, `unit
  player: "the microphone notice is shown once per browser and says what happens to the voice"`.
- The Speaking lab has six sound contrasts relevant to Hebrew speakers (/ɪ/-/iː/ *ship/sheep*, /æ/-/ʌ/-/e/,
  /θ/-/s/-/t/, /ð/-/d/, /w/-/v/, /ʊ/-/uː/) with a "Which did you hear?" drill and a "Say it" check, and shadowing
  of lesson sentences with no verdict. Shadowing groups the 79 lesson sentences by level in folds that show done of
  total; only the recommended level is open, and "Next sentence for you" opens a sentence at that level. Sound tabs
  and shadowing: Built and tested, `e2e PS6`, `e2e PL4`. The drill and the "Say it" check: Partial, no test.
- What recognition did not catch is shown in grey with a dotted underline ("not caught"), not in the red used for
  dictation mistakes (section 4.3). Built and tested: `unit player: "R2-08: words recognition did not catch are \"not
  caught\" (grey), not marked like spelling errors"`, `e2e PL5`.
- Nothing is an accent score. Recognition quality on Hebrew-accented English is not validated.

---

## 6. Writing engine

### 6.1 The ten stages

Code: `js/views/writing.js` (`STAGES`, `STAGE_FOR_LEVEL`); content: `content/writing/exercises.json` (20),
`content/writing/assignments.json` (10). The AI's target for each stage is in
`supabase/functions/lucid-ai/rubric.ts` (`STAGE_TARGET`). The lab opens at the stage for the learner's course
level.

| Stage | Name | Focus | AI target | Opens for | Exercises | Assignments | Level final |
|---|---|---|---|---|---|---|---|
| 1 | Sentence construction | Correct, complete sentences | Pre-A1-A2 | Pre-A1, A1 | we-01 (10 items), we-02 (30-80 words) | - | Pre-A1, A1 |
| 2 | Paragraph development | Topic sentence, support, transitions | A2-B1 | A2 | we-03 (9 items), we-04 summary (60-100) | - | A2 |
| 3 | Expressing opinions | Opinion and reasons | B1 | B1 | we-05 (9 items), we-06 essay (120-180) | - | B1 |
| 4 | Building arguments | Claims, reasons, evidence | B1+-B2 | - | we-07 (7 items), we-08 (180-250) | - | - |
| 5 | Counterarguments | The other side, fairly | B2 | B2 | we-09 (8 items), we-10 essay (200-280) | wa-01 | - |
| 6 | Rebuttals | Answering an objection | B2-B2+ | - | we-11 (8 items), we-12 (200-280) | wa-02, wa-03 | B2 |
| 7 | Essay structure | Introductions, body, conclusions | B2+-C1 | - | we-13 outline (7 items), we-14 timed essay, 40 minutes optional (250-350) | wa-04 | - |
| 8 | Critical thinking | Assumptions, bias, fallacies | C1 | C1 | we-15 (8 items), we-16 critical response (300-400) | wa-05 (source pack) | C1 |
| 9 | Academic writing | Register, hedging, sources | C1-C2 | - | we-17 (8 items), we-18 mini-synthesis (350-500) | wa-06, wa-07 (source packs) | - |
| 10 | Independent argumentation | Complex essays, minimal help | C2 | C2 | we-19 editing (10 items), we-20 essay (400-700) | wa-08, wa-09, wa-10 (source packs) | C2 |

Assignments (B2-C2) carry a prompt, 6-9 required elements, a word range (450-550, 800-1,000 or 1,500-2,000) and an
exemplar (an outline and an annotated paragraph). The six with source packs (3-4 sources each) mark every source
as "Illustrative, not real data"; the packs are invented and labelled, with no fabricated real-world statistics.
Exercise items run in the focused player like lesson exercises. Free writing (`writing/free`) is always available;
it asks "What are you writing?" (essay or opinion, email, message), and the choice is saved with the draft and its
versions (sections 6.3 and 6.6).

Status: stages, the lab and the assignment and final-task data **Built and tested** (`e2e 13`, `e2e 11-12`,
`e2e 14-15`, `npm run validate`). Opening a writing exercise and running its items in the player: **Partial**, no
test opens any of `we-01` to `we-20`.

### 6.2 The essay editor

`js/views/essay.js`. The editor shows the task, its required elements ("Must include"), word count against the
target (a closing reference list is counted apart, as "+N"), an optional timer for timed tasks, the topic choice
and source pack where they exist, and the tabs Checks, AI feedback, Versions and (only when the task or chosen
topic has a source pack) Sources. Drafts autosave on the device. When AI is ready and the task's latest evaluated
draft is not final, the editor reopens on the AI feedback tab, so the "mistakes to fix" strip shows at once on a
phone (`e2e RW3`).

### 6.3 The rubric: 12 categories and stage applicability

Source: `content/writing/rubric.json` (shown to learners) and `supabase/functions/lucid-ai/rubric.ts` (used by
the assessor). The validator checks that `rubric.json` has exactly the 12 category ids and that its applicability
matrix for stages 1-10 matches `rubric.ts`; the stage 0 (free writing) column exists only in `rubric.ts`. For free
writing marked as an email or a message, argument strength, evidence quality, counterarguments and academic tone
are not applicable (`applicabilityFor(stage, kind)` in `prompts.ts`); a task stage keeps its own rules.

Scale, relative to the stage target (labels as shown in the editor): 0 not enough to judge (for example 20 words or
fewer of the learner's own language; a Lucid design choice, not an IELTS rule); 1 about a level below target; 2
approaching target; 3 meets target; 4 above target; 5 beyond target. "Must fully fit": the highest band whose
positive features are all met.

Applicability by stage (F = full, S = simplified, - = not applicable; stage 0 = free writing, judged against the
learner's level):

| Category | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Grammar | F | F | F | F | F | F | F | F | F | F | F |
| Vocabulary | F | F | F | F | F | F | F | F | F | F | F |
| Sentence structure | F | F | F | F | F | F | F | F | F | F | F |
| Coherence | F | S | F | F | F | F | F | F | F | F | F |
| Cohesion | F | S | F | F | F | F | F | F | F | F | F |
| Argument strength | S | - | - | S | F | F | F | F | F | F | F |
| Evidence quality | S | - | - | - | F | F | F | F | F | F | F |
| Counterarguments | S | - | - | - | - | F | F | F | F | F | F |
| Academic tone | S | - | S | S | S | S | S | F | F | F | F |
| Clarity | F | F | F | F | F | F | F | F | F | F | F |
| Precision | S | - | S | S | F | F | F | F | F | F | F |
| Overall | F | F | F | F | F | F | F | F | F | F | F |

### 6.4 What the server enforces after the model

`postProcess` in `supabase/functions/lucid-ai/schemas.ts` applies the protocol in code, not only in the prompt:

- Categories that do not apply at the stage are forced to not applicable with no score (never 0). For free
  writing, the text type counts too: an email or a message has no argument categories (section 6.3).
- Task-fulfilment gate (decided first by the model: complete, partial or off topic): "partial" caps argument
  strength, evidence quality and counterarguments at 2 and lowers the CEFR estimate one level; "off topic" caps
  every category at 1.
- Minimal-edit enforcement: an error whose quote is not verbatim in the learner's text, or whose correction is
  much longer than its span, is dropped and counted (`dropped_errors`); at most 15 errors are kept. Category
  examples that do not quote the text are dropped.
- With `LUCID_EVAL_RUNS` set to 2 or 3, each category takes the median of independent runs, and categories whose
  runs differ by more than one band are flagged low-confidence ("~" in the editor). The default is one run.
- The CEFR range always contains the estimate.

Status: **Built, tested with mocks only**: `deno: "research E rubric rules are enforced in code, not only
requested"`, `"minimal-edit enforcement drops errors whose quote is not in the learner text"`, `"several scoring
runs are made, their usage summed and their units reserved"`, `"free writing: an email or a message has no argument
categories, and the model is told the text type"` (not re-run here). The text type sent with a free-writing
request is tested with mocks in `e2e RW3` (an email is sent as kind `email`).

### 6.5 Feedback protocol in the editor

| Rule | Behaviour | Status |
|---|---|---|
| Task-fulfilment gate | When the gate is "partial" or "off topic", a warning with its note is shown first in the AI feedback; a "complete" gate shows nothing | Server caps: Built, tested with mocks only (`deno`, not run here). The warning in the editor has no test: the e2e mock always returns "complete" |
| Category bands while revising | Bands per applicable category, with details, a "how the bands work" explainer from `rubric.json`, and the label "Lucid estimate, aligned to CEFR descriptors" | Built, tested with mocks only, and only indirectly: `e2e 11-12` renders a mocked evaluation but asserts nothing about the bands |
| Overall range only on a final draft | The CEFR range ("Estimated level of this text") appears only on the draft the learner marks final ("Mark as final draft") or that the third round makes final automatically. Drafts show no level in the editor, Versions or "My drafts". | Built, tested with mocks only: `e2e 11-12` (no level on drafts, range after the third round), `e2e 13` (mark as final) |
| At most three AI rounds per task | The first draft and two revisions. After the last round the draft is final, "Get feedback" is disabled with a reason, and advice reads "What to carry into your next task" | Built, tested with mocks only: `e2e 11-12` |
| Feedback scope | "Focused" (every critical error plus at most 3 error types) or "comprehensive" (up to 12 errors); "by level" means focused up to B1 and comprehensive from B2 (Settings) | Partial: built, no test. `e2e 11-12` does not assert the scope it sends, and the `deno` fixtures pass a scope without checking its effect |
| Hint ladder | Each mistake opens at "locate" (rung 1: "There is a mistake here", with "Show in my text" selecting the span), then "What kind of mistake?" (rung 2: the error type), then "Stuck? A clue" (rung 3: the hint), then "Compare with the correction" (rung 4: correction and explanation, in Hebrew when support allows). Spelling, word choice, false friends, capitals and punctuation always start at rung 1; at course levels Pre-A1 to A2 every other mistake type starts at rung 2. Every step is logged as `hint-level` with whether it followed an attempt or a request ("stuck"). | Built, tested with mocks only: `e2e 11-12` |
| Attempt rule | Rung 4 is disabled ("Try a fix in your text first") until the learner has changed the sentence that held the mistake. "Looks fixed" appears only when the correction now stands in that sentence's place (found by the unchanged text around it); any other edit reads "You changed this". | Diff logic Built and tested: `unit diff: "a fix is judged in the sentence where the mistake was, not anywhere in the essay"`; in the editor, tested with mocks only (`e2e 11-12`, a wrong fix reads "You changed this") |
| Self-assessment | From stage 7, the learner may rate argument strength, evidence, counterarguments and coherence on the same bands: before the first feedback ("Before the feedback: how would you rate your text?"), and after it in a folded "Before your next feedback: rate your revised draft yourself (optional)". The ratings are stored with the next evaluation and shown next to the AI's bands; they are not sent to the AI | Partial: the form and its two labels are tested with mocks (`e2e RW3`); storing the ratings and showing them next to the bands have no test |
| Versions and diff | Every "Check" and every AI round saves a version on the device (no server needed). Versions lists them; the default comparison is previous vs latest, and any two versions (or the current text) can be compared word by word, with added or removed paragraph breaks marked "¶". The comparison opens on "Changes only": the changed paragraphs with their numbers, the count of unchanged paragraphs between them, and a "Paragraph N" jump list; "Whole text" shows everything | Built and tested: `unit diff` (4 comparison tests, including "paragraph breaks that were added or removed are marked, and the diff splits into paragraphs"), `e2e 11-12` (comparisons after mocked AI rounds), `e2e RW3` (changes only, jump list, whole text) |
| Progress since the previous draft | Shown on revisions | Built, tested with mocks only: `e2e 11-12` |
| Automatic checks | Always available; unchanged after AI feedback | Built and tested (section 6.6) |
| Delete this text | Removes the task's text, versions, draft and feedback from the device (and the server at the next sync), and clears quoted mistakes from its attempts; scores and mistake types stay | Built and tested: `e2e 11-12` (device), `unit store-sync` (tombstones carry no content) |
| Length and size limits | Up to 24,000 characters per text (enough for a 2,200-word paper with references), instructions up to 4,000, body up to 64 KiB. The client checks before sending, drops the previous draft when both do not fit (and says so), and explains every refusal in words, never the server's raw message | Built, tested with mocks only: `e2e 13`, `deno: "a 2,000-word paper with references fits; ..."` |
| Report a mistake | A button under AI feedback logs an `ai-report` event on the device (synced with an account). No review process or tool reads these reports | Partial: logging only, no test |
| Timed writing | Optional countdown on timed tasks (we-14, 40 minutes). When time is up a message says so; the editor is not locked | Partial: built, no test |

### 6.6 Automatic checks (no AI)

`js/core/writing-analyzer.js`. Deterministic signals, labelled "automatic checks, not a grade":

- 20 pattern rules for common errors (for example capital *I*, "I am agree", uncountable plurals, double
  comparatives, *depend of*, *discuss about*, *explain me*, age with *have*, modal + *to*, *did* + past form,
  *if* + *will*, space before punctuation, possible run-ons), with *a/an* decided by sound (initialisms letter by
  letter).
- Three formal-register rules (contractions, informal words, personal hedges): in the essay editor for B2-C2
  learners on stage 7+ tasks; in lesson `write` exercises at B2-C2.
- Low-precision rules (run-ons, *if* + *will*) are off at C1-C2; a run-on is not flagged after a sentence-initial
  linker, a phrase linker (*to sum up*, *to conclude*, *all in all*, *first of all*, *put simply* and others), a
  fronted time phrase (*last year*, *these days*) or a short phrase; *if* + *will* is not flagged in indirect
  questions.
- Checks: word count against the target (references not counted), required words, capital letters at sentence
  starts, final punctuation, paragraphs (from 150 words, aim for 3), very long sentences (over 40 words, 55 at
  C1-C2), repeated sentence openings.
- A title line and a closing reference list are not checked or counted.
- Free writing marked as an email or a message gets no argument checklist and no formal-register warnings; its
  sign-off ("Best," and a name) is not checked as a sentence, though its words count; *yet*, *next* and *first*
  count as linkers only where they join ideas (not in "not yet" or "next week").

Status: **Built and tested**: `unit writing-analyzer` (11 tests, including `"no run-on flag after phrase linkers
such as \"To sum up,\" or \"Last year,\""` and `"an email gets no argument signals, no formal-register warnings,
and its sign-off is not checked"`), `e2e 11-12` ("more better" is flagged; the Check button shows a visible result),
`e2e RW3` (an email is not checked as an argued essay).

### 6.7 What AI feedback cannot verify

Stated to the learner in the editor on source-based tasks (`e2e 13` asserts it) and required of the model in
`prompts.ts`:

- It does not read the sources and cannot check whether a source exists, whether a quotation or figure is accurate,
  or whether a source says what the learner reports. On source-based tasks (stage 9+, research, evidence
  evaluation and critical response, a task with a source pack, or instructions that mention sources, citations or
  references) it returns a `verification_note` naming what the learner should check. The editor shows Lucid's own
  statement and the AI's note as separate blocks, the note labelled "From the AI feedback: what to check"; the
  prompt asks the model to name what to check without repeating that it cannot verify sources (`e2e RW3`, with
  mocks).
- It cannot tell whether a text was written with AI or copied, and is told never to claim either.
- Its scores have not been compared with human raters. 05 section 5 sets the launch gate (agreement of at least
  0.70 QWK on language categories and 0.60 on content categories, on at least 100 held-out essays per stage group);
  no calibration set exists.
- The editor labels all AI output "AI feedback can be wrong".

---

## 7. Real-Life English

### 7.1 Modules and scenarios

`content/real-life/scenarios.json`: 36 scenarios.

| Module | Scenarios | Levels |
|---|---|---|
| Airport | 5 | A1, A2 x2, B1 x2 |
| Hotel | 5 | A1, A2, B1 x2, B2 |
| Restaurant | 5 | A2 x2, B1 x3 |
| Transport | 4 | A1, A2, B1, B2 |
| Shopping | 4 | A2 x2, B1, B2 |
| Social | 4 | A2 x2, B1 x2 |
| Emergency | 3 | B1 x3 |
| At work | 6 | A2 x2, B1 x2, B2 x2 |

By level: A1 3, A2 12, B1 16, B2 5. There are no scenarios above B2.

The "At work" module (Hebrew "בעבודה") has: first day, meeting a new team (A2); small talk before a video call
(A2); a stand-up status update (B1); checking what a task really involves (B1); an email asking for more time
(B2, written practice: every reply is an email); disagreeing politely in a meeting (B2). Each has 12 phrases, a
model dialogue, 5 practice turns with exactly one best, one OK and one poor reply, a roleplay brief, culture notes
and US/UK variants (`unit work-content: "every work practice turn has exactly one best, one ok and one poor reply,
each explained"`).

The hub (`js/views/reallife.js`) lists the modules in this order: airport, hotel, emergencies, transport,
restaurants, shopping, social English, at work. It shows the learner's course level in words, marks each scenario
"below", "at", "a small stretch" (one level up) or "challenging", starts with up to three scenarios not yet done at
or below the level in goal order (then one level up; a work goal picks workplace scenarios), and lists each topic
folded to two scenarios, with topic and level filters. A note says that scenarios and scripted practice work
offline and links to "Offline use" in Settings. Conversations reuses the same filters. **Built and tested**:
`e2e RL1`, `e2e RW4` (the offline link), `unit reallife` (fit, "Start here", next scenario), `unit work-content`
("work scenarios exist from A2 to B2, and the hub lists every module with a real icon"; "Start here" for a work
goal).

### 7.2 Scenario anatomy

`js/views/scenario.js`, four tabs:

| Tab | Content (totals across the 36) | Works without AI | Status |
|---|---|---|---|
| Prepare | Situation and goal (EN and HE); phrases with register (polite, neutral, casual), optional US/UK variant and note (428 phrases); culture notes (all 36); US/UK variants (35) | yes | Built and tested: `e2e 9` |
| Model dialogue | The partner and "you" lines, read aloud (418 lines) | yes | Built and tested: `e2e 9` |
| Practise (scripted) | 180 turns (4-6 per scenario). For each partner line the learner picks a reply rated best, OK or poor, with feedback in both languages and, where authored, the error type of a weaker option (13 weaker options carry one); the explanation opens by quoting the chosen reply ("Your reply:"), and the other replies and their feedback are shown on separate lines. The learner may also type or dictate a reply in their own words, which is checked only for whole key words or a question back and is phrased as a suggestion. Each choice is recorded as a speaking attempt (best 1, OK 0.5, poor 0) under `travel-functional` or, for social and workplace scenarios, `social-functional`. The end shows how many times the learner chose the most natural reply, out of the number of turns, and the next scenario | yes | Built and tested: `e2e 9`, `e2e RL2`, `e2e RW2` (the chosen reply quoted), `unit reallife: "free replies: whole words, and a question back counts (P-60)"` |
| AI roleplay | The partner plays a persona with a complication; the learner types or dictates; "I'm stuck: help" shows the goal (as its own left-to-right block under "Your goal") and the scene's phrases, with a name in a phrase replaced by "[your name]", which is selected when the phrase is copied into the box (no AI call; logged as `roleplay-help`); a "Hebrew tips when I get stuck" checkbox; then a report (section 7.4). Without an account, the tab says why an account is needed (AI consent is saved in it; daily AI limit) and offers "Create an account" and "Sign in", sign-up first on a device that was never signed in | no | Built, tested with mocks only: `e2e RL3`, `e2e RW2` |

When AI is not available, the Practise tab's main action is the next scenario, not the roleplay (`e2e RL2`). The
scenario header keeps the top-bar title on one line and the tabs on one scrolling row at 130% text (`e2e RW2`).

### 7.3 Expressions and slang

`content/real-life/slang.json` (60 entries, 10 of them workplace expressions: *touch base*, *loop someone in*,
*on my plate*, *circle back*, *bandwidth*, *OOO*, *EOD / EOW*, *ping (me)*, *hop on a call*, *take it offline*), `js/views/slang.js`.

| Field | Content |
|---|---|
| `term`, `meaning_en`, `meaning_he` | The expression and its meaning in both languages |
| `usage` | When people use it (EN and HE) |
| `formality` | very informal 5, informal 43, neutral 12 |
| `region` | both 40, US 14, UK 6 (the schema also allows AU; no entry uses it) |
| `level` | A2 20, B1 32, B2 8 |
| `example_dialogue` | A short conversation |
| `mistakes` | Common mistakes |
| `avoid_when` | When not to use it (every entry) |
| `warning` | 6 entries: *gonna/wanna* (never in essays or work emails), *suit yourself* (can sound cold), *mate* (overfamiliar from strangers), *chill* (dismissive to an upset person), *omw* (keep for friends), *Can I get...?* (abrupt to some British speakers) |
| `related` | Related expressions |

The list shows the term, Hebrew meaning, formality, region and level; an entry expands in place. It sorts by level
for learners up to A2 and A-Z from B1, and is grouped like Real life: by level (with a fit label) or, A-Z, in letter
ranges of about 12, each group folded to 5 with "Show all N". A search shows every match unfolded. It has a "for my
level" filter, formality and region filters, and a search that matches the start of words in English and Hebrew.
**Built and tested**: `e2e 10` (grouped and folded, then a search finds "No worries"), `e2e RL4`, `unit reallife:
"expression search matches the start of words, in English and Hebrew (P-68)"`, `unit work-content` ("email",
"meeting", "deadline" and "circle back" each find an entry).

**Offensive-term handling.** The dictionary contains no vulgar, offensive or taboo terms; its warnings are about
tone and register. There is no mechanism for offensive entries (no content warning, filter or age gating), and no
documented policy on including them. **Not built**.

### 7.4 AI roleplay and its report

Server prompt: `roleplaySystem()` and `feedbackSystem()` in `prompts.ts`; client: `js/views/scenario.js`.

- **Turns** (`roleplay_turn`, effort low, 4,000 output tokens): the partner stays in character, matches the
  learner's level, keeps turns to 1-3 sentences, introduces the complication by the second or third turn, asks for
  clarification instead of guessing, and signals "English only" if the learner writes Hebrew. With correction
  "off", "light" or "standard" it never corrects during the scene; with "intensive" it may confirm a meaning with
  the correct form, in character, at most once per turn. A Hebrew hint is returned only when support is full or
  partial and the learner seems stuck. The scene completes when the goal is reached or after about 12 learner
  turns. The checkbox sends at least "partial" support when on and at most "minimal" when off.
- **Report** (`roleplay_feedback`, effort medium, 8,000 tokens): conversation score and task completed; grammar,
  vocabulary and naturalness scores (0-100) with comments; up to 3 strengths quoting the learner; "more natural"
  alternatives that must quote the learner exactly (the server drops any that do not), capped by the correction
  setting and level (off 0; light 2; standard 4, or 3 at Pre-A1-A2; intensive 6, or 4); things to practise; a
  summary that leads with the outcome; at full or partial Hebrew support, one Hebrew line per strength and per
  practice point (`strengths_he`, `practice_he`; the server keeps them only at those support levels). The report
  opens at its heading, leads with the outcome and strengths, and keeps the scores folded; the lists follow the
  screen direction under their headings, with the English isolated. Recent conversations lead with "Goal
  reached", not a score.
- The conversation (up to 40 turns) and report are saved on the device as a `chats` record and synced with an
  account. A past conversation can be deleted from Conversations; only its id is kept for sync.

Status: turns and report **Built, tested with mocks only** (`e2e RL3`, `e2e RW2` (the Hebrew report lines); `deno:
"roleplay transcripts alternate roles, start and end with the learner side"`, `"roleplay feedback: strengths kept,
alternatives quote the learner and follow the correction setting and level"`, `"roleplay feedback: Hebrew strengths
and practice, one per item, only at full or partial support"`). Deletion **Built and tested** (`e2e RL7`).

---

## 8. AI tutor

`js/views/tutor.js`; prompt `tutorSystem()` and `tutorMessages()` in `prompts.ts`; route `tutor_turn` (effort low,
6,000 output tokens, plain text). Status: **Built, tested with mocks only** (`e2e 17`, `e2e 20`; `deno: "tutor
messages carry learner context and merge same-role turns"`). The "not configured" state is Built and tested
(`e2e 17`).

### 8.1 The eight modes

| Mode | What the prompt asks for |
|---|---|
| Beginner | Very simple English, short sentences, lots of Hebrew as the policy allows; default for Pre-A1 and A1 |
| Conversation | Natural chat on the learner's topics with follow-up questions; optionally one brief tip; default from A2 |
| Grammar | Rules with contrasting examples, then 1-3 practice sentences, waiting for the learner's answers |
| Vocabulary | Meaning, example, collocations and register; active-recall quizzes |
| Writing coach | Help to plan, draft and revise with questions and hints; never writes the essay, paragraph or sentences |
| Academic debate | Takes a position, asks for evidence, exposes fallacies, steelmans the other side |
| Travel companion | Phrases, cultural tips and quick practice for trip situations |
| Pronunciation | Works with written cues (IPA, Hebrew comparisons, minimal pairs, Speaking lab exercises). It cannot hear the learner, and the screen says so even when dictation is used (`e2e PS6`) |

### 8.2 Correction intensity

One setting in Settings ("How much correction in conversations and the tutor") applies to both the tutor and
roleplay.

| Setting | Tutor | Roleplay during the scene | Roleplay report alternatives |
|---|---|---|---|
| Off | Never corrects unless asked | No corrections | none |
| Light ("only what blocks meaning") | Only errors that block meaning | No corrections | up to 2 |
| Standard (default) | At most one correction per reply | No corrections | up to 4 (3 at Pre-A1-A2) |
| Intensive | Up to three | May confirm a meaning with the correct form once per turn | up to 6 (4 at Pre-A1-A2) |

To correct, the tutor first prompts the learner to fix it, then gives the form with a one-line reason.

### 8.3 Context sent with each tutor message

Mode, correction setting, course level, Hebrew support; the learner's goals; the weak topics (at most 5, because
the learner model keeps 5; `tutor.js` would allow 8) and up to 8 recurring mistake types (by English name); the titles of the last 5 completed lessons; the last 30 messages of
the conversation in that mode; the new message (up to 2,000 characters). Not sent: name, email, birth year.

### 8.4 What it never does

According to the system prompt: it does not write the learner's work (it offers to help them do it), does not
rewrite the learner's whole message, keeps replies under about 180 words with no tables, stays on learning
English, keeps content appropriate for a 16-year-old, and treats learner messages as messages, not instructions.
These are instructions to the model only: no code checks the tutor's replies. Replies are escaped before display,
and only `**bold**` is rendered.

Conversations are saved per mode on the device (and synced with an account). The learner can delete the
conversation on screen, and in one step all other saved tutor conversations; only an empty tombstone reaches the
server. Deleting the conversation on screen is tested with mocks only (`e2e 20`); "delete all others" has no test.

---

## 9. Progress and reports

### 9.1 What is shown

| Where | What | Status |
|---|---|---|
| Today | The plan; the level rail (course level); the skill profile; the weekly goal ("3 of 5 days"); a tag when a lesson was completed today | Plan and the completed-today tag: Built and tested, `e2e 7`, `e2e L3`, `e2e L5`. Level rail, skill profile and weekly goal: Partial, they render (`e2e 14-15`, `axe`) but no test asserts their content |
| Progress: report | For this week or this month: days studied (with the weekly goal), active minutes (including the open session; sessions are logged when the tab is hidden, capped at an hour), exercises, first-try accuracy with the change from the previous period, recall on reviews against the retention target, stable words (3+ weeks) and new words, lessons completed (curriculum lessons only), recall after 30 days (or "waiting for enough data"), a bar chart of exercises by day or week, topics improved by 10+ points, recommendations for next week | Weekly: Built and tested, `e2e L7`, `e2e L3`, `unit engine: "period report ..."`, `unit learner-logic: "reports count only curriculum lessons and include the open session"`. Monthly view: same function with 30 days; no e2e test opens it (Partial, no test) |
| Progress: level by skill | Each skill's level with its source (placement first estimate, practice, assessed writing) and evidence count, or "not yet assessed" | Built and tested: `e2e L2` |
| Progress: level checks | Status and best score per level | Partial: renders (`e2e 14-15`); no test produces a level-check result |
| Progress: recurring mistakes | Up to 8 error types with counts, recurring marked, trend, each linking to a drill | Built and tested: `unit engine` (trends); rendering in `e2e 14-15` |
| Progress: topics | Counts of secure, practising and weak topics; weak topics link to drills; "Secure" defined on screen | Built and tested: `unit engine` (mastery) |
| Grammar lab | Mastery meter only once there is evidence | Partial: renders (`e2e 14-15`, `axe`); the meter has no test |
| Vocabulary notebook | New (never reviewed), Learning (stability under 21 days), Known (21+ days) | Listing: Built and tested, `e2e 8` (a reviewed word appears). The three statuses: Partial, no test asserts them |

### 9.2 Evidence rules

The thresholds in section 5.2 apply everywhere a level or mastery is shown. Progress states: "What you can do
now, based on evidence. No points, no scores for time spent", and "Lucid does not promise that finishing the course
gives a level". Placement and unscored practice never count toward accuracy or levels.

### 9.3 No meaningless XP

There are no points, XP, streaks, leagues, leaderboards, badges, energy, hearts or chests. Verified by a code
search of `js/`: these words appear only in copy that says there are none ("no streak to break") and in unrelated
element ids (`xp-` in `slang.js`); the only "points" are the lesson's first-try points (section 4.2), which are
never shown as a total or a ranking. A day off does not reset anything.

---

## 10. Accounts, data and privacy

### 10.1 Device-only mode and account mode

| | Device-only (the build as configured) | Account mode (needs Supabase) |
|---|---|---|
| Where data lives | IndexedDB on the device (memory fallback in private browsing), in nine collections: profile, settings, progress, attempts, cards, writing, chats, placement, events (`js/core/store.js`) | The same, plus `lucid_profiles` and `lucid_records` on the server |
| What works | Everything except accounts, sync, server export and deletion, and the AI features | Everything, AI after the steps in section 12 |
| Status | Built and tested (every e2e check without `mock: true`) | Built, tested with mocks only (`e2e 11-13`, `e2e 17`-`20`, `e2e RL3`; `unit auth`, `unit session`, `unit store-sync`; `db` on PGlite) |

### 10.2 Accounts and sync

| Feature | Behaviour | Status |
|---|---|---|
| Sign-up, sign-in, password reset | Email and password through Supabase Auth over `fetch` (`js/core/api.js`); after signing in the learner returns to the screen they came from | Built, tested with mocks only: `e2e 18`, `e2e 20`, `unit auth` |
| Email links | Confirmation and reset links are adopted only in the browser that asked for them, within an hour, and only for the email typed there; otherwise the tokens are stripped and ignored | Built, tested with mocks only: `e2e 18`, `unit auth` (4 tests) |
| Server profile first | The server profile is created from the device profile before the first sync; if the server refuses it (for example the age gate), nothing syncs | Built, tested with mocks only: `unit session` |
| Shared devices | The device records which account owns its data. Signing in as a different account never merges: the learner removes the other account's data or cancels. Unowned data moves into an account only on sign-up or after the learner agrees | Built, tested with mocks only: `e2e 19`, `unit session` (5 tests) |
| Sync | Two-way: push local changes, then pull server changes since a cursor; the server stamps `updated_at`; a record waiting to be pushed is never overwritten by an older server copy; newest write wins. Runs every 60 seconds while the tab is visible, when the tab is hidden, after sign-in and on "Sync now". Deletions are tombstones with an empty document | Built, tested with mocks only: `unit store-sync` (two devices converging through a fake server), `e2e 20` ("Sync now", tombstone on the mock server) |
| Password change | Asks for the current password and signs in with it again before sending the new one, except within 30 minutes of a reset link used in the same tab | Built, tested with mocks only: `e2e 20`, `unit auth` |
| Sign out, and sign out and remove | "Sign out" keeps device data; "Sign out and remove my data from this device" syncs, then erases Lucid's data only | Built, tested with mocks only: `e2e 19` (sign out, then the device data is still there), `e2e 20` (sign out and remove) |
| Storage quota | 100,000 records and 50 MB of JSON per account; a write over the limit is refused (SQLSTATE 54000); shrinking is always allowed | Built and tested on PGlite: `db: "per-account storage quota ..."` |

### 10.3 Export, restore and deletion

| Feature | Behaviour | Status |
|---|---|---|
| Download all my data (JSON) | Device snapshot, plus the server export (`lucid_export()`: account email and sign-up and last sign-in dates via `lucid_account_info()`, profile, records, AI request log) when signed in | Device: Built and tested, `e2e 16`. Server export: the RPC is tested on PGlite (`db: "export returns only the caller; delete removes everything"`); no e2e check downloads it, even with mocks (Partial) |
| Restore a backup | Replaces device data with a Lucid backup file after confirmation | Partial: built, no test |
| Delete all data from this device | Removes the `lucid` IndexedDB database, `lucid-` keys in local and session storage and `lucid-` caches; other apps on the origin are untouched | Built and tested: `e2e 16`, `unit store-sync: "erasing the device removes only Lucid keys and caches, never other apps on the origin (S-04)"` |
| Delete my account and all data | Calls `lucid_delete_account()` (deletes the auth user; every Lucid table cascades), then erases the device | RPC tested on PGlite (`db`); the Settings path with an account has no test, even with mocks (Partial) |
| Delete one text, one tutor conversation, one roleplay conversation | Sections 6.5, 8.4 and 7.4 | Built and tested (device) / mocks (server tombstones) |

### 10.4 Consent

- **Terms**: onboarding requires accepting the terms and privacy policy (`consent_terms_at`).
- **AI consent**: off by default for everyone. Offered in onboarding and Settings ("AI feedback"), stored with a
  timestamp in device settings and, with an account, as `consent_ai_at` on the server profile. The edge function
  refuses AI requests without server-side consent (`ai_consent_required`). Status: Built, tested with mocks only
  (`deno: "authentication, validation and consent"`; e2e checks set consent through the store).
- **Microphone**: the one-time notice (section 5.6).
- **Marketing**: no marketing exists; `marketing_opt_in` defaults to false and is forced false for under-18s.
  There is no opt-in control.

### 10.5 AI rate limits and budgets

All AI goes through one Supabase Edge Function, `supabase/functions/lucid-ai`. The API key stays on the server.

| Limit | Default | Setting |
|---|---|---|
| Units per request | writing evaluation 3 per scoring run (3, 6 or 9); roleplay report 2; roleplay or tutor turn 1 | `UNITS` in `schemas.ts`; `LUCID_EVAL_RUNS` |
| Per learner, last hour | 40 units | `LUCID_HOURLY_UNITS` |
| Per learner, last 24 hours | 200 units | `LUCID_DAILY_UNITS` |
| Requests running at once per learner | 2 | `LUCID_MAX_IN_FLIGHT` |
| All learners together per UTC day | 1,000 units (0 pauses AI for everyone) | `LUCID_GLOBAL_DAILY_UNITS` |
| Output caps | tutor 6,000 tokens; roleplay turn 4,000; report 8,000; essay 16,000 per run | `handler.ts` |

Order of checks: origin allow-list, declared size, sign-in, byte-counted body (64 KiB), schema, consent, then an
atomic reservation (`lucid_ai_reserve`, service role only, per-learner advisory lock, writes a `pending` usage row)
before the model is called. A reserved call stays counted however it ends; if the database cannot be reached the
request is refused. Refusal codes: `rate_limited`, `in_flight` (429), `budget_exhausted`, `unavailable` (503); the
client explains each in words. Model `claude-opus-5-5` by default (`LUCID_MODEL`), with server-side refusal
fallback; system prompts are static and cached. Status: **Built, tested with mocks only**: `db: "AI units are
reserved by a service-role-only function with hour, day, in-flight and project limits (S-02, S-09)"` (PGlite),
`deno` (7 tests on limits, parallel requests, refusals and body size). The fix log reports a separate race test on
real Postgres 16 (2 x 30 parallel requests stopped at a budget of 25); that test is not in the repository's suites.

### 10.6 What each AI route sends

| Route | Sent to the edge function (and from there to Anthropic) | Never sent to Anthropic |
|---|---|---|
| `evaluate_writing` | Text (up to 24,000 characters); for a revision, the previous text and the priorities given last time, when both fit; task title, kind, instructions (assignment prompt, task instructions, the chosen topic and the titles of a source pack; up to 4,000 characters), word range, focus categories, required elements; course level; stage; draft number; Hebrew support; feedback scope | Name, email, birth year |
| `roleplay_turn`, `roleplay_feedback` | The conversation so far (up to 40 turns), the opening line, the scenario's title, partner role, persona, complication, goal and level; the English variant; Hebrew support; the correction setting | Name, email, birth year |
| `tutor_turn` | Section 8.3 | Name, email, birth year |

The learner's sign-in token identifies them to the edge function only. The database keeps, per AI request, the
route, units, outcome, token counts and time, not the text (`lucid_ai_usage`). `privacy.html` lists these fields per
feature (`e2e RL6` checks only that it contains "Not sent" and "recurring mistake types"); its writing entry does not name the feedback scope, word range or focus categories, which are
task settings rather than learner data.

Prompt-injection handling: learner text, task instructions, the scene and transcripts are wrapped in tags and
treated as data, and Lucid's own tag names typed inside client text are neutralised (`deno: "client text cannot
close the wrappers it is placed in"`). The client still supplies the scenario brief and the conversation history;
the server does not resolve them from bundled content (security review S-10, open).

### 10.7 Security posture

`docs/qa/security-review.md` (a security review of commit `5102e40`; the file calls it independent and does not
name the reviewer) and `docs/qa/fix-log.md` (102 findings including the simulated persona panel: 95 fixed, 7
partial). Built protections:

- Content Security Policy (`index.html`): scripts and fonts from the same origin only, images from the same origin
  and `data:` URLs, no inline scripts, network connections only to the same origin and `*.supabase.co`
  (`style-src` allows inline styles). `e2e 16` checks only that the policy is present with `script-src 'self'`; it
  also scans `js/` and `config.js` for `sk-ant-`, `service_role` and `SUPABASE_SERVICE_ROLE_KEY`.
- Escaping by default through the `html` template (`js/core/util.js`); no dedicated test.
- No secrets in the client: `config.js` holds only the Supabase URL and its publishable key.
- RLS on every table, owner-only; no table access for `anon`; `TRUNCATE`, `REFERENCES` and `TRIGGER` revoked from
  `authenticated` (`db: "learners have no TRUNCATE, REFERENCES or TRIGGER and no access to internal tables (S-16)"`).
- A malformed address does not stop the app (`e2e 16`, `unit router`).
- No third-party scripts or trackers; fonts are self-hosted.

Open security items are in section 15.

---

## 11. Accessibility, localisation and performance

### 11.1 WCAG coverage of the automated audit

`tests/e2e/a11y.mjs` runs axe-core 4.14.0 with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`
(axe's best-practice and AAA rules are not run) on 24 routes: welcome, help, today, path, practice, vocab, grammar, reading,
listening, speaking, writing, writing/free, tutor, real-life, expressions, conversations, two scenario views (one on
its practice tab), progress, profile, settings, account, lesson/pa1-05 (explanation stage) and review. It runs in 3
configurations: Hebrew UI light at 390 px, Hebrew UI dark at 1440 px, English UI light at 1440 px. Result on
2026-10-31: **0 violations**.

What it does not cover:

- **Hebrew support other than "full".** The audit creates a Pre-A1 learner. A spot check run while writing this
  document, and run again while checking it (not part of the suite; axe with the same tags, Hebrew UI, light theme,
  1440 px, Today, Path, Practice and Real life), found colour-contrast failures (WCAG 1.4.3) for a B1 learner: the
  dimmed Hebrew legend lines at minimal support (`:root[data-support='minimal'] .legend .l-he { opacity: 0.6 }` in
  `css/app.css`) measure 2.79-2.86:1 (12 nodes on Path, 17 on Real life, 1 on Today). The fix log noted the same
  contrast under P-45. Separately, in the Hebrew UI with the light theme at desktop width (a combination the audit
  does not run), the active rail item's English secondary legend measures 4.37:1 against the required 4.5:1 (one
  node on every page checked, for both the B1 and the C1 learner).
- Routes not visited: start (onboarding), placement, checkpoint, drill, other path levels, other `writing/:id`
  tasks, the AI tabs with content, the lesson's practice and summary stages. Welcome is redirected to Today
  because the learner already exists.
- Automated rules only, in Chromium only. No manual screen-reader testing (NVDA, JAWS, VoiceOver) and no WebKit or
  Gecko runs have been done (`06-ux-recommendations.md`, section 6.4).

Other accessibility features in the code: a skip link; every exercise usable by keyboard (Enter to check and
continue, 1-6 for options; match and categorize are buttons); a focus move to the heading of each lesson stage,
the roleplay report and the scenario explanation (`e2e PS3`, `e2e RL2`, `e2e RL3`); `aria-live` regions for
verdicts and status; minimum 44 px heights for small controls on coarse pointers (section 2.4); no time pressure
except the optional timer on timed writing. These have no dedicated keyboard or screen-reader test beyond the checks named.

### 11.2 Text size, theme and reduced motion

| Feature | Status |
|---|---|
| Text size 100, 115, 130 or 150% (Settings; sets `data-text` on the root) | Built and tested at 130% and 150%: `e2e 14-15` (no sideways scroll at 130% at 390 px, and at 150% at 390 and 320 px). 115% has no test |
| Light, dark or device theme | Dark via the device setting is audited (`axe`); the theme control itself has no test (Partial) |
| Reduced motion: animations and transitions cut to 0.001 ms and smooth scrolling off under `prefers-reduced-motion: reduce` (`css/app.css`) | Partial: built (CSS rule), no test asserts it. All browser tests run with reduced motion on. |

### 11.3 Localisation

Two interface languages, Hebrew and English, with strings in `js/core/i18n.js` and inline pairs in the views.
Learning content is always English; explanations carry Hebrew where the schema requires it (required Pre-A1-A2,
recommended B1, optional B2, normally absent at C1-C2; `docs/content-schema.md`). Hebrew counters are written in
words so numbers cannot read backwards (`unit player: "in Hebrew the counter is written in words, ..."`). No other
languages exist. RTL and bidi are covered in section 2.3.

### 11.4 Offline

`sw.js` (release `2026-10-31.1`), registered in any secure context. On install it caches the app shell, fonts,
taxonomy, curriculum and manifest, then every module and every non-lesson content file listed in
`content/manifest.json` (`offline`, 61 entries). Lessons (about 3.0 MB) are cached when opened, or all at once from
Settings ("Save all lessons on this device"). Code is network-first with a 4-second fallback to the cache; content
and fonts are stale-while-revalidate; other origins are never cached; activating a new release deletes only older
`lucid-` caches. AI features, sync and speech recognition need a connection.

Status: **Built and tested**: `e2e OF1` (after saving all 75 lessons and going offline: review, Conversations, Real
life, Expressions, a scenario, a saved lesson, the Writing lab and Progress load, and a reload works), `unit sw` (6
tests), `unit offline-manifest` (2 tests).

### 11.5 Page weight and performance

Measured on the files in this commit (no performance budget is enforced by any test):

- First load: the static module graph, stylesheet, shell and core content (index, CSS, 17 modules including
  `config.js` and the vendored FSRS library, taxonomy, curriculum, manifest) is about 314 KB uncompressed, about 93 KB if each file is
  gzip-compressed (actual transfer depends on the host's compression); the two preloaded font subsets add about 45 KB
  (WOFF2). The first view module adds 3-57 KB uncompressed depending on the screen (Today: 23 KB, 8 KB compressed).
- `index.html` preloads the whole static graph (`modulepreload`) so a first visit fetches it in one round trip;
  `js/core/session.js` and `js/core/placement.js` are in the static graph but not in the preload list.
- Views load on demand (lazy `import()` per route). Lesson files are 14-75 KB each (about 40 KB on average) and
  load when opened.
- No build step, no framework, no third-party scripts.

---

## 12. Configuration

Source: `docs/setup.md`, `config.js`, `supabase/functions/lucid-ai/index.ts`.

### 12.1 What works with no configuration

With `config.js` as committed (`supabaseUrl: ''`, `supabaseKey: ''`, `aiEnabled: false`), these features need no
server: onboarding, placement, all 75 lessons, level checks, spaced review, drills, the labs, the Writing lab with
automatic checks, versions and comparison, real-life scenarios with scripted practice, expressions, progress
reports, export, restore and device deletion, and offline use. Their test status is in the sections above (level
checks, backup restore and several others have no test). The AI screens say that AI is not configured or not
available on this site (`e2e 17` checks the tutor, free writing and Conversations); the account screen explains
device-only mode.

To run locally: from the repository root, `python3 -m http.server 8765` and open `http://localhost:8765/lucid/`.
Tests need Node 20+: `cd lucid && npm install && npm test && npm run test:db && npm run validate`; browser tests
with `npm run test:e2e` (pre-installed Playwright Chromium). Edge-function tests need Deno.

### 12.2 What needs Supabase (accounts, sync, server export and deletion)

1. **Serve Lucid from its own origin** (a host that serves nothing else), because the session tokens, IndexedDB
   and the offline cache are per origin and the GitHub Pages address is shared with the repository's other sites.
2. **Use a dedicated Supabase project**: account deletion removes the `auth.users` row, and sign-up settings,
   limits and database size are per project.
3. Run the migrations in order: `supabase/migrations/001_lucid_core.sql`, `002_lucid_hardening.sql`, and
   `003_lucid_export_account.sql` (all can be run again safely). `docs/setup.md` and `docs/architecture.md`
   section 8 list only 001 and 002; without 003 the export omits the account email and dates that `privacy.html`
   says it includes.
4. Authentication, URL configuration: Site URL = Lucid's own origin, also in the redirect URLs; email and password
   sign-in enabled.
5. Authentication settings: **Confirm email on**; **Secure password change on** (Lucid's form re-authenticates with
   the current password; not tested against a live project); **Require current password when changing password
   off** (Lucid does not send it with the update); refresh token reuse detection on; review sign-up and email rate
   limits; **CAPTCHA off** (the client sends no CAPTCHA token, so turning it on blocks sign-up, sign-in and reset).
6. In `lucid/config.js`: `supabaseUrl: 'https://<project>.supabase.co'`, `supabaseKey: '<publishable key>'`. Never
   the service-role key.
7. Turn on usage and spend alerts. A free-plan database becomes read-only above 500 MB.

Storage limits (100,000 records, 50 MB per account) can be changed by re-creating `lucid_storage_limits()`.

### 12.3 What needs an Anthropic key (AI writing feedback, AI roleplay, AI tutor)

1. Create an API key in an Anthropic workspace used only by Lucid, with a monthly spend limit.
2. `supabase secrets set ANTHROPIC_API_KEY=<key> LUCID_ALLOWED_ORIGINS=https://<lucid's own origin>`, then
   `supabase functions deploy lucid-ai` (needs migration 002). `LUCID_ALLOWED_ORIGINS` defaults to
   `http://localhost:8765` when unset (`index.ts`).
3. Optional secrets: `LUCID_MODEL` (`claude-opus-5-5`), `LUCID_HOURLY_UNITS` (40), `LUCID_DAILY_UNITS` (200),
   `LUCID_GLOBAL_DAILY_UNITS` (1000; 0 pauses AI), `LUCID_MAX_IN_FLIGHT` (2), `LUCID_EVAL_RUNS` (1; 2-3 scores each
   essay that many times at that multiple of cost). A missing or malformed number falls back to its default.
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` come from Supabase.
4. Set `aiEnabled: true` in `config.js`.
5. Each learner must sign in and turn on "AI feedback" in Settings.

Rough ceiling on daily output spend: `LUCID_GLOBAL_DAILY_UNITS` x about 6,000 output tokens x the model's output
price (one unit allows at most about 6,000 output tokens plus input).

### 12.4 Deploy

GitHub Pages deploys `main` (`.github/workflows/pages.yml`), excluding `lucid/tools`, `lucid/tests`,
`lucid/supabase`, `lucid/docs/research/data`, `lucid/node_modules`, `lucid/package.json`,
`lucid/package-lock.json` and `lucid/.impeccable`. Bump `RELEASE` in `sw.js` with each deploy
that changes Lucid's files. Before inviting real learners, fill in the two "To be filled in before public launch"
boxes in `privacy.html` (operator name and contact; Anthropic's API data retention terms).

---

## 13. Acceptance criteria

The brief's criteria are not stored in the repository. `tests/e2e/run.mjs` calls itself the acceptance tests for
the "Phase 16 criteria" and numbers the criterion checks 1 to 17 (with combined checks "4-6", "11-12" and
"14-15"); it adds account checks 18 to 20 and lettered checks (L, RL, OF, PS). The wording below is taken from the
check titles. Results: the run on 2026-10-31 (`E2E_PORT=8811`) and a re-run on the same day while this document was
checked (`E2E_PORT=8812`) both reported **38 of 38 checks passed**.

| # | Criterion | E2E check(s) | Result | Mocks |
|---|---|---|---|---|
| 1 | A new user can register | `1` (device onboarding; under-16 refusal); `18`, `19` (server account sign-up and sign-in) | PASS | Device registration: none. Account registration: mocks only |
| 2 | A new user can complete a placement assessment | `2`, `L1`, `L2` | PASS | none |
| 3 | A learner can start at absolute beginner level | `3` | PASS | none |
| 4 | Lessons have real content | `4-6`, `PS7` | PASS | none |
| 5 | Exercises give feedback | `4-6`, `PS2`, `PS4` | PASS | none |
| 6 | Progress is saved across reloads | `4-6`, `L3` | PASS | none |
| 7 | The curriculum adapts | `7`, `L5`, `L6` | PASS | none |
| 8 | Vocabulary can be reviewed | `8`, `PS6` | PASS | none |
| 9 | Travel English is functional | `9`, `RL1`, `RL2`; `RL3` for AI roleplay | PASS | Scripted practice: none. AI roleplay: mocks only |
| 10 | Slang explanations include context | `10`, `RL4` | PASS | none |
| 11 | Writing can be submitted and evaluated | `11-12` | PASS | Automatic checks: none. AI evaluation: mocks only |
| 12 | Writing can be revised, with version comparison | `11-12` | PASS | Versions and comparison run on the device; the revision rounds in the check use the mocked AI |
| 13 | Advanced argumentative writing is available | `13` | PASS | Content checks: none. Submitting for AI feedback: mocks only |
| 14 | Mobile layout | `14-15` (24 routes at 320 and 390 px; Welcome and onboarding also at 360 px; 130-150% text), `PS2`, `RL2` | PASS | none |
| 15 | Tablet and desktop layout | `14-15` (768, 1440 px) | PASS | none |
| 16 | User data handled securely | `16` (CSP, secret scan, device export and erase, malformed hash); `18`, `19`, `20` (email links, shared devices, password change, deletions); `RL6`, `RL7` | PASS | `16`, `RL6`, `RL7`: none. `18`-`20`: mocks only |
| 17 | AI features are functional or clearly marked as requiring configuration | `17` ("not configured" notices; one tutor exchange); `RL3` | PASS | The notices: none. "Functional": mocks only |

**Criteria covered only with mocks** (in whole or for their server part): account registration (1), AI roleplay
(9), AI evaluation (11), AI-driven revision rounds (12), AI feedback on advanced tasks (13), account security
(16, checks 18-20) and AI functionality (17). None of them has run against a live Supabase project or the
Anthropic API.

---

## 14. Content inventory

From `node tools/inventory.mjs` on 2026-10-31. The minimums are the ones encoded in `tools/inventory.mjs` (`MIN`
and the content table).

| Level | Planned | Written | Required minimum | Met |
|---|---|---|---|---|
| Pre-A1 | 10 | 10 | 10 | yes |
| A1 | 15 | 15 | 15 | yes |
| A2 | 15 | 15 | 15 | yes |
| B1 | 12 | 12 | 12 | yes |
| B2 | 10 | 10 | 10 | yes |
| C1 | 8 | 8 | 8 | yes |
| C2 | 5 | 5 | 5 | yes |

Lessons: 75 written of 75 planned; 1,139 exercises; 922 vocabulary entries; 163 Hebrew-speaker pitfalls.
Exercise types: mcq 203, transform 143, correct 130, gap 113, categorize 87, listen 81, speak 79, write 79, read 73,
order 51, dictation 51, match 49.

| Content | Count | Required minimum | Met |
|---|---|---|---|
| Real-life scenarios | 30 (airport 5, hotel 5, restaurant 5, transport 4, shopping 4, social 4, emergency 3) | 30 | yes |
| Expressions and slang | 50 | 50 | yes |
| Writing exercises | 20 | 20 | yes |
| Advanced writing assignments | 10 | 10 | yes |
| Placement items | 84 (12 per level) | none set (the schema asks for 10+ per level) | - |

Further counts (checked with Node over `content/`): 356 scenario phrases, 348 model-dialogue lines, 150 scripted
practice turns; 12 rubric categories, each explained in English and Hebrew (`rubric.json`); 86 taxonomy topics, 35
error types; 7 level final tasks; 6 source packs (21 illustrative sources). `npm run validate`: 0 errors, 0
warnings.

The commit history records review rounds for the lessons of each level ("independent review fixes"); the
repository does not record who the reviewers were. No learner has used the content.

---

## 15. Known limitations, open items and non-goals

### 15.1 Never tested with people or live services

- No real learner has used Lucid; there is no outcome, retention, usability or willingness-to-pay data. The persona
  panel was simulated by an AI. 05 section 5 lists the measurements needed before any learner-benefit claim.
- No live Supabase project or Anthropic API was used. AI feedback quality is unknown: no human-scored calibration
  set, one scoring run by default.
- Edge-function tests were not re-run for this document (Deno not installed here).

### 15.2 Partial items from the fix log (`docs/qa/fix-log.md`)

| ID | Open part |
|---|---|
| P-11, S-08 (d) | `privacy.html` has no operator name or contact; the box says real users must not be invited until it is filled. Anthropic's API data retention terms are also a placeholder. |
| P-53 | Lucid has no workplace content; the "Work" goal only shapes the AI tutor. Free writing applies essay checks to any text, including a work email. |
| P-69 | "Server" wording remains in no-AI notices in `tutor.js`, `essay.js` and `settings.js`; the Hebrew support control can wrap in Settings. |
| S-03 | Lucid shares the GitHub Pages origin with other sites. Moving it is an operator action; no code stops anyone setting `supabaseUrl` on the shared origin. |
| S-09 | CAPTCHA cannot be turned on: the client sends no token. Scripted sign-ups are limited only by email confirmation, Supabase rate limits, the project AI budget and the Anthropic spend limit. |
| S-10 | The client supplies the scenario brief, exercise instructions and conversation history (including assistant turns); the server does not resolve them from bundled content, and returned turns are not signed. |
| P-45 (note) | "Hebrew on tap" for long paragraphs and a "short explanations" setting are not built; the dimmed Hebrew legend at minimal support fails contrast (section 11.1). |

### 15.3 From `docs/setup.md` and `docs/architecture.md`

- Secure password change has not been tested against a live project (`setup.md`).
- Supabase's PKCE flow, which would bind email links more strongly, is not used (`architecture.md` section 6).
- Old exercise answers are never tidied: at about 150 answered items a day an account reaches the 100,000-record
  limit in roughly two years, after which sync fails until the limit is raised.
- Deleting an account does not refund its units from the project's daily AI total.
- `RELEASE` in `sw.js` must be bumped by hand on each deploy.

### 15.4 Found in the code while writing this specification

| Area | Item | Status or kind |
|---|---|---|
| Accessibility | Contrast failures at minimal Hebrew support and on the active rail legend (section 11.1); the audit does not cover those configurations | Open defect |
| Navigation | Profile has no inbound link | Partial |
| Onboarding | Promises that Lucid will suggest switching the interface to English as the level rises; nothing does | Not built |
| Minors | `PRODUCT.md` and the migration 001 comment claim protective defaults for 16-17-year-olds; only marketing consent differs | Documentation conflict |
| Help | "Without an account, nothing leaves this device" (`help.js`), while `privacy.html` names the browser's speech services as exceptions | Copy conflict |
| Writing | No "H0 self-check" rung (E section 9.5); any change to the mistake's sentence counts as an attempt and unlocks the correction | Partial |
| Writing | Self-assessment (stage 7+), timed writing and "Report a mistake" have no tests; reports are only logged | Partial |
| Writing | The writing level depends on AI-assessed final drafts, so it never appears without AI | Logic built and tested (`unit writing-level`); its evidence source is tested with mocks only |
| Speaking | No speaking level is assessed | Not built (a deliberate decision: recognition never grades) |
| Level checks | No test runs a level check | Partial |
| Review | Warm-up and exit-check modes, the theme control, backup restore, the monthly report view and server account deletion from Settings have no tests | Partial |
| Test coverage | Also without a test: the `read` and `dictation` renderers, writing exercise items (`we-01` to `we-20`), the Speaking lab drill and "Say it" check, the lesson hint button and keyboard shortcuts, the feedback-scope setting, the task-fulfilment warning in the editor, the level rail, skill profile and weekly goal on Today, the vocabulary statuses, and adding a passed lesson's words to review | Partial |
| Expressions | No offensive-term policy or mechanism | Not built |
| Placement | Only multiple-choice and listening items; not calibrated; no productive sample | Partial (deferred, `04-methodology.md` section 3) |
| Learning engine | Lexical-coverage gating of texts, encounter counting, deliberate 1/7/30-day probes, multi-voice perception training, human audit of AI corrections | Not built (deferred, `04-methodology.md` section 3) |
| Notifications | No reminders of any kind | Not built |
| Data | Device-only data is lost if browser storage is cleared before an export; sync conflicts resolve by newest write | Known limitation |
| Content | `content/lessons/pa1-05.json` states a predicted transfer error as fact ("Hebrew has no present-tense 'be', so learners drop it"); the research treats such predictions as hypotheses (`C3-hebrew-l1.md`, What not to build) | Open |
| Real life | No scenarios above B2; no workplace module | Content gap |
| Documentation drift | `docs/setup.md` and `docs/architecture.md` section 8 omit migration 003; `docs/architecture.md` section 6 still says the export lacks the account email and that roleplay chats cannot be deleted one by one (both now done); `docs/content-schema.md` says `speak` is graded by recognition and lessons take 10-25 minutes; the comments on `SUPPORT_BY_LEVEL` (`i18n.js`) and `newItemsBudget` (`srs.js`) disagree with their code | Open |

### 15.5 Non-goals

Lucid deliberately does not (sources: `docs/research/04-methodology.md` section 2, `05-differentiation-strategy.md`
section 4; each checked by code search):

- use streaks, streak freezes, XP, leagues, leaderboards, chests, gems, energy or hearts;
- show ads or put paywalls or upsells inside lessons (there is no billing or pricing at all);
- give accent scores, "% native" ratings or accent-reduction claims;
- issue certificates or "certified" levels, or predict IELTS, Cambridge, Bagrut or AMIRNET scores;
- let the AI write or rewrite the learner's work, or accuse a learner of copying or using AI;
- show a single overall writing grade while the learner is still revising;
- claim that AI feedback equals a teacher, or claim learning outcomes;
- present a fixed list of "Hebrew speakers' mistakes" as research (one lesson note still overstates this; section 15.4);
- use a home-made scheduler, SM-2, or "mark as known" without a recall check;
- offer human tutors, social features, public profiles or geolocation;
- promise that finishing the course confers any CEFR level, C2 included.
