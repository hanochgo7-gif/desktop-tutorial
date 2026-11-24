Simulated review (AI persona), not real user research.

# UX panel, round 3: accessibility

## Who I am

I am the accessibility specialist on the UX team, played by an AI. I test with the tools a disabled learner relies on, or
with tools that act like them: keyboard only, the accessibility tree a screen reader reads, text at 150%, reduced
motion, dark mode, and mixed Hebrew and English (bidi and `lang`). I cite WCAG 2.2 where it applies. Lucid's own target
(PRODUCT.md) is WCAG 2.2 AA, "full keyboard use", "correct `lang`/`dir` on every mixed Hebrew-English element" and "no
time pressure except opt-in timed writing". I judged the app against those promises.

## What I did

Everything ran on a local copy (`http://127.0.0.1:8909/`) with Playwright (Chromium), `he-IL`, service workers blocked.
Scripts, logs and screenshots are in
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/ux-accessibility/`
(the file names below are in that folder).

1. **Onboarding, keyboard only, 390 px** (`#/start`). I tabbed every step and logged each Tab stop. I pressed Continue
   with no year and Finish without the terms box, typed the year into the select, toggled a goal with Space, and tried
   the arrow keys in the minutes and starting-point radio groups. I chose "אני לא יודע/ת אנגלית בכלל" and landed in
   `#/lesson/pa1-01` (`s02`–`s05`, `01-*.png` to `05-*.png`).
2. **A whole lesson, keyboard only, 1280 px** (`#/lesson/a1-01`, an A1 learner). I met all 12 exercise types: match,
   listen, categorize, mcq, gap with a word bank, gap with typing, order, transform, correct, read, dictation, speak and
   write. A driver script pressed only Tab, Shift+Tab, Enter, Space, number keys and typed text. It logged the focused
   element after every key and counted the Tab presses each action took (`s07-lesson-kbd.mjs`, `07-a1-01.log`,
   `07-a1-01-*.png`). I also tested the word bank and the matching feedback separately (`s08-match-gap.mjs`, `08-*.png`).
3. **Review, keyboard only, 390 px, touch** (`#/review`). I used Today's "להוסיף את המילים של A1", then did
   `#/review?mode=early` twice (16 cards) and logged the options on every card (`s10-review.mjs`, `s10b.mjs`, `10-*.png`).
4. **The three games, keyboard only.** In the word quiz (`#/games/A1/1`) I recorded the timing with a MutationObserver.
   I also played words and pictures (`#/games/pictures/1`) and memory (`#/games/memory/1`, including a mismatch with
   reduced motion) (`s11`, `s12`, `s12b`, `11-*.png`, `12-*.png`).
5. **Settings, keyboard only** (`#/settings`). I logged the whole Tab order, chose 150% and Dark with Enter, then opened
   and closed the delete dialog with Escape (`s13-settings.mjs`, `13-*.png`).
6. **The accessibility tree** (`locator.ariaSnapshot()`) of 22 routes, including all three games (`ax/*.txt`, `s09`).
7. **Text at 150% at 390 px** on 15 routes. I checked for horizontal scroll and clipping (`s14`, `s15`, `t150/*.png`,
   `15-*.png`).
8. **Reduced motion vs no preference.** I listed `document.getAnimations()` on Welcome, a game answer and a wrong match
   (`s19-motion.mjs`).
9. **Contrast in dark and light.** My own audit mixes each text colour onto its real background through a canvas, so
   `oklch()` colours are measured as rendered. I ran it on 15 routes, plus a lesson verdict and a game verdict
   (`contrast.js`, `s16-contrast.mjs`, `16-*.png`).
10. **`lang` and bidi.** I walked the text nodes on lessons at A1, B2 and C1 (every question and every verdict), on the
    games, scenarios, Progress and other screens. I measured where the characters land with `Range.getClientRects()`
    (`langaudit.js`, `s18-lang.mjs`, `s17*.mjs`, `17-*.png`, `18-*.png`, `20-*.png`).

## What worked for me (keep this in any redesign)

- **Contrast is clean in both themes.** I found no text below 4.5:1 (3:1 for large text) on 15 routes in dark or light,
  including the red and green verdict footers (`16-dark-verdict.png`, `16-dark-game.png`).
- **Reduced motion is honoured completely.** With `reduce` there were no running animations at all. Welcome's "typing"
  keyboard does not run (0 lit keys, against 1 key with a running `press` animation without the preference). The match
  shake and the game pop are off, and scrolling is never smooth.
- **Text at 150% reflows.** At 390 px no route scrolled sideways (`scrollWidth` 390 on all 15). Lessons, games, review
  and settings stay usable (`t150/today.png`, `t150/lesson_a2-01_stage_practice.png`).
- **The delete dialog is right.** "מחיקת כל המידע מהמכשיר" opens a named `dialog` with focus on "ביטול" (the safe
  choice). Escape closes it and returns focus to the button that opened it.
- **The games have the right ideas.** Each game screen has an sr-only `h1` ("משחק מילים, A1, שלב 1"). Keys 1–4 answer.
  Right and wrong are shown with an icon as well as colour (`11-wordgame-verdict.png`). Memory cards have names
  ("קלף 1, הפוך", "קלף 1: carrot"). The picture and memory games keep focus on the board when a matched card is
  disabled. The picture game waits for keyboard players instead of moving on by itself. Those patterns should spread to
  the lesson player (findings 1 and 4).
- **Speaking is accessible by design.** It is never graded by speech recognition. "לא יכול/ה לדבר כרגע" skips with no
  penalty, and self-rating ("אמרתי את זה בבירור" / "צריך עוד תרגול") is a named group.
- **Honest AI-off states.** `#/tutor` says "שירות ה-AI עוד לא זמין באתר הזה, ולכן המורה לא זמין: אנחנו לא מציגים שיחה
  מזויפת." and links to what works without AI.
- **Good structure in many places.** There is a skip link. The lesson intro and each stage focus their `h1`. The verdict
  is `role="status"`. Progress bars are labelled. Today's minutes group is named ("אורך האימון היום"). The nav's second
  language has its own `lang` (`<span class="l2" lang="en">`). The path rail is an `img` with a full text alternative.
  Typing exercises (transform, correct) focus their textarea and check with Enter.
- **Most bidi isolation is right now.** English inside Hebrew explanations is wrapped in `<bdi dir="ltr" lang="en">`. The
  Pre-A1 warm-up "OK, USB, PDF, DJ" reads in the right order across a line break (`06-bidi-callout.png`).

## What did not work

### 1. Focus falls to the page after almost every action in the lesson player and in Settings (major)

Route: `#/lesson/a1-01`, `#/settings`. WCAG 2.4.3 Focus Order, 2.1.1 Keyboard (in practice), 4.1.3 Status Messages.

When a new exercise opens, `document.activeElement` is `<body>` for match, categorize, mcq, gap with a word bank, order,
speak and write. Only typing exercises and the Play button get focus. Inside the exercises, every action redraws the
markup and drops focus to `<body>`:

- **Match:** after each completed pair (the focused tile becomes disabled).
- **Categorize:** after choosing an item, and again after placing it (`draw()` re-renders everything).
- **Order:** after every token.

From `<body>` the next Tab goes to "יציאה מהשיעור", then "עזרה", then the content. What it took me (`07-a1-01.log`):

- **Match:** 74 Tab presses for 6 pairs.
- **Categorize:** 81 Tab presses for 8 sentences.
- **Order:** 22 Tab presses for 5 words.

A screen reader user hears nothing when the next exercise appears.

Settings does the same. After pressing "150%" or "כהה" with Enter, focus went to `<body>`, and the next Tab landed on
the skip link. It takes 19 Tabs to get back to the text-size row.

**Suggestion:** on mount, focus the exercise prompt (`h2.ex-prompt` with `tabindex="-1"`), as stages already do with
their `h1`. After a re-render, restore focus to the same logical control:

- **Order:** the next unused token, or the answer line.
- **Categorize:** the bin's name button after choosing an item, then the next item after placing it.
- **Match:** the next enabled tile, as `picturegame.js` already does ("keep the keyboard on the board").
- **Settings:** the button that was just pressed.

### 2. The advertised Enter shortcut does nothing where the app itself put the focus (major)

Route: `#/lesson/a1-01`. WCAG 2.1.1, 3.2.2.

Check and Continue carry an "Enter" key badge, but Enter "does that control's own job" when focus is on another button.
The app itself moves focus onto such buttons:

- **Listen:** focus starts on "השמעה". I answered with the number key 2 (focus stays on Play) and pressed Enter. That
  replayed the audio instead of checking. I needed 6 Tabs to reach "בדיקה" (`07-a1-01.log`, step 1).
- **Speak:** pressing "אמרתי את זה בבירור" leaves focus on it. Enter presses it again, and Continue needed 3 Tabs.
- **Word bank:** after Enter on the last chip, a second Enter inserts that chip again and overwrites the last gap,
  instead of checking.

**Suggestion:** after a number-key choice, a self-rating or the last chip, move focus to Check or Continue. Or let Enter
check whenever the focused control is a Play button or a toggle the learner has already pressed. Add a single always-on
shortcut (for example Ctrl+Enter, shown in Help).

### 3. A word dropped into a gap cannot be taken back with the keyboard (major, a Level A failure)

Route: `#/lesson/a1-01`, "Complete Noa's message. Use each verb once." WCAG 2.1.1 Keyboard.

The gaps are `readonly` inputs that a mouse click clears. I placed "plays" in gap 1 with Enter, focused gap 1 and
pressed Backspace, Delete, Enter and Space. The value stayed `['plays','','']`. More chips only fill the next empty gap
and then overwrite the last one (`['plays','live','play']`). The used chips also stay active and unmarked
(`chip:false` for all four), unlike the order exercise, which hides used tokens. A keyboard-only learner can only submit
the wrong answer.

**Suggestion:** Backspace, Delete or Enter on a filled gap clears it and returns the chip. Mark used chips (`aria-disabled`
plus a visible "used" style). Give each gap the name "מילה חסרה 1: plays. Enter לניקוי".

### 4. Matching and memory give screen-reader users no result (major)

Routes: `#/lesson/a1-01` (match), `#/games/memory/1`. WCAG 4.1.3 Status Messages, 1.4.1 Use of Color.

**Match.** A wrong pair adds the class `shake` (0.3 s) and a red border, both removed after 320 ms. There is no text and
no live region: my only live region on the page was the empty `#toast-root` (`08-match-wrong.png`). With reduced motion
it is only a 320 ms border-colour flash. A right pair only disables the two buttons. The wrong tries still count in the
verdict ("ניסיון שגוי אחד"), so the learner is marked down for something they were never told. The two columns have no
labels either: the tree is 12 buttons in one flat list.

**Memory.** When the second card is a mismatch, the live region says only "לא זוג.". The focused button changes its
content to "קלף 2: תמונה, דלת" silently, which screen readers do not reliably announce. After 1.3 s it reads "קלף 2,
הפוך" again (`s12b.mjs`, `12-memory-mismatch-390.png`). A blind player never learns what the second card was.

**Suggestion:** add a polite live line under the board. For match: "work – לגור: לא מתאים" or "live = לגור: נמצא". For
memory: "קלף 2: תמונה, דלת. לא זוג.". Keep the wrong mark visible until the next choice. Label the match columns
("אנגלית" / "עברית") as groups.

### 5. Speed bonuses and auto-advance break the "no time pressure" promise and cannot be turned off (major)

Routes: `#/games`, `#/games/A1/1`, `#/games/pictures/1`, `#/games/memory/1`. WCAG 2.2.1 Timing Adjustable, 2.2.3 (AAA).
PRODUCT.md: "no time pressure except opt-in timed writing".

- **Word quiz.** Every right answer earns "בונוס מהירות" (the hub lists "3s +5, 6s +3, 10s +1; בהקלדה: 8s +5, 15s +3,
  25s +1"). After a right answer, the verdict panel shows the word pair, an example sentence and a "לשאלה הבאה" button.
  1.1 s later the next question replaces it: I logged the verdict at 1869 ms and the next question at 2970 ms
  (`s11-wordgame.mjs`). A slow reader, a dyslexic learner or a screen-reader user cannot read the example in that time.
  The button they are reaching for vanishes.
- **Words and pictures.** There is a bonus for a quick board, and with a pointer the next board starts by itself after
  2.5 s.
- **Memory.** A mismatched pair turns face down after 1.3 s.

There is no setting for any of this in `#/settings`. The bonus notation ("3s +5") is also hard to parse in a Hebrew
sentence (`20-speed-bonus-line.png`).

**Suggestion:** add a "קצב רגוע" setting (or make it the default): no speed bonus, no auto-advance, and cards stay up
until the next card is chosen (the memory code already turns them back on the next choice). If the speed bonus stays,
make it opt-in and write it in words ("תשובה תוך 3 שניות: 5 נקודות").

### 6. Groups of option buttons have no names, so a screen reader hears "כבוי" or "4" without knowing what they set (major)

Routes: `#/settings`, `#/start`. WCAG 1.3.1 Info and Relationships, 2.4.6 Headings and Labels, 4.1.2 Name, Role, Value.

In the accessibility tree of Settings, every segmented control is an unnamed `group`: interface language, theme, text
size, Hebrew support, accent, game sounds, speech speed, minutes, weekly days, new words a day, retention target,
correction amount and writing feedback. The visible label ("גודל טקסט", "מילים חדשות ביום") is a sibling `span` with no
link to the group. Tabbing reads "150%, לחצן מתג", "כבוי", "4", "8" (`ax/settings.txt`).

Onboarding has the same problem:

- Step 1's language group has no name.
- Step 2's minutes `radiogroup` and step 3's starting-point `radiogroup` have no names.
- Their `role="radio"` buttons do not answer to the arrow keys (ArrowDown and ArrowLeft left the selection and focus
  unchanged), and every option is a separate Tab stop. This is not the ARIA radio pattern that the role promises.

**Suggestion:** use `role="group" aria-labelledby` pointing at the visible label everywhere (Today's "אורך האימון היום"
already does this). For the radio groups, either add roving tabindex with the arrow keys or use `aria-pressed` buttons
instead of `role="radio"`.

### 7. Review options follow a fixed pattern, so they can be answered without knowing the word (major)

Route: `#/review?mode=early` after "להוסיף את המילים של A1". Cognitive accessibility and learning integrity.

Over two sessions (16 first-exposure cards) the right meaning was always option 1 on even cards and option 3 on odd
cards. The three distractors never changed: "לבשל | מהנדס/ת | אורז" on even cards and "בין | סניף דואר | צעיר/ה" on odd
cards. Even when the word was "cook", its answer "לבשל" sat among "בין, סניף דואר, צעיר/ה" (`s10b.mjs` output). A
learner can pick "the one that isn't the usual three". This undermines "demonstrated ability" and teaches guessing.

**Suggestion:** seed the shuffle per card (for example by card id plus the session) and draw distractors per card,
preferably the same part of speech and level.

### 8. Onboarding moves on and shows errors without moving focus (minor)

Route: `#/start`. WCAG 2.4.3, 3.3.1 Error Identification.

On "המשך" or "סיום והתחלה" focus goes to `<body>`. It does so both when the step changes (steps 2, 3 and 4 all opened
with focus on `<body>`) and when validation fails. The error is a good `role="alert"` ("בחרו שנת לידה.", "בחרו נקודת
פתיחה.", "כדי להמשיך צריך לאשר את התנאים."), but the select or checkbox gets no `aria-invalid` or
`aria-describedby`, and focus is not sent to it (`05-terms-error.png`).

**Suggestion:** on a new step, focus its `h1`, so the reader hears "2 מתוך 4, בשביל מה האנגלית?". On an error, focus the
first invalid field and tie the message to it.

### 9. Several `lang` and `dir` attributes are wrong on mixed content (minor)

Routes: `#/lesson/a1-01`, `#/scenario/*`, read exercises. WCAG 3.1.2 Language of Parts, 1.3.2 Meaningful Sequence.

- **Translate exercises.** "תרגמו לאנגלית" puts the Hebrew source in `<p class="ex-text" lang="en" dir="ltr">`. The
  Hebrew sentence is left-aligned and its final full stop lands on the right edge, which is the start of the sentence for
  a Hebrew reader. I measured the full stop at x=663 and the first letter at x=649 (`18-translate-he-source.png`,
  `s18b.mjs`). A screen reader also reads it with the English voice.
- **Match verdict after "לא יודע/ת".** "live = לגור · work = לעבוד …" is one `<span lang="en" dir="ltr">` that includes
  the Hebrew words.
- **Scenario phrase notes.** The `.note` lines are English ("'Excess baggage' is the term airlines use…", "'Catch' = hear
  or understand.") but have `dir="auto"` and no `lang`, so they inherit `he`. There are 8 on
  `rl-social-party-small-talk` and 7 on `rl-airport-checkin-overweight`. The US/UK table headers are the same.
- **Learn-stage grammar table.** Headers and cells ("Who?", "Verb", "The rest", "work", "in a bank.") inherit `he`.
- **Read exercises.** The "True" and "False" buttons inherit `he` (seen at C1).
- **English UI.** The static skip link "דילוג לתוכן · Skip to content" has no `lang` on its Hebrew half, so it reads as
  `en`.

**Suggestion:** set `lang` and `dir` from the actual script of the string in the renderers (`ex.source`, `.note`, table
cells, the True and False buttons). For the match answer, mark each English and Hebrew side separately. Add a validator
rule that flags Hebrew inside `lang="en"` and Latin text inside `lang="he"`. My `langaudit.js` is a 20-line starting
point.

### 10. At 150% text a scenario section disappears off screen (minor)

Route: `#/scenario/rl-airport-checkin-overweight`, 390 px, text 150%. WCAG 1.4.4 Resize Text, 1.4.10 Reflow.

The switcher "הכנה | שיחה לדוגמה | תרגול | שיחה עם AI" (`group "חלקי התרחיש"`) scrolls sideways: `scrollWidth` 513 vs
`clientWidth` 340. "תרגול" is cut and "שיחה עם AI" sits entirely off screen (x −145..4). Nothing shows that the strip
scrolls (`15-scen150-top.png`). The US/UK table below squeezes its explanation column to one or two words a line, and
that column has an empty header (`15-scen150-ukus.png`).

**Suggestion:** let the switcher wrap to two rows (or become a select) at large text sizes. Turn the US/UK table into
stacked rows at narrow widths, and name its third column ("הסבר").

### 11. A focused gap looks almost the same as an unfocused gap (minor)

Route: `#/lesson/a1-01`, "Complete the time expressions." WCAG 2.4.7 Focus Visible, 2.4.13 Focus Appearance (AAA).

Every other control gets a 2px focus outline. A focused `.gap-input` only changes its background from
`oklch(0.94 0.035 263)` to `oklch(0.893 0.048 263)`. The outline is `none`, there is no shadow, and the underline is the
same (`21-gap-focus.png`). Only the blinking caret tells which gap is active.

**Suggestion:** give gaps the same 2px focus ring as every other control.

### 12. A wrong answer shows the same explanation two or three times (minor)

Route: `#/lesson/a1-01`, "מצאו ותקנו את הטעות". Cognitive load.

After a wrong answer at A1, the footer shows:

1. The right answer.
2. The specific feedback in Hebrew.
3. The same feedback in English.
4. A "למה?" disclosure that explains the same point again.

The English sentence inside the Hebrew line also breaks across lines ("We eat lunch at" / ".one every day")
(`17-verdict-correct-wrong.png`). For a learner with attention or reading difficulties this is a wall in a small footer.

**Suggestion:** show one explanation in the learner's support language, and keep the other language behind "עב" / "EN"
as elsewhere. Put example sentences on their own left-to-right line (the transcript already does this, `en-block`), and
show "למה?" only when it adds something new.

### 13. Smaller items (polish)

- **Review empty state.** `#/review` with no cards has only an `h3` ("עוד אין מילים בחזרה") and no `h1` (`ax/review.txt`).
- **Word-bank chips run the wrong way.** In the gap word bank the chip row is not `dir="ltr"`, so it is right-aligned and
  tabs "plays, live, play, study" from right to left. The order exercise's tokens are left-to-right (`07-a1-01-gap.png`).
- **The AI consent label is very long.** In onboarding step 4 the AI consent checkbox's accessible name is the whole
  paragraph of more than 60 words, read on every focus. It also appears although AI is off on this site. Shorten the
  label and move the details to `aria-describedby`, or hide it in device-only mode.
- **The add-words button hides itself and drops focus.** "להוסיף את המילים של A1" on Today removes itself, and focus
  falls to `<body>`. The only confirmation is a toast that lasts 3.2 s ("172 מילים נוספו לחזרה. הן ייכנסו בהדרגה.").
  Leave a short inline confirmation in its place.

## Top 3 wishes

1. **One focus contract for the lesson player and the settings controls.** Focus the prompt on mount, restore focus after
   every re-render, and make Enter always check or continue. Guard it with an automated keyboard-only run of one
   exercise of each type: the e2e suite already has Playwright, and my `s07-lesson-kbd.mjs` shows how to count Tab
   presses.
2. **A "relaxed pace" option that keeps PRODUCT.md's promise.** No speed bonus, no auto-advance and no timed card
   flip-back. It should be the default, or at least easy to find in Settings.
3. **Make the result of every action available to screen readers.** Name every option group. Announce match, categorize
   and memory results in a live line. Fix `lang` and `dir` on mixed content, and add a validator rule so they stay fixed.
