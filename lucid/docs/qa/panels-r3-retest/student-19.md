Simulated review (AI persona), not real user research.

# Student panel, round 3 re-test: Shira, 19, soldier, A2, phone, dark mode

## Who I am

Shira, 19, a soldier. I study on my phone (390x844, touch, dark mode, Hebrew UI, text at 100%) in the evening on base: tired, in 5-10 minute breaks, sometimes offline. I'm around A2 and I want English for a big trip after the army.

## What I did

Screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/student-19/` (named below by file). I used a persistent browser profile, so closing and reopening the browser kept my data.

1. `#/start` onboarding: year 2007, goal "טיולים ונסיעות לחו״ל", "קצר וקל 10 דק׳", start "אני מסתדר/ת בשיחות פשוטות", terms (01-04). On Today I chose "להתחיל ב-A2 (ההערכה שלכם)" instead of the test, because I took the test last time (05b, 07).
2. Lesson `a2-01` from Today: the intro, all 5 learn steps, exercise 1 (right), exercise 2 (wrong on purpose). Then I left and came back by six routes: Today's button, `#/path/A2`, a direct URL, the help icon then Back, browser back then forward, and X. I also opened "להתחיל מההתחלה" and cancelled it. Then exercises 3-4, the part-end screen, "לעצור כאן" and Today (10-31).
3. Real-Life: the hub, airport check-in from Today's line. I answered 2 turns, left through the "היום" tab, came back and reloaded, then resumed and finished. Then the hotel towels/late checkout and restaurant dietary scenarios, all 4 tabs of the hotel scenario, and the "other answers" and own-words sections (32-44).
4. `#/expressions`: filters, play keys and spoken text (45).
5. Games: the hub, the A2 word quiz (leaving and returning in the middle, then a full round, then "להוסיף 8 מילים לחזרה המרווחת"), `#/games/pictures/2` and `#/games/memory/2` (46-60).
6. `#/review` with the 8 new words, then Today and `#/practice` (53-57, 62).
7. Offline: a fresh profile with the service worker on, onboarded through the UI. I went offline and opened Today, my lesson, an unsaved lesson, a scenario, the hub, expressions, the games and review (61-off-*).
8. A learn step left half-way (`a2-02`, step 3 of 4), then reopened (63).

Test note: a Playwright full-page screenshot turns off touch emulation, so the "Enter" chip shows up in my full-page captures (for example 11-learn-2-full.png). I checked the chips with `getComputedStyle` in normal viewport captures instead. The chips are hidden on touch.

**The 5-minute test:** from a cold start, Today shows "יש עוד 4 דקות? Check-in: an overweight bag" above the fold. One tap opens the scenario, and the five turns of practice took me about 4 minutes. That's exactly the break-sized thing I wanted.

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| F1 | With 10 minutes a day, my travel goal disappears from Today | **fixed** | Onboarding step 2 now says, right under the minutes: "ב-10 דקות: שיעור וחזרה. המטרות מופיעות כהצעה, ומ-20 דקות בתוך התוכנית." (02-ob-step2.png). Today at 10 minutes shows the dashed line "יש עוד 4 דקות? Check-in: an overweight bag · 4 דק׳ · בחרתם טיולים" above the fold (07-today.png). |
| F2 | Reopening a lesson hides "continue" and the main button restarts it | **fixed** | Direct URL, Back from help and browser forward all show the banner first, "עצרתם בתרגיל 3 מתוך 16. התשובות שכבר נתתם שמורות.", and the orange footer key is "להמשיך מתרגיל 3 מתוך 16" (22-lesson-direct.png, 24, 25). The Path link is `#/lesson/a2-01?resume=1` and opens exercise 3 directly (20-path-A2.png). "להתחיל מההתחלה" asks first, and says the first-try answers still count (26-restart-confirm.png). X from a lesson opened on the Path returns to `#/path/A2`. |
| F3 | Scenario practice forgets my place | **partly** | It is saved now. After 2 turns, the "היום" tab and Back, and also a reload, "תרגול" offers "עצרתם אחרי 2 תורות מתוך 5. / להמשיך מתור 3 מתוך 5 / להתחיל מחדש" (38-scenario-resume-offer.png). But Today and the hub still don't show it, and the scenario opens on "הכנה" with no hint (see N2). The plan deferred the Today card. |
| F4 | In scenario practice, "המשך" is two screens below the answer | **fixed** | A sticky footer above the tab bar holds "בדיקה" and then "המשך". It was at y=720-768 with the tab bar at 780 on all 5 turns (35, 36-turn1-feedback.png). The other answers are folded under "מה עם התשובות האחרות?" and own words under "לנסות בניסוח שלכם". |
| F5 | The "learn" step is too long for a 10-minute slot | **fixed** | Learn is now 5 steps ("1 מתוך 5 · כ-6 דק׳ קריאה"), each 1,739-1,878 px. Step 2 has the "מלכודת לדוברי עברית" box with play keys, and the vocabulary sits in steps 4-5. The words "הסבר קצר" are gone (11-learn-1.png, 11-learn-2-full.png). The intro note is one line: "היום: עד תרגיל 4 · כ-10 דק׳". |
| F6 | When Today's plan is done, there is no next step | **fixed** | "התוכנית להיום הושלמה" with a link "בלשונית תרגול" (#/practice). Under "רוצים עוד?" are plain rows: continue the lesson (17 דק׳), "מהחיים: Check-in: an overweight bag · 4 דק׳", and "משחק מילים · A2 · 2 דק׳". There is no orange key pushing more (31-today-done-full.png). |
| F7 | I can't keep travel phrases for the trip | **not-fixed** (deferred on purpose) | There are still no save buttons on scenario phrases or expressions (0 found on `#/expressions`; 41-hotel-prep-full.png). The plan lists "Trip phrasebook" as deferred. |
| F8 | Expressions: filters fill the first screen; play buttons are 20 px wide | **fixed** | One "סינון" button sits next to search, and the first card's top is at 285 px (45-expressions.png). Every play key measures 44x44. Scenario phrase and dialogue play keys are also 44x44. |
| F9 | Lesson and placement buttons show "Enter" on a phone | **fixed** | Under touch emulation, `.kbd` computes to `display:none` on the lesson intro, learn steps, exercises and the placement question (10-lesson-intro.png, 30-part-end.png, 64-placement-q.png). |
| F10 | Onboarding asks for AI consent that can't be used here | **fixed** | Step 4 has no AI checkbox, only "ⓘ AI לא פעיל באתר הזה. כל השאר עובד. אם יתווסף, נשאל קודם." (04-ob-step4.png, 04-crop-ai.png). |
| F11 | Review copy calls just-added words "about to be forgotten" | **partly** | Today is fixed: "8 מילים חדשות: סבב ראשון · פעם ראשונה בחזרה המרווחת" (52-today-after-game.png). But `#/practice` → "מומלץ עכשיו" still says "חזרה מרווחת · 7 מילים / מילים שבדיוק לפני שכחה." for words I first saw minutes earlier (62-practice.png). |
| F12 | Game speed bonus; travel game levels locked for A2 | **fixed** | Hub: "אתגר מהירות" is off, with "כבוי: אין שעון, והמשחק מחכה לכם". After an answer, the verdict stayed for 4+ seconds until I pressed "המשך" (48b-quiz-after4s.png). Results show "4 מתוך 10 נכונות (40%) · הניקוד: 4 × 10 = 40" with no bonus. A2 is first, tagged "הרמה שלך". "רמה 2: בית, עיר ונסיעות" is open in both picture games (46-games-full.png, 58-pictures2.png). A memory mismatch stays face up (60-memory-after3s.png). |
| F13 | Hebrew feedback that quotes English breaks in the wrong order | **partly** | The English now stays whole on its own line. But the full stop still shows on the left of the quote: ".Sorry, I'm in a bit of a hurry" (36-crop.png). To a learner it looks like the English sentence starts with a dot. |
| F14 | Expression play buttons would read labels aloud | **fixed** | `data-say-text` is "Brilliant", "Can I get...?", "Chill", with no brackets anywhere on the page. One leftover: "Gonna / wanna" would be read with the slash. |

## New findings

### N1. Leaving the word quiz mid-round throws the round away (minor)
- **Route:** `#/games/A2/1`.
- **What I did:** I answered 2 questions (score 10, now on "שאלה 3 מתוך 10"), tapped "היום" in the tab bar, then Back.
- **What I saw:** "שאלה 1 מתוך 10", score 0, and a new set of words (49-quiz-after-interrupt.png). Lessons and now scenarios keep my place, so this surprised me. On base, a 2-minute game is exactly what gets interrupted.
- **Suggestion:** keep the current round for the session (the same `resume` idea as lessons). On return, offer "להמשיך משאלה 3 מתוך 10" or "סיבוב חדש".

### N2. A saved scenario is only visible inside the "תרגול" tab (minor)
- **Routes:** `#/today`, `#/real-life`, `#/scenario/rl-airport-checkin-overweight`.
- **What I saw:** with 2 of 5 turns saved, Today still said "מהחיים: Check-in: an overweight bag · 4 דק׳" (37a-today-mid-scenario.png). The hub shows the same card with no "in progress" mark. Tapping it opens on "הכנה" with nothing about my place. I only found "להמשיך מתור 3 מתוך 5" because I knew to tap "תרגול" (38).
- **Suggestion:** if Today's card can't change this round (the plan deferred it), at least open the scenario on "תרגול" when a place is saved. Or put a one-line banner above the tabs, "עצרתם בתור 3 מתוך 5 · להמשיך", and give the hub card a half-filled ring like the Path's.

### N3. The learn step I was on is not remembered (minor)
- **Route:** `#/lesson/a2-02`.
- **What I did:** "בואו נלמד", read to "שלב 3 מתוך 4", tapped X, then opened the lesson again.
- **What I saw:** the intro again, with "בואו נלמד" and "ישר לתרגול", and no "להמשיך מהשלב 3" (63-reopen-mid-learn.png). With 6 minutes of reading and 5-minute breaks, this happens to me often. The plan's LF-2 says to save the current step in resume.
- **Suggestion:** when the learner left during learn, make the intro's primary key "להמשיך לקרוא · שלב 3 מתוך 4".

### N4. Hebrew explanations in scenario feedback are 11.4 px (minor)
- **Route:** scenario practice, for example `#/scenario/rl-hotel-towels-late-checkout`, feedback and "מה עם התשובות האחרות?".
- **What I saw:** the English explanation is 13-15 px, but its Hebrew line ("נשמע כמו פקודה, ו-towel צריך להיות ברבים") is 11.44 px, in blue on dark grey (44-hotel-feedback-expanded-full.png, measured with getComputedStyle). At A2 the Hebrew is what I actually read, and at night it is the hardest line on the screen.
- **Suggestion:** set `.bi-he` in feedback to at least 14 px (0.875rem) at 100% text size, and never smaller than the English it translates.

### N5. Today's "done" minutes don't match the plan (polish)
- **Routes:** `#/lesson/a2-01` part end, then `#/today`.
- **What I saw:** the plan said "כ-10 דקות", and the part-end said "עד תרגיל 4, כ-10 דקות". Today then said "התוכנית להיום הושלמה (כ-5 דק׳)" (30-part-end.png, 31-today-done-full.png). Later the same headline grew to "כ-28" and "כ-30 דק׳", because it counts games and scenarios too. Also the lesson card went from "10 דק׳" to "9 דק׳".
- **Suggestion:** either say what was done ("השיעור, החלק של היום") without a number, or count the learn reading time too, so the number agrees with what the plan promised.

### N6. After the day's travel scenario, "רוצים עוד?" stops offering travel (polish)
- **Route:** `#/today` after finishing check-in, hotel and restaurant.
- **What I saw:** "רוצים עוד?" lists the review, the lesson and the word game, but nothing for travel (57-today-after-review.png), even though the hub still recommends "Passport control and customs on arrival" (A2, "ברמה שלך"). And the scenario's own end screen does offer "לתרחיש הבא".
- **Suggestion:** in the extras, show the hub's next "כדאי להתחיל כאן" item once the first is done.

### N7. Practice and games still use some older pressure and copy (polish)
- **Routes:** `#/games`, `#/practice`.
- **What I saw:** the picture game's rule line still says "כל זוג נכון = 10 נקודות, וטעות מורידה 3" while calm mode is on, but the memory game no longer takes points for a slip (46-games-full.png). The practice hub uses the old review line (see F11). The speed switch is a native 13x13 checkbox. The whole row is tappable, but the box itself is hard to see in dark mode.
- **Suggestion:** use one rule for both picture games in calm mode (no minus points), reuse Today's review copy on `#/practice`, and use the app's 24 px check style for the switch.

### N8. The word quiz checks on tap, everything else checks with "בדיקה" (polish)
- **Route:** `#/games/A2/1`.
- **What I saw:** "הבחירה נבדקת מיד." Lessons, scenarios and review now select first and check with "בדיקה". In the quiz, a tired fat-finger tap counts as wrong at once (48-quiz-answered.png). The line does say so, which is honest.
- **Suggestion:** keep instant checking as the game's character, but let a second tap on the same option confirm it, or offer the select-then-check style when calm mode is on.

### N9. "Level 2: home, city and travel" opened on a food board (polish)
- **Route:** `#/games/pictures/2`.
- **What I saw:** board 1 of 3 was broccoli, fried egg, popcorn, croissant and coins (58-pictures2.png). There's no travel in the first board of a level named for travel.
- **Suggestion:** mix the boards so each one has at least one item from the level's theme, or rename the level.

## What I liked (keep this)

- **Coming back now always means continuing.** Every route I tried (Path, direct link, help then Back, browser forward, a closed browser) landed on "להמשיך מתרגיל 3 מתוך 16" as the big orange key, with the banner first. "להתחיל מההתחלה" asks first and keeps my first tries. This was my biggest worry, and it's solved.
- **Today can say "done".** "התוכנית להיום הושלמה" plus a calm "רוצים עוד?" with "לא חובה. כל אחד מאלה עומד בפני עצמו." There's no orange key pushing me on. This is the right tone for a tired evening.
- **The trip is back in my 10 minutes,** as one optional line, "יש עוד 4 דקות?", one tap from Today. It's the fastest useful thing in the app for a 5-minute break.
- **Scenario practice feels like a lesson now.** I select, then check. The sticky "המשך" is always reachable, the other answers are folded, and the place is saved after each turn.
- **The learn page in steps,** with an honest "כ-6 דק׳ קריאה" and the "מלכודת לדוברי עברית" box with play keys next to the rule.
- **Calm games.** No clock by default, the verdict waits for me, a memory mismatch stays up, my level comes first on the hub, and the travel levels are open.
- **Honest copy for new words** on Today ("8 מילים חדשות: סבב ראשון"). The review end screen says when each word comes back ("תחזור בעוד דקה").
- **Offline still works:** Today, my lesson in progress, scenarios, the hub, expressions, games and review all opened offline. An unsaved lesson shows the calm "לא הצלחנו לטעון את השיעור. ייתכן שאין חיבור לאינטרנט".
- **AI-off honesty** is one line everywhere ("AI לא פעיל באתר הזה. כל השאר עובד."), with a direct way back to what works ("לתרגול המובנה", "לתרחיש הבא").
- **No "Enter" chips on my phone,** and 44x44 play keys everywhere I measured.

## My top 3 wishes

1. A trip phrasebook: save phrases from scenarios and expressions, review them offline, and offer a 3-minute "before the flight" drill. This is still the one thing I'd use every day.
2. "Continue" for everything short: the word quiz round, the learn step, and a saved scenario shown on Today and on the hub.
3. Hebrew support text as large as the English it explains (at least 14 px) in scenario feedback, for reading at night.
