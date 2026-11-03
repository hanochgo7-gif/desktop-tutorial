Simulated review (AI persona), not real user research.

# Student panel, round 3 re-test: Yosef, 58 (Pre-A1, tablet, text 130%)

## Who I am

Yosef, 58. I own a small import business and want to talk on the phone with suppliers abroad. I read Latin letters slowly and I am not confident with apps. I used a tablet (768x1024, touch, `hasTouch` + `isMobile`), the Hebrew interface and 130% text.

## What I did (this time)

1. `#/` then `#/start`: chose "130%" on step 1, name יוסף, born 1968, goal "עבודה ושיחות מקצועיות", "10 דק׳", start "אני לא יודע/ת אנגלית בכלל". Tried "המשך" with no start point and "סיום והתחלה" without the terms.
2. `#/lesson/pa1-01`, whole lesson: all 5 learn steps, then 13 exercises with mistakes on purpose (E with "אַיי", "I" for "why", "BVGE"), stopped at the day's part ("לעצור כאן"), came back from the lesson intro and from Today, did the repeat and the end screen.
3. `#/lesson/pa1-02`, whole lesson: 6 learn steps, 14 exercises, "לא יודע/ת" twice (e1, e6), the gap word bank tapping gap 2 first, "tenn" in the dictation, two speaking items, the writing task, two repeats.
4. `#/today` after each step, `#/review` (8 cards, one slip on purpose), the minutes chips on Today, `#/settings`, `#/help`.
5. "תרגול" tab, then `#/games`, then the memory game `#/games/memory/1` to the end.
6. "לחיים" tab, `#/real-life` (start-here list, "בעבודה"), `#/scenario/rl-work-video-small-talk` (הכנה, תרגול, שיחה עם AI).

Screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/student-58/`. File names below are in that folder.

Test note: a Playwright full-page screenshot switches off touch emulation in Chromium (after it, `(pointer: coarse)` reads false and the "Enter" chips reappear). I made all long screenshots by enlarging the viewport instead, and checked that touch emulation stayed on. The "Enter" chips are really hidden on a tablet.

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| 1 | Resume hidden under the footer; big buttons restart the lesson | **fixed** | Reopening pa1-01 shows a blue banner first, "עצרתם בתרגיל 6 מתוך 13. התשובות שכבר נתתם שמורות.", and the orange footer key is "להמשיך מתרגיל 6 מתוך 13". "להסבר" and "להתחיל מההתחלה" are smaller. The Today card goes straight to exercise 8 (`30-resume-at-e6.png`, `34-reopen-from-today.png`). |
| 2 | Sort-into-groups: tapped word does not look selected | **fixed** | Tapping "i" gives it a cobalt border and tint, both boxes light up, and the line above the words changes to "עכשיו בחרו את הקבוצה שלו." (`29-e6-i-selected.png`). |
| 3 | "לא יודע/ת" wipes the question | **fixed** | pa1-02 e1: the options stay, "sheep" is green with a tick, "השמעה" and "לאט" stay, the transcript "Look at that sheep!" appears, and the heading is the neutral "הנה התשובה" (`65-l2-e1-idk.png`, `68-l2-e6-idk.png`). |
| 4 | Word bank ignores the tapped gap | **fixed** | pa1-01 e8 and pa1-02 e9: I tapped gap 2 and then the word, and the word went into gap 2 (values `['', 'sit']`). The target gap is highlighted, a used chip is struck through, and tapping a filled gap shows "לנקות את רווח 2" (`37b-e8-filled-gap-tapped.png`, `72-l2-e9-gap2-sit.png`). |
| 5 | No sound for the letters in the alphabet table | **fixed** (pa1-01) | All 26 rows have a play button, IPA is hidden behind "להצגת IPA", and the table is split over steps 1 and 2 (`10-learn-01.png`). There is no "A to Z slowly" key. pa1-02 has a new IPA problem, see N4. |
| 6 | Real-Life: nothing for a business owner on the phone; recommendations ignore my goal | **partly** | The "בעבודה" section is now first on `#/real-life` (`97b-reallife-work.png`). But "כדאי להתחיל כאן", "לפי הרמה והמטרות שלך", still offers the connecting gate, hotel check-in and street directions (`97-reallife-top.png`). The Practice hub's "מומלץ עכשיו" also offers "Finding your gate for a connecting flight" (`90-practice.png`). The work scenarios are still all employee situations at A2 and above, and there is still nothing about calling a supplier. The plan postponed the phone track on purpose, and I understand why, but for me this remains the biggest gap. |
| 7 | Booking-code dictation marks every letter wrong | **fixed** | "BVGE" first gives the amber "עוד לא. אפשר לתקן בעצמכם" with "לנסות שוב". My text stays in the box, and "BVJE" on the second try is "נכון". With "להציג את התשובה", only J is red, with "כתבתם G, נאמר J" (`41-e10-fb.png`, `41c-e10-second.png`, `41d-e10-show-answer.png`). |
| 8 | Matching: wrong pair is a short shake; pairs can't be told apart | **fixed** | A wrong pair stays red with a × until the next tap (still there after 2.5 s), and the live line says "E – אַיי (כמו my): לא מתאים". The board finishes by itself with an amber "כל הזוגות נכונים · ניסיון נוסף אחד" and then shows full rows: "A — אֵיי (כמו day)", each with a play button (`22b-e1-wrongpair-2.5s.png`, `23-e1-done.png`). |
| 9 | Review grades on first touch | **fixed** | A tap only selects the answer (blue), and "בדיקה" grades it. A wrong answer shows red and green plus the example sentence. The end screen lists the missed word with a play button and offers "לשחק במילים האלה" (`86b-review-selected-slip.png`, `87-review-checked-1.png`, `88-review-end.png`). |
| 10 | Onboarding: no text size, tiny helper text and checkboxes | **fixed** (year list postponed by design) | Step 1 has "גודל טקסט 100/115/130/150", which works at once. Helper lines are 19.5 px at 130%. The terms box is a 31x31 custom box. Lesson 1 opened at 130% (`02-start-step1.png`, `03-step1-130.png`, `06-step4-noterms.png`). The year list still starts at 2016 (deliberate, see plan.deferred). |
| 11 | Icons without words; unlabelled controls | **partly** | Fixed: "עזרה" and "הגדרות" are written under the icons, and Today has the visible label "כמה זמן יש לכם היום?". A tap shows "התוכנית עודכנה ל-35 דקות", and Settings keeps 10 (`33-today-after-part.png`, `101-today-35.png`). Not fixed: the lesson exit is still a bare X; the memory score is still a bare blue "0" pill, because its "ניקוד:" label is screen-reader only; and the scenario cards still have an empty circle that looks like a radio button (`93b-memory-two-3s.png`, `97-reallife-top.png`). |
| 12 | Writing check misses the point of lesson 1 | **partly** (mostly fixed) | It now flags "yosef cohen" and "holon" ("אות גדולה בשמות") and "i", with amber tags (`47-e13-fb.png`). The line "כל משפט מתחיל באות גדולה" is still a thin grey triangle that doesn't say which sentence ("my name…"). |
| 13 | English with no Hebrew where a Pre-A1 learner needs it | **partly** | Fixed: the learn notes now have Hebrew ("double = שתי אותיות זהות ברצף", "קודם השם הפרטי, ואחר כך שם המשפחה"), and so do the vocabulary examples (`10-learn-03.png`). Still English only: the sentence to say on speaking items ("Sorry, how do you spell that?", "Excuse me, is this seat free?"), listening transcripts ("Look at that sheep!"), the Today card objective ("I can say and recognise the 26 letters and spell my name."), scenario answers, and "את/ה מדבר/ת עם: colleague in New York" (`44-e11-selfrated.png`, `65-l2-e1-idk.png`, `51-today-after-l1.png`, `99b-scenario-selected.png`). |
| 14 | "Short explanation" is seven screens long | **fixed** | pa1-01 is 5 steps and pa1-02 is 6 steps, each 1,400-2,065 px at 130%, with step dots, "1 מתוך 5 · כ-5 דק׳ קריאה" and "הבא" / "לתרגול". A "מלכודת לדוברי עברית" box with play chips is on step 1 (`10-learn-01.png` to `10-learn-05.png`). |
| 15 | Games hub: wall of rules, rewards speed | **partly** | The speed rules are gone, "אתגר מהירות" is off by default ("כבוי: אין שעון, והמשחק מחכה לכם"), and the page is 2,079 px instead of 4,306 px. Still there: all seven levels (Pre-A1 to C2) are listed with locked stages, and the picture game says "טעות מורידה 3". See N7 about the switch itself (`91-games.png`). |
| 16 | Lesson 2's daily part was one exercise | **fixed** | With 10 minutes, lesson 1's part ran to exercise 7 ("היום: עד תרגיל 7 · כ-10 דק׳"). After it, Today said "התוכנית להיום הושלמה" and kept saying so. More lessons appear only under "רוצים עוד?" (`32-part-end.png`, `33-today-after-part.png`). There are new number mismatches, see N2. |
| 17 | Keyboard hints on a touch tablet | **fixed** | No "Enter" chips in lessons, review or games with touch emulation on (`20-e1.png`, `24-e2.png`). The option numbers 1-4 are now quiet grey labels, not keys. Help has no keyboard section (`102-help.png`). |
| 18 | Small words on memory cards, no word list at the end | **fixed** | The words are big ("hand", "ship"), a mismatch stays face up until my next tap, and the end screen lists all 6 pairs with picture, word, Hebrew and play button (`93b-memory-two-3s.png`, `95-memory-end.png`). |
| 19 | Mixed-direction text breaks | **fixed** (where I looked) | The summary line now reads "…שתי אותיות זהות ברצף = double (A, double N, A)." in order. The "why" explanation keeps "U = you, C = see, R = are." together. The writing check shows “i” cleanly (`50-l1-summary.png`, `27b-e4-why.png`, `47-e13-fb.png`). |

## New findings

### N1. The lesson end and Today disagree about whether I'm done (minor)
- **Route:** end of `#/lesson/pa1-01` and `#/lesson/pa1-02`, then `#/today`.
- **What I saw:** The end screen's big orange button is "להמשיך בתוכנית: חזרה על מילים · 2 דק׳" (`50-l1-summary.png`, `78-l2-summary.png`). On Today the headline says "התוכנית להיום הושלמה", and the same review is an optional row under "רוצים עוד?" (`51-today-after-l1.png`). The end screen also says "9 מילים מהשיעור נכנסו לחזרה", while Today says "8 מילים חדשות".
- **Why it matters:** I trust whichever screen is louder. One says "keep going", the other says "you can stop".
- **Suggestion:** When Today counts the plan as done, the end screen's primary key should be "סיימתם להיום · להיום". Offer the review as a secondary key, "עוד 2 דק׳: חזרה על מילים (לא חובה)". Use one word count.

### N2. Today's minutes don't add up, and a block I never did is ticked (minor)
- **Route:** `#/today`.
- **What I saw:** The lesson part said "עד תרגיל 7, כ-10 דקות", but Today's done line said "(כ-6 דק׳)" next to a card showing "10 דק׳" (`33-today-after-part.png`). After lesson 2 the card showed "8 דק׳" for an 18-minute lesson (`80-today-after-l2.png`). After I tapped "35 דק׳", the same card showed "18 דק׳", and a new block, "דיבור: להשתמש במה שלמדתם · 8 דק׳", appeared already ticked, although I never opened a speaking practice (`101-today-35.png`).
- **Suggestion:** Show the time I really spent on the done line. Never add a block to a finished plan with a tick. If the new time allows more, show the block under "רוצים עוד?" instead.

### N3. The second try on the booking code doesn't say which letter (minor)
- **Route:** `#/lesson/pa1-01` e10.
- **What I saw:** "אות אחת עוד לא נכונה. אפשר להקשיב שוב ולתקן." With 4 letters I have to guess which one. While I edit, the box keeps its red border (`41-e10-fb.png`, `41b-e10-retry.png`).
- **Suggestion:** Point at it without giving the answer, e.g. "האות השלישית עוד לא נכונה", or underline the third letter in amber. Drop the red border once I start editing.

### N4. Lesson 2's table: the IPA button doesn't hide the IPA, and the play buttons are confusing (minor)
- **Route:** `#/lesson/pa1-02`, learn step 1.
- **What I saw:** The table shows the column "Short sound /æ/ /e/ /ɪ/ /ɒ/ /ʌ/". After I tap "להצגת IPA" (it becomes "להסתרת IPA"), the column is unchanged in both states (`61-l2-learn-1.png`, `62-l2-ipa-toggled.png`). The play button sits next to the letter "a" but plays "cat, bag, map". The column labels are English only ("Letter", "Short sound", "Examples"), and the Hebrew "איך זה נשמע" line ("פה פתוח לרווחה, בין 'אַ' ל'אֶ'") is link-blue, so it looks tappable.
- **Suggestion:** Treat "Short sound" as an IPA column. Put the play button next to the examples it plays. Give the column labels in Hebrew at Pre-A1. Set the Hebrew line in ink colour, not link blue.

### N5. Leaving in the middle of the explanation starts it again from step 1 (minor)
- **Route:** `#/lesson/pa1-03` (also seen on pa1-01 and pa1-02).
- **What I saw:** I read to step 3 of 6 and left. Reopening shows "בואו נלמד", and it starts at step 1. There is no "להמשיך מהשלב 3" (`103-l3-reopen-after-learn-step3.png`).
- **Suggestion:** Remember the learn step as the exercises do: "להמשיך בהסבר: שלב 3 מתוך 6".

### N6. A calm "OK, mic stays off" message is shown in error red (polish)
- **Route:** `#/lesson/pa1-01` e11, "לומר בקול", then "לא עכשיו".
- **What I saw:** "בסדר, המיקרופון נשאר כבוי. אפשר לומר בקול ולסמן בעצמכם." in red under the buttons (`44-e11-selfrated.png`). Red tells me I did something wrong.
- **Suggestion:** Use the neutral ink-2 colour with an info icon.

### N7. The "אתגר מהירות" switch is a tiny native checkbox (minor)
- **Route:** `#/games`.
- **What I saw:** A 13x13 px checkbox at the far left of a 726 px wide card (`91-games.png`). At 130% I nearly missed it. It looks nothing like the 31x31 boxes in onboarding.
- **Suggestion:** Use the same custom box as onboarding, or a labelled on/off switch ("כבוי" / "פועל") at the reading edge (right).

### N8. Memory game: level 2 stays locked although I found every pair (minor)
- **Route:** `#/games/memory/1`, end screen.
- **What I saw:** "6 זוגות ב-12 תורות (67% דיוק)", "3 פעמים נבחר קלף אחר אף שהזוג כבר נראה." and "רמה 2 נפתחת ב-70% דיוק." In round 1 the end screen offered "לרמה 2". In a memory game the first flips are blind, so a beginner will rarely reach 70%, and the "3 פעמים…" line reads like a list of my mistakes (`95-memory-end.png`).
- **Suggestion:** Unlock the next memory level by finishing a board, or count only the turns after both cards had been seen. Drop the "3 פעמים" sentence, or phrase it as a tip.

### N9. Bottom tab "לחיים" reads as a toast (polish)
- **Route:** every screen at 130% (tab bar).
- **What I saw:** At 130% "אנגלית לחיים" is shortened to "לחיים" (`33-today-after-part.png`). In Hebrew "לחיים" on its own is what you say when raising a glass.
- **Suggestion:** Use "אנגלית" or "מהחיים", or let the label wrap to two short lines.

### N10. Small copy slips (polish)
- pa1-01 e8 and pa1-02 e9 say "כתבו מילה אחת בכל רווח", but you don't write, you tap words (`37b-e8-filled-gap-tapped.png`). Say "בחרו מילה לכל רווח: לחצו על רווח ואז על מילה."
- `#/practice`: "חזרה מרווחת · 1 מילים" should be "מילה אחת" (`90-practice.png`).
- `#/lesson/pa1-01` e4 after "למה?": the open sheet covers my own wrong choice "I (הבחירה שלכם)" (`27b-e4-why.png`).

## What I liked (keep this)

- **I always knew what to tap next.** Every exercise ends in one orange key in the same place, and the resume key now says exactly where I will land ("להמשיך מתרגיל 6 מתוך 13").
- **The second try is respectful.** "עוד לא. אפשר לתקן בעצמכם" with my text kept in the box felt like a teacher, not a test. "הנה התשובה" after "לא יודע/ת" keeps the question, the sound and the transcript.
- **Selection is visible everywhere**: chips, gaps, review options, self-rating keys and scenario replies all turn blue when tapped, and nothing is graded until "בדיקה".
- **Matching shows the pairs together at the end** ("A — אֵיי (כמו day)"), each with sound. This is the review I wanted.
- **The alphabet table with 26 play buttons** and the "מלכודת לדוברי עברית" box with play chips (I, Noa, Haifa; ship, sit, sheep, seat).
- **Text size on the first screen of onboarding**, and "א+" on the welcome page. Everything after that was at 130% without searching.
- **Today can say "התוכנית להיום הושלמה"** and keeps saying it. Extras are clearly marked "לא חובה".
- **The memory game is calm now**: no clock, a mismatch waits for me, big words, and a list of every pair with sound at the end.
- **Honesty about AI and the microphone**: "AI לא פעיל באתר הזה. כל השאר עובד." and the mic notice that says nothing is recorded.
- **The work section is first in Real-Life**, and the video-call preparation phrases ("Sorry, you froze for a second…", "Sorry, I was on mute.") are exactly what I need on calls.

## My top 3 wishes

1. **A supplier phone track at A1-A2**, recommended first when my goal is work: greeting and saying who I am, spelling a company name and an order number, prices, quantities and dates, "Could you say that again slowly, please?", and confirming an order. Until then, "כדאי להתחיל כאן" should not offer me airports.
2. **Hebrew under every English line I am asked to say or hear at Pre-A1**: speaking sentences, transcripts, scenario answers and the Today objective.
3. **One consistent story about my day**: the lesson end, Today and the minutes should agree, with no ticked blocks I never did. And remember where I stopped in the explanation, as you now do in the exercises.
