# Persona review, round 2: student and ADHD learner (simulated)

**This is a simulated persona review, not research with real people.** An AI played two invented personas and
drove the app with Playwright. Their "reactions" are informed judgement about what such a learner would likely
experience. They are not user data and must not be quoted as such. Every finding below is backed by a screen I
looked at (screenshot path) or by the code that produces it.

- **Date:** 2026-10-31
- **Reviewer key:** `student-adhd` (round 2; round 1 is `round1-student-adhd.md`)
- **Personas:**
  1. **Maya, 18.** Preparing for the Bagrut English exam, around B1. Wants exam-relevant reading and writing and a
     clear sense of progress. Phone on the bus, laptop for writing.
  2. **Daniel, 23.** Has ADHD, around A2-B1. Clutter and long screens overwhelm him, and he loses track mid-task.
     Short sessions (10 minutes), frequent interruptions, needs to resume. Uses text size 150% and reduced motion.
- **Build:** commit `f8a202c` ("Close remaining fix items; fix log"), served with
  `python3 -m http.server 8802` at `http://127.0.0.1:8802/`.
- **Method:**
  - Playwright (Chromium) from Node. Every screenshot cited here was opened and inspected.
  - Sizes: phone 390x844 (touch), 320 and 344/360/375 width where layout mattered, desktop 1440x900. Welcome
    also at 430.
  - Settings: text size 100%, 130% and 150% (set through Settings), `prefers-reduced-motion: reduce` for Daniel,
    locale `he-IL`.
  - Accounts and AI used the mocked Supabase and `lucid-ai` from `tests/e2e/run.mjs` (`installMockServer`). Only
    flow, presentation and honesty are judged, not the canned AI text. Speech recognition was faked so the
    speaking items behave as in Chrome.
  - Return visits used persistent browser profiles and a shifted clock: +1 day for Daniel, +2 days for Maya.
  - Placement answers were simulated from the bank: right at or below the persona's level, about 45-50% right
    one level above, "I don't know" further up. Maya was simulated at B1 and Daniel at A2.
  - The offline check used a real service worker with no mock: save all lessons in Settings, then go offline.
  - One unwritten lesson was simulated by removing `b2-02` from `content/manifest.json` in the browser (route
    override), as `tests/e2e` L4 does. All 75 lessons are currently in the manifest.
- **Routes visited:** `#/welcome`, `#/start`, `#/placement` (left and resumed), `#/today`, `#/path`, `#/path/B2`,
  `#/lesson/b2-01`, `#/lesson/b2-02`, `#/lesson/a2-01`, `#/review`, `#/practice`, `#/reading`, `#/writing`,
  `#/writing/final-B2`, `#/account?mode=signup`, `#/settings`, `#/progress`, `#/real-life`, `#/expressions`,
  `#/conversations`, `#/speaking`, `#/help`, `#/scenario/rl-airport-checkin-overweight`. The 320px/150% sweep
  covered 15 routes.
- **Screenshots and scripts:**
  `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/personas-r2/student-adhd/`
  (screens in `shots/`, scripts `maya-*.mjs`, `daniel-*.mjs`, `probe-*.mjs`). Paths below are relative to that
  folder. They are session scratch files and are not committed.

---

## Step 1: verification of round 1

Each round 1 finding was re-tested in the app; the fix log's status was not taken on trust. "Fix log" gives the
merged ID in `docs/qa/fix-log.md`.

| R1 | Fix log | Finding (short) | Verdict | What I saw |
|---|---|---|---|---|
| M1 | P-24 | Today's Start button overflows on phones | **Resolved** | The B2 title wraps inside the button at 390 and 320; no sideways scroll at 100% (`shots/m06-today-phone.png`, `shots/m45-today-320.png`). |
| M2 | P-25 | Skill levels with no evidence | **Resolved** | Speaking and Writing say "Not yet assessed"; each placement level reads "First estimate: 2 placement questions" with a striped bar (`shots/m06b-today-phone-full.png`). A new honesty gap in how *practice* evidence is counted is **N1**. |
| M3 | P-26 | Start leads to an unwritten lesson; "try reloading" | **Resolved** | With `b2-02` removed, Today names it ("still being written, so this is the next lesson that is ready") and starts `b2-03`. The lesson page says "still being written", tags "In preparation" and links to the next ready lesson (`shots/m70-today-unwritten-skipped.png`, `shots/m72-lesson-unwritten.png`). |
| M4 | P-27 | A speaking item decides the pass | **Resolved** | "Can't speak right now" skips with no score and no retry; the end screen says speaking and writing do not count. Maya passed `b2-01` at 79% (`shots/m10-speak-e15.png`, `shots/m12-lesson-end.png`). |
| M5 | P-28 | Goals change nothing | **Resolved** | Today shows "Reading: a short text at your level · You chose exams and university…". After a reading it switches to a Writing lab task ("Argue a position: phones at school"). Onboarding now says goals apply from A1 and 20 minutes. The time given to that writing block is **N5**. |
| M6 | P-29 | "Get feedback" disabled with no reason | **Resolved** | The reason appears in turn: "You can turn on AI feedback in Settings", then "Choose a topic first (above)", then "Feedback opens at 225 words (you have 127)" (`shots/m25b-essay-topic-desk.png`). |
| M7 | P-30 | AI feedback read away from the text | **Resolved** | Desktop: the editor stays in view while the feedback scrolls, and "Show in my text" selects "more better" (`shots/m28-essay-feedback-scrolled-desk.png`, `shots/m29-essay-locate-desk.png`). Phone: a "Mistakes to fix" chip strip sits under the editor and selects the span (`shots/m46-essay-phone-ai-tab.png`). A small residual is **N12**. |
| M8 | P-31 | Writing lab opens on an empty stage | **Resolved** | "Your level: B2. Your stage: 5; the B2 final task is in stage 6." Stage 5 is open and now has 3 tasks (`shots/m15b-writing-phone-full.png`). The empty-stage fallback could not be exercised because the stage has content. |
| M9 | P-32 | English text right-aligned in RTL screens | **Partly resolved** | Fixed: lesson explanations, objectives, key points, tables (LTR, scroll from their first column) and the essay prompt (`shots/m09-lesson-learn-top.png`, `shots/m09b-lesson-learn-mid.png`). Remaining: the final task's topic choices and "Must include" list are still right-aligned English, and some inline English wraps badly. See **N7**. |
| M10 | P-33 | A level skipped on 4 questions looks completed | **Resolved** | The path tabs read "B1 0/12 · 12 skipped", the rail draws placed-out levels hatched, and the result screen offers "Start at B1" and a "B1 level check" (`shots/m07-path-phone.png`, `shots/m05-placement-result.png`). Placement needed 6 of 8 at B1. |
| M11 | P-35 | Reading centre starts at Pre-A1 | **Resolved** | B2 comes first, tagged "Recommended for your level" (`shots/m14-reading-phone.png`). |
| M12 | P-34 | Progress shows 0 active minutes | **Resolved** | After 14 simulated minutes, Progress showed "14 active minutes" with the session still open. |
| D1 | P-36 | Welcome wider than every phone | **Resolved** | `scrollWidth` equals the viewport at 320, 390 and 430, and the "Get started" button is fully visible (`shots/d50-welcome-320.png`, `shots/m01-welcome-390.png`). |
| D2 | P-37 | Interrupted placement starts him at the alphabet | **Partly resolved** | Fixed: X saves, Today shows "Finish your placement test (5 answered)" with Continue, Start again, "Start at A2 (your own estimate)" and "Start from the basics". Continue resumed at question 6 (`shots/d02-today-after-x.png`). Remaining: Settings has no placement link. The Path still presents Pre-A1 as the current level while the test is pending (**N4**). |
| D3 | P-38 | "10 minutes" opens a 25-minute lesson | **Partly resolved** | Fixed: Today shows the real length and plans a part ("about 25 min, so today is a part: up to exercise 5 of 16"), and the next day says "Today's part is done" (`shots/d05-today-10min.png`, `shots/d13-today-part-done.png`). Remaining: **(a)** the player never marks the end of the part. Daniel went from exercise 4 to 11 with no stop point (`shots/d12-at-9.png`). **(b)** The learn stage is still one long page: a2-01 has 906 words over 7.7 screens, b2-01 has 1,035 words over 8.6 screens. **(c)** The plan counts the learn stage as 2 exercise slots (about 3 minutes, `lessonSlice` in `js/core/adaptive.js`) however long the text is. **(d)** The lesson intro still says only "about 25 minutes". |
| D4 | P-39 | Wrong-answer feedback squeezed into a column | **Resolved** | Below 40rem the verdict is full width, Continue sits under it and "Why?" is folded. A wrong sort lists its misplaced items in groups (`shots/m11-wrong-e1.png`, `shots/d08-e2-wrong.png`). At 150% the footer covers 487 of 844 px and hides the question stem (`shots/d64-ex1-wrong-150.png`). That is usable, but the footer is tall. |
| D5 | P-40 | 150% text breaks Today and speaking | **Partly resolved** | Fixed at 390/150%: Today and the speaking item have no sideways scroll (`shots/d60-today-150-390.png`, `shots/d66-speak-150.png`). Remaining: **(a)** at 320/150%, Today and Progress still scroll sideways by 24 px. The cause is the skill rows (`grid-template-columns: 7rem 1fr 3.2rem`, css/app.css:320; `shots/d61-320-150-today.png`). **(b)** Settings is 7.2 screens at 150% (3.6 at 100%). **(c)** The minute selector wraps to 2 rows. New 150% breakage on other screens is **N2** and **N3**. |
| D6 | P-41 | "Practise again" restarts all 16 | **Resolved** | At 66% the main action is "Practise the 5 I missed · about 7 min". Redoing them completed the lesson, and "Practise everything again" is secondary (`shots/d29-lesson-end-100.png`, `shots/d69-end-150.png`). |
| D7 | P-42 | Exercise total grows; counter reads backwards | **Partly resolved** | Fixed in the player: "4 of 16 · 1 to revisit" and "Revisit 1 of 4", in words. Remaining: Today's Continue button and plan row count the retry queue. The same lesson read "(4/17)", then "(11/17)", then "(14/20)", and "exercise 14 of 20", while the player said "14 of 16 · 4 to revisit" (`shots/d09-today-after-exit.png`). The finish line still moves, now on Today. |
| D8 | P-43 | Three ways into the same lesson | **Resolved** | One orange "Continue: … (4/17)" button. The plan row says "Continue:" and links to the same `?resume=1` address. No duplicate card (`shots/d09-today-after-exit.png`). |
| D9 | P-44 | Learn stage opens partway down | **Resolved** | The learn stage opens at the top (scrollY 0) with the title visible (`shots/m09-lesson-learn-top.png`, `shots/d52-a2-learn-top.png`). |
| D10 | P-45 | Hebrew support doubles reading; order flips | **Partly resolved** | The order is now stable (English first before and after a reload). At A2 "partial", every paragraph is still followed by its full Hebrew: a2-01 learn is 906 words over 7.7 screens (`shots/d52-a2-learn-top.png`). There is no "Hebrew on tap" for long paragraphs and no "short explanations" setting. |
| D11 | P-46 | Real Life lists very long | **Partly resolved** | At 100% text: Real Life is 5.4 screens (was 6.8), with a "Start here" strip for his level and goals. Conversations is 4.4 screens and 521 words (was 8.8 screens and 1,734 words). Expressions is still one list, 10.9 screens with 113 controls (was 11.6 and 107), though it gained level and sort filters. At 150% Real Life becomes 17.8 screens because of **N2**. |
| D12 | P-47 | Hebrew sentences with English break apart | **Resolved** | "…צורה נפרדת: I work every day, אבל I'm working at the moment." and "now, right now, at the moment, today." render with punctuation in place (`shots/d53b-crop-bidi.png`, `shots/d53c-crop-bidi2.png`). A different wrapping problem is **N7**. |

**Summary:** 15 resolved, 9 partly resolved, 0 not resolved, 0 regressed.

---

## Step 2: fresh sessions

### Maya (B1, Bagrut)

**First session, phone.**
1. Onboarding: goals "Bagrut, psychometric and academic studies" and "academic and argumentative writing", 20
   minutes, start point "fairly comfortable".
2. Placement: 20 items. B1 4/4, B2 3/4, C1 "I don't know" ×4, a B2 confirming block 1/4, then a B1 confirming
   block 4/4. Result: "You showed control up to B1, over two sets of questions. We'll start at B2"
   (`shots/m05-placement-result.png`).
3. Today, then lesson `b2-01`: 3 wrong answers and the speaking item skipped. Result: 79%, "Lesson complete".
4. Progress, the Reading centre and the Writing lab.

**Return visits.**
- Desktop: the B2 final writing task. She signed up (mocked), turned on AI feedback, chose a topic, wrote 256
  words, got AI feedback and located her mistake.
- Phone, two days later: spaced review (12 words), Progress, Today at 320, and the essay feedback on the phone.
- Offline: all 75 lessons saved, then Today, an unopened lesson (`b2-05`), Review, Reading, the Writing lab, the
  final task and Progress all opened with no connection.

### Daniel (A2-B1, ADHD)

**First session, phone, 100% text, reduced motion.**
1. Onboarding: goals "confidence in conversation" and "everyday English", 10 minutes, start point "simple
   conversations".
2. Placement: he left with X after 5 questions, came back through Today's "Continue the test" and finished.
3. The simulated A2 learner got 6 of 8 at B1, which confirmed B1, so he was started at B2.
   - The result screen offered "Start at B1 instead". He took the default orange button.
   - This is the design ("start one level above what you showed"), not a defect. It means Daniel's lessons are
     B2 lessons with 1,035-word explanations.
4. Lesson `b2-01`: 1 right, a wrong sort, a wrong listening answer, then X. Back in through the primary button,
   one answer, a page reload, and on to exercise 11 before leaving.

**Day 2.**
1. Text size set to 150% in Settings. Today at 390 and 320.
2. Resumed the lesson and got 3 more wrong. Spoke the speaking item and submitted the writing item.
3. "Nearly there" at 66%, then "Practise the 5 I missed", then "Lesson complete".
4. Review, Practice, Real Life, Expressions, Conversations and Progress at 150%. Also the A2 path through "Start
   at A2 (your own estimate)" in a separate profile.

**Focus load at 390x844, 100% text (round 1 → round 2):**

| Screen | Words | Controls | Screens of scroll |
|---|---|---|---|
| Today | 77 → 182 | 8 → 9 | 1.1 → 1.8 (3.5 at 150%) |
| Lesson intro | 132 → 118 | 4 → 4 | 1.3 → 1.2 |
| Learn stage (a2-01) | 831 → 906 | 21 → 21 | 7.6 → 7.7 |
| Learn stage (b2-01) | 1,032 → 1,035 | — → 26 | 8.8 → 8.6 |
| Feedback after a wrong MCQ | 108-166 → 69-72 | 7-15 → 7 | 1.2-1.7 → 1.0 |
| Practice hub | 80 → 82 | 8 → 8 | 1.4 → 1.3 |
| Real Life hub | 866 → 599 | 40 → 36 | 6.8 → 5.4 (17.8 at 150%) |
| Expressions | 1,104 → 1,113 | 107 → 113 | 11.6 → 10.9 (24.1 at 150%) |
| Conversations | 1,734 → 521 | 30 → 32 | 8.8 → 4.4 (10.7 at 150%) |
| Settings | 226 → 252 | 47 → 52 | 3.4 → 3.6 (7.2 at 150%) |
| Progress | 190 → 282 | 14 → 14 | 2.7 → 3.2 |

### New findings

**N1. Retries and "missed" redos count as evidence for a skill level, so a lesson he nearly failed shows Grammar B2.** *Major (honesty). `#/today`, `#/progress`, phone. Both personas; observed with Daniel.*
- **Observed:**
  - Daniel answered 7 of 11 B2 grammar items right on the first try (64%) and got "Nearly there, 66%".
  - He then answered the same items again: as end-of-set retries, seconds after the right answer was shown,
    and in "Practise the 5 I missed".
  - Progress and Today then show **Grammar B2** with a solid, non-provisional bar and "19 answers at this level,
    on 2 days" (`shots/d75-progress-grammar-b2.png`). The stored attempts are 18 for `b2-01`, 14 right; first
    tries are 7/11.
  - The cause: `recordAttempt` stores retries and missed-mode answers like first tries, with no `retry` flag
    (js/views/lesson.js `doCheck`). `skillLevels()` then counts every attempt (js/core/adaptive.js:124-131).
  - The panel itself promises "6+ answers at the level, 75% right, on 2 different days".
- **Why it matters:**
  - Daniel is an A2-B1 learner. A B2 grammar label is flattering but false, and it hides the fact that this level
    is too hard for him.
  - For Maya, who wants an honest read of where she stands before the Bagrut, a level that rises because she
    repeated answers she had just been shown undermines the whole profile. Round 1's skill-evidence fix (M2) is
    weakened.
- **Recommendation:**
  - Store `retry: true` and `mode: 'missed'` on those attempts.
  - Count only first tries, and missed-mode answers given on a later day, toward `skillLevels`, and show "first
    try" in the source line.
  - Add a unit test: a lesson passed only through retries must not raise the skill level.

**N2. At 130-150% text, Path and Real Life rows squeeze their titles to a few letters per line.** *Major (accessibility). `#/path/B2`, `#/real-life`, 390x844 at 130% and 150%. Daniel.*
- **Observed:**
  - `.lesson-row` uses `grid-template-columns: auto 2.2rem 1fr auto` (css/app.css:331). The last `auto` column
    (tags such as "In progress" and "Next", or a level tag with "below your level") keeps its full width, so the
    title column shrinks.
  - The title width of the path's "Next" row: 138 px at 100%, 102 px at 115%, 65 px at 130%, **15 px at 150%**,
    where "If I had known…" is set one letter per line.
  - Real Life's "Start here" titles are 40 px at 150% ("Sm / all / tal / k").
  - The Real Life hub becomes 17.8 screens and the Path 7.9.
  - Screenshots: `shots/d73-path-next-row-150.png`, `shots/d74-path-next-row-130.png`,
    `shots/d70-real-life-150-strip.png`, `shots/d34c-reallife-150-crop.png`.
- **Why it matters for Daniel:** 150% is his comfort setting, and these are his "where next" screen and the
  conversation area he chose. A next lesson he cannot read is a likely moment to quit. The e2e overflow sweep
  passes because nothing scrolls sideways: the text just becomes unreadable.
- **Recommendation:**
  - On narrow screens or at ≥130% text, move the tag column under the title (grid areas, or `flex-wrap` with the
    tags on their own line) and give the title `min-width: 60%`.
  - Add an e2e check at 390/150% that no `.lesson-row` title box is narrower than about 8em.

**N3. At 150% text the skill panel and level rail lose their meaning.** *Minor. `#/today`, `#/progress`, 390 and 320 at 150%. Daniel.*
- **Observed:**
  - The fixed `7rem` and `3.2rem` skill columns leave the meter a 2-3 px sliver at 390. "Not yet assessed" wraps
    to two lines (`shots/d22d-crop-skills-150.png`).
  - The rail labels "Pre-A1" and "A1" overlap (`shots/d22c-crop-rail-150.png`).
  - At 320 the rows push the page 24 px wide (see D5).
- **Why it matters:** Daniel gets the progress picture as a jumble right where Lucid wants to show honest evidence.
- **Recommendation:** at large text, stack each skill row (name and level on one line, meter full width
  underneath, source line below). Shorten the rail labels to "P-A1" or drop the label row below 24rem in favour of
  the existing `aria-label`.

**N4. While the placement is unfinished, the Path says he is at Pre-A1 and that the alphabet is next.** *Minor. `#/path`, phone. Daniel.*
- **Observed:**
  - After he left the test after 5 answers, Today correctly says "Your daily plan appears after the placement
    test".
  - The Path tab shows "Pre-A1 · your current level" with "The English alphabet · Next"
    (`shots/d03-path-pending.png`).
  - The only placement link on the Path is "Retake the placement test" at the bottom of a level. It uses
    `?restart=1` and so throws away his saved answers.
- **Why it matters:** this is the round 1 worry ("did I fail? am I at the ABCs?") on a different screen, and the
  one control there discards his progress.
- **Recommendation:** while `placementPending`, show the same "Finish your placement test (n answered)" card at
  the top of the Path, with no "current level" or "Next" marks. Make the Path link "Continue the test" when a
  draft exists. Add the link to Settings (still missing).

**N5. Today budgets a 180-250-word essay as a 4-minute block.** *Minor (time honesty). `#/today`, phone. Maya.*
- **Observed:**
  - With the studies and writing goals, the "use it" block becomes "Writing: Argue a position: phones at school …
    4 min" (`shots/m73-today-next-day-writing.png`).
  - That task (`we-08`) asks for 180-250 words. The block gets a fixed share of the daily budget whatever the
    task is (`useBlock` in js/core/adaptive.js:236-244).
  - The plan still reads "about 20 minutes".
- **Why it matters:** Maya plans her bus or evening slot around this number. A B2 argument takes her far longer
  than 4 minutes, so the plan sets her up to "fail" the day.
- **Recommendation:** estimate writing blocks from the task's word target (for example about 10 words a minute at
  B1-B2, with a minimum). Or label the block "start a draft (4 min); it saves", so stopping is the plan rather
  than a failure.

**N6. Today's lesson count still includes retries, so the finish line moves.** *Minor. `#/today`, phone. Daniel.*
- **Observed:** the D7 residual. The Continue button and plan row read "(4/17)", then "(11/17)", then "(14/20)"
  and "exercise 14 of 20", while the player reads "14 of 16 · 4 to revisit". The cause: `pos()` and `startLabel()`
  in js/views/today.js use `resume.queue.length` (`shots/d09-today-after-exit.png`).
- **Why it matters:** two different totals for the same lesson, and one that grows after mistakes, is the
  decoding cost round 1 asked to remove.
- **Recommendation:** use the same `stepInfo()` as the player and say "exercise 14 of 16 (+4 to revisit)".

**N7. English sentences inside Hebrew lines still wrap awkwardly or sit right-aligned.** *Minor (readability). `#/review`, `#/lesson/*` listening, `#/writing/final-B2`, phone and desktop. Maya.*
- **Observed:**
  - In the spaced-review result, "in the meantime = בינתיים · The plumber arrived at ten. In the meantime…" is one
    RTL line. The English example starts at the left end of line 1 and continues at the right of line 2
    (`shots/m42-review-card.png`).
  - The lesson listening transcript ("תמליל: Sorry I missed the start…") wraps the same way
    (`shots/d08-e3-wrong.png`).
  - On the B2 final task, the three topic questions and the 5-item "Must include" list are English set
    right-aligned with bullets and radios on the right (`shots/m25b-essay-topic-desk.png`).
- **Why it matters:** these are the reading passages and prompts Maya reads most closely for the exam.
- **Recommendation:**
  - Render examples and transcripts as their own `display:block; dir=ltr; text-align:left` line under the Hebrew
    label, as the lesson verdict already does for long answers.
  - Give the topic labels and the must-include list `lang="en" dir="ltr"` blocks.

**N8. At 150% the speaking item's microphone button is below the fold.** *Minor. `#/lesson/*` speak item, 390x844 at 150%. Daniel.*
- **Observed:**
  - The first screen shows the prompt, the target sentence and a 4-line pronunciation tip, then the footer with
    "Can't speak right now" and a disabled Continue.
  - "Listen" and "Say it" start below the fold (`shots/d66-speak-150.png`). After speaking, the page jumps to
    scrollY 583 (`shots/d68-speak-recognised-150.png`).
- **Why it matters:** the visible choices are "skip" or a dead button, which nudges him to skip.
- **Recommendation:** at large text put the Listen and Say buttons directly under the target sentence and fold the
  pronunciation tip behind its info icon.

**N9. Today got denser for Daniel.** *Minor. `#/today`, phone.*
- **Observed:**
  - Today went from 77 to 182 words and from 1.1 to 1.8 screens at 100% (3.5 at 150%).
  - Most of the growth is the evidence line under each skill, a long footnote, and an "Add the B1 words" card that
    returns whenever no reviews are due and has no "not now" (`shots/d05b-today-10min-full.png`).
  - The primary button is still in the first screen.
- **Why it matters:** honest is good, but Today is the screen he opens in a 10-minute slot.
- **Recommendation:** on phones, collapse "Level by skill" to one line ("4 skills with a first estimate ·
  details") and let the import card be dismissed ("not now").

**N10. Reopening an essay on the phone hides the "mistakes to fix" strip.** *Polish. `#/writing/final-B2`, 390. Maya.*
- **Observed:** the editor opens on the Checks tab (`let tab = 'checks'`, js/views/essay.js:120). The strip appears
  only after she taps "AI feedback" (`shots/m31c-part1.png` vs `shots/m46-essay-phone-ai-tab.png`).
- **Recommendation:** open on the AI tab when the latest version has AI feedback that is not marked final.

**N11. The reading block on Today shows a microphone icon.** *Polish. `#/today`, phone and desktop. Maya.*
- **Observed:** `GLYPH.use` is `speaking` for every non-writing "use" block, so "Reading: a short text at your
  level" has a microphone (`shots/m06-today-phone.png`, `shots/m80-desk-today.png`).
- **Recommendation:** use the reading (book) icon when `kind === 'reading'`.

**N12. The Path's level tabs start at Pre-A1, so the learner's own level tab is off screen.** *Polish. `#/path`, phone.*
- **Observed:** for a B2 learner, the visible tabs are Pre-A1 to B1. B2 is scrolled out of view
  (`shots/m07-path-phone.png`).
- **Recommendation:** scroll the current level's tab into view on load.

### What now works well
- **Resuming is excellent.**
  - Leaving a placement or a lesson loses nothing.
  - Today offers one Continue button that goes straight back to the exercise. A reload and a next-day return
    kept the exact place.
  - "Today's part is done. Tomorrow continues from exercise 11" is a calm way to end a day.
- **Failing a lesson is now a short task.** "Nearly there, 66%" leads to "Practise the 5 I missed · about 7 min",
  and fixing them completes the lesson.
- **Speaking never costs a pass.**
  - "Can't speak right now" is on every speaking item.
  - The recognition result is shown with "this is not a score".
  - The end screen says speaking and writing do not count.
- **Answer feedback on phones is clear:** a full-width verdict, the right answer first, "Why?" folded, and a short
  grouped list for sorting mistakes.
- **The placement is honest and recoverable.** It asks for a confirming block, shows "first estimate (2
  questions)", marks untested skills "not yet assessed", and offers a lower start and a level check.
- **Maya's goals now shape the plan** (reading, then a Writing lab task), and the plan says why.
- **The writing tools are good for the Bagrut:**
  - the reason a button is disabled is spelled out;
  - the topic picker and "Must include" list frame the task;
  - the editor stays in view on desktop;
  - "Show in my text" selects the mistake;
  - feedback comes as a hint ladder before the correction, with "AI feedback can be wrong" framing.
- **Offline works for the bus.** One button in Settings saves all 75 lessons ("All 75 lessons are saved"), and
  every screen she needs opens with no connection.
- **Phone layout at 100% text is clean:** no sideways scroll on any route at 390 or 320. Welcome fits at 320.
  English lesson text is left-aligned and tables read left to right.

---

## Overall verdict per persona

**Maya: would keep using Lucid.**
- **Why she would stay:**
  - A believable starting point and a reading centre at her level.
  - A writing lab with the reasons, structure checks and located feedback she needs for Bagrut revision.
  - Offline study on the bus.
  - A Progress page that explains where each number comes from.
- **What could stop her** (nothing blocks her):
  - Skill levels that rise from repeated answers (N1). If she notices, she stops trusting the profile she uses to
    judge her exam readiness.
  - Daily plans that undersell the writing time (N5).
  - The remaining right-aligned English in the final task (N7).

**Daniel: would probably keep using Lucid at 100-115% text. At his preferred 150% he is at real risk of quitting.**
- **Why he would stay:** the round 1 blockers to his routine are fixed. Resuming is solid, Today has one obvious
  button, misses become a short "practise the 5 I missed", and nothing punishes an interruption.
- **What would stop him:**
  - At 150% the Path's "Next" lesson and Real Life's "Start here" cards become one or two letters per line (N2),
    and the skill panel turns into slivers (N3).
  - Lessons still run past "today's part" with no stopping point, after an 8.6-screen explanation counted as about
    3 minutes (D3).
  - Today's total moves after mistakes (N6).
- **Note on the simulation:** the simulated A2 placement landed him at B2. For a real A2-B1 learner that would make
  every lesson feel like the 66% he got. The result screen's "Start at B1 instead" is the escape hatch, but it is
  the secondary button.
