# Deliverable 9: Prioritised roadmap

Written on 2026-10-31 on branch `claude/lucid-english-platform`. The code was first checked at commit `ae58048`;
while this document was written, other lanes committed reworded real-life reply options (`976f7f3`, `1158f2d`) and
started a refresh of 08 (`de610dc`, `1158f2d`). The suites in section 1.1 were re-run after those commits; none of
them changed a count used here.

Four facts frame the whole plan:

- **No real learner has used Lucid.** There is no outcome, retention, usability, completion or willingness-to-pay
  data. Nothing below is a learning result, and no phase promises one.
- **No live service has been used.** `config.js` has `supabaseUrl: ''` and `aiEnabled: false`. Accounts, sync,
  server export and deletion, AI writing feedback, AI roleplay and the AI tutor have run only against stand-ins.
- **The persona panels were simulated.** An AI played eight learner personas (`docs/qa/persona-panels.md`). Their
  verdicts are QA input, not user research.
- **Levels are Lucid estimates, aligned to CEFR descriptors.** The course has C2 lessons; the roadmap does not
  promise that any learner reaches C2 or any other level.

Sources: `PRODUCT.md`; `docs/08-product-specification.md` (08); `docs/setup.md`; `docs/qa/security-review.md`;
`docs/qa/fix-log.md` and `fix-log-r2.md`; `docs/qa/persona-panels.md` and `personas/round2-*.md`; and in
`docs/research/`: `04-methodology.md` (04), `05-differentiation-strategy.md` (05), `06-ux-recommendations.md` (06),
`C1-memory-practice.md` (C1), `C2-pedagogy-feedback.md` (C2), `C3-hebrew-l1.md` (C3) and `E-advanced-writing.md` (E).
Decision IDs such as C1-D22 or "E decision 16" refer to the "Implementation decisions" sections of those reports.
Every statement about Lucid was checked in the code, the content (`node tools/inventory.mjs`) or the tests on
2026-10-31.

## How priorities are set

**Gates come first and are not scored.** Launch blockers (section 2) must all be done before any real person uses
Lucid. Phase 1 (section 3) is a measurement phase whose work is set by what the pilot must measure.

**Everything after the gates is scored** with one formula:

> **Score = Impact x Confidence / Effort**

| Factor | 1 | 2 | 3 |
|---|---|---|---|
| **Impact**: what changes for learners if the item is done | Polish, or a small group of learners | A core flow, or a large group (for example every keyboard user, every 16-17-year-old) | Removes a risk of harm, or a blocker to measuring learning, or affects every session |
| **Confidence**: how sure we are that the item matters | A design choice, a hypothesis, or one simulated persona finding | Supported by the research reports (moderate evidence), or by several simulated findings | Confirmed in the code or a test, or a legal or security requirement |
| **Effort** (rough, for one person who knows the code or the content) | **S**: up to about 3 days | **M**: up to about 2 weeks | **L**: more than 2 weeks |

Scores run from 0.33 to 9. Ties are broken by dependencies (an item that unblocks others first) and then by items
that affect 16-17-year-olds. The scores are product judgements, not measurements. They are to be re-scored when
Phase 1 data exists; several items say which pilot measure would move them.

No team, budget or dates exist yet, so the plan gives effort sizes and order, not calendar dates.

---

## 1. Where Lucid stands

### 1.1 Verification snapshot (run on 2026-10-31 for this document)

| Suite | Command | Result |
|---|---|---|
| Unit tests | `npm test` | 143 of 143 pass (141 at `ae58048`; `976f7f3` added real-life tests) |
| Database tests (migrations on PGlite, Postgres in WASM, one connection) | `npm run test:db` | 9 of 9 pass |
| Browser acceptance tests (Chromium; accounts and AI against a mock server) | `E2E_PORT=8861 node tests/e2e/run.mjs` | 52 of 52 pass (also 52 of 52 at `ae58048`) |
| Accessibility audit (axe-core, WCAG A and AA tags) | `A11Y_PORT=8871 node tests/e2e/a11y.mjs` | 0 violations on 24 routes plus Welcome and onboarding, in 5 configurations (Pre-A1, B1 and C1 learners; Hebrew and English UI; light and dark) |
| Content validator | `npm run validate` | 75 lesson files, 0 errors, 0 warnings |
| Edge-function tests | `deno test` in `supabase/functions/lucid-ai/` | **Not run here** (Deno is not installed). `fix-log-r2.md` reports 20 of 20 on 2026-10-31 |

Content (`node tools/inventory.mjs`): 75 of 75 lessons (Pre-A1 10, A1 15, A2 15, B1 12, B2 10, C1 8, C2 5) with
1,139 exercises, 922 vocabulary entries and 163 Hebrew-speaker pitfalls; 36 real-life scenarios (A1 3, A2 12, B1 16,
B2 5; modules airport 5, hotel 5, restaurant 5, transport 4, shopping 4, social 4, emergency 3, work 6); 60
expressions; 20 writing exercises; 10 advanced assignments; 7 level final tasks; 84 placement items.

### 1.2 Built and tested

| Area | Tests |
|---|---|
| Onboarding, the 16+ age gate (refusal held 24 hours), terms consent | `e2e 1`; `db: "age gate, minors and RLS on profiles"` |
| Placement: staircase, confirmation, resume, goal-aware start (non-academic goals start at B2 rather than C1) | `e2e 2`, `L1`, `L2`, `LP4`; `unit engine`, `unit learner-logic`, `unit learner-evidence` |
| Lesson player and 10 of 12 exercise types; first-try scoring; "Nearly there" practises only the misses | `e2e 4-6`, `PS1`-`PS7`, `PL1`-`PL6`; `unit player`, `unit grading` |
| Spaced review (FSRS, objective grading, retrieval ladder, workload governor) | `e2e 8`, `PS6`, `OF1`; `unit engine` |
| Daily plan, goals (including the work goal), lesson slices, targeted practice that always opens content | `e2e 7`, `L5`, `L6`, `LP1`, `LP2`; `unit learner-evidence`; `unit work-content` |
| Evidence-based skill levels from first tries only | `e2e L2`; `unit learner-evidence: "R2-12 ..."` |
| Hebrew support that fades by level, folded Hebrew for long paragraphs at partial support, bidi isolation | `unit i18n`, `unit learner-logic`; `e2e RL5`, `PS7`, `PL1`, `PL4` |
| Writing: automatic checks, free-writing text types (essay, email, message), versions, paragraph comparison, deletion | `unit writing-analyzer`, `unit diff`; `e2e 11-12`, `13`, `RW3` |
| Real-life scripted practice, workplace module, expressions | `e2e 9`, `10`, `RL1`, `RL2`, `RL4`, `RW2`; `unit reallife`, `unit work-content` |
| Weekly progress report with recall on due reviews and 30-day recall | `e2e L7`, `L3`; `unit engine: "period report ..."` |
| Offline use after "Save all lessons" | `e2e OF1`, `RW4`; `unit sw`, `unit offline-manifest` |
| Device export and erase that touch only Lucid's data | `e2e 16`; `unit store-sync` |
| Layout at 320-1440 px and 130-150% text | `e2e 14-15`, `RW1` |

### 1.3 Built, tested with mocks only

None of these has run against a live Supabase project or the Anthropic API.

| Area | Tests |
|---|---|
| Sign-up, sign-in, reset, email-link adoption bound to the device, shared-device protection | `e2e 18`-`20`, `unit auth`, `unit session` |
| Two-way sync with tombstones | `unit store-sync`, `e2e 20` |
| Server export (with account email and dates, migration 003) and account deletion | `db: "export returns only the caller; delete removes everything"` (PGlite) |
| Per-account storage quota; AI unit reservation with hour, day, in-flight and project limits | `db` tests (PGlite); `deno` tests (not run here) |
| AI writing feedback: rubric rules enforced in code, minimal-edit filter, hint ladder that needs an attempt, final-draft range | `e2e 11-12`, `13`, `RW3`; `deno` |
| AI roleplay and its report; AI tutor | `e2e RL3`, `RW2`, `17`, `20`; `deno` |

### 1.4 Partial

From 08 section 15, re-checked in the code: level checks (no test runs one or checks the 75% rule); the `read` and
`dictation` renderers and writing exercises `we-01` to `we-20` (08: no browser test checks them); the Speaking lab's
"Which did you hear?" drill and "Say it" check; warm-up and exit-check review modes; backup restore; the monthly
report view; server account deletion from Settings; the weekly goal; self-assessment and timed writing (no tests);
"Report a mistake" (logged on the device, never read by anyone or any tool); the `minor` flag (stored, never read);
the axe audit (no exercise states, placement, level check or drill). Open security items: S-03 (shared origin),
S-08 (d) and P-11 (no operator contact), S-09 (CAPTCHA cannot be turned on), S-10 (the client supplies scenario and
exercise text and the conversation history).

### 1.5 Not built

CAPTCHA support in the client; PKCE email links; any check of tutor or roleplay replies in code; extra under-18
defaults (06 D53); a first-use AI and data explanation (D54); an accessibility statement (D23); a DPIA (D52);
reminders; an offensive-term policy for expressions; human-recorded audio (every voice is a browser voice); any way
for the team to receive usage data other than a learner's own export; any A/B assignment mechanism; the deferred
methods in 04 section 3 (Rasch-calibrated placement, productive sample and spelling probe in placement,
lexical-coverage gating, encounter counting, multi-voice perception training, deliberate 1/7/30-day probes, a human
audit of AI corrections); writing-stage promotion rules; exam modules; teacher or parent views; pricing and billing.

### 1.6 Where 08 and the code differ

08 was first written at commit `f8a202c`, and a refresh to the current build was still in progress when this roadmap
was written. Parts of 08 then still described the earlier build: section 7.1 lists 30 scenarios and no workplace
module, and section 15 lists Profile as unreachable and P-53 (no workplace content) as open. The code has 6 workplace
scenarios and 10 workplace expressions that the work goal uses, free-writing text types, a link to Profile from
Progress, the English-interface offer from B1, a placement link in Settings, and Hebrew legends that pass axe's
contrast rule at B1 and C1. Where the two differ, this roadmap follows the code. Finishing the refresh is part of
item P2-12.

---

## 2. Launch blockers

All must be done before any real person uses Lucid, including pilot participants. Owner types: **operator** (the
person or organisation that runs Lucid), **engineering**, **content**, **legal**.

| ID | Blocker | Owner | Effort | Why (source) | How to verify it is done |
|---|---|---|---|---|---|
| LB-01 | **Serve Lucid from its own origin**, on a host that can send HTTP response headers. Add a code guard that refuses to use `supabaseUrl` on the shared GitHub Pages origin. | Operator; engineering for the guard | S | Session tokens (including the refresh token), IndexedDB essays and chats, and the offline cache are per origin; today Lucid shares `*.github.io` with sites that load CDN scripts without integrity checks (S-03, `setup.md` 2.1). A meta CSP cannot set `frame-ancestors` (security review, section 5). No code stops anyone turning accounts on at the shared origin (fix log, S-03). | Lucid loads from an origin that serves nothing else; DevTools shows no other app's storage there; the guard is covered by a unit test; response headers include a CSP with `frame-ancestors`. |
| LB-02 | **Operator identity and contact** in `privacy.html`, both languages: name, privacy and complaints address (including for 16-17-year-olds and parents), the authority to complain to; and Anthropic's API data retention terms for the workspace used. | Operator; legal for the retention wording | S | Two "To be filled in before public launch" boxes; the page says that until then "real users must not be invited" (P-11, S-08 (d), `setup.md` 5). | Neither box remains in either language; `e2e RL6` (which today asserts the placeholder text) is changed to assert the real contact; a test message to the address is answered. |
| LB-03 | **Legal review of the privacy page and terms** against the laws that apply to the operator and its learners (legal decides which). | Legal | M | The security review's comparison of `privacy.html` with the code "is a technical consistency check, not legal advice" (security review, section 6). | A written sign-off naming the reviewed commit of `privacy.html`, in Hebrew and English. |
| LB-04 | **Privacy and minors review**: a DPIA for adaptive profiling (D52); whether 16-17-year-olds need guardian consent for accounts, for AI features and for research; which under-18 defaults from D53 must ship before launch; how the tutor and roleplay respond if a learner discloses distress or risk; data processing terms with Supabase and Anthropic; an accessibility statement (D23). | Legal; engineering for resulting changes | M | Lucid accepts 16-17-year-olds, and only marketing consent differs by age (08 2.2). The tutor and roleplay prompts ask only for content "appropriate for a 16-year-old" and to stay on topic (`prompts.ts`); nothing in code checks their replies (08 8.4); Lucid has no human contact route (06 P1-9). | DPIA and written decisions stored in `docs/`; prompt changes tested with scripted inputs against the live model during LB-10; the accessibility statement is published and linked. |
| LB-05 | **A dedicated Supabase project**: migrations `001`, `002`, `003` in order; Site URL and redirect URLs set to the LB-01 origin; Confirm email on; Secure password change on; Require current password off; refresh-token reuse detection on; sign-up and email rate limits reviewed; usage and spend alerts on. | Operator | S | Account deletion removes the `auth.users` row; sign-up, CAPTCHA, limits and database size are per project; without 003 the export lacks the email and dates the privacy page promises (`setup.md` 2.2 and 3; S-13). | The project's migration list shows all three; the settings match `setup.md` section 3 step 4; `config.js` holds the project URL and publishable key and is served only from the LB-01 origin. |
| LB-06 | **Anthropic key and spend limits**: a workspace used only by Lucid, with a monthly spend limit; `ANTHROPIC_API_KEY` and `LUCID_ALLOWED_ORIGINS` (the LB-01 origin) set as function secrets; `lucid-ai` deployed; `LUCID_GLOBAL_DAILY_UNITS` chosen from the ceiling in `setup.md` section 4. | Operator | S | The spend limit is "the limit that holds" if everything else fails (`setup.md` 4). `LUCID_ALLOWED_ORIGINS` defaults to `http://localhost:8765` (`index.ts`). At the defaults, 1,000 units a day allow up to about 6 million output tokens a day, plus input. | The Console shows the limit; the secrets are listed; a request from another origin is refused; setting the global units to 0 pauses AI. `aiEnabled` stays `false` until LB-08 and LB-10 pass. |
| LB-07 | **CAPTCHA support in the client**: load the widget, allow its script in the CSP, send the token with sign-up, sign-in and password reset; then turn CAPTCHA on in Supabase. Prefer a widget mode that sets no puzzle. | Engineering; operator to switch it on | M | Turning CAPTCHA on today blocks sign-up, sign-in and reset, so scripted sign-ups are limited only by email confirmation, rate limits and the AI budgets (S-09, `setup.md` 3). 06 D19 asks for no cognitive test at sign-in (WCAG 3.3.8), so the widget choice matters. | With CAPTCHA on, the three flows work in Lucid and a request without a token is refused; an e2e mock check asserts the token is sent; a keyboard and screen-reader pass of sign-up raises no puzzle. |
| LB-08 | **AI scoring gate** (only if AI writing feedback is switched on for real learners): a configuration option that hides category bands, the CEFR range on final drafts and the AI-based writing skill level, while keeping located mistakes and the hint ladder, until the gold set (section 3.6) meets E decision 16. | Engineering | S | E sets a launch gate (evaluator-human QWK of at least 0.70 on language and 0.60 on content categories, on at least 100 held-out essays per stage group). No calibration set exists (08 6.7). Lucid shows bands and derives a writing level from AI scores (08 5.2, 6.5). The alternative is to keep AI off for the pilot. | With the option on, an e2e mock check finds no band, range or writing level on any screen. |
| LB-09 | **CI that runs every suite**: unit, database, content validator, e2e, axe and the Deno edge-function tests, on every push; a failure blocks the deploy. | Engineering | S | `pages.yml` only deploys (06 P1-15). The edge-function tests were not run for 08 or for this document. | A workflow run shows all six suites green on the release commit. |
| LB-10 | **Live end-to-end test against the real services**, recorded step by step: sign-up with email confirmation (same and other browser); an under-16 birth year refused with nothing stored; sync between two browsers, including a deletion; password change with Secure password change on; password reset; export with email and dates; account deletion removing every Lucid row; each AI route returning valid output; refusals and truncations metered; parallel requests capped; tokens, latency and units per route measured. | Engineering with the operator | M | Every account and AI feature is tested with mocks only (section 1.3). Not verified live: Secure password change (`setup.md` 3), whether the database role may delete from `auth.users`, GoTrue redirect and rate-limit behaviour, edge-runtime limits (security review, section 6). | A dated test log in `docs/qa/` with each step passed, and the measured token use per route. |
| LB-11 | **Native Hebrew review of all Hebrew copy**: about 79,000 Hebrew words (a count of Hebrew-letter tokens: lessons about 45,600, real-life about 17,200, writing about 5,500, other content about 2,400, interface strings in `js/` about 7,400, `privacy.html` about 660). Interface, consent and privacy text first, then Pre-A1 to A2, where the Hebrew carries the meaning. | Content | L | All content was committed by an AI author (`git log -- content/`), and who reviewed it is not recorded (08 14). Defects were still being found late: 224 strings with brackets scrambled (R2-01) and Hebrew lines written in visual order (fix-log-r2, P-53). The panels say native review is still needed (`persona-panels.md`). | A sign-off per file with the reviewers' names and qualifications recorded in the repository; the validator, including its bidi bracket check, passes; screens checked in the app at full, partial and minimal support. |
| LB-12 | **English content audit by a qualified English teacher**: all 84 placement items, all 7 final tasks, and a sample of lessons (at least 2 per level) checked for answer keys, accepted answers and level fit; a full review follows if the sample error rate exceeds a threshold set before the audit. | Content | M | Placement decides where a learner starts. Valid answers were rejected by exact match (R1-E2; "to a certain extent" is still not an accepted answer in `c1-03`). Content reviewers are not recorded (08 14). | An audit report with the error rate per sampled lesson, and every error fixed and validated. |

**Order.** LB-01 first (the Supabase Site URL, the allowed origin and the CSP depend on it), then LB-05, then LB-06
and LB-07, then LB-10. LB-02, LB-03 and LB-04 run in parallel from the start. LB-08 and LB-09 can be done at any time
before LB-10. LB-11 and LB-12 run in parallel and are the longest items.

---

## 3. Phase 1: validation with real learners (the first 4-6 weeks after the blockers)

### 3.1 What the pilot is for, and what it is not for

The pilot answers four questions: do real learners start and keep going; does placement put them at a sensible
level; is AI feedback accurate enough to show; and does the instrumentation capture what later decisions need. It
also re-tests, with people, the 64 round 2 fixes that so far only automated tests have checked.

It cannot show that Lucid works. It has no control group, its participants are self-selected, and it is too small
for effect sizes. No result from it may be presented as a learning outcome. Any later efficacy claim follows C2
decision 30 (pre-registered outcomes, intention-to-treat analysis, an independent analyst or published data, all
skills tested, funding disclosed).

### 3.2 Design

| Element | Proposal |
|---|---|
| **Who** | Hebrew-speaking learners aged 16 and over, in four groups matching the inferred users in `PRODUCT.md`: (a) high-school students preparing for the Bagrut, around A2-B1; (b) university students, around B1-C1; (c) working adults who need English for work or travel, around A2-B2; (d) beginners, including adults who cannot yet read the Latin alphabet. Plus, across groups, at least one screen-reader user, one participant with ADHD and one with dyslexia (06 D28). |
| **How many** | 40-60 enrolled, roughly 10-15 per group. Enough to find usability and comprehension problems, see where people stop, flag broken placement items, estimate AI agreement roughly and size later studies. Not enough for any A/B test in section 6 or for psychometric calibration: at most 28 placement answers each from 50 people is about 17 answers per item on average across the 84 items. Over-recruit: the research describes high attrition in the studies it reviewed (C2, efficacy evidence), and Lucid's own rate is unknown. |
| **Duration** | Week 0 onboarding, then 6 weeks of independent use; a delayed test 4 weeks after the end (week 10), which falls inside Phase 2. |
| **What participants do** | Week 0: a moderated first session (think-aloud, phone or laptop as they normally study), with 5-6 participants per group; a baseline test. Weeks 1-6: use Lucid as they wish. Weeks 3 and 6: a short interview and a data export. Week 6: a post-test. Week 10: a delayed test. |
| **AI features** | Either off for the whole pilot, or on with LB-08's gate for adults only, depending on LB-04's decision for 16-17-year-olds. With AI on, `LUCID_EVAL_RUNS` set to 3, so the consistency of scoring is measured (E decision 17), at three times the units per essay. |
| **Compensation** | For the test and interview sessions only, never tied to minutes or days of use, so that payment does not inflate the engagement measures. |

### 3.3 Ethics and consent

- **Separate consents.** Research participation is separate from the terms, from AI consent (built) and from
  consent for essays to be read by human raters for the gold set. Each can be refused without leaving the pilot.
- **16-17-year-olds.** Legal (LB-04) decides whether guardian consent is required. Plan for a guardian's consent plus
  the young person's own agreement unless legal advises otherwise. If recruitment goes through schools, the school's
  rules and any Ministry of Education requirements apply; legal confirms which. If results may be published, seek
  review by an ethics committee at a partner institution before recruiting.
- **What the team receives.** `privacy.html` says server data is limited to the learner by database rules, and Lucid
  sends no usage data to anyone. The pilot keeps that promise: participants share their own "Download all my data"
  export at weeks 3 and 6 through a secure upload, and the research consent states exactly what that file contains
  (answers, essays, conversations, events). Exports are stored under a participant code, names removed, deleted at a
  date stated in the consent. A participant can withdraw and have their files deleted.
- **Safety.** A named contact (LB-02) for problems; with consent, a reviewer reads a sample of tutor and roleplay
  transcripts from under-18 participants each week for unsuitable content.
- **No experiment on minors** that removes a protective default.

### 3.4 Measurement plan

Thresholds come from the research where it sets one. Where it does not, the threshold is fixed and written down
before week 0, not after the data arrives.

| Question | Measures | Data source | Threshold or decision rule | Instrumentation |
|---|---|---|---|---|
| **Do learners remember?** (primary; 04 section 1, C1-D22) | Recall on due reviews against the retention target; 30-day recall; an external test of taught and untaught items of the same level at weeks 0, 6 and 10 | Review attempts and cards in the exports; the external test | Due-review pass rate within 3 percentage points of the target (C1-D2), otherwise check the grade mapping and FSRS parameters (C1-D4) | Recall on due reviews: built. 30-day recall: built, but only from naturally due reviews of 25-40-day-old cards, which a 6-week pilot may rarely produce. Deliberate probes: **missing** (E4 below) |
| **Does placement put learners at a sensible level?** (C2 decisions 28-29, C3-I1) | Agreement with a qualified teacher's independent level judgement (a subset of about 20); with self-reported Bagrut level where there is one; test-retest within 3 days (a subset); first-try accuracy in the first 5 lessons at the assigned level; item statistics (items always or never answered right) | Placement attempts and result, lesson attempts in the exports; teacher judgements | Agreement rule fixed before week 0; items with extreme statistics go to content review (LB-12 reviewer) | Built: every placement answer is an attempt with `source: 'placement'`. Too few responses for calibration (section 3.2) |
| **Is AI feedback accurate enough to show?** (E decisions 16-18, C2 decision 16) | Evaluator-human QWK per category and stage group; human-human QWK; mean bias; precision of flagged errors per error type; share of categories marked low-confidence across 3 runs; `dropped_errors` per essay; rate of "Report a mistake" | Gold set (section 3.6); evaluations saved with each essay version; `ai-report` events; `lucid_ai_usage` outcomes | QWK at least 0.70 (language) and 0.60 (content) on at least 100 held-out essays per stage group before bands are shown (E 16); offset if bias exceeds 0.25 band (E 18); an error type is shown as a correction only at 95% precision or more, as a suggestion at 80-95%, suppressed below 80% (C2 16) | Built: evaluations with `dropped_errors` and low-confidence flags. **Missing**: a review queue for `ai-report` events (read from exports in the pilot) |
| **Do learners start and keep going?** | Onboarding completion; placement completion; first lesson started and completed; return on day 1, day 7 and in week 4; active days per week; weekly-goal attainment; where in a lesson people stop; plan blocks completed | Profile, progress (with saved place), attempts, `session` events | Fixed before week 0; a drop concentrated at one step moves the matching Phase 2 item up | Mostly derivable from exports. **Missing**: onboarding step events (onboarding answers stay in memory until the last step, so an abandoned onboarding leaves no trace) |
| **Can people use it, and how do they read the tone and the Hebrew?** (06 6.4, 05 section 5) | Task success and problems in the moderated sessions; assistive-technology sessions (06 P0-1); interviews, including whether learners miss streaks (05 section 5) | Session notes and recordings (with consent) | Each problem rated and fed into the Phase 2 scoring | No instrumentation needed |
| **Does Hebrew support fade?** (C3-S1) | Hebrew reveals per session by level | Events | Expect a decline with level; if it stays high from B1, consider experiment X6 | **Missing**: the reveal listener in `js/app.js` logs nothing (E2 below) |
| **What does AI cost per learner?** (05 section 5) | Units, input and output tokens per route and per active learner per week | `lucid_ai_usage` (route, units, outcome, token counts, time) | Compare with the spend limit; informs `LUCID_MODEL` and limits | Built (server side) |
| **Does speech work for these learners?** (08 5.6) | Share of sessions where recognition is available, by browser; "Can't speak right now" use; a human-rated sample of recognition errors on Hebrew-accented speech (C3-P6 asks for at least 50 speakers before trusting any automatic judgement; the pilot gives a first look only) | Events; recorded samples with consent | Informs P3-01 and R5 | `speaking-skipped` events: built. **Missing**: a recognition-availability event (E5 below) |

### 3.5 Instrumentation: what exists and what Phase 1 must add

**Exists** (stored on the device, synced with an account, included in the export):

- One attempt per answered item: source, lesson, exercise, topic, skill, level, correctness, score, error type, hint
  use, latency, the response cut to 300 characters, and a 30-day-probe flag (`recordAttempt` in `js/core/learner.js`).
- Review answers with latency; each card's FSRS state and its last 20 reviews (`js/core/srs.js`). The attempts keep
  every review answer, but not the FSRS rating given.
- Events: `lesson`, `review`, `drill`, `checkpoint`, `writing`, `writing-final`, `writing-deleted`, `speaking`,
  `speaking-skipped`, `self-judged`, `hint-level`, `roleplay-help`, `ai-report`, `level-move`, `vocab-import`,
  `session` (active minutes).
- Lesson progress with the saved place and the missed exercises; essay versions with their automatic checks and AI
  evaluations; roleplay transcripts and reports; the placement result.
- On the server: one `lucid_ai_usage` row per AI request (route, units, outcome, token counts, time; no text).

**Missing, to build before week 0** (engineering; none needs a server change):

| ID | Work | Effort | Why |
|---|---|---|---|
| E1 | Analysis scripts in `tools/` that read exports and compute every measure in 3.4 (kept out of the deploy, as `pages.yml` already excludes `lucid/tools`) | M | Lucid has no analytics by design; exports are the data |
| E2 | Hebrew reveal events | S | C3-S1 metric |
| E3 | Onboarding step events, and saving onboarding progress so an abandoned onboarding is visible | S | Funnel measure; 06 D17 |
| E4 | Deliberate retention probes at 1, 7 and 30 days, at most 5% of review volume, using the existing `probe` flag (C1-D22) | M | The primary measure; natural probes may be too rare in 6 weeks |
| E5 | A recognition-availability event (supported or not, by browser family) | S | Speech risk (R5) |
| E6 | The release (`RELEASE` in `sw.js`) stamped on attempts and events | S | Ties data to the build that produced it |
| E7 | Optional: an export option that leaves out free text (essays, chats, responses) for participants who decline sharing it | S | Data minimisation in the research consent |

`privacy.html` describes what is stored in general terms; legal (LB-03) confirms whether the new event types need
mention.

### 3.6 Parallel workstream: the gold set for AI scoring

The pilot alone cannot produce the essays the launch gate needs: at least 100 held-out essays per stage group, plus
calibration essays (at least 5 human-scored, rationale-annotated Hebrew-L1 essays per category and stage, covering
bands 1, 3 and 5; E decision 16). The research does not define the stage groups; define them before collection, for
example from the AI targets in `rubric.ts`.

| Step | Detail | Owner | Effort |
|---|---|---|---|
| Collect | Essays on Lucid's own tasks from consenting pilot participants and from separately recruited adult Hebrew-speaking writers (consent for human rating and model calibration) | Content, legal for consent | L |
| Rate | Two trained raters with English-teaching backgrounds score each essay on the 12-category rubric independently, with adjudication; measure human-human agreement first (E cites 0.87 human-human QWK in its main study as a reference, not a target) | Content | L |
| Annotate errors | A gold set of annotated Hebrew-L1 learner sentences per CEFR band (C2 decision 16 suggests at least 300 per band, tunable) for error-type precision | Content | L |
| Compare | Run the evaluator (3 runs) on held-out essays; compute QWK, bias and precision; tune calibration essays and prompts on the calibration split only | Engineering | M |
| Monitor | After launch: a monthly audit of 50 human-scored essays per stage group (E decision 18) | Content | M per month |

This workstream starts in Phase 1 and will most likely finish in Phase 2. Until it meets the gate, LB-08 keeps bands,
ranges and the AI-based writing level hidden.

### 3.7 Decisions at the end of Phase 1

- Re-score every Phase 2 item with the pilot data, and record which scores changed and why.
- If placement disagreements cluster (by the rule fixed before week 0), P2-04 and P2-16 move up.
- If the due-review pass rate is outside the target band, review the grade mapping before anything else in the
  learning engine.
- If drop-off concentrates in onboarding, P2-28 moves up; if in the first lesson, review the lesson intro and slice.
- AI writing bands stay hidden until the gate is met, whatever the pilot's impressions.
- Size the first A/B tests (section 6) from the observed variance.

---

## 4. Phase 2: product improvements, prioritised by evidence

Sorted by score. "Source" names the finding or research decision; "simulated" marks a persona finding. Round 2 of the
persona panel found 64 items; `fix-log-r2.md` lists all 64 as fixed, each with a test, and the suites pass. None of
these fixes has been checked by a person yet; the pilot's moderated sessions do that. Items found already fixed in
the code while this document was checked (06 P0-5, P1-2, P1-3, P1-4, P1-16 and P2-8, and the round 2 findings) are not
listed.

| ID | Item | Source | Expected impact | I | C | Effort | Score | Depends on |
|---|---|---|---|---|---|---|---|---|
| P2-01 | Visible focus on gap and text inputs: `.gap-input:focus` and `.input:focus` remove the outline (`css/app.css`) | 06 P0-4, P1-11; D13 | Keyboard users can see where they type in gap-fill (113 items) and every text field | 2 | 3 | S | 6.0 | none |
| P2-02 | Keep keyboard focus in order and categorize exercises, which redraw on every tap (`js/ui/exercise.js`); add arrow keys and a keyboard-only test | 06 P1-1; D15 | Two exercise types (138 items) become usable by keyboard and switch | 2 | 3 | S | 6.0 | none |
| P2-03 | Announce verdicts through one persistent live region instead of a new `role="status"` element inserted with its text (`lesson.js`, `player.js`, `review.js`, `center.js`) | 06 P0-2; D8 | Screen-reader users hear whether they were right | 2 | 2 | S | 4.0 | Verify in AT sessions (3.4) |
| P2-04 | Offer to move up or down after the first 5 lessons when first-try accuracy is far from the expected range | C2 decision 29; placement findings for simulated personas Daniel and Yael (R1-Y2) | Corrects misplacement early without a retest | 2 | 2 | S | 4.0 | Thresholds from pilot data |
| P2-05 | A "look again" self-check rung before "There is a mistake here" in the writing hint ladder | E 9.5; 08 15.4; 05 section 6 | More self-correction before any location is shown | 2 | 2 | S | 4.0 | none |
| P2-06 | Weekly goal optional and off by default for under-18s (onboarding preselects 5 days for everyone) | 06 P1-7; D40, D53 | Removes a pre-suggested rhythm for minors | 2 | 2 | S | 4.0 | LB-04 decision |
| P2-07 | Help in the same place in every player (only the lesson player has it) and a human contact route in Help | 06 P1-9; D18 | Help is findable when stuck; a person can be reached | 2 | 2 | S | 4.0 | LB-02 |
| P2-08 | A short explanation of AI and data at first use of the writing lab, tutor and roleplay (what is sent, stored, for how long, how to delete) | D54; 06 P1-13 | Informed consent at the moment it matters | 2 | 2 | S | 4.0 | LB-03 wording; LB-11 review. LB-04 may move it into the blockers |
| P2-09 | A check on tutor and roleplay replies in code (for example a second, cheap classification pass), with a safe fallback reply | 08 1.2, 8.4 | Unsuitable or off-policy replies stop reaching learners, including 16-17-year-olds | 3 | 2 | M | 3.0 | LB-04; cost measured in LB-10 |
| P2-10 | The server looks up scenario and exercise text from bundled content by id, and signs returned assistant turns | S-10 | Ends use of the AI routes as a general assistant on the project's key | 2 | 3 | M | 3.0 | none |
| P2-11 | Confirmed small fixes: one primary key on the lesson intro when resuming (06 P1-5); input border contrast (P1-10); "just before you would forget" copy (P2-9, `help.js`); small targets (P2-10); Help says keys 1-4, code accepts 1-6 (P2-11); "server" wording in `tutor.js` (P-69) | 06; fix log | Fewer small trust and usability gaps | 1 | 3 | S | 3.0 | LB-11 for Hebrew copy |
| P2-12 | Documentation drift: finish the 08 refresh (section 1.6); `architecture.md`; the comments on `SUPPORT_BY_LEVEL` and `newItemsBudget` that disagree with their code | 08 15.4 | Specs stay true for the team and reviewers | 1 | 3 | S | 3.0 | none |
| P2-13 | Experiment assignment and logging (stable arm per learner, arm stored with attempts, opt-out) | Section 6; no assignment code exists | Unblocks every A/B test in section 6 | 2 | 2 | M | 2.0 | E6 release stamp; legal for disclosure |
| P2-14 | Mark the language of AI output paragraphs (`dir="auto"` without `lang` in `tutor.js`, `essay.js`, `scenario.js`); add `dirname` to the tutor input | 06 P1-8, P2-2; D21, D31 | Screen readers use the right voice for English | 2 | 2 | M | 2.0 | AI live |
| P2-15 | Extend the axe audit to exercise states, placement, level check, drill and scenario tabs | 06 P0-3 | Finds defects in the screens learners spend most time on | 2 | 2 | M | 2.0 | LB-09 |
| P2-16 | Under-18 defaults: a break suggestion after 45 minutes, AI explanations written for 16-17-year-olds, age filtering of roleplay | D53; 06 P1-14 | Protective defaults the UX research recommends for minors | 2 | 2 | M | 2.0 | LB-04 (may move into the blockers) |
| P2-17 | Rasch-calibrated adaptive placement with a stopping rule and a confidence band | C2 decisions 5, 28; 04 section 3 | Placement that reports its own uncertainty and improves with data | 3 | 2 | L | 2.0 | Many more responses than the pilot gives; a psychometric plan; LB-12 |
| P2-18 | Precision gates per error type, and a second check on each correction shown as "uncertain, check" when they disagree | C2 decisions 16-17 | Fewer wrong corrections in writing feedback | 3 | 2 | L | 2.0 | Annotated sentence gold set (3.6) |
| P2-19 | A short productive sample and a 10-item spelling probe in placement | C2-D6; C3-W2 | Placement sees writing, not only multiple choice | 2 | 2 | M | 2.0 | Spelling probe: none. Writing sample: the AI gate |
| P2-20 | PKCE for confirmation and reset links | Security review S-01 recommendation; `architecture.md` section 6 | Binds email links to the device cryptographically, not only by a stored marker | 2 | 2 | M | 2.0 | LB-10 |
| P2-21 | Answer-key audit from `self-judged` events and pilot answers (for example "to a certain extent" in `c1-03`) | R1-E2 residual | Fewer correct answers marked wrong | 2 | 2 | M | 2.0 | Pilot exports |
| P2-22 | RTL details: forward chevrons that point the wrong way in Hebrew, one step-counter convention, LTR time axis and a text summary for the progress chart | 06 P2-1; D30, D32, D34 | Consistent reading order in Hebrew | 1 | 2 | S | 2.0 | D34 preference test with at least 5 Hebrew readers |
| P2-23 | A written policy for offensive or taboo expressions, before any are added | 08 7.3 | Prevents unreviewed additions as the dictionary grows | 1 | 2 | S | 2.0 | none |
| P2-24 | Tidy old exercise answers before the 100,000-record account limit (about two years at 150 answers a day) | 08 15.3 | Sync keeps working for long-term learners | 1 | 3 | M | 1.5 | Accounts live |
| P2-25 | Lexical-coverage gating: estimate known words and rank texts by coverage (98% read freely, 95-98% with glosses, below 95% challenge; tunable) | C1-D17; C2-D8 | Texts at a level the learner can read | 2 | 2 | L | 1.33 | Licensed word lists (C1-D21, legal review) |
| P2-26 | High-variability perception training: at least 4 voices per contrast, a short diagnostic screen, trained and untrained test words | C3-P1, P2; 04 section 3 | Listening practice that the research expects to generalise (moderate evidence) | 2 | 2 | L | 1.33 | P3-01 recorded audio |
| P2-27 | Writing-stage exit rule and a new-text transfer task 1-4 weeks later | E decisions 4, 25 | Stage progress based on unseen prompts, not one AI score | 2 | 2 | L | 1.33 | AI gate met |
| P2-28 | Shorter onboarding: keep language, birth year and starting point; move the rest after the first lesson | 06 P1-12; D5 | Fewer screens before the first exercise (8 today for a beginner) | 2 | 1 | M | 1.0 | Pilot funnel data: moves up if onboarding is where people stop |
| P2-29 | Encounter counting of target words across reading, listening, roleplay and tutor text | C1-D18 | Extra exposure for words met fewer than 10 times | 1 | 2 | M | 1.0 | P2-25 |
| P2-30 | Display and motion settings: high contrast and forced colours, reading preferences, a motion toggle, a setting for roleplay audio that plays without a tap | 06 P2-3, P2-4, P2-6; D27, D35, D37, D38 | Better fit for low-vision and attention needs | 1 | 2 | M | 1.0 | none |
| P2-31 | Fold the seven labs in the desktop rail (14 links today) | 06 P1-6; D1, D3 | Less navigation load on desktop | 1 | 1 | S | 1.0 | Pilot observation |
| P2-32 | Reminders, only if the pilot shows that learners want them; at most one a day, opt-in, no guilt copy | D47-D49 | Unknown | 1 | 1 | M | 0.5 | Pilot interviews; LB-04 |

**Suggested order of work.** Phase 2 work can start while the pilot runs, but changes that participants would see are
released only at points fixed in advance (for example after week 3), with the release stamped on the data (E6) so
that measures can be split by build. P2-01 to P2-03 are worth doing before week 0 if there is capacity, because the
assistive-technology participants would otherwise meet known defects. Then P2-04 to P2-08 (all S, mostly
accessibility and minors); then P2-09, P2-10 and P2-13; the L items (P2-17, P2-18, P2-25 to P2-27) only once their
dependencies exist.

---

## 5. Phase 3: growth of content and tracks

Scored with the same method. Content work needs the same Hebrew and English review as LB-11 and LB-12 before release.

| ID | Item | Today | Expected impact | I | C | Effort | Score | Depends on |
|---|---|---|---|---|---|---|---|---|
| P3-01 | **Audio recorded by people**, several speakers with US and UK variants, for listening items (81), dictations (51), model dialogues (418 lines across the 36 scenarios), examples and minimal pairs | Every voice is a browser voice; voices vary by device, and some are online services (08 2.4, 5.6; `privacy.html`) | Consistent listening material on every device; enables P2-26 | 3 | 2 | L | 2.0 | Scripts from content; voice rights; offline cache size (the 75 lesson files total about 3.0 MB today, without audio) |
| P3-02 | **Scenario gaps**: emergency scenarios at A1-A2 (all 3 are B1), more A1 scenarios (3 today), scenarios above B2 (none) | Inventory, section 1.1; simulated persona Moshe | Real-life practice at every level that has learners | 2 | 2 | M | 2.0 | LB-11 process |
| P3-03 | **More workplace content**: scenarios at B1-C1 (meetings, presentations, job interviews, written requests) and workplace writing tasks (emails, reports) in the Writing lab | 6 work scenarios (A2-B2), 10 expressions; free writing accepts emails and messages (`unit work-content`, `e2e RW3`) | Serves learners whose goal is work (one of six onboarding goals) | 2 | 2 | L | 1.33 | Rubric applicability for workplace genres |
| P3-04 | **Extensive reading library**, level-filtered and learner-chosen | Reading passages come from the lessons only | More input at the right level (C2-D7: at least 60 minutes a week, tunable) | 2 | 2 | L | 1.33 | P2-25 |
| P3-05 | **Mediation tasks** (for example summarising a Hebrew text in English) | Not built | A CEFR skill Lucid does not practise | 1 | 2 | M | 1.0 | Rubric for mediation |
| P3-06 | **Contrastive translation items** in A1-B1 vocabulary sets | Not built | Tested through X14 before it becomes a default | 1 | 2 | M | 1.0 | P2-13 |
| P3-07 | **More expressions** | 60 (A2 20, B1 32, B2 8) | Breadth of informal English | 1 | 1 | S | 1.0 | P2-23 |
| P3-08 | **Exam-oriented content**: Bagrut-format writing tasks (C3-W3: 70-90 and 120-140 words), AMIRNET-style practice with original items (C3-I3), university targets per institution (C3-I4) | Not built | Relevant practice for exam-bound learners | 2 | 1 | L | 0.67 | Demand confirmed in pilot interviews; legal check of formats |
| P3-09 | **Teacher or parent views**, only if pilot interviews show demand | Not built. `privacy.html` says server data is limited to the learner | Unknown | 1 | 1 | L | 0.33 | A consent model that respects a 16-17-year-old's own privacy; legal |

### Non-goals for this roadmap

These stay out, whatever the phase (from 08 15.5, 04 section 2, 05 section 4, E and C3 "What not to build"):

- Streaks, streak freezes, XP, leagues, leaderboards, chests, gems, energy, hearts, ads, or upsells inside lessons.
- Accent scores, "% native" ratings or accent-reduction claims; any pass or fail decided by speech recognition alone.
- Certificates or "certified" levels; IELTS, Cambridge, Bagrut or AMIRNET score predictions (and for AMIRNET, none
  before validation against at least 200 real score reports, C3-I3); reuse of official exam items.
- An AI that writes or rewrites the learner's work, or accuses a learner of copying or using AI.
- A single overall writing grade while the learner is still revising; promotion based on one AI score of content
  categories.
- Claims that AI feedback equals a teacher, efficacy marketing, or any promise that the course confers a CEFR level,
  C2 included.
- A fixed list of "Hebrew speakers' mistakes" presented as research.
- Human tutors, social features, public profiles or geolocation.
- First languages other than Hebrew; Arabic-L1 error profiles must not be transferred to Hebrew-L1 learners (C3).
- Pricing and billing until willingness to pay is measured; when they are designed, they follow 06 D41-D45 (real
  prices, symmetric choices, cancellation within three steps, honest trials).
- Native app-store apps: the installable web app is the delivery channel unless evidence says otherwise (a roadmap
  decision, not a research finding).

---

## 6. A/B tests and experiments already defined in the research

**None has been run.** Lucid has no assignment mechanism (no experiment code exists in `js/`; P2-13 builds one), and
the pilot is too small for any of them. Rules for all of them: pre-register the hypothesis and primary metric; size
the sample by a power analysis from pilot variance; analyse by intention to treat (C2 decision 30); measure at week 4
or later where novelty could matter (C2 decision 22); for 16-17-year-olds, ethics approval and no arm that removes a
protective default; disclose experimentation in the privacy page.

| ID | Source | Hypothesis (as the research states it) | Arms | Primary metric | What Lucid needs first |
|---|---|---|---|---|---|
| X1 | C1-D3 | The default of 8 new words a day (4 when reviews pile up) is a reasonable balance; it is design arithmetic, not evidence | 6, 8 or 12 new words a day | 30-day retention and churn | P2-13; a 6-word option (the setting offers 4, 8, 12 and 15) |
| X2 | C1-D5 | Fewer same-day retrievals may give as much 7-day recall per minute | 2 or 4 same-day retrievals of a new card | 7-day recall per minute spent | P2-13; configurable learning steps |
| X3 | C1-D8; 04 section 5 | Immediate feedback is a design choice; Rowland (2014) tentatively favours delayed feedback | Feedback after each answer, or at the end of a short block | 7-day recall | P2-13; an end-of-block player mode |
| X4 | C1-D11; 04 section 5 | Blocked-first then interleaved review (the current hybrid) is contested | Hybrid, blocked only, interleaved from the start | 7-day delayed accuracy | P2-13; a switch in drill composition (`pool.COMPETITORS`) |
| X5 | C1-D15 | Fading Hebrew support helps more than constant support | Faded or constant support | Immediate and 7-day accuracy | P2-13 (the Settings override already exists) |
| X6 | C3-S1 | Only if Hebrew reveals stay high from B1: forcing English may or may not hurt | Hebrew on tap, or English only, from B1 | Completion | E2 reveal events; P2-13 |
| X7 | C1-D23 | The five-block daily session is a derived design meant to be tested | Current template, or "reviews only first" | 30-day retention per minute; 4-week learner retention | P2-13; a plan variant |
| X8 | C1-D16 | Reading-while-listening for comprehension is an option to test, not a default | With or without simultaneous audio | Not specified in C1; comprehension checks are the obvious choice, to be fixed at pre-registration | P2-13; P3-01 helps |
| X9 | C2-D8 | The coverage target for free reading: 95% or 98% | 95% or 98% target | Completion rate and comprehension | P2-25 |
| X10 | C2-D14; 04 section 5 | Indirect grammar feedback at B2+ is no worse than direct correction (ship only if no worse) | Direct correction (current) or location plus category | Accuracy in the next new text, 2+ weeks later | AI gate; an indirect mode; P2-13 |
| X11 | C2-D14 | The focused-or-comprehensive default for written feedback should be tested | Focused or comprehensive | Accuracy in the next new text | AI gate; P2-13 (the "feedback scope" setting exists) |
| X12 | C3-P3 | Phonetic-information panels are on by default; test only their format and language | Hebrew or English; text or video | Delayed production scores on trained and untrained items | Human ratings of production; video does not exist |
| X13 | C3-G2 | A 1-2 sentence Hebrew note on aspect at first presentation helps | With or without the note | Unit post-tests and delayed tests | A content flag per lesson; P2-13 |
| X14 | C3-L3 | A two-way translation item with contrastive feedback helps vocabulary | Set with or without the item | Delayed recall at 1 and 4 weeks | P3-06; P2-13 |
| X15 | C3-S2 | Glosses as multiple choice or tap-to-reveal work better than lists | Gloss formats | Delayed recall | P2-13 |
| X16 | C3-S5 | A Hebrew hint button in roleplay (at most 1 hint per 3 turns) helps without doing the task for the learner | Hint button or none | Task success; a delayed speaking test | AI live; P2-13 ("I'm stuck: help" exists, tested with mocks) |
| X17 | C2-D27; 05 section 5 | A forgiving weekly goal sustains study without streaks (a hypothesis; streaks stay a non-goal) | No arms specified. One design within the non-goals: weekly goal opt-in or preselected, adults only | Weekly-goal attainment; retention at 4 and 12 weeks; interviews | P2-13 |
| - | C2-D9 | Captions: English captions or Hebrew subtitles | - | - | Not applicable: Lucid has no video |

Checks and studies in the research that are not A/B tests, to run as data accumulates: FSRS calibration (log loss
and RMSE monthly, C1-D1 and D4) and the due-review pass rate within 3 points of the target (C1-D2); retention
reported by test format (C1-D7); comprehension against coverage band (C1-D17); the minimal-pair diagnostic and tier
order (C3-P1); Hebrew-contrast tag rates after 3 months (C3-G1); placement against Bagrut level (C3-I1); phrasal-verb
rate (C3-L2); Hebrew-L1 error priors re-weighted after 1,000 learner texts (E decision 30); the progress chart's
direction with at least 5 Hebrew readers (06 D34); Hebrew legend size with beginners (06 P2-12).

---

## 7. Risks and mitigations

| Risk | Why it is a risk (evidence) | Mitigation | Owner | Early signal |
|---|---|---|---|---|
| **R1. AI cost** | The default model is `claude-opus-5-5`; one unit allows up to about 6,000 output tokens; an essay costs 3 units per scoring run and 1-3 runs; cost per active learner is unknown because no live call has been made (05 section 5; `setup.md` 4) | Workspace spend limit and project-wide daily units (LB-06); measure tokens per route in LB-10 and from `lucid_ai_usage` in the pilot; compare a smaller model on the gold set before changing `LUCID_MODEL`; keep the non-AI paths (automatic checks, scripted scenarios), which are built and tested | Operator, engineering | Daily units near the global cap; spend near the limit |
| **R2. AI quality** | LLM scoring is weakest on content criteria such as argument and evidence (E 8.6); no calibration set; one scoring run by default; tutor and roleplay replies are unchecked in code (08 6.7, 8.4) | LB-08 gate; the gold set (3.6); 3 runs in the pilot; reading `ai-report` events; P2-09 and P2-18; the existing "AI feedback can be wrong" label | Engineering, content | Low QWK; high `dropped_errors`; reports of mistakes |
| **R3. Minors** | 16-17-year-olds are accepted and only marketing consent differs by age (08 2.2); the weekly goal is preselected; AI conversations are unchecked; no human contact route exists; research with minors has its own consent rules | LB-04 and LB-02 before any user; P2-06, P2-07, P2-08, P2-09, P2-16; guardian consent as legal decides; transcript sampling with consent in the pilot | Legal, engineering | Any unsuitable transcript; complaints |
| **R4. Content quality** | All content was committed by an AI author, reviewers are not recorded (08 14), and defects were still found late (R2-01: 224 strings; Hebrew in visual order; valid answers rejected, R1-E2) | LB-11 and LB-12; the validator in CI (LB-09); `self-judged` and `ai-report` events feed reviews (P2-21); the same review gate for Phase 3 content | Content | Self-judged rate per item; reviewer error rate |
| **R5. Reliance on browser speech** | Every voice is a browser voice and varies by device; in Chrome and Edge recognition sends the voice to the browser maker; availability varies; recognition on Hebrew-accented English is not validated; automated tests run in Chromium only with recognition stubbed (08 2.4, 5.6) | Speaking is never graded by recognition (built, `e2e PS1`); disclosure in `privacy.html` and a one-time notice (built); E5 measures availability; P3-01 recorded audio; manual checks in Safari and Firefox | Engineering, content | Low recognition availability; many "Can't speak right now" |
| **R6. Single origin and static hosting** | Until LB-01, Lucid shares an origin with unrelated sites (S-03); GitHub Pages does not let a site set its own response headers, and a meta CSP cannot set `frame-ancestors` (security review 5); one static host; `RELEASE` in `sw.js` is bumped by hand (08 15.3) | LB-01 to an origin and host of Lucid's own that sends headers; bump or check `RELEASE` in CI (LB-09); device-only mode keeps lessons working if Supabase is unavailable (built) | Operator, engineering | A deploy without a `RELEASE` change; any sibling content on Lucid's origin |
| **R7. Data loss and sync** | Device-only data is lost if browser storage is cleared before an export; sync keeps the newest write; accounts hit the record limit after about two years of heavy use (08 15.3, 15.4) | Accounts for pilot participants who want them; P2-24; a reminder in Settings to export before clearing data | Engineering | Support reports of lost progress |
| **R8. Over-reading the pilot** | No control group, self-selection, novelty, small numbers | No outcome claims; thresholds fixed in advance; C2 decision 30 before any efficacy claim; report the pilot as a feasibility study | Product | Pressure to quote pilot numbers publicly |
| **R9. Demand and positioning** | Demand for writing instruction is unproven, and the Hebrew-interface gap can close (05 section 6, items 3 and 5) | Pilot interviews by group; invest in curriculum depth and writing pedagogy, the parts 05 calls defensible | Product | Groups that do not use the Writing lab |
| **R10. Capacity** | LB-11, LB-12 and the gold set are each large (L), and no team is defined | Gates first; re-score after Phase 1; drop the lowest-scoring Phase 2 and 3 items before stretching the gates | Product, operator | Blockers slipping while Phase 2 work starts |
