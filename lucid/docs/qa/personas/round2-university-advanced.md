# Persona review, round 2: university student and advanced professional (simulated)

**This is a simulated persona review, not research with real people.** An AI played two invented personas and
drove the app with Playwright. Their "reactions" are informed judgement about what such a learner would likely
experience. They are not user data and must not be quoted as such. Every finding below is backed by a screen the
reviewer looked at (screenshot path) or by the code that produces it.

- **Date:** 2026-10-31
- **Reviewer key:** `university-advanced` (round 2; round 1 is `round1-university-advanced.md`)
- **Personas:**
  1. **Tamar, 22.** First-year university student, around B2. She reads academic articles and writes seminar papers
     in English. Hebrew interface. Phone for short sessions, laptop for writing. Her areas: AI writing feedback,
     drafts, the hint ladder, version comparison and the level final tasks (`#/writing/final-B2`, `#/writing/final-C1`).
  2. **Eitan, 30.** Advanced learner, around C1. English interface. He wants C2 precision and research writing. He
     checks whether Lucid is honest about what it can judge and whether it over-promises C2.
- **Build:** commit `f8a202c` ("Close remaining fix items; fix log"), served with
  `python3 -m http.server 8804 --bind 127.0.0.1` at `http://127.0.0.1:8804/`. This reviewer changed nothing in the
  repository except this report.
  - During the run, other lanes had uncommitted edits in the working tree: a quieter Hebrew legend colour in
    `css/app.css`, the "עב" button's screen-reader label in `js/core/i18n.js`, and `tests/e2e/a11y.mjs`.
  - None of these touches the behaviour judged here.
- **Method:**
  - Playwright (Chromium) from Node. The reviewer opened and inspected every screenshot cited.
  - Sizes: phone 390x844 (touch, DPR 2) and 320 wide where layout mattered; desktop 1440x900.
  - Each persona had a persistent browser profile. Return visits used a shifted clock: +2 days for Tamar, +1 day
    for Eitan.
  - Accounts and AI used the mocked Supabase and `lucid-ai` from `tests/e2e/run.mjs` (`installMockServer`), copied
    into the scratch folder with four additions:
    - it rejects `text` over 24,000 characters with the real schema's message (`TEXT_MAX`,
      `supabase/functions/lucid-ai/schemas.ts:24`);
    - it returns a `verification_note` exactly when the server's own `isSourceBased()` rule would
      (`supabase/functions/lucid-ai/prompts.ts:52`);
    - it returns error cards for the mistakes actually in Tamar's text (for example "a more better way");
    - it can delay the response (up to 7 s) or fail as if offline.
    The AI text is canned, so only the flow, the presentation and the honesty of the UI are judged, not the AI's
    judgement.
  - Placement answers were simulated from the item bank. Tamar (B2): right up to B2, every other C1 item right,
    "I don't know" at C2. Eitan (C1): right up to C1, 1 of 4 at C2. Variant Eitan "ace": every item right.
  - Offline: a real service worker with no mock. Tamar saved all lessons in Settings, then the browser went offline.
- **Routes visited:**
  - Tamar: `#/welcome`, `#/start`, `#/placement`, `#/today`, `#/path`, `#/path/B2`, `#/lesson/b2-02`,
    `#/lesson/c1-01`, `#/review`, `#/reading`, `#/writing`, `#/writing/final-B2`, `#/writing/final-C1`,
    `#/account?mode=signup`, `#/settings`, `#/progress`, `#/drill?topic=argument-structure`, `#/tutor?mode=writing`,
    `#/lesson/c1-04` (offline).
  - Eitan: `#/welcome` (English), `#/start`, `#/placement`, `#/today`, `#/lesson/c2-01`, `#/path/C1`, `#/path/C2`,
    `#/lesson/c1-03`, `#/checkpoint/C1`, `#/settings`, `#/practice`, `#/writing`, `#/writing/final-C2`,
    `#/writing/wa-08`, `#/writing/free`, `#/account?mode=signup`, `#/tutor?mode=debate`, `#/progress`, `#/review`,
    `#/drill?topic=daily-life-vocab`.
- **Screenshots and scripts:**
  `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/personas-r2/university-advanced/`
  (screens in `shots/`, scripts `tamar*.mjs`, `eitan*.mjs`, `offline.mjs`, `probe-*.mjs`, logs `*.log`, texts in
  `texts/`). Paths below are relative to that folder. They are session scratch files and are not committed.

---

## Step 1: verification of round 1

Each round 1 finding was re-tested in the app. The fix log's status was not taken on trust. "Fix log" gives the
merged ID in `docs/qa/fix-log.md`.

| R1 | Fix log | Finding (short) | Verdict | What I saw |
|---|---|---|---|---|
| T1 | P-70 | Opening a placed-out lesson moves the course level back | **Resolved** | Tamar (placed at C1) revised `b2-02` and scored 64%. The lesson stays `placed_out` (with `last_score` 0.64). Today still starts `c1-01`, and the Writing lab still says "Your level: C1. Your stage: 8" (`shots/t10-b2-02-end.png`, `shots/t11-today-after-b2-02.png`). The B2 path tags the lesson "64%" and says, next to "Start from B2", that she scored under 70% on 1 B2 lesson she placed out of, so starting from B2 "may suit you better". It leaves the choice to her (`shots/t21-path-B2-after-miss-desk.png`, `shots/t66-path-B2-miss-note.png`). Eitan passed `c1-03` from a C2 placement, and Today stayed on the C2 lesson "Style and connotation" (`shots/e12-today-after-c1-03.png`). |
| T2 | P-71 | The level withheld during revision shows everywhere else | **Resolved** | Versions tags drafts v1 and v2 only "AI feedback". Only the final v3 shows a range, "B1–B2" (`shots/t26-B2-versions-d1-desk.png`, `shots/t34-B2-versions-d3-desk.png`). "My drafts" shows the range only once the task is final (`shots/t37-writing-mydrafts-desk.png`). Today and Progress say "Writing: Not yet assessed · 1 assessed text; 2 on different days give a level" (`shots/t38-progress-desk.png`, `shots/e42-today-targeted.png`). |
| T3 | P-72 | "Looks fixed" after a wrong fix | **Resolved** | At the clue rung she changed "a more better way" to "a more good way". The card says "You changed this. Your next draft will be checked." Changing it to "a better way" gives "Looks fixed" (`shots/t28-after-wrong-fix.png`, `shots/t29-after-right-fix.png`). "Compare with the correction" opens only after the attempt. |
| T4 | P-73 | Comparison misaligns, drops paragraphs, only vs. current text | **Resolved** | In draft 2 she edited two adjacent sentences. The diff marks exactly those words ("usually", "it" → "the visit", "of" → "on", "informations" → "information") and keeps all seven paragraph breaks (`shots/t32-compare-v1-v2.png`). The default is previous vs. latest. Any two versions, or a version vs. the current text, can be picked (`shots/t35-compare-v2-v3.png`, `shots/t36-compare-v1-now.png`). Residuals on long papers are **N4**. |
| T5 | P-74 | Automatic checks flag correct academic English | **Partly resolved** | **Fixed at C1-C2:** no flags on Eitan's 1,157-word paper (including "a unanimous", "an MBA" and "unclear if … will") or on Tamar's C1 essay (`shots/e23-C2-checks.png`, `shots/t41-C1-checks-desk.png`). At B2, "However, this does not mean" and "In 2019, there were" are no longer flagged. **Remains at B2:** Tamar's B2 essay got 5 flags. Four are real (will after if, more better, depends of, informations). One is false: **"To sum up, I believe"** is flagged as a "possible run-on sentence" (`shots/t23-B2-checks-desk.png`). A direct analyzer probe (`probe-analyzer.mjs`) shows the same false flag at B2 for "To conclude, it is", "All in all, this is", "First of all, it is", "Last year, there were" and "Put simply, it is". The `LINKER` pattern lists one-word linkers but not these phrase linkers (`js/core/writing-analyzer.js:59`). The same panel lists "to sum up" as a conclusion connector and ticks "Conclusion". |
| T6 | P-75 | Level final tasks are one-line prompts | **Partly resolved** | **Fixed:** every final now has a full brief, an audience, 3-4 topics, a "Must include" list and a statement that the reference list does not count. C1 and C2 topics link fictional, labelled source packs. The C2 task allows "a research question of your own, with real sources that you check yourself" and says Lucid cannot check sources (`shots/t40-final-C1-desk.png`, `shots/e21b-final-C2-brief-full.png`). **Remains for Tamar:** the B2, C1 and C2 briefs have no Hebrew (`instructions.he` is absent for those levels in `content/curriculum.json`). In the Hebrew UI she reads a 110-word (B2) or 150-word (C1) English brief, and the topics and "Must include" list are right-aligned English (`shots/t20b-final-B2-phone-full.png`, `shots/t67-final-B2-topics-phone.png`). The right alignment is the student-adhd round 2 finding N7. |
| T7 | P-80 | After round 3 the task can never be marked final | **Resolved** | The third round marks the draft final automatically. A toast says so ("That was the last feedback round, so this draft is now your final draft"), and the range appears. The panel says "That was the last feedback round for this task" and links to another task at the stage. The heading becomes "What to carry into your next task". The disabled button gives its reason: "This task is marked final. For more feedback, try a new task." (`shots/t33-B2-ai-d3-desk.png`). The path ticks the B2 writing task (`shots/t66-path-B2-miss-note.png`). |
| T8 | P-81 | Different checks before and after AI feedback | **Resolved** | The same 5 check items appear before and after "Get feedback" (string-identical in `tamar2.log`). |
| T9 | P-82 | Review stays empty for a placed learner | **Resolved** | Today offers "Add the key words of the B2 lessons?" to Tamar and the same for C1 to Eitan (`shots/t66-path-B2-miss-note.png`, `shots/e06-today.png`). Eitan's click added 89 cards (13 → 102), introduced at 8 a day. Passing `c1-01` and `c1-03` added 13 words each, and both had words due on the return visit. How review answers are *labelled* is a new problem, **N1**. |
| T10 | P-85 | "This is my final draft" and hint buttons look like text | **Resolved** | "לסמן כטיוטה סופית" / "Mark as final draft" is a bordered key button with a flag icon and one line on what it does. The hint-ladder buttons are bordered keys (`shots/t25-B2-ai-d1-desk.png`, `shots/e37-C2-ai-panel.png`). |
| E1 | P-76 | C2 claimed from almost no evidence | **Resolved** | After 16 items, Eitan reads: "Your answers … are consistent with C1-C2. Questions like these cannot establish that level on their own, and writing and speaking were not measured: the level's writing task is how to show them." Each receptive skill shows "B2+ (2 items at this level)". Speaking and writing show "not measured by this test" (`shots/e05-placement-result.png`). Today and Progress show B2+ with "First estimate: 2 placement questions" and "Not yet assessed" for speaking and writing (`shots/e06-today.png`, `shots/ea07-progress.png`). The "ace" variant gets the same caps. A wording residual is **N2**. |
| E2 | P-77 | Valid C1 rewrites marked "Not quite" | **Partly resolved** | **Fixed for `transform` items:** "…could improve sleep quality" and "…contributed to the drop in complaints" get "Not one of our answers · One model answer: …". "My answer is also correct" counts the answer and removes the retry (`shots/e10-c1-03-e8.png`, `shots/e10-c1-03-e8-selfjudged.png`). **Remains for "Find and fix" (`correct`) items:** "To a certain extent, the results support the original hypothesis." is "Not quite · Correct answer: To some extent…", with no self-judge option. The "Why?" text itself says "to a large extent" is also fine. The item then comes back as a retry he can pass only with the key's wording (`shots/e10-c1-03-e11.png`). Cause: `isOpenRewrite()` covers only `type === 'transform'` (`js/ui/exercise.js:22`). The accepted lists were not widened (e8: 18 answers, none with "quality"; e10: 9, none with "drop"). The self-judge button covers transforms only. |
| E3 | P-78 | A full paper with references is rejected with a developer error | **Resolved** | A 17,372-character paper (counted "1652 words (+937 in references)") was accepted together with the previous draft. At 27,662 characters the button is disabled before sending: "This text is too long for feedback: 27,662 characters, and the limit is 24,000 (about 3,000 words, references included). Shorten it." (`shots/e26-C2-long-paper-d2.png`, `shots/e40-over-limit-free.png`). A 23,546-character version (2,606 words, above the task's 2,200 maximum) still fits. |
| E4 | P-79 | Feedback never says what it cannot check | **Resolved** | On the C2 task, before and after feedback: "AI feedback judges how you choose, evaluate and use evidence. It does not read your sources, so it cannot check whether a source exists, whether a quotation is accurate, or whether a source says what you report. Check those yourself." The AI's own verification note follows. "Required elements" shows "how you checked each real source · Not stated for most sources" (`shots/e37-C2-ai-panel.png`). The C1 final shows the same statement (`shots/crop-t43-top.png`). How the two texts run together is **N5**. |
| E5 | P-83 | No sign of progress while a long paper is assessed | **Resolved** | A status sits under the editor: "Reading your long text. This usually takes under a minute; a long paper can take a few minutes. Edits you make now are not included in this feedback. 0:02", with an elapsed timer (`shots/e24-C2-busy.png`). It stays when he switches to Versions. On the phone it shows under the button (`shots/t58-C1-busy-phone.png`). |
| E6 | P-84 | Editor too small; sources far away | **Resolved** | On desktop the editor is 708 px of a 900 px window and sticky (`position: sticky; top: 16px`). Topics with a pack get a Sources tab, and "Open beside your text" puts the pack next to the editor (`shots/e22-final-C2-sources-tab.png`, `shots/e29-wa08-sources.png`). Long-paper comparison is **N4**. |
| Also: M1 | P-24/51 | Today's Start button overflows on phones | **Resolved** | No sideways scroll at 390 or 320 for either persona (`shots/t06c-today-320.png`, `shots/e35-today-320.png`). |
| Also: M3 | P-26 | Start leads to an unwritten lesson ("try reloading") | **Resolved** (for these personas) | All 75 lessons exist. Eitan's Start opens `c2-01` "Style and connotation" (`shots/e07-start-target.png`). The "still being written" fallback is in `js/views/lesson.js` (`missingLesson`). The student-adhd round 2 report exercised it. |
| Also: M4 | P-27 | A speaking item blocks the lesson | **Resolved** | "Can't speak right now" skipped it on the bus. The end screen says speaking and writing do not count (`shots/t10-b2-02-end.png`). |
| Also: M5 | P-28 | Goals do not shape the plan | **Resolved** | Tamar's plan has a reading block. Eitan's has "Writing: Editing for concision and precision", then reading (`shots/t06-today.png`, `shots/e06-today.png`). The reason line can be wrong: **N3**. |
| Also: M9 | P-32 | English right-aligned in the Hebrew UI | **Partly resolved** | Lesson text and the essay brief are left-aligned. The final task's topics and "Must include" list are still right-aligned (`shots/t67-final-B2-topics-phone.png`). |
| Also: M10 | P-33 | Placed-out levels look complete on the path | **Resolved** | "B2 0/10 · 10 placed out", hatched on the rail (`shots/e08-path-C2.png`, `shots/t21-path-B2-after-miss-desk.png`). |

**Summary.**
- Round 1 findings (16): 13 resolved, 3 partly resolved (T5, T6, E2), 0 not resolved, 0 regressed.
- Shared items rechecked: 5 resolved, 1 partly resolved (M9).

---

## Step 2: fresh sessions

### Tamar (B2, Hebrew UI)

**First session, phone.**
1. Onboarding: goals "exams and university" and "academic writing", 35 minutes, "fairly comfortable", AI consent on.
2. Placement: 20 items. "You showed control up to B2, over two sets of questions. We'll start at C1." It offers
   "Start at B2" and a "B2 level check" (`shots/t05-placement-result.png`).
3. Today, then the B2 revision lesson `b2-02`: 5 wrong first tries, speaking skipped, 64%, "Nearly there".
4. Today's Start (`c1-01`): 3 wrong, 77%, complete, and 13 words joined review.
5. Review, Reading, the Writing lab, and the B2 final on the phone.

**Same evening, laptop.**
1. Account (mocked).
2. B2 final ("Should zoos still exist?"): draft 1 (472 words with typical errors), Check, AI feedback, the hint
   ladder with a wrong and then a right fix, and "Show in my text".
3. Draft 2 (adjacent edits) and Compare. Draft 3 (paragraph split), which became final automatically.
4. My drafts, Progress and Today.
5. C1 final (social-media screening, 413 words) with self-rating before feedback.

**Return visit (+2 days, phone).**
- Today, Review (13 words), Progress and Settings.
- The B2 final's AI tab, and the C1 final draft 2: first sent offline ("No connection. Your text is saved on this
  device…"), then sent again online with the mistake strip.
- The writing coach, Reading and the Path.
- Offline with the service worker: all 75 lessons saved, then Today, an unopened lesson, the Writing lab, the C1 essay,
  Review, Reading and Progress all opened with no connection.

### Eitan (C1, English UI)

**First session, laptop.**
1. Onboarding: goals "work" and "academic writing", 20 minutes, "advanced". The Work goal says honestly: "Lucid has
   no workplace content yet, so for now this only shapes the AI tutor".
2. Placement: 16 items, C2 block 1 of 4.
3. Today, then `c2-01` (intro), and Path C2 and C1.
4. `c1-03` "Hedging and stance", straight to practice, with four valid rewrites not in the key.
5. The C1 level check intro, Settings, Practice and the Writing lab.

**Return visit (+1 day).**
1. Account (mocked).
2. C2 final with his own question (remote-work productivity):
   - a 1,157-word paper: Check, then slow AI feedback;
   - the full paper with a 24-entry reference list (17,372 characters);
   - an over-limit version;
   - Versions and Compare, then marked final.
3. `wa-08` with its source pack.
4. Debate coach, Progress, Review, the C1 word import and Today.
5. Phone: the C2 task and Today at 390 and 320.

### New findings

**N1. Wrong topics are marked weak, so Today sends advanced learners to drills they don't need.** *Major (honesty
and fit). `#/today`, `#/progress`, `#/drill`, `#/tutor`, phone and desktop. Both personas.*
- **Observed:**
  - **Eitan:** after one spaced-review session of the 13 C1 hedging words from `c1-03` ("tentative", "caveat", "conclusive", "be associated with", …), Today adds
    "**Targeted practice: Daily life, family, food and places** · A topic that is not secure yet · 4 min". It opens
    an **A1 dictation drill** (`shots/e42-today-targeted.png`, `shots/e43-drill-daily-life.png`). Progress lists
    "Daily life, family, food and places 53% · need work" (`shots/e41-progress-topics.png`).
  - **Tamar:** Progress lists two topics that "need strengthening":
    - "Thesis, evidence, counterargument, rebuttal" at 31%;
    - "Daily life, family, food and places" at 40% (`shots/crop-t54-bottom.png`).

    Today plans "Focused practice: argument structure · a topic that isn't solid yet" on both days
    (`shots/t39-today-desk.png`, `shots/t50b-return-today-full.png`). It opens a B2 sorting drill on relevant
    support (`shots/t44-drill-argument-structure.png`). The AI bands on the same essays said argument strength
    "above target", and her only mistakes were grammar and prepositions.
  - The AI tutor receives both as `weak_topics` (`tamar3.log`).
- **Causes:**
  - Every spaced-review answer is recorded with the fixed topic `daily-life-vocab`, whatever the word or its lesson
    (`js/core/learner.js:222`).
  - In the essay editor, each AI-confirmed mistake (comparison form, preposition, countability, conditional form) is
    recorded as a wrong answer on the writing stage's topic: stage 6 maps to `argument-structure`. The draft's
    average band is recorded on the same topic, wrong when it is under 3 of 5 (`js/views/essay.js:91`, `:455-457`).
    Three drafts of one essay gave 7 such attempts: mastery 0.31, "learning".
  - `weakTopics()` and `dailyPlan()` then plan a drill for the weakest topic, with no check of its level against the
    course level (`js/core/adaptive.js:42`, `:270-273`).
  - This is the same family as professional-traveler round 2 N1 (scenario replies logged on functional topics).
- **Why it matters:**
  - Lucid's promise on Progress is "what you can do now, based on evidence". Here the evidence is attached to the
    wrong thing.
  - For Eitan, an A1 dictation labelled "not secure yet" right after academic vocabulary is the "anything basic"
    moment that makes him close the app. It also tells him the analytics can't be trusted.
  - For Tamar, the plan contradicts the AI feedback she just read and spends her minutes on argument structure, when
    her actual pattern (prepositions after verbs) gets nothing.
- **Recommendation:**
  - Record review answers with the topic of the card's source lesson (`card.ref.lesson` → that lesson's topic), or
    with no topic. Never use a fixed topic.
  - Record essay mistakes under topics derived from their error type, via the taxonomy, or with no topic. Record
    argument-related bands (argument strength, counterarguments) on the stage topic, not the draft average.
  - Do not plan a targeted drill below the course level minus one. For an advanced learner, prefer drills on
    recurring error types.
  - Add a unit test: reviewing C1 cards must not create a weak A1 topic, and grammar errors in an essay must not
    lower "argument structure".

**N2. The placement headline says "C1-C2" even when the C2 block was failed.** *Minor (honesty). `#/placement`
result, desktop. Eitan.*
- **Observed:**
  - Eitan got 1 of 4 at C2. The demonstrated level is C1 and the start is C2, by design.
  - The headline reads "Your answers … are consistent with **C1-C2**". The "ace" variant, with every C2 item right,
    gets exactly the same sentence (`shots/e05-placement-result.png`, `shots/ea05-placement-result.png`, logs
    `eitan1.log`, `eitan1ace.log`).
  - Each skill shows "B2+ (2 items at this level)". The 2 items are at C1 or C2, not at "this level" B2+.
  - Cause: `top_band` is true for any demonstrated level of C1 or above (`js/core/placement.js:124`), and the view
    has one sentence for it (`js/views/placement.js:93-94`).
- **Why it matters:** Eitan is checking exactly this. "C1-C2" after missing 3 of 4 C2 questions is the over-promise
  round 1 removed, in a softer form. It is the only claim on the screen not backed by the answers.
- **Recommendation:**
  - Say "consistent with C1" when C1 is the demonstrated level. Use "C1-C2" only when a C2 block was passed.
  - For capped skills, write "B2+ (2 of 2 at C1)".

**N3. Today's reading block names a goal the learner did not choose.** *Minor. `#/today`, desktop and phone.
Eitan.*
- **Observed:** Eitan chose "Work" and "Academic writing". His plan's reading block says "You chose exams and
  university: reading short texts builds the comprehension these exams test" (`shots/e12-today-after-c1-03.png`,
  `shots/e42-today-targeted.png`). The text is hard-coded for any reading block with a goal
  (`js/views/today.js:152`), and the writing goal also yields reading blocks (`GOAL_KINDS.writing`,
  `js/core/adaptive.js:217`).
- **Why it matters:** each block's "why" is how Lucid shows the plan is personal. A wrong reason (and "exams" for a
  30-year-old professional) makes the plan look generic.
- **Recommendation:** word the reason from `b.goal`. For example, for writing: "You chose academic writing: reading
  well-argued texts builds the language you write with".

**N4. Comparing drafts of a long paper means scrolling a 15,000-pixel column.** *Minor. `#/writing/final-C2`
Versions, desktop. Eitan; also Tamar.*
- **Observed:**
  - Compare always renders the whole text in the narrow side column. For Eitan's v1 → v2 (1,157 → 1,652 words) the
    diff is **15,120 px** tall, and the few changed sentences are scattered through it (`shots/e28-C2-versions.png`,
    height from `eitan2.log`).
  - A new paragraph break (Tamar split her counterargument paragraph) is shown but not marked as a change
    (`shots/crop-t35-bottom.png`).
- **Why it matters:** for a research paper, "what did I change since the last feedback" is the question. Finding it
  in 15,000 px of unchanged prose defeats the tool.
- **Recommendation:**
  - Default to "changes only": collapse unchanged paragraphs to "… 3 unchanged paragraphs …", with "Show all" and
    next/previous-change buttons.
  - Mark an inserted or removed paragraph break (for example a pilcrow in `ins` / `del`).
  - On desktop, offer the comparison in the main column.

**N5. The AI's verification note runs into Lucid's own statement.** *Minor (presentation, honesty). AI tab on
`#/writing/final-C2` and `#/writing/final-C1`, desktop. Both personas.*
- **Observed:**
  - In English: "…Check those yourself.I could not verify any of the 24 works you cite…". There is no space or line
    break, so the AI's first-person "I" reads as Lucid continuing (`shots/e37-C2-ai-panel.png`).
  - In the Hebrew UI, the English note flows inside the right-to-left paragraph: "לבדוק בעצמכם.You mention outside"
    (`shots/crop-t43-top.png`).
  - Cause: both are inline `span`s inside the banner's `div.stack-sm` (`js/views/essay.js:187`).
- **Why it matters:** this banner is where Lucid is most honest about its limits, and Eitan reads it closely. Who
  says what should be clear.
- **Recommendation:** show the note as its own block, `display:block; dir="auto"`, labelled "From the AI feedback:"
  (Hebrew: "מהמשוב של ה-AI:").

**N6. The self-rating form says "Before the feedback" after the feedback is shown.** *Polish. AI tab from stage 7,
desktop and phone. Both personas.*
- **Observed:**
  - After the first feedback, the panel shows the summary, the evidence banner, then "Before the feedback: how would
    you rate yourself?" with four empty selects, then "For your next draft" and the bands (`shots/e37-C2-ai-panel.png`,
    `shots/crop-t43-top.png`).
  - The form is meant for the next round, but it reads as if it came too late and splits the feedback in two.
- **Recommendation:** label it "Before your next feedback: rate this draft yourself", and place it by the "Submit
  revised draft" button or fold it.

**N7. The sidebar highlights the wrong section in the Writing lab.** *Polish. `#/writing`, `#/writing/*`, desktop.
Both personas.*
- **Observed:**
  - On `#/writing` both "Practice" and "Writing lab" are highlighted (`shots/t37-writing-mydrafts-desk.png`).
  - On a writing task only "Practice" is highlighted, although the sidebar has a Writing lab entry
    (`shots/e24b-C2-busy-versions-tab.png`, `final-probes.mjs` output).
- **Recommendation:** for `#/writing*` mark only "Writing lab" as current on desktop. Keep "Practice" for the phone tab
  bar, which has no Writing lab tab.

### Also observed (already reported in other round 2 reports)
- The final task's topics and "Must include" list are right-aligned English in the Hebrew UI. This is student-adhd
  N7 (`shots/t67-final-B2-topics-phone.png`).
- Today gives a 10-exercise writing task 4 minutes ("Writing: Editing for concision and precision · 4 min"). This is
  student-adhd N5 (`shots/e06-today.png`).
- The reading block on Today shows a microphone icon. This is student-adhd N11 (`shots/t06-today.png`,
  `shots/e42-today-targeted.png`).
- The plan says "today is a part: up to exercise 11 of 15", but the player never stops there. Tamar ran to the end
  of `c1-01`. This is student-adhd D3 and professional-traveler N5.

### What now works well
- **Revising is safe.** Reopening a lower lesson no longer moves the course. A miss is noted on the path with an
  explicit "Start from B2" choice.
- **The hint ladder is trustworthy:**
  - "You changed this" versus "Looks fixed" is precise;
  - "Show in my text" selects the exact span;
  - on the phone a "Mistakes to fix" strip sits under the editor (`shots/t59-C1-feedback-phone.png`).
- **Version comparison now shows what she did:** word-level edits in place, paragraphs kept, any two versions.
- **Closure and honesty about levels.**
  - The third round ends with a final draft, a range and forward-looking advice.
  - Drafts never show a level.
  - Writing gets a level only from final drafts of two tasks on two days, and Today and Progress say so in words.
- **The placement is honest at the top** (except N2): B2+ caps, "not measured" for speaking and writing, and an easy
  "Start at C1 instead".
- **Open rewrites respect advanced answers:** "Not one of our answers · One model answer · My answer is also correct".
- **The C2 paper workflow is credible:**
  - real or fictional sources;
  - a clear statement that feedback cannot check sources, plus the AI's own verification note;
  - references counted separately and excluded from the word range;
  - a 24,000-character limit with a plain, numeric message before sending;
  - a visible status while a long paper is read;
  - a sticky editor with the source pack beside it.
- **Checks no longer flag correct C1-C2 prose,** and they agree before and after AI feedback.
- **Offline and errors are calm:** all lessons save in one tap, the essay editor works offline, and a failed send
  says "No connection. Your text is saved on this device."
- **The English interface is clean,** and the Work goal's limits are stated up front.

---

## Overall verdict per persona

**Tamar: would keep using Lucid.**
- **Why she would stay:**
  - The writing lab now does what she needs for seminar papers: real prompts, hint-first feedback she can trust, a
    diff that shows her revision, and closure on the final draft.
  - She can revise B2 grammar without losing her C1 course.
  - Phone and offline use fit her bus time.
- **What could stop her** (nothing blocks her):
  - The plan and Progress tell her "argument structure" and "daily life" are her weak topics (N1), contradicting the
    AI's feedback. If she follows them, her real issue (prepositions) never gets practice.
  - The B2 and C1 briefs are English-only in her Hebrew interface (T6).
  - The B2 check still flags "To sum up, I believe" (T5). She might "fix" a correct sentence.

**Eitan: likely to keep using the Writing lab, and at real risk of dropping the daily plan.**
- **Why he would stay:**
  - The honesty he tests for is now mostly there: no C2 from multiple choice, no levels for unmeasured skills, a
    clear statement of what feedback cannot verify, and "One model answer" instead of a single "correct answer".
  - The C2 paper can be submitted at full length, with references, and gets judged without false alarms.
- **What would stop him:**
  - An A1 dictation offered as "Targeted practice … not secure yet" after reviewing academic vocabulary (N1). It is
    basic, wrong and presented as evidence.
  - "Find and fix" items that still reject "to a certain extent" as wrong, with no way to count it (E2).
  - A placement headline that says "C1-C2" after he missed 3 of 4 C2 questions (N2).

## The 5 most important fixes (for these personas)
1. **Attach evidence to the right topic (N1).** Review answers take their lesson's topic. Essay mistakes go to their
   error type, not the stage's argument topic. Never plan a drill far below the learner's level.
2. **Finish the open-answer fix (E2).** Offer "My answer is also correct" on `correct` items from B1 up (or on any
   item whose answer is a full sentence), and add common equivalents such as "to a certain extent".
3. **Exempt phrase linkers from the run-on rule at B2 (T5):** to sum up, to conclude, all in all, first of all, put
   simply, and time phrases ("last year") without a finite verb.
4. **Hebrew briefs for the B2-C2 finals (T6), with the topics and "Must include" list as left-aligned English
   blocks.**
5. **Make the top-band wording match the result (N2), and separate the AI's verification note from Lucid's statement
   (N5).**
