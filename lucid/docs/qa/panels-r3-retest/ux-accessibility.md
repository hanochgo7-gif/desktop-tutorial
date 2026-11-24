Simulated review (AI persona), not real user research.

# UX panel, round 3 re-test: accessibility

## Who I am

I am the accessibility specialist on the UX team, played by an AI. I test with keyboard only, the accessibility tree,
text at 150% on a 390 px phone, reduced motion, dark mode, and mixed Hebrew and English (`lang`, bidi). I cite WCAG 2.2.
A few hours ago I reviewed this app (`docs/qa/panels-r3/ux-accessibility.md`). This is the re-test of that review on the
new build.

## What I did

Local copy at `http://127.0.0.1:9609/`, Playwright Chromium, `he-IL`, service workers blocked. I re-ran my earlier
scripts on the new build and changed only what the new flows needed. All scripts, logs and screenshots are in
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/ux-accessibility/`.
The file names below are in that folder.

1. **Onboarding by keyboard only, 390 px** (`#/start`): the new text-size row (I chose 150% with Enter), Continue with no
   year, arrow keys in both radio groups, Continue with no starting point, Finish without terms. I chose "אני לא יודע/ת
   אנגלית בכלל" and landed in `#/lesson/pa1-01` (`r02-onb.mjs`, `r02b.mjs`, `r02-*.png`).
2. **The whole of `#/lesson/a1-01` by keyboard only, 1280 px, A1 learner.** I met 13 exercise types: match, listen,
   categorize, mcq, gap with a word bank, typed gap, order, transform, correct, read, dictation, speak and write. I counted
   Tab presses and logged focus after every key (`s07-lesson-kbd.mjs`, `07-a1-01.log`). I tested the match feedback and
   the word bank separately (`r08.mjs`, `r08b.mjs`, `r08*.png`), and the second try on a typed answer (`r17.mjs`,
   `r17b.mjs`).
3. **Review, 390 px, touch** (`#/review`): the empty state, "להוסיף את המילים של A1" on Today, then two early sessions of
   8 cards, answered with number keys and Enter (`r10.mjs`, `r10-*.png`).
4. **The three games**: word quiz timing (I waited 6 s after each answer), memory mismatch with reduced motion, picture
   game by touch and by keyboard (`r11.mjs`, `r12.mjs`, `r12p.mjs`, `r21.mjs`).
5. **Settings by keyboard** (`r13.mjs`, `r13b.mjs`), plus the accessibility tree of 22 routes (`s09-ax-lang.mjs`, `ax/`).
6. **Text at 150% at 390 px** on 20 routes, now also flagging buttons whose text overflows (`r14-text150.mjs`, `t150/`).
7. **Reduced motion** (`s19-motion.mjs`, `r19m.mjs`), **contrast** in dark and light (`s16-contrast.mjs`, `r16b.mjs`),
   **`lang` and bidi** (`s18-lang.mjs`, `r18b.mjs`, `r19.mjs`, `r24.mjs`), and the writing checks (`r23.mjs`).

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| 1 | Focus falls to the page in the lesson player and in Settings | **fixed** | Every exercise now opens with focus on its `h2.ex-prompt` (`07-a1-01.log`, all 15 steps). After a match pair, focus moves to the next tile; after choosing a categorize item, to the first bin; after placing it, to the next item; after an order token, to the next token. Match took 30 Tab presses for 6 pairs (was 74), categorize needs 0–4 Tabs per item, and the last token or pair lands on "בדיקה". In Settings, Enter on "150%" keeps focus on "150%" and the next Tab goes to "לפי הרמה" (`r13.mjs`). |
| 2 | The Enter shortcut does nothing where the app put the focus | **fixed** | Listen: key 2 moves focus to "בדיקה", and Enter checks without a replay. Speak: Enter after "אמרתי את זה בבירור" opens the next exercise. Last word-bank chip: focus goes to "בדיקה". Typed exercises now show a "Ctrl+Enter" hint (`07-a1-01.log`, steps 1, 5, 13). |
| 3 | A word in a gap cannot be taken back with the keyboard | **partly** | Backspace on a filled gap now clears it and re-enables its chip. Used chips are `aria-disabled` with a struck-through style. Gaps are named "מילה חסרה 3: live. Backspace לניקוי", and the chip row is `dir="ltr" lang="en"` (`r08b.mjs`, `r08b-after-live.png`). But the new "target gap" puts the first chip in the wrong gap for keyboard users. See new finding N1. |
| 4 | Match and memory give screen-reader users no result | **fixed** | Match: the columns are groups "אנגלית" and "עברית". A polite line says "work – ללכת / לנסוע: לא מתאים", and it is still there 1.5 s later. A right pair gives "work – לעבוד: נמצא". The board finishes itself ("כל הזוגות נכונים · ניסיון נוסף אחד") and becomes a list of pairs, each with "השמעה: live". Memory: "קלף 1: תמונה, תיק. קלף 2: מילה, hand. לא זוג." Both cards stay face up after 5 s, until the next tap (`r08.mjs`, `r12.mjs`, `r12-memory-mismatch-5s.png`). |
| 5 | Speed bonuses and auto-advance break "no time pressure" | **fixed** | `relaxed_pace` is on by default. The word quiz verdict stayed up for 6 s on 3 questions until I pressed Enter, and the score is "+10" with no bonus. The picture board waited more than 5 s after "לוח 1 הושלם" with touch. Memory cards stay up. Settings has "קצב רגוע" (checked), and the games hub has an opt-in "אתגר מהירות" (`r11.mjs`, `r12p.mjs`, `r13.mjs`). |
| 6 | Option groups have no names; onboarding radios ignore the arrow keys | **fixed** | Settings: 13 named groups and 0 unnamed ones ("גודל טקסט", "הסברים בעברית" …). Onboarding: "שפת הממשק", "גודל טקסט", group "בשביל מה האנגלית?", and radiogroups "כמה זמן ביום?" and "מאיפה מתחילים?". ArrowDown, ArrowLeft, ArrowRight and ArrowUp move both the selection and focus, with roving tabindex, so each group is one Tab stop (`r02-onb.mjs` log). |
| 7 | Review options follow a fixed pattern | **fixed** | The right answer moved between positions (1 cook→2, language→2, …), and distractor sets differ from card to card in both sessions. Review now selects, then checks: key 2 sets `aria-pressed` and focus goes to "בדיקה" with no verdict yet (`r10.mjs`, `r10-review-fb0.png`). One card still mixed parts of speech ("כל כמה זמן / כמה / לצחצח שיניים / כל יום"). |
| 8 | Onboarding moves on and shows errors without moving focus | **fixed** | Steps 2, 3 and 4 open with focus on their `h1` ("בשביל מה האנגלית?"). With no year, focus goes to the select, which has `aria-invalid="true"` and `aria-describedby="ob-year-help ob-err"`, and the message sits right under the field (`r02-year-error.png`). The terms checkbox gets the same treatment. A note: on step 3, `aria-invalid` and the description sit on the radiogroup while focus lands on the first radio, so some screen readers may not read the message. Putting `aria-describedby` on the focused radio too would close that gap. |
| 9 | Wrong `lang`/`dir` on mixed content | **partly** | Fixed: the Hebrew translate source is now `lang="he" dir="rtl"`. True and False are `lang="en"` and run left to right (True x=41, False x=113). The learn-stage grammar table cells are `en`. The US/UK table is `lang="en"` with a named "הסבר" column. Not fixed: scenario `.note` lines still inherit `he` (8 on `rl-social-party-small-talk`, 3 on `rl-airport-checkin-overweight`). The match answer after "לא יודע/ת" is still one `<span lang="en">` holding "live = לגור · work = לעבוד …". In English UI the skip link's Hebrew half "דילוג לתוכן" still has no `lang` while `<html lang="en">` (`r18.log`, `r09.log`, `r19.mjs`). |
| 10 | At 150% a scenario section disappears off screen | **fixed** | The switcher wraps to two rows (`scrollWidth` 340 = `clientWidth` 340). All four tabs are visible, and the US/UK table stacks into cards at 390 (`r15-scen150-top.png`, `r15-scen150-ukus.png`). |
| 11 | A focused gap looks almost like an unfocused one | **fixed** | A typed gap now gets a 2px `oklch(0.55 0.2 263)` outline (`r22-gap-focus.png`). |
| 12 | A wrong answer shows the same explanation two or three times | **partly** | After the second wrong try, the footer shows the answer and a word diff, with the explanation behind "למה?". That is better. But the first try ("עוד לא. אפשר לתקן בעצמכם") still shows the explanation in Hebrew and again in English, and the English line contains the full answer (`r17-try1.png`). See new finding N2. |
| 13 | Smaller items | **fixed** | Review empty state: `h1` "עוד אין מילים בחזרה", an add button and "להיום". Chip row: left to right. Onboarding step 4: no AI checkbox, just "AI לא פעיל באתר הזה. כל השאר עובד. אם יתווסף, נשאל קודם.", and the terms checkbox name is 7 words. Add words: focus goes to an inline status, "נוספו 172 מילים לחזרה. עד 8 חדשות ביום." (`r10.mjs`). |

Summary: 10 fixed, 3 partly, none regressed. The contrast and reduced-motion strengths I praised last time still hold.
The only exceptions are the new items below.

## New findings

### N1. Tabbing to the word bank moves the target to the last gap, so the first word lands in the wrong place (major)

Route: `#/lesson/a1-01`, "השלימו את ההודעה של נועה". WCAG 3.2.1 On Focus, 2.4.3 Focus Order, 4.1.2 Name, Role, Value.

The new target gap follows focus. A keyboard user has to Tab from the prompt through gap 1, gap 2 and gap 3 to reach the
chips, so by then the target is gap 3. I pressed Enter on "live", the right word for gap 1, and it went into gap 3
(`['', '', 'live']`). The `aria-current`/`is-target` mark moved silently to gap 3 while I tabbed past
(`r08b.mjs` log, `r08b-before-live.png`, `r08b-after-live.png`). In my full keyboard run I chose live, study and play,
all correct words in the right order. The verdict was "לא בדיוק", and because a word-bank gap counts as a choice there is
no second try (`07-a1-01.log`, step 5). Nothing on the chip tells a screen-reader user which gap it will fill.

**Suggestion:** keep the target on the first empty gap when focus only passes through a gap. Move it only when the
learner activates a gap (Enter, Space or a click), or when they type into it. Give each chip an `aria-describedby` such as
"ייכנס למילה חסרה 1". Add this path to the keyboard e2e: Tab from the prompt to the first chip, press Enter, and gap 1 is
filled.

### N2. The "fix it yourself" hint gives away the full answer in its English line (major)

Route: `#/lesson/a1-01`, "מצאו ותקנו את הטעות" ("We are eat lunch at one every day."). Cognitive load, learning integrity.

I answered "We are eating lunch at one every day." The first-try footer said "עוד לא. אפשר לתקן בעצמכם". It then gave
the Hebrew hint "every day מתאר הרגל, ולכן משתמשים בהווה פשוט: we eat, בלי are ובלי ing." and the English line "every
day = a habit, so use the present simple: We eat lunch at one every day.", which is the exact answer (`r17-try1.png`).
The second try then only means copying it. The two languages also repeat each other, which was my earlier finding 12.

**Suggestion:** on a first try, show only the Hebrew rule in the learner's support language ("we eat, בלי are"). Add a
validator rule: the `wrong_feedback` shown before the second try must not contain any accepted answer as a substring.

### N3. At 150% text, the labels in Settings' segmented controls overflow and overlap (major)

Route: `#/settings`, 390 px, text 150%, in the new "תמיכה בלמידה" section and in "ממשק". WCAG 1.4.4 Resize Text, 1.4.10
Reflow, 1.4.12 Text Spacing.

The five "הסברים בעברית" buttons get 50 px each, but their text needs 58–82 px. "בלחיצה" and "כבוי" run into each other
("בלחיצכבוי") and "לפי הרמה" breaks over two lines (`r13b-settings-150-hebsupport.png`). The automatic check also
flagged "לפי המכשיר" (89>85), "בינלאומית" (109>85) and "אמריקאית" (105>85) (`r14-text150.mjs` log). This is the
section built for learners who need support, at the text size they chose.

**Suggestion:** at 130% and above, or whenever the controls do not fit, let `.seg` wrap into a 2-column grid, as "גודל
טקסט" already does (2×2), or stack the options vertically. Add the "overflowing button" check from `r14-text150.mjs` to
the 150% e2e.

### N4. Today's "done" lesson card fades its text below AA contrast (minor)

Route: `#/today` after finishing today's part of a lesson (A1, 20 min). WCAG 1.4.3 Contrast (Minimum).

The finished card is a live link with `opacity: 0.6`. Its text, including the status "החלק של היום הושלם. מחר ממשיכים
מתרגיל 10 מתוך 15.", measures 2.53:1 in light and 3.12–4.08:1 in dark (`r16b.mjs`, `r20-today-partdone.png`). The card
is also still labelled "המשך:" while it says it is done, and a separate "להמשיך את השיעור" card follows it. That is two
"continue" cards for one lesson.

**Suggestion:** show "done" with the check icon and a quieter background, not with opacity on the text. Change the label
to "הושלם היום:".

### N5. Categorize tells a screen-reader user neither what they picked nor where it went (minor)

Route: `#/lesson/a1-01`, "נכון או שגוי? מיינו את המשפטים". WCAG 1.3.1, 4.1.3.

After an item is placed, the tree is flat: `button "Correct"`, `button "I work in a shop."`, `button "Wrong"`. The bins
are not groups, and the placed item's name does not say that it is in "Correct" or that pressing it takes it back. The
live line says "עכשיו בחרו את הקבוצה שלו." after a choice, and after placing it just repeats the instructions ("בחרו פריט
ואז את הקבוצה שלו…") (`r21.mjs`). The match exercise now gets this right, so the pattern exists.

**Suggestion:** make each bin a `group` named by its label. Name placed items "I work in a shop. – ב-Correct. לחיצה
מחזירה". Make the live line "I work in a shop. → Correct".

### N6. Rows of identical "השמעה" buttons (polish)

Routes: `#/scenario/rl-airport-checkin-overweight` (11 buttons named "השמעה" in "משפטים שימושיים"), `#/lesson/a1-01`
learn stage at 1280 (5 example buttons named "השמעה"). WCAG 2.4.6 Headings and Labels.

A screen reader's button list gives 11 identical names (`ax/scenario_rl-airport-checkin-overweight.txt`). The finished
match board and the learn chips already say "השמעה: live". The same goes for the two buttons named "EN – להצגת הפסקה
באנגלית" in the first learn step.

**Suggestion:** use "השמעה: <the phrase>", shortened if long, everywhere.

### N7. Long accessible name on the new "אתגר מהירות" switch (polish)

Route: `#/games`. The checkbox name is the whole explanation: "אתגר מהירות כבוי: אין שעון, והמשחק מחכה לכם. פועל:
תשובה מהירה מוסיפה נקודות, עם שיאים נפרדים." It is read on every focus (`r11.mjs`). The same pattern was fixed for the
terms checkbox. **Suggestion:** name it "אתגר מהירות" and put the rest in `aria-describedby`.

### N8. Writing checks: an English isolate swallows a Hebrew list comma; some tags have the wrong `lang` (polish)

Route: `#/writing/free`, B1, 130%. The status line puts "s, I" in one `<bdi lang="en">`, so the comma between two Hebrew
list items becomes English text and the line breaks as "בלי s, I" / "גדולה" (`r23-status-line.png`). The connector tags
"addition", "contrast" and "cause" inherit `he`, and an sr-only "אפשר לכתוב:" sits inside `lang="en"` (`r23.mjs`).
**Suggestion:** build the list from separate items so each English token is isolated on its own. Give the tags
`lang="en"`. Move the sr-only Hebrew out of the English block.

### N9. The picture game's wrong-pair message doesn't name the pair (polish)

Route: `#/games/pictures/1`, keyboard. After picture "אוזן" and word "lamp", the live line says only "לא מתאים. נסו שוב.
(פחות 3 נקודות)" (`r21.mjs`). Match and memory now name both sides. **Suggestion:** "lamp – אוזן: לא מתאים". Also
consider dropping the 3-point penalty in relaxed mode, as memory did.

## What I liked (keep this)

- **One focus contract now runs through the lesson player.** The prompt `h2` gets focus on mount. Focus moves to the
  next useful control after every pick and lands on "בדיקה" or "המשך" when the exercise is complete. Enter always
  checks or continues. This is the biggest improvement for keyboard and screen-reader learners.
- **Calm pace by default, with an honest opt-in.** Nothing in the three games moved on by itself in 6 s. Memory cards
  stay up, and speed is an explicit "אתגר מהירות" choice. This now matches PRODUCT.md.
- **Text size is chosen in step 1 of onboarding** and applies at once (the root went to 24 px). The onboarding radio
  groups are textbook ARIA radios with roving tabindex.
- **Match and memory speak.** The live lines, the "אנגלית"/"עברית" groups and the completed board as a list of pairs with
  named play buttons are a model for the rest of the app.
- **Settings is fully named.** It has 13 labelled groups, focus stays where you pressed, and the new "תמיכה בלמידה"
  section gathers text size, Hebrew support, speech speed, sounds and calm pace in one place.
- **Review selects, then checks**, with varied positions and distractors. Its empty state is a real page with an `h1`
  and an action.
- **What I praised last time still holds:** reduced motion leaves zero running animations on Welcome, games, match,
  lesson intro, learn, part end, Today and Progress. Contrast passes in both themes on every route and new state except N4
  (the disabled AI-feedback controls in Settings measure lower, but disabled controls are exempt from 1.4.3). The delete
  dialog still focuses "ביטול" and returns focus on Escape.

## Top 3 wishes

1. **Fix the word-bank target (N1)** so focus passing through a gap never moves the target, and add the "Tab to the first
   chip, Enter" path to the e2e suite.
2. **Make first-try hints rule-only, in one language (N2)**, with a validator rule that blocks hints containing the
   accepted answer.
3. **Finish the 150% and `lang` work:** wrapping segmented controls in Settings (N3), `lang="en"` on scenario notes and on
   the English halves of the match answer, and a `lang="he"` on the skip link in English UI. A validator or e2e rule for
   Hebrew inside `lang="en"` would keep these fixed.
