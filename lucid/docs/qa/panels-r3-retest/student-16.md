Simulated review (AI persona), not real user research.

# Student panel, round 3 re-test: Lior, 16, Bagrut 4 units, phone only

## Who I am

An AI playing Lior: 16, 11th grade, preparing for the 4-unit English Bagrut, somewhere around A2-B1. I use only
my phone (390x844, touch, he-IL, Hebrew UI, text 100%, light mode, plus one dark-mode pass). I study in 10-minute
bursts, I get bored fast, I like games, and I drop anything that feels childish or "like school".

Screenshots are in
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/student-16/`
(below, only the file name). All runs: Playwright Chromium, `hasTouch`, `isMobile`, service workers blocked.
Speech does not work in headless Chromium, so I judged the listening and speaking parts by flow and wording.

**Note for the team about evidence.** In this Playwright build a `fullPage: true` screenshot switches
`(pointer: coarse)` off for the rest of the page's life (I measured `matchMedia('(pointer: coarse)')`: true before,
false after, and `.kbd` goes from `display:none` to `block`). So the "Enter" keycaps you see in my full-page shots
11-*, 12-*, 13-* and 14-* are a capture artifact, not the app. From 16-* on I took viewport shots, or made the
viewport taller instead of using `fullPage`, and the keycaps are gone there. Other panels' full-page shots may show
the same artifact.

## What I did

1. **Onboarding** (`#/start`): name ליאור, born 2010, goals "בגרות, פסיכומטרי ולימודים אקדמיים" and "אנגלית
   ליום-יום, סדרות ורשת", 10 minutes, start "אני מסתדר/ת בשיחות פשוטות", tried to finish without the terms box,
   then accepted (01 to 06).
2. **Placement test**, answered as a solid-A2, shaky-B1 student: 16 questions, result B1 (07-pl-*, 08, 08b, 08c).
3. **Today** at 10 minutes (09-today).
4. **Lesson b1-01** from Today: intro, the 6 explanation steps, the "הכול בעברית" switch, exercises 1-4 with a
   matching slip and a wrong listening answer, the part-end screen (11 to 14). Then **came back** through Today
   and the resume screen, finished the lesson, and on purpose tried two wrong answers on e11 and one on e13 to test
   the second try and the self-credit button. End screen, then Today again (16 to 19).
5. **Review** (`#/review`): 8 cards. On the first card I tapped a wrong option, then the right one, then Check;
   one wrong answer, one "לא זוכר/ת" (20 to 23).
6. **All three games**:
   - Word quiz B1 stage 1, opened from the review's "לשחק במילים האלה": **two full rounds** (7/10, then 9/10),
     then stage 2; one more round with "אתגר מהירות" on (27 to 30d).
   - Words and pictures, **level 3** straight away, with 2 deliberate wrong taps (31-pic-l3-*).
   - Memory, **level 3**, one full round (32-mem-l3-*).
7. **Bagrut check and the rest**: Practice, Games hub, Reading, Writing, Real life, Expressions, Help, Settings,
   Today at 20 minutes in dark mode, lesson b1-02 in dark mode (25, 26, 34, 35, 36, 38, 44, 46, 47, 48).

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| 1 | The Bagrut goal does almost nothing I can see (major) | partly | At 10 minutes Today now shows "יש עוד 4 דקות? קריאה ברמה שלכם" with "בחרתם בגרות ולימודים: קריאה של טקסטים קצרים בונה את ההבנה שהמבחנים האלה בודקים." (09-today), and it stays under "רוצים עוד?" when the plan is done (19). That is the only place. The word "בגרות" appears 0 times on `#/reading`, `#/writing`, `#/help`, `#/real-life` (I counted it in the page text) and not on the placement result (08c). No units, no exam date (deferred on purpose in plan.json). |
| 2 | "גם התשובה שלי נכונה" lets me give myself credit for a wrong answer (major) | partly | The trick from last time is closed: "You have ever been to Eilat? x" now gets "עוד לא. אפשר לתקן בעצמכם" with "המשפט עדיין כמו המקור", "לנסות שוב" and "להציג את התשובה", and no self-credit button (13-11-e11-fb). But "Have you ever went to Eilat?" (wrong participle, the exact point of this lesson) still gets the amber "לא אחת מהתשובות שלנו" and the button "גם התשובה שלי נכונה" (17-05-e11-fb). The word diff (went → been) is a good addition. |
| 3 | The explanation is a 7-screen textbook before the first exercise (major) | partly | Now 6 steps with dots, "1 מתוך 6 · כ-7 דק׳ קריאה", and "מלכודת לדוברי עברית" next to the rule with a play button (12-learn-0). Honest and easier to swallow. But it is still about 7 minutes of reading on a 10-minute day, each step is 1,171 to 1,850 CSS px tall (1.4 to 2.2 phone screens), and step 3 is the full irregular-verbs table (12-learn-2). b1-02 is the same: "1 מתוך 5 · כ-7 דק׳ קריאה" (44b). |
| 4 | A 10-minute day is 3 exercises, and the stop screen feels like nothing happened (major) | partly | Today's part is now 4 exercises ("עד תרגיל 4 מתוך 16", 09-today), and the part-end screen shows "היום: 3 מתוך 4 נכונות בניסיון הראשון" and the 12 lesson words (14-part-end). Still: 7 minutes of reading plus 4 exercises, the words are grey tags with no meaning and no sound, the counter at the top says "5 מתוך 16", and there is no 2-minute game offer on this screen (it only appears on Today). |
| 5 | Games are hidden, and two of them start at kindergarten words for a B1 learner (major) | fixed | Practice opens with "מומלץ עכשיו: משחק מילים · B1" (25-practice); after the plan, Today offers "משחק מילים · B1 · 2 דק׳" (16, 19); the hub puts B1 first with "הרמה שלך" and is 1,912 px tall (26-games); `#/games/pictures/3` and `#/games/memory/3` opened for me and I played both (31-pic-l3-boarddone, 32-mem-l3-turn1). Small leftover in new finding 10. |
| 6 | Game rules read like a rulebook (minor) | fixed | One line per game ("10 שאלות. כל תשובה נכונה = 10 נקודות."); "איך מנקדים?" appears only when "אתגר מהירות" is on (26-games, 30-games-challenge-on). The memory result no longer defines "פספוס" (32-mem-l3-result). |
| 7 | One slip in matching fails the whole exercise (minor) | fixed | e1 finished by itself after the last pair, amber "כל הזוגות נכונים · ניסיון נוסף אחד", the pairs shown side by side ("see — seen") with play buttons, and e1 did not come back as a revisit (13-00-e1-fb). Picture game: 2 wrong taps listed exactly 2 words, battery and panda (31-pic-l3-result). |
| 8 | Hebrew explanations at B1 are 8 separate "עב" taps (minor) | fixed | "הכול בעברית" sits on the intro and learn headers; one tap showed every Hebrew paragraph and removed the chips (12-learn-0-heall), and b1-02 opened with it already on (`aria-pressed="true"`, 44b). The chips now say "בעברית". Settings copy is stale, see new finding 9. |
| 9 | "Enter" keyboard chips on every button on a phone (minor) | fixed | Viewport shots have no keycaps: placement "הבא" (07-pl-q1-picked), review "בדיקה" (21-rev-0-selected), game "המשך" (27-wq-r1-q0-fb); `getComputedStyle(.kbd).display` is `none` under touch emulation. See the evidence note above about full-page shots. |
| 10 | Onboarding asks me to consent to AI that this site does not have (minor) | fixed | Step 4 now shows one line, "AI לא פעיל באתר הזה. כל השאר עובד. אם יתווסף, נשאל קודם.", and only the terms box (05-ob-step4). |
| 11 | Today opens with two offers before my plan (minor) | fixed | No "לעבור לאנגלית" banner; the plan is the first block; the A2-words offer sits below it (09-today). |
| 12 | Real-life recommendations ignore my goals (minor) | fixed | "כדאי להתחיל כאן" now lists Small talk at a party, Invitations, Meeting travellers in a hostel, and "אנגלית חברתית" comes first (47-real-life-fold). The everyday goal says "דיבור וכתיבה לסירוגין" in onboarding (03b). |
| 13 | Review and lesson end screens are flat (minor) | partly | Review: fixed. "המילים שפספסתם (2)" with play buttons, "תחזור בעוד דקה" and "לשחק במילים האלה", which opened the word quiz with my missed word as question 1 (23-rev-done, 27-wq-r1-q0-fb). Lesson end: better ("השיעור הושלם", "מה לזכור" with Hebrew, "כדאי לשים לב" with my own mistakes), but it still opens with "ענית נכון בניסיון הראשון על 78% מהתרגילים", has no "play these words", and one of the notes explains the wrong rule (new finding 1) (18-lesson-end). |
| 14 | Today's lesson card is cramped (polish) | fixed | The time sits under the title and the note uses the card width (09-today). |
| 15 | Time estimates I don't believe (polish) | fixed | "חזרה מרווחת · 8 מילים · 2 דק׳" and "עוד סבב קצר · 2 מילים · 1 דק׳" (34b-today-20min); my 8 cards took about a minute. |
| 16 | Score breakdown is not isolated as LTR (polish) | fixed | "הניקוד: 9 × 10 = 90" reads left to right (28-wq-r2-result); also "18 × 10 − 2 × 3 = 174" in the picture game. |

## New findings

### 1. The lesson-end note explains the wrong rule for my mistake (major)
- **Route:** `#/lesson/b1-01`, end screen, "כדאי לשים לב".
- **What I did and saw:** On e11 I wrote "Have you ever went to Eilat?". The word order was right; the participle was
  wrong. The end screen lists "כתבתם: Have you ever went to Eilat? → Have you ever been to Eilat?" and under it
  "In a question, have/has comes before the subject ... A rising voice alone isn't enough." / "בשאלה have/has בא לפני
  הנושא" (18-lesson-end). The note is e11's fixed explanation (`error_type: "word-order"` in b1-01.json), shown for
  any wrong answer.
- **Why it matters:** I did the word order right and am told it was my problem; the actual error (went vs been,
  the whole lesson's point) is not named. If I trust this, I learn nothing; if I notice, I stop trusting the notes.
- **Suggestion:** pick the note from the diff. When the learner's answer already has the key's word order and only
  the verb form differs, show the participle note ("אחרי have בא past participle: been, לא went"). Keep the
  word-order note for answers that still start "You have".

### 2. Self-credit still open for the lesson's target error (major; follow-up to earlier finding 2)
- **Route:** `#/lesson/b1-01` e11.
- **What I did and saw:** "Have you ever went to Eilat?" gets "גם התשובה שלי נכונה" (17-05-e11-fb). The check in
  plan EX-5 asked for the key's main verb form; "been" is missing from my answer and the button still shows.
- **Suggestion:** treat "went/gone vs been" and "did/does + V-ed" as known wrong forms in every present-perfect
  rewrite, give the red verdict with the participle note and a second try, and offer self-credit only when the key's
  verb form is present.

### 3. Lesson end and Today disagree about what is next (minor)
- **Route:** `#/lesson/b1-01` end, then `#/today`.
- **What I did and saw:** the end screen's orange key is "להמשיך בתוכנית: חזרה על מילים · 2 דק׳" (18-lesson-end).
  Today then says "התוכנית להיום הושלמה (כ-29 דק׳)" and lists the same review as optional, "8 מילים חדשות: סבב
  ראשון", under "רוצים עוד? לא חובה" (19-today-after-lesson).
- **Suggestion:** one source of truth. If the plan is already done, the end screen's primary should be "לסיים
  להיום" (to Today), with the review as a secondary "רוצים עוד?" key.

### 4. Where I continue tomorrow: exercise 5 or 6? (minor)
- **Route:** part end, `#/today`, `#/lesson/b1-01`.
- **What I did and saw:** the part-end screen says "בפעם הבאה ממשיכים מתרגיל 5 מתוך 16" with "5 מתוך 16" in the
  top bar (14-part-end). Today then says "מחר ממשיכים מתרגיל 6 מתוך 16", and so does the resume key, "להמשיך
  מתרגיל 6 מתוך 16" (16-today-after-part, 16b-resume).
- **Suggestion:** compute the "continue from" number in one helper and use it on all three screens. On the part-end
  screen, have the counter say what was done ("4 מתוך 16 הושלמו").

### 5. The "done" minutes on Today jump around (minor)
- **Route:** `#/today`.
- **What I did and saw:** after today's part (7 minutes of reading plus 4 exercises; the plan had said "כ-11
  דקות") Today says "התוכנית להיום הושלמה (כ-6 דק׳)" (16-today-after-part). The finished lesson's card shows "8
  דק׳" at 10 minutes and "14 דק׳" for the same finished lesson after switching to 20 minutes (19, 34b).
- **Suggestion:** count the reading time of the explanation in "done", and show a finished lesson's real total
  (or no minutes at all) whatever today's setting is.

### 6. The lesson writing task has three different word counts and accepts half (minor)
- **Route:** `#/lesson/b1-01` e16.
- **What I did and saw:** the task says "Write 80-120 words", the counter says "0 מילים · לפחות 80", the disabled
  button says "שמירה ובדיקה · עוד 20 מילים" (17-09-e15-fb shows the empty task). With 40 words it saved, and the
  automatic check says "40 מילים (יעד 80-130)" (17-10-e16-fb).
- **Suggestion:** one range everywhere (80-120), and either a real minimum on the button ("עוד 40 מילים") or the
  honest label "אפשר לשלוח גם קצר יותר".

### 7. Calm pace doubles my taps, and "אתגר מהירות" doesn't speed it up (minor)
- **Route:** `#/games/B1/1`, `#/games` switch.
- **What I did and saw:** every answer now waits for "המשך" (I waited 4 s; nothing moved: 27-wq-r1-q0-fb). That is
  20 taps for 10 questions. I switched "אתגר מהירות" on: the speed bonus came back ("+10 ובונוס מהירות 5", "10 × 10 +
  50 = 150", a separate best: 30c, 30d), but after a correct answer the game still waited for "המשך" (I waited
  2.5 s).
- **Why it matters:** I liked the speed bonus last time; the calm default is fine for others, but the challenge
  mode feels slower than the old game.
- **Suggestion:** in challenge mode only, move on by itself about 1 s after a correct answer (wrong answers still
  wait). In calm mode, let a tap anywhere on the green verdict card continue.

### 8. A leftover toast covers the main key on the placement result (minor)
- **Route:** `#/placement` result.
- **What I did and saw:** right after the last question, the black toast "לא שומעים? בדקו את עוצמת הקול ומצב
  שקט..." sits over "לתוכנית של היום" (08b-result-t0); 6 seconds later it is gone (08c-result-t6). It comes from the
  listening question before, so it shows up on a screen where nothing is playing.
- **Suggestion:** clear toasts when the result screen renders, or show them above the footer, never over a primary
  key.

### 9. Settings still talks about the old "עב" chip (polish)
- **Route:** `#/settings`, "הסברים בעברית".
- **What I saw:** "כשכבוי, עברית זמינה בלחיצה על ״עב״." (46-settings-fold), but the chips now say "בעברית".
- **Suggestion:** change to "בלחיצה על ״בעברית״", and mention the "הכול בעברית" switch in the lesson.

### 10. Picture and memory games still list Pre-A1 first and don't mark my level (polish)
- **Route:** `#/games`.
- **What I saw:** the quiz marks B1 "הרמה שלך", but under "התאמת מילים לתמונות" and "משחק זיכרון" the order is
  still "רמה 1: בסיס יומיומי · Pre-A1–A1" first and my level 3 (A2–B1) last, with no tag (26-games).
- **Suggestion:** put level 3 first for A2+ learners and tag it "מתאים לרמה שלך".

### 11. An English phrase breaks across lines inside the Hebrew paragraph (polish)
- **Route:** `#/lesson/b1-02`, learn step 1, "הכול בעברית" on, dark mode.
- **What I saw:** "והוא עונה Yes, I've" ends line 1 and "been there twice –" starts line 2 (44b-b1-02-learn-dark).
  Reading right to left, the English quote is cut in half.
- **Suggestion:** keep short quoted English (under about 30 characters) on one line (`white-space: nowrap` on the
  isolated span), as BL-1 did for other runs.

### 12. Lesson end copy mixes singular and plural (polish)
- **Route:** `#/lesson/b1-01` end.
- **What I saw:** "ענית נכון בניסיון הראשון על 78% מהתרגילים" next to "בחרתם", "כתבתם" (18-lesson-end).
- **Suggestion:** "עניתם נכון...", and lead with something warmer than a percentage, such as "12 מילים חדשות
  וחמש נקודות לזכור".

## What I liked (keep this)

- **Second tries.** "עוד לא. אפשר לתקן בעצמכם" with my text kept, "לנסות שוב" and "להציג את התשובה" (13-10-e10-fb,
  17-07-e13-fb). This is how a good teacher does it, and it doesn't feel like school.
- **Today can say "done".** "התוכנית להיום הושלמה" with a tick, and "רוצים עוד? לא חובה" (16, 19). After 10 minutes I
  can close the app and feel finished.
- **Review that selects, then checks**, and an end screen with my missed words that opens a game with them first
  (21-rev-0-selected, 23-rev-done, 27-wq-r1-q0-fb). The best new loop in the app.
- **Matching that forgives a slip** and shows the pairs together (13-00-e1-fb).
- **"הכול בעברית"**, one tap, remembered for the next lesson (12-learn-0-heall, 44b).
- **"מלכודת לדוברי עברית"** next to the rule, with a play button (12-learn-0).
- **Games at my level.** B1 first on the hub, level 3 pictures (crown, battery, scales, squirrel) and memory (dice,
  turtle, microscope) open for me. English big and Hebrew small on the tiles. No mascot, nothing childish (31, 32).
- **Score maths that read in order** ("9 × 10 = 90") and personal bests kept per mode (28, 30d).
- **The placement test** still respects me: "לא יודע/ת", per-skill honesty, the offer to start at B2.
- **No guilt:** "יעד שבועי: 1 מתוך 5 ימים. יום חופש לא מוחק כלום." (09).
- **Honest AI-off copy** in onboarding, Practice ("מורה AI · לא פעיל באתר הזה") and Settings.
- **Dark mode** looks calm and grown-up (34-today-dark-10, 44b).

## Would I come back tomorrow?

Yes, more than last time. The word quiz is still the hook, and now the review sends my missed words straight into
it. Today tells me when I'm done, and the lesson asks me to fix my own mistakes instead of just showing the answer.

What would still make me delete it: the Bagrut. After onboarding, my Bagrut goal shows up as one optional reading
line, and nothing in Reading or Writing says "this is Bagrut practice". A 10-minute day is still 7 minutes of
reading before 4 exercises.

## Top 3 wishes

1. **Bagrut, visibly.** Tag the reading texts and writing tasks that match the Bagrut question types, and give me one
   a week at 10 minutes (the deferred track; even just the tags would help now).
2. **Fix the feedback on e11-type answers.** No self-credit for "went" instead of "been", and an end note that names
   my actual error.
3. **Shorter reading on short days.** On a 10-minute day, show steps 1 and 2 (the rule and the trap), go to the
   exercises, and keep the verb table and vocabulary steps for later or for "להרחבה".
