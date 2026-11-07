Simulated review (AI persona), not real user research.

# Student panel, round 3: Shira, 19, soldier, A2, phone, dark mode

## Who I am

Shira, 19, a soldier. I study on my phone (390x844, dark mode, Hebrew UI) in the evening on base: tired, in 5-10 minute breaks, sometimes without a connection. I am around A2 and I want English for a big trip after the army, so I care most about airports, hotels and restaurants.

## What I did

All screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/student-19/` (named below by file).

1. `#/` welcome, then `#/start` onboarding: name, year 2007, goal "טיולים ונסיעות לחו״ל", "קצר וקל 10 דק׳", start "אני מכיר/ה קצת", terms (01-07).
2. Placement test: answered 5, left with X, saw the resume card on Today, came back and finished (20 questions in all, placed at A2) (08-11).
3. Today at 10 minutes and at 20 minutes (12b, 13).
4. Lesson `a2-01` from Today: intro, learn page, exercises 1-2 (one wrong on purpose). I left with X mid-lesson, closed the browser, reopened it and continued. I finished today's part and saw Today afterwards (14-27).
5. I reopened the same lesson from the Path, through the in-lesson help icon and Back, with browser back and forward, and from a direct link (65-68).
6. Real-Life English: the hub, airport check-in (all four tabs), hotel towels/late checkout with an interruption half-way, restaurant dietary. Then the hub again (28-45).
7. Expressions: browsed, opened a card, searched "thank" (46-48).
8. Games: the hub, the A2 word quiz (interrupted, then a full round, then "add missed words to review"), the memory game, and `#/review` (49-58, 69-70).
9. Offline: a fresh profile with the service worker on. I loaded the app, then went offline and opened Today, the lesson in progress, an unsaved lesson, a scenario, the games, expressions and review (59-64).
10. Checked `#/account`, `#/settings` and `#/conversations` for how they describe the AI features, and measured touch targets.

## What worked for me (keep this)

- **Today's resume card.** After I tapped X mid-lesson, Today led with "להמשיך: What are you doing? · 3 מתוך 16". When I closed the browser and reopened it, the same button (`#/lesson/a2-01?resume=1`) put me straight on exercise 3, with no intro to sit through (20, 21, 22).
- **Honest lesson splitting.** The card says "השיעור כולו כ-25 דקות, אז היום עושים חלק: עד תרגיל 4 מתוך 16. המקום נשמר בכל יציאה." After exercise 4 a screen says "החלק של היום הושלם", with "לעצור כאן" as the main button. That is exactly right for a short break, and it doesn't nag me (26).
- **The placement test respects my time.** It is resumable ("ענית על 5 שאלות, והן נשמרו"), it offers "לא יודע/ת", and the results are honest for each skill ("A2 (2 שאלות ברמה הזו)", "לא נבדק במבחן הזה"). It also offers B1 or a short level check instead of a verdict (09, 10, 11).
- **Offline really works.** With no connection I could open Today, my lesson in progress, scenarios, the word quiz, the memory game, expressions and review. A lesson I had not saved showed a calm, honest screen: "לא הצלחנו לטעון את השיעור. ייתכן שאין חיבור לאינטרנט", a list of the lessons saved on the device, and a link to "הגדרות ← שימוש בלי אינטרנט" (59-64, 61).
- **Scenario practice feedback teaches.** Every reply is explained in English and Hebrew, including the ones I didn't pick ("עובד, אבל יש טבעי יותר", "Sounds rude and impatient..."). The own-words check is honest: "הבדיקה הזו מחפשת רק מילות מפתח. היא לא בודקת דקדוק" (32b, 33).
- **The missing AI is stated plainly.** The scenario says "שיחה חופשית עם AI עוד לא זמינה באתר הזה. בינתיים, התרגול המובנה עובד במלואו", and the end of practice offers "לתרחיש הבא: ..." instead of a dead AI button (34, 35).
- **The Real-Life hub fits me.** It has level-fit labels ("ברמה שלך", "אתגר קטן", "מתחת לרמה שלך"), a green check on scenarios I finished, and "כדאי להתחיל כאן" drops what I already did (28b, 44).
- **The word quiz gives instant, kind feedback.** Each answer shows a real example sentence ("She took a taxi to the airport."). The end screen offers "להוסיף 8 מילים לחזרה המרווחת", and those words then appeared on Today as a review item (52, 55, 70).
- **The tone is calm.** "יום חופש לא מוחק כלום" and "אין רצף שנשבר". There is no mascot and no guilt. Dark mode is easy on tired eyes at night.

## What did not work

### F1. With 10 minutes a day, my travel goal disappears from Today (major)
- **Route:** `#/start` step 2, then `#/today`.
- **What I did:** I picked "טיולים ונסיעות לחו״ל" (its subtitle promises "מצבים מנסיעה: שדה תעופה, מלון, מקרי חירום") and "קצר וקל 10 דק׳". My Today plan was only a grammar lesson part ("What are you doing?", exercises 1-4). When I switched Today to "20 דק׳", a travel item appeared: "מהחיים: Check-in: an overweight bag · בחרת טיולים: מצב אחד מנסיעה, ברמה שלך. 4 דק׳". The rule is only in the small grey line above the time question on step 2 ("מרמה A1 ומ-20 דקות ביום, התוכנית היומית כוללת תרגול אחד לפי המטרות"). I didn't connect it to my choice.
- **Evidence:** 04-ob-step2-filled.png, 12b-today-fold.png, 13-today-20min.png.
- **Why it matters:** the short plan is exactly what tired, busy learners choose, and it drops the reason they came.
- **Suggestion:** at 10 minutes, alternate the days (a lesson part one day, a 4-minute travel scenario the next), or put the scenario in place of 1-2 exercises. At the least, put a line on Today with a link: "בתוכנית של 10 דקות אין מצב מנסיעה. יש 4 דקות? Check-in: an overweight bag". Also show the rule next to the time choice, not above it.

### F2. Reopening a lesson any other way than Today's button hides "continue" below the fold, and the main button starts over (major)
- **Route:** `#/lesson/a2-01` opened from `#/path/A2` (the link has no `?resume=1`), after the in-player help icon (`#/help`) and Back, after browser back then forward, and from a restored tab.
- **What I saw:** each time, the intro screen came back. Its orange primary button is "בואו נלמד Enter", with "ישר לתרגול" beside it. The banner "עצרתם באמצע: 2 מתוך 16 / להמשיך מאיפה שעצרתי" is at y≈1011 px, below the 844 px screen and behind the sticky footer. I tapped the obvious button, then "לתרגול", and the counter showed "1 מתוך 16".
- **Evidence:** 66-back-from-help.png, 67-direct-lesson-url-reopen.png, 68-path-A2.png (the Path card shows the half-filled "in progress" ring, but the link has no resume).
- **Why it matters:** on base I get interrupted all the time. The app saved my place, but the screen steers me away from it.
- **Suggestion:** when a saved place exists, make "להמשיך מאיפה שעצרתי (2 מתוך 16)" the primary footer button and put the banner first. Give the Path link `?resume=1` too. Open help as a sheet over the exercise, not as navigation away from it.

### F3. Scenario practice forgets my place (minor)
- **Route:** `#/scenario/rl-hotel-towels-late-checkout?tab=practise`.
- **What I did:** I answered 2 of 5 turns ("3 מתוך 5"), tapped "היום" in the bottom nav, then Back. It showed "1 מתוך 5" again, and a reload also gave "1 מתוך 5". Today doesn't mention the unfinished scenario. Lessons promise "המקום נשמר בכל יציאה", so the difference surprised me.
- **Evidence:** 36-hotel-turn3.png, 38-hotel-after-back.png.
- **Suggestion:** save the turn index and the answers given, the same way lessons do, and show "להמשיך: Extra towels... · 3 מתוך 5" on Today.

### F4. In scenario practice, "המשך" is two screens below the answer (minor)
- **Route:** `#/scenario/rl-airport-checkin-overweight?tab=practise`.
- **What I saw:** after I chose a reply, the page scrolled to the feedback. The "המשך" button sits under the full explanation of all three options and the "עכשיו בניסוח שלכם" box, behind the bottom nav. The page grew to about 1860 CSS px. I had to scroll down on every one of the 5 turns.
- **Evidence:** 32b-feedback-fold.png, 33-crop.png.
- **Suggestion:** use the lesson player's sticky footer here, with "המשך" always in reach. Collapse the other two options' feedback under "למה לא האחרות?" and make the own-words box optional and collapsed.

### F5. The "learn" step is too long for a 10-minute slot (minor)
- **Route:** `#/lesson/a2-01`, "בואו נלמד".
- **What I saw:** the page is 6087 CSS px, about 7 phone screens: the explanation, two tables that scroll sideways ("הטבלה רחבה מהמסך: גללו אותה הצידה"), 8 examples, 3 pitfalls and 10 vocabulary cards. The footer says "הסבר קצר, ועכשיו מתרגלים." The Hebrew is hidden behind "בעברית" buttons at A2. Today budgets this page plus 4 exercises as "כ-10 דקות".
- **Evidence:** 15-lesson-learn.png, 15-crop0.png, 15-crop1.png.
- **Suggestion:** when the plan splits a lesson, show only what today's exercises need, and fold the vocabulary cards and pitfalls under "עוד". Or give an honest reading time ("כ-4 דקות קריאה"). Drop the word "קצר" while the page is this long.

### F6. When Today's plan is done, there is no next step (minor)
- **Route:** `#/today` after "לעצור כאן".
- **What I saw:** a banner, "סיימתם את התוכנית להיום. אפשר להמשיך בחופשיות במעבדות.", with no link in it (I checked the DOM). "מעבדות" is jargon to me. Nothing points me to a travel scenario, even though travel is my only goal.
- **Evidence:** 27-today-after-part.png, 72-today-all-done.png.
- **Suggestion:** add "יש עוד 5 דקות?" and one goal-matched link, for example the next A2 airport scenario.

### F7. I can't keep travel phrases for the trip (minor)
- **Routes:** `#/scenario/...` ("משפטים שימושיים") and `#/expressions`.
- **What I saw:** expression cards only expand and play (my button inventory found only `data-toggle` and play controls). Scenario phrases have no save action either. The only "add to review" I found is at the end of the word game ("להוסיף 8 מילים לחזרה המרווחת").
- **Evidence:** 46b-expressions-fold.png, 47-expression-open.png, 29b-airport-fold.png.
- **Suggestion:** add "לשמור לחזרה" on each phrase and expression, and a "השיחון שלי לטיול" page that works offline.

### F8. Expressions: the filters fill the first screen, and the play buttons are very narrow (minor)
- **Route:** `#/expressions`.
- **What I saw:** a search box and four segmented filter rows (formality, region, "כל הרמות / לרמה שלי", "לפי רמה / אלפביתי") take the whole first screen. The first expression starts at about 590 CSS px. The play buttons measure 20x44 px, under the 24 px WCAG 2.2 minimum width and far from the "large touch targets" commitment. In scenario practice, the play button in the partner's bubble and on each dialogue line is 29x29 px.
- **Evidence:** 46b-expressions-fold.png; measured with getBoundingClientRect.
- **Suggestion:** put the filters behind one "סינון" button, or collapse them to a single row. Make every play button at least 44x44.

### F9. Lesson and placement buttons show "Enter" on a phone (polish)
- **Routes:** the `#/lesson/...` player and `#/placement`.
- **What I saw:** keyboard chips on a touch phone: "בדיקה Enter", "המשך Enter", "בואו נלמד Enter", "לעצור כאן Enter", and "הבא Enter" in the placement test. They take room and mean nothing on a touch screen.
- **Evidence:** 16-ex1-match.png, 18-ex2-wrong.png, 26-part-end.png, 08-placement-q1.png.
- **Suggestion:** hide `.kbd` under `@media (pointer: coarse)`.

### F10. Onboarding asks for AI consent that can't be used on this site (polish)
- **Route:** `#/start` step 4.
- **What I saw:** a 6-line checkbox, "לאפשר משוב AI (כתיבה, שיחות, מורה; צריך חשבון)...". Elsewhere the same site says "השרת הזה לא מוגדר לחשבונות" (`#/account`) and "משוב AI עוד לא זמין באתר הזה" (`#/settings`). I read a long consent for something I can't use.
- **Evidence:** 06-ob-step4.png.
- **Suggestion:** in device-only mode, hide the checkbox or replace it with one line: "משוב AI לא זמין באתר הזה".

### F11. Review copy calls words I added a minute ago "about to be forgotten" (polish)
- **Route:** `#/today` after "להוסיף 6 מילים לחזרה המרווחת" in the word game.
- **What I saw:** "חזרה מרווחת · 6 מילים. המילים האלה בדיוק לפני שכחה. חזרה עכשיו מאריכה את הזיכרון." I had added them a minute earlier.
- **Suggestion:** use separate copy for new cards ("6 מילים חדשות מהמשחק: סיבוב ראשון"). The brand is honesty.

### F12. Game speed bonus and locked travel levels (minor)
- **Route:** `#/games`.
- **What I saw:** a speed bonus, "בונוס מהירות לכל תשובה נכונה: 3s +5, 6s +3, 10s +1". When I'm tired at night, a clock counting against me is the wrong feeling, and it goes against the "no time pressure" commitment. Also, as an A2 learner, "רמה 2: בית, עיר ונסיעות" in both picture games is locked until I score 70% on the Pre-A1–A1 level.
- **Evidence:** 50-crop0.png, 50-games-hub.png.
- **Suggestion:** make the speed bonus opt-in, or show it only after the round. Unlock game levels up to the placement level.

### F13. Hebrew feedback that quotes English breaks across lines in the wrong order (polish)
- **Route:** scenario practice, airport, turn 1.
- **What I saw:** "נשמע גס וחסר סבלנות. אם אתם לחוצים בזמן, אפשר לומר: Sorry, I'm in a bit of a hurry." renders as "Sorry, I'm :...אפשר לומר" on one line and ".in a bit of a hurry" on the next, with the period on the wrong side.
- **Evidence:** 32b-feedback-fold.png.
- **Suggestion:** wrap the quoted English in `<bdi lang="en" dir="ltr">` (or `isolateLatin`) in option feedback, as other screens already do.

### F14. The expressions play buttons would read the labels aloud (polish)
- **Route:** `#/expressions`.
- **What I saw:** the speech text for the play buttons includes the card labels: `data-say-text="Brilliant (UK)"`, `"Can I get...? (ordering)"`, `"EOD / EOW (end of day / week)"`. Speech does not run in headless Chromium, so this is from the markup: speech synthesis would say "ordering" and "U K" aloud.
- **Suggestion:** speak only the expression itself, or its example sentence.

## My top 3 wishes

1. A 10-minute plan that still includes my trip: a lesson part one day and a 4-minute airport, hotel or restaurant scenario the next, or a 2-minute phrase drill inside the plan.
2. "Continue where I stopped" that works everywhere (Path, Back, help, closed tab, scenarios, games), always as the big orange button.
3. A trip phrasebook: save phrases from scenarios and expressions to review, have it work offline, and offer a "before the flight" quick drill.
