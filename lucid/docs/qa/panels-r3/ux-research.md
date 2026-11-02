Simulated review (AI persona), not real user research.

# UX research panel (round 3): first run, information architecture, navigation

## Who I am

An AI playing a UX researcher on the UX team. My brief: walk through first run three times as a new learner
with different choices, then judge the navigation model, how easy each feature is to find, how clear the Today
plan is, what the app looks like when you come back after a lesson, and whether there are dead ends. Mostly
390x844 (phone, touch, he-IL), once at 1440x900.

Screenshots are in
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/ux-research/shots/`
(below, only the file name is given).

## What I did

1. **Run 1, "start from zero"** (`#/` then `#/start`): name נועה, born 1998, goal travel, 10 minutes, start
   "אני לא יודע/ת אנגלית בכלל", terms. Landed in `#/lesson/pa1-01`. Read the explanation, did the exercises
   (one wrong on purpose) until the "today's part" stop at exercise 7 of 13, chose "לעצור כאן", landed on Today.
   Shots r1-01 to r1-15.
2. **Age gate:** a separate browser profile, year 2011. Shots r0-refused, r0-refused-again.
3. **Run 2, "I know some"**: Daniel, born 2009 (17), goals studies and everyday, start "אני מכיר/ה קצת".
   Placement intro, 5 answers (one "לא יודע/ת"), then X ("שמירה ויציאה"). Looked at Today and Path in that
   in-between state. Shots r2-04 to r2-09. In another profile I chose "אני מעדיף/ה להתחיל מהבסיס" on the
   placement intro (r10-01).
4. **Run 3, placement to the end**: Maya, born 1990, goals work and conversation, 20 minutes, start "אני די
   בנוח/ה". Played a solid-A2, shaky-B1 learner for 20 questions until the result, then went to Today. Shots
   r3-q3, r3-q4, r3-20, r3-21.
5. **Navigation and findability** with the run-3 learner: every tab, the Practice and Real-Life hubs, Games,
   Review, Expressions, Vocabulary, Settings, Help (r4-*). Exits from bare screens: game, lesson from the Path,
   lesson mid-practice, review, scenario, browser Back after onboarding, `#/welcome` and `#/start` when already
   onboarded (r6-*, r8-03).
6. **Coming back after a lesson**: a fresh A2 learner (made with the profile snippet) finished `a2-01` with
   every first try right, then I looked at Today, Practice, Vocabulary, Review and Progress (r5-*). Earlier, the
   run-3 learner failed the same lesson at 16% (my first, careless answering script), so I also judged that
   return state (r9-*).
7. **Desktop 1440x900** once: Today, Practice, Games, Real-Life, a lesson, the rail (r7-*).

## What worked for me (keep this in a redesign)

- **Welcome** (r1-01): one clear button "בואו נתחיל", three honest claims, and the line "הרמות ב-Lucid הן הערכה
  לפי מתארי CEFR, לא תעודה רשמית." The Hebrew/English switch is in view from the first second.
- **The age refusal** (r0-refused) is calm and respectful: "תודה שרצית ללמוד איתנו… נשמח לראות אותך כשתגיע/י
  לגיל 16", and it says that the year was not saved. Coming back through "בואו נתחיל" shows the same screen, not
  the form (r0-refused-again).
- **"Start from zero" means no test**: the sub-line "נתחיל מהאותיות. בלי מבחן." keeps its promise, and the
  learner is in lesson 1 right after the last onboarding step.
- **Placement test framing** (r2-05): "אין ציון ואין ״נכשל״", "״לא יודע/ת״ עדיף על ניחוש", "אפשר לעצור
  באמצע". Leaving with X really did save the answers. Today and Path then show one clear card
  ("להמשיך את מבחן המיקום · ענית על 5 שאלות, והן נשמרו") with "continue", "start again", or start without the
  test (r2-08, r2-09).
- **Placement result** (r3-20): per-skill rows, "לא נבדק במבחן הזה" for speaking and writing, why this start
  level was chosen, and two ways up ("להתחיל ב-B1", "בדיקת רמה A2"). Honest and respectful.
- **The "today's part is done" screen** (r1-14) has no guilt: "המקום שלכם נשמר: בפעם הבאה ממשיכים מתרגיל 8 מתוך 13".
- **Today** (r3-21): one orange primary action, every item says why it is there ("בחרת עבודה: מצב אחד מהעבודה,
  ברמה שלך"), minutes per item, and "יעד שבועי: 1 מתוך 5 ימים. יום חופש לא מוחק כלום."
- **Phone navigation model**: five plain tabs (היום, המסלול, תרגול, אנגלית לחיים, התקדמות) with Settings and
  Help as icons in the top bar. It is easy to learn, and I never needed a "More" menu. Most features are two
  taps away:
  - games: תרגול, then משחקי מילים;
  - expressions: אנגלית לחיים, then the "ביטויים וסלנג" chip at the top;
  - text size: the gear, then "גודל טקסט", the third control on the settings page;
  - profile: התקדמות, then "הפרופיל שלי".
- **Review appears where it is needed**: once words were due it was on Today ("להתחיל: חזרה"), in Practice under
  "מומלץ עכשיו", and in Vocabulary ("חזרה על מילים (8)"). Before that its empty state links back to Today (r4-review).
- **The Real-Life hub** (r4-real-life): category filter, a "ברמה שלי" toggle, "כדאי להתחיל כאן", "להציג את כל
  5" per category, and an offline note before travel. The scenario page has a breadcrumb back (r6-07b).
- **The AI tutor card** says "דורש הגדרת AI" up front, and Settings says "משוב AI עוד לא זמין באתר הזה".
- **No real dead ends:**
  - every bare screen (lesson, placement, review, games) has an X that leads somewhere sensible;
  - `#/start` and `#/welcome` send an onboarded learner to Today;
  - browser Back from the first lesson lands on Today, not on a blank onboarding form (r8-03).

## What did not work (findings)

### F1. After a whole lesson, Today never says "done" and refills with a new 20-minute plan (major)
- **Route:** `#/today` after finishing `#/lesson/a2-01` (about 25 minutes, daily goal 20 minutes).
- **Evidence:** r5-05 shows "השלמת שיעור היום ✓" next to "להתחיל: חזרה" and "התוכנית להיום · כ-20 דקות" with three
  new items: review 6 min, the next lesson 10 min, a scenario 4 min. The run-1 learner, who stopped at the
  planned part, got "סיימתם את התוכנית להיום" (r1-15).
- **Why it matters:** the learner who did more is told less clearly that they are done. "When am I finished
  today?" is the core question Today should answer, and an endless plan works against "no pressure".
- **Suggestion:** count the finished lesson against today's minutes. Show "התוכנית להיום הושלמה (כ-25 דק׳)"
  as the headline, and put the new items under an optional "רוצים עוד?" heading with no orange button.

### F2. The lesson-complete screen's main button skips the daily plan (major)
- **Route:** the end of `#/lesson/a2-01` (r5-04), compared with `#/today` (r5-05).
- **Evidence:** the orange primary is "לשיעור הבא", and "להיום" is a ghost button. Today, a second later, says
  the next step is the review of 8 words, not the next lesson.
- **Why it matters:** two screens give two different "what now" answers. Following the big button takes the
  learner past their due review and their time budget.
- **Suggestion:** make the primary "להמשיך בתוכנית: חזרה · 6 דק׳" (the next plan item) or "לתוכנית של היום",
  and make "לשיעור הבא" secondary.

### F3. "כמעט שם" and "כמעט סיימת" shown after 16% (major, trust)
- **Routes:** the end of `#/lesson/a2-01`, the lesson intro on return (r9-02) and Today (r9-01).
- **Evidence:**
  - The intro banner reads "כמעט שם · בפעם הקודמת: 16% בניסיון הראשון… נשאר לתקן רק את 12 התרגילים
    שפספסתם (כ-17 דק׳)".
  - Today says "כמעט סיימת: What are you doing?" with "16 דק׳"; the lesson intro says "כ-17 דק׳".
  - The orange button is "לתרגל את 12 הטעויות". Re-reading the explanation is a small ghost link.
- **Why it matters:** with 12 of about 14 exercises missed, "nearly there" is not honest. The brand promises
  honest reporting. At this score the right next step is to re-learn, not to drill the misses.
- **Suggestion:**
  - Change the wording by score. Below roughly 50%, use "השיעור הזה עוד לא יושב, וזה בסדר" and make "לקרוא שוב
    את ההסבר ואז לתרגל" the primary.
  - Keep "כמעט שם" for scores near the pass mark.
  - Use one minute figure on both screens.

### F4. Desktop 1440x900: Settings and Help are below the fold of the left rail (major for findability)
- **Route:** any route at 1440x900, for example `#/today` (r7-01; r7-06 is the rail scrolled down).
- **Evidence:**
  - The rail has 13 links (5 main and 8 "מעבדות") before its footer.
  - The Help link starts at y=904 and Settings at y=965, but the viewport is 900 px tall. Neither is visible
    until you scroll the sidebar.
  - Desktop has no top bar with the gear icon that phones have.
- **Why it matters:** a laptop user looking for text size or language has nothing on screen that leads there.
  Laptop screens shorter than 900 px make it worse.
- **Suggestion:** pin Help and Settings (and "שמור במכשיר הזה") to a sticky strip at the bottom or top of the
  rail. Or fold the 8 labs under one "מעבדות" disclosure, which the Practice hub already provides.

### F5. Pre-A1 lesson 1 is laid out for someone who reads English (major, first run)
- **Route:** `#/lesson/pa1-01` straight after choosing "אני לא יודע/ת אנגלית בכלל" (r1-10, r1-11, r8-01, r8-02).
- **Evidence:**
  - The intro lists three "בסוף השיעור" goals in which the English line is the larger, black line and the
    Hebrew is the smaller blue line.
  - Every explanation box repeats a long English paragraph ("Capital letters (A, B, C) are for: the first word
    of a sentence…") under the Hebrew.
  - The "learn" stage is one scroll of 5,825 px at 390 px wide (about 7 screens) before the first exercise.
  - A 37-word note about the daily plan ("השיעור כולו כ-15 דקות, ולכן התוכנית היומית שלך לוקחת היום חלק
    ממנו…") is the first paragraph a brand-new learner reads.
- **Why it matters:** the learner just said they know no English. Most of the visual weight on their first
  screens is text they cannot read, and seven screens of reading before the first tap is a lot for a first
  session.
- **Suggestion:**
  - At Pre-A1 with full Hebrew support, make Hebrew the primary line and show English as a quiet "באנגלית"
    toggle.
  - Break the learn stage into 2-3 short cards with exercises in between.
  - Move the plan-split note to one line under the button, for example "היום: עד תרגיל 7 (כ-10 דק׳)".

### F6. The first lesson of a 10-minute learner ends mid-lesson, with "stop" as the main button (minor)
- **Route:** `#/lesson/pa1-01`, exercise 8 of 13 (r1-14), then `#/today` (r1-15).
- **Evidence:** "החלק של היום הושלם". The orange button is "לעצור כאן"; "להמשיך עכשיו" is a ghost button with
  no time estimate. Day one ends without "השיעור הושלם" and without words going into review. The top counter
  says "8 מתוך 13 · 3 לחזרה" while the text says the part ended at 7.
- **Suggestion:** respecting the 10 minutes is right. On the first day, show the cost of finishing:
  "להמשיך ולסיים את השיעור · כ-5 דק׳". Explain or drop "3 לחזרה" in the counter (it means retries queued, not
  spaced review).

### F7. Onboarding asks for AI consent on a site where AI cannot work (minor, trust)
- **Route:** `#/start` step 4, "פרטיות, בקצרה" (r1-08, r2-04). Compare `#/settings` (r4-settings).
- **Evidence:**
  - A 60-word checkbox reads "לאפשר משוב AI (כתיבה, שיחות, מורה; צריך חשבון). הטקסטים שתשלחו… יישלחו לספק ה-AI
    (Anthropic)…".
  - This site has no accounts and AI is switched off.
  - Settings says "(משוב AI עוד לא זמין באתר הזה.)"; onboarding does not.
- **Suggestion:** in device-only mode, replace the checkbox with one line, "משוב AI לא זמין באתר הזה". Ask for
  consent at the moment of first AI use, where the learner can see what will be sent.

### F8. Onboarding step 2 is overloaded, and its goal copy assumes CEFR knowledge (minor)
- **Route:** `#/start` step 2 (r1-04, r1-05: 1,391 px tall at 390 px).
- **Evidence:**
  - Six multi-select goals, four single-select time choices and a weekly-days select share one screen, and the
    multi-select and single-select choices look identical (a blue fill, no check or radio mark).
  - The intro says "מרמה A1 ומ-20 דקות ביום, התוכנית היומית כוללת תרגול אחד לפי המטרות" to someone who has not
    been placed yet.
  - The run-1 learner (travel goal, 10 minutes, Pre-A1) saw nothing travel-related on Today (r1-15).
- **Suggestion:**
  - Split goals and time into two steps, or add a check icon to the goal cards and radio dots to the time cards.
  - Say plainly what the goals change: "בהתחלה מתמקדים ביסודות. ״אנגלית לחיים״ (טיולים, עבודה) פתוחה בכל רגע
    מהלשונית שלה".

### F9. The "start from the basics" escape differs between screens, and for an "I know some" learner leads to the alphabet (minor)
- **Routes:** the placement intro after "אני מכיר/ה קצת" (r2-05), and Today mid-placement (r2-08).
- **Evidence:**
  - The intro offers only "אני מעדיף/ה להתחיל מהבסיס", which took me to `#/lesson/pa1-01`, The English
    alphabet (r10-01).
  - Today offers "להתחיל ב-A1 (ההערכה שלך)" and "להתחיל מהבסיס".
- **Suggestion:** offer the same two choices in both places, and name the level on the button ("להתחיל מהאותיות
  (Pre-A1)" and "להתחיל ב-A1") so a learner who knows simple sentences does not land in the alphabet by accident.

### F10. The placement result shows a row that seems to contradict itself (minor, trust)
- **Route:** the placement result (r3-20).
- **Evidence:** "אוצר מילים · A2 (2 מתוך 2 נכונות ב-B1)". The reason (a skill never goes above the confirmed
  level) is in the faint footnote.
- **Suggestion:** "A2 · נראה טוב גם ב-B1 (2 מתוך 2), יאושר בבדיקת רמה", next to the existing "להתחיל ב-B1"
  button.

### F11. Placement progress has no end in sight (minor)
- **Route:** `#/placement` (r2-06, r3-q4).
- **Evidence:** the counter shows only the question number ("4"). My run asked 20 questions, while the bar is
  scaled to 18 and the intro says "כ-10 דקות".
- **Suggestion:** "שאלה 4 מתוך כ-20", or name the phase ("עוד כמה שאלות לאישור הרמה").

### F12. The Today minutes control has no visible label and changes the permanent setting (minor)
- **Route:** `#/today` (r3-21, r8-04).
- **Evidence:**
  - The 10/20/35/50 segmented control has no visible label; its aria-label says "אורך האימון היום".
  - Tapping 35 changed Settings, "עומס לימוד", "זמן ביום", to 35 (checked afterwards), so it is not a
    today-only choice.
  - After the tap, the top-bar title "היום" disappeared (r8-04 compared with r5-05).
- **Suggestion:** add a visible label, "כמה זמן יש לך היום?". Either make it today-only, or label it "זמן יומי"
  and say that it is saved. Keep the top-bar title after a settings change.

### F13. "Labs" is named on Today but there is nothing called that in the phone navigation (minor)
- **Route:** `#/today` when the plan is done (r1-15).
- **Evidence:** "סיימתם את התוכנית להיום. אפשר להמשיך בחופשיות במעבדות." The text is not a link. On phones,
  "מעבדות" exists only as a heading inside the "תרגול" tab.
- **Suggestion:** link it ("במעבדות" to `#/practice`), or say "בלשונית תרגול". At Pre-A1, suggest one concrete
  next thing (for example the Pre-A1 word game or the letters memory game).

### F14. Leaving a lesson opened from the Path returns to Today, not the Path (minor)
- **Route:** `#/path`, then `#/lesson/a2-05`, then X (r6-04).
- **Evidence:** I landed on `#/today` and lost my place in the Path. Leaving a game returns to `#/games` (r6-03),
  so the behaviour is inconsistent.
- **Suggestion:** return to the screen the learner came from (the router already knows it as `ctx.from`), with
  Today as the fallback.

### F15. Mixed Hebrew and English key points break apart on the lesson-complete screen (minor, learning)
- **Route:** the end of `#/lesson/a2-01` (r5-04; r5-04-crop-bidi is enlarged).
- **Evidence:** the Hebrew line wraps as "שאלה: Are you working? שלילה: I'm not" / "working. תשובה קצרה: Yes, I am.
  / No, she" / ".isn't". The example sentences are split across lines, and the full stop lands in front of
  "isn't". The same thing happens in "אל תשמיטו את be: He is cooking, ולא He" / ".cooking".
- **Suggestion:** isolate each English example as its own LTR element that does not wrap mid-example, or put
  the examples on their own line under the Hebrew rule.

### F16. On desktop the Practice hub repeats the rail, and on phones it is empty for new learners (minor)
- **Routes:** `#/practice` at 1440 (r7-02) and at 390 for a just-placed learner (r4-practice).
- **Evidence:** at 1440 the hub lists the same 8 labs, in the same order, as the rail beside it. At 390,
  "מומלץ עכשיו" only says "אחרי כמה שיעורים, כאן יופיעו…".
- **Suggestion:**
  - Give a new learner a concrete first item: a word game at their level, or "לנסות מצב מהחיים".
  - On desktop, lead with recommendations and recent activity, and show the lab list compactly.

### F17. Onboarding errors are not attached to their fields (polish)
- **Route:** `#/start` step 1 without a year (r1-03), and step 4 without terms (r1-09).
- **Evidence:** the red text ("בחרו שנת לידה." / "כדי להמשיך צריך לאשר את התנאים.") appears above the button.
  The field and checkbox get no red border, no `aria-invalid` and no focus.
- **Suggestion:** mark the field, place the message under it, and move focus to it.

### F18. "Enter" key hints on touch phones (polish)
- **Routes:** lesson, placement and review buttons at 390 with touch (r1-10, r1-12, r2-06, r9-02).
- **Evidence:** every primary button carries an "Enter" key cap, which means nothing on a phone and takes space
  from the label.
- **Suggestion:** hide the `.kbd` hints under `(hover: none) and (pointer: coarse)`.

## Top 3 wishes

1. **A Today that can finish.** Count whatever was done today (a whole lesson included) against the chosen
   minutes, say "done" clearly, and make everything after that optional. Lesson-end screens should send the
   learner back into the plan, not past it (F1, F2).
2. **Honest, score-aware "what next" after a weak lesson.** Re-learn first when most answers were wrong, and
   save "כמעט שם" for scores that really are close (F3).
3. **A first lesson built for a true beginner, and settings you can always see.** Hebrew leads at Pre-A1, the
   learn stage comes in short pieces, finishing lesson 1 on day one is easy, and Settings and Help stay pinned on
   desktop (F4, F5, F6).
