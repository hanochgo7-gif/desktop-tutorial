Simulated review (AI persona), not real user research.

# Design panel, round 3 re-test: interaction and motion

## Who I am

I am the interaction and motion designer on the design team, played by an AI. I look after component states, feedback
timing, transitions, touch targets, the keyboard-key look of the buttons, sticky bars and the bottom navigation. I tested
on a phone (390x844, touch, `pointer: coarse`) and with a mouse and keyboard (1440x900). This is a re-test of my report
from a few hours ago (`docs/qa/panels-r3/design-interaction.md`) after the team shipped the plan in
`docs/qa/panels-r3/plan.json`.

## What I did

Everything ran on a local server (`http://127.0.0.1:9603`) with Playwright, locale `he-IL` and service workers blocked.
All screenshots are in
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/design-interaction/`.
The file names below refer to that folder.

1. **Onboarding on the phone** (`#/start`). I pressed Continue with no year, tried the new text-size control, chose
   goals and minutes, pressed Continue with no starting point, picked "zero" and pressed Finish without the terms box.
   I landed in `#/lesson/pa1-01` (`p01`–`p08`).
2. **A full lesson on the phone** (`#/lesson/a1-01`, all 15 exercises, the part-end screen, "להמשיך ולסיים", 3 revisits
   and the end screen). I played it at 100% (`L100l-*`) and again at 150% text (`L150l-*`). I made a wrong pair in
   matching, gave a wrong listening answer, put one sentence in the wrong category, used "לא יודע/ת" and a hint, used the
   new second try (fixed it once with "לנסות שוב", gave up once with "להציג את התשובה"), got one reading question wrong,
   misspelled the dictation, self-rated the speaking and wrote the writing task. CLS for the whole lesson was 0.004 at
   100% and 0 at 150%.
3. **Two review sessions on the phone** (`#/review`). In the first I did 6 option cards, tapping one option and then
   another before Check. In the second I did 4 typed cards: Check on an empty field, a hint, a wrong answer and
   "התכוונתי לזה – זה נכון". I ended with the end screen (`R*`, `RT*`).
4. **A round of each game on the phone**: the hub with the new "אתגר מהירות" switch, the word quiz `#/games/A1/1`
   (10 questions, waiting 3 s after each answer), words and pictures `#/games/pictures/1` (3 boards, one wrong pair,
   waiting 3.5 s after each board) and memory `#/games/memory/1` (a mismatch, a 3 s wait, then a third tap) (`G*`).
5. **A scenario on the phone** (`#/scenario/rl-airport-checkin-overweight`): Prepare, Model dialogue and all 5 Practise
   turns with the new select-then-check footer, "own words" with the keyboard open, and the done screen. I repeated the
   first turn at 150% (`S*`).
6. **The essay editor on the phone** (`#/writing/final-B2`): choosing a question, typing, the save mark and Automatic
   check (`E*`).
7. **Desktop with mouse and keyboard** (`#/lesson/b1-03`): Enter and the number keys only, hover on options and secondary
   keys, Tab into a gap (`K*`).
8. **Dark mode on the phone**: a wrong verdict, the part-end screen and Today's new "done" state with a 10-minute plan
   (`D*`). Plus probes of touch targets on Today, Help, the Learn stage and `#/lesson/b1-02` (`M*`, `P*`).

As before, a full-page screenshot in this Chromium build turns off touch emulation, so the "Enter" chips seen in some
full-page shots are an artefact. I measured every touch-only property in viewport shots with touch emulation on.

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Fresh evidence |
|---|---|---|---|
| F1 | Toggle keys and chips have no visible "selected" state | **Fixed** | Categorize chip, True/False key and speaking self-rating now latch: background `oklch(0.94 0.035 263)` and border `oklch(0.47 0.165 263)` against `oklch(0.995 …)` / `oklch(0.905 …)` for the others (`L100l-02-e3-chipsel.png`, `L100l-12-e12-tfsel.png`, `L100l-14-e14-selfsel.png`). After Check, the chosen "True" shows ✗ in red, the right "False" shows ✓ in green and the line reads "התשובה: False" (`L100l-12-e12-result-full.png`). |
| F2 | Secondary actions look like plain text | **Fixed** | "לא יודע/ת", "רמז", "לא יכול/ה לדבר כרגע", "לא זוכר/ת", "להציג את התשובה", "ישר לתרגול", "הקודם", "אחר כך" and "את כל התרגול מחדש" are flat keys with a 1 px border, a sunk fill and full key height (`L100l-00-e1-a.png`, `R01-picked.png`, `p05-ob-start-error.png`, `L100l-end-19.png`). In dark mode the border is `oklch(0.56 0.012 250)` on a `oklch(0.2 …)` fill and is clearly visible (`D01-dark-answer.png`). |
| F3 | The same option card commits answers in three different ways | **Fixed** | Lesson, review and scenario practice all select first and then commit with "בדיקה". In review, my first tap left the footer neutral with no verdict; a second tap moved the selection; Check graded it (`R01-picked.png`, `R02-repicked.png`). The word quiz keeps tap-to-answer, but now says "הבחירה נבדקת מיד." above the options and shows no number keycaps on touch (`G10-word-q1.png`). |
| F4 | In scenario practice on a phone, Continue ends up under the bottom navigation | **Fixed** (new issue below) | On all 5 turns the footer key sat at y=656–768 with the tab bar starting at 780, fully visible (`S10-turn-selected.png`, `S11-turn-checked.png`). While I typed in "own words", `body.typing` hid the tab bar. See new finding N2 about the footer moving between turns. |
| F5 | Touch targets below 44 px | **Partly** | Fixed: app-bar Help and Settings 44x44, lesson gap 91x44, reading gap 65x44, "בעברית" chip 63x44 (`#/lesson/b1-02`), the essay "המשימה" summary and the scenario play keys (no longer flagged). Still small: Today's "לכל השיעורים" 84x23 (`M00-today.png`), memory's "ללוח קטן: 8 קלפים" 114x31 (`G40-mem-board.png`), Help's "פרטיות ותנאים" 88x23, and the games-hub "אתגר מהירות" checkbox is a native 13x13 box (`G00-hub.png`). |
| F6 | The lesson progress bar jumps in width and can shrink after a mistake | **Fixed** | The track stayed 246 px for all 19 steps at 100% and 174 px at 150%. The first pass shows only "N מתוך 15"; the retry round says "חוזרים 1 מתוך 3" (`L100l-18-e10r-a.png`). The bar now animates: the fill measured 26.7 px at 0 ms and 29.3 px at 200 ms after Continue. |
| F7 | At 150% text the lesson footer takes half the phone screen | **Partly** | The answer-state footer is still about 194 px, with "לא יודע/ת" on its own row (`L150l-01-e2-ready.png`). After a wrong answer the footer is still 416 px, or 49% of 844 (`L150l-01-e2-result.png`). The verdict text is now capped, but the cap applies only to the text, not to the footer. The new second-try footer is 500 px (59%); see N1. |
| F8 | Keyboard hints are shown on touch devices | **Fixed** | No visible `.kbd` on the lesson intro, exercises, review or part-end on the phone (`p08-after-onboarding.png`, `R00-start.png`). Help on touch no longer lists keyboard shortcuts. On desktop, "המשך Enter" is still there (`K20-opt-result.png`). Lesson and review options keep small grey number labels, which is fine. |
| F9 | Hover, press and tap-highlight are missing on several key-shaped controls | **Fixed** | On desktop, an option goes from `oklch(0.995 …)` to `oklch(0.9626 …)` on hover and its border darkens. A flat key goes from `oklch(0.945 …)` to `oklch(0.907 …)` (`K10-hover.png`). `app.css` line 1125 now presses `.chip, .option, .choice, .match-item, .pic-tile, .pic-word, .mem-card`. The match tile's tap highlight is `rgba(0,0,0,0)` and the tapped tile showed no square halo (`L100l-00-e1-lsel.png`). |
| F10 | Review feedback states contradict each other and the lesson | **Fixed** | Check is disabled on an empty typed field (`RT01-empty.png`). "התכוונתי לזה – זה נכון" turns the footer green with ✓ "נספר כנכון" and keeps "relax = לנוח, להירגע" (`RT20-override.png`). |
| F11 | Essay editor: the Check key moves, and the summary contradicts the checks | **Fixed** (polish note N7) | "בדיקה אוטומטית" stayed at the same place (x=218, y=828, 156x48) before typing, after typing and after checking. The status now says "דבר אחד לבדוק: אורך (חסרות 432 מילים)." and matches the ⚠ "18 מילים (יעד 450-600)" check (`E03-checked.png`). After I chose a question, the brief folded into "המשימה" and the textarea moved up from y=1861 to y=418 (`E01-topic-chosen.png`). |
| F12 | Auto-advance and speed bonuses in the games hurry the learner | **Partly** | The pace is fixed. The word-quiz verdict was still on screen 3 s after every one of 10 answers. Each picture board stayed with "ללוח הבא" 3.5 s after it was done. A memory mismatch stayed face up until my next tap. The results show no speed bonus. The word quiz now uses the full-width orange "המשך" footer key (`G11-word-answered.png`). But the picture game still ends a board with a small white "ללוח הבא" key (88x44) inside the green card (`G33-pic-boarddone.png`), so two games end a step in two different ways. |
| F13 | Matching repeats feedback it already gave | **Fixed** | A wrong pair shows red with ✗ on both tiles (`L100l-00-e1-wrongpair.png`). After the last pair, the verdict appears without "בדיקה". It is amber, with ✓ "כל הזוגות נכונים · ניסיון נוסף אחד", and the board turns into full-opacity rows ("לגור — live") with play keys (`L100l-00-e1-result.png`). |
| F14 | Onboarding errors are not attached to their fields | **Fixed** | With no year, focus moves to `#ob-year`, which gets `aria-invalid="true"`, a red border and `aria-describedby="ob-year-help ob-err"`. The message "בחרו שנת לידה." sits 8 px under the select (`p02-ob-year-error.png`). The start and terms errors behave the same way (`p05-ob-start-error.png`). |
| F15 | Mixed state signals on options | **Fixed** (polish note N10) | A wrong option now has a red keycap and ✗, and the right one has a green keycap and ✓, in light and dark (`L100l-01-e2-result.png`, `D02-dark-result.png`). The lesson footer is a neutral surface with a coloured accent bar. |
| F16 | Bidi and layout details in exercises | **Partly** | Fixed: the True/False row is LTR with True on the left, the answer line says "False" with a capital, and the writing checklist is a box-and-text grid (`L100l-12-e12-result-full.png`, `L100l-15-e15-result.png`). Not fixed: the revisit note still puts its ↻ icon on its own line above "עוד פעם אחת, כדי שיישאר" (`L100l-18-e10r-a.png`). |

**Summary: 12 fixed, 4 partly fixed, none regressed.**

## New findings

### N1 (major): At 150% text, the second-try footer covers 59% of the screen and cuts the hint mid-sentence
- **Route:** `#/lesson/a1-01` at text size 150%, phone, e7 (gaps) and e9 (rewrite) after a wrong typed answer.
- **What I did:** I typed "zzz" in both gaps and pressed "בדיקה".
- **What happened:** the new "עוד לא. אפשר לתקן בעצמכם" footer measured 500 px of 844 (59%) on e7 and 466 px on e9. The
  hint text is cut off after "the short word we use before", inside an inner scroll area that shows no fade or scrollbar
  (`L150l-06-e7-second.png`). The gaps I need to fix sit in the remaining 344 px. This screen is new in this round, and
  the hint is the whole point of the second try.
- **Suggestion:** at 130% and above, put "להציג את התשובה" and "לנסות שוב" on one row, or make "להציג את התשובה" a text
  link under the primary key. Give the clipped verdict a bottom fade and a "עוד" affordance. Better still, show the
  targeted note under the exercise itself (next to the gaps), and keep only the title and two keys in the footer.

### N2 (minor): The scenario footer floats and jumps 64 px from turn 2 onwards
- **Route:** `#/scenario/rl-airport-checkin-overweight?tab=practise`, phone.
- **What I saw:** on turn 1 the footer top is at y=707, right on top of the tab bar. From turn 2 it sits at y=643, with a
  74 px strip of page showing between the footer and the tab bar (`S13-turn1-initial.png`). The "בדיקה" key therefore
  moves 64 px between turns. Unlike the lesson, the primary key is not full width; it is a small key on the left.
- **Suggestion:** anchor the footer to the tab bar (`position: fixed; bottom: var(--tabbar-h)`) or reserve
  `padding-bottom` so the sticky element always reaches its stuck position. Use the lesson's full-width primary key on
  phones so the action is in the same place on every practice screen.

### N3 (minor): After Check in a reading exercise, the wrong answer is two screens above
- **Route:** `#/lesson/a1-01` e12 (reading), phone.
- **What I saw:** after Check the page scrolled to the bottom (scrollY 1261 at 100%, 3190 at 150%). The visible part
  shows questions 3 and 4, both right. The footer says only "3 מתוך 4 נכונות", and the wrong question 1 is off screen
  above (`L100l-12-e12-result.png`).
- **Suggestion:** scroll to the first wrong question with `block: 'center'`, or name it in the footer ("שאלה 1 לא
  נכונה") as a button that scrolls to it.

### N4 (minor): The review hint repeats the example that is already on the card
- **Route:** `#/review`, typed meaning card for "relax".
- **What I saw:** the card shows "She relaxes on the sofa after work." Pressing "רמז" adds a yellow box with the same
  sentence word for word (`RT02-hint.png`). The hint costs the learner something and adds nothing.
- **Suggestion:** when the example is already shown, give a different hint: the first Hebrew letter, the number of
  letters, or the part of speech. Hide "רמז" when there is no other hint to give.

### N5 (minor): "לנסות שוב" reopens the gaps still in their red error state
- **Route:** `#/lesson/a1-01` e7, phone.
- **What I saw:** after "לנסות שוב", both gaps stay pink with a red underline while I edit them. The focused one gets a
  blue ring around a red field (`L100l-06-e7-second-open.png`). It looks as if the edit is already wrong.
- **Suggestion:** on reopen, clear the right/wrong classes, so the field returns to its normal editable state and keeps
  only the learner's text. Put a short marker such as "לתיקון" next to it if needed.

### N6 (polish): Categorize results show "right" in two different ways
- **Route:** `#/lesson/a1-01` e3.
- **What I saw:** a correctly placed sentence in "Correct" is a white card with a green ✓. A correctly placed sentence in
  "Wrong" is a dashed card with the sentence struck through in red, plus a grey "במקום הנכון" badge
  (`L100l-02-e3-result-full.png`). The red strike reads as "you got this wrong".
- **Suggestion:** use the green ✓ card for every correct placement. Show that the sentence itself is ungrammatical with
  a neutral marker (for example a small "שגוי" tag or a red underline on the faulty word), not a red strike on the card.

### N7 (polish): The essay's save mark reads as "target met"
- **Route:** `#/writing/final-B2`, phone.
- **What I saw:** the save status is now a green ✓ placed right after "יעד 450-600", next to "18 מילים"
  (`E02-typed.png`). With 18 of 450 words, a green tick beside the target reads as "you met the target".
- **Suggestion:** use a neutral icon (a cloud or a disk) in faint ink, or the word "נשמר", and keep it apart from the
  word count.

### N8 (polish): Choosing 130% or 150% re-flows the control under the finger
- **Route:** `#/start` step 1, phone.
- **What I saw:** the new "גודל טקסט" control is one row of 4. After I tapped "130%" it grew into a 2x2 grid, and the key
  I had just tapped jumped to the second row (`p02-ob-year-error.png` vs `p03-ob-size130.png`).
- **Suggestion:** make the control 2x2 from the start on narrow screens, or use shorter labels ("א", "א+", "א++") so it
  stays on one row at 150%.

### N9 (polish): At 150% the tab label "אנגלית לחיים" becomes "לחיים"
- **Route:** any shell page at 150%, for example `#/scenario/...` (`S40-scen-150-checked.png`).
- **What I saw:** the tab bar shortens the label to "לחיים", which on its own reads as "Cheers!".
- **Suggestion:** use a short label that keeps its meaning ("מהחיים", or an icon plus "חיים יומיומיים" on two lines), or
  let the label wrap to two lines.

### N10 (polish): Game feedback still uses the old pink card
- **Routes:** `#/games/A1/1`, `#/games/pictures/1`.
- **What I saw:** the lesson and review verdicts now sit on a neutral surface with a coloured accent bar. The word quiz
  still shows a fully pink "לא נכון" card in the page, and the picture game shows a fully green card holding its own next
  key (`G11-word-answered.png`, `G33-pic-boarddone.png`).
- **Suggestion:** use the same verdict component (neutral surface, accent bar, ✓/✗) in the games, with the full-width
  footer "המשך" / "ללוח הבא".

### N11 (polish): The speed-challenge "switch" is a tiny native checkbox inside a key-shaped card
- **Route:** `#/games` (`G00-hub.png`).
- **What I saw:** "אתגר מהירות" is a card with the key skirt, but the control inside is a 13x13 native checkbox. It does
  not look like a setting and does not match the app's other toggles (the `.seg` segmented controls).
- **Suggestion:** use a two-state segmented control ("רגוע" / "אתגר מהירות") or a real switch of at least 44 px, and drop
  the skirt from the card so the card does not look pressable as a whole.

### N12 (polish): The exit ✕ and the progress bar scroll away after Check
- **Routes:** `#/lesson/*` on the phone, for example a1-01 e2 and e3, and in dark mode (`L100l-01-e2-result.png`,
  `D02-dark-result.png`).
- **What I saw:** to reveal the verdict, the page scrolls (scrollY 78–231), and the player top with ✕ and the progress
  bar leaves the screen. On long exercises the learner loses their place and the way out.
- **Suggestion:** make `.player-top` sticky (it is only about 64 px tall), or reveal with `block: 'nearest'` measured
  against the footer so the top stays when it can.

## What I liked (keep it)

- **One select-then-check rhythm** across lesson, review and scenario, with honest "הבחירה נבדקת מיד." where the games
  differ. The scenario's "בחרו תשובה, ואז ״בדיקה״." line in the empty footer teaches the rhythm without a tutorial.
- **The latched state is calm and clear**: a cobalt tint and border, the same on chips, True/False, self-rating, review
  options and scenario replies.
- **Flat secondary keys**: the escape hatches ("לא יודע/ת", "לא יכול/ה לדבר כרגע", "לא זוכר/ת") are now real buttons of
  the same height as the primary key, and they read well in dark mode.
- **The new lesson verdict**: a neutral surface, a 4 px accent bar in red, amber or green, ✓/✗ glyphs on the options
  themselves, and the right answer first. It feels quieter and more grown-up than the pink panels did.
- **Matching that finishes itself**, forgives one slip in amber, and ends as readable rows with play keys.
- **The second try**: "עוד לא. אפשר לתקן בעצמכם" with the targeted note, and "לנסות שוב" as the primary key. At 100% it
  is well paced; it only needs the large-text fix in N1.
- **The progress bar** keeps its width and now animates; "חוזרים 1 מתוך 3" is a clear name for the retry round.
- **Calm games**: nothing moves on by itself, a memory mismatch waits for me, and there is no speed bonus unless I opt
  in. The word quiz's full-width "המשך" makes it feel like the rest of the app.
- **The part-end screen** still makes "לעצור כאן" the primary key, and Today now says "התוכנית להיום הושלמה (כ-7 דק׳)"
  with a calm check banner and an optional "רוצים עוד?" (`D06-today-after-lesson.png`).
- **The essay editor** keeps its Check key still, collapses the brief, and hides the tab bar while I type.
- **Onboarding errors** now take the focus and sit under their field. The new text-size control works live from the
  first screen.
- **Zero layout shift**: CLS was 0.004 for the full lesson at 100% and 0 at 150%, and the memory grid did not move once
  across 8 taps.

## Top 3 wishes

1. **A large-text footer budget.** At 130% and above, no footer state (answer, verdict, second try) should take more than
   about a third of the screen. Use one row of keys, long notes inside the exercise, and a visible cue whenever text is
   clipped (N1, F7).
2. **Finish the shared-component sweep in the games and the scenario.** The same verdict component, the same full-width
   footer key in the same spot, and a footer that never floats (N2, N10, F12).
3. **Close the last small targets and states.** Fix the 23–31 px links on Today, memory and Help, the 13 px challenge
   checkbox, the inline revisit note, and a neutral editing state on "לנסות שוב" (F5, F16, N5, N11).
