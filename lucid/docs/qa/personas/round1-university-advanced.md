# Persona review, round 1: university student and advanced professional (simulated)

**This is a simulated persona review, not research with real people.** An AI played two invented personas and
drove the app with Playwright. Their "reactions" are informed judgement about what such a learner would likely
experience. They are not user data and must not be quoted as such. Every finding below is backed by a screen the
reviewer looked at (screenshot path) or by the code that produces it.

- **Date:** 2026-10-30
- **Reviewer key:** `university-advanced`
- **Personas:**
  1. **Tamar, 22.** First-year university student, around B2. She must read academic articles and write seminar
     papers in English. She wants argumentative and academic writing with feedback she can learn from. Hebrew
     interface. Phone for short sessions, laptop for writing.
  2. **Eitan, 30.** Advanced learner, around C1. He reads and writes English at work and wants C2 precision,
     research-paper writing, nuance and register. English interface. He is impatient with anything basic and checks
     whether Lucid is honest about what it can judge and whether it over-promises C2.
- **Build:** the run started at commit `307e8c6`. Code and content changed during the run: `28a66a0` (the hint
  ladder needs an attempt before the answer), `94ffd5f` (writing-lab content, rubric shown to learners), and HEAD
  `0455421` at the end. The writing sessions were re-run on the new hint-ladder code. Every code reference below
  was re-checked against `0455421`. Lessons and writing exercises still being written are not reported. Only the
  way the app handles them is.
- **Method:** Playwright (Chromium 1.63) against `http://127.0.0.1:8799/`. The reviewer opened and inspected every
  screenshot cited.
  - Sizes: phone 390x844 (touch, DPR 2) for Tamar's first session and return visit. Desktop 1440x900 for her
    writing session and for most of Eitan's. Eitan was also checked on the phone (final C2 task, Today).
  - Browser profiles persisted between sessions. Return visits used a shifted clock: +2 days for Tamar, +1 day
    for Eitan.
  - Accounts and AI used the mocked Supabase and `lucid-ai` from `tests/e2e/run.mjs`. The copy in the scratch
    folder adds one rule: it rejects `text` over 16,000 characters with the same message the real schema produces
    (`supabase/functions/lucid-ai/schemas.ts:53`). The AI answers are canned, for example always "B1 (A2-B1)", so
    only the flow, the presentation and the honesty of the UI are judged, not the AI text.
  - Placement answers simulated a learner at the persona's level. Tamar (B2): right up to B2, about half at C1.
    Eitan (C1): right up to C1, 1 of 4 at C2. A variant, Eitan "ace", got every item right, to see the C2 ceiling.
- **Routes visited:**
  - Tamar: `#/welcome`, `#/start`, `#/placement?start=comfortable`, `#/today`, `#/lesson/c1-01`, `#/path`,
    `#/path/B2`, `#/path/C1`, `#/lesson/b2-02`, `#/review`, `#/practice`, `#/reading`, `#/writing`,
    `#/writing/final-B2`, `#/writing/final-C1`, `#/account?mode=signup`, `#/progress`, `#/settings`,
    `#/tutor?mode=writing`.
  - Eitan: `#/welcome` (English), `#/start`, `#/placement?start=advanced`, `#/today`, `#/lesson/c2-01`,
    `#/path/C1`, `#/path/C2`, `#/lesson/c1-03` (and `?stage=practice`), `#/checkpoint/C1`, `#/settings`,
    `#/practice`, `#/writing`, `#/writing?stage=10`, `#/writing/final-C2`, `#/writing/wa-08`,
    `#/account?mode=signup`, `#/tutor?mode=debate`, `#/progress`.
- **Screenshots and scripts:** `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/personas/university-advanced/`
  (screens in `shots/`, drafts in `tamar-drafts.txt` and `eitan-paper.txt`). Paths below are relative to that
  folder. These are session scratch files and are not committed.

Findings already reported in the other round-1 reports were seen again here. They are listed once at the end
("Also observed") and not repeated as new findings.

---

## Persona 1: Tamar (B2, university)

**First session (phone, Hebrew).**
1. Onboarding: goals "exams and university" and "academic and argumentative writing", 35 minutes a day, start
   point "fairly comfortable reading and writing", AI consent on.
2. Placement: 16 items. "You showed control up to B2. We'll start at C1."
3. Today. Its Start button opened `c1-01`.
4. She went back to revise conditionals in `b2-02`, answering about one item in three wrong. A "say it aloud" item
   stopped her on the bus.
5. Review, the Practice hub, Reading and the Writing lab. She opened the B2 final task on the phone.

**Same evening (laptop).**
1. Account (mocked).
2. B2 final task: draft 1 (377 words, with typical errors), automatic check, AI feedback, hint ladder.
3. Draft 2 and draft 3, Versions and Compare.
4. Writing lab, Progress and Today.
5. The C1 final task, with the self-rating before feedback.

**Return visit (+2 days, phone).** Today, Review, Path, Settings, the AI tab of the B2 task, the AI tutor (writing
coach) and Reading.

### Findings

**T1. Opening a lesson you placed out of moves your whole course level back.** *Major. `#/lesson/b2-02` then
`#/today`, `#/path`, `#/writing`. Phone and desktop. Applies to Eitan too.*
- **Observed:**
  - Tamar was placed at C1. She opened the B2 lesson "If I had known" to revise and did not finish it (the speaking
    item stopped her).
  - From then on, Today's primary button and plan point back to that B2 lesson. The path's level rail marks B2 as
    current, and the Writing lab's "Your stage" drops from 8 to 5. This was still true on the return visit two
    days later.
  - Eitan opened the C1 lesson "Hedging and stance" from a C2 placement. Next day Today says "Start: Hedging and
    stance", and the Writing lab marks stage 8 as his.
  - Cause: `startLesson()` turns `placed_out` into `started` (`js/core/learner.js:74`). `nextLesson()` returns the
    first lesson in order that is not done (`js/core/adaptive.js:118`), and course level is that lesson's level.
  - Screenshots: `shots/t44-today-desk.png`, `shots/t42-writing-lab-mydrafts-desk.png` (stage 5 "your stage"),
    `shots/t50-return-today-phone-fold.png`, `shots/e27-today-return-desk.png`, `shots/e17-writing-en-desk.png`.
- **Why it matters:** revising an earlier topic is exactly what a good student does before a seminar paper.
  Lucid silently treats it as "start over here". Every plan, stage recommendation and the tutor's `level` follow
  the wrong level, and nothing says why or how to undo it.
- **Recommendation:**
  - Opening a placed-out lesson should not change its status. Keep `placed_out` and record the attempt, or add a
    separate `reviewing` flag that `nextLesson()` ignores.
  - If the learner fails a placed-out lesson, suggest "Move my level to B2?" with an explicit choice, instead of
    moving it implicitly.

**T2. The level the essay screen withholds during revision is shown everywhere else.** *Major (honesty).
`#/writing/final-B2` Versions tab, `#/writing`, `#/today`, `#/progress`. Desktop and phone. Applies to Eitan too.*
- **Observed:**
  - The AI panel says "While you revise you see category bands. The overall level appears on your final draft."
    Yet the Versions tab shows a level tag ("B1") on every draft.
  - "My drafts" in the Writing lab shows "B1" for the task.
  - Today and Progress show **Writing: B1** with the source "assessed writing (3)". Those three are three drafts of
    the same essay.
  - For Eitan, one non-final draft of the C2 paper became "Writing: B1, assessed writing (1)", replacing his
    placement estimate.
  - The single label is the AI's point estimate. On the final draft the editor shows a range ("A2-B1"), which is
    what the research behind it asks for.
  - Code: `js/views/essay.js:167` (version tags), `js/views/writing.js:52` (draft list),
    `js/core/adaptive.js:101` (median of the last 3 evaluated *versions*, from any task, final or not).
  - Screenshots: `shots/t37-versions-desk.png`, `shots/t42-writing-lab-mydrafts-desk.png`,
    `shots/t43-progress-desk.png`, `shots/t44-today-desk.png`, `shots/e26-progress-desk.png`.
- **Why it matters:** Tamar sees "B1" next to her B2 work in three places, during the very drafts the app promised
  not to grade. Eitan, who checks honesty, sees the app contradict itself on the same screen. Counting drafts of
  one essay as three pieces of evidence also inflates confidence.
- **Recommendation:**
  - Show no level on non-final versions or in "My drafts" until a draft is final.
  - Show the range, not the point estimate.
  - Derive the Writing skill level only from final drafts, at most one per task, and say "from N tasks".

**T3. "Looks fixed" appears after a wrong fix.** *Major. `#/writing/final-B2`, AI feedback, desktop.*
- **Observed:**
  - The new hint ladder works well up to the clue: "There is a mistake here" → error type → clue. "Compare with
    the correction" stays locked until she tries a fix.
  - She changed "more better" to **"more good"**, which is still wrong. The card at once said **"נראה מתוקן.
    הטיוטה הבאה תיבדק."** ("Looks fixed. Your next draft will be checked.") and unlocked the correction.
  - Cause: `fixState()` calls it fixed when the quote is gone and the correction appears *anywhere* in the essay
    (`js/views/essay.js:89`). The word "better" also appears in "get better grades" later in her text. Short
    corrections such as "better", "on", "the" or "information" will nearly always match somewhere.
  - Screenshots: `shots/t60-hint-before-fix.png`, `shots/t61-after-wrong-fix.png`,
    `shots/t62-correction-revealed.png`.
- **Why it matters:** the ladder exists to teach her to find and fix her own mistakes. A false "looks fixed" teaches
  the wrong form and ends the search.
- **Recommendation:**
  - Check only the edited region: the sentence that contained the quote, located by its offset or surrounding
    words.
  - Say "Looks fixed" only when that sentence now contains the correction in place of the quote. Otherwise use the
    neutral "You changed this".
  - Unlocking the correction on any change is fine. Only the reassurance has to be precise.

**T4. Version comparison misaligns when neighbouring sentences change, and drops paragraphs.** *Major.
`#/writing/final-B2` Versions → Compare, desktop and phone.*
- **Observed:** between draft 1 and draft 2 she made two small edits in adjacent sentences. She added a statistic
  to one sentence and changed "depends of" to "depends on" in the next. The comparison then shows:
  - about 60 words struck out and re-added;
  - "The success" deleted in the middle of the first sentence;
  - the survey sentence inserted inside the "depends" sentence.
  All six paragraphs are run together into one block. Only "this version vs. the current text" is offered, so she
  cannot see what changed from v2 to v3. Causes:
  - `wordDiff()` pairs a deleted sentence with an added one only when they are immediately adjacent in the LCS
    output, so a del-del-add-add run is diffed crosswise (`js/core/diff.js:30`).
  - Whitespace, including paragraph breaks, is collapsed (`js/core/diff.js:3`).
  - Screenshots: `shots/t38b-compare-aside.png`, `shots/t48-compare-phone.png`.
- **Why it matters:** "see what changed" is how she checks that her revision did what the feedback asked. A diff
  that shows edits she did not make misleads her, and paragraph structure is part of what she is revising.
- **Recommendation:**
  - Pair runs of deleted sentences with the following run of added sentences, and diff the joined runs word by
    word.
  - Diff paragraph by paragraph and keep the breaks.
  - Let her pick any two versions (default: previous vs. latest).

**T5. Automatic checks flag correct academic English.** *Major. `#/writing/final-B2` and `#/writing/final-C2`
Checks tab. Desktop. Both personas.*
- **Observed (Tamar, 377-word B2 essay):** 7 flags, of which 2 are wrong. "Possible run-on sentence" fired on
  "However, **this does** not mean…" and on "In 2022, **there were** many strikes…". The other 5 were real
  (more better, will after if, depends of, informations, a real comma splice).
- **Observed (Eitan, 1,157 words of C2 prose with no errors):** 7 flags, and none points at a real error:
  - "In 2021, there were…" and "Conversely, it is…" flagged as run-ons;
  - **"a unanimous"** told to use *an*;
  - **"A utilitarian"** told to use *an*;
  - **"an MBA"** told to use *a*;
  - "It remains unclear **if hybrid work will** preserve it" flagged as "No will after if" (it is an indirect
    question, so *will* is correct);
  - the title merged with the first sentence into a "41-word sentence".
- **Causes:**
  - The run-on rule exempts only fronted subordinate clauses, not adverbials or linkers ("However,", "In 2022,",
    "For instance,").
  - The a/an rules look at the letter, not the sound.
  - The *if…will* rule cannot tell conditionals from indirect questions.
  - Code: `js/core/writing-analyzer.js:25-28`.
- **The disclaimer:** it says the checks "occasionally flag correct English". These are the default tab.
- **Screenshots:** `shots/crop-t31-issues.png`, `shots/t31-final-B2-checks-desk.png`,
  `shots/e21b-final-C2-checks-aside.png`.
- **Why it matters:**
  - Tamar may "fix" correct sentences by deleting the comma after "However", which creates a real error.
  - For Eitan, a checker that is wrong 7 times out of 7 on his prose discredits the whole feedback panel, including
    the parts that are honest and useful.
- **Recommendation:**
  - Exempt sentence-initial adverbials and linkers from the run-on rule (a list such as however, therefore, in
    addition, for instance, conversely, in + year or date). Then flag only when a full clause precedes the comma.
  - Decide a/an by sound: add exceptions for *uni-/una-/use-/uti-/eu-* words and for initialisms (an MBA, an NGO,
    an SQL).
  - Skip *if…will* after "unclear / whether / wonder / ask / know if".
  - Treat a line without final punctuation followed by a blank line as a title.
  - Above B2, show low-precision rules as "worth a look" in a muted style, or turn them off.

**T6. The level final tasks are one-line prompts.** *Major. `#/writing/final-B2`, `#/writing/final-C1`,
`#/writing/final-C2`, phone and desktop. Both personas.*
- **Observed:**
  - B2: "Write a 500-word argumentative essay with a clear thesis, at least three supporting arguments, evidence,
    a counterargument, a rebuttal and a strong conclusion." No topic.
  - C1: "Write an 800-1,000-word analytical argumentative essay." No topic, no audience, no required elements.
  - C2: "Produce a 1,500-2,000-word research-based argumentative paper." No sources and no citation guidance.
  - None of B2, C1 and C2 has a Hebrew version (`task_he` is missing in `content/curriculum.json`), so in the
    Hebrew UI only the English line shows.
  - The stage-9 and stage-10 assignments in the same lab are excellent by contrast. `wa-08` has a precise prompt,
    a "must include" list and four fictional sources clearly labelled "Illustrative, not real data".
  - Screenshots: `shots/t25-final-B2-phone.png`, `shots/t45-final-C1-desk.png`, `shots/e20-final-C2-empty-desk.png`,
    `shots/crop-e31.png`.
- **Why it matters:**
  - The final task is what the path and the level check call "a separate part of the evidence" for a level.
  - Tamar cannot plan an essay with no question. The AI's task-fulfilment gate has nothing to check relevance
    against.
  - A "research-based" C2 paper with no sources forces Eitan to invent or bring unverifiable ones (see E4).
- **Recommendation:**
  - Give each final the same structure as the `wa-*` assignments: prompt, audience, required elements, scaffold, a
    fictional source pack at C1 and C2, and a Hebrew instruction. Or point the final at one of those assignments.
  - Say whether the word range includes references.

**T7. After the third feedback round the final task can never be marked final.** *Minor. `#/writing/final-B2`,
`#/path/B2`, `#/writing`. Desktop.*
- **Observed:**
  - After the third AI round the panel shows the level range automatically, and "Submit revised draft" is disabled.
  - The "This is my final draft" button is gone, because it renders only while `evaluatedCount() < MAX_EVALS`
    (`js/views/essay.js:123`). The task therefore stays "Draft 3" in the Writing lab and "started" (half mark) on
    the path.
  - The panel still lists "For your next draft: …" although no next draft can be sent. It also advises "try a new
    task at this stage", and stage 6 has no other task.
  - Screenshots: `shots/crop-t39-top.png`, `shots/t40-after-last-round-edit-desk.png`,
    `shots/t42-writing-lab-mydrafts-desk.png`.
- **Why it matters:** she did all the work but gets no closure, and the panel's last words tell her to do something
  she can't.
- **Recommendation:**
  - Mark the task final automatically after the last round, or keep the button.
  - Replace "For your next draft" with "What to carry into your next task" when no rounds remain.
  - Hide the "new task at this stage" advice when the stage has none.

**T8. The same text gets different automatic checks before and after AI feedback.** *Minor. `#/writing/final-B2`,
desktop.*
- **Observed:**
  - After "Check", the panel listed 7 issues.
  - After "Get feedback", the Checks tab showed two more on the same text: "Personal hedge: In my opinion" and
    "Informal word: really". Pressing Check again removes them.
  - Cause: the Check button passes `formal: … && task.stage >= 7`, but `getFeedback()` re-runs the analyzer
    without `formal`, so B2 to C2 always get the register rules (`js/views/essay.js:228`).
  - Screenshots: `shots/t31-final-B2-checks-desk.png`, `shots/t35-checks-after-ai-desk.png`.
- **Why it matters:** a checker that changes its mind without a change in the text looks arbitrary.
- **Recommendation:** use one helper for both calls, with the same options.

**T9. Review stays empty for a learner placed above the early levels.** *Minor. `#/review`, `#/today`, phone.*
- **Observed:** two days later Review says "No words in review yet. Words enter review when you complete a lesson."
  Placed-out lessons add no cards, and she has not passed a lesson yet. The plan therefore has no review block. Her
  academic vocabulary (nominalisation, hedging verbs) never enters spaced repetition. Screenshot:
  `shots/t51-return-review-phone.png`.
- **Why it matters:** academic vocabulary is what she needs most for reading articles, and spaced review is Lucid's
  strongest tool for it.
- **Recommendation:**
  - Let a placed learner seed review from a level word list (with an opt-out), or from words in lessons she opens.
  - Let her add words from writing feedback to the notebook.

**T10. Two key controls look like plain text.** *Polish. `#/writing/final-B2` AI tab, desktop.*
- **Observed:**
  - "זו הטיוטה הסופית" ("This is my final draft") is a borderless ghost button on its own line. It reads like a
    status heading saying the draft *is* final.
  - The hint-ladder buttons ("איזה סוג טעות?", "להשוות לתיקון") have the same style.
  - Screenshot: `shots/t33-ai-draft1-desk.png`.
- **Recommendation:**
  - Give these a visible button style.
  - Phrase the final one as an action: "לסמן כטיוטה סופית" ("Mark as final draft"), with one line on what it does
    ("shows the overall level; you can still revise").

### What works well for Tamar
- Onboarding in natural Hebrew. The AI consent names the provider (Anthropic) and the purpose. Choosing a starting
  point leads straight into the placement test.
- Placement:
  - adaptive, with "I don't know" always offered;
  - it shows items per skill and calls the result a first estimate.
- The redesigned hint ladder: locate, then type, then clue, and the correction opens only after a real attempt.
  This is exactly the self-correction she needs (`shots/combo-t34.png`).
- Feedback is in category bands relative to the level target, not fake scores, and carries "AI feedback can be
  wrong" with a report link.
- From stage 7 she rates herself before seeing the bands, and the bands then show "(you said: …)" next to the AI's
  view (`shots/t47-final-C1-feedback-desk.png`).
- The argument-structure check says plainly that it "does not judge how good the argument is".
- Drafts save automatically ("Draft saved"), and every check or submission keeps a version.
- C1 lessons ("Academic vocabulary and nominalisation", "Hedging and stance") match her seminar needs closely.

---

## Persona 2: Eitan (C1, professional, English interface)

**First session (laptop, English).**
1. Welcome in English. Onboarding: goals "work" and "academic and argumentative writing", 20 minutes, start point
   "advanced".
2. Placement: 12 items. "You showed control up to C1. We'll start at C2."
3. Today. Its Start button opened `c2-01`.
4. Path C2 and Path C1. He chose "Hedging and stance" (`c1-03`) and skipped straight to practice.
5. The C1 level check, Settings, Practice and the Writing lab.

**Return visit (+1 day, laptop then phone).**
1. Account (mocked).
2. C2 final task: a 1,157-word paper, automatic check and AI feedback.
3. The full paper with a 24-entry reference list, the Versions tab and the C2 research assignment `wa-08`.
4. AI tutor (debate coach), Progress and Today.
5. On the phone: the C2 task and Today.

**Variant "ace":** every placement item right.

### Findings

**E1. C2 is claimed from almost no evidence.** *Major (honesty). `#/placement` result, `#/today`, `#/progress`,
desktop.*
- **Observed:**
  - With every item right, placement stops after 12 multiple-choice items, 4 of them at C2, and says "You showed
    control up to C2".
  - Today then shows **C2 in all six skills**, including Speaking and Writing. Progress lists "Speaking: placement
    test (0)" and "Writing: placement test (0)".
  - In the main run, one correct C2 vocabulary item was enough for **"Vocabulary C2 (3 items)"**. The "3" counts
    his vocabulary items at all levels. The C2 label rests on a single answer. A level is granted when at least
    67% of the items at that level are right, with no minimum count (`js/core/placement.js:88`).
  - Screenshots: `shots/ea06-today-desk.png` (six C2 bars), `shots/e05-placement-result-desk.png`.
- **Why it matters:**
  - C2 is the level Eitan is working towards. Being told he already has it, in writing he never submitted, is the
    over-promise he is looking for. The other honest copy on the same screen then stops being believed.
  - This sharpens M2 in the student-adhd report: at the top of the scale the gap is largest.
- **Recommendation:**
  - Require at least 2-3 items at a level per skill before naming it, and show the count *at that level*
    ("C2: 1 of 1 item").
  - Show "—" for skills the test did not measure.
  - Word the top band cautiously: "Your answers are consistent with C1-C2. Writing and speaking are not measured
    yet. The C2 writing task is how to show them."

**E2. Valid C1 rewrites are marked "Not quite".** *Major. `#/lesson/c1-03` practice, desktop.*
- **Observed:** open "transform" items are graded by exact match against a list (`checkTyped`). Examples:
  - "The new timetable may have contributed to the **drop** in complaints" was marked wrong ("Correct answer: … the
    **fall** in complaints").
  - "The study suggests that the new app **could** improve sleep **quality**" was marked wrong.
  - Off-screen checks of the same lesson rejected "…helped reduce complaints" and "To a certain extent, the results
    support…".
  - The verdict says "Correct answer:", as if no other answer existed. Wrong attempts count toward the 70% lesson
    pass and feed "recurring mistakes" and topic mastery.
  - Screenshots: `shots/e30-valid-rewrite-marked-1-desk.png`, `shots/e30-valid-rewrite-marked-2-desk.png`. Grading
    test: `grade.mjs` in the scratch folder.
- **Why it matters:** at C1-C2 the point is choosing between many acceptable phrasings. Marking precise, correct
  English wrong is the fastest way to lose an advanced learner. It also shows the app judging something it cannot
  judge.
- **Recommendation:**
  - For open transformations at C1 and above, label the key "One model answer" and add "My answer is also
    correct". That should count it as correct or ungraded and log it for content review.
  - When AI is available, send non-matching answers to a short AI check.
  - Widen the accepted lists for synonyms the item is not testing (fall/drop/decline, could/may/might).

**E3. A full research paper with references is rejected with a developer error.** *Major. `#/writing/final-C2`,
desktop.*
- **Observed:**
  - The full paper (2,589 words by Lucid's count, 17,372 characters including a 24-entry reference list) was sent
    with "Submit revised draft".
  - The red text under the editor said: **"text: String must contain at most 16000 character(s)"**. Nothing in the
    task, the counter or the button warns of a character limit. The button stays enabled at any length.
  - The real server enforces the same limit (`supabase/functions/lucid-ai/schemas.ts:53`). The mock used here
    mirrors it.
  - A 2,000-word paper is about 13,000-14,000 characters before references. The C2 task (1,400-2,200 words) and
    the C2 assignments (1,500-2,000 words, author-year citations) put a realistic paper with a reference list
    over the limit.
  - Screenshot: `shots/e24-long-paper-error-desk.png`.
- **Why it matters:** this blocks the one task that represents C2 writing, at the moment of submission, with a
  message he cannot act on (characters? which part?).
- **Recommendation:**
  - Raise the limit for stages 9-10 (for example 24,000 characters), or send the body without a trailing
    "References" section.
  - Check the size before sending, with a plain message: "Feedback can read up to about 2,300 words. Remove the
    reference list or send one section at a time."
  - Say in the task whether references count toward the word range.

**E4. The feedback never says what it cannot check in research writing.** *Major (honesty for this persona).
`#/writing/final-C2` AI tab, desktop.*
- **Observed:**
  - The AI panel rates "Evidence" and the rubric covers "citation conventions". The only caveat is the general "AI
    feedback can be wrong".
  - Nothing tells the writer that Lucid cannot check whether the cited sources exist, are quoted accurately or
    support the claims. On the final C2 task, which has no source pack, every source is the learner's own.
  - The `wa-08` assignment handles this well: fictional sources, labelled, and the learner is asked to say what he
    would check in real research.
  - Screenshots: `shots/e23-ai-C2-desk.png`, `shots/crop-e31.png`.
- **Why it matters:** Eitan specifically checks whether the app is honest about what it can judge. A band for
  "Evidence" on unverifiable citations looks like a judgement it cannot make.
- **Recommendation:**
  - On stage 9-10 tasks, add one line next to the bands: "Lucid judges how you use and evaluate evidence. It cannot
    check whether outside sources exist or say what you report."
  - Give the C2 final a source pack (see T6) so that "evidence quality" has something to be judged against.

**E5. While a long paper is being assessed, the screen gives almost no sign of progress.** *Minor.
`#/writing/final-C2`, desktop.*
- **Observed:** after "Get feedback" the only sign is a small spinner inside the greyed button. The panel still
  shows "Send your text for feedback to get an assessment…" and the self-rating form, as if nothing had started.
  The real call can take a while: up to 3 runs, 16k output tokens each, and a 120-second timeout in
  `index.ts:41`. Screenshot: `shots/e22-ai-busy-desk.png`.
- **Recommendation:**
  - Show a status in the panel: "Reading your paper. This usually takes under a minute. Edits made now will not be
    included."
  - Keep that status visible if he switches tabs.

**E6. The editor is too small for long-form writing.** *Minor. `#/writing/final-C2`, `#/writing/wa-08`, desktop and
phone.*
- **Observed:**
  - The textarea has a fixed minimum of 22rem (`css/app.css:472`) and does not grow. At 1440x900 about 150 of his
    1,157 words are visible at once.
  - In `wa-08` the four-source pack sits in the instructions above the editor. The page is over 4,000px long, so he
    scrolls between sources, his text and the feedback column.
  - Screenshots: `shots/e24-long-paper-error-desk.png`, `shots/crop-e31.png`, `shots/e28-final-C2-phone.png`.
- **Recommendation:**
  - On desktop, let the editor fill the viewport height and stay sticky.
  - Add a "Sources" tab beside Checks, AI feedback and Versions, so the sources can be read next to the text.

**Also for Eitan:** T1 moved his course level from C2 to C1. T2 turned one non-final draft into "Writing: B1".
T5 and T6 apply to his C2 work.

### What works well for Eitan
- The English interface is clean. Hebrew legends are hidden from C1 up (`css/app.css:157`); only the nav keeps small
  Hebrew sub-labels.
- "Skip to practice" on every lesson respects his time.
- The C1 hedging lesson is precise and adult ("calibrate every claim to its evidence"; over-hedging is an error too).
- The level check honestly says "not available yet" rather than building an unfair test from too few lessons.
- The C2 research assignments are excellent and honest: fictional sources labelled "Illustrative, not real data",
  a demanding "must include" list, and a request to state what he would verify in real research.
- The overall level appears only as a range on the final draft, and uncertain bands carry "~". Progress ends with
  "Lucid does not promise that finishing the course gives a level".
- The tutor has a debate coach and a writing coach. Settings keep AI consent, data export and deletion one click
  away.

---

## Also observed (already reported in other round-1 reports)
- **Today's Start button overflows the phone screen** with B2 and C1 titles (M1). Tamar's Today was 487-508px wide
  at 390px ("Academic vocabulary and nominalisation", "If I had known: third and mixed conditionals"):
  `shots/t10b-today-phone-fold.png`, `shots/t50-return-today-phone-fold.png`.
- **Unwritten lessons say "Try reloading"** (M3, A1). For a C2-placed learner this applies to the whole level, so
  Eitan's first Start leads to a dead end: `shots/e07-today-start-target-desk.png`.
- **A speaking item she cannot do aloud blocks the lesson** (M4, N2): `shots/t18x-lesson-stuck-14-phone.png`.
- **Goals do not shape the plan** (M5). Both chose academic writing, and both plans offer speaking and no writing:
  `shots/t44-today-desk.png`, `shots/e06-today-desk.png`.
- **English text is right-aligned in the Hebrew UI** (M9): `shots/crop-t15-top.png`.
- **Placed-out levels count as complete on the path tabs** (M10): `shots/e08-path-C2-desk.png` (B2 10/10, C1 8/8).

---

## The 5 most important fixes (for these personas)

1. **Stop placed-out lessons from resetting the course level (T1).** Reviewing must not mean starting over. Keep
   `placed_out` on open, and make level changes an explicit choice.
2. **Make level claims match the evidence (E1, T2).**
   - No level from one item.
   - No level for unmeasured skills.
   - No level on non-final drafts.
   - Writing level only from final drafts, one per task, shown as a range with its count.
3. **Make the self-correction tools trustworthy (T3, T4).** "Looks fixed" only when the fix is in place. A version
   diff that pairs changed sentences correctly and keeps paragraphs.
4. **Cut the false alarms in automatic checks on academic prose (T5, T8).** Handle linkers before commas, a/an by
   sound, and *if* in indirect questions. Apply the same rules every time. Above B2, mute or drop low-precision
   rules.
5. **Make advanced writing tasks completable and honestly judged (T6, E2, E3, E4).**
   - Real prompts, sources and Hebrew instructions for the level finals.
   - A limit that fits a C2 paper with references, and a clear message when it does not.
   - "What feedback can't check" on research tasks.
   - Model answers, not single "correct answers", for C1 and above rewrites.
