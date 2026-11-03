Simulated review (AI persona), not real user research.

# Student panel (round 3): Lior, 16, Bagrut 4 units, phone only

## Who I am

An AI playing Lior: 16, 11th grade, preparing for the English Bagrut at 4 units, somewhere around A2-B1. I only
use my phone (390x844, touch, he-IL, Hebrew UI), I study in 10-minute bursts between other things, I get
bored fast, I like games, and I write off anything that feels "childish" or "like school" within a minute.

Screenshots are in
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/student-16/`
(below, only the file name is given). All runs: Playwright Chromium, `hasTouch`, `isMobile`, light mode unless
noted. Speech does not work in headless Chromium, so I judged the listening and speaking screens by flow and
wording only.

## What I did

1. **Landing and onboarding** (`#/` then `#/start`): name ליאור, born 2010, goals "בגרות, פסיכומטרי ולימודים
   אקדמיים" and "אנגלית ליום-יום, סדרות ורשת", 10 minutes a day, start "אני מסתדר/ת בשיחות פשוטות", tried to
   finish without the terms box (blocked, with a message), then accepted. Shots 01 to 06.
2. **Placement test** (`#/placement?start=conversations`): answered as a solid-A2, shaky-B1 student (A2 right,
   B1 mostly right, B2 a mix of wrong and "לא יודע/ת", one wrong listening item). 16 questions. Result: start at
   B1. Shots 07-pl-*, 08.
3. **Today and Path** (`#/today`, `#/path/B1`). Shots 09, 10b.
4. **Lesson at my level** (`#/lesson/b1-01`, "Have you ever...?"): intro, the explanation screen, exercises 1-3
   (one wrong try in the matching), the "today's part is done" stop, then "להמשיך עכשיו" to the end, with some
   wrong answers on purpose (listening, reading, the "correct the question" item), then the end screen. Shots
   11 to 19.
5. **Review** (`#/review`): 8 words, 6 right, one wrong pick, one "לא זוכר/ת". Shots 20, 22-rev-*, 23, 24.
6. **All three games** (`#/games`):
   - Word quiz B1 stage 1 (`#/games/B1/1`): **two full rounds** (7/10, then 9/10), which opened stage 2; one
     question of stage 2 in dark mode. Shots 26, 27-wq-*, 28-wq-*, 29, 42.
   - Words and pictures (`#/games/pictures/1`, then level 2): one round each. Shots 30-pic-*, 31-pic-*.
   - Memory (`#/games/memory/1`): one full round. Shots 32-mem-*.
7. **Does it help with the Bagrut?** Today at 10 and at 20 minutes, Reading, Writing, Listening, Help,
   Progress, the AI tutor, Settings and Real-life. Shots 34 to 47.

## What worked for me (keep this)

- **No guilt, no streak.** "יעד שבועי: 1 מתוך 5 ימים. יום חופש לא מוחק כלום." on Today and "אין רצף שנשבר"
  in onboarding (09-today-fold, 03b). This is exactly why I would not feel bad opening it after skipping a day.
- **The placement test respects me.** "לא יודע/ת" is encouraged, nothing tells me I failed, it took 16
  questions, and the result is honest per skill ("אין מספיק תשובות", "לא נבדק במבחן הזה") with an
  option to start at B2 or prove B1 first (08-placement-result).
- **The word quiz is the best thing in the app.** Instant right/wrong with the answer, a score in a pill at
  the top, "+10 ובונוס מהירות 5", "שיא חדש! הקודם: 105 נקודות", "נפתח שלב 2", the list of missed words,
  "לשחק במילים שפספסתי (3)" and "להוסיף 2 מילים לחזרה המרווחת" (27-wq-r1-result, 28-wq-r2-result). I
  played it twice without being asked. It is the reason I would open Lucid tomorrow.
- **Picture and memory games look grown-up.** Clean line icons, no cartoon characters, no mascot (30-pic-l1-
  board0, 32-mem-l1-turn1). Fast rounds.
- **My place is always kept.** "המקום שלכם נשמר: בפעם הבאה ממשיכים מתרגיל 4 מתוך 16" (14-part-end), and the
  X in a lesson drops me on Today without losing anything (45-exit-lesson).
- **Feedback that teaches.** A wrong listening answer shows the transcript and the reason (13-ex-04-e4-fb);
  the "שימו לב (דוברי עברית)" boxes (Eilat word order, swam/swum) are what my teacher says but shorter
  (12-learn-part2).
- **"לא יכול/ה לדבר כרגע"** on speaking tasks (18-speak): I study on the bus and in class, so this matters.
- **Israeli context** in the content (Eilat, Tel Aviv, a forum user called Lior_TLV) makes it feel made for me.
- **Honest about AI being off:** "אנחנו לא מציגים שיחה מזויפת" on the tutor (40-tutor).
- **Dark mode** looks good on Today and in the games (41-dark-today, 42-dark-wq-stage2).
- **Review is quick:** 8 taps, under a minute, clear green/red (22-rev-2-fb).

## What did not work for me

### 1. The Bagrut goal does almost nothing I can see (major)
- **Route:** `#/start` step 2, `#/today`, `#/reading`, `#/writing`, `#/placement` result.
- **What I did and saw:** I chose "בגרות, פסיכומטרי ולימודים אקדמיים". At 10 minutes a day my plan is only a
  slice of the next lesson (09-today-fold); the goal is never mentioned. When I switched Today to 20 minutes, a
  4-minute "קריאה: טקסט קצר ברמה שלך" appeared with "בחרת בגרות ולימודים: קריאה של טקסטים קצרים בונה את
  ההבנה שהמבחנים האלה בודקים." (34-today-20min). That is the only place the word Bagrut appears after
  onboarding. The placement result says "מתחילים ב-B1" and nothing about what B1 means for me
  (08-placement-result). Reading (73 texts) and Writing ("Agree or disagree: volunteering at school") have
  useful material (35-reading-top, 36-writing-top), but nothing is labelled as Bagrut-type practice, and
  there is no way to tell Lucid my units or exam date.
- **Why it matters:** the Bagrut is the only reason I installed an English app. If I cannot see the
  connection in the first session, I go back to the past papers my teacher gives.
- **Suggestion:** in onboarding, when the studies goal is picked, ask "כמה יחידות?" (3/4/5) and the exam month.
  Then: tag reading and writing items that train Bagrut skills ("מתאים להכנה לבגרות"), give 10-minute users
  one Bagrut-type item a few times a week (the goal currently only acts from 20 minutes), and show the
  countdown and "what to practise this week" on Today. Keep the honesty: no claim that Lucid predicts a grade.

### 2. "גם התשובה שלי נכונה" lets me give myself credit for a wrong answer (major)
- **Route:** `#/lesson/b1-01`, exercise e11 "Make this a correct question." (source: "You have ever been to
  Eilat?").
- **What I did and saw:** I typed the wrong sentence back with one extra character ("You have ever been to
  Eilat? x"). The verdict was a soft amber "לא אחת מהתשובות שלנו", a sample answer, "אם התשובה שלכם אומרת
  את אותו הדבר ועושה מה שהמשימה מבקשת, אפשר לספור אותה." and a button "גם התשובה שלי נכונה" (18-ex-02-e11-
  fb). The word-order mistake that is the whole point of the exercise is not named unless I open "למה?".
- **Why it matters:** any 16-year-old will find this button on day one and tap it to skip. It also teaches
  nothing: the error stays invisible.
- **Suggestion:** when the answer still contains the source error (here, still starts "You have"), say so in
  red: "עדיין בסדר של משפט חיווי: בשאלה have בא לפני you". Offer the self-credit button only when the answer
  differs meaningfully from the source and from the known wrong forms, and keep self-credited answers out of
  the score and the mastery estimate (show them as "סימנת כנכון").

### 3. The explanation is a 7-screen textbook before the first exercise (major)
- **Route:** `#/lesson/b1-01`, "בואו נלמד".
- **What I did and saw:** the learn screen is 6,450 CSS px tall (about 7.5 phone screens): two English
  paragraphs, a 4-row grammar table, a second table of irregular verbs, 8 example cards, 3 warning boxes and 12
  vocabulary cards (12-lesson-learn, 12-learn-part0, 12-learn-part2). The footer under it says "הסבר קצר,
  ועכשיו מתרגלים." The same pattern in b1-02 (44-learn-he-toggle).
- **Why it matters:** this is the moment Lucid looks exactly like school. In a 10-minute burst I either skip it
  ("ישר לתרגול", a quiet ghost button) or spend most of my time scrolling.
- **Suggestion:** show one card (the rule plus the "שימו לב" box), then exercises, then the next card where it
  is needed. Move the full tables and the 12 vocabulary cards to "להרחבה" or the grammar lab. Change the footer
  text to match the real length, or make the length match the text.

### 4. A 10-minute day is 3 exercises, and the stop screen feels like nothing happened (major)
- **Route:** `#/today` → `#/lesson/b1-01`.
- **What I did and saw:** the plan said "השיעור כולו כ-25 דקות, אז היום עושים חלק: עד תרגיל 3 מתוך 16"
  (09-today-fold, 11-lesson-intro). After 3 exercises: "החלק של היום הושלם" with two paragraphs of text and
  the counter in the top bar reading "4 מתוך 16" (14-part-end). No count of what I got right, no words
  learned, nothing to enjoy. At this pace one lesson takes about five of my sessions.
- **Why it matters:** if my whole daily session is 3 questions plus scrolling, it does not feel like
  progress, and I will not come back.
- **Suggestion:** for 10-minute days budget mostly exercises (6-8) with the short explanation cards from
  finding 3. On the part-end screen show "3 מתוך 3 נכון", the words met today, and one optional 2-minute
  finisher ("משחק מהיר עם המילים של היום") next to "לעצור כאן". Make the counter say what was done ("3 מתוך
  16 הושלמו").

### 5. Games are hidden, and two of them start at kindergarten words for a B1 learner (major)
- **Route:** `#/today`, `#/practice`, `#/games`, `#/games/pictures/1`, `#/games/memory/1`.
- **What I did and saw:** nothing on Today mentions games. They are the second card under "מעבדות" in Practice, "משחקי מילים", between
  vocabulary and the grammar lab (25-practice). The games page is about 3,900 CSS px long; my level's word quiz (B1, marked "הרמה שלך") is the
  fourth level card down, under Pre-A1, A1 and A2 (26-games). Words and pictures and Memory both open at "רמה
  1: בסיס יומיומי · Pre-A1–A1" (grapes, ear, baby, umbrella, lamp: 30-pic-l1-board0, 32-mem-l1-turn1) and level 2
  is locked until I score 70% there. I got 100% on level 2 (31-pic-l2-result).
- **Why it matters:** games are what I came for in the gaps between lessons. Matching "baby" to a baby face
  as a Bagrut student is the definition of childish.
- **Suggestion:** a "משחק מהיר" entry on Today (2-3 minutes, after the plan or when the plan is done); open the
  games page scrolled to my level, or put my level first; let a B1 learner start the picture and memory games
  at level 3, or unlock all levels from the placement result.

### 6. Game rules read like a rulebook (minor)
- **Route:** `#/games`.
- **What I did and saw:** each game has a paragraph of scoring maths before I can play, e.g. "״פספוס״ (כשהזוג
  כבר נראה ונבחר קלף אחר) מוריד 3, ויש בונוס על מעט תורות" and a box "בונוס מהירות לכל תשובה נכונה: 3s +5,
  6s +3, 10s +1; בהקלדה: 8s +5, 15s +3, 25s +1." (26-games-top, 26-games-mid). The memory result repeats the
  definition: "פספוס: תור שבו הזוג של הקלף הראשון כבר נראה, ובכל זאת נבחר קלף אחר." (32-mem-l1-result).
- **Suggestion:** one line per game ("מהר ובלי טעויות = יותר נקודות") and the full rules behind an (i).

### 7. One slip in matching fails the whole exercise (minor)
- **Route:** `#/lesson/b1-01`, exercise e1 (match verbs to participles).
- **What I did and saw:** one wrong pair, then all 6 pairs right. I still had to tap "בדיקה", and the verdict
  was "לא בדיוק · ניסיון שגוי אחד" in red, and the exercise came back as a revisit (13-ex-00-e1-fb, counter
  "1 לחזרה"). In Words and pictures, 2 wrong taps put 4 words under "מילים לחזור עליהן", including grapes,
  which I knew (30-pic-l1-result).
- **Suggestion:** auto-finish matching when the last pair is placed, show "6/6, טעות אחת בדרך" in amber rather
  than red, and only list the word whose picture I actually got wrong.

### 8. Hebrew explanations at B1 are 8 separate "עב" taps (minor)
- **Route:** `#/lesson/b1-01`, `#/lesson/b1-02`, `#/settings`.
- **What I did and saw:** at B1 everything is in English with a small "עב" chip under each paragraph (3 on the
  intro alone, 8 on the b1-02 explanation: 11-lesson-intro, 44-learn-he-toggle). The only global switch is in
  Settings, "הסברים בעברית: לפי הרמה ... בלחיצה ב-B1-B2" (46-settings), which I would never find.
- **Why it matters:** I am borderline B1. Grammar rules in English are the part I most need in Hebrew.
- **Suggestion:** one "הכול בעברית" toggle at the top of the learn and intro screens, remembered for the
  level.

### 9. "Enter" keyboard chips on every button on a phone (minor)
- **Route:** placement, lesson, review, games.
- **What I did and saw:** primary buttons show a boxed "Enter" ("הבא Enter", "בואו נלמד Enter", "לעצור כאן
  Enter", "חזרה להיום Enter") although I am on a touch phone (07-pl-q1-picked, 11-lesson-intro, 14-part-end,
  23-rev-done). The `.kbd` element is still displayed when `(pointer: coarse)` matches.
- **Suggestion:** hide `.kbd` under `@media (hover: none) and (pointer: coarse)`.

### 10. Onboarding asks me to consent to AI that this site does not have (minor)
- **Route:** `#/start` step 4.
- **What I did and saw:** a 6-line checkbox "לאפשר משוב AI (כתיבה, שיחות, מורה; צריך חשבון) ... יישלחו לספק
  ה-AI (Anthropic)..." on a site with no accounts and no AI (05-ob-step4). Together with the under-18 banner
  and the speech paragraph it is a wall of legal text before I have seen one exercise.
- **Suggestion:** when AI is not configured, drop the checkbox and say one line ("משוב AI לא זמין באתר הזה");
  keep only the terms box.

### 11. Today opens with two offers before my plan (minor)
- **Route:** `#/today`, first visit.
- **What I did and saw:** right after I picked Hebrew in onboarding, Today shows "את/ה ברמה B1. ממשק באנגלית הוא
  עוד תרגול יומיומי" with "לעבור לאנגלית" (a blue banner taking most of the first screen), and below the plan
  "להוסיף לחזרה המרווחת את מילות המפתח של שיעורי A2 שדילגת עליהם?" (09-today-fold). The banner was still there
  after the lesson and the review (24-today-after-review).
- **Suggestion:** show the language offer after a few sessions, not minutes after I chose Hebrew, and put
  the plan first on the screen.

### 12. Real-life recommendations ignore my goals (minor)
- **Route:** `#/real-life`.
- **What I did and saw:** "כדאי להתחיל כאן — תרחישים שעוד לא עשית, לפי הרמה והמטרות שלך" lists "Delayed flight:
  getting rebooked", "Reporting lost luggage" and "Your reservation can't be found" (47-real-life). I picked
  studies and everyday English (shows, internet), not travel. "ביטויים וסלנג", the part I would actually open,
  is a small button. In onboarding the everyday goal said "לא משנה את התוכנית" (03b-ob-step2-chosen), which is
  honest but tells me my choice is pointless.
- **Suggestion:** for the everyday goal, rank expressions and slang and social scenarios first, and give
  the everyday goal something real (for example short texts about series and online life in Reading).

### 13. Review and lesson end screens are flat (minor)
- **Route:** `#/review` end, `#/lesson/b1-01` end.
- **What I did and saw:** review ends with "סיימתם / 6 מתוך 8 נכון..." and an empty screen (23-rev-done):
  no list of the 2 words I missed and no next step except "חזרה להיום". The lesson end gives a school-style
  "ענית נכון בניסיון הראשון על 79% מהתרגילים" and five English bullet points (19-lesson-end).
- **Suggestion:** list the missed words with play buttons and "לשחק במילים האלה" (the word game already does
  this well; reuse it), and say when they come back.

### 14. Today's lesson card is cramped (polish)
- **Route:** `#/today`.
- **What I did and saw:** the lesson card squeezes three things into a narrow middle column, so "השיעור כולו
  כ-25 דקות, אז היום עושים חלק: עד תרגיל 3 מתוך 16. המקום נשמר בכל יציאה." wraps over four short lines next to
  the icon and "10 דק׳" (09-today-fold, 16-today-after-part).
- **Suggestion:** put the time under the title and let the note use the full card width.

### 15. Time estimates I don't believe (polish)
- **Route:** `#/today` at 20 minutes.
- **What I did and saw:** "חזרה מרווחת · 2 מילים · 6 דק׳" (34-today-20min); my 8-word review took under a
  minute.
- **Suggestion:** estimate review time from the card count (about 10 seconds a card) so the plan's numbers
  are believable.

### 16. Score breakdown is not isolated as LTR (polish)
- **Route:** game results.
- **What I did and saw:** "7 × 10 = 70, ובונוס מהירות 35" renders in the RTL line as "35 ובונוס מהירות ,70 = 10
  × 7" (27-wq-r1-result); the total next to it already uses `<bdi dir="ltr">` for "/ 150".
- **Suggestion:** wrap the equation in `<bdi dir="ltr">` as well.

## Would I come back tomorrow?

Yes, for the word quiz: it has my level, a best score to beat, stage 2 is now open, and the words I missed
are waiting. Also because nothing punishes me for skipping a day. I would probably not tap the lesson card
again: one lesson is "about 25 minutes" and five days of my 10 minutes, and it starts with a long English
grammar page.

What would make me delete it: if every 10 minutes is mostly reading tables for 3 exercises, and I still
cannot see anything that says "this is for your Bagrut". Also everything lives only in this phone's browser,
with no account and nothing that suggested adding it to my home screen during my session, so if I lose the
tab, I lose the habit.

## Top 3 wishes

1. **A Bagrut mode:** tell Lucid my units and exam date, see Bagrut-type reading and writing marked as such,
   and get one of them a few times a week even at 10 minutes.
2. **10 minutes of doing, not reading:** short explanation cards between exercises, 6-8 exercises a day, and a
   part-end screen that shows what I got right and offers a 2-minute game.
3. **Games at my level, one tap from Today:** a quick game in the plan, picture and memory games starting at my
   level, and "play the words I missed" after every lesson and review.
