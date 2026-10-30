# Deliverable 6: UX and UI recommendations

Prepared 2026-10-30 for Lucid, an English course for Hebrew speakers aged 16 and over.

**Inputs.** This document draws on:

- `D-ux.md`, in full, especially "Implementation decisions for Lucid" (D1 to D54, groups A to J) and "What not to build".
- `PRODUCT.md`.
- The visual direction in `.impeccable/surfaces/index-html.md`.
- `css/app.css`.
- Every view in `js/views`, every module in `js/ui`, plus `js/app.js`, `js/core/router.js`, `js/core/i18n.js`, `index.html` and the tests.

**Method.** Every statement about Lucid was checked against the code under `js/`, `css/`, `content/`, `supabase/` and `tests/`. Every statement about users, competitors or research cites a file in `docs/research/`. Where this document gives contrast ratios, they were computed here from the OKLCH tokens in `css/app.css`, by converting them to sRGB and applying the WCAG formula. They are not measurements of rendered pages.

**Snapshot.** Other work is changing content and code in parallel. Counts of lessons and content files are as of 23:03 UTC on 2026-10-30. After that, at 23:10 UTC, commit `94ffd5f` added `content/writing/exercises.json` (20 exercises) and `content/writing/assignments.json` (10 assignments) and extended `content/manifest.json` to 61 lessons. Statements below about those files describe the 23:03 state. Run alone at 23:12 UTC, after that commit, e2e check 13 passed.

## How to read the status labels

Every claim about a Lucid feature carries one of four labels.

| Label | Meaning in this document |
|---|---|
| **Built and tested** | The main behaviour is in the code, and an automated test that ran on 2026-10-30 exercises it. The test is named. |
| **Built, tested with mocks only** | The feature needs a Supabase project or an Anthropic API key, and this build has neither. Its UI code paths ran only against the mocked server in `tests/e2e/run.mjs`. Applies to AI writing feedback, AI roleplay, the AI tutor, and accounts and sync. |
| **Partial** | Something named is missing. Either part of the behaviour is absent, or the behaviour is in the code but no automated test covers it. A rule that forbids something ("no X") counts as Partial when a code search confirms that X is absent but no test guards it. |
| **Not built** | Absent from the code. |

### Test runs on 2026-10-30

These runs were made for this document. No code was changed.

| Suite | Command | Result |
|---|---|---|
| Unit tests | `npm test` (`tests/unit/*.test.mjs`) | 26 of 26 passed |
| Database tests | `npm run test:db` (`tests/db/schema.test.mjs`, migration run in PGlite) | 4 of 4 passed |
| Browser acceptance | `node tests/e2e/run.mjs` | 12 of 13 checks passed. Check 13 failed because `content/writing/assignments.json` did not exist yet. Run twice: before and after commit `28a66a0` (22:59 UTC), which changed the essay hint ladder and its check. Same result both times. |
| Accessibility audit | `node tests/e2e/a11y.mjs` | 0 axe violations across 22 route entries × 3 configurations. The `welcome` entry actually renders Today (section 6.1). Run twice: before and after commit `28a66a0`. |
| Content validation | `npm run validate` | At 23:03 UTC: 53 lesson files checked, 0 errors, 3 warnings. The warnings: 22 curriculum lessons had no file, and `writing/exercises.json` and `writing/assignments.json` were missing. An earlier run at 22:46 UTC found 40 files and 3 errors in `lessons/b1-01.json`. |
| Edge-function tests | `supabase/functions/lucid-ai/handler_test.ts` (10 `Deno.test` cases) | **Not run.** Deno is not installed in this environment. |

No CI job runs any of these suites. The repository's only workflow, `.github/workflows/pages.yml`, deletes `lucid/tests`, `lucid/tools` and `lucid/supabase` before it deploys.

---

## 1. Design direction in brief

### 1.1 Concept: a dual-legend Israeli keyboard

The surface brief (`.impeccable/surfaces/index-html.md`, "Direction contract") makes Lucid a bilingual keyboard to learn on. Israeli keyboards print two legends on every key, a Latin letter and a Hebrew letter. Lucid takes that as its form:

- **English is the carbon legend.** It is the target language, set in `--ink-en`, weight 500, on the first line.
- **Hebrew is the cobalt legend.** It is the scaffold, set in `--ink-he` at 0.82em and aligned to the inline end of the second line (`.legend .l-he` in `css/app.css`).
- **The Hebrew legend fades as the level rises.** At "minimal" support it drops to 60% opacity, and at "off" it is hidden (`:root[data-support='minimal']` and `[data-support='off']` rules).
- **One signal-orange key per screen.** The Enter-key colour (`--enter`, `.key.enter`) is reserved for the single primary action on each screen, and usually shows an "Enter" keycap hint (`<span class="kbd">Enter</span>`).
- **Answer colours for answers.** The brief reserves green, amber and red for answer states (`--ok`, `--warn`, `--bad`). The code also uses them for status: completed marks (`.mark.done`), the level rail's completed fill, and score and trend tags (`.tag.ok`, `.tag.warn`).
- **Keys and the shell.**
  - Buttons are soft keycaps: a 3px bottom "skirt" border (`.key`) that compresses on press (`.key:active` moves 2px).
  - The shell is a graphite deck: a side rail at 64rem and wider, a bottom tab bar on phones.
- **Proof on the first screen.** The welcome screen draws an SI-1452 keyboard and types "LUCID" on it once (`js/views/welcome.js`). It skips the typing when the OS asks for reduced motion.
- **Brand mark.** An Enter-coloured keycap with the legends "L" and "ל" (`brandMark()` in `js/ui/components.js`).

### 1.2 Why it fits mature learners

The review analysis describes what learners praise and complain about, and the direction answers it:

- **Learners value a calm, adult experience.** Users stay for "a calm, adult experience", short sessions, clear explanations and a feeling of real progress (source: 03-user-review-analysis.md, section 8). Babbel's fans praise explanations and an adult tone: "less time wasted on kiddy characters" (source: 03-user-review-analysis.md, section 5).
- **Reviewers complain about clutter.** One Duolingo reviewer spends "more time clicking and opening chests ... than on the lessons itself" (source: 03-user-review-analysis.md, section 5).
- **The direction answers both.** It has no mascot, no reward chests and no confetti. The only decoration is the keyboard metaphor, which is functional: it pairs each English word with its Hebrew scaffold.
- **The UX evidence points to a calm, focused tool.** Such a tool teaches by doing, gives informative feedback, and uses game elements sparingly, because expected rewards can undermine intrinsic motivation, gamification benefits are small, and its motivational and behavioural effects are unstable (source: D-ux.md, section 1). A neutral ramp with one action colour applies the "keep chrome quiet" principle directly.
- **Hebrew-speaking beginners need Hebrew from the start.** Reviews show beginners stopped by apps they cannot read (source: 03-user-review-analysis.md, section 6). L1 support helps most at low levels, and fading it as proficiency rises is supported only indirectly: no study tests a fading schedule (source: C3-hebrew-l1.md, section 6). The fading legend makes that policy visible on every label.

### 1.3 Token system (from `css/app.css`)

**Neutral ramp.** One cool keycap grey, `--n0` to `--n10`. The file states "No other greys anywhere".

| Token | OKLCH | Light-theme role |
|---|---|---|
| `--n0` | 0.995 0.002 250 | `--key` (raised surface) |
| `--n1` | 0.972 0.004 250 | `--ground` (page) |
| `--n2` | 0.945 0.006 250 | `--key-sunk` |
| `--n3` | 0.905 0.008 250 | `--key-edge` (borders) |
| `--n4` | 0.835 0.010 250 | `--key-skirt` (keycap bottom edge) |
| `--n5` | 0.700 0.012 250 | `--deck-ink-dim`, hollow marks |
| `--n6` | 0.505 0.014 250 | `--ink-3` (faint text) |
| `--n7` | 0.445 0.014 250 | `--ink-2` (muted text) |
| `--n8` | 0.340 0.013 250 | `--deck-key` (active rail item) |
| `--n9` | 0.255 0.012 250 | `--deck` (shell) |
| `--n10` | 0.185 0.010 250 | `--ink`, `--ink-en` |

**Accent roles.**

| Role | Light | Dark |
|---|---|---|
| Hebrew legend `--ink-he`; links, selection and meters `--cobalt` | 0.47 0.165 263 | `--ink-he` 0.76 0.11 263; `--cobalt` 0.72 0.13 263 |
| `--cobalt-tint` | 0.94 0.035 263 | 0.27 0.06 263 |
| Primary action `--enter` / `--enter-hi` / `--enter-ink` / `--enter-skirt` | 0.72 0.175 52 / 0.77 0.165 55 / 0.19 0.02 50 / 0.56 0.15 45 | same, except `--enter-skirt` 0.45 0.13 45 |
| Correct `--ok` / tint | 0.52 0.13 152 / 0.95 0.04 152 | 0.74 0.13 152 / 0.26 0.05 152 |
| Almost `--warn` / tint | 0.50 0.11 70 / 0.96 0.05 85 | 0.80 0.12 80 / 0.28 0.05 80 |
| Wrong `--bad` / tint | 0.53 0.19 27 / 0.955 0.03 27 | 0.72 0.15 27 / 0.27 0.06 27 |
| Focus ring `--focus` | 0.55 0.2 263 | 0.75 0.14 263 |

**Type.**

- **Font.** Rubik, self-hosted as three variable WOFF2 subsets with weights 300 to 800 and `font-display: swap`:
  - `fonts/rubik-hebrew.woff2` covers U+0590-05FF and related ranges.
  - `rubik-latin.woff2` and `rubik-latin-ext.woff2` cover Latin.
  - The Latin and Hebrew files are preloaded in `index.html`.
  - The fallback stack is `system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`.
- **Scale.** `--t-xs` 0.8125rem, `--t-sm` 0.9375rem, `--t-md` 1.0625rem (body), `--t-lg` 1.25rem, `--t-xl` 1.5rem, `--t-2xl` 1.875rem, `--t-3xl` 2.375rem. The welcome headline uses `clamp(2rem, 4.6vw, 3.4rem)`.
- **Line height.** Body 1.55; elements with `[lang='he']` 1.6; passages 1.75.
- **Text size setting.** Settings offers 100, 115, 130 and 150%, through `:root[data-text]`.

**Spacing and size.**

- **Key unit.** `--u` is 3rem: one key unit, 48px.
- **Spacing steps.** `--s1` to `--s8`: 0.25, 0.5, 0.75, 1, 1.5, 2, 3 and 4rem.
- **Layout widths.** The rail is 15.5rem. The view is at most 72rem wide (44rem for `.narrow`). The lesson body is at most 46rem.
- **Breakpoint.** Desktop layout starts at 64rem.

**Radii.** `--r-key` 0.75rem, `--r-panel` 1rem, `--r-pill` 999px.

**Interaction tokens.**

- **Focus.** `:focus-visible` draws a 2.5px outline in `--focus` with a 2px offset.
- **Easing.** `--ease-out` is `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Scroll padding.** `scroll-padding-block: 5rem 7rem` keeps focused items clear of the sticky header and footer.
- **Touch targets.** Under `@media (pointer: coarse)`, small keys, segmented buttons, chips and the "עב" reveal grow to at least 2.75rem (44px).
- **Reduced motion.** `prefers-reduced-motion: reduce` cuts every animation and transition to 0.001ms.

### 1.4 Light and dark

- **Dark mode is a separate palette, not an inversion.** It is defined twice:
  - once under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme='light'])`;
  - once under `:root[data-theme='dark']`.
- **Dark surfaces.** They are dark greys with lighter elevated layers: ground 0.165, sunk 0.2, key 0.235, deck 0.12. The accents are re-tuned rather than inverted.
- **Theme setting.** Settings offers "Match device", "Light" and "Dark" (`js/views/settings.js`). `applyTheme()` in `js/app.js` sets `data-theme`, and the default is `system` (`js/core/learner.js`).
- **Status.** Built and tested: `tests/e2e/a11y.mjs` audits a Hebrew dark configuration (1440px) with axe colour-contrast rules, and found 0 violations on 2026-10-30.

### 1.5 Where the build departs from the direction or the research

- **Cool, not warm, neutrals.** D6 asks for "low-saturation warm neutrals" (source: D-ux.md, section "Implementation decisions", D6). The token ramp is a cool grey at hue 250, as the surface brief chose. This is a deliberate visual choice, not an accident, but it departs from D6.
- **Fourteen links on the desktop rail.** The surface brief names five rail items: Today, Path, Practice, Real-life and Progress. The desktop rail (`drawShell` in `js/app.js`) shows those five plus a "Labs" group of seven, plus Help and Settings: 14 links. The phone tab bar keeps five.
- **A light keyboard in dark mode.** The brief says dark mode is "a dark keyboard (dark caps, light legends)". The welcome keyboard's caps use the fixed `--n1` and `--n10` tokens, so they stay light in dark mode. There, the cobalt Hebrew legends (dark `--ink-he`) on light caps compute to about 2.0:1. The a11y suite never audits the welcome screen (section 6.1). Run directly on the welcome screen in dark mode for this document, axe reported each single-letter Hebrew legend as "incomplete" (too short to judge), not as a violation.
- **No `DESIGN.md` yet.** The brief's FINISH line requires a `DESIGN.md`. It does not exist in `lucid/`.

---

## 2. Navigation model and screen inventory

### 2.1 Shell and navigation

**Routing.**

- Lucid is a hash-routed single-page app. `js/core/router.js` lazy-loads one view module per route.
- Routes marked `bare` hide the shell: welcome, start, placement, lesson, checkpoint, review and drill.
- Routes marked `public` work without a profile: welcome, start, account and help. Every other route redirects to `welcome` until onboarding has created a profile.

**Phone layout (below 64rem).**

- A sticky top bar holds the brand, the page title, a Help icon and a Settings icon.
- A fixed bottom tab bar holds five items: Today, Path, Practice, Real life and Progress.

**Desktop layout (64rem and wider).**

- A graphite side rail ("deck") replaces both bars.
- Each rail item carries a dual legend: the UI language on top, the other language below (`navLegend()`).
- Below the five main items is a "Labs" group: Vocabulary, Grammar lab, Reading, Listening, Speaking lab, Writing lab and AI tutor.
- The foot of the rail holds Help, Settings, the sync status and the learner's name.

**Focus mode.** Lessons and other players hide the shell. Single exercises opened from the reading, listening and speaking centres call `focusMode(true)` in `js/ui/center.js`, which does the same.

### 2.2 The 21 core screens

| # | Screen | Route(s) | View file(s) | Status |
|---|---|---|---|---|
| 1 | Welcome | `welcome` | `js/views/welcome.js` | Built and tested for rendering only: `a11y.mjs` waits for the welcome screen before it seeds its learner. Not in the axe audit: by the time the audit visits `welcome`, the learner exists, so the router redirects to Today. The typing animation is not tested. |
| 2 | Registration | `start` (device profile); `account?mode=signup\|signin\|reset` (server account) | `js/views/onboarding.js`, `js/views/account.js` | Device profile: Built and tested, e2e check "1. A new user can register (onboarding creates a profile; under-16 is refused)". Server account: Built, tested with mocks only, e2e checks "11-12" and "17" sign up and sign in against the mocked Supabase. |
| 3 | Onboarding | `start` (4 steps) | `js/views/onboarding.js` | Built and tested: e2e checks "1" and "3. A learner can start at absolute beginner level (no test, first lesson)". Not in the axe audit. |
| 4 | Placement test | `placement` | `js/views/placement.js`, `js/core/placement.js` | Built and tested: e2e "2. A new user can complete a placement assessment"; unit tests "placement finds the boundary for learners of known ability" and "placement tolerates an occasional slip (1 in 8)". Not in the axe audit. Cannot be paused or retaken (section 7). |
| 5 | Dashboard / Today | `today` | `js/views/today.js` | Built and tested: e2e "7. The curriculum adapts: repeated mistakes add targeted practice to the plan"; e2e 14-15; `a11y.mjs`. |
| 6 | Curriculum map | `path`, `path/:level`, plus `checkpoint/:level` | `js/views/path.js`, `js/views/checkpoint.js` | Built and tested for rendering: e2e 14-15 renders `path`, `path/B2` and `checkpoint/PreA1` at four widths; `a11y.mjs` covers `path`. At 23:03 UTC, 53 of the 75 lessons had content files. The path treats a lesson as available only if `content/manifest.json` lists it: 45 lessons at that time. The others show as dashed rows, and lessons without a file open a "not available" screen. |
| 7 | Lesson player | `lesson/:id` | `js/views/lesson.js`, `js/ui/exercise.js` | Built and tested: e2e "4-6. Lessons have real content, exercises give feedback, progress is saved across reloads". The axe audit sees only the explanation stage. |
| 8 | Vocabulary trainer | `vocab` (notebook); `review` (spaced review session) | `js/views/vocab.js`, `js/views/review.js` | Built and tested: e2e "8. Vocabulary can be reviewed (cards from a passed lesson, objective grading)"; unit tests on FSRS scheduling and grading in `tests/unit/engine.test.mjs`. |
| 9 | Grammar lab | `grammar` (its drills open at `drill?topic=`) | `js/views/grammar.js`, `js/views/drill.js` | Built and tested for rendering only: e2e 14-15 and `a11y.mjs`. Drills open in e2e check 7. No test exercises the topic list itself. |
| 10 | Reading | `reading`; `reading?l=&e=` opens one text | `js/views/reading.js`, `js/ui/center.js` | Built and tested for rendering only: e2e 14-15 and `a11y.mjs`. The single-text player is not tested. |
| 11 | Listening | `listening`; `listening?l=&e=` | `js/views/listening.js`, `js/ui/center.js` | Built and tested for rendering only, as for Reading. |
| 12 | Speaking lab | `speaking`; `speaking?l=&e=` (shadowing) | `js/views/speaking.js` | Built and tested for rendering only, as for Reading. Speech recognition cannot be exercised in headless Chromium. |
| 13 | Writing lab | `writing` | `js/views/writing.js` | Partial at 23:03 UTC. It renders (e2e 14-15, `a11y.mjs`), but `content/writing/exercises.json` and `assignments.json` were missing. The stages held only the seven level final tasks (in stages 1, 2, 3, 6, 8 and 10), stages 4, 5, 7 and 9 showed "No exercises in this stage yet", and e2e check 13 failed. Both files were added at 23:10 UTC (see Snapshot). |
| 14 | Essay editor | `writing/:id` (for example `writing/free`, `writing/final-B2`) | `js/views/essay.js` | Automatic checks: Built and tested, e2e "11-12" and the unit tests in `tests/unit/writing-analyzer.test.mjs`. AI feedback, hint ladder (the correction opens only after the learner edits the text), revisions and version compare: Built, tested with mocks only, e2e "11-12. Writing can be submitted, evaluated (automatic + mocked AI) and revised with version comparison". |
| 15 | AI tutor | `tutor` | `js/views/tutor.js` | Built, tested with mocks only: e2e "17. AI features are functional or clearly marked as requiring configuration" sends one message to the mocked AI. The "not configured" notice is Built and tested in the same check. |
| 16 | Travel English (Real life) | `real-life`, `scenario/:id` | `js/views/reallife.js`, `js/views/scenario.js` | Built and tested: e2e "9. Travel English is functional (scenario: phrases, model dialogue, scripted practice)". |
| 17 | Slang dictionary | `expressions` | `js/views/slang.js` | Built and tested: e2e "10. Slang explanations include context (usage, formality, when not to use)". |
| 18 | Conversation simulations | `conversations`; `scenario/:id?tab=roleplay` | `js/views/simulations.js`, `js/views/scenario.js` | Partial. The list and its "not configured" notice are Built and tested (e2e 17). The AI roleplay chat has code and a mock handler in `run.mjs` (`roleplay_turn`, `roleplay_feedback`), but no check opens the roleplay tab, so it is untested even with mocks. |
| 19 | Progress | `progress` | `js/views/progress.js` | Built and tested for rendering (e2e 14-15, `a11y.mjs`). The report logic is unit-tested: "period report compares with the previous period and counts retention". |
| 20 | Profile | `profile` | `js/views/profile.js` | Partial. It renders (e2e 14-15, `a11y.mjs`), but no link anywhere in the app leads to `#/profile`. |
| 21 | Settings | `settings` | `js/views/settings.js` | Built and tested: e2e "16. User data handled securely (CSP, no secrets in client, export and deletion)"; e2e 14-15; `a11y.mjs`. The theme, text-size and Hebrew-support controls are not functionally tested. The signed-in account controls (Sync now, Sign out, server account deletion) need Supabase, and no check renders them, even with mocks. |

**Other routes.**

- `practice`: the hub that links to the seven labs.
- `help`.
- `drill`: targeted practice.
- `checkpoint/:level`: an unassisted level check.
- `review`: the spaced review session.

### 2.3 Navigation findings

These findings feed section 7.

- **Profile is orphaned.** A code search finds no `#/profile` link in `js/`.
- **The placement test cannot be reached again.** The only navigation to `placement` is from onboarding (`onboarding.js`, `finish()`). Its Exit goes to `#/welcome`, which redirects to Today because a profile exists.
- **The desktop rail exceeds the five-choice limit.** It shows 14 destinations against D1's limit of five top-level items (source: D-ux.md, "Implementation decisions", D1).

---

## 3. Lesson and exercise screen anatomy

Sources: `js/views/lesson.js`, `js/ui/exercise.js`, `js/ui/player.js`, `js/ui/center.js`, `js/views/review.js` and `css/app.css` ("lesson player").

### 3.1 Stages of a lesson

1. **Intro** (`showIntro`).
   - Shows the level and lesson number, "about N min", and the title as a dual legend.
   - Lists the objectives under "By the end of this lesson", plus an optional warm-up tip.
   - Shows a banner "You stopped at exercise X of Y" with "Continue where I left off" when a saved place exists.
   - Shows a "completed (best N%)" note on repeat visits.
   - Footer: "Skip to practice" (ghost) and "Let's learn" (Enter key).
2. **Learn** (`showLearn`).
   - Explanation blocks, rendered by `renderBlocks`: rule, tip, warning, table, examples.
   - Example sentences with a play button.
   - "Watch out (Hebrew speakers)" notes. These are hidden when Hebrew support is off.
   - A grid of new words: word, part of speech, IPA, Hebrew gloss and an example.
   - Footer: "Start practice".
3. **Practice** (`showExercise`). One exercise per screen; anatomy in 3.2.
4. **Review** (`showReview`).
   - Heading "Lesson complete" or "Nearly there", with the first-try score against the pass mark (`completion.pass_score`, 0.7 in the lessons checked).
   - "Key points".
   - When the lesson is passed for the first time, a note that its words joined spaced review.
   - "Worth watching": up to three error types made in this lesson, with their Hebrew explanations unless Hebrew support is off.
   - Footer: "To Today" plus "Next lesson" when passed, or "Later" plus "Practise again" when not passed.

### 3.2 The practice frame

| Region | Contents |
|---|---|
| Top (`.player-top`) | Exit (a cross icon, labelled "Leave lesson"); a progress bar (`role="progressbar"`, 0 to 100); the step count "n / N" during practice; Help (an info icon, linking to `#/help`). |
| Body (`.player-body`, at most 46rem wide) | The prompt as an `<h2>`, through `bi()`, so the Hebrew instruction is shown according to the support level. Below it, the exercise. After a wrong answer, a retried item shows "Once more, so it sticks". |
| Footer (`.player-foot`, sticky) | Before checking: "Hint" (if authored, usable once), "I don't know" (graded items only), and "Check" or "Submit" as the Enter key, disabled until an answer exists. After checking: the footer turns green, amber or red; the verdict appears; "Continue" becomes the Enter key and receives focus. |

### 3.3 Exercise types

`mountExercise` renders twelve types. At 23:03 UTC the 53 lesson files held 804 exercises, 13 to 16 per lesson, in these counts: mcq 131, transform 103, correct 93, gap 87, listen 59, categorize 58, speak 57, write 53, read 50, dictation 42, order 37, match 34.

| Type | How the learner answers | Direction markup |
|---|---|---|
| `mcq`, `listen` | Click an option or press 1 to 6. `listen` adds "Play" and "Slowly" buttons, focuses Play, and shows the transcript after checking. | Options wrap English in `lang="en" dir="ltr"`. |
| `gap` | Type into inline inputs, or tap word-bank chips that fill the next empty gap. In word-bank mode, tapping a filled gap clears it. | The sentence is `lang="en" dir="ltr"`. |
| `order` | Tap tiles to build the sentence; tap a placed tile to remove it. There is no dragging. | Both tile rows are `lang="en" dir="ltr"`. |
| `match` | Tap an item on the left, then its pair on the right. A wrong pair shakes briefly. | Each item has `dir="auto"` and a detected `lang`. |
| `categorize` | Tap an item, then a category bin (`role="button"`, Enter or Space). Tap a placed item to take it back. | Chips are `lang="en" dir="ltr"`. |
| `transform`, `correct` | Type the full sentence. For `correct`, the textarea is prefilled with the faulty sentence. Enter submits. | The textarea is `lang="en" dir="ltr"`. |
| `dictation` | Listen and type. Accepted at 85% or more word accuracy; a word diff is shown. | `lang="en" dir="ltr"`. |
| `speak` | "Hear it", then "Say it" (speech recognition). Without recognition, the learner self-rates: "I said it clearly" or "I need more practice". | The target is `lang="en" dir="ltr"`. |
| `read` | An English passage with optional "Read it to me", then true/false, multiple-choice and gap questions. Each question gets its own feedback. | The passage is `<article lang="en" dir="ltr">`. |
| `write` | A short text, with a word count and automatic checks. Afterwards: "Check yourself" boxes and a model answer. Not graded. | The textarea is `lang="en" dir="ltr"`. |

### 3.4 Feedback after each answer

Feedback is produced by `verdictHtml` in `js/ui/exercise.js`. All grading except the AI features runs in the browser (`js/core/grading.js`); there is no network round trip.

1. **Title.** A check or cross icon, plus "Correct", "Almost! Check the small details" or "Not quite". The footer is coloured to match.
2. **Correct answer.** "Correct answer: …" when the answer was wrong, or "Exact form: …" when it was nearly right.
3. **Specific feedback.** Authored feedback for the specific wrong answer, from `option_feedback` or `wrong_feedback`.
4. **Error type.** A tag naming the error type, such as "Article (a / an / the)", plus its Hebrew "why" note unless Hebrew support is off.
5. **Explanation.** The exercise's `explanation`. It is shown after correct answers too, so a correct answer is not met with praise alone. The validator requires an explanation on every type except `read` and `write`.

**Status:** Built and tested. e2e check "4-6" asserts that corrective feedback ("Correct answer" or "Not quite") appears during a lesson.

### 3.5 Retry queue and scoring

- **Retry queue.** A wrong answer is appended once to the end of the queue as a retry. The exceptions are `match`, `categorize` and `read`, which are not requeued. The retry shows the "Once more, so it sticks" label.
- **Scoring.** Only the first attempt counts toward the lesson score (`firstTry`):
  - correct: 1;
  - correct with a hint: 0.75;
  - almost: 0.9;
  - wrong: its partial score, capped at 0.5.
- **Ungraded items.** `write` items and self-rated `speak` items are recorded but not scored.
- **Saving.** After every check, `saveResume()` stores the queue, the position and the first-try scores. Leaving and coming back resumes at the next unanswered item. Today shows a "Continue where you left off" card.
- **Side effect of the retry queue.** The total in "n / N" grows as retries are appended.

**Status: Partial.**

- What exists: the queue and saving are in the code. e2e "4-6" checks that attempts are recorded and that lesson progress survives a reload.
- What is missing: a mid-lesson reload-and-resume test.

### 3.6 Keyboard use

- **Enter** triggers the visible primary action: Check, then Continue; "Let's learn" on the intro; "Next lesson" or "Practise again" on the review. There are two exceptions:
  - In `write` textareas, Enter adds a new line and does not submit.
  - IME composition (`isComposing`) and Shift+Enter are ignored.
- **1 to 6** select options in `mcq` and `listen`. The Help page says "1-4".
- **Tab and Shift+Tab** move between controls. Every tile, chip, pair item and bin is a `<button>` or `role="button"` with Enter and Space.
- **Focus.**
  - After checking, focus moves to "Continue".
  - `gap` (without a word bank), `transform` and `correct` focus their first input.
  - `listen` and `dictation` focus "Play".
- **Arrow keys** are not implemented for tiles or bins.

**Status: Partial.** The handling is in the code, but no automated test drives an exercise by keyboard.

### 3.7 Other players

| Player | Used by | Differences from the lesson |
|---|---|---|
| `runSet` (`js/ui/player.js`) | Targeted drills (`drill`), level checks (`checkpoint/:level`), multi-item writing exercises (`essay.js`) | No retry queue and no Help link. In `unassisted` mode (level checks) there are no hints and no feedback until the end. |
| `runPlayer` (`js/ui/center.js`) | Single items from the reading, listening and speaking centres | One item, then Continue back to the list. No Help link. |
| Placement (`js/views/placement.js`) | The placement test | No right or wrong answer is shown during the test. "I don't know" is always available. No Help link. Progress lives in memory only. |
| Review (`js/views/review.js`) | Spaced review | The first exposures of a word are four-option recognition. Later reviews require typing the Hebrew meaning or the English word. Hint; "I don't remember"; "That is what I meant – count it" override. No Help link. |

### 3.8 How Hebrew support fades by level

**The setting.** Settings → "Hebrew support" offers By level (the default), Full, Partial, Minimal and Off (`settings.js`). "By level" follows the learner's current course level through `SUPPORT_BY_LEVEL` in `js/core/i18n.js`.

| Course level | Support | Instructions and explanations, via `bi()` | Dual legends (titles, words) |
|---|---|---|---|
| Pre-A1, A1 | Full | Hebrew first, English under it | Hebrew legend at full strength |
| A2 | Partial | English first, Hebrew after it, smaller | Hebrew legend at full strength |
| B1, B2 | Minimal | English only, with an "עב" button that reveals the Hebrew | Hebrew legend at 60% opacity |
| C1, C2 | Off | English only, with the "עב" button | Hebrew legend hidden, no reveal |

**Other effects of the "off" setting.**

- The lesson's "Watch out (Hebrew speakers)" section is hidden.
- The Hebrew gloss is dropped from example rows.
- The Hebrew "why" notes on error tags are dropped.

**Separate from the interface language.** The interface language (Hebrew RTL or English LTR, `setUiLang`) is set independently of the support level.

**Mismatched comment.** The comment above `SUPPORT_BY_LEVEL` says "full support at Pre-A1-A2, partial at B1, minimal at B2", but the map and the Settings help text say full to A1, partial at A2, minimal at B1 and B2.

**Status: Partial.**

- Built: the fading logic, in `i18n.js`, `app.css` and `lesson.js`.
- Not tested:
  - No test covers `setHebrewSupport` or `bi()`.
  - The axe audit only ever renders "full" support, because its seeded learner is at Pre-A1, so the "עב" button is never audited.
  - The thresholds themselves are an untested design choice (source: C3-hebrew-l1.md, section 6).

---

## 4. Implementation decisions D1 to D54: status in Lucid

**Source columns.** "Research reason" cites the section of `D-ux.md` that the decision draws on. Section numbers refer to `D-ux.md` sections 1 to 9.

**Status counts.** Across the 54 decisions:

| Status | Count |
|---|---|
| Built and tested | 3 |
| Partial | 42 |
| Not built | 9 |

No decision as a whole is "Built, tested with mocks only". Mock-only parts are noted inside rows D11 and D19. Row D46 notes a server part that no check exercises, even with mocks.

### A. Focus, structure and tone

| # | Decision | Research reason | Lucid status | Evidence |
|---|---|---|---|---|
| D1 | One primary action per lesson screen; at most 5 main choices per screen and in top-level nav | COGA "five or less main choices"; Apple simplicity (section 3, section 1) | **Partial** | The lesson footer has one `.key.enter` per state (`lesson.js` `footer()`), and the phone tab bar has 5 items (`app.js` `NAV`). But the lesson intro shows two Enter keys when a saved place exists: the banner "Continue where I left off" plus "Let's learn". The desktop rail lists 14 links. No audit script counts primary buttons. |
| D2 | Lesson focus mode: no global nav, widgets or banners; show step indicator, Exit, Help | Linear calm interface, Babbel focus, COGA (section 1, section 3) | **Partial** | `lesson/:id` is `bare` in `router.js`, so the rail, tab bar and top bar are hidden (`app.js` `drawShell`). The player top shows Exit, a progress bar, "n / N" and Help, and no toast is raised in `lesson.js`. Missing: the specified E2E check. Help is also absent in the review, drill, checkpoint and placement players. |
| D3 | Simple first: advanced controls behind "Advanced"; a Simplified view of at most 6 functions | Linear "simple first", COGA "3 to 6 functions" (section 1, section 3) | **Not built** | Memory target and new-words-per-day sit at the top level of Settings (`settings.js`). There is no "Advanced" grouping and no Simplified view. Some lists do use disclosure: one level at a time on `path.js`, collapsed levels in `grammar.js`. |
| D4 | Plain, uninvented names; Hebrew UI copy with one idea per sentence, at most 20 words | Linear "don't invent terms", COGA clear words (section 1, section 3) | **Partial** | Plain names in `i18n.js` `STRINGS`: Today, Path, Practice, Real life, Progress, Vocabulary, Grammar lab, Writing lab, AI tutor. No sentence-length lint exists. |
| D5 | At most 4 screens before the first real exercise; account, notifications and payment after the first lesson | Apple onboarding; the Headspace onboarding rebuild; COGA short paths (section 1, section 3) | **Partial** | The account is optional and never required (device-only mode, `account.js`). No notification or payment prompts exist. But a complete beginner reaches the first exercise on the 8th screen: welcome, 4 onboarding steps (`onboarding.js` `STEPS = 4`), lesson intro, explanation, exercise. The placement path reaches its first item on the 7th screen: welcome, 4 onboarding steps, the placement intro, the first item. No funnel check exists. |
| D6 | Warm, calm visuals; no guilt mascots; tokens generated from base, accent and contrast | Linear theming in LCH; Headspace (section 1) | **Partial** | No mascot (code search). Thin borders and small line icons. The neutrals are cool (hue 250), not warm. The tokens are set by hand and not generated from three inputs. There is no high-contrast theme. |

### B. Feedback, rewards and motivation

| # | Decision | Research reason | Lucid status | Evidence |
|---|---|---|---|---|
| D7 | High-information feedback on every answer: what was right, what to change, the correct form, a rule with "Why?"; never praise alone | Feedback meta-analysis: corrective feedback d = 0.46 (section 1, with the D7 caveat) | **Built and tested** | `verdictHtml` (`exercise.js`); the explanation rule in `tools/validate-content.mjs` (every type except `read` and `write`); e2e check "4-6" asserts corrective feedback. The explanation is shown in full, with no "Why?" expander. The 300 ms target is not measured, but grading is local. The validator does not run in CI. |
| D8 | Icon, text and colour; an `aria-live` announcement without moving focus; sound off by default | WCAG 1.4.1 and 4.1.3; Apple multi-channel feedback (section 2, section 1) | **Partial** | Icon, text and colour: `verdictHtml` and `.player-foot.ok/.bad/.almost`. The verdict `<div role="status">` is created together with its text, and focus moves to Continue at the same moment (`lesson.js` `doCheck`). Whether screen readers announce it is unverified. Lucid plays no feedback sound and uses no haptics. No unit test checks the live-region text, and no colour-blindness snapshot exists. |
| D9 | Rewards that inform: can-do statements mastered, words retained, writing criteria improved; no points for time; no hearts | Deci et al. on rewards; Sailer & Homner on gamification (section 1) | **Partial** | No points, hearts or lives (code search). Mastery requires accuracy, enough evidence and two different days (unit test "mastery needs accuracy, enough evidence and two different days"). Progress shows skill levels, mastered topics, stable words and recall. It does not express progress as can-do statements mastered. It does show activity counts: "Active minutes" and "Exercises" (`progress.js`). |
| D10 | Light gamification, collaborative before competitive; no public leaderboards | Gamification moderators; ICO; DSA (section 1, section 7, section 9) | **Partial** | No leaderboards, leagues or social features (code search). A personal best per lesson is shown on the path (`path.js` `best_score`). The optional study buddy is not built. |
| D11 | AI tutor and roleplay use a hint ladder, with one tap to the full answer | Brilliant's "never just gives you the answer"; feedback research (section 1) | **Partial** | The writing feedback ladder is enforced in code (`essay.js`, `rung` and `attempted`): locate, name the error type, clue, correction. Spelling and word-choice errors start at "locate". The correction opens only after the learner has changed the quoted text. This is stricter than D11's "one tap to the full answer". It is Built, tested with mocks only: e2e check "11-12" asserts that the correction stays locked until the text is edited, then opens, and that hint levels are logged. The tutor's hint-first behaviour is a prompt instruction only (`supabase/functions/lucid-ai/prompts.ts`, the tutor system prompt), with no policy test against a model. The roleplay partner does not correct during the scene (`prompts.ts`). |

### C. WCAG 2.2 AA (with selected AAA)

| # | Decision | Research reason | Lucid status | Evidence |
|---|---|---|---|---|
| D12 | Body text 7:1 as the target (4.5:1 minimum); UI parts and focus at least 3:1; an automated check over all themes | WCAG 1.4.3 and 1.4.11; Apple's 7:1 (section 2, section 5) | **Partial** | axe colour-contrast found 0 violations in the Hebrew light, Hebrew dark and English light configurations (`a11y.mjs`). Computed from tokens: `--ink` on the ground is 17.2:1 (light) and 16.7:1 (dark), but `--ink-3` is 5.0 to 5.4:1 and the Hebrew legend 6.5 to 7.0:1 in light, so both sit under the 7:1 target. Non-text contrast is not tested: input borders compute to about 1.2 to 1.3:1 and hollow status marks to 2.6:1. |
| D13 | Focus outline at least 2px at 3:1 or more; sticky regions never cover focus | WCAG 2.4.11 and 2.4.13 (section 2) | **Partial** | `:focus-visible` gives a 2.5px outline with a 2px offset. The focus colour against the ground computes to 4.7:1 (light) and 8.5:1 (dark). `scroll-padding-block: 5rem 7rem` is set. But `.input:focus` replaces the outline with a 1px border and a faint ring, and `.gap-input:focus` shows only a background change of about 1.15:1. No keyboard-walk test exists. |
| D14 | Targets at least 44×44 px, with 8px between tiles | WCAG 2.5.8; Apple 44 pt (section 2) | **Partial** | `.key` is 48px tall, `.option` 56px and `.chip` 44px. `.key.small` is 36px on fine pointers and 44px on coarse ones. The inline play buttons in scenarios are forced to 1.8rem by inline style (`scenario.js`). The "עב" button computes to about 21.5px tall on fine pointers. axe's `target-size` (24px) passed on the audited states. There is no 44px audit. |
| D15 | No drag-only interactions; tap-to-select, tap-to-place, plus arrow keys and Enter | WCAG 2.5.7 (section 2) | **Partial** | No drag code anywhere (code search). Order, match and categorize are tap-based buttons, and e2e "4-6" completes them by clicking. Arrow keys are not implemented, and there is no keyboard-only E2E test per type. |
| D16 | Untimed by default; timed modes opt-in and extendable to 10×; sessions do not expire under 20 h | WCAG 2.2.1 (section 2) | **Partial** | No timers in the lesson, review or placement code. The essay timer is opt-in and labelled "(optional)" (`essay.js` `data-timer`); it can be stopped but not extended. Server sessions refresh tokens before expiry (`api.js` `ensureFresh`), untested against a live server. No test asserts the absence of timers. |
| D17 | Never lose work: answers on submit, drafts within 2 s and on blur, resume at the same step | COGA "Avoid Data Loss"; ICO pause (section 3, section 9) | **Partial** | Lesson answers and position are saved after every check (`saveResume`). Essay drafts save 600 ms after typing stops and again when the view closes (`essay.js` `saveDraft`). e2e "4-6" checks that progress survives a reload after a lesson; no mid-lesson or mid-essay reload test exists. The placement test and onboarding answers live in memory and are lost when the learner leaves. |
| D18 | Help in the same place on every page; human contact within 2 activations | WCAG 3.2.6 (section 2, section 3) | **Partial** | Help is in the top bar on phones, at the rail foot on desktop and in the lesson top bar. It is absent from the review, drill, checkpoint, placement and single-exercise players, and from onboarding. `help.js` offers no human contact route. No header-order snapshot test exists. |
| D19 | Passkeys or email link; one-time-code field; paste allowed; no CAPTCHA | WCAG 3.3.8 (section 2) | **Partial** | Email and password with `autocomplete="email"`, `"new-password"` and `"current-password"`; no paste blocking (code search); no CAPTCHA; only an 8-character minimum (`account.js`). This part is Built, tested with mocks only (sign-up and sign-in in e2e 11-12 and 17). Passkeys, email links and one-time codes are not built. |
| D20 | Information entered once is prefilled later (profile, tutor, checkout) | WCAG 3.3.7 (section 2) | **Partial** | The profile form prefills name and goals (`profile.js`). The tutor sends the course level with each turn, plus goals, weak topics, recurring errors and recently completed lessons (`tutor.js`, `learnerContext`). Account creation copies the device profile to the server (`account.js` `afterSignIn`). No test covers this, and there is no checkout. |
| D21 | `lang` and `dir` on every English block and phrase; a lint for unmarked Latin text | WCAG 3.1.2; W3C i18n (section 2, section 4) | **Partial** | `<html lang="he" dir="rtl">` (`index.html`), updated by `setUiLang`. `legend()`, `bi()` and `en()` mark English, and `isolateLatin()` wraps Latin runs in Hebrew content (unit test "Latin runs inside Hebrew are isolated; punctuation around them stays Hebrew"). Gaps: AI replies and feedback carry `dir="auto"` without `lang` (`tutor.js`, `essay.js`, `scenario.js` report); the Today start button inserts `title_en` without `lang`; no lint exists. |
| D22 | Reflow at 320px; 200% text; WCAG 1.4.12 spacing | WCAG 1.4.10, 1.4.4, 1.4.12; Apple (section 2) | **Partial** | 320px is Built and tested: e2e "14-15. Mobile (320, 390), tablet and desktop layouts, every route loads without errors or horizontal overflow" covers 24 routes at 4 widths. Not tested: 200% zoom and text-spacing overrides. The in-app text size stops at 150%. |
| D23 | Conformance target, a Hebrew and English accessibility statement, legal check | WCAG 2.2; the Israel policy register (section 2) | **Not built** | No accessibility statement in `lucid/` (`privacy.html` has none). |

### D. Cognitive accessibility and ADHD-friendly defaults

| # | Decision | Research reason | Lucid status | Evidence |
|---|---|---|---|---|
| D24 | Chunked lessons with a step counter; media of 2 minutes or less with heading, transcript and skip; reading passages with headings and a one-line summary | COGA chunking; ADHD video study (section 3) | **Partial** | Present: a step counter in practice (`lesson.js`); 13 to 16 exercises per lesson; "Skip to practice" on the intro; transcripts after listening items. Missing: summaries and section headings on reading passages, and a length check on audio. No test covers this. |
| D25 | A persistent Pause that saves; "Resume where you left off" as the first item on Home | ICO pause and save; COGA (section 9, section 3) | **Partial** | Exit saves the place, because saving happens after every check, and Today shows a resume card. That card comes after the "Start" button, not first (`today.js`). There is no separate Pause control and no test. |
| D26 | No modals, tooltips, upsells, rating prompts or popovers during lessons | COGA "Limit Interruptions"; Apple; FTC nagging (section 3, section 1, section 7) | **Partial** | Absent by code search: `lesson.js` opens no dialog (Exit leaves without one), and no rating or upgrade prompt exists anywhere. No test guards this. |
| D27 | Reading preferences: text 100 to 200%, line spacing, line length, tint, font | Dyslexia Scotland; the OpenDyslexic study; WCAG 1.4.12 (section 3) | **Partial** | Text size 100, 115, 130 and 150% only (`settings.js`; `:root[data-text]`). No line-spacing, line-length, tint or font settings. |
| D28 | Every usability round includes people with ADHD, people with dyslexia and a screen-reader user; no "ADHD mode" | COGA testing guidance; Spiel et al. (section 3) | **Not built** | No usability round with real participants has taken place. `docs/qa/personas/` holds simulated persona reviews, in which an AI played invented personas (one of them with ADHD); the reports state that they are not research with real people. No "ADHD mode" exists (code search). |

### E. RTL and bidi

| # | Decision | Research reason | Lucid status | Evidence |
|---|---|---|---|---|
| D29 | Logical CSS only; a lint and RTL/LTR screenshot pairs | W3C i18n; MDN logical properties (section 4) | **Partial** | A code search finds no physical left or right property, value or `text-align: left/right` in `css/app.css` or in inline styles in `js/`. `.mark.half` has an explicit RTL gradient. No stylelint and no screenshot pairs exist. |
| D30 | Mirroring map: navigation, progress and breadcrumbs mirror; media, digits and checkmarks do not | Material, Wikimedia, Apple (section 4) | **Partial** | Mirrored correctly: the progress bar fills from the inline start, as does the level rail; the disclosure chevrons flip (`:root[dir='rtl'] .disclosure .chev`); "next" arrows switch icon by language. No media scrubber exists, and the welcome keyboard is `direction: ltr`. Not mirrored: the forward chevron on the Today resume card and on the Practice "Recommended now" rows points right in Hebrew. The progress chart mirrors (see D34). |
| D31 | English exercise zones are LTR islands; tutor input `dir="auto"` with `dirname` | W3C i18n (section 4) | **Partial** | Tiles, gaps, transcripts, passages, the essay editor and the roleplay transcript and input are `lang="en" dir="ltr"` (`exercise.js`, `essay.js`, `scenario.js`). The tutor input has `dir="auto"` but no `dirname` (`tutor.js`). No test covers this. |
| D32 | Isolate interpolated values; never RLE/LRE; tests of visual order | W3C bidi (section 4) | **Partial** | `isolateLatin()` uses `<bdi>` and is unit-tested. `speaking.js` uses LRI/PDI isolates, and no RLE or LRE appears (code search). But UI template strings interpolate English titles and numbers without isolation; for example `today.js` builds "להתחיל: {title_en}". Rendered in Chromium for this document: the lesson counter "4 / 12" shows 4 on the right, while the drill, review and checkpoint counters "4/12" show 4 on the left. |
| D33 | Align paragraphs by language; one alignment per list; avoid all-caps Latin; tune Hebrew size (+2 pt) | Apple RTL guidance (section 4) | **Partial** | Rubik covers both scripts, Hebrew line height is 1.6, and alignment follows each element's `dir`. The Hebrew legend is deliberately smaller (0.82em), the opposite direction to Apple's guidance of about +2 pt for Hebrew next to all-caps Latin. No `text-transform: uppercase` exists; apart from acronyms such as AI, CEFR and JSON, all-caps Latin appears only on the welcome keyboard illustration. |
| D34 | Time-series charts keep an LTR time axis and carry a text summary; test against an RTL variant | Material, Wikimedia vs Apple (section 4) | **Partial** | The bar chart in `progress.js` is a CSS grid with no `dir="ltr"`, so in Hebrew it runs right to left. It has an `aria-label` listing values but no visible text summary. The open question has not been tested with users. |

### F. Dark mode and theming

| # | Decision | Research reason | Lucid status | Evidence |
|---|---|---|---|---|
| D35 | Follow `prefers-color-scheme`; System, Light and Dark in Settings; high-contrast variant; `forced-colors` support | Apple dark mode; NN/g; Linear contrast token (section 5, section 1) | **Partial** | The default follows the OS (`app.css` media query, `theme: 'system'`), with a three-way setting (`settings.js`, `app.js` `applyTheme`). The dark palette is audited by axe (`a11y.mjs`, Hebrew dark). No high-contrast variant and no `forced-colors` rules exist. The in-app override is not tested. |
| D36 | Dark greys, lighter elevation, re-tuned accents validated by contrast tests, both themes tested | Apple; Material dark theme (section 5) | **Built and tested** | Dark tokens: ground 0.165, key 0.235, deck 0.12. `--ok`, `--warn`, `--bad`, `--cobalt` and `--focus` have dark values. `a11y.mjs` runs axe on Hebrew dark at 1440px: 0 violations. Caveats: dark is audited in one configuration only; there are no raster images to dim; the welcome keyboard keeps light caps (see 1.5). |

### G. Motion

| # | Decision | Research reason | Lucid status | Evidence |
|---|---|---|---|---|
| D37 | Transitions of 200 ms or less that never block; no parallax or carousels; audio only on tap | Apple Motion; WCAG 2.2.2 (section 6, section 2) | **Partial** | Nothing waits for an animation, and there is no parallax and no carousel (code search). Some transitions run longer than 200 ms: `.meter` 0.5s, `.progress` 0.4s, legend fade 0.3s, toast 0.35s. AI roleplay speaks the partner's opening line and each reply automatically (`scenario.js` `sendTurn`, `data-start-rp`), with no setting to turn this off. |
| D38 | Honour `prefers-reduced-motion` and offer an in-app toggle; an E2E check | WCAG 2.3.3; MDN (section 6) | **Partial** | The global reduced-motion rule is in `app.css`, and `welcome.js` checks the media query. No in-app toggle exists. The E2E and axe runs emulate reduced motion but assert nothing about animation. |
| D39 | End-of-lesson celebration of 1 s or less, skippable, never between exercises | Apple "let people cancel motion" (section 6) | **Partial** | The requirement is met by absence: the review screen has no animation and nothing animates between exercises (`lesson.js`). No test guards this. |

### H. Ethical engagement, pricing and cancellation

| # | Decision | Research reason | Lucid status | Evidence |
|---|---|---|---|---|
| D40 | An opt-in weekly rhythm, not a streak; off by default; neutral copy; no paid repair | Duolingo names loss aversion; ICO names reward loops as sticky features; the DSA item on *communication* streaks, applied to learning streaks by extrapolation (section 1, section 7, section 9) | **Partial** | No streak exists. The copy is neutral: "A day off erases nothing" (`today.js`, `onboarding.js`). But the weekly goal is on for everyone: onboarding asks for it with 5 days preselected, and Today always shows it. That includes under-18s. |
| D41 | No virtual currency; real prices in ILS including VAT | FTC on intermediate currency and drip pricing (section 7) | **Not built** | No pricing exists. A code search finds no currency, gems or coins in `js/`. |
| D42 | No fake urgency or scarcity; a lint on marketing strings | FTC; Mathur et al. (section 7) | **Partial** | No countdowns, stock or "learners online" messages (code search). There are no marketing pages in the app. No lint exists. |
| D43 | Symmetric accept and decline; neutral "No thanks"; nothing pre-checked | FTC false hierarchy and confirmshaming; ICO nudges (section 7, section 9) | **Partial** | The AI-consent and terms boxes start unchecked (`onboarding.js`), and decline labels are neutral ("Cancel", "Not now", "I'd rather start from the basics"). But `confirmDialog` styles Cancel as ghost and Confirm as an Enter or danger key (`components.js`). |
| D44 | Cancellation within 3 activations, on the same surface as purchase | FTC (ROSCA); EU withdrawal button (section 7) | **Not built** | No subscription exists. |
| D45 | Honest trials and renewals: explicit consent, reminders, full price at checkout | FTC forced continuity (section 7) | **Not built** | No billing exists. |
| D46 | In-app self-service deletion and export | FTC "immortal accounts"; ICO tools (section 7, section 9) | **Partial** | Device export and deletion are Built and tested: Settings offers "Download all my data (JSON)", "Restore a backup" and delete (`settings.js`), and e2e "16" covers export and device deletion. Server account export and deletion need Supabase. Their SQL functions `lucid_export` and `lucid_delete_account` pass `tests/db/schema.test.mjs` "export returns only the caller; delete removes everything" (migration run in PGlite). No check exports or deletes while signed in, even against the mocked Supabase, although `run.mjs` mocks both calls. |

### I. Notifications

| # | Decision | Research reason | Lucid status | Evidence |
|---|---|---|---|---|
| D47 | Ask notification permission only after the learner turns on a reminder | Apple notifications; COGA (section 8) | **Not built** | Lucid has no reminders. No notification permission is ever requested: a code search finds no `Notification` or `PushManager` use in `js/`. |
| D48 | At most one reminder a day; quiet hours; none during lessons | Apple; attention studies (section 8) | **Not built** | No reminders exist. |
| D49 | Back off after ignored reminders; no guilt copy | Duolingo bandit novelty decay; FTC nagging (section 8) | **Not built** | No reminders exist. |
| D50 | Marketing as a separate, default-off opt-in; per-category toggles | Apple; ICO (section 8, section 9) | **Partial** | `lucid_profiles.marketing_opt_in` defaults to false and is forced false for under-18s by the database (`supabase/migrations/001_lucid_core.sql`; `tests/db/schema.test.mjs` "age gate, minors and RLS on profiles"). There is no marketing channel, no opt-in UI and no per-category toggles. |

### J. Learners aged 16 and 17

| # | Decision | Research reason | Lucid status | Evidence |
|---|---|---|---|---|
| D51 | A neutral birth-year question with nothing preselected; self-declaration; no hard ID | ICO nudges and age assurance (section 9) | **Built and tested** | A birth-year `<select>` with an empty "Choose" option (`onboarding.js`); under-16s are refused. Tests: e2e "1" (a 14-year-old is refused) and the database age gate in `tests/db/schema.test.mjs` "age gate, minors and RLS on profiles". The database test ran in PGlite with a stub of Supabase's auth schema, not against a Supabase project. |
| D52 | One high-privacy baseline for everyone; a DPIA for adaptive profiling | ICO standards; DSA (section 9) | **Partial** | No geolocation, public profile or social features (code search). The CSP allows scripts only from `'self'` (asserted in e2e "16"). Progress stays on the device unless the learner signs in. No DPIA exists in `docs/`. |
| D53 | Extra under-18 defaults: rhythm, reminders and marketing off; break suggestion after 45 min; AI explanations for 16 and 17; age-filtered roleplay | ICO 16-17 guidance; DSA chatbot safeguards (section 9) | **Partial** | Marketing is forced off (database). Onboarding and Profile show an under-18 notice. Reminders do not exist. The weekly goal is still on by default. There is no break suggestion, no age-specific AI explanation and no age filtering of scenarios. The roleplay prompt asks the model to keep every conversation appropriate for a 16-year-old, for all learners (`prompts.ts`). |
| D54 | Explain AI and data in 2 or 3 Hebrew sentences at first use of the writing lab, tutor and roleplay | ICO transparency (section 9) | **Partial** | The onboarding privacy step and Settings say that texts sent for AI feedback go to Anthropic only to produce feedback. Not built: an explanation at first use, covering what is stored, for how long and how to delete it. The AI screens show only "AI feedback can be wrong". |

---

## 5. "What not to build": confirmation

Each item from the "What not to build" list in `D-ux.md` was searched for in `js/`, `css/`, `index.html` and the content files. Absence is confirmed by code search only: no automated test guards any of these.

| # | Must not exist | Present? | Evidence |
|---|---|---|---|
| 1 | Daily streaks with loss-framed copy; paid streak repair; streak wagers | Absent | "streak" appears only in copy that says there is none (`onboarding.js`, `welcome.js`). |
| 2 | Virtual currency, lives or hearts that block learning, loot boxes | Absent | No such terms in `js/`. Mistakes never block progress: "I don't know" is available on graded items in lessons, drills, level checks and placement ("I don't remember" in review), and failed lessons offer "Practise again". The single-exercise player of the reading, listening and speaking centres has no "I don't know"; it can be left with Exit. |
| 3 | Public leaderboards or leagues | Absent | No social or ranking code. |
| 4 | XP or points for time spent | Absent | No points. Progress does show "Active minutes" and an exercise count as information (`progress.js`), not as rewards. |
| 5 | Fake urgency or scarcity | Absent | No countdowns, stock, live counters or discounts. No pricing exists. |
| 6 | Retention mazes, phone-only cancellation, hidden auto-renewal | Absent (not applicable) | No subscription exists. Data deletion takes two activations from Settings: the delete button, then confirm (`settings.js`). |
| 7 | Confirmshaming, nagging prompts, pre-checked boxes | Absent | Consent boxes start unchecked, and no permission prompts exist. The visual weights of the two dialog buttons differ (see D43). |
| 8 | Autoplaying audio or video, carousels, parallax, scroll-jacking, auto-chained lessons | **Partly present** | No video, carousel or parallax. The review screen offers "Next lesson" and never starts it automatically. However, AI roleplay speaks the partner's lines without a tap (`scenario.js`). The welcome keyboard animates once, for about 2.5 s, on load, unless the OS asks for reduced motion. |
| 9 | Default timers on exercises, placement or writing | Absent | The only timer is the opt-in essay timer, labelled "(optional)" (`essay.js`). |
| 10 | Drag-only exercises | Absent | No drag handlers in `js/`. Every interaction is a tap or click. |
| 11 | Blocked paste, split code boxes, puzzle CAPTCHAs, complexity rules that force memorisation | Absent | No paste handlers, no code fields, no CAPTCHA. The only password rule is a minimum of 8 characters (`account.js`). |
| 12 | Notification permission on first launch; several reminders a day; guilt notifications; marketing through reminders | Absent | No notifications of any kind. |
| 13 | Mirrored media controls, mirrored English content or tiles, reversed digits, physical left/right CSS | Absent, with one related defect | English zones are `dir="ltr"`, there is no media scrubber, and the CSS has no physical left or right. The related defect runs the other way: the forward chevrons are not mirrored in Hebrew (see D30). |
| 14 | An app-specific dark mode that ignores the OS; dark made by inversion | Absent | The default follows the OS. The dark tokens are defined separately. |
| 15 | A "dyslexia font" as default or promise; an "ADHD mode" | Absent | Rubik is the only font. No such modes. |
| 16 | Celebrations that block input or sit between exercises | Absent | No celebration animations exist. |
| 17 | Unsourced efficacy claims | Absent | No "N× more effective" style claims. Two lines overstate precision (see section 7, P2-9). |
| 18 | Copying a competitor's identity, mascot or mechanics | Absent, as far as code shows | No mascot, no competitor names in the UI code, and the visual identity was chosen by the surface brief. |

---

## 6. Accessibility

### 6.1 What the automated audit covers

`tests/e2e/a11y.mjs` serves the app and runs axe-core 4.14.0 in Chromium.

**Rule set.** It runs only rules tagged `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`. Run this way, axe also executes its `target-size` rule (24px), which is off by default; this was checked separately for this document.

**Seeded learner.** A learner is created directly in the store: adult (born 2000), Pre-A1 starting point, 35 minutes a day. It is not created through onboarding.

**Configurations.** All run with reduced motion emulated.

| Interface | Theme | Viewport |
|---|---|---|
| Hebrew (RTL) | Light | 390 × 900 |
| Hebrew (RTL) | Dark | 1440 × 900 |
| English (LTR) | Light | 1440 × 900 |

**Route entries (22).** `welcome`, `help`, `today`, `path`, `practice`, `vocab`, `grammar`, `reading`, `listening`, `speaking`, `writing`, `writing/free`, `tutor`, `real-life`, `expressions`, `conversations`, `progress`, `profile`, `settings`, `account`, `lesson/pa1-05` (explanation stage only), and `review` (empty state, because the seeded learner has no cards).

The `welcome` entry does not audit the welcome screen. The learner already exists when the audit visits it, so the router redirects to Today. The audit therefore covers 21 distinct screens, and Today twice.

**Result on 2026-10-30.** 0 violations.

**Related automated checks.**

- e2e "14-15" asserts no horizontal overflow on 24 routes at 320, 390, 768 and 1440 px.
- `tests/unit/i18n.test.mjs` checks Latin isolation in Hebrew strings.

### 6.2 What the automated audit does not cover

The audit cannot see the following:

- **Routes and states never audited:**
  - `welcome` (see 6.1);
  - `start` (onboarding);
  - `placement`;
  - `checkpoint/:level`;
  - `drill`;
  - `path/:level`;
  - `scenario/:id` and its four tabs;
  - other `writing/:id` tasks;
  - the lesson intro, practice and review stages;
  - every exercise type;
  - every feedback (verdict) state;
  - review with cards;
  - vocabulary with words;
  - dialogs and toasts.
- **States only reachable with a server:** the tutor chat, AI essay feedback, the roleplay chat, and signed-in Settings.
- **Settings combinations never audited:**
  - Hebrew support "minimal" or "off", so the "עב" reveal button is never rendered;
  - text sizes of 115 to 150%;
  - English dark;
  - Hebrew dark on a phone;
  - coarse pointer;
  - an under-18 learner.
- **Things axe does not judge:**
  - whether focus order is logical;
  - whether a focus indicator is visible enough (see the `.gap-input` finding);
  - whether live regions are announced;
  - whether `lang` is correct on each phrase (3.1.2);
  - non-text contrast (1.4.11);
  - whether instructions make sense when read aloud.

### 6.3 Computed contrast from the tokens

These ratios were computed from the OKLCH tokens; they are not measured on rendered pages.

| Pair | Light | Dark |
|---|---|---|
| `--ink` on ground | 17.2:1 | 16.7:1 |
| `--ink-2` on ground (light) / on key (dark) | 7.0:1 | 8.9:1 |
| `--ink-3` on ground | 5.4:1 (5.0:1 on `--key-sunk`) | 7.2:1 |
| Hebrew legend on key | 7.0:1 (6.5:1 on ground) | 7.7:1 |
| `--enter-ink` on `--enter` | 7.1:1 | 7.1:1 |
| Focus colour against ground | 4.7:1 | 8.5:1 |
| Input border (`--key-edge`) against ground / key | about 1.2 to 1.3:1 | about 1.2 to 1.4:1 |
| Hollow status mark border (`--n5`) on key | 2.6:1 | not computed |
| `.gap-input` focused background against unfocused | about 1.15:1 (approximate) | about 1.2:1 (approximate) |

### 6.4 Manual testing still required (not done)

No testing with real assistive-technology users has been done. No screen-reader, voice-control, switch or magnifier session has taken place, and no participant with ADHD or dyslexia has tested Lucid (D28). The following are open and cannot be settled by axe.

**1. Screen readers in Hebrew and English.**

- **Setups.** NVDA with Firefox and Chrome on Windows, using a Hebrew voice. JAWS. VoiceOver on macOS Safari and iOS Safari. TalkBack on Android Chrome.
- **What to check:**
  - The reader switches between the Hebrew and English voices on `lang="en"` phrases, legends and `<bdi>` isolates.
  - Dual legends are read in a sensible order.
  - The "עב" reveal button is understood. Its accessible name is "הצגת הסבר בעברית" in the Hebrew interface and "Show Hebrew" in the English one.
  - The lesson verdict is announced after Check. It is a `role="status"` element inserted with its text while focus moves to Continue.
  - Progress bars and the "n / N" counter make sense.
  - The level rail and status marks (`role="img"`) are understandable.
  - The tutor chat log (`aria-live="polite"`) does not over-announce.
  - The native `<dialog>` confirmation keeps focus.
  - AI text with only `dir="auto"` is read in the right voice.

**2. Voice control.** Voice Control on macOS and iOS, Voice Access on Android, and Dragon:

- Every control can be activated by its visible label. Icon-only buttons use labels such as "Leave lesson" and "Play".
- The option number badges in exercises and review are hidden from assistive technology (`aria-hidden`). Those on scenario practice options are not.
- Saying "1" or "Check" works.
- The microphone in speaking exercises does not conflict with the voice-control microphone.

**3. Keyboard-only and switch users.** A full lesson of every exercise type, by keyboard and by switch. Order and categorize redraw on every tap, so focus behaviour there needs checking (section 7, P1-1).

**4. Magnification and zoom.** 200% browser zoom and 400% reflow, with the sticky lesson footer and the phone top bar.

**5. Hebrew readers on RTL questions.** The progress chart direction (D34), the counter order (D32) and the size of the Hebrew legend (D33).

---

## 7. Open UX issues and recommendations

Priorities:

- **P0:** must be fixed or verified before Lucid is offered to learners.
- **P1:** should be fixed before a public beta.
- **P2:** polish, or decisions that need user evidence first.

### P0

**P0-1. No assistive-technology testing has been done.**

- **Issue.** No screen-reader, voice-control or switch user has tried Lucid in Hebrew or English (section 6.4).
- **Recommendation.** Run sessions that meet the D28 quota: at least one screen-reader user, one participant with ADHD and one with dyslexia per round. Fix what they find before release.

**P0-2. Answer feedback may not be announced.**

- **Issue.** The verdict is inserted as a new `<div role="status">` that already contains its text, and focus moves to "Continue" in the same step. This happens in `lesson.js` `doCheck`, `player.js` `check`, `review.js` `grade` and `center.js`. Some screen-reader and browser pairs do not announce live regions created with their content.
- **Recommendation.** Keep one empty, persistent `role="status"` element in the player footer and write the verdict into it. Then test with screen-reader users whether focus should move to Continue.

**P0-3. The axe audit never sees an exercise.**

- **Issue.** `a11y.mjs` covers 22 route entries (21 screens, because its `welcome` entry renders Today), but not the welcome screen, and no exercise, verdict, onboarding step, placement item, scenario tab or dialog (section 6.2).
- **Recommendation.** Extend the audit to walk a lesson through every exercise type and its correct, almost and wrong states, plus `welcome` (before a learner exists), `start`, `placement`, `checkpoint`, `drill` and `scenario/:id`. Run it at Hebrew support "minimal" and "off", and in English dark.

**P0-4. Gap-input focus is nearly invisible.**

- **Issue.** `.gap-input:focus` removes the outline and only shifts the background, by about 1.15:1 computed. Gap-fill is the fourth most common exercise type (87 items in 53 lesson files at 23:03 UTC), and the placement view supports gap items, although the current placement bank has none. This is a likely failure of 2.4.7 Focus Visible.
- **Recommendation.** Restore a 2px outline at 3:1 or better (D13).

**P0-5. The UI promises content the build does not have.**

- **Issue.** At 23:03 UTC, 22 of the 75 curriculum lessons had no file, and the writing exercises and assignments files were missing (`npm run validate` warnings; e2e check 13 failed). The writing files were added at 23:10 UTC (see Snapshot). Yet the welcome screen says "75 lessons from zero to C2", and the Today screen has a "You have completed all 75 lessons" message. PRODUCT.md lists "75 lessons Pre-A1 to C2" among Lucid's capabilities, so this copy describes the plan, not the build at that time.
- **Research context.** Reviewers complain about level cliffs and about lessons that assume words they were never taught (source: 03-user-review-analysis.md, section 5).
- **Recommendation.** Either finish the content before release, or derive counts from `content/manifest.json` and label unavailable lessons and stages plainly.

### P1

**P1-1. Order and categorize drop keyboard focus.**

- **Issue.** Both redraw the whole exercise after every tap (`exercise.js`, `draw()`), so the focused tile disappears.
- **Recommendation.** Update the DOM in place or move focus to the next logical tile. Add arrow keys and a keyboard-only E2E test per type (D15).

**P1-2. Speech recognition decides correctness in lesson speaking items.**

- **Issue.** In `speak` exercises, a word accuracy of 0.8 or more counts as correct and lower scores count as wrong (`exercise.js`). In lessons a wrong answer queues a retry and lowers the lesson score (`lesson.js`), and the Speaking lab's shadowing player records the same verdict (`center.js`). The item does show what was recognised, but recognition still decides pass or fail. This contradicts the decision "Recognition never produces a pass/fail on its own" (source: 03-user-review-analysis.md, section 9). Users punish unreliable speech scoring: it is Rosetta Stone's largest coded complaint, 21 of 70 sampled reviews (source: 03-user-review-analysis.md, section 5).
- **Recommendation.** Keep showing what was heard, and let the learner self-rate, as the item already does when recognition is unavailable. Alternatively, make the item ungraded. The Speaking lab's minimal-pair check already reports what was heard without recording a scored attempt.

**P1-3. The placement test cannot be paused, resumed or retaken.**

- **Issue.** Its state lives in memory (`placement.js`). Exit lands on Today, and no link leads back to `#/placement`.
- **Recommendation.** Save progress per item, as the lesson does, and add "Take the placement test again" on Path or Settings (D17; D5 asks for a test that "can pause").

**P1-4. Profile is unreachable.**

- **Recommendation.** Link it from the rail foot (the learner's name is already shown there), from the phone top bar, and from Settings.

**P1-5. Two primary keys on the lesson intro.**

- **Issue.** When a saved place exists, both "Continue where I left off" and "Let's learn" are Enter keys (D1).
- **Recommendation.** Make Continue the only primary in that state.

**P1-6. Desktop navigation load.**

- **Issue.** The rail lists 14 links (D1, D3).
- **Recommendation.** Fold the seven labs under Practice, as the phone tab bar already does, or add the Simplified view of D3.

**P1-7. The weekly goal is on by default for everyone, including under-18s.**

- **Issue.** Onboarding asks for it with 5 days preselected, and Today always shows it. D40 and D53 ask for an opt-in rhythm, never pre-suggested to under-18s.
- **Recommendation.** Make it optional, off by default, and offer it after the first week.

**P1-8. Language of parts in AI output and interpolated titles.**

- **Issue.** Tutor replies, AI essay feedback and the roleplay report use `dir="auto"` without `lang`. The Today start button inserts an English title into Hebrew text without `lang` or isolation. Screen readers will likely use the Hebrew voice for English (D21, D32).
- **Recommendation.** Mark the language per paragraph. The tutor can answer in Hebrew in beginner mode, so ask the model to return language-tagged segments, or detect the script per paragraph.

**P1-9. Help is not consistent.**

- **Issue.** The review, drill, checkpoint, placement, single-exercise players and onboarding have no Help control, and no human contact route exists anywhere (D18).
- **Recommendation.** Add Help at the same top-bar position in every player and a contact route in Help.

**P1-10. Non-text contrast.**

- **Issue.** Input borders compute to about 1.2 to 1.3:1, and the hollow "not started" mark to 2.6:1, against 1.4.11's 3:1. Text inputs are identified mainly by their border.
- **Recommendation.** Raise `--key-edge` for inputs, or add a bottom rule at 3:1 or better. Verify with a manual 1.4.11 review (D12).

**P1-11. Weak focus style on other inputs.**

- **Issue.** `.input:focus` replaces the outline with a 1px border and a 25%-opacity ring. That is below D13's 2px at 3:1.
- **Recommendation.** Use the global `:focus-visible` outline for inputs too.

**P1-12. Onboarding is longer than D5 allows.**

- **Issue.** A complete beginner reaches the first exercise on the 8th screen.
- **Research context.** Headspace rebuilt its onboarding after a 38% drop-off and moved the first meditation out of it (source: D-ux.md, section 1). In the new British Council English app, 19 of 30 sampled reviews are about being unable to sign up or log in (source: 03-user-review-analysis.md, section 5).
- **Recommendation.**
  - Keep language, birth year and starting point.
  - Move name, daily time and weekly goal to after the first lesson.
  - Ask AI consent at first AI use (D54).
  - Start the first exercise directly, without the lesson intro, for a zero start.

**P1-13. Compliance documents are missing before accounts or AI go live.**

- **Issue.** There is no accessibility statement (D23), no DPIA for adaptive profiling (D52) and no first-use AI and data explanation (D54).
- **Recommendation.** Write these before configuring Supabase or the AI function.

**P1-14. Under-18 defaults are incomplete (D53).**

- **Issue.** There is no break suggestion with Pause and Save, no AI explanation written for 16- and 17-year-olds, and no age filter for roleplay scenarios.

**P1-15. No CI runs Lucid's tests.**

- **Issue.** `pages.yml` deploys only.
- **Recommendation.** Add a job that runs the unit, database, content-validation, e2e and accessibility suites, plus the Deno edge-function tests, so the statuses in this document stay true.

**P1-16. AI roleplay is untested even with mocks.**

- **Issue.** The mock handlers exist in `run.mjs`, but no check opens the roleplay tab.
- **Recommendation.** Add a check that runs one roleplay to its feedback report.

### P2

**P2-1. RTL details.**

- **Issue.** The forward chevrons on the Today resume card and the Practice "Recommended now" rows point right in Hebrew (D30). The step counters disagree: "4 / 12" in lessons reads with 4 on the right, while "4/12" in drills and reviews reads with 4 on the left (D32). The progress chart mirrors and has no text summary (D34).
- **Recommendation.** Mirror the chevrons, choose one counter convention, add the chart summary, and test the chart's direction with at least 5 Hebrew readers, as D34 asks.

**P2-2. The tutor input lacks `dirname` (D31).**

**P2-3. Reading and motion settings.**

- **Issue.** Settings lacks line spacing, line length, tint and text sizes up to 200% (D27), and an in-app "Reduce motion" toggle (D38). Several transitions run 300 to 500 ms (D37).

**P2-4. Roleplay audio plays without a tap.**

- **Recommendation.** Add a "Read replies aloud" setting and leave it to D37 whether it defaults on.

**P2-5. The welcome keyboard in dark mode.**

- **Issue.** It keeps light caps with Hebrew legends at about 2.0:1, while the brief says dark caps.
- **Recommendation.** Make the caps theme-aware.

**P2-6. No high-contrast theme and no `forced-colors` rules (D35).**

**P2-7. Dialog hierarchy.**

- **Issue.** `confirmDialog` styles Cancel as ghost and Confirm as primary.
- **Recommendation.** For non-destructive yes/no choices, use equal style tiers (D43).

**P2-8. The step total grows after mistakes.**

- **Issue.** Retries are appended, so "n / N" grows.
- **Recommendation.** Show the retries separately, for example "12 + 2 to revisit".

**P2-9. Two lines of copy overstate precision.**

- **Issue.** "They'll come back just before you'd forget them" (`lesson.js`; similar wording in `help.js` and `vocab.js`) overstates what a scheduler with a retention target of 0.85 to 0.95 can promise (`js/core/srs.js` `RETENTION`).
- **Recommendation.** Use plainer copy, such as "around the time you would start to forget".

**P2-10. Small targets.**

- **Issue.** The "עב" button is about 21.5px tall on fine pointers. The inline play buttons in scenarios are fixed at 1.8rem even on touch screens (D14).

**P2-11. Keyboard copy and handling disagree.**

- **Issue.** Help says "1-4", but the code accepts 1 to 6. Scenario practice options show number badges but have no key handler.

**P2-12. The Hebrew legend size needs evidence.**

- **Issue.** It is 0.82em in cobalt, while Apple's guidance is to increase Hebrew by about 2 pt next to all-caps Latin (D33). At Pre-A1 the Hebrew carries the meaning.
- **Recommendation.** Test legibility with beginners before fixing the size.

**P2-13. Mismatched comment in `i18n.js`.**

- **Issue.** The `SUPPORT_BY_LEVEL` comment does not match the map. The map and the Settings text agree with each other.

**P2-14. Passkeys or email-link sign-in (D19).** The current password form allows paste and password managers.

**P2-15. `DESIGN.md` does not exist**, though the surface brief's FINISH line requires it.
