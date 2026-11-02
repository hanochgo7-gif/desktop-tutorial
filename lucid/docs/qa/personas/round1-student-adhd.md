# Persona review, round 1: student and ADHD learner (simulated)

**This is a simulated persona review, not research with real people.** An AI played two invented personas and
drove the app with Playwright. Their "reactions" are informed judgement about what such a learner would likely
experience; they are not user data and must not be quoted as such. Every finding below is backed by an observed
screen (screenshot path) or by the code that produces it.

- **Date:** 2026-10-30
- **Reviewer key:** `student-adhd`
- **Personas:**
  1. **Maya, 18.** Finishing high school and preparing for the Bagrut English exam, around B1. She wants
     exam-relevant reading and writing and a clear sense of progress. Uses her phone on the bus and a laptop for
     writing at home.
  2. **Daniel, 23.** Has ADHD and is around A2-B1. Clutter and long screens overwhelm him, and he loses track
     mid-task. He needs short sessions, clear next steps, lessons he can resume and no attention traps. He studies
     on his phone in 10-minute slots and gets interrupted often.
- **Build:** working tree at commit `7d1dc53`, served statically at `http://127.0.0.1:8799/`. Lesson files were
  being added by the content team during the run. Missing lessons and writing exercises are known and are not
  reported. Only the way the app handles them is.
- **Method:** Playwright (Chromium 1.63) drove the app, and every screenshot was opened and inspected.
  - Sizes: phone 390x844 (touch, `isMobile` off, plus one pass with `isMobile` on) and desktop 1440x900. The
    Welcome width was also checked at 320 and 430.
  - Settings tested: text size 100% and 150%, `prefers-reduced-motion` both `reduce` and `no-preference`, locale
    `he-IL`.
  - Return visits used a persistent browser profile and a shifted clock (+1 day for Daniel, +2 days for Maya).
  - Accounts and AI used the mocked Supabase and `lucid-ai` from `tests/e2e/run.mjs`. AI answers are canned, so
    only the flow, the presentation and the honesty of the UI are judged.
  - Placement answers were simulated as a learner at the persona's true level: correct at or below that level, about
    45% correct one level above, and "I don't know" further up.
- **Routes visited:** `#/welcome`, `#/start`, `#/placement`, `#/today`, `#/path`, `#/path/A2`, `#/path/B2`,
  `#/lesson/b2-01`, `#/lesson/a2-01`, `#/lesson/a2-02`, `#/lesson/b2-04`, `#/lesson/b2-09`, `#/review?mode=exit`,
  `#/practice`, `#/reading`, `#/reading?l=pa1-02&e=e8`, `#/writing`, `#/writing/final-B2`, `#/writing/free`,
  `#/account?mode=signup`, `#/settings`, `#/progress`, `#/real-life`, `#/scenario/rl-airport-checkin-overweight`,
  `#/expressions`, `#/conversations`, `#/tutor`. Every other route in `js/core/router.js` was also loaded at 390px
  to check for horizontal overflow.
- **Screenshots and scripts:** `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/personas/student-adhd/`
  (screens in `shots/`). Paths below are relative to that folder. These are session scratch files and are not
  committed.
- **"Focus load":** for Daniel, each screen was measured as visible words, interactive controls and screen-heights
  of scroll at 390x844.

---

## Persona 1: Maya (B1, Bagrut)

**Realistic first session.**
1. Onboarding: goals "Bagrut, psychometric and academic studies" and "academic and argumentative writing", 20
   minutes a day, start point "fairly comfortable reading and writing".
2. Placement: 8 items. She got 4/4 at B1 and 1/4 at B2.
3. Result: "You showed control up to B1. We'll start at B2."
4. Today, then lesson `b2-01`: 3 wrong answers, plus a speaking item she could not do aloud.
5. Progress, the Reading centre and the Writing lab.

**Return visit.**
1. On the desktop: the B2 writing task, the automatic check, account sign-up (mocked) and AI feedback (mocked).
2. On the phone: settings, then Today and Progress two days later.

### Findings

**M1. Today's main button runs off the screen on a phone when the lesson title is long.** *Major. `#/today`, 390x844.*
- **Observed:** the orange primary button "להתחיל: Narrative tenses and the past perfect" does not wrap.
  `.key { white-space: nowrap }` (css/app.css:172) makes the whole Today page about 460px wide. On load the
  visible area showed the button cut on both sides, the page title cut ("היום" clipped) and a grey strip on the
  left. Twelve curriculum titles are 31 to 44 characters long, so every B2 and C1 learner hits this. Screenshots:
  `shots/m09-today-phone.png`, `shots/m25-today-after-lesson.png`.
- **Why it matters for Maya:** it is the first thing she sees every day and the one button she needs. A
  sideways-scrolling page looks broken.
- **Recommendation:** let the start-bar key wrap (`white-space: normal`, `text-align: start`) or truncate the
  title with an ellipsis and keep the full title in the plan row below. Add a 390px no-overflow assertion for Today
  with the longest title to `tests/e2e`.

**M2. Skill levels appear with no evidence behind them.** *Major (honesty). `#/today`, `#/progress`, phone and desktop.*
- **Observed:** after an 8-item placement that tested only grammar, vocabulary, reading and listening, Today shows
  confident bars for **Speaking B1** and **Writing B1**. Progress gives their source as "Speaking: placement test
  (0)" and "Writing: placement test (0)". Vocabulary shows **B2** from 2 items. The same panel says
  "'—' means not enough evidence yet", and Help says "each skill gets a level only when you answer enough items".
  Cause: `skillLevels()` falls back to `placement.level` for skills the test never measured
  (js/core/adaptive.js, `placement?.skills?.[skill]?.level ?? placement?.level`). Screenshots:
  `shots/m09b-today-phone-full.png`, `shots/m26b-progress-phone-full.png`.
- **Why it matters for Maya:** she wants an honest sense of where she stands for the Bagrut. A "Writing B1" she
  never earned makes the whole profile hard to trust, and Lucid's own principle is "demonstrated ability".
- **Recommendation:** show "—" for any skill with 0 items. Show the evidence count next to each level on Today, or
  at least mark placement-only levels as "first estimate (n questions)". Do not let `placement.level` fill skills
  the test did not measure.

**M3. Today's main button can lead to a lesson that is still being written, and the message blames the device.** *Major (handling of known content state). `#/today` to `#/lesson/b2-09`, and `#/path/B2`, phone.*
- **Observed:** `nextLesson()` does not skip missing lessons. With `b2-01` to `b2-08` done, Today's primary button
  says "Start: Reading critically" and opens a dead end: "This lesson is not available on this device yet. Try
  reloading, or go back to your path." On the Path, lessons the manifest calls unwritten get only a dashed border,
  with no label or legend. The stale manifest also marks `b2-03` and `b2-04` dashed although they open fine (one is
  already completed at 80%). Screenshots: `shots/m64-missing-lesson-opened.png`, `shots/m62-path-b2-unwritten-rows.png`.
- **Why it matters for Maya:** at B1 and B2, the levels she lives in, she will meet this often. "Try reloading"
  sends her hunting for a network problem that does not exist.
- **Recommendation:** make Today and the plan skip to the next available lesson and say so ("Lesson 9 is still
  being written. Continue with lesson 10 / practise B2 grammar"). Replace the "try reloading" copy for known
  unwritten lessons with "coming soon" wording. Give dashed rows a visible "בקרוב / coming soon" tag. Build the
  path's availability from the same source the lesson loader uses, so it cannot go stale.

**M4. A speaking item she cannot do aloud decides whether the lesson passes.** *Major. `#/lesson/b2-01`, phone.*
- **Observed:** in Chrome or Safari, where speech recognition exists, the `speak` exercise is graded. Its only
  alternative to speaking is "I don't know", which scores 0 and queues the item to come back. Maya scored
  **68%** ("Nearly there, 70% completes the lesson"). The speaking item alone cost 1/15 ≈ 6.7 points, so without it
  she would have passed with about 73%. Screenshots: `shots/m24-lesson-review.png`; the speak item is in
  `shots/d26-stuck-15-19.png`.
- **Why it matters for Maya:** she studies on the bus and in the school library and cannot speak aloud there. She is
  told she "nearly" failed for a reason that has nothing to do with her English.
- **Recommendation:** add "Can't speak right now" to `speak` items. It should skip without scoring and not
  re-queue the item, leaving it for later in the Speaking lab or the next session. Leave ungraded or skipped items
  out of the pass calculation, as `write` items already are.

**M5. Her goals (Bagrut, academic writing) change nothing she can see.** *Major. `#/start` step 2, `#/today`, phone.*
- **Observed:** onboarding says "Choose any. This shapes examples and recommendations." In the code, `goals` is
  read only by the AI tutor and the profile form (`grep goals js`). Today's "use" block still chooses speaking first
  and routes a B2 learner to Real-Life travel scenarios ("Speaking: use what you learned"). No writing block
  appeared in her plan. Screenshots: `shots/m03-ob-step2.png`, `shots/m09b-today-phone-full.png`.
- **Why it matters for Maya:** she said writing and exams matter, and the app answered with airport roleplays.
  The promise in onboarding is not kept.
- **Recommendation:** either use the goals, for example prefer the writing block over speaking in `dailyPlan` when
  `writing` or `studies` is chosen, or soften the onboarding copy to what is true today ("used by the AI tutor").

**M6. "Get feedback" is disabled with no reason given.** *Minor. `#/writing/final-B2`, 1440x900.*
- **Observed:** after signing in, Maya's 119-word draft shows a greyed "קבלת משוב" button. The rule (at least 50% of
  the minimum, here 225 words) is not stated. Before sign-in the screen said "AI feedback is available after you
  sign in", but once she signs in that note disappears and nothing replaces it. Screenshot:
  `shots/m43-essay-signed-in-desk.png`.
- **Why it matters for Maya:** she thinks sign-up did not work, or that AI is broken.
- **Recommendation:** show the reason under the button: "Feedback opens at 225 words (you have 119)".

**M7. AI feedback is read away from her text.** *Minor. `#/writing/final-B2`, desktop and phone.*
- **Observed:**
  - Desktop: feedback sits in a 350px side column and runs 2.3 screens long. Reading it scrolls the editor out of
    view. The flagged error ("more better") is not located or highlighted in her text.
  - Phone: the feedback starts below the editor and the page is 3.6 screens.
  - The honesty cues are good: "AI feedback can be wrong", a report link, and category bands rather than fake
    scores.
  - Screenshots: `shots/m50b-essay-ai-feedback-desk-full.png`, `shots/m51-essay-ai-phone.png`.
- **Why it matters for Maya:** revising is the Bagrut skill she needs. Flipping between feedback and text makes
  self-correction slower.
- **Recommendation:** make the editor sticky on desktop while the feedback scrolls. Let a tap on an error scroll to
  and select the quoted span in the textarea. On phone, offer a compact "errors to fix" list directly under the
  editor, before the category breakdown.

**M8. The Writing lab opens her on an empty stage.** *Minor (handling of known content state). `#/writing`, desktop and phone.*
- **Observed:** for a B2 learner, "Your stage" is stage 5 (Counterarguments), which opens automatically with
  "No exercises in this stage yet." Stages with content (6, 8, 10) are closed. The final task's breadcrumb says
  "Stage 6: Rebuttals", which does not match "Your stage" (5). Screenshot: `shots/m34-writing-desk.png`.
- **Why it matters for Maya:** her first visit to the centre she cares about most is a dead end.
- **Recommendation:** when the recommended stage is empty, open the nearest stage with content and say why. Keep
  the "your stage" label consistent with the level's final task.

**M9. English learning text is right-aligned inside RTL screens.** *Minor (readability). `#/lesson/b2-01` learn, objectives and review; `#/writing/final-B2` task.*
- **Observed:**
  - English paragraphs, objectives, key points and the essay prompt are set right-aligned with a ragged left edge.
  - Check icons on key points sit on their own line above each point.
  - The tense table in the explanation is clipped at its first column (the start side in RTL), so "Example" is cut.
  - Screenshots: `shots/m20-lesson-learn-top.png`, `shots/m24-lesson-review.png`, `shots/m36-essay-typed-desk.png`.
- **Why it matters for Maya:** long English passages are harder to read ragged-left, which matters for exam-style
  reading.
- **Recommendation:** give `lang="en"` blocks `text-align: left` (or `start` with `dir="ltr"` on the block, not only
  the inline span). Start tables of English content scrolled to their LTR start.

**M10. A whole level is skipped on four questions, and the path makes it look completed.** *Minor. `#/placement`, `#/path`, phone.*
- **Observed:** 4/4 correct at B1, one item per skill, marks all 12 B1 lessons "placed out". The path tab then reads
  "B1 12/12" in the same style as completed levels. The result screen honestly shows "(2 items)" per skill, but
  nothing invites her to check B1. Screenshots: `shots/m08-placement-result.png`, `shots/m11-path-phone.png`.
- **Why it matters for Maya:** B1 grammar such as present perfect vs past simple is core Bagrut material. She may
  believe she has covered it.
- **Recommendation:** count placed-out lessons separately on level tabs (for example "B1 · skipped 12"). On the
  result screen, offer "Check B1 quickly" (the level check) when a level was passed on 4 items.

**M11. The Reading centre starts with beginner texts.** *Polish. `#/reading`, phone.*
- **Observed:** the list starts at Pre-A1 ("A message from Kate", 32 words). A B2 learner scrolls about 3.5 screens
  to reach her level, although the "Next text" button does pick a level-appropriate text. Screenshot:
  `shots/m31-reading-phone.png`.
- **Recommendation:** anchor or scroll to the recommended level group, or list it first.

**M12. Progress shows "0 active minutes" after a full session.** *Minor. `#/progress`, phone.*
- **Observed:** after 19 exercises and a writing task in one sitting, the report says "0 דקות פעילות". Minutes are
  logged only when the tab is hidden (`sessionTick`). Screenshot: `shots/m26b-progress-phone-full.png`.
- **Why it matters for Maya:** the first progress report she sees looks like nothing counted.
- **Recommendation:** include the current open session in the minutes, or show "—" until the first session closes.

### What works well for Maya
- The placement intro is calm: "no score, no failing" and "I don't know beats guessing". The test was short (8
  items).
- Feedback after each answer explains *why*, with a Hebrew-L1 note on the error type. "Nearly there" with the
  exact threshold is honest.
- The writing editor:
  - drafts autosave;
  - the automatic checks found both of her real slips ("more better" and a run-on);
  - the argument-structure markers carry the caveat "it does not judge the quality of the argument";
  - the AI feedback is framed as bands with "can be wrong" and a report link.
- AI features that need an account say so plainly and point to the parts that work without AI.
- Progress explains where every level comes from. That openness is exactly what exposed M2.

---

## Persona 2: Daniel (A2-B1, ADHD)

**Realistic first session.**
1. Onboarding: goals "confidence in conversation" and "everyday English", 10 minutes a day, start point "I can
   manage simple conversations".
2. Placement: interrupted after 5 questions when his phone buzzed (he tapped X).
3. Recovery through the Path's "Start from A2".
4. Lesson `a2-01`: 1 right, 1 wrong, 1 partly right, then he left with X. He reopened it from Today and then the page
   was reloaded mid-exercise.

**Return visit, next day.**
1. Text size set to 150% in Settings, with reduced motion on.
2. Resumed the lesson and finished it at 61%.
3. Then review, Real Life, Practice and Progress.

**Focus load measured at 390x844, 100% text:**

| Screen | Words | Controls | Screens of scroll |
|---|---|---|---|
| Today | 77 | 8 | 1.1 |
| Lesson intro | 132 | 4 | 1.3 |
| **Lesson "learn" stage** | **831** | 21 | **7.6** (b2-01: 1,032 words, 8.8) |
| One exercise | 34-69 | 8-16 | 1.0-1.3 |
| Feedback after a wrong answer | 108-166 | 7-15 | 1.2-1.7 |
| Lesson end | 145 | 4 | 2.7 (at 150%) |
| Practice hub | 80 | 8 | 1.4 |
| Real Life hub | 866 | 40 | 6.8 |
| Expressions | 1,104 | 107 | 11.6 |
| Conversations | 1,734 | 30 | 8.8 |
| Settings | 226 | 47 | 3.4 (6.5 at 150%) |
| Progress | 190 | 14 | 2.7 |

### Findings

**D1. The Welcome page is wider than every phone.** *Major. `#/welcome`, 320, 390 and 430 px wide (Maya sees it too).*
- **Observed:** the dual-legend keyboard is 465px wide at any phone width, because `.kc` has a minimum width of
  2.3rem and there are 10 keys per row. The document becomes 513px wide.
  - Without mobile emulation, the visible area cuts the *start* of each Hebrew line (the right side) and most of the
    "Get started" button. Only the arrow shows.
  - With mobile emulation, Chrome zooms the page out, and the zoom carried over into Today in the same tab (layout
    viewport 460-513px).
  - Screenshots: `shots/m01-welcome.png`, `shots/m01b-welcome-390-scrolled.png`,
    `shots/probe-welcome-mobile-false.png`.
- **Why it matters for Daniel:** the first screen looks broken and half the sentence is missing. That is an easy
  moment to give up.
- **Recommendation:** size keys with `min()` against the container (for example
  `width: min(3.4rem, calc((100vw - 4rem) / 10.5))`), or hide or scale the keyboard below 30rem. Add Welcome to the
  e2e overflow check at 320 and 390.

**D2. An interrupted placement silently starts him at the alphabet.** *Major. `#/placement` X to `#/today`, phone.*
- **Observed:** X in the placement player links to `#/welcome`, which redirects to Today.
  - Nothing was saved: `placement` stays empty and his "simple conversations" start choice is ignored.
  - Today's main button says "Start: The English alphabet" (Pre-A1 lesson 1).
  - There is no message that the test was not finished and no link back to it from Today, Path, Settings or Help.
    Only typing `#/placement` works.
  - He recovered only by finding "Start from A2" at the bottom of the A2 path tab, 3.3 screens down.
  - Screenshots: `shots/d01-placement-q6-before-leaving.png`, `shots/d02-after-x-in-placement.png`,
    `shots/d04b-path-a2-bottom.png`.
- **Why it matters for Daniel:** interruptions are his normal. Losing the test and being handed the ABCs feels
  insulting and confusing ("did I fail?").
- **Recommendation:** save the placement answers as he goes and treat X like the lesson X: return to Today with a
  card "Finish your placement test (5 of about 12 done)". If he never finishes, fall back to his onboarding start
  choice (`START_FOR`) rather than Pre-A1. Add a "Retake placement" link in Settings and on the Path.

**D3. "10 minutes" on Today opens a 25-minute lesson with an 8-screen explanation.** *Major. `#/today` to `#/lesson/a2-01`, phone.*
- **Observed:**
  - Today with a 10-minute budget: "about 10 minutes, What are you doing? 10 min".
  - The lesson intro then says "A2 · Lesson 1 · about 25 minutes".
  - The practice counter starts at 16 exercises.
  - The learn stage is 831 words over 7.6 screens. Each English paragraph is followed by its full Hebrew
    translation, which is the A2 "partial" support level.
  - Onboarding promised "Your daily plan fits this time."
  - Screenshots: `shots/d06-today-10min.png`, `shots/d07-lesson-intro.png`, `shots/d08-lesson-learn.png`.
- **Why it matters for Daniel:** a plan that undersells the time by 2.5x is the classic way an ADHD learner starts
  something, runs out of focus halfway and feels he failed the day.
- **Recommendation:**
  - Split lessons into parts of about 5-8 minutes, for example learn, practice 1-6, practice 7-11 and use.
  - Make the Today block "Part 1 of 3 · 8 min", with a natural stop and a "done for today" state at each part.
  - Show the real remaining time.
  - In the learn stage, show one block at a time with "next" (a stepper), not one long page.

**D4. Feedback after a wrong answer is squeezed into a narrow column, and at 150% it becomes unreadable.** *Major. `#/lesson/*` practice, phone.*
- **Observed:**
  - On phone the result footer keeps two columns. The Continue button takes about 40% of the width, so the verdict
    text wraps in about 220px.
  - A simple wrong multiple-choice answer produces 4 stacked blocks (correct answer, Hebrew why, English why, error
    tag with Hebrew note, then the rule again in both languages). That is about 108 words covering the options.
  - A wrong sorting answer prints the whole key as one bold run-on line with arrows.
  - At 150% text the column is about 110px, one or two words per line.
  - Screenshots: `shots/d10-ex1-wrong.png`, `shots/m23-ex1-wrong-cat.png`, `shots/d27-wrong-feedback-150.png`;
    desktop for comparison: `shots/d51-wrong-feedback-desk.png`.
- **Why it matters for Daniel:** right after a mistake is when his attention is most fragile. A wall of narrow text
  hides the question he just answered.
- **Recommendation:**
  - Below 48rem, stack the footer: verdict full width, Continue full width under it.
  - Lead with one line ("✗ The answer is *is talking*") and fold the explanation behind "Why?", open by default only
    on desktop.
  - Show only one language at a time per the support level.
  - Render sorting answers as two short lists.

**D5. 150% text breaks Today and the speaking exercise.** *Major. `#/today`, `#/lesson/a2-01` speak item, phone at 150%.*
- **Observed:**
  - On Today the page scrolls sideways. The orange button and the title are cut, and the minute selector wraps to
    two rows.
  - On the `speak` item the prompt ("Say the question and the answer out loud") and the right side of the screen are
    cut off.
  - Settings becomes 6.5 screens long.
  - Screenshots: `shots/d23-today-150.png`, `shots/d26-stuck-15-19.png`, `shots/d22-settings-150.png`.
- **Why it matters for Daniel:** larger text is one of the few comfort settings he would use. It should never make
  screens harder.
- **Recommendation:** fix the `nowrap` keys (see M1) and give the speak layout `min-width: 0` and wrapping. Add 150%
  text to the e2e overflow sweep.

**D6. "Practise again" restarts the full lesson, and a speaking item can be what tips it.** *Major. `#/lesson/a2-01` end, phone.*
- **Observed:**
  - At 61% ("Nearly there") the only forward action is "Practise again". It reloads
    `?stage=practice` with all 16 exercises, including those he got right.
  - The two `speak` attempts he could not do aloud counted as wrong (see M4).
  - Screenshot: `shots/d28-lesson-end-150.png`.
- **Why it matters for Daniel:** repeating 16 items to fix 4 is the kind of open-ended task he abandons.
- **Recommendation:** offer "Practise the 4 I missed (about 3 min)" as the primary action. Let a lesson pass once
  the missed items are fixed on a later try. Apply the "can't speak now" fix from M4.

**D7. The exercise counter's total grows after mistakes and reads backwards in RTL.** *Minor. `#/lesson/*`, phone.*
- **Observed:**
  - The total grows with every wrong answer (4/17, then 7/18, 12/19, 20/20) because retries are appended to the
    queue.
  - In the RTL header the counter renders visually as "16 / 2" and "19 / 15". Onboarding shows "4 / 2" for step 2
    of 4.
  - Screenshots: `shots/d10-ex1-wrong.png`, `shots/d26-stuck-15-19.png`, `shots/crop-ob-counter.png`.
- **Why it matters for Daniel:** a finish line that moves away after each mistake is demotivating, and he has to
  stop and decode which number is which.
- **Recommendation:** keep the denominator fixed at the lesson's exercises and show retries as "+1 to review". Write
  the counter as words ("2 מתוך 16"), as the Today card already does, or isolate it LTR.

**D8. After an interruption, Today shows three ways into the same lesson.** *Minor. `#/today`, phone.*
- **Observed:** the orange primary button still says "Start: What are you doing?". Below it is a separate "Continue
  where you left off" card, and below that the plan row for the same lesson. The card text breaks as "What are you
  doing? • exercise 4", then the Hebrew title, then "of 17" on the next line. Screenshots:
  `shots/d12-today-after-exit.png`, `shots/crop-continue-card.png`.
- **Why it matters for Daniel:** he needs one obvious next step. Three similar entries with different wording
  create doubt about which one keeps his place. The primary button actually opens the intro, which then offers to
  resume.
- **Recommendation:** when a resume exists, make the primary button "Continue: What are you doing? (4 of 16)" and
  link it straight to `?resume=1`. Drop the separate card, or merge it into the plan row. Keep "exercise 4 of 16" on
  one line.

**D9. The learn stage opens partway down the page.** *Minor. `#/lesson/a2-01`, `#/lesson/a2-02`, phone.*
- **Observed:** after "Let's learn", `scrollY` is about 206px. The lesson title and the first paragraph are above
  the fold, so he lands mid-explanation. Screenshots: `shots/d08-lesson-learn.png`, `shots/d08c-learn-top-check.png`.
- **Why it matters for Daniel:** he loses his bearings at the moment he is asked to read the most.
- **Recommendation:** scroll to the top on every stage change and move focus to the stage heading.

**D10. Hebrew support doubles the reading, and its order flips between sessions.** *Minor. `#/lesson/*` learn, phone.*
- **Observed:** at A2 the default "partial" support prints every explanation twice (English, then the full Hebrew).
  The stage was rendered Hebrew-first right after the level move and English-first after a reload. The support
  level is not re-applied after `moveToLevel` or a placement until settings change or the page reloads.
  Screenshots: `shots/d08-lesson-learn.png` (Hebrew first), `shots/d08c-learn-top-check.png` (English first).
- **Why it matters for Daniel:** twice the text per idea, and the layout changes under him between days.
- **Recommendation:**
  - Call `applySupport()` after `moveToLevel` and `applyPlacement`.
  - For "partial", consider Hebrew on tap for whole paragraphs, keeping full Hebrew for short rules and warnings.
  - Offer a "short explanations" switch in Settings next to text size.

**D11. The Real Life lists are very long.** *Minor. `#/real-life`, `#/expressions`, `#/conversations`, phone.*
- **Observed:**
  - Expressions is 11.6 screens with 107 controls.
  - Conversations is 8.8 screens with 1,734 words.
  - Real Life is 6.8 screens.
  - The filter chips on Real Life and the tabs inside a scenario help.
  - Screenshots: `shots/d40-real-life-100.png`, `shots/d43-expressions.png`, `shots/d31-reallife-150.png`.
- **Why it matters for Daniel:** these are the "conversation" areas he chose. Long scroll lists are where he drifts.
- **Recommendation:** show a "recommended for you (3)" strip first and collapse the rest by topic, the way the
  Writing lab collapses stages. Add filter chips to Expressions as well.

**D12. Hebrew sentences that contain English break apart.** *Polish. `#/lesson/a2-01` learn, phone.*
- **Observed:** punctuation and fragments land in the wrong place, for example "I'm working at the moment. אבל
  ,work every day" and "ing. ובפועל עם am/is/are-ב". Screenshot: `shots/d08-lesson-learn.png`.
- **Why it matters for Daniel:** every misplaced comma costs a second of decoding.
- **Recommendation:** extend `isolateLatin()` so it wraps each Latin run, including its trailing punctuation, in
  `<bdi>`. Add a visual regression on one Hebrew-with-English paragraph.

### What works well for Daniel
- **Resuming a lesson is solid:**
  - X leaves at once, with no nagging dialog.
  - Today offers "Continue where you left off · exercise 4".
  - Resume survives a page reload and a next-day return with the exact place and earlier first-try scores kept.
  - Screenshots: `shots/d13-resumed.png`, `shots/d14-after-reload.png`, `shots/d20-day2-today.png`.
- **Respectful pressure:**
  - No streak to lose; the copy says "a day off erases nothing".
  - No points for time and no timers.
  - Reduced motion is respected (`prefers-reduced-motion` in css/app.css), and the welcome keyboard animation plays
    once at most.
- **One exercise per screen:** a clear Check / Continue rhythm, Enter and 1-4 shortcuts, and focus moves to
  Continue after checking.
- **Desktop Today is calm:** one primary button, one plan row, two side panels
  (`shots/d50-today-desk.png`).
- **Honest AI gating:** the scenario "AI conversation" tab and the tutor say an account is needed and point to the
  scripted practice that works without one.

---

## The 5 most important fixes (for these personas)

1. **Remove horizontal overflow on phones.** The Welcome keyboard is 513px wide at every phone width, the Today
   primary button does not wrap (`.key { white-space: nowrap }`), and the speaking exercise breaks at 150% text.
   Add 320, 390 and 150%-text overflow checks to e2e. (M1, D1, D5)
2. **Stack and shorten answer feedback on phones.** Put the verdict full width with Continue below. Lead with one
   line and put "Why?" behind a toggle, in one language. Never squeeze it into a side column, which at 150% becomes
   one word per line. (D4)
3. **Make sessions match the time promised.** Split lessons into parts of about 5-8 minutes with real time
   estimates and natural stops. Turn the long learn page into a stepper. Make "Nearly there" offer "practise the
   ones I missed" rather than all 16. (D3, D6)
4. **Never score what the learner could not do.** Add "Can't speak right now" to speaking items. Keep skipped or
   ungraded items out of the pass score and out of the retry queue. Today a silent library or bus costs a lesson
   pass. (M4, D6)
5. **Make placement resumable and its results honest.**
   - An interrupted test should come back as "Finish your placement" and should fall back to the learner's own
     start choice, not Pre-A1.
   - Skills the test never measured (speaking, writing) must show "—", not a borrowed B1.
   - Show evidence counts next to levels on Today.
   - Related: Today must not send the learner to a lesson that is still being written. (D2, M2, M3)
