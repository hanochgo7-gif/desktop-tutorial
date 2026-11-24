Simulated review (AI persona), not real user research.

# Student panel, round 3 re-test: Hana, 68, retired history teacher, absolute beginner (Pre-A1), large phone, 150% text

## Who I am

I'm Hana, 68, a retired history teacher. I want to talk with my grandchildren in New York, and I know no English at all. I have presbyopia, so I need text at 150%. I use a large phone (414x896, touch) with the Hebrew UI, and I read every line slowly. I reviewed Lucid a few hours ago (`docs/qa/panels-r3/student-68.md`), and this is my second look at the new build.

## What I did

Screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/student-68/shots/`. Below I name them by file.

1. **Welcome and onboarding.** On `#/` I pressed "א+ 100%" three times, up to 150%. Then I went through `#/start` from zero: I chose 150% under "גודל טקסט" and reloaded the page, entered "חנה" and 1958, chose goals "ביטחון בשיחה" and "טיולים ונסיעות לחו״ל", chose 10 minutes and "אני לא יודע/ת אנגלית בכלל", tried to finish without the terms, then accepted them (01 to 06).
2. **`pa1-01`, completely.** I read all 9 learn steps, including the "להצגת IPA" toggle (`pa1-01-L00` to `L08`). Then all 13 exercises, with realistic mistakes: G for J, I for "why", one capital-letter word in the wrong bin, and the dictation "B V G E". I saw the second try, the part-end screen, "להמשיך ולסיים", both speaking items, the writing item, the retries and the end screen (`pa1-01-s*`).
3. **`pa1-02`, completely.** All 11 learn steps (`pa1-02-L*`), then all 14 exercises: ship for sheep, cap for cup, and "Get on the bus at tenn." (`pa1-02-s*`). I also turned the IPA toggle on and off (`pa1-02-L01-ipa-on`).
4. **Sound and microphone.** I pressed "השמעה" on a listening item with no English voice and watched the screen for 6 seconds (31 to 33). I opened the microphone notice from `#/speaking` (40 to 42).
5. **Today, then review.** After both lessons I opened `#/today` (50) and then the optional review "8 מילים חדשות: סבב ראשון", where I first tapped a wrong answer to see whether it commits (60-review-*).
6. **Help.** On `#/help` I opened every question (70).
7. **Games.** I opened `#/games`, then words and pictures `#/games/pictures/1`. I played board 1 slowly (about 7 s per pair, one wrong pair) and waited about 5 s after each board (12 to 17).
8. **Settings.** `#/settings` at 150% (80, 81).

Speech synthesis has no voices in this headless browser, so I judged sound by its flow and wording.

Note on method: in this test harness, a Playwright full-page screenshot switches off the touch emulation. While it is off, the "Enter" keycaps come back on screen. I restored touch emulation after every full-page shot and judged keycaps only from viewport shots. Full-page images that show an "Enter" chip come from the harness, not the app.

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| F1 | No text-size control before or during onboarding (major) | **fixed** | Welcome has "א+ 100%". Three taps gave 115, 130 and 150, applied at once (01b). Onboarding step 1 has "גודל טקסט" 100/115/130/150 with the note "משתנה מיד. אפשר לשנות גם אחר כך בהגדרות." (02a). A reload kept 150%. Lesson 1 opened at 150% straight after "סיום והתחלה" (06), and the help lines are now 22.5 px. |
| F2 | Lesson progress bar shrinks to 2 px at 150% (major) | **fixed** | The bar is 198 px wide on every exercise. The counter has its own row ("2 מתוך 13"), and the running "· N לחזרה" tally is gone. Retries say "חוזרים 1 מתוך 2" (pa1-01-s01-e2-listen-a, s14). |
| F3 | Alphabet table: Hebrew sound clipped, IPA in the middle, no play button (major) | **partly** | Alphabet (`pa1-01`): fixed. The table fits (scrollWidth 364 = clientWidth). Each letter has its own play button, "נשמע כמו" is fully visible, and IPA sits behind "להצגת IPA" (pa1-01-L01-full). `pa1-02`: the tables are now stacked cards and the Hebrew is visible. But the vowel table still shows "/æ/ /e/ /ɪ/" while the toggle reads "להצגת IPA" (see N1). The th/w/v and ship/sheep table has **no play button at all**: 0 buttons in step 4 of 11, the table that is most about sound (pa1-02-L03-full). |
| F4 | Play gives no sign anything happens; nothing explains sound (major) | **fixed** | About 1.5 s after "השמעה" with no voice, a dark toast appears: "לא שומעים? בדקו את עוצמת הקול ומצב שקט. אם בדפדפן אין קול באנגלית, התמליל מוצג אחרי הבדיקה." (32). Help now has "לא שומעים את ההקראה", with a link to the speech speed (70). I could not see the playing state itself, because nothing ever plays here. The toast brings a new problem (N2). |
| F5 | Sound-based questions have no sound (major) | **partly** | `pa1-02` e6 now has a play button on 'cup' and beside every option (5 buttons, outside the option buttons; pa1-02-s05-e6-mcq-a). e7 has them too. The feedback for my "cap" is still only IPA: "ב-cap יש /æ/, כמו ב-cat. ב-cup יש /ʌ/." (pa1-02-s05-e6-mcq-c-verdict). The Hebrew mouth instructions from the learn step are not used here. |
| F6 | Picture game auto-advances after 2.5 s and pays for speed (major) | **fixed** | After every board, the board stayed on screen for 4.7 s and more, showing "לוח 1 הושלם / טעות אחת בלוח הזה." and a "ללוח הבא" button. The Hebrew labels stayed on the tiles (16-pic-board1-after5s). There was no speed bonus: 117 / 120, "הניקוד: 12 × 10 − 1 × 3 = 117", "12 זוגות, טעות אחת (92% דיוק)" (17). The hub has "אתגר מהירות", off by default, with the text "כבוי: אין שעון, והמשחק מחכה לכם." (12-games-vp). |
| F7 | At 150% answers and bins are below the fold under a tall footer (minor) | **partly** | Better: on touch, "רמז" and "לא יודע/ת" share one row and there is no "Enter" chip. After a verdict the page scrolls so the marked options are visible (pa1-01-s01-e2-listen-c-verdict). Not changed: "השמעה" and "לאט" are still stacked, and the G/J/Y options start at y = 871 with the footer top at 703. They are still fully below the fold (pa1-01-s01-e2-listen-a). The categorize bins start below the fold too (bin bottoms 975 and 1137; pa1-01-s05-e6-categorize-a). A wrong-answer verdict is still 398-431 px tall. |
| F8 | Lesson time and daily split ignore my reading pace (minor) | **fixed** | The learn stage now comes in steps: "1 מתוך 9 · כ-5 דק׳ קריאה", with "הבא" and "לתרגול". "הסבר קצר" is gone. Today's part of lesson 1 was 7 exercises, not 1 (pa1-01-s07-partend). |
| F9 | Day one asks a total beginner to type from memory (minor) | **partly** | The `pa1-01` e8 gap now has a word bank (two, spell, double, say), and each speaker is on their own line (pa1-01-s08-e8-gap-a). The dictation "B V J E" and the 2-3 line writing task are still typed on day one. A wrong letter now gets a kind second try (see Liked). |
| F10 | One-letter slip in a dictation counts as wrong (minor) | **fixed** | "Get on the bus at tenn." got "כמעט! בדקו את הפרטים הקטנים · המילה נכונה; האיות: ten · הצורה המדויקת: Get on the bus at ten." It was not sent to the retries (pa1-02-s09-e10-dictation-c-verdict). |
| F11 | Review grades on first tap; long distractor (minor) | **fixed** | Tapping "אלפבית" for "letter" only selects it: blue outline, then "בדיקה" (60-review-1-b-firsttap). The distractors are short ("ספינה, אונייה", "בית"). |
| F12 | Keyboard hints on a touch phone (minor) | **fixed** | In viewport shots with touch active, `.kbd` is `display:none` (0 visible on every exercise, pa1-01-s*-a). Help has 12 items and no "קיצורי מקלדת". |
| F13 | Microphone notice opens scrolled to its bottom (minor) | **fixed** | The dialog opens at the top, focus is on `<h2>` "לפני שמשתמשים במיקרופון", and scrollTop is 0 (42-mic-notice). |
| F14 | Help misses a beginner's real questions (minor) | **fixed** | New entries: "לא שומעים את ההקראה" and "איך מתרגלים דיבור בלי מיקרופון" (with a link to "למעבדת הדיבור"). "נוחות קריאה" now has "להגדרות" (70-help-all-full). The jargon "לחזרה" no longer appears in lessons. Small gap: nothing says what "Pre-A1" means in plain words. |
| F15 | AI consent offered in device-only mode (minor) | **fixed** | Step 4 now says only "AI לא פעיל באתר הזה. כל השאר עובד. אם יתווסף, נשאל קודם." The terms checkbox is large (05b). |
| F16 | Large-text craft details (polish) | **partly** | Fixed: the top-bar icons are 26 px with labels "עזרה" and "הגדרות" (50-today-vp). The title "משחקי מילים" is no longer cut (12-games-vp). The path ladder no longer clips C2. My B/V/J/E slip is no longer mislabelled as "איות" (pa1-01-s99-end-full). Not fixed: the English lines still break at hyphens ("Omer Katz: O-M-E-" / "R, K-A-T-Z." in pa1-01-L04-full, "My name is Maya. M-" / "A-Y-A." in the speaking item pa1-01-s12-e12-speak-a). The ✓ still sits on its own line above "כל משפט מתחיל באות גדולה" in the writing checks (pa1-01-s13-e13-write-c-verdict). |

## New findings

### N1. "להצגת IPA" does not hide the IPA in the vowel table, and IPA is still all over Pre-A1 (minor)
- **Route:** `#/lesson/pa1-02`, learn step "2 מתוך 11"; also `pa1-01` steps 8-9 and `pa1-02` step 4.
- **What I did and saw:** In the vowel table the button says "להצגת IPA", yet every card already shows "Short sound /æ/", "/e/", "/ɪ/", "/ɒ/", "/ʌ/". Pressing it only changes the label to "להסתרת IPA" and adds a column header (pa1-02-L01-full, pa1-02-L01-ipa-on). The th/w/v table has no toggle and shows "th /θ/", "i /ɪ/ – ee /iː/" (pa1-02-L03-full). The word cards at Pre-A1 show "/ˈælfəbet/", "/spel/" and the English "noun", "verb" (pa1-01-L08-vp). I was told IPA is hidden, but it is everywhere.
- **Suggestion:** In card layout, hide the IPA field itself whenever the toggle is off, and start it off at Pre-A1. Hide IPA and part-of-speech labels in the word cards too, or put them behind the same toggle.

### N2. The "can't hear" toast covers the "לאט" button and stays (minor)
- **Route:** any listening item, e.g. `#/lesson/pa1-02` e1.
- **What I did and saw:** After "השמעה", the toast (four lines at 150%) sits exactly over the "לאט" button. It was still there after 6 s (32, 33). It also says "התמליל מוצג אחרי הבדיקה". With no English voice, I can only guess on every listening item and read the transcript after I have been marked wrong.
- **Suggestion:** Show the message inline under the play buttons, not as a floating toast, or let a tap close it. When no voice is available, offer "להציג את התמליל עכשיו" before answering, and don't count that item as a first-try miss.

### N3. Every learn step repeats the big lesson title, so at 150% half the screen is header (minor)
- **Route:** `#/lesson/pa1-01` learn steps 1-9, `#/lesson/pa1-02` steps 1-11.
- **What I did and saw:** Each of the 20 steps starts with the step dots, "N מתוך 9 · כ-5 דק׳ קריאה", "The English alphabet" (two lines at 150%) and "האלפבית האנגלי". The step's own content starts at about y = 440 of 896, under a 190 px footer. That leaves about 270 px of explanation per screen (pa1-01-L00-vp, pa1-01-L08-vp).
- **Suggestion:** Show the full title only on step 1. On later steps use a one-line title in the top bar, or none at all.

### N4. Speaking item: "המשך" is greyed out and the buttons that enable it are below the fold (minor)
- **Route:** `#/lesson/pa1-01` e11 and e12, `#/lesson/pa1-02` e12 and e13.
- **What I did and saw:** At 150% the first screen shows "לשמוע", "לומר בקול", "טיפ להגייה", and then "לא יכול/ה לדבר כרגע" and a disabled "המשך" in the footer. "אמרתי את זה בבירור" and "צריך עוד תרגול" sit below the fold, and nothing says that "המשך" waits for them (pa1-01-s11-e11-speak-a). I would press the grey button and wonder.
- **Suggestion:** Put the two self-rating buttons in the footer in place of the disabled "המשך", or add a line in the footer: "סמנו איך הלך כדי להמשיך". Keep "לא יכול/ה לדבר כרגע".

### N5. Tiny checkboxes, and two switches for one idea (minor)
- **Route:** `#/settings` "תמיכה בלמידה"; `#/games`.
- **What I did and saw:** "קצב רגוע (בלי בונוס מהירות ובלי מעבר אוטומטי במשחקים)" in Settings and "אתגר מהירות" on the games hub are both 13x13 px native checkboxes at 150% (81-settings-relaxed, 12-games-vp). Everything around them grew to 22 px. They are also two controls for the same thing, worded in opposite directions ("רגוע" checked, "אתגר" unchecked). I would not know which one wins.
- **Suggestion:** Use the same 24 px custom box as the onboarding terms checkbox, or a switch. Keep one control, for example "אתגר מהירות", in both places, and make each place say that it is the same setting.

### N6. Mixed Hebrew and English lines still scramble punctuation (polish)
- **Route:** `#/lesson/pa1-01` step 5; `#/lesson/pa1-02` step 4.
- **What I did and saw:** "זה E או I?" shows as "I? או E זה", with the question mark in the middle of the line (pa1-01-L04-full). The last row of the th/w/v table reads "‏/ɪ/ קצרה ורפויה; ‏/iː/ ארוכה ומתוחה" as a jumble of slashes (pa1-02-L03-full).
- **Suggestion:** Isolate only the Latin token ("E", "I") and leave the final "?" in the Hebrew run. Apply the IPA isolation to table cells too.

### N7. The first day's part-end leads with a score (polish)
- **Route:** `#/lesson/pa1-01`, part-end.
- **What I did and saw:** The first bold line after my first 7 exercises is "היום: 4 מתוך 7 נכונות בניסיון הראשון" (pa1-01-s07-partend). The rest of the screen is kind, but on my very first day a score is the first thing I read, before "המקום שלכם נשמר".
- **Suggestion:** Lead with what I can now do, or with "3 תרגילים יחזרו בסוף כדי שיישארו". Show the count smaller, or only from lesson 3 on.

### N8. Small copy and scroll details (polish)
- The end screen says "ענית נכון בניסיון הראשון על 74%", in the singular, while everything else says "עשיתם", "בחרתם", "שמעתם" (pa1-01-s99-end-vp).
- In review, after I tapped an option, the page scrolled until the word "letter" was half cut off at the top (60-review-1-b-firsttap). Keep the word card in view while choosing.
- Help's "טעיתי. מה עכשיו?" does not mention the new "לנסות שוב" for typed answers (70-help-all-full).
- At 150% the welcome language switch stacks "עברית" over "English" next to "א+ 150%" (01b). It looks odd but still works.

## What I liked (keep this)

- **Set up for my eyes from the first tap.** The "א+" button on Welcome and "גודל טקסט" in step 1 change the text at once and keep it across a reload. Lesson 1 opened at 150%. This was my biggest wish, and it is done (01b, 02a, 06).
- **The alphabet is now something I can hear.** Every letter row has its own speaker, the Hebrew "אֵיי (כמו day)" is always visible, and IPA is off. Stepping through 9 short screens with "כ-5 דק׳ קריאה" feels manageable (pa1-01-L01-full).
- **A second try that respects me.** "עוד לא. אפשר לתקן בעצמכם · אות אחת עוד לא נכונה. אפשר להקשיב שוב ולתקן." with "לנסות שוב" as the main button and "להציג את התשובה" beside it (pa1-01-s10-e10-dictation-c1-secondtry). And "כמעט!" for a one-letter slip.
- **The games wait for me.** No clock, no speed bonus, "ללוח הבא" when I am ready, accuracy in plain words, and a formula I can check (16, 17).
- **Review works like the lessons:** select, then "בדיקה" (60-review-1-b-firsttap).
- **Today can say "done":** "התוכנית להיום הושלמה ... אפשר לעצור כאן". Everything else sits under "רוצים עוד? לא חובה." (50-today-full). And still "יום חופש לא מוחק כלום."
- **Honest about sound and AI.** The "לא שומעים?" message, the new Help entries, the microphone notice that opens at its heading, and "AI לא פעיל באתר הזה. כל השאר עובד." in onboarding and Settings.
- **Labels under the top-bar icons** ("עזרה", "הגדרות"). At my age, words beat icons.
- **Settings starts with "תמיכה בלמידה"** (text size, Hebrew support, speech speed, sounds, calm pace), which is exactly what I look for first.
- **Still true from last time:** no mascot, no streak pressure, "תרגול דיבור לא מקבל ציון", and "לא יכול/ה לדבר כרגע" on every speaking item.

## Top 3 wishes now

1. **Finish the "hear it" promise in lesson 2.** Add a play button to every row of the th/w/v and ship/sheep table. Make "להצגת IPA" really hide IPA (cards, word cards, feedback). Explain a wrong sound answer in Hebrew mouth words, not "/æ/".
2. **Keep the answers on the first screen at 150%.** Put "השמעה" and "לאט" side by side, put the categorize bins above the word chips, show the title only on the first learn step, and move the speaking self-rating into the footer.
3. **When the phone is silent, let me read before I answer.** Show the message inline, not over "לאט", and offer the transcript before checking, so a beginner without an English voice is not marked wrong for something she could not hear.
