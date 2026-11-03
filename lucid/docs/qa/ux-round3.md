# UX round 3: design, UX, student and teacher panels

Simulated reviews (AI personas), not real user research. Every finding came from a panel agent using the real app
in a browser (Playwright, Chromium) and citing the route, the action and a screenshot. No statistics, quotes or study
results were invented. Nobody outside automated tests and AI personas has used the app yet.

## Who reviewed

| Team | Panels |
|---|---|
| Design | visual design lead; interaction and motion designer |
| UX | first-run and navigation researcher; accessibility specialist; UX writer and mobile specialist |
| Students | Lior 16 (Bagrut, phone); Shira 19 (soldier, phone, dark mode); Omer 27 (developer, B2, English UI); Rina 44 (nurse, false beginner, 115% text); Yosef 58 (importer, Pre-A1/A1, tablet, 130%); Hana 68 (retired, absolute beginner, 150%) |
| Teachers | Bagrut high-school teacher; adult EFL teacher; special-education teacher; academic-writing lecturer |

Reports: `panels-r3/<panel>.md` (first pass) and `panels-r3-retest/<panel>.md` (re-test).

## Process and numbers

1. **First pass**: 15 panels, 247 findings. A synthesis agent checked the doubtful claims in the code and wrote
   `panels-r3/plan.json`: what to keep, 87 items in nine file-disjoint lanes with acceptance criteria, the conflict
   decisions, and what to defer.
2. **Fixes, first round**: nine lanes in parallel git worktrees, each with its own browser suite
   (`tests/e2e/<lane>.mjs`). Merging surfaced 23 cross-lane collisions. An integration pass fixed them, two
   skeptic agents tried to refute the result (test integrity; real use), and 16 further problems were fixed.
3. **Re-test**: the same 15 panels re-checked every earlier finding on the merged build: 156 fixed, 79 partly,
   12 not fixed (10 of them deferred on purpose), none regressed. They found 153 new issues (18 major, 80 minor,
   55 polish), mostly in the new screens.
4. **Final round**: `panels-r3-retest/plan-r4.json`, reviewed against the code by a second agent, covered every
   major and every concrete gap in 77 items over six lanes (`tests/e2e/r4-<lane>.mjs`). Integration found 17
   collisions; the skeptics found 17 more problems (4 major), and caught two tests the fixer had loosened. Both
   were restored to full strength, and the code was fixed.

## What changed for learners

- **Mixed Hebrew and English**: English fragments, IPA and spelled names stay whole inside Hebrew lines; Hebrew
  glosses state the claim instead of repeating English sentences; at Pre-A1/A1 the Hebrew instruction leads; one
  alignment rule; one readable "בעברית" chip.
- **Lessons**:
  - **Coming back**: it resumes instead of restarting, including in the middle of the explanation.
  - **The explanation**: it comes in short steps, each with the Hebrew-speaker pitfall next to its rule. Its
    tables read left to right and fit the phone.
  - **Typed answers**: they get a second try. Its note never gives the answer away.
  - **The end screen**: it tells the truth about the score and leads back to the day's plan, which now agrees
    with Today. Its mistakes box shows exactly what was wrong.
- **Pace**: no game moves on by itself and there are no speed bonuses unless the learner turns on the speed
  challenge; mistakes cost nothing in the calm mode.
- **Large text and touch**:
  - **Before the first lesson**: text size can be set on the first screen.
  - **The lesson**: the top bar stays one row. The answer footer never takes more than 45% of the screen.
  - **Keyboard hints**: no Enter keycaps on phones.
  - **Touch targets**: 44px.
- **Fairness and honesty**:
  - **AI**: no AI consent step on a site without AI.
  - **Review**: options can't be answered by elimination. It selects, then checks, like a lesson.
  - **No sound**: a listening item that could not be heard is not scored.
  - **Self-credit**: it is offered only when the answer could be right.
  - **Writing checks**: they catch the Hebrew-speaker errors the lessons teach, and never say "no problems" under
    a failed check.

## Deferred on purpose

New content programmes and large features, each with its reason in the plan files:
- **Exam and work tracks**: a Bagrut track, a work-communication writing strand, an A1-A2 phone and supplier
  track, and university writing genres.
- **Speaking and listening**: a speak-on-the-spot drill, longer listening texts from B1, and recorded human audio
  for minimal pairs.
- **Level checks**: a fresh item bank for level checks.
- **Export and sharing**: essay export with versions, and a printable progress report.
- **Practice tools**: a trip phrasebook, and picture sets rebuilt around adult survival words.

Some suggestions were turned down where they conflicted with a product principle, for example points for a right
second try and a second attempt on multiple-choice questions.

## Known limits

- 818 authored first-try notes give the answer without naming a rule. The app now holds them back before a
  second try, and the content validator counts them; rewriting them is open content work.
- Speech synthesis and recognition do not run in headless Chromium, so the speaking and listening flows were judged
  by their flow and wording, with speech stubbed in the tests.
- No human teacher, native Hebrew editor or real learner has reviewed this round.
