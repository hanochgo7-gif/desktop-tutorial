# Persona review, round 1: young professional and family traveller (simulated)

**This is a simulated persona review, not research with real people.** An AI played two invented personas and
drove the app with Playwright. Their "reactions" are informed judgement about what such a learner would probably
experience. They are not user data and must not be quoted as such. Every finding below is backed by a screen I
observed (screenshot path) or by the code that produces it.

- **Date:** 2026-10-30
- **Reviewer key:** `professional-traveler`
- **Personas:**
  1. **Yael, 25.** Junior product manager at a tech company, around B1-B2. She needs English for work: emails,
     meetings and small talk with foreign colleagues. She has 15-20 minutes a day on her phone during her
     commute.
  2. **Moshe, 35.** Planning a family trip to London and New York, around A2. He wants travel situations
     (airport, hotel, restaurant, transport, emergencies) and wants to understand casual expressions and slang
     without embarrassing himself. He will use his phone abroad, possibly offline.
- **Build:** working tree at commit `5e1e677`, served statically at `http://127.0.0.1:8799/`. The content team was
  adding lesson files during the run (for example, `c1-01` and `b2-08` appeared partway through). Missing lessons
  and writing exercises are known and are not reported. Only the way the app handles them is.
- **Method:** Playwright (Chromium, Playwright 1.63) with locale `he-IL` and reduced motion. I opened and inspected
  every screenshot cited here.
  - Sizes: phone 390x844 (touch) for both first sessions and return visits. Desktop 1440x900 for Today, Path,
    lesson explanation, Real life, scenario practice, expressions, writing, progress and conversations. Moshe also
    used text size 130%.
  - Placement answers were simulated from each persona's true level. Yael was right on everything through B1,
    3 of 4 right at B2, and wrong or "I don't know" at C1. Moshe was right at A1 (one listening slip), about 50%
    at A2, and "I don't know" above that.
  - Lessons were answered with deliberate right and wrong answers, using the lesson JSON to pick them.
  - Return visits restored each persona's saved device data and moved the clock forward (Yael +1 day, Moshe
    +2 days).
  - Accounts and AI (tutor, writing feedback, roleplay) used the mocked Supabase and `lucid-ai` from
    `tests/e2e/run.mjs`. AI answers are canned, so I judged only the flow, the presentation and the honesty of
    the UI.
  - Offline: production registers `sw.js` only on https, so I registered it by hand on the local server. Then I
    visited the screens Moshe would open before his trip, switched the browser context offline and reloaded.
- **Routes visited:** `#/welcome`, `#/start`, `#/placement`, `#/today`, `#/path`, `#/path/B2`, `#/lesson/c1-01`,
  `#/lesson/b2-08`, `#/lesson/b2-01`, `#/lesson/b2-05`, `#/lesson/a2-01`, `#/review`, `#/practice`,
  `#/real-life`, `#/real-life?m=emergency`, `#/scenario/rl-social-party-small-talk`,
  `#/scenario/rl-airport-checkin-overweight`, `#/scenario/rl-emergency-lost-passport`,
  `#/scenario/rl-hotel-checkin-basics`, `#/scenario/rl-transport-metro-ticket`,
  `#/scenario/rl-emergency-pharmacy-symptoms` (offline), `#/expressions`, `#/conversations`, `#/writing`,
  `#/writing/free`, `#/tutor`, `#/tutor?mode=travel`, `#/progress`, `#/settings`, `#/account?mode=signup`.
- **Screenshots and scripts:** `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/personas/professional-traveler/`
  (screens in `shots/`, scripts `yael1-4.mjs`, `moshe1-3.mjs`, `lib.mjs`). Screenshot paths below are relative
  to `shots/`. These are session scratch files and are not committed.

Severity scale: **blocker** (the persona cannot reach their goal or loses work), **major** (a serious obstacle or
an honesty problem), **minor** (friction with a workaround), **polish**.

---

## Yael (B1-B2, workplace English, phone commute)

**Her first session:** Welcome, onboarding (goals: work and conversation; 20 minutes; start "fairly comfortable"),
a 12-question placement, then Today. Today offered a C1 academic lesson, so she moved herself down to B2 on the
Path and did B2 lesson 1 with 2 wrong answers out of 16. Then she tried party small talk in Real life, the
expression "I'm swamped" and a free-writing email. **Her return visit (next morning):** Today, a spaced review
with right and wrong answers, then sign-up, AI consent, the tutor, AI writing feedback and an AI roleplay (all
mocked).

### Y1. Blocker: after "Start from B2", completed lessons are never recorded
- **Where:** `#/path/B2` → "Start from B2" → `#/lesson/b2-01` → `#/today`, `#/progress`, `#/path`. Seen at 390
  and 1440.
- **Observed:** Yael finished B2 lesson 1 ("Lesson complete, 80% on the first try", `y-39-lesson-review.png`).
  On her return visit, Today still offered the same lesson as her next one (`y-70-return-today.png`,
  `y-d-today.png`). Progress showed "Lessons completed: 0" (`y-65-progress.png`), and the Path did not mark the
  lesson as done.
- **Cause (code):** `moveToLevel()` in `js/core/learner.js` removes the "placed out" records at and above the
  chosen level with `store.remove()`. That is a soft delete, so it leaves a record with `_deleted: true`.
  `startLesson()` and `finishLesson()` then spread that record (`{ ...cur, ... }`), which keeps `_deleted: true`,
  and `store.all()` hides it. I confirmed this in the browser: after the move, opening `b2-01` stored
  `{status: "started", _deleted: true}`, and it stayed that way after a reload.
- **Why it matters:** Yael was over-placed (see Y2), so moving down a level is exactly what she should do. After
  that, every lesson she finishes at B2 disappears. Her plan loops, and her progress, the honest record Lucid
  promises, says she has done nothing.
- **Recommendation:** In `startLesson()`, `finishLesson()` and any other progress write, drop `_deleted` from the
  previous record, or have `moveToLevel()` purge the placed-out rows instead of tombstoning them. Add an e2e
  check: place out, move down a level, complete a lesson, reload, and assert Today and Progress.

### Y2. Major: the placement over-places on very little evidence and starts her on the academic track
- **Where:** `#/placement?start=comfortable` → result → `#/today`, at 390.
- **Observed:** Placement ended after 12 questions: 4 at B1, 4 at B2 and 4 at C1, so 3 per skill. Getting 3 of 4
  right at B2 counted as passing B2, so the result read "You showed control up to B2. We'll start at C1"
  (`y-12-placement-result.png`). Today's first lesson was "Academic vocabulary and nominalisation" (C1), and
  every lesson from Pre-A1 to B2 was marked as placed out (`y-21-today-phone-full.png`,
  `y-22-path-phone.png`).
- **Why it matters:** One question decided between B2 and C1. "Start one level above what you showed" then sent
  a workplace learner straight to academic argument. She has to find "Start from B2" on the Path herself, and
  that triggers Y1.
- **Recommendation:** Ask a second block before passing a level on exactly 75% (3 of 4), or require at least
  6 items per level. When the result sits on a boundary, start at the demonstrated level, not the one above.
  On the result screen, offer "Start at B2 instead" next to the recommendation. Also weigh goals: for "work" or
  "travel", the C1-C2 academic lessons should not be the default first step.

### Y3. Major: speaking and writing get levels without any evidence
- **Where:** `#/today` (Level by skill), `#/progress`, at 390 and 1440.
- **Observed:** Today showed Speaking B2 and Writing B2 (`y-21-today-phone-full.png`). Progress lists the
  sources as "Speaking: placement test (0)" and "Writing: placement test (0)" (`y-65-progress.png`). The
  placement result screen itself listed only four skills (`y-12-placement-result.png`). The same happens for
  Moshe (Speaking A1, Writing A1).
- **Cause (code):** `skillLevels()` in `js/core/adaptive.js` falls back to `placement.level` for every skill,
  including the two that the placement never tests.
- **Why it matters:** The product promises that "each skill gets a level only once there is evidence for it",
  and Today's own footnote says "—" means not enough evidence. A B2 writing level with zero texts written is not
  honest, and Yael might skip writing practice because of it.
- **Recommendation:** Use the overall placement level only for the skills the test covers. Show "—" for speaking
  and writing until a speaking or writing task has been assessed.

### Y4. Major: Today scrolls sideways on a phone when the next lesson has a long title
- **Where:** `#/today` at 390. It also happens at 130% text size with short titles (Moshe).
- **Observed:** The page is 487px wide with "Academic vocabulary and nominalisation" and 460px wide with
  "Narrative tenses and the past perfect". The orange Start button does not wrap, so the greeting, the plan and
  the level rail are cut off at the right edge, with an empty band on the left (`y-20-today-phone.png`,
  `y-34-today-after-move.png`). At 130% text size, Moshe's Today is 402px wide and "about 24 min" is clipped
  (`m-69-today-130.png`). The e2e overflow test only covers a Pre-A1 learner, whose lesson titles are short.
- **Why it matters:** Today is the first screen of every commute session. On an intermediate learner's phone it
  opens shifted and cut off.
- **Recommendation:** Let `.start-bar .key` wrap (`white-space: normal; min-width: 0`), or show just
  "Start: Lesson" and keep the title in the card below. Add the B1-C1 learner states and text size 130-150% to
  the 390px overflow test.

### Y5. Major: the Welcome page scrolls sideways at 390 and its Start button is cut off (also affects Moshe)
- **Where:** `#/welcome` at 390 (fine at 1440).
- **Observed:** The document is 513px wide. The keyboard illustration has a fixed-width row of 10 keys. In the
  first viewport, the headline, the language switch and the "Let's start" button are cut off, and only the
  button's arrow shows (`y-00-welcome.png`; full layout in `w-welcome-390-full.png`).
- **Why it matters:** This is the very first screen on a phone, and the main action is half hidden.
- **Recommendation:** Size the keys with `min(2.6rem, 8.5vw)`, or scale or hide the keyboard below 30rem. Add
  `welcome` (with no profile) to the overflow test.

### Y6. Major: the "Work" goal is offered, but nothing in the app responds to it
- **Where:** `#/start` step 2 ("Choose any. This shapes examples and recommendations"), then `#/today`,
  `#/real-life`, `#/writing/free`. Seen at 390.
- **Observed:** The goals are stored but used only by the AI tutor (`js/views/tutor.js` sends them) and the
  profile. Today's plan was a grammar lesson plus a 4-minute "Speaking" block that opens the general Real-life
  list (`y-34-today-after-move.png`). Real life has travel and social scenarios but no meetings, calls or email
  situations; the closest was "Small talk at a party" (`y-52-reallife-social.png`). In Free writing, a work
  email was checked for "thesis, evidence, counterargument, rebuttal, conclusion", all unticked, and got a
  missing-punctuation warning because it ends with her signature (`y-63b-free-writing-check-full.png`). A
  search for "email" in Expressions found nothing. Some useful work expressions do exist, such as "I'm swamped",
  "Heads up" and "Ballpark".
- **Why it matters:** Yael picked Lucid for work English, and the onboarding promised her choice would shape the
  app. After session one she has seen past-perfect stories and a party.
- **Recommendation:** Either add a small workplace module (stand-up and meetings, polite pushback, phone and
  video calls, short emails and Slack-style messages, small talk with colleagues) and let a "work" goal put one
  item from it into Today, or change the onboarding copy so it does not promise tailoring the app cannot
  deliver. In Free writing, add a "kind of text" choice (message, email, opinion, essay) and show the
  argument-structure checklist only for argumentative texts.

### Y7. Minor: English text is right-aligned inside Hebrew screens, and English tables run right to left
- **Where:** Lesson explanation, key points, multiple-choice questions and options, the feedback footer and
  expression usage notes. Seen at 390 and 1440.
- **Observed:** English paragraphs are right-aligned with a ragged left edge. The check icons on "Key points" sit
  on their own line above each point (`y-36-lesson-learn.png`, `y-39-lesson-review.png`,
  `y-d-lesson-learn.png`). English tables are in right-to-left column order, so "Relationship" comes first on
  the right and the example column is cut off at 390 (`y-36-lesson-learn.png`, `y-d-lesson-learn.png`). Gap
  exercises and reading texts are left-aligned, so screens are inconsistent.
- **Cause (code):** `bi()` renders English as an inline `span dir="ltr"` inside right-to-left blocks, so the
  paragraph keeps right alignment.
- **Recommendation:** When English is a block of its own (rules, key points, questions, usage), render it as a
  block element with `dir="ltr"` and `text-align: left`. Set `dir="ltr"` on tables whose headers are English.

### Y8. Minor: the feedback footer is cramped on phones, and the categorize answer key covers the exercise
- **Where:** `#/lesson/b2-01` practice, at 390.
- **Observed:** The verdict text sits in a column about 180px wide beside the Continue button, so the
  explanations become very tall (`y-38-ex4-wrong.png`). After a wrong categorize answer, the whole answer key
  appears as one bold paragraph that fills the screen and hides her placements (`y-38-ex1-wrong.png`).
- **Recommendation:** Below about 30rem, stack the verdict above a full-width Continue button. For categorize,
  mark misplaced items in place (red/green borders already exist) and list only the wrong ones.

### Y9. Minor: the free-reply check in scenarios is keyword matching but reads like a judgement
- **Where:** `#/scenario/rl-social-party-small-talk`, Practise tab, "Now in your own words", at 390.
- **Observed:** Yael wrote a natural reply for her real context: "Hi, I work with Dana on the product team. How do
  you know her?" She got "Try using words like: uni, university, course, what about you…"
  (`y-57-party-own.png`).
- **Why it matters:** A good answer is treated as off target. That pushes her back to the script and undermines
  trust in the feedback.
- **Recommendation:** Say what the check is ("We only look for a few key words"). When no key words match, show
  "Compare your reply with these examples" without implying an error. Count follow-up questions such as
  "How do you know…?" as a hit for that turn.

### Y10. Minor: unwritten lessons are hard to spot, and opening one shows a misleading message
- **Where:** `#/path/B2`, `#/lesson/b2-08`, at 390. ("Formal or informal?" was unwritten at the time of the
  screenshot and was added during the run.)
- **Observed:** The only sign that a lesson is not written yet is a dashed card border. The "placed out" status
  mark is also dashed, and there is no text or screen-reader label (`y-31-path-B2.png`). Opening an unwritten
  lesson says "This lesson is not available on this device yet. Try reloading, or go back to your path"
  (`y-32-lesson-b2-08-unwritten.png`), which sounds like a download or sync fault. `nextLesson()` in
  `js/core/adaptive.js` does not check the manifest, so Today's Start button can point to an unwritten lesson.
- **Recommendation:** Add an "In preparation" tag with screen-reader text. Use an honest message ("This lesson is
  still being written; here is the next available one") with a link to it. Have the daily plan skip lessons
  that are not in the manifest.

### Y11. Minor: the "Exercises by day" chart never draws its bars
- **Where:** `#/progress`, at 390.
- **Observed:** Friday had 19 exercises. Its bar has `style="height:100%"` but renders 2px tall, so every bar is a
  flat line (`y-65-progress.png`; measured in `yael4.mjs`).
- **Recommendation:** Give the bar column a definite height (for example `height: 100%` on a flex column with
  `justify-content: flex-end`), or set the bar heights in rem.

### Y12. Minor: free-writing check results appear off-screen on a phone
- **Where:** `#/writing/free`, at 390.
- **Observed:** After tapping "Automatic check", nothing visibly changes. The results panel is below the fold
  (`y-63-free-writing-check.png` and `y-63b-free-writing-check-full.png`).
- **Recommendation:** Scroll the results into view and focus them, or announce "3 checks, 1 to look at" next to
  the button.

### Y13. Polish
- Path titles are aligned inconsistently. Single-line English titles sit on the right and wrapped ones on the
  left (`y-31-path-B2.png`).
- Hebrew placeholders in English text fields put the ellipsis on the wrong side ("...כתבו הודעה")
  (`y-84-tutor-reply.png`).
- The "Path updated" toast stayed on screen into the next lesson's exercises (`y-37-ex0-before-check.png`).

### What works well for Yael
- The B2 lesson content is adult and realistic: missed trains, job interviews, flight delays. Feedback explains
  why the answer is right, not only that it is right, and the reading text is left-aligned and comfortable
  (`y-38-ex5-right.png`, `y-38-ex9-right.png`).
- "I'm swamped" is exactly what she needs: usage at work, an example exchange, common Hebrew-speaker mistakes
  ("I'm in pressure") and "When NOT to use it" with a better phrasing for a senior colleague
  (`y-61-expr-swamped.png`).
- Spaced review offers "I meant that – it's correct" after a near miss, which is fair to an adult
  (`y-72-review-1.png`).
- The AI states are honest. With no AI there is no fake tutor, and the app says plainly what is needed (sign-in
  or consent). Consent is explicit, and "AI feedback can be wrong" is shown (`y-64-tutor-noai.png`,
  `y-82-tutor-consent-off.png`). The tutor request carries her goals and level (`yael4.mjs` output).
- The writing feedback ladder (find and fix it yourself first, then reveal the correction) fits a professional
  who wants to improve, not to be rewritten (`y-85b-writing-ai-full.png`).
- The desktop Today is calm and readable, with clear reasons for each plan item (`y-d-today.png`).

---

## Moshe (A2, family trip to London and New York, phone, possibly offline)

**His first session:** Onboarding (goals: travel and everyday; 20 minutes; "I know some basics"), placement
(start A2), Today, then the Real-life track: the airport check-in scenario (Prepare, Model dialogue, a poor reply,
his own words, best replies), Emergencies, and Expressions with the UK filter and searches. **Second sitting:**
lesson A2-1 with 4 wrong answers and a hint, Settings (British English, 130% text), Progress, Path. **Abroad:**
offline behaviour. **Return visit (+2 days):** Today and Real life, then the AI roleplay at check-in and the
travel tutor (mocked).

### M1. Major: offline, only the screens he happened to open before the trip work
- **Where:** Offline after visiting Today, Real life, two scenarios and Expressions online, at 390.
- **Observed:** Today, the visited and unvisited scenarios and Expressions all worked offline, because
  scenarios and expressions are one JSON file each (`m-80-offline-visited-scenario.png`,
  `m-80-offline-unvisited-scenario.png`). Spaced review, lessons he had not opened, Conversations and even
  Settings showed "This screen did not load. No internet connection. Reload" (`m-80-offline-review.png`,
  `m-80-offline-unvisited-lesson.png`, `m-80-offline-settings.png`). Nothing tells him in advance what will work
  offline. There is no "get ready for offline" action, no offline indicator on the phone layout, and nothing
  about offline use in Help.
- **Cause (code):** `sw.js` precaches only the shell, `today` and three JSON files. Every other view module and
  content file is cached only after its first online visit.
- **Why it matters:** Moshe will open the app in a taxi or at a pharmacy without data. Review and emergency
  practice failing at that moment is the scenario he was worried about.
- **Recommendation:** Precache all view modules plus `scenarios.json`, `slang.json` and the lessons of the current
  level when the service worker installs (they are small). Add a "Prepare for offline use" button in Real life
  or Settings that fetches the rest and confirms "Ready offline". Show a small offline badge in the top bar.

### M2. Major: mixed Hebrew and English lines come out scrambled (also affects Yael)
- **Where:** Scenario practice feedback, expression meanings and Today's Start button. Seen at 390 and 1440.
- **Observed:**
  - In scenario practice, the notes on the other options print the quoted option in the wrong place, for
    example `Sounds defensive. At a :"Why do you want to know?" party, this question…` and `Correct, but give your
    name too: that's the next question anyway. :"Yes. I have a reservation."` (`y-56b-party-wrong-full.png`,
    `m-d-hotel-practise.png`).
  - Hebrew meanings that quote English are jumbled, for example "Can I get…?" and "Bummer" in Expressions
    (`m-d-expressions.png`).
  - Today's button reads "?What are you doing :להתחיל" (`m-80-offline-today.png`).
- **Cause (code):** In `scenario.js`, the quote, the colon and the feedback share one right-to-left `<p>`.
  `isolateLatin()` does not include quote marks in the run it isolates. The Start button puts the English
  title inside Hebrew without an isolate.
- **Why it matters:** At A2, Moshe relies on these notes and Hebrew glosses to understand why a reply is
  rude or natural. Scrambled order makes the most useful feedback the hardest to read.
- **Recommendation:** Render "option → feedback" as two block lines, each with its own `dir`. Extend
  `isolateLatin()` so a Latin run takes in its surrounding quotes, `=` and `?`. Wrap lesson titles in `<bdi>`
  wherever they appear inside Hebrew text.

### M3. Major: the travel goal does not shape his daily plan
- **Where:** `#/today` at 390, first session and +2 days.
- **Observed:** Both days, Today was a 16-minute grammar lesson ("What are you doing?"), targeted practice and a
  4-minute "Speaking" block that opens the general Real-life list. It never names a scenario
  (`m-20-today.png`, `m-85-return-today.png`). Airport, hotel and emergency practice live only in the Real-life
  tab. `dailyPlan()` in `js/core/adaptive.js` does not take goals into account.
- **Why it matters:** His trip is the reason he signed up, and the plan the app hands him is a general grammar
  course. A busy parent with 20 minutes will follow Today and may never reach the emergency phrases.
- **Recommendation:** When "travel" is a goal, turn the "use" block into one specific scenario with a direct
  link: the next unvisited one at or below his level, airport, hotel and emergency first. Optionally ask
  "When is your trip?" and weight the plan towards Real life as the date approaches.

### M4. Major: speaking items in lessons can only be skipped as "I don't know" when recognition fails
- **Where:** `#/lesson/a2-01`, speaking item, at 390.
- **Observed:** Chromium reports speech recognition, so the item shows only "Hear it" and "Say it". The
  self-rating buttons ("I said it clearly", "I need more practice") are not offered. Check stays disabled until
  something is recognised, so the only way on is "I don't know" (`m-63-speak-14.png`). That counts as 0, the
  item stays in the score, and in this run Moshe finished at 68% against a 70% pass mark ("Nearly there",
  `m-65-lesson-review.png`).
- **Cause (code):** In `js/ui/exercise.js`, self-rating appears only when `canListen()` is false. When
  recognition is available, the score comes from word accuracy. That contradicts `js/core/speech.js`, which
  says recognition "never produces a grade on its own". `graded()` in `lesson.js` also counts speaking items
  in the denominator when they are not graded.
- **Why it matters:** Abroad, in a noisy place or with the microphone blocked, recognition fails. Chrome's
  recognition also needs a network connection (not verified on a device here). A pronunciation item should not
  decide whether a travel learner passes a grammar lesson.
- **Recommendation:** Always offer the two self-rating buttons after "Hear it". Never score a recognition
  failure as wrong. Leave ungraded speaking items out of the lesson score.

### M5. Minor: the Real-life list is very long on a phone, and the Airports icon is a placeholder
- **Where:** `#/real-life` at 390.
- **Observed:** All 30 scenarios form one 5,600px scroll, with Emergencies last (`m-30b-reallife-full.png`).
  Nothing says which scenarios suit his level. He is A2, and the three emergency scenarios are all B1. The
  Airports heading shows a plain circle (`m-30-reallife.png`) because `icon('plane')` does not exist in
  `js/ui/icons.js` and falls back to `circle`. That circle looks like the "not started" mark next to it. The
  topic filter chips help a lot.
- **Recommendation:** Show a "Start here" row (2-3 scenarios at his level for his goal). Collapse each module to
  its first two items. Add the plane icon.

### M6. Minor: after choosing a reply in scenario practice, the explanation is off-screen
- **Where:** `#/scenario/rl-airport-checkin-overweight`, Practise tab, at 390.
- **Observed:** After a tap, the options turn red or green, but the "why" is below the fold
  (`m-34-practise-poor.png`; the full layout is in `m-34b-practise-poor-full.png`).
- **Recommendation:** Scroll the explanation into view and focus it, as the lesson footer does.

### M7. Minor: the end of scripted practice points to AI that is not available
- **Where:** Practise tab, end screen, at 390.
- **Observed:** "Practice complete" offers "To AI roleplay" as the main button even when AI is not configured or
  he is signed out. The button leads to a notice (`m-37-practise-done.png`, `m-38-roleplay-noai.png`). There is
  no summary (how many replies were the most natural) and no "next scenario" link.
- **Recommendation:** When AI is not ready, make "Next scenario in Airports" the main button and add a one-line
  summary. Keep AI roleplay as a secondary button only when it can actually start.

### M8. Minor: Today says "Lesson completed today" next to a lesson he did not pass
- **Where:** `#/today` at 390, after Moshe failed A2-1 (68%) and finished a scenario.
- **Observed:** The "Lesson completed today" tag sits under "Start: What are you doing?" (`m-80-offline-today.png`).
  It is triggered by any `progress` record completed today, including Real-life scenarios.
- **Recommendation:** Base the tag on curriculum lessons only, or word it as "Scenario completed today".

### M9. Minor: the Expressions list is not ordered for a beginner traveller
- **Where:** `#/expressions` at 390 and 1440.
- **Observed:** The list is alphabetical only, so an A2 learner first sees "Ballpark (figure)" (B2)
  (`m-d-expressions.png`). Search matches inside words, so "mate" also returns "Ballpark" through "estimate"
  (`m-52-expr-mate.png`). The UK filter works well (36 of 50).
- **Recommendation:** Add a level filter or "Up to my level" toggle, sort by level by default for A1-A2, and match
  search terms at word starts.

### M10. Polish
- The no-AI notice says "needs a server with AI configured". "Server" is jargon for Moshe. Suggest "Free
  conversation with AI is not available in this version yet" (`m-38-roleplay-noai.png`).
- Step counters such as "5 / 1" and "16 / 5" are ambiguous in a right-to-left line. "1 מתוך 5" is clearer
  (`m-34-practise-poor.png`, `y-38-ex4-wrong.png`).
- The Hebrew support control in Settings wraps "Off" onto its own line at 390 (`m-66-settings.png`).

### What works well for Moshe
- The scenario Prepare tab is excellent for a nervous traveller. Each phrase has audio, a Hebrew gloss and a
  politeness tag (polite, neutral, casual). US and UK variants are marked, and there are short culture tips.
  Made-up prices are labelled as examples (`crop-m32-phrases.png`, `crop-m32-variants.png`).
- The scripted practice explains why a reply is rude, stiff or natural, in English and Hebrew. "To Tel Aviv.
  Quick, I'm late." → "Sounds rude. If you're short on time, say 'Sorry, I'm in a bit of a hurry.'" That is the
  "without embarrassing himself" help he wanted.
- Emergency scenarios (lost passport, pharmacy, stolen phone) exist and include procedural caveats
  (`m-41-lost-passport.png`).
- Expressions carry formality and region tags and "When NOT to use it". The footnote "'Very informal' is for close
  friends only" sets a safe default.
- Real life and Expressions do keep working offline once opened, and the offline error screen is plain and calm
  (`m-80-offline-*`).
- The AI roleplay flow is honest. It asks for sign-in, then consent, never corrects mid-conversation, gives a
  clear report with "more natural ways to say it", and says AI can be wrong (`m-90` to `m-94`). The travel tutor
  mode receives his level and goals (`moshe3.mjs` output).
- No streak pressure: "A day off erases nothing".

---

## The 5 most important fixes

1. **Fix the lost-progress bug after "Start from level" (Y1).** Remove the `_deleted` tombstone left by
   `moveToLevel()` before lessons are started or finished, and add an e2e test. Right now the main correction
   for a mis-placed learner silently breaks Today, Path and Progress.
2. **Make the placement and the skill profile honest (Y2, Y3).** Do not pass a level on a single 3-of-4 block,
   start at the demonstrated level when the result is borderline, offer a one-tap "start one level lower", and
   show "—" for speaking and writing until there is evidence.
3. **Make goals shape the daily plan (M3, Y6).** For "travel", Today should name a specific scenario. For
   "work", there should be something work-related (a small workplace module, plus a "kind of text" choice in
   writing). Otherwise the onboarding promise ("This shapes examples and recommendations") should be removed.
4. **Fix phone layout and right-to-left/left-to-right text (Y4, Y5, M2, Y7).** Stop the sideways scroll on
   Welcome and Today at 390 (and at large text sizes). Isolate English inside Hebrew lines (quotes, titles,
   option feedback) and render English blocks left to right.
5. **Make offline and speaking dependable for travellers (M1, M4).** Precache all views and the travel content on
   install, add "Prepare for offline use" with a clear ready state, and always offer self-rating for speaking
   items so a recognition failure is never scored as a wrong answer.
