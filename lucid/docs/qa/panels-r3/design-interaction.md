Simulated review (AI persona), not real user research.

# Design panel, round 3: interaction and motion

## Who I am

I am an interaction and motion designer on the design team, played by an AI. My area is component states (rest, hover, focus,
pressed, selected, disabled, loading, error, success), feedback timing and transitions, touch targets, the "keyboard key" look
of the buttons, the sticky bars and the bottom navigation. I judged the app on a phone (390x844, touch, `pointer: coarse`)
and with a mouse and keyboard (1440x900).

## What I did

All of this ran on a local copy (`http://127.0.0.1:8903`) with Playwright, `he-IL`, service workers blocked. Screenshots
are in the session scratchpad:
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/design-interaction/`
(the file names below are in that folder).

1. **Onboarding on the phone** (`#/start`): I pressed Continue with no year (error state), then entered a name and year,
   chose goals and minutes, picked "אני לא יודע/ת אנגלית בכלל", pressed Finish without the terms box (error state), then
   accepted. I landed in `#/lesson/pa1-01` (`p01`–`p10`).
2. **A full lesson on the phone** (`#/lesson/a1-01`, 15 exercises of all 12 types plus 3 revisits). I mixed my answers: a
   wrong pair in matching, a wrong listening answer, one item in the wrong category, "לא יודע/ת", a hint, a wrong
   "find and fix", one wrong reading answer, the speaking self-rating and a writing task. Then the "part done" screen,
   the revisits and the review screen (`L00`–`L91`). I measured footer heights, scroll jumps, the progress bar and layout
   shift (CLS was 0 for the whole lesson).
3. **Two review sessions on the phone** (`#/review`): 8 first-time option cards, then 14 typed-meaning cards. In those I
   pressed Check on an empty field, used a hint and used "התכוונתי לזה – זה נכון" (`R00`–`R90`, `RT01`–`RT14`).
4. **A round of each game on the phone**: the word quiz `#/games/A1/1` (10 questions, with a tap timed against the
   auto-advance), words and pictures `#/games/pictures/1` (3 boards, one wrong pair) and memory `#/games/memory/1` (a
   mismatch, then a third tap while two cards were face up) (`G00`–`G44`).
5. **A scenario on the phone** (`#/scenario/rl-airport-checkin-overweight`): the Prepare, Model dialogue and Practise tabs
   (all 5 turns, the first one deliberately "poor"), "Now in your own words" with Compare, the done screen and the AI tab
   (`S00`–`S30`).
6. **The essay editor on the phone** (`#/writing/final-B2`): typing, the draft-saved status, Automatic check and the tabs
   (`E00`–`E02`).
7. **Desktop with mouse and keyboard**: Tab through Today; a B1 lesson (`#/lesson/b1-03`) using only Enter and the 1–4 keys;
   hover on options and ghost keys; the onboarding error focus (`K00`–`K31`, `T20`–`T21`).
8. **Stress settings**: the phone lesson at 150% text (`T00`–`T02`), dark mode (`T10`–`T11`), and leaving a lesson mid-way
   with ✕ (`T03`).

A note on method: on this Chromium build, a Playwright full-page screenshot turns off touch emulation (`pointer: coarse`
becomes false and `.key.small` drops from 44 to 36 px). I re-enabled touch emulation after every full-page shot. Every
touch-target size below was measured with `pointer: coarse` active.

## What works and must be kept

- **The key metaphor on primary actions.** `.key` has a 3 px "skirt" that presses down (`translateY(2px)`, thinner
  skirt) in 80 ms, and the orange `.key.enter` is unmistakable. It is quick and tactile without being playful, which
  suits the brand (`L03-e2-listen-c-result.png`).
- **The lesson's sticky verdict footer.** It turns green, red or amber, puts the right answer first and hides "למה?"
  behind a disclosure. It reads calmly and works in dark mode (`T11-dark-wrong.png`). CLS was 0.00 across the whole lesson.
- **Focus handling in the player.** After Check, focus moves to "המשך" with a visible 2 px ring (`K20-mcq-result.png`).
  1–4 pick an option, and Enter checks and then continues. Enter on any other control does that control's own job.
- **Leaving without guilt.** ✕ leaves the lesson at once, with no "are you sure" dialog. Today then shows "להמשיך: Present
  simple: I, you, we, they · 3 מתוך 15" (`T03-after-exit-today.png`). The "החלק של היום הושלם" screen makes "לעצור כאן"
  the primary key (`L-partend.png`).
- **The games guard against double taps.** Picture and memory ignore taps for 450 ms after a board opens. In memory, a
  third tap turns a mismatched pair back at once instead of making me wait (`G44-mem-third-tap.png`; a mismatched pair
  turns back by itself after about 1.1 s). In the picture game a wrong pair shakes once, turns red and says "לא מתאים.
  נסו שוב." (`G32-pic-wrong.png`). Game sounds have an off switch, and reduced motion is respected globally.
- **The honest AI state in scenarios.** "שיחה חופשית עם AI עוד לא זמינה באתר הזה." comes with a primary "לתרגול
  המובנה" key (`S30-roleplay-full.png`).
- **The bottom tab bar.** Each of the 5 targets is 72x52 px with a clear dark "pressed" pill for the current tab
  (`G00-hub.png`).
- **Large onboarding choice cards.** The goals, minutes and starting-point cards are 56 px or taller, and the step bar
  fills right to left (`p05-ob-step1-selected.png`).

## What did not work

### F1 (major): Toggle keys and chips have no visible "selected" state
- **Routes:** `#/lesson/a1-01`: reading e12 (True/False), categorize e3, speaking e14 self-rating.
- **What I did:** I tapped "True" on reading question 1, tapped the item chip "My friends like pizza." in categorize, and
  tapped "אמרתי את זה בבירור" in speaking.
- **What happened:** nothing changed visually. The DOM had `aria-pressed="true"`, but the computed background and border
  of the pressed and unpressed keys were identical (`oklch(0.995 0.002 250)` / `oklch(0.905 0.008 250)`). After Check, the
  True/False keys are only disabled, so I could not see what I had answered, only "התשובה: false"
  (`P10-read-tf-picked.png`, `P11-read-tf-after-check.png`, `L04-e3-categorize-cat-selected.png`,
  `L16-e14-speak-b-ready.png`). The CSS styles `[aria-pressed='true']` for `.option`, `.choice`, `.match-item` and
  `.pic-*`, but not for `.key` or `.chip`.
- **Suggestion:** add a "latched key" state: `.key[aria-pressed='true'], .chip[aria-pressed='true']` with a cobalt
  border, cobalt tint and the skirt held down (1 px). After Check, mark the chosen True/False with `is-right` or
  `is-wrong` plus the ✓/✗ icon, and scroll to the first wrong question.

### F2 (major): Secondary actions look like plain text
- **Routes:** every player footer and several result screens.
- **What I saw:** `.key.ghost` has no border, no fill and no skirt. On a phone there is no hover to reveal it.
  "לא יודע/ת", "רמז", "לא יכול/ה לדבר כרגע", "לא זוכר/ת", "התכוונתי לזה – זה נכון", "לתרגל שוב", "את כל התרגול
  מחדש", "אחר כך", "ישר לתרגול", "חזרה" and "להוסיף 8 מילים לחזרה המרווחת" all read as captions
  (`L03-e2-listen-a.png`, `RT02-b.png`, `S20-done.png`, `G18-word-summary-full.png`, `p05-ob-step1-selected.png`).
  "I don't know" and "Can't speak right now" are important escape hatches, and they are the least discoverable.
- **Suggestion:** use a "flat key" for secondary actions: a 1 px `--key-edge` border on the `--key-sunk` fill, the same
  height as the primary key and no skirt. Keep plain link styling only for real links.

### F3 (major): The same option card commits answers in three different ways
- **Routes:** `#/lesson/*`, `#/review`, `#/games/A1/1`, `#/scenario/*`.
- **What I saw:** the numbered option card looks the same everywhere.
  - In a lesson, a tap only selects; I then need "בדיקה" (`L05-e4-mcq-b-ready.png`).
  - In review (first-time cards), the word game and scenario practice, a tap is the final answer and is graded at once
    (`R01-b.png`, `G11-word-after-wrong.png`, `S10-turn-after.png`).
  After a lesson I tapped the first review option just to "look", and it was recorded as wrong.
- **Suggestion:** pick one rule. Either "tap = answer" for every single-choice item (the lesson MCQ then needs no Check
  step), or "select, then Check" everywhere. If both must stay, make them look different: no number keycap and a short
  line "הבחירה נבדקת מיד" on instant-commit lists.

### F4 (major): In scenario practice on a phone, Continue ends up under the bottom navigation
- **Route:** `#/scenario/rl-airport-checkin-overweight`, Practise tab.
- **What I did:** I tapped a reply.
- **What happened:** the page jumped from scrollY 0 to 635 to show the explanation. "המשך" then sat at y=763 css px,
  behind the fixed tab bar (which starts at about 781). Only its top edge was visible (`S10-turn-after.png`). Unlike the
  lesson player, scenario practice runs inside the app shell, so the 5-tab navigation stays on screen during an exercise.
- **Suggestion:** run Practise in the player layout: a sticky `.player-foot` with "המשך" and no tab bar. At minimum,
  reveal with `block: 'nearest'` and add bottom padding equal to the tab bar height.

### F5 (minor): Touch targets below 44 px
- **Measured on the phone with `pointer: coarse`:**
  - Scenario bubble play buttons are 29x29 px. Their inline `min-height:1.8rem; width:1.8rem` overrides the coarse rule
    (`S01-listen.png`, `S02-practise-t1.png`).
  - Essay "עב" reveal keys are 27x44 px.
  - The essay summary "חובה לכלול (5)" is 308x23 px.
  - Lesson gap inputs are 91x41 px; the reading gap input is 65x32 px.
  - The lesson Learn screen's vocabulary play keys shrink to 28–40 px wide.
  - The app-shell help and settings keys are 40x44 px.
  - Today's "לכל השיעורים" link is 84x23 px.
- **Suggestion:** remove the inline sizes and give icon-only keys `flex: none`. Under `pointer: coarse`, set
  `min-height: 2.75rem` on `.gap-input` and on `summary`, and give `.he-reveal` `min-width: 2.75rem`.

### F6 (minor): The lesson progress bar jumps in width and can shrink after a mistake
- **Route:** `#/lesson/a1-01`.
- **What I saw:** the track takes the space left over by the step label. With "2 מתוך 15" it was about 166 px wide; with
  "3 מתוך 15 · 1 לחזרה" it was 101 px. The fill went from 19.8 px to 18.1 px even though the percentage rose from 12% to
  18% (`L03-e2-listen-a.png` vs `L04-e3-categorize-cat-selected.png`). The bar also never animates: the whole player is
  re-rendered, so the 0.4 s width transition has no old value to start from (the width was the same at 0 ms and 500 ms).
- **Suggestion:** give the step label a fixed slot, or put "1 לחזרה" under the bar. Keep the bar element between steps
  so the transition plays (it is already disabled under reduced motion).

### F7 (minor): At 150% text the lesson footer takes half the phone screen
- **Route:** `#/lesson/a1-01` at text size 150%.
- **What I measured:**
  - In the answer state the footer was 193 px tall, because "לא יודע/ת" wraps onto its own row. Options 2 and 3 were
    hidden behind it (`T01-150-answer.png`).
  - After a wrong answer it was 416 px, which is 49% of the 844 px viewport (`T02-150-wrong.png`).
  - After "I don't know" it was 371 px.
- **Suggestion:** at 130% and above, keep the secondary actions on one row as an icon plus a short label, and hide the
  Enter keycap. Cap `.verdict` at about 35dvh with "למה?" closed. Scroll the chosen option into view above the footer
  after Check.

### F8 (minor): Keyboard hints are shown on touch devices
- **Routes:** every player.
- **What I saw:** each primary key on the phone shows an "Enter" keycap ("בדיקה Enter", "המשך Enter", "בואו נלמד
  Enter"), and the options show 1–4 (`p10-after-onboarding.png`, `L02-e1-match-c-result.png`). On a phone they add width
  and imply a keyboard that is not there.
- **Suggestion:** `@media (hover: none) and (pointer: coarse) { .key .kbd { display: none } }`. The 1–4 keycaps can
  stay as option labels, but in a quieter style.

### F9 (minor): Hover, press and tap-highlight are missing on several key-shaped controls
- **What I saw:**
  - On desktop, `.option` has no `:hover`. The background stayed `oklch(0.995 0.002 250)` under the pointer
    (`K30-option-hover.png`).
  - `.match-item`, `.choice`, `.pic-tile`, `.pic-word` and `.mem-card` all have the 3 px key skirt but no `:active`
    press. Only `.key`, `.option` and `.chip` press. `.chip:active` also lacks `:not(:disabled)`.
  - `.match-item`, `.choice`, `.chip` and `.seg button` do not set `-webkit-tap-highlight-color: transparent`. The
    tapped match tile "live" showed a square light-blue halo outside its rounded corners
    (`L02-e1-match-match-selected.png`).
- **Suggestion:** one shared "pressable" rule for everything with a skirt: hover tint, `:active` press, transparent tap
  highlight and a focus ring.

### F10 (minor): Review feedback states contradict each other and the lesson
- **Route:** `#/review` with typed cards.
  - Check on an empty field is enabled and does nothing: no message and no shake (`RT02-emptycheck.png`). The lesson
    disables Check until there is an answer.
  - After "התכוונתי לזה – זה נכון", the footer stays red with ✗ "לא בדיוק", while a small "נספר כנכון" replaces the key
    (`RT02-override.png`). In the lesson, "גם התשובה שלי נכונה" turns the footer green with "נספר כנכון".
- **Suggestion:** disable Check while the field is empty. On override, redraw the verdict as the lesson does (green,
  "נספר כנכון", with the meaning still shown).

### F11 (minor): Essay editor: the Check key moves, and the summary contradicts the checks
- **Route:** `#/writing/final-B2` on the phone.
  - While typing, "הטיוטה נשמרה" sits in the counter row and pushes "בדיקה אוטומטית" onto its own line on the right.
    After Check the label is gone, and the key jumps up and to the left (`E01-typed.png` vs `E02-checked.png`).
  - With 66 of the target 450–600 words, the inline line says "הבדיקה לא מצאה בעיות מוכרות.", while the Checks tab
    below shows ⚠ "66 מילים (יעד 450-600)" (`E02-crop-bottom.png`). The results start below the fold.
  - The brief, the three question radios and five "חובה לכלול" items push the textarea down about 1,600 css px
    (`E00-open-full.png`).
- **Suggestion:**
  - Reserve a fixed slot for the save status, or show it as an icon in the counter.
  - Make the inline line count what the checks found ("דבר אחד לבדוק: אורך") and link to it.
  - Collapse the brief into a "המשימה" drawer once a question is chosen, so the task stays one tap away while writing.

### F12 (minor): Auto-advance and speed bonuses in the games hurry the learner
- **Routes:** `#/games/A1/1`, `#/games/pictures/1`.
- **What I saw:**
  - After a right answer, the word game shows the meaning, an example sentence and a "לשאלה הבאה" key, then replaces the
    question after 1.1 s. When I aimed at that key at 1.15 s, it was already gone (`G19-word-racetap.png`).
  - The picture game moves to the next board by itself after about 2.3–2.5 s (`G33-pic-boarddone.png`).
  - Both reward speed ("בונוס מהירות 5+"). PRODUCT.md promises no time pressure apart from opt-in timed writing.
  - The "next" key is a small white key inside the card, unlike the full-width orange footer key everywhere else.
- **Suggestion:** no auto-advance by default. If it is kept, show a visible 3 s countdown ring that pauses on touch, plus
  a setting. Make the speed bonus opt-in, and use the same footer "המשך" key as the lesson.

### F13 (minor): Matching repeats feedback it already gave
- **Route:** `#/lesson/a1-01`, e1.
- **What I saw:** each pair is checked as it is made (a wrong pair shakes and turns red for 0.3 s; a right pair turns
  green and locks). After the last pair I still had to press "בדיקה" to get a red "לא בדיוק · ניסיון שגוי אחד", even
  though every pair was now right. Matched tiles fade to 45% opacity, and nothing shows which left tile went with which
  right tile (`L02-e1-match-c-result.png`).
- **Suggestion:** finish automatically when the last pair locks, with a neutral or amber verdict ("כל הזוגות נכונים ·
  ניסיון שגוי אחד"). Show the pairs side by side, or give each pair a shared marker.

### F14 (minor): Onboarding errors are not attached to their fields
- **Route:** `#/start`, phone and desktop.
- **What I saw:** with no year, "בחרו שנת לידה." appears in red under the help text (`role="alert"`, which is good).
  But focus stays on `BODY`, the select has no `aria-invalid` and no red border. The terms error behaves the same way
  (`p03-ob-step0-error.png`, `p09-ob-step3-err.png`, `T20-desk-ob-error.png`).
- **Suggestion:** move focus to the first invalid field, set `aria-invalid` and `aria-describedby`, add a red border, and
  place the message directly under the control.

### F15 (polish): Mixed state signals on options
- **Routes:** `#/lesson/*`, `#/review`.
- **What I saw:** a wrong option keeps its blue "selected" keycap inside a red card. Lesson and review options show right
  and wrong by colour only, while the word game adds ✓/✗ icons on the options (`L03-e2-listen-c-result.png`,
  `T11-dark-wrong.png`, `G11-word-after-wrong.png`).
- **Suggestion:** use the `.game-mark` icon pattern everywhere, and reset the keycap colour in `is-right` and `is-wrong`.

### F16 (polish): Bidi and layout details in exercises
- The reading True/False row is right-to-left inside an English question: "False | True", aligned right, under a
  left-aligned statement. The answer line says "false" in lower case (`L14-e12-read-b-ready.png`).
- In the writing exercise's "בדקו את עצמכם", the second checkbox sits alone on a line and its label wraps below it
  (`L17-e15-write-c-result.png`).
- The revisit note "חוזרים על זה שוב, כדי שיישאר" puts its icon on its own line (`L20-e11-correct-retry-a.png`).
- **Suggestion:** set `dir="ltr"` on the True/False row. Lay out the checklist as a grid (box column plus text column).
  Make the revisit note an inline row.

## Top 3 wishes

1. **One state system for everything pressable.** Rest, hover, pressed, latched (selected), disabled, right (✓) and wrong
   (✗) should be defined once and applied to `.key`, `.chip`, `.option`, `.match-item`, `.choice`, `.pic-*` and
   `.mem-card`, so a selection can never be invisible again.
2. **One "answer → feedback → continue" rhythm** for lessons, review, games and scenarios. That means the same commit
   rule, the same sticky footer with the orange "המשך", and no auto-advance unless the learner asks for it.
3. **A phone-first practice mode.** No bottom navigation during an exercise, a footer that never takes more than about a
   third of the screen at large text, no keyboard hints on touch, and every target at least 44x44 px.
