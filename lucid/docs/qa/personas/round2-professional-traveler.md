# Persona review, round 2: young professional and family traveller (simulated)

> **This is a simulated persona review (round 2).** An AI played two invented personas and drove the app with
> Playwright. No real people took part. The "reactions" below are reviewer judgement from two points of view, not
> user data or research findings, and must not be quoted as such. Every finding is backed by a screen I observed
> (screenshot path) or by the code that produces it.

- **Date:** 2026-10-31
- **Reviewer key:** `professional-traveler`
- **Build:** working tree at `f8a202c` ("Close remaining fix items; fix log"; only untracked docs on top), served
  statically at `http://127.0.0.1:8803/`.
- **Personas:**
  1. **Yael, 25.** Junior product manager, around B1-B2. She needs workplace English (emails, meetings, small talk
     with foreign colleagues) and has 15-20 minutes a day on her phone during her commute.
  2. **Moshe, 35.** Planning a family trip to London and New York, around A2. He wants travel situations and casual
     expressions without embarrassing himself, and will use his phone abroad, possibly offline. He uses 130% text.
- **Round 1 report:** `round1-professional-traveler.md`. Fix log: `../fix-log.md`, rows P-48 to P-69 (the mapping is
  in the verification table). I did not take the fix log's status on trust: every row below was re-tested in the app.

## Method

- Chromium through Playwright, `locale: he-IL`, `timezoneId: Asia/Jerusalem`, reduced motion, touch at phone sizes.
  Sizes: **390x844** for both personas' sessions, **320x640** where layout matters (welcome, Today at 130-150% text,
  Real life, a scenario, Expressions, Settings, a lesson) and **1440x900** for Today, a lesson explanation, Real life,
  scenario practice and Expressions. I opened and looked at every screenshot cited here.
- Placement answers were simulated from each persona's true level, using the same policy as round 1 so the results
  compare: Yael right on everything through B1, 3 of 4 right in every B2 block, "I don't know" at C1. Moshe right at
  Pre-A1 and A1 except one listening item, 50% at A2, "I don't know" above.
- Lessons were answered with deliberate right and wrong answers chosen from the lesson JSON (Yael, `b2-01`: 3 wrong,
  speaking skipped with "Can't speak right now", a writing item; Moshe, `a2-01`: 4 wrong, one hint, speech
  recognition failing with a network error, then self-rating).
- Days were simulated with Playwright's clock (Yael: Monday morning commute, the evening, and the next morning;
  Moshe: Sunday evening, Monday evening, and Wednesday evening). Learner data was carried between scripts with the
  store's own `snapshot()` / `replaceAll()`.
- Accounts and AI used the mock Supabase and `lucid-ai` from `tests/e2e/run.mjs` (`installMockServer`). AI text is
  canned, so only the flow, the presentation and the honesty of the UI were judged.
- Speech recognition was replaced by a scripted fake (to produce a "network" failure). Speech synthesis has no voices
  in headless Chromium, so audio playback was not judged.
- Offline: the service worker was allowed (127.0.0.1 is a secure context, so `sw.js` registers as in production).
  Moshe used Settings, "Offline use", "Save all lessons on this device", then the browser context was taken offline
  and 14 routes were opened, including screens and lessons never visited before, and the page was reloaded.
- An unwritten lesson was simulated (`b2-03` removed from `content/manifest.json` and its file returning 404),
  because every lesson is now written.
- **Routes visited:** `#/welcome`, `#/start`, `#/placement?start=comfortable`, `#/placement?start=basics`, `#/today`,
  `#/path`, `#/path/B1`, `#/path/B2`, `#/lesson/b2-01`, `#/lesson/b2-02`, `#/lesson/b2-03` (simulated unwritten),
  `#/lesson/b1-01`, `#/lesson/a2-01`, `#/lesson/a2-05` (offline), `#/review`, `#/progress`, `#/practice`,
  `#/drill?topic=travel-functional`, `#/drill?topic=social-functional`, `#/real-life`, `#/conversations`,
  `#/scenario/rl-social-party-small-talk` (practise and AI roleplay), `#/scenario/rl-airport-checkin-overweight`
  (prepare, practise, AI roleplay with help), `#/scenario/rl-airport-arrival-immigration`,
  `#/scenario/rl-emergency-pharmacy-symptoms`, `#/scenario/rl-emergency-lost-passport` (offline),
  `#/scenario/rl-transport-taxi?tab=roleplay` (offline), `#/scenario/rl-hotel-checkin-basics` (desktop),
  `#/expressions`, `#/writing/free` (automatic check and AI feedback), `#/tutor`, `#/tutor?mode=travel`,
  `#/speaking`, `#/help`, `#/settings`, `#/account?mode=signup`.
- **Scripts, logs and screenshots:**
  `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/personas-r2/professional-traveler/`
  (`yael1-4.mjs`, `moshe1-4.mjs`, `verify.mjs`, `verify2.mjs`, `drill.mjs`, `donecheck.mjs`, `lib.mjs`, a `.log`
  per script). Screenshots are in its `shots/` folder and are cited below as `shots/...`. These are session scratch
  files and are not committed. No file under the app was changed except this report.

Severity scale: **blocker** (the persona cannot reach their goal or loses work), **major** (a serious obstacle or an
honesty problem), **minor** (friction with a workaround), **polish**.

---

## Step 1: verification of round 1 findings

| R1 | Fix log | Finding (short) | Verdict | What I observed in round 2 |
|---|---|---|---|---|
| Y1 | P-48 | After "Start from B2", finished lessons were never recorded (blocker) | **Resolved** | Path B2, "Start from B2", confirm, then `b2-01` with 3 wrong answers: "Lesson completed, 79% on the first try". The stored row is `{status: "completed", best_score: 0.79}` with no `_deleted` flag. Today moved on to `b2-02` with a "Lesson completed today" tag, Progress shows "Lessons completed: 1", and the Path row shows 79%. The same holds after the new "Start at B2" button on the placement result. `shots/y-39b-lesson-review-full.png`, `shots/y-40-today-after-lesson.png`, `shots/crop-y41-a.png`, `shots/v-y2-after-start-at-B2.png`; log `yael2.log`. |
| Y2 | P-49 | Placement over-placed on little evidence and started her on the academic track | **Partly resolved** | The test now asks 16 items and confirms B2 with a second block (6 of 8) before claiming it. The result says "You showed control up to B2, over two sets of questions" and offers a one-tap "Start at B2" plus a B2 level check, which works and lands on "Narrative tenses" (`shots/y-12-placement-result.png`, `shots/v-y2-after-start-at-B2.png`). **Remains:** with the same steady 75% at B2 and a "work" goal, the default is still C1 "Advanced: academic argument", starting with "Academic vocabulary and nominalisation" (`shots/y-21-today-full.png`, `shots/y-22-path.png`). Goals are not weighed, and the start is still one level above what she showed. |
| Y3 | P-50 | Speaking and writing got levels with no evidence | **Resolved** | Placement result: "Speaking: not measured by this test", "Writing: not measured by this test". Today and Progress: "not yet assessed", with "Lucid does not assess speaking level" and "from texts that got AI feedback" (`shots/y-12-placement-result.png`, `shots/y-21-today-full.png`). See new finding N6 for a related but different gap. |
| Y4 | P-51 | Today scrolled sideways on a phone with a long lesson title | **Resolved** | `scrollWidth` equals the viewport with "Academic vocabulary and nominalisation" at 390 (100%), and with a C1 learner at 150% at 390 and 320. Moshe's Today at 130% is 390 wide. The Start button wraps to two lines (`shots/y-20-today.png`, `shots/m-67-today-130.png`; logs `yael1.log`, `verify2.log`). |
| Y5 | P-52 | Welcome page 513px wide at 390, Start button cut | **Resolved** | 390 and 320 wide, with the headline, language switch and "Let's start" fully on the first screen (`shots/y-00-welcome-390.png`, `shots/y-00-welcome-320.png`). |
| Y6 | P-53 | The "Work" goal is offered but nothing responds to it | **Partly resolved** | Onboarding is now honest: under "Work" it says "Lucid has no workplace content yet, so for now this only shapes the AI tutor" (`shots/y-02-ob-step2.png`), and the tutor request carries her goals. **Remains:** there is still nothing for work. Expressions searches for "email", "meeting", "deadline" and "circle back" return 0 of 50, and Real life has no work module (`yael3.log`). Free writing still checks a work email as an argumentative essay: the "Argument structure" checklist (thesis, evidence, counterargument, rebuttal, conclusion) is all unticked, "The text ends with punctuation" is flagged because the email ends with her name, the status line says "no known problems" next to that warning, and "yet" in "isn't ready yet" and "next" in "next sprint" are listed as contrast and sequence linkers (`shots/y-63-free-check.png`, `shots/crop-y63-b.png`). The AI feedback request for that email is sent as `kind: "essay"` (`yael4.log`), so a real model would judge it as an essay. |
| Y7 | P-58 | English right-aligned inside Hebrew screens; English tables right to left | **Resolved** | Lesson explanations, rules, questions and "Key points" are left-aligned LTR blocks with the check icon on the line. Tables run left to right from their first column, at 390 and 1440 (`shots/crop-y34-a.png`, `shots/crop-y34-b.png`, `shots/y-39b-lesson-review-full.png`, `shots/y-d-lesson-learn.png`). Small remainders are listed under polish (P1, P5). |
| Y8 | P-59 | Feedback footer cramped; categorize answer key covered the exercise | **Resolved** | Below phone width the verdict is full width, with a full-width Continue under it and "Why?" folded. A wrong sort marks each chip in place and lists the misplaced items by category with "0 of 8 in place" (`shots/y-37-e2.png`, `shots/y-37-e4.png`, `shots/y-37-e12.png`). |
| Y9 | P-60 | Free-reply check was keyword matching that read like a judgement | **Resolved** | Her workplace reply "Hi, I work with Dana on the product team. How do you know her?" now gets "Your reply has a question back, which keeps the conversation going", the examples, and "This check only looks for key words. It does not check grammar or whether the wording is natural." The button is "Compare" (`shots/y-53-party-own.png`). |
| Y10 | P-61 | Unwritten lessons hard to spot; misleading "not available on this device" | **Resolved** | Simulated with `b2-03`: the path row reads "בהכנה" (in preparation) and is not a link. Opening it says "This lesson is still being written, so you can't open it yet", with a button to the next ready lesson (`shots/v-y10-path-unwritten.png`, `shots/v-y10-lesson-unwritten.png`). |
| Y11 | P-62 | "Exercises by day" chart never drew its bars | **Resolved** | Monday's bar is 90px tall and empty days are 2px baselines (`shots/crop-y41-a.png`; measured in `yael3.log`). |
| Y12 | P-63 | Free-writing check results off-screen on a phone | **Resolved** | After "Automatic check" the results panel is scrolled into view at 390 (`shots/y-63-free-check.png`). |
| Y13 | P-69 | Polish: path title alignment, placeholder ellipsis, lingering toast | **Partly resolved** | Fixed: the Hebrew placeholder in English fields now reads correctly ("כתבו הודעה…", `shots/y-83-tutor-reply.png`), and step counters read "4 מתוך 16". **Remains:** on Path B2, one-line English titles still sit on the right and wrapped ones on the left (`shots/y-30-path-B2.png`; measured offsets in `yael4.log`). The "Path updated" toast still covers the first exercise of the next lesson when she starts it within 3 seconds of moving level (`shots/v-y13-toast-in-lesson.png`). |
| M1 | P-54 | Offline, only screens opened before the trip worked | **Partly resolved** | The core problem is fixed. Settings has an "Offline use" section that says what works offline and what needs a connection (AI, speech recognition). "Save all lessons on this device" finished in under a second on localhost with "All 75 lessons are saved. You can study offline." Offline, all 14 routes worked, including an unvisited lesson's practice, review, Conversations, Settings, an unvisited emergency scenario, Expressions, the tutor notice and Help, and so did a reload (`shots/m-79c-settings-offline-done.png`, `shots/m-80-offline-*.png`, `shots/m-81-offline-lesson-practice.png`, `shots/m-82-offline-reload-today.png`; `moshe3.log`). **Remains:** the save button exists only in Settings. Real life, Today and Help say nothing about preparing for a trip, and the phone layout still has no offline indicator (the only status, `#sync-status`, sits in the desktop sidebar and is hidden on the phone). |
| M2 | P-55 | Mixed Hebrew and English lines came out scrambled | **Resolved** | Scenario feedback is now an LTR quote line per option with its own feedback block under it (`shots/m-32-practise-poor.png`, `shots/m-d-hotel-practise.png`). Today's button reads "להתחיל: What are you doing?" in the right order (`shots/m-20-today.png`). The Expressions gloss for "Can I get…?" reads in order (`shots/m-d-expr-canIget.png`). |
| M3 | P-56 | The travel goal did not shape the daily plan | **Resolved** | Each day Today names one real scenario with a direct link and the reason "You chose travel: one travel situation at your level": "Check-in: an overweight bag", then "Passport control and customs on arrival", then "Finding your gate" (`shots/m-20-today.png`, `shots/m-85b-return-today-full.png`). There is no trip-date weighting, which was optional. |
| M4 | P-57 | Speaking items could only be skipped as "I don't know" when recognition failed | **Resolved** | With recognition failing ("network"), the item shows "Speech recognition needs an internet connection in this browser…", with "I said it clearly" / "I need more practice" and "Can't speak right now" next to it. The summary says "speaking and writing exercises are practice and do not count towards the score" (`shots/m-63-speak-14.png`, `shots/m-65-lesson-review.png`). A one-time microphone notice explains the browser's speech service (`shots/m-63a-mic-notice.png`). |
| M5 | P-64 | Real life was one long list; Airports icon was a placeholder | **Resolved** | Airports has a plane icon. There is a "Start here" strip of three scenarios at or below his level in goal order, a level guide ("Your level on the path: A2…"), a fit label on each row, Emergencies third, and topics folded to two with "Show all 5" (`shots/m-30-reallife.png`, `shots/m-30b-reallife-full.png`). |
| M6 | P-65 | Scenario explanation off-screen after choosing a reply | **Resolved** | After a tap the explanation is scrolled into view at 390 (`shots/m-32-practise-poor.png`, `shots/y-52-party-wrong.png`). See polish P4. |
| M7 | P-66 | Practice end pointed to AI that was not available | **Resolved** | The end screen says "You chose the most natural reply 2 times out of 5", explains in plain words why AI is not available ("Sign in to talk with the AI" or "…not available on this site yet"), and makes "Next scenario: Passport control…" the main button (`shots/m-34-practise-done.png`, `shots/m-87-passport-done.png`). |
| M8 | P-67 | "Lesson completed today" next to a failed lesson | **Resolved** | After a failed lesson plus a finished scenario on the same day, there is no tag. After Yael's real lesson pass, the tag appears (`shots/m-88-today-after-scenario.png`, `shots/y-40-today-after-lesson.png`; `moshe4.log`). See N4 for a different false "done". |
| M9 | P-68 | Expressions not ordered for a beginner traveller | **Resolved** | For A2 the list sorts by level ("Brilliant (UK)", "Can I get…?", "Cheers"…), with a "For my level" filter and a sort toggle. "mate" now finds only "Mate" (`shots/m-50-expressions.png`; `moshe1.log`). |
| M10 | P-69 | Polish: "server" jargon, ambiguous counters, Settings wrapping | **Partly resolved** | Fixed: counters read "1 מתוך 5", and the scenario and Conversations notices are plain ("Free conversation with AI is not available on this site yet"). **Remains:** the tutor still says "works only on a server where the AI service is configured", and Free writing says "AI feedback is not configured on this server" (`shots/m-80-offline-tutor_mode_travel.png`, `shots/y-63b-free-check-full.png`; `js/views/tutor.js`, `js/views/essay.js`). In Settings at 390, "Off" in Hebrew explanations still wraps onto its own line, and so do the last options of "Corrections" and "Writing feedback" (`shots/crop-y81-a.png`, `shots/crop-y81-b.png`). |

**Summary:** of the 23 round 1 findings, 18 are resolved and 5 are partly resolved (Y2, Y6, Y13, M1, M10). None is
unresolved and none has regressed. The blocker (Y1) is fixed.

---

## Step 2: fresh sessions, new findings

**Yael's first session (Monday commute, 390):** Welcome, onboarding (work and conversation, 20 minutes, "fairly
comfortable"), a 16-question placement, then Today. Today offered C1 academic vocabulary, so she moved to B2 from the
Path and did "Narrative tenses" with 3 mistakes, skipped the speaking item ("on a bus") and wrote a short text. Then
Today, Progress, Path, party small talk in Real life (a so-so reply, her own words, then the rest), "I'm swamped" in
Expressions, and a work email in Free writing. **Evening (1440):** Today and the next lesson's explanation. **Return
visit (next morning, 390):** Today, 12 review cards (4 wrong), sign-up, AI consent, a tutor question about pushing back
on a deadline, AI feedback on her email, and an AI roleplay at the party.

**Moshe's first session (Sunday evening, 390):** onboarding (travel and everyday, 20 minutes, "I know some basics"),
placement, Today, Real life, the check-in scenario from Today's link (a rude reply, his own words, the rest),
Emergencies, and Expressions. **Second sitting (Monday, 390 at 130%):** lesson A2-1 with 4 mistakes, a hint and failing
speech recognition, then Settings (British English, 130%), Today, Progress, Path and Real life at 130% (also at 320).
**Before the trip:** Settings, "Offline use", then offline. **Return visit (Wednesday, 390 at 130%):** Today after
"Nearly there", passport control practice, sign-up, AI roleplay at check-in with help, and the travel tutor. **Desktop:**
Today, Real life, hotel practice and Expressions.

### N1. Major (both): Today's "Targeted practice" block for travel or social situations opens an empty page
- **Where:** `#/today` → `#/drill?topic=travel-functional` (Moshe) and `#/drill?topic=social-functional` (Yael). Also
  `#/practice` → "Recommended now". Seen at 390 and 1440.
- **Observed:** After one scripted scenario practice where some replies were "ok" rather than "best", the next day's
  plan gained "Targeted practice: Travel and service situations · a topic that isn't solid yet · 4 min" (Moshe) or
  "Targeted practice: Social conversation" (Yael). Tapping it shows only "No exercises for this topic yet. Exercises
  come from the lessons available so far…" and a "To practice" button (`shots/m-85b-return-today-full.png`,
  `shots/m-89-drill-travel.png`, `shots/y-44-drill-social.png`, `shots/y-d-today.png`). The Practice hub recommends the
  same dead end ("Travel and service situations, mastery 57% from 5 answers", `shots/m-89b-practice-hub.png`).
- **Cause (code):** `scenario.js` records each scripted choice as an attempt on topic `travel-functional` or
  `social-functional` (score 0.5 for an "ok" reply). `weakTopics()` in `js/core/adaptive.js` then picks the topic
  (3+ answers, under 70%), and `dailyPlan()` adds a `practice` block that routes to `drill?topic=…`. `drillSet()` has no
  lesson exercises for those topics. The block counts as done only after a `drill` event, which can never happen here,
  so "You've finished today's plan" cannot appear while the block is there.
- **Why it matters:** These two topics are exactly what both personas came for. Four of the 20 planned minutes lead
  nowhere, the lesson block shrinks to make room (Yael's lesson went down to "up to exercise 2 of 16",
  `shots/y-d-today.png`), and the plan can never be finished. Choosing an acceptable but less natural reply, which is
  how you learn in scripted practice, is what triggers it.
- **Recommendation:** Do not add a `practice` block for a topic that `drillSet()` cannot fill. For the functional
  topics, point the block at the scenario with the lowest share of "best" replies ("Practise again: Check-in"), which
  reshuffles the replies. Consider counting "ok" replies as practice, not as half-wrong evidence. Add an e2e check that
  every link in the daily plan opens content.

### N2. Minor (Moshe): after "Nearly there", the "practise only what I missed" shortcut is lost once he leaves
- **Where:** `#/lesson/a2-01` review → "Later" → `#/today` → Start. At 390, 130%.
- **Observed:** The review screen offers "Practise the 4 I missed · about 6 min" (`shots/m-65-lesson-review.png`). Two
  days later, Today's main button is "Start: What are you doing?" with "up to exercise 6 of 16", and it opens the lesson
  intro. The intro has no "missed exercises" option, so "Skip to practice" runs all 16 again
  (`shots/m-85-return-today.png`, `shots/m-86-lesson-intro-after-nearly.png`). `today.js` and `adaptive.js` never read
  `progress.missed`.
- **Why it matters:** A busy parent who taps "Later" at night is sent back through a 25-minute lesson he has mostly
  done, instead of the 6 minutes that would complete it.
- **Recommendation:** When a lesson has `missed`, have Today say "Finish *What are you doing?*: fix the 4 you missed
  (about 6 min)" and link to `?stage=missed`. Show the same choice in the lesson intro.

### N3. Minor (Moshe): "70% on the first try. You need 70% to complete" on a lesson that did not complete
- **Where:** `#/lesson/a2-01` review, at 390.
- **Observed:** The heading is "Nearly there", but the text reads "70% on the first try. You need 70% to complete"
  (`shots/m-65-lesson-review.png`). The stored score is 0.696: one right answer after a hint counts 0.75.
  `pctText = Math.round(score * 100)` in `js/views/lesson.js` rounds it up to the pass mark.
- **Why it matters:** It reads as a contradiction, or as an unfair rule. The hint he was encouraged to use is what cost
  him the pass, and nothing says so.
- **Recommendation:** Round down whenever the score is below the pass mark ("69%"). Add one line under it, such as "A
  right answer after a hint counts as ¾."

### N4. Minor (both): Today marks a scenario the learner never opened as done
- **Where:** `#/today` "From real life" block. Seen at 1440 (Yael) and 390 (Moshe).
- **Observed:** After Yael finished "Small talk at a party", the block changed to "Invitations: accepting, declining
  and rescheduling", greyed out with a check (`shots/y-d-today.png`). After Moshe did passport control, it showed
  "Finding your gate for a connecting flight" as done (`shots/m-88b-today-scenario-done-block.png`; `donecheck.log`).
- **Cause (code):** `isDone()` in `js/views/today.js` checks whether a scenario of that kind was done today, while the
  plan has already moved on to the next scenario not yet done.
- **Why it matters:** It is a small false record, in the one screen that promises honest progress. Moshe may skip
  "Finding your gate" because he thinks he did it.
- **Recommendation:** When the block is done for today, show the scenario actually done ("Done: Passport control"),
  or keep the next scenario unticked and labelled "for tomorrow".

### N5. Minor (Yael): the lesson player never marks the end of "today's part"
- **Where:** `#/today` → `#/lesson/b2-01`, at 390.
- **Observed:** Today says "The whole lesson takes about 25 minutes, so today is a part: up to exercise 9 of 16. Leave
  any time…" (`shots/y-32-today-after-move.png`). In the player, the counter went from "9 of 16" to "10 of 16" with no
  stop or message (`yael2.log`). The plan's `upto` is never passed to the player. The teen round 2 review saw the same.
- **Why it matters:** Yael plans by her commute. Without a stopping point, a 16-minute plan becomes 25 minutes, or she
  has to count the exercises herself.
- **Recommendation:** Pass `upto` to the lesson. At that exercise, show "Today's part is done. Stop here (your place is
  saved) or keep going."

### N6. Minor (Moshe): skill levels from placement can be higher than the level the test confirmed
- **Where:** `#/placement` result, then `#/today` "Level by skill", at 390.
- **Observed:** The headline says "You showed control up to A1… We'll start at A2", yet Grammar and Reading show **A2**
  "(2 items at this level)" (`shots/m-12-placement-result.png`). He got 4 of 8 at A2, so A2 was not confirmed overall.
  `placementSkillEstimate()` in `js/core/adaptive.js` gives a skill a level from 2 items at 75%, with no link to the
  confirmed overall level.
- **Why it matters:** The overall level now needs two passing blocks, but a skill can claim a higher level from two
  answers. That undercuts the "level only with evidence" message the app otherwise keeps well.
- **Recommendation:** Cap each skill's placement estimate at the confirmed overall level, or show it as "A2 on 2
  questions (not confirmed)".

### Polish
- **P1 (both):** The Today glyph for "Targeted practice" (and the recurring-mistake rows in Practice) is a plain
  circle, because `icon('target')` does not exist in `js/ui/icons.js` and falls back to `circle`. This is the same
  class of bug as round 1's Airports icon, and the circle looks like a "not started" mark
  (`shots/crop-m85-target.png`). Use the existing `practice` icon.
- **P2 (both):** On Today's path rail, the "A1" and "Pre-A1" labels collide ("A1Pre-A1") at 1440 and at 130% on a
  phone (`shots/crop-m85-rail.png`, `shots/y-d-today.png`).
- **P3 (Yael):** 4-column lesson tables at 390 scroll sideways inside their frame, and the "Example" column is cut at
  the edge with no hint that it scrolls (`shots/crop-y34-a.png`). Add a fade or a "scroll" cue, or stack the rows as
  cards below 30rem.
- **P4 (both):** Once scenario practice scrolls to the explanation, the reply the learner chose is no longer on screen
  and is not quoted, so "It works, but there is a more natural way" is read without its subject
  (`shots/y-52-party-wrong.png`). Quote the chosen reply at the top of the explanation, as the other replies are quoted.
- **P5 (Moshe):** In roleplay help, the English goal follows the Hebrew label "המטרה:" as right-aligned, ragged text
  (`shots/m-91-roleplay-help.png`). Put the English goal in its own LTR block.
- **P6 (Moshe, 130%):** On scenario screens, the first phone screen goes to a three-line top-bar title and wrapped
  tabs ("AI conversation" on its own line) (`shots/m-80-offline-scenario_rl-emergency-lost-passport.png`).
- **P7 (Moshe):** The placement result's footnote about C1, C2 and "B2+" is shown to an A1-A2 learner, where it is
  noise (`shots/m-12-placement-result.png`).
- **P8 (Yael):** In the roleplay report, "you said" is right-aligned while the better version under it is
  left-aligned (`shots/y-92-roleplay-report.png`).

### What now works well
- **Progress is trustworthy again.** Moving down a level, finishing a lesson and coming back next day all record
  correctly in Today, Path and Progress, and the chart draws (Y1, Y11).
- **Placement is more careful and offers a way out.** Two blocks are needed before a level counts, untested skills
  say "not measured", and "Start at B2" is one tap on the result screen (Y2, Y3).
- **Phone layout holds up.** No sideways scroll on any screen I measured at 390 or 320, including 130-150% text.
  Lesson feedback is full width with "Why?" folded, and English reads left to right (Y4, Y5, Y7, Y8).
- **Travel is now in the daily plan.** For Moshe, Today names a specific airport scenario each day with a direct
  link. Real life opens with three scenarios at his level, and Expressions sorts for a beginner (M3, M5, M9).
- **Offline is ready for a trip.** One button in Settings saves all 75 lessons, the copy says plainly that AI and
  speech recognition need a connection, and everything else worked offline, including screens never opened (M1).
- **Speaking never blocks a lesson.** A recognition failure shows a plain message, self-rating is always there,
  "Can't speak right now" skips without penalty, and speaking is left out of the score (M4).
- **Scripted practice is honest and useful.** Each other reply is quoted on its own LTR line with feedback in English
  and Hebrew. The own-words check says it only looks for key words and credits a question back. The end screen gives
  a summary and a next scenario (Y9, M2, M7).
- **AI flows stay honest.** The tutor explains what it needs (consent), carries her goals and level, and says "AI
  feedback can be wrong". The roleplay has on-demand help that copies a phrase into the box, sends the British-English
  preference, does not correct mid-conversation, and its report leads with the outcome and a strength
  (`shots/y-83-tutor-reply.png`, `shots/m-91-roleplay-help.png`, `shots/m-93b-roleplay-report-full.png`).
- **Onboarding no longer over-promises.** It now says that "Work" only shapes the AI tutor for now (Y6).

---

## Overall verdict per persona (simulated judgement, not user data)

**Yael (B1-B2, workplace English, phone commute): would probably keep using Lucid for a few weeks, with growing
doubts.** The B2 lessons are adult and well explained, her progress is now recorded, and the placement's "Start at B2"
button removes the trap from round 1. What would stop her:
1. There is still nothing for work. No workplace scenarios or expressions exist, and Free writing judges her emails as
   essays (Y6).
2. The daily plan wastes part of her commute: a 4-minute "Targeted practice: Social conversation" block opens an
   empty page and shrinks the lesson to two exercises (N1). There is also no "today's part is done" stop (N5).
3. By default she still starts on the C1 academic track unless she notices the "Start at B2" button (Y2).

**Moshe (A2, family trip, phone, offline): likely to keep using it until the trip.** Today names an airport scenario
every day, the scripted practice is exactly the "don't embarrass yourself" help he wanted, speaking failures abroad no
longer cost him a lesson, and the offline save works. What would stop him:
1. The plan's "Targeted practice: Travel and service situations" leads to "No exercises for this topic yet" every day
   after he picks a less natural reply, and the plan can never be finished (N1).
2. After "Nearly there" (which reads "70%… you need 70%", N3), coming back later sends him through the whole 25-minute
   lesson again (N2).
3. Smaller issues: he has to find "Offline use" in Settings on his own, and there is no offline sign on the phone
   (M1). Today ticks a scenario he never opened (N4). The three emergency scenarios are all B1, a stretch for him.

### The 5 most important fixes for these personas
1. **N1:** Never put a practice block in the plan that opens an empty page. Route travel and social weaknesses to a
   scenario replay, and add an e2e check that every plan link opens content.
2. **Y6:** Give "work" something real: a small workplace module (meetings, polite pushback, calls, emails, Slack) and a
   "kind of text" choice in Free writing that turns off the essay checklist and sends the right `kind` to the AI.
3. **N2 + N3:** Keep "fix only what I missed" available from Today and the lesson intro, and do not show a failing score
   rounded up to the pass mark.
4. **Y2:** On a borderline result, start at the confirmed level, or weigh work and travel goals before sending a
   learner to C1 academic argument.
5. **M1 remainder + N5:** Point to "Offline use" from Real life and Help, add a phone offline indicator, and mark
   "today's part" inside the lesson player.
