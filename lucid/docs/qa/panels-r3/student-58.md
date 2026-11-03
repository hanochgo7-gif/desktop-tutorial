Simulated review (AI persona), not real user research.

# Student panel, round 3: Yosef, 58 (Pre-A1, tablet, text 130%)

## Who I am

Yosef, 58. I own a small import business and I want to be able to talk on the phone with suppliers abroad. I can read Latin letters, but slowly. I am not confident with apps: I need to see what to tap next, and I don't guess at icons. I used a tablet (768x1024, touch) with the Hebrew interface, and I set text size to 130% as soon as I found it.

## What I did

1. Opened `#/` and tapped "בואו נתחיל". Did the onboarding at `#/start`: name יוסף, born 1968, goal "עבודה ושיחות מקצועיות", "קצר וקל 10 דק׳", start "אני לא יודע/ת אנגלית בכלל". I tried "המשך" without picking a starting point, and "סיום והתחלה" without ticking the terms, to see the errors.
2. Onboarding sent me straight into `#/lesson/pa1-01`. I left with the X, found Settings (the gear icon) from `#/today` and set "גודל טקסט" to 130%.
3. Did **lesson 1, `#/lesson/pa1-01`, from start to end**: "בואו נלמד" (the explanation), then all 13 exercises. I made some mistakes on purpose ("E" with "אַיי", "I" for "why", "spel", "BVGE"), stopped at the daily part ("לעצור כאן"), came back, continued, and did the two repeats at the end. I tried the microphone ("לומר בקול", "להשתמש במיקרופון") and the self-rating.
4. Did **lesson 2, `#/lesson/pa1-02`, from start to end** (14 exercises), including "לא יודע/ת" twice, "רמז" once, the word bank, the dictation, the "correct the spelling" item, two speaking items and the writing task.
5. Followed the Today plan: `#/today`, then "להתחיל: חזרה" (`#/review`, 8 words) back to Today. Also tried the minutes control on Today (35 minutes) and the help page (`#/help`) and `#/path`.
6. Found the games through "תרגול", then "משחקי מילים" (`#/games`), and played the **memory game, level 1** (`#/games/memory/1`) to the end.
7. Looked for business and phone English in "אנגלית לחיים" (`#/real-life`): the recommendations, the "בעבודה" filter, `#/scenario/rl-work-video-small-talk` (all four tabs), and "סימולציות שיחה" (`#/conversations`).

The screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/student-58/`. Every file name below is in that folder.

## What worked for me (keep this)

- **Onboarding is short and clear.** Four steps with "1 מתוך 4" and a bar. The choices are big cards (576x74 px) with a sub-line that says what happens ("נתחיל מהאותיות. בלי מבחן."). When I skipped something, the screen told me in words: "בחרו נקודת פתיחה." and "כדי להמשיך צריך לאשר את התנאים." (`06-step3-nochoice.png`, `08-step4-noterms.png`). I could tap anywhere on the long terms label to tick it. "אין רצף שנשבר: יום חופש לא מוחק שום דבר." is the right tone for me.
- **After onboarding I was in lesson 1 at once.** No tour, no menu to work out.
- **130% really works.** Everything grew: buttons became 57-62 px tall, and the bottom navigation and the lesson footer grew too (`15-today-130.png`, `16-lesson-intro-130.png`). Settings says "כל שינוי נשמר מיד".
- **One big orange button in a fixed footer** in lessons, review and scenarios. Every exercise is tap only: no dragging, no swiping, no long press. This is exactly what I need.
- **Calm, adult feedback.** "כמעט! בדקו את הפרטים הקטנים" for my "spel" (`36-e8-fb.png`), "חוזרים על זה שוב, כדי שיישאר" for the repeats, and a summary that says plainly "ענית נכון בניסיון הראשון על 79% מהתרגילים." with no fireworks (`54-l1-summary.png`).
- **Stopping is respected.** The "החלק של היום הושלם" screen makes "לעצור כאן" the main button and says "המקום שלכם נשמר" (`31-after-e7.png`).
- **The speaking screen is the clearest in the app.** Two big labelled buttons, "לשמוע" and "לומר בקול". There is a self-rating ("אמרתי את זה בבירור" / "צריך עוד תרגול") and an honest way out, "לא יכול/ה לדבר כרגע". The microphone notice is readable and honest: "Lucid ... לא מקליט ולא שומר את הקול שלכם" (`41-e11.png`, `42-e11-mic.png`).
- **Sound where I need it in exercises.** The letter tiles in the matching exercise have their own play buttons. Listening has "השמעה" and "לאט" (`21-e1-selectedE.png`, `24-e2.png`).
- **The review card is big and simple**: one English word in large type, "השמעה", four Hebrew answers and "לא זוכר/ת" (`80-review-1.png`). The end says "8 מתוך 8 נכון" and has one button, "חזרה להיום".
- **The memory game suits a tablet.** The cards are 170x170 px, the word is spoken when its card turns over, and a mismatch is explained in words: "לא זוג. תמונה: ציפור" (`89-memory-mismatch.png`, `88-memory-match.png`). The end screen is clear, with "עוד סיבוב", "לרמה 2" and "לכל המשחקים" (`90-memory-end.png`).
- **The scenario preparation tab is useful for calls.** "Hi! Can you hear me OK?", "Sorry, you froze for a second. Could you say that again?", "Sorry, I was on mute.", each with audio and Hebrew (`94-scenario-top.png`). The AI tab is honest: "שיחה חופשית עם AI עוד לא זמינה באתר הזה." and it sends me to "לתרגול המובנה" (`96-scenario-ai.png`).
- **The bottom navigation has words under the icons** ("היום", "המסלול", "תרגול", "אנגלית לחיים", "התקדמות"). The path shows my % per lesson and "הבא" (`101-path.png`).

## What did not work (findings)

### 1. Coming back to a lesson: "continue where I stopped" is hidden and the big buttons restart it (major)
- **Route:** `#/lesson/pa1-01`, reopened after "לעצור כאן" (also from the Today card).
- **What I saw:** The fixed footer shows the orange "בואו נלמד" and "ישר לתרגול". The button I actually need, "להמשיך מאיפה שעצרתי" ("עצרתם באמצע: 8 מתוך 13 · 1 לחזרה"), is in the page body at y=975 on a 1024 px screen, under the footer, so I could not see it without scrolling (`33-resume.png`, `34-resume-full.png`). "ישר לתרגול" took me back to "1 מתוך 13". The same happened when I came back during the repeats ("עצרתם באמצע: חוזרים 1 מתוך 2").
- **Why it matters:** I would tap the big orange button and do the whole lesson again, or give up.
- **Suggestion:** When a lesson is in progress, make the footer's primary button "להמשיך מתרגיל 8 מתוך 13" and move "להתחיל מההתחלה" and "להסבר" into smaller secondary buttons.

### 2. In "sort into groups", the word I tap does not look selected (major)
- **Route:** `#/lesson/pa1-01` exercise 6 (Capital/small), `#/lesson/pa1-02` exercise 5 (short sound / name sound).
- **What I saw:** I tapped "i", then "maya". Nothing changed on screen (`29-e6-selected.png`, `103-cat-selected-maya.png`). The button gets `aria-pressed="true"`, but the background and border are exactly the same as the other chips: the CSS has a selected style for `.option` and `.match-item`, not for `.chip`. The only instruction, "בחרו פריט ואז את הקטגוריה. לחיצה על פריט שהונח מחזירה אותו.", is small grey text *below* the two boxes.
- **Why it matters:** I tap a word, see no change, and think the app is broken. I would not guess that I now have to tap a box.
- **Suggestion:** Give `.chip[aria-pressed='true']` the same cobalt border and tint as the selected options (and lift it a little). Put the instruction above the words at normal size, and light up the boxes while a word is selected ("עכשיו בחרו לאן").

### 3. "לא יודע/ת" wipes the question off the screen (major)
- **Route:** `#/lesson/pa1-02` exercise 1 (listening: ship/sheep/shop) and exercise 6 (multiple choice: "same vowel sound as 'cup'").
- **What I saw:** After "לא יודע/ת" the page shows only the instruction line and an empty space. The question, the four options, "השמעה" and "לאט" all disappear. The red sheet says "לא בדיוק", then "התשובה הנכונה: sheep" (`62-l2-e1-dontknow.png`, `66-l2-e6-dontknow.png`). When I *chose* a wrong answer, the options stayed and a transcript appeared (`25-e2-fb.png`, `27-e4-wrong.png`), so being honest gives me less help than guessing.
- **Why it matters:** "I don't know" is the moment I most need to hear the word again and see it next to the other choices.
- **Suggestion:** Keep the exercise on screen with the right option highlighted, keep the play buttons, and show the transcript. Use a neutral heading such as "הנה התשובה" instead of "לא בדיוק".

### 4. The word bank ignores the gap I tapped (major)
- **Route:** `#/lesson/pa1-02` exercise 9 ("Excuse me, is this ___ free? – Yes, please ___ down.", chips "seat" and "sit").
- **What I saw:** I tapped the second gap, then "sit". "sit" went into the *first* gap (values: `['sit', '']`) (`73-l2-e9-tap2nd-then-sit.png`). The tapped gap gets no highlight. Tapping a filled gap empties it, and that is not explained anywhere.
- **Suggestion:** Tapping a gap should select it (visible highlight), and the next word should go there. Add one line: "לחצו על רווח ואז על מילה".

### 5. The alphabet lesson has no sound for the letters themselves (major)
- **Route:** `#/lesson/pa1-01`, "בואו נלמד".
- **What I saw:** The heart of the lesson is the 26-row table "Letter / Name (IPA) / נשמע כמו", and it has no play buttons. The 17 "השמעה" buttons on the page are for the 8 example sentences and the 9 vocabulary cards only (`20-learn-0-part0.png`, `20-learn-0-part1.png`). The IPA column (/dʒeɪ/, /ˈdʌbljuː/) means nothing to me.
- **Why it matters:** I read slowly and learn by ear. To hear "J" I had to wait for the exercises.
- **Suggestion:** Make every row tappable to hear the letter name (and a "play A to Z slowly" button). At Pre-A1, hide the IPA column or fold it away.

### 6. Real-Life has nothing for a business owner on the phone, and the recommendations ignore my goal (major)
- **Route:** `#/real-life`, the "בעבודה" filter, `#/scenario/rl-work-video-small-talk`, `#/conversations`.
- **What I saw:** I chose "עבודה ושיחות מקצועיות" in onboarding, yet "כדאי להתחיל כאן" ("לפי הרמה והמטרות שלך") offers three travel scenarios: the connecting gate, a hotel check-in and asking for directions (`92-reallife-top.png`). The six work scenarios are all about being an employee: "היום הראשון בעבודה", "שיחת וידאו: סמול טוק לפני הישיבה", "ישיבת בוקר", "לברר מה בדיוק צריך לעשות במשימה", "מייל: בקשה להארכת מועד" and "ישיבה: להביע אי-הסכמה בנימוס". The easiest is A2 and the rest are B1-B2 (`93-reallife-work.png`). None covers calling a supplier: saying who you are, spelling a company name, numbers, prices and dates, "could you say that slowly?", or confirming an order. "סימולציות שיחה" shows the same list again (`98-conversations.png`).
- **Suggestion:** Add an A1-A2 phone track, for example "להתקשר לספק", "לאיית שם ומספר הזמנה בטלפון", "מחירים, כמויות ותאריכי משלוח", "לבקש לחזור לאט" and "לאשר הזמנה". Link it from lessons pa1-01 (spelling) and pa1-04 (numbers, "my phone number"). Rank "כדאי להתחיל כאן" by the goals I chose.

### 7. Booking-code dictation marks every letter wrong when I type without spaces (major)
- **Route:** `#/lesson/pa1-01` exercise 10 ("Your booking code is B, V, J, E").
- **What I saw:** I typed "BVGE" (one letter wrong). Under the box, all four letters "B V J E" were red with wavy underlines (`40-e10-fb.png`). When I typed "B V G E", only "J" was red (`102-e10-spaced-fb.png`). "BVJE" without spaces is one of the accepted answers, so typing without spaces is normal.
- **Why it matters:** I got three of four right and the screen told me I got everything wrong. That hurts trust, especially on the exact skill I need for phone calls (codes and order numbers).
- **Suggestion:** Compare letter by letter for letter codes and show "כתבתם G, נאמר J" for the one that differs.

### 8. Matching: a wrong pair is only a short shake, and after matching I can't see which went with which (minor)
- **Route:** `#/lesson/pa1-01` exercises 1 and 3, `#/lesson/pa1-02` exercise 4.
- **What I saw:** Pairing "E" with "אַיי" gave a 0.3-second shake, with no words. By the time I looked it was gone (`21-e1-wrongpair.png`). Correct pairs all fade to the same pale grey with a thin green border (opacity 0.45). At the end all 12 tiles look alike, so I can't review "A = אֵיי" (`22-e1-allpaired.png`, `23-e1-feedback.png`). After every pair was already confirmed, I still had to tap "בדיקה".
- **Suggestion:** Give each found pair a shared number or colour, or move the answer next to its letter. On a wrong pair, show a line for 2 seconds ("E ו-אַיי הם לא זוג"). Skip "בדיקה" when the board is complete.

### 9. Review grades my answer the moment I touch it (minor)
- **Route:** `#/review`.
- **What I saw:** In lessons I tap an option and then "בדיקה". In review, one tap is final. My finger slip on "רטוב" for "small letter" was marked "לא בדיוק" at once (`80-review-3.png`).
- **Suggestion:** Use the same pattern everywhere (select, then "בדיקה"), or give a 2-second "בטל" after a tap.

### 10. Onboarding doesn't offer text size, and its small parts are hard to see (minor)
- **Route:** `#/start`.
- **What I saw:** The onboarding runs at 100%. The helper lines ("ממליצים על עברית בהתחלה...", "שומרים רק את השנה, לא תאריך מלא.") are 13 px grey. The two consent checkboxes on step 4 are native 13x13 px boxes, so it is hard to see whether they are ticked (`02-start-top.png`, `07-step4.png`). I found text size only later, behind the gear icon. The birth year list starts at 2016, so I scrolled past 48 years to reach 1968.
- **Suggestion:** Put "גודל טקסט" (with a live preview) on step 1. Use 24-28 px custom checkboxes with a clear tick. Start the year list at the youngest allowed year, or let me type the year.

### 11. Icons without words, and a control with no visible label (minor)
- **Route:** `#/today`, `#/lesson/*`, `#/games/memory/1`.
- **What I saw:** Settings is only a gear and help only an "i" (their names exist only for screen readers: "הגדרות", "עזרה"). The lesson exit is only an X ("יציאה מהשיעור"). The memory game score is a bare blue pill showing "0" (`86-memory-start.png`). On Today the row "10 דק׳ / 20 דק׳ / 35 דק׳ / 50 דק׳" has no visible label (its name, "אורך האימון היום", is for screen readers only). When I tapped "35 דק׳" by accident, the plan changed at once to "כ-28 דקות" with three items (`15-today-130.png`, `99-today-35.png`). The scenario cards have an empty circle on the right that looks like a radio button (`92-reallife-top.png`).
- **Suggestion:** Write "הגדרות" and "עזרה" under the icons, "יציאה" next to the X and "ניקוד" before the score. Put a visible heading "כמה זמן יש לך היום?" above the minutes row. Replace the circles with a word ("עוד לא" / "בוצע").

### 12. The writing check misses the point of lesson 1 (minor)
- **Route:** `#/lesson/pa1-01` exercise 13.
- **What I saw:** I wrote "my name is yosef cohen. Y-O-S-E-F, C-O-H-E-N. i live in holon." The checks flagged "i" and showed a thin grey triangle by "כל משפט מתחיל באות גדולה" without saying which sentence. They did not flag "yosef", "cohen" or "holon", although capitals for names and places are one of this lesson's three goals. The warning triangle and the ticks are the same thin grey, so it is easy to miss (`50-e13-fb-bottom.png`). The issue line reads "I גדולה “. i”", so the quote marks a dot and a space as well as the "i".
- **Suggestion:** Point to the exact words ("yosef → Yosef"), colour warnings amber, and check names after "my name is" and "I live in".

### 13. English with no Hebrew in places a Pre-A1 learner meets early (minor)
- **Route:** `#/lesson/pa1-01` (learn page), `#/today`, `#/scenario/rl-work-video-small-talk` (practice tab).
- **What I saw:** The notes under the examples are English only ("ask this when you don't know how to write a name", "double = two of the same letter"). So are the vocabulary example sentences ("The English alphabet has 26 letters.") and the part of speech ("noun", "verb", "adjective") (`20-learn-0-part2.png`, `20-learn-0-part3.png`). The Today card shows the objective only in English: "I can say and recognise the 26 letters and spell my name." (`15-today-130.png`). The speaking screens don't translate the sentence I am asked to say. The scenario practice answers are English only (`95-scenario-practice.png`). The Hebrew support setting is "לפי הרמה", which Settings describes as "מלא עד A1".
- **Suggestion:** At Pre-A1 and A1, show Hebrew under every English line, as the lesson objectives already do.

### 14. "A short explanation" is about seven screens long (minor)
- **Route:** `#/lesson/pa1-01` and `#/lesson/pa1-02`, "בואו נלמד".
- **What I saw:** At 130% the learn page is 6,938 px (lesson 1) and 7,870 px (lesson 2) tall, one long scroll. The footer says "הסבר קצר, ועכשיו מתרגלים" (`20-learn-0.png`, `61-l2-learn.png`).
- **Suggestion:** Split it into short steps with "הבא" (letters, sounds alike, capitals, examples, words), each followed by a mini check. Change the label to say how long it really is.

### 15. The games page is a wall of rules and rewards speed (minor)
- **Route:** `#/games`.
- **What I saw:** The page is 4,306 px tall. Before any game there are scoring rules: "כל זוג נכון שווה 10 נקודות, כל טעות מורידה 3, ויש בונוס על לוח שנגמר מהר", the definition of "פספוס", and "בונוס מהירות לכל תשובה נכונה: 3s +5, 6s +3, 10s +1; בהקלדה: 8s +5, 15s +3, 25s +1". All seven levels (Pre-A1 to C2) are listed with three stages each (`85-games-top.png`). A speed bonus works against someone who reads Latin letters slowly, and PRODUCT.md promises no time pressure.
- **Suggestion:** One line per game and a big "לשחק" button. Move the rules behind "איך מנקדים?". Show only my level's quiz by default. Make the speed bonus optional, or off for Pre-A1 and A1.

### 16. Lesson 2's "part for today" was one exercise long (minor)
- **Route:** `#/lesson/pa1-02`, `#/today`.
- **What I saw:** The intro said "התוכנית היומית שלך לוקחת היום חלק ממנו: עד תרגיל 1 מתוך 14, כ-5 דקות". After one exercise came "החלק של היום הושלם" (log of run s21). Earlier, Today had said "סיימתם את התוכנית להיום" (`32-today-after-part.png`). After I kept going, it showed a new plan with "השלמת שיעור היום" and "עד תרגיל 7 מתוך 14" of lesson 3 (`76-today-after-2-lessons.png`, `83-today-after-review.png`). When I reopened lesson 1 later the same day, its intro said "עד תרגיל 11 מתוך 13", although I had already finished all 13.
- **Suggestion:** Don't cut a lesson after a single exercise; offer "השיעור הבא מחר" or the whole lesson instead. Once the day's plan is done, keep saying so and offer "עוד אם יש זמן" as an extra, not a new plan.

### 17. Keyboard hints on a touch tablet (polish)
- **Route:** every lesson and review screen.
- **What I saw:** Every primary button carries an "Enter" key cap, and multiple-choice options have "1 2 3 4" badges (`24-e2.png`, `23-e1-feedback.png`). On a tablet I have no Enter key, and the numbers look like part of the answer.
- **Suggestion:** Hide keyboard hints on touch devices (`@media (hover: none) and (pointer: coarse)`).

### 18. Small words on big memory cards, and no word list at the end (polish)
- **Route:** `#/games/memory/1`.
- **What I saw:** The English word is set at the small text size ("key" is about 20 px on a 170 px card), with lots of empty space around it (`88-memory-match.png`). A mismatched pair turns back after 1.3 seconds. With no misses, the end screen lists no words, only the score (`90-memory-end.png`).
- **Suggestion:** Make the word about twice as big. Keep a mismatched pair up until my next tap. End with the six pairs (picture, word, play button).

### 19. Mixed-direction text breaks in a few lines (polish)
- **Route:** `#/lesson/pa1-01` summary, exercise 4 "למה?", and exercise 13.
- **What I saw:** In "מה לזכור" the line renders as "double (A, double N, = ... .A)" (`54-l1-summary.png`). In the "למה?" text for 'why', "U =" lands at the end of the line before "you" (`27-e4-why.png`). Exercise 13 shows "“. i”" (`50-e13-fb-bottom.png`).
- **Suggestion:** Wrap the English runs in `<bdi>` or isolate them, as is already done elsewhere.

## My top 3 wishes

1. **A phone track for my job, at my level.** Short A1-A2 calls with a supplier: greeting and saying who I am, spelling my company name and an order number, numbers, prices and dates, "Could you say that again slowly, please?" and confirming an order. Recommend it first when my goal is "עבודה".
2. **Always one obvious next tap, and never lose my place.** "Continue from exercise 8" as the main button when I come back. Visible selection on every tappable chip. The tapped gap is the one that gets filled. "לא יודע/ת" keeps the question and the sound on screen.
3. **Hear everything, read it in Hebrew, in short pieces.** A play button on every letter of the alphabet table. Hebrew under every English line at Pre-A1 and A1. The long explanation split into short steps, and the text size choice offered in onboarding.
