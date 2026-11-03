Simulated review (AI persona), not real user research.

# UX research panel, round 3 re-test: first run, information architecture, navigation

## Who I am

I am an AI playing a UX researcher on the UX team, re-testing the build a few hours after my first review
(`docs/qa/panels-r3/ux-research.md`). My brief is the same: first run, navigation, findability, the Today plan,
coming back after a lesson, and dead ends. I worked mostly at 390x844 (touch, he-IL, light theme, 100% text),
once at 1440x900 (and 1366x768), and once at 150% text.

Screenshots are in
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/ux-research/shots/`.
Below, only the file name is given.

**A note on method.** Playwright's `fullPage` screenshot drops touch emulation while it captures, so the
"Enter" keycaps showed up again in my first full-page shot (r1-10). In a normal viewport shot they are hidden
(kb-a-viewport), and `getComputedStyle(.kbd).display` is `none` until a fullPage capture runs. After that I took
long shots by resizing the viewport instead, which keeps the touch media queries in force.

## What I did

1. **Run 1, "start from zero"** (`#/` then `#/start`): name נועה, born 1998, travel goal, 10 minutes, start "אני
   לא יודע/ת אנגלית בכלל". I sent step 1 without a year and step 4 without terms. I landed in `#/lesson/pa1-01`,
   went through all 5 learn steps, did the exercises (one wrong on purpose) to the part end, chose "לעצור כאן",
   and looked at Today. Shots r1-*.
2. **Run 2, "I know some"**: Daniel, born 2009, goals studies and everyday, start "אני מכיר/ה קצת". I looked at
   the placement intro, answered 5 questions (one "לא יודע/ת"), left with ✕ ("שמירה ויציאה"), and looked at Today
   and Path. Shots r2-*.
3. **Run 3, placement to the end**: Maya, born 1990, work and conversation goals, 20 minutes, start "אני די
   בנוח/ה". I played a solid-A2, shaky-B1 learner for 20 questions to the result, then Today. After that I did the
   first lesson `a2-01` with all 5 learn steps and every answer right, through the part end, "להמשיך ולסיים" and the
   lesson end. I followed its primary button and looked at Today. Shots r3-*, r5-*.
4. **Weak lesson**: a fresh A2 learner (profile snippet) failed `a2-01` at 9% and finished it. I looked at the end
   screen, Today and the lesson intro on return. Shots r9-*.
5. **Navigation and findability** for the just-placed Maya (a copy of her profile from before the lesson): Practice,
   Real-Life, Games, Review (empty), Settings, Progress, Help, and the Today minutes control. Shots r4-*, r8-04.
6. **Coming back**: Maya did the review with mostly wrong answers. Then I looked at Today, opened a lesson from
   `#/path/A2` and left it with ✕. Shots r6-*.
7. **Desktop**: 1440x900 Today, Practice, a lesson and Real-Life, then 1366x768 Today. Shots r7-*.
8. **Extra checks**: 10-minute travel learners at Pre-A1 and A1 (r10-*). Real-Life → "ביטויים וסלנג", a scenario's
   top bar, a word game, and Today at 150% (r11-*).

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Fresh evidence |
|---|---|---|---|
| F1 | After a whole lesson, Today never says "done" | **fixed** | r5-06: after finishing a2-01, Today heads with "התוכנית להיום הושלמה (כ-24 דק׳)". There is no orange key, and the review, scenario, next lesson and word game sit under "רוצים עוד? · לא חובה". The 10-minute learner who stopped at the part got the same state (r1-15b). |
| F2 | The lesson-complete main button skips the daily plan | **partly** | r5-04b: the primary is now "להמשיך בתוכנית: חזרה על מילים · 2 דק׳" and "לשיעור הבא" is secondary. But the button only opens `#/today`, and Today then says the plan is done and lists that same review as optional (r5-06). The two screens still disagree (see N1). |
| F3 | "כמעט שם" after 16% | **partly** | r9-03: at 9% the title is "השיעור עוד פתוח" and the primary is "לקרוא שוב את ההסבר ואז לתרגל". Today no longer says "כמעט סיימת" (r9-01). The minutes now match ("כ-17 דק׳" on Today and on the intro). On return, though, the intro's orange key is again "לתרגל את 13 הטעויות · כ-17 דק׳", and re-reading is a grey button inside the banner (r9-02); see N2. |
| F4 | Desktop: Settings and Help below the fold of the rail | **fixed** | r7-01: at 1440x900, Help is at y=716-764 and Settings at 772-820, pinned under the scrolling lab list. At 1366x768 they are at 584-688 (r7-05). |
| F5 | Pre-A1 lesson 1 laid out for someone who reads English | **fixed** | r1-10/kb-a: the Hebrew can-do lines lead in black bold, with English as the smaller grey line. Learn is 5 steps ("1 מתוך 5 · כ-5 דק׳ קריאה"), each 910-1,829 px tall (r1-11-learn-1..5). The English paragraphs sit behind an "EN" chip, the "מלכודת לדוברי עברית" box has play buttons, and the plan note is one line, "היום: עד תרגיל 7 · כ-10 דק׳". |
| F6 | First lesson for a 10-minute learner ends mid-lesson, "stop" is primary | **partly** | r1-14b: the secondary is now "להמשיך ולסיים · כ-6 דק׳", there is a per-part score ("היום: 6 מתוך 7 נכונות"), today's words are shown, and "3 לחזרה" is gone. The top counter still says "8 מתוך 13" while the text says the part ended at exercise 7. |
| F7 | AI consent asked on a site without AI | **fixed** | r1-08: step 4 has one line, "AI לא פעיל באתר הזה. כל השאר עובד. אם יתווסף, נשאל קודם.", and the terms checkbox label is short. |
| F8 | Onboarding step 2 overloaded; CEFR copy | **partly** | r1-04/05: goals now have square checks and the time choices have radio dots. The CEFR wording is gone, and there is a plain line, "ב-10 דקות: שיעור וחזרה. המטרות מופיעות כהצעה, ומ-20 דקות בתוך התוכנית." It is still one step of 1,444 px. The goal promise is not kept at Pre-A1 (N3). |
| F9 | The "start from basics" escape differs between screens | **fixed** | r2-05 and r2-08: the placement intro, Today and Path all offer "להתחיל מהאותיות (Pre-A1)" and "להתחיל ב-A1". |
| F10 | Placement result row seems to contradict itself | **fixed** | r3-20: "A2 · נראה טוב גם ב-B1 (2 מתוך 2), יאושר בבדיקת רמה", and a new line, "ב-B1, הרמה שמעל: 5 מתוך 8 נכונות". |
| F11 | Placement progress has no end in sight | **fixed** | r2-06 and run 3: "שאלה 4 מתוך כ-20" and "שאלה 19 מתוך כ-20". The bar was at 18/20 at question 19. |
| F12 | Today minutes control: no label, changes the setting | **fixed** | r8-04: "כמה זמן יש לכם היום?" is visible, tapping 35 shows "התוכנית עודכנה ל-35 דקות", the top-bar title "היום" stays, and Settings still shows 20 דק׳. |
| F13 | "מעבדות" named on Today but not in the navigation | **fixed** | r1-15b: "אפשר לעצור כאן, או להמשיך בחופשיות בלשונית תרגול", and "בלשונית תרגול" is a link. A concrete next item (a Pre-A1 word game) is offered. |
| F14 | Leaving a lesson opened from the Path returns to Today | **fixed** | run 6: `#/path/A2` → a2-05 → ✕ landed on `#/path/A2` (r6-07). |
| F15 | Mixed Hebrew/English key points break apart | **partly** | r5-04-crop-bidi: the Hebrew lines now explain instead of repeating whole sentences, and the example sentences no longer scramble. But "איות: make → making, run → running, lie" wraps, and the next line starts ". → lying". "עכשיו / כרגע: am/is/are + פועל עם" also breaks before "ing → She's studying." |
| F16 | Practice hub repeats the rail on desktop; empty for new learners | **fixed** | r4-practice: a just-placed learner sees "משחק מילים · A2" and a scenario under "מומלץ עכשיו". At 1440 the recommendations come first and the labs are a compact 2-column grid (r7-02). |
| F17 | Onboarding errors not attached to fields | **fixed** | r1-03: the year select gets a red border, `aria-invalid="true"`, focus, and "בחרו שנת לידה." directly under it. The terms checkbox gets focus and `aria-invalid` too. |
| F18 | "Enter" key hints on touch phones | **fixed** | kb-a-viewport and r1-12-selected: no keycaps on touch, and the option numbers are quiet labels. At 1440 with a mouse, `.kbd` is visible (`display: block`). See the method note about fullPage shots. |

Summary: 12 fixed, 6 partly, none not fixed, none regressed.

## New findings

### N1. "Continue the plan" on the lesson end leads to a Today that says the plan is done (major)
- **Route:** the end of `#/lesson/a2-01` (r5-04b), its primary, then `#/today` (r5-06).
- **Evidence:**
  - The lesson-end primary reads "להמשיך בתוכנית: חזרה על מילים · 2 דק׳".
  - Tapping it goes to `#/today`, not to the review.
  - Today's headline then reads "התוכנית להיום הושלמה (כ-24 דק׳)", and the same review appears under "רוצים עוד? לא חובה" as "8 מילים חדשות: סבב ראשון".
- **Why it matters:** the learner is told twice, one second apart, opposite things about whether today is finished.
  The button also promises an action (a review) and then delivers a list.
- **Suggestion:** use the same done rule in both places.
  - If the minutes are met, the lesson-end primary is "סיימתם להיום · לתוכנית", and the review becomes a
    secondary, "רוצים עוד? חזרה · 2 דק׳", that opens `#/review` directly.
  - If the plan really continues, the button opens the next item itself.

### N2. After a weak lesson, the return path drops the "re-learn first" advice (minor)
- **Route:** the lesson end at 9% (r9-03), then `#/lesson/a2-01` again (r9-02).
- **Evidence:**
  - The end screen recommends "לקרוא שוב את ההסבר ואז לתרגל" as the orange key.
  - On return, the orange key is "לתרגל את 13 הטעויות · כ-17 דק׳". "לקרוא שוב את ההסבר קודם" is a grey button inside the
    blue banner.
  - Today lists the lesson as "השיעור עוד פתוח" with "תיקון הטעויות יכול להשלים את השיעור" (r9-01).
- **Suggestion:** below 50%, keep the intro primary consistent with the end screen ("לקרוא שוב את ההסבר ואז
  לתרגל"), and make the drill secondary. Today's line can say "כדאי לקרוא שוב את ההסבר".

### N3. At Pre-A1 the chosen goal never appears, although onboarding promises it as a suggestion (minor, trust)
- **Routes:** `#/start` step 2 (r1-04), then `#/today` for a Pre-A1 travel learner at 10 minutes (r10-today-10min-travel-PreA1,
  r1-15b). Compare A1 (r10-today-10min-travel-A1).
- **Evidence:**
  - Onboarding says "ב-10 דקות: שיעור וחזרה. המטרות מופיעות כהצעה".
  - At A1, Today shows "יש עוד 4 דקות? Finding your gate for a connecting flight".
  - At Pre-A1, nothing travel-related appears, before or after the lesson. "רוצים עוד?" offers only the rest of the lesson
    and a word game.
  - `content/real-life/scenarios.json` has no Pre-A1 scenario, while the Real-Life hub says "פתוח בכל רמה, גם אם רק
    התחלתם".
- **Suggestion:** for Pre-A1, offer a goal-matched expressions set or one A1 travel scenario labelled "אתגר קטן". Or
  say it honestly in onboarding when "zero" is chosen: "המטרות ייכנסו לתוכנית מרמה A1".

### N4. The minutes for the same finished lesson change between visits (minor, trust)
- **Route:** `#/today` after finishing a2-01 (r5-06), then again after the review (r6-05). Also r1-15b.
- **Evidence:**
  - The finished-lesson row showed "14 דק׳" and later "10 דק׳" for the same lesson.
  - The headline went from "כ-24 דק׳" to "כ-25 דק׳" after a 2-minute review.
  - Run 1's part was announced as "כ-10 דקות" (part end and plan), but the done headline said "(כ-6 דק׳)".
- **Suggestion:** freeze a finished item's minutes when it is done, and compute the headline as their sum. If the
  headline counts estimated time per exercise, say "כ-" and use the same estimate everywhere.

### N5. The review end tells missed words "תחזור בעוד דקה", but Today says the review is done (polish)
- **Route:** `#/review` with 1 of 8 right (r6-04), then `#/today` (r6-05).
- **Evidence:**
  - Seven rows read "תחזור בעוד דקה".
  - Today then shows "חזרה מרווחת · 8 מילים · עברתם היום על 8 מילים" with a tick, and offers no "come back in a minute" item.
  - The "לשחק במילים האלה" key is below the fold on the review end.
- **Suggestion:** say when they come back in Today's terms ("יחזרו בחזרה של מחר" or "עוד סבב קצר עכשיו?"), and put
  "לשחק במילים האלה" next to "להיום" in the footer.

### N6. At Pre-A1, Today's lesson card shows the can-do only in English (minor)
- **Route:** `#/today`, Pre-A1 learner (r1-15b, r10-today-10min-travel-PreA1).
- **Evidence:** the card reads "I can say and recognise the 26 letters and spell my name." with no Hebrew line. The
  Hebrew version exists, because the lesson intro shows it first. A learner who chose "I know no English" cannot read
  the one sentence that says what today is for.
- **Suggestion:** apply the BL-3 rule (Hebrew leads at full support) to the Today and Path cards too.

### N7. The part-end counter still disagrees with the text (polish)
- **Route:** the part end of `#/lesson/pa1-01` (r1-14b) and `#/lesson/a2-01` (r5-02).
- **Evidence:** the top shows "8 מתוך 13" (and "10 מתוך 16"), while the text says "עד תרגיל 7" (and "עד תרגיל 9").
- **Suggestion:** on the part-end card, show "7 מתוך 13 · החלק של היום" or hide the counter.

### N8. The desktop rail hides 3 labs without a sign that it scrolls (polish)
- **Route:** any route at 1440x900 (r7-01).
- **Evidence:** the lab list is clipped mid-label at "מרכז האזנה / Listening". "מעבדת דיבור", "מעבדת כתיבה" and "מורה AI"
  are reachable only by scrolling the rail, and there is no fade or "עוד" hint.
- **Suggestion:** add a bottom fade or shadow above the pinned footer. Or fold the labs under a "מעבדות" disclosure,
  since the Practice hub already lists them all.

### N9. Small copy and layout details from the new screens (polish)
- **"Games" hub** (r4-games):
  - It says "הרמה שלך" (singular) while the rest of the app uses the plural ("שלכם").
  - The "אתגר מהירות" switch is a small native checkbox, while every other setting is a segmented control.
- **Placement intro** (r2-05) and Today mid-placement (r2-08): "או בלי מבחן:" wraps so that "להתחיל ב-A1" hangs
  alone on the next line. Stack both buttons under the label.
- **Today before any plan exists** (r2-08): the "כמה זמן יש לכם היום?" control shows while the plan is "תופיע אחרי
  מבחן המיקום", so it does nothing yet. Hide it until there is a plan.

## What I liked (keep these)

- **Today can finish.** "התוכנית להיום הושלמה" with ticked items, then "רוצים עוד? לא חובה. כל אחד מאלה עומד בפני
  עצמו." in dashed cards with no orange key. This is the single biggest improvement, and it matches the brand
  (r5-06, r1-15b).
- **The learn stage in steps.** Five steps with dots and "כ-5 דק׳ קריאה", the "מלכודת לדוברי עברית" box with play
  buttons right after the rule, and English behind an "EN" chip at Pre-A1 (r1-11-learn-1). The A-Z table with
  Hebrew sound-alikes is excellent for a true beginner (r1-11-learn-2).
- **Honest end screens.** "השיעור עוד פתוח · 9% בניסיון הראשון. צריך 70% כדי להשלים" with "re-learn" first
  (r9-03). The part end shows "להמשיך ולסיים · כ-6 דק׳" and today's words (r1-14b).
- **Select, then check.** In lessons and review, a tap only selects and "בדיקה" commits (r1-12-selected,
  r6-02). Games say plainly "הבחירה נבדקת מיד." (r11-05). That is honest about the different rule.
- **Text size from the first screen.** It is now on onboarding step 1 (r1-03), as well as under the gear. At 150%, the top-bar
  icons get labels ("עזרה", "הגדרות") and the Real-Life tab shortens to "לחיים" (r11-06).
- **Placement**: "שאלה N מתוך כ-20", consistent level-named escapes everywhere, and a result screen that shows the
  ceiling ("ב-B1, הרמה שמעל: 5 מתוך 8") (r2-06, r3-20).
- **Navigation that returns you where you were**: Path → lesson → ✕ goes back to `#/path/A2`. The rail on desktop keeps Help and
  Settings in view. Practice is useful from day one.
- **Form errors done right**: a red border, the message under the field, focus moved, and `aria-invalid` (r1-03).

## Top 3 wishes

1. **One "done" rule for every screen.** The lesson end, the review end and Today should agree on whether today is
   finished. Every button should open what it names (N1, N5, N4).
2. **Keep the advice when the learner comes back.** After a weak score, the return intro and Today should repeat
   "re-learn first", not fall back to the drill (N2).
3. **Make the zero-level learner's first days fully theirs.** Show Hebrew can-dos on Today and Path, keep the goal
   promise at Pre-A1 or reword it, and make the part-end counter match (N3, N6, N7).
