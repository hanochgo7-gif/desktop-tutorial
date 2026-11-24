Simulated review (AI persona), not real user research.

# Student panel, round 3 re-test: Rina, 44, nurse, false beginner (about A1), phone, 115% text, late at night

## Who I am

Rina, 44, a nurse and mother of three. I learned English at school 30 years ago (around A1). I study about 10 minutes a night on my phone: 390x844 touch, Hebrew UI, dark mode (one pass in light mode), text size 115%. I worry about my pronunciation and about being judged.

## What I did

Screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/student-44/` (named by file below).

1. `#/` welcome, then `#/start`: chose 115% in the new "גודל טקסט" control on step 1, year 1982, goals travel and conversation, "קצר וקל 10 דק׳", "אני מכיר/ה קצת", terms. Placement test (12 questions, A1 right, A2 wrong or "לא יודע/ת"), result A1, then Today (02b, 03b, 05, 07-placement-q1, 09-today-first).
2. Fresh A1 learner at 115% through the test hook. Lesson `a1-01` from Today's main key: intro, all 5 learn steps, then all 15 exercises with the same mistakes as last time (one wrong pair in matching, "are go", "plays", "evry", lowercase translation without a full stop, "My brother and I is work in a shop.", dictation "we go to the gym on mondays and thursday", speaking marked "צריך עוד תרגול", a short text). Part end after exercise 6, retries, lesson end, Today after (11 to 17).
3. Clock two nights later at 22:30: Today, `#/review` (11 words, select then check, 3 wrong), then Today 40 minutes later (22, 23, 24, 25).
4. `#/practice`, `#/listening` and its next item, `#/speaking` (30 to 35).
5. `#/games`, then words and pictures `#/games/pictures/1`, 3 boards with one wrong pair, waiting 6 seconds on each board (40 to 44).
6. Light mode: `#/lesson/a1-02` intro and learn step 1 with the EN chip, `#/help`, `#/settings` (50 to 54). A separate run to watch the speaking self-mark in lesson 1 (60).

A note on the method: Playwright full-page screenshots reset the touch emulation, which made the "Enter" chips reappear in my first run. I re-checked with viewport screenshots only, and the computed style of `.kbd` on a touch phone is `display: none`.

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| F1 | Lesson-end "כדאי לשים לב" talks about things I never learned ("go – went – gone") | fixed | 16-lesson-end-1/2: the box now lists my own mistakes: "בחרתם: ~~We are go~~ → We go" with "לא מוסיפים are לפני הפועל: We go.", the "plays" gap, and "My brother and I is work in a shop. → My brother and I work in a shop." No "went/gone". (See N2 and N3 for two new rough edges.) |
| F2 | IPA and English scrambled inside Hebrew lines | fixed | 50-a1-02-intro-light-1: the objective reads in order, right to left: "כ-/s/, /z/ או /ɪz/: works, lives, watches". Learn pitfall "ב-leave וב-eat (/iː/)" keeps the word and its symbol together (13-learn-s2-1). Only the trailing full stop still looks odd (N7). |
| F3 | Hebrew looks secondary; the "short explanation" is about 8 screens | fixed | At A1 the Hebrew explanation is the main line (computed: `oklch(0.185 0.01 250)`, 19.55px), and the English duplicate is behind an "EN" chip (51, 52-en-chip-open). The learn stage is 5 steps of about 1,300 to 2,000 px each with "1 מתוך 5 · כ-5 דק׳ קריאה" and "הבא" / "לתרגול". "הסבר קצר" is gone. |
| F4 | One wrong tap turns the first matching exercise red | fixed | 15-e1-wrongpair shows the wrong pair outlined with a cross; when the last pair locks, the verdict appears by itself in amber: "כל הזוגות נכונים · ניסיון נוסף אחד", and the pairs are shown as rows "live / לגור" with play buttons (15-01-e1-fb). It was not re-queued: only e4 and e6 came back as "חוזרים". |
| F5 | The first grammar table reads backwards and squeezes the Hebrew | fixed | 13-learn-s0-1: each row is a left-to-right card "Who? I · Verb work · The rest in a bank." with the Hebrew under it. No sideways scroll. |
| F6 | On review nights, the lesson part is only 1 exercise | fixed | 22-today-night2: "11 מילים חדשות: סבב ראשון · 2 דק׳", then the lesson "עד תרגיל 4 מתוך 16". |
| F7 | The same 11 words lead Today 40 minutes after review | fixed | 25-today-40min: the main key is now "להתחיל: הווה פשוט: he, she, it", and the review row says "עברתם היום על 11 מילים." (See N8 about "תחזור בעוד דקה".) |
| F8 | "Almost" in dictation does not show what differs | fixed | 15-13-e13-fb: the missing "s" in "Thursdays" is boxed in amber, and the verdict says "המילה נכונה; האיות: Thursdays". Lowercase "mondays" is tolerated, which I am fine with. |
| F9 | Onboarding asks AI consent on a site with no AI | fixed | 05-ob-step4: one line, "AI לא פעיל באתר הזה. כל השאר עובד. אם יתווסף, נשאל קודם.", and no AI checkbox. The terms checkbox label is short. |
| F10 | No text size before the first lesson | fixed | 02b-ob-step1-115: "גודל טקסט 100% / 115% / 130% / 150%" on step 1, "משתנה מיד", and the root font size went to 18.4px at once. The welcome page also has "גודל טקסט: א+". |
| F11 | Words and pictures hurries me (speed bonus, auto-advance) | fixed | 43b-pic-board1-6s: after 6 seconds the board still waits for "ללוח הבא". The result is "117 נקודות / 120 ... 12 × 10 − 1 × 3", with no speed bonus. The games hub explains "אתגר מהירות: כבוי: אין שעון, והמשחק מחכה לכם". (See N9 about the −3.) |
| F12 | My goals do nothing at 10 minutes | fixed | 03b: "ב-10 דקות: שיעור וחזרה. המטרות מופיעות כהצעה, ומ-20 דקות בתוך התוכנית." 09-today-first: "יש עוד 4 דקות? Finding your gate for a connecting flight · 4 דק׳ · בחרתם טיולים". |
| F13 | Pronunciation notes rely on IPA symbols | partly | Lesson pitfalls now start with the mouth: "מותחים את השפתיים כמו בחיוך ומאריכים את ה'אִי' ב-leave..." with play buttons for leave, eat, live, it, and for work, we, week (13-learn-s2-1). But the lesson's speaking tip still opens "we ו-work מתחילות ב-/w/:" (15-e14-speak-0), and the speaking lab's pair menu shows a symbol line under every pair: "/æ/ – /ʌ/ – /e/", "/θ/ – /s/ – /t/", and "/ʃɪp/" under each word (35-speaking-0). |
| F14 | Listening buries my level under Pre-A1; "next" is from a lesson I have not done | partly | 31-listening: A1 is first, "מומלץ לרמה שלכם", rows have Hebrew titles ("הווה פשוט: I, you, we, they · תכתיב · 9 מילים"), the levels above are collapsed and Pre-A1 is at the end. The page is 5,335px instead of about 21,000. But "לתרגיל ההאזנה הבא" still opened `a1-02` e3 ("What does the speaker's brother do on Fridays?"), from the he/she/it lesson I have not started (32-listening-item). |
| F15 | Shadowing has a jargon heading and right-aligned English | fixed | 35-speaking-4/5: "חוזרים אחרי הדובר (shadowing)", and every sentence card is left-aligned. |
| F16 | "Enter" chips on buttons on a touch phone | fixed | With touch emulation, `.kbd` computes to `display: none` on placement, lesson intro and review; viewport screenshots show "הבא", "בואו נלמד", "בדיקה" alone (12-intro-0, 23-review-1-selected). #/help has no keyboard item on touch. |
| F17 | Today's main key mixes Hebrew with an English title | partly | 09-today-first: the key now reads "להתחיל: הווה פשוט: I, you, we, they". But the plan card under it still leads with the English title in bold and gives the goal in English only: "I can describe habits and facts." (11-today-115, 17-today-after-1). |

## New findings

### N1. Marking "צריך עוד תרגול" in a lesson is no longer acknowledged (minor)
- **Route:** `#/lesson/a1-01`, exercise 14 (speaking).
- **What I did:** I tapped "צריך עוד תרגול" (60-speak-selfmarked), then the only main key, "המשך". The app went straight to exercise 15. Last time I got a calm "נרשם: צריך עוד תרגול" verdict, which told me that saying "I need practice" is not a mistake. Now nothing confirms it was recorded. The only sign is a thin outline on the button I tapped.
- **Why it matters to me:** this was the moment that made speaking feel safe. Without it, I wonder whether I failed or skipped.
- **Suggestion:** after a self-mark, show the short neutral verdict again ("נרשם: צריך עוד תרגול. זה יחזור בתרגול דיבור.") before moving on, or put that line under the two buttons as soon as one is chosen.

### N2. The lesson-end box repeats a whole paragraph for a one-word mistake (minor)
- **Route:** `#/lesson/a1-01`, end screen, "כדאי לשים לב".
- **What I saw:** for the gap exercise where I chose "plays", the box shows the whole Noa message twice, about 10 lines: struck through, then in green ("Hi! I'm Noa. My sister and I live in a small flat in Jaffa... we plays football..." → the same text with "play"). I had to search for the one changed word (16-lesson-end-1, 16-lesson-end-2).
- **Suggestion:** for gap exercises, show only the sentence with the gap, or just the word: "we ~~plays~~ → we play". Keep the whole-sentence form for the short transform and correct exercises, where it works well.

### N3. A mistake I fixed myself on the second try is listed as a plain mistake (polish)
- **Route:** `#/lesson/a1-01`, exercise 11, then the end screen.
- **What I did:** I wrote "My brother and I is work in a shop.", got "עוד לא. אפשר לתקן בעצמכם" with the hint "מי הנושא? שני אנשים." (15-11-e11-second), and fixed it myself ("נכון"). The end box still lists it as "כתבתם: My brother and I is work in a shop. →" with no sign that I corrected it (16-lesson-end-2).
- **Suggestion:** mark it "תיקנתם בעצמכם" with a check. Fixing my own mistake is exactly what the app wants me to learn, so it deserves to be seen.

### N4. The writing task's word counts disagree (minor)
- **Route:** `#/lesson/a1-01`, exercise 15.
- **What I saw:** under the empty box "0 מילים · לפחות 25", while the disabled key says "שמירה ובדיקה · עוד 10 מילים" (15-14-e14-fb). Is it 25 or 10? After I wrote 33 words, the checks said "33 מילים (יעד 25-80)".
- **Suggestion:** use one number. For example the key says "עוד 10 מילים לשמירה", and the line says "יעד: 25-80 מילים", or both count toward 25.

### N5. The first "מלכודת לדוברי עברית" in lesson 1 is about a word the lesson never teaches (minor)
- **Route:** `#/lesson/a1-01`, learn step 1.
- **What I saw:** the first pitfall, right after the table, is "agree הוא פועל, בדיוק כמו live או work, ולכן אומרים I agree – בלי am", with play buttons for "agree" and "I agree" (13-learn-s0-2). "agree" is not in the lesson's words (work, study, eat, drink, go, speak, play, meet...) or in any exercise. The general rule I need ("לא מוסיפים am/is/are לפני הפועל: I work") only appears two steps later in "כדאי לדעת".
- **Suggestion:** in step 1, lead with the rule in this lesson's own verbs ("I work, לא I am work"), and keep "I agree" as an extra example under it.

### N6. Lesson-end and Today disagree about whether the plan is finished (minor)
- **Route:** `#/lesson/a1-01` end screen, then `#/today`.
- **What I saw:** the end screen's main key says "להמשיך בתוכנית: חזרה על מילים · 2 דק׳" (16-lesson-end-0). Today then says "התוכנית להיום הושלמה (כ-24 דק׳)", and the same review is listed as optional under "רוצים עוד?" ("8 מילים חדשות: סבב ראשון", 17-today-after-0/1). The lesson card says "8 דק׳", although I spent the whole 20-minute lesson.
- **Suggestion:** once Today counts the plan as done, the lesson-end key should say something like "סיימתם להיום" or "לחזרה קצרה (לא חובה) · 2 דק׳". Show the lesson's real time on the done card.

### N7. A trailing full stop jumps to the front of short English examples (polish)
- **Route:** `#/lesson/a1-01` end screen "מה לזכור", `#/lesson/a1-02` intro.
- **What I saw:** "הווה פשוט = הרגלים ועובדות: I work in a bank." displays its second line as ".I work in a bank" (16-lesson-end-0). In a1-02, the objective's last line is ".lives, watches" (50-a1-02-intro-light-1). Hebrew readers read it correctly, but to me it looks like an English sentence that starts with a dot.
- **Suggestion:** when a Hebrew sentence ends with an English example, keep the final full stop inside the English isolate, as BL-1 already does for whole sentences.

### N8. "תחזור בעוד דקה" on the review done screen (polish)
- **Route:** `#/review`, done screen.
- **What I saw:** each missed word says "תחזור בעוד דקה" (24-review-done-0). It is 22:30. It sounds like I should stay and wait. In fact Today 40 minutes later did not bring them back (25-today-40min).
- **Suggestion:** say "תחזור בחזרה הבאה" or "תחזור מחר", and keep exact minutes out of the learner's view.

### N9. Words and pictures still takes away points for a wrong pair in calm mode (polish)
- **Route:** `#/games/pictures/1`.
- **What I saw:** a wrong pair says "לא מתאים. נסו שוב. (פחות 3 נקודות)", and the hub says "טעות מורידה 3" (42-pic-mistake, 40-games). The pace is calm now, but losing points for trying is still a small sting. The memory game's description mentions no penalty.
- **Suggestion:** in calm mode, drop the −3 and show accuracy ("92% דיוק" is already there). Keep the penalty for "אתגר מהירות".

### N10. The original sentence's red wavy underline touches the answer box (polish)
- **Route:** `#/lesson/a1-01`, exercise 11 ("מצאו ותקנו את הטעות").
- **What I saw:** the red wavy line under "a shop." sits on the top border of the textarea (15-11-e11-second).
- **Suggestion:** add about 12px of space between the sentence and the box.

### N11. A listening item can be answered without hearing anything (minor)
- **Route:** `#/listening?l=a1-02&e=e3`.
- **What I saw:** on this device there is no English voice. The speaking lab says so honestly ("בדפדפן הזה אין קול באנגלית ... כפתורי התשובה נשארים סגורים ושום תוצאה לא נשמרת", 35-speaking-2). The listening item, though, let me choose "He plays tennis.", press "בדיקה" and get "נכון", with no warning (32, 33). There is also no "לא יודע/ת" in the listening item.
- **Suggestion:** use the same banner and lock in listening items as in the speaking lab, and add "לא יודע/ת".

## What I liked (keep this)

- **Onboarding fits me now.** I chose 115% on the first screen and saw it change at once. Step 2 tells me plainly what 10 minutes means. Step 4 says "AI לא פעיל באתר הזה" in one calm line instead of a consent form.
- **The placement test is still kind.** "אין ציון ואין ״נכשל״", "לא בטוחים? ״לא יודע/ת״ עדיף על ניחוש", 12 questions, and a result that says what was not tested. The Hebrew instruction is now the bold line above the English (07-placement-q1).
- **The learn stage in steps.** "1 מתוך 5 · כ-5 דק׳ קריאה", one idea per screen, "לתרגול" always there. The Hebrew is the text I read, and "EN" is there if I want it.
- **The pitfall boxes with sound.** "מלכודת לדוברי עברית" with "מותחים את השפתיים כמו בחיוך" and play buttons for leave / live / eat / it. This is exactly what I asked for.
- **Second tries.** "עוד לא. אפשר לתקן בעצמכם" with "מי הנושא? שני אנשים." let me find the mistake myself without feeling stupid, and "להציג את התשובה" is right there if I'm tired.
- **Matching forgives one slip** in amber and then shows me the pairs together with sound. A much better first exercise of the first lesson.
- **The lesson-end box is about my mistakes**, in my words, with the fix.
- **Today can say "done".** "התוכנית להיום הושלמה ... אפשר לעצור כאן" with optional extras under "רוצים עוד? לא חובה." Late at night, that is the most respectful sentence in the app.
- **Review: select, then check.** I can change my mind before "בדיקה", and the feedback gives the word, the meaning and an example. The plan's review takes 2 minutes and the lesson part takes 4 exercises, even on a review night.
- **Calm games.** The board waits for me, the results show accuracy, and "מילים לחזור עליהן" with "לשחק עם המילים האלה (1)".
- **Speaking without fear** is still there: "לא יכול/ה לדבר כרגע" on every speaking screen, "תרגול דיבור לא מקבל ציון", and the honest note on speech recognition: "מבטא הוא חלק ממי שאתם".

## My top 3 wishes now

1. **Bring back "נרשם: צריך עוד תרגול"** (N1), and remove the last symbol-first pronunciation lines in the speaking tip and the speaking lab's pair menu (F13).
2. **Make the end of a lesson short and consistent:** one changed word per gap mistake, credit for a mistake I fixed myself, and one message, shared with Today, about whether I'm done for tonight (N2, N3, N6).
3. **Hebrew first on Today's lesson card at A1,** and a "next listening" item from a lesson I have already done (F17, F14).
