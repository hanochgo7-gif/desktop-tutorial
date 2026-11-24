Simulated review (AI persona), not real user research.

# Student panel, round 3: Hana, 68, retired history teacher, absolute beginner (Pre-A1), large phone, 150% text

## Who I am

Hana, 68, retired history teacher. I want to talk with my grandchildren in New York. I know no English at all, not even the letters. I have presbyopia, so I set text to 150%. I use a large phone (414x896, touch), Hebrew UI, and I go slowly and read everything.

## What I did

All screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/student-68/shots/` (named below by file).

1. `#/` welcome, then `#/start`: name "חנה", year 1958, goals "ביטחון בשיחה" and "טיולים ונסיעות לחו״ל", "קצר וקל 10 דק׳", "אני לא יודע/ת אנגלית בכלל". I tried to finish without accepting the terms and got the error, then accepted. Onboarding took me straight into lesson 1 at 100% text (01-06).
2. Left the lesson with X, found the gear on Today, `#/settings`: "גודל טקסט" 150% and "מהירות הקראה" "איטית" (07-09b).
3. Lesson `pa1-01` (The English alphabet) completely at 150%: intro, learn page, all 13 exercises with realistic mistakes (G for J, I for "why", "B V G E" in the dictation), the "today's part is done" screen, "להמשיך עכשיו", the two speaking items, the writing item, the retries and the end screen (`pa1-01-*`).
4. Lesson `pa1-02` (Letter sounds) completely: mistakes on ship/sheep, cap for cup, and "Get on the bus at tenn." (`pa1-02-*`).
5. Today after both lessons, then its main button "להתחיל: חזרה" into `#/review`, three cards, one wrong on purpose (10-today-150-*, 26-27).
6. `#/help`, all questions (11-help-*).
7. `#/games`, then words and pictures `#/games/pictures/1`: board 1 slowly (about 7 s per pair, one wrong pair), boards 2-3 faster, results (12-17).
8. In a speaking item: "טיפ להגייה", "לומר בקול", the microphone notice, "להשתמש במיקרופון" (19-21). I also pressed "השמעה" and watched what the screen did (18).

Speech synthesis has no voices in this headless browser, so I judged the sound screens by their flow and wording.

## What worked for me (keep this)

- **I felt welcome at my age.** Nothing on the way in is childish or rushed: no mascot, no confetti. The birth-year list goes back to 1927. Every form is "יודע/ת". The copy is calm: "ימים קצרים זה בסדר גמור.", "אין רצף שנשבר: יום חופש לא מוחק שום דבר.", and on Today "יום חופש לא מוחק כלום." The end screen just says "השיעור הושלם". (03b, 10-today-150-0, pa1-01-99-review-vp)
- **Starting from zero without a test.** "אני לא יודע/ת אנגלית בכלל" says "נתחיל מהאותיות. בלי מבחן." and it really goes straight to lesson 1. The warm-up meets me where I am: "אתם כבר מכירים כמה אותיות באנגלית: OK, USB, PDF, DJ." (04b, 06)
- **English sounds written in Hebrew letters with niqqud.** "אֵיי (כמו day)", "ג'י" against "ג'יי", and the Hebrew-speaker notes ("בעברית w אינו צליל רגיל (האות ו נהגית v)...") are what a Hebrew speaker needs. In the matching exercise, every letter tile has its own play button. (pa1-01-s00-e1-match-a)
- **Kind, specific feedback on mistakes.** "G נקראת ג'י ומתחרזת עם see. שמעתם ג'יי, שמתחרז עם day – זו J." The longer explanation is one tap away under "למה?". A missed item comes back at the end with "חוזרים על זה שוב, כדי שיישאר", and that felt like help, not punishment. (pa1-01-s01-e2-listen-c-verdict, pa1-01-s14)
- **The dictation shows the one letter I got wrong.** "B V J E" with only the J underlined in red. (pa1-01-s10-e10-dictation-c-verdict)
- **Speaking without fear.** "תרגול דיבור לא מקבל ציון.", "לא יכול/ה לדבר כרגע", and marking myself with "אמרתי את זה בבירור" or "צריך עוד תרגול". At 150% the pronunciation tip folds behind "טיפ להגייה", so "לשמוע" and "לומר בקול" stay on the first screen. The microphone notice explains plainly that "Lucid ... לא מקליט ולא שומר את הקול שלכם" and that "לא חייבים מיקרופון". (pa1-01-s11-e11-speak-a, 19, 20)
- **Stopping is safe.** X leaves the lesson with no warning dialog and keeps my place. The part-end screen makes "לעצור כאן" the main button. (pa1-01-s07-partend)
- **150% mostly reflows well.** On Today, Help, Settings, the lesson intro and the exercises, nothing scrolls sideways at page level (the overflow checks found nothing). The game tiles are 174x174 px and the game words are 25.5 px. Settings has a slow "איטית" speech speed, and every change is saved at once. (09-settings-150, 13-pic-board1-start)
- **The picture game itself is lovely for me.** It uses big, clear line drawings. After a match, the Hebrew word appears on the tile. A wrong pair costs little ("(פחות 3 נקודות)"). The results list the words I missed, each with a play button, plus "לשחק עם המילים האלה (2)". (14, 16-pic-board2-done, 17-pic-summary-full)
- **Review is clean and big.** One English word, a "השמעה" button, four large answers and "לא זוכר/ת". (26-review-0-a)

## What did not work (findings)

### F1. No way to enlarge text before or during onboarding (major)
- **Route:** `#/`, `#/start`, then `#/lesson/pa1-01`
- **What I did and saw:** At 100%, the help lines in onboarding are 13 px (`.field .help` and `.xsmall` use `--t-xs`: "שומרים רק את השנה, לא תאריך מלא.", the grey lines under each goal, "אין רצף שנשבר..."). After "סיום והתחלה" the app goes straight into lesson 1, still at 100% (06). The only text-size control is in `#/settings`, section "ממשק", "גודל טקסט". I reached it only after I left the lesson and noticed the gear icon on Today (07, 08).
- **Expected:** To be asked about text size on the first screen, the way the interface language is asked.
- **Suggestion:** Add "גודל טקסט" (100/115/130/150%, live preview) to onboarding step 1 next to "שפת הממשק". Also put an "א+" control on the welcome screen. Remember the choice before the profile exists, as the UI language already is through sessionStorage.

### F2. The lesson progress bar disappears at 150% (major)
- **Route:** `#/lesson/pa1-01`, `#/lesson/pa1-02` (any exercise after a mistake)
- **What I did and saw:** The counter text "11 מתוך 13 · 7 לחזרה" is 22.5 px and `white-space: nowrap`. It takes the whole row, so the progress bar is 2 px wide, a blue dot (measured). At "2 מתוך 13" it is 80 px. Screenshots: pa1-01-s05-e6-categorize-a, pa1-01-s11-e11-speak-a, pa1-02-s06-e6-mcq-a, pa1-02-s08-e8-read-a. I also did not understand "2 לחזרה". Is it 2 to review, or 2 coming back?
- **Expected:** A visible bar showing how far I am.
- **Suggestion:** At 130% or more, put the counter on its own line under the bar, or give the bar a minimum width of about 40%. Replace "· N לחזרה" with plain words such as "ועוד 2 תרגילים שחוזרים", or show it only on the retry screens.

### F3. The alphabet table: the Hebrew sound column is clipped and you cannot hear a single letter (major)
- **Route:** `#/lesson/pa1-01`, "בואו נלמד"
- **What I did and saw:** At 150% the table needs sideways scrolling: scrollWidth 387 px against 364 px visible, with the note "הטבלה רחבה מהמסך: גללו אותה הצידה כדי לראות את כל העמודות." The column I need most, "נשמע כמו", is the one that is cut and faded: "אִי (כמו see" and "זֶד (באמריקאית: זִי)" are half visible. The IPA column ("/eɪ/", "/dʒiː/") takes the middle, and I cannot read IPA. There is no play button in the table: 0 buttons in tables, against 8 in the examples and 9 in the vocabulary. This is an alphabet lesson for someone who cannot read the letters, and I cannot hear "A" or "E". (23-alphabet-table, crop-learn-0, crop-learn-1)
- **Suggestion:** For Pre-A1, and whenever text is 130% or more, show the alphabet as stacked letter cards: a big "A a", the Hebrew sound "אֵיי (כמו day)", and a play button. Put IPA behind a "סימנים פונטיים" toggle that is off at Pre-A1. Apply the same to the two tables in `pa1-02`. There, the "איך זה נשמע" and "איך אומרים" columns are offscreen too (the overflow check put them at -76 px).

### F4. Pressing play gives no sign that anything happens, and nothing explains sound (major)
- **Route:** any listen exercise (`#/lesson/pa1-01` e2, e5, e10), `#/help`
- **What I did and saw:** I pressed "השמעה". The button looked exactly the same (its HTML was unchanged), nothing played (`speechSynthesis.speaking` false, 0 voices) and no message appeared (18-play-pressed). On a real phone this is what happens with the volume down, the silent switch on, or no English voice installed. I would sit there not knowing whether it was me or the phone. Help has 11 questions but none about sound. It covers keyboard shortcuts and offline use, but not "I can't hear anything" (11-help-00 to 03). Onboarding and privacy talk only about the microphone.
- **Suggestion:** Give play buttons a playing state (icon and "מושמע…"). If no `start` event arrives within about 1.5 s, show an inline note: "לא שומעים? בדקו את עוצמת הקול ושהטלפון לא במצב שקט", with the transcript. Add a one-time "בדיקת שמע" card before the first listening item. Add a Help entry "לא שומעים את ההקראה" covering volume, silent mode, installing an English voice and "לאט".

### F5. Questions that need sound have no sound to play (major)
- **Route:** `#/lesson/pa1-02` e6 "Which word has the same vowel sound as 'cup'?", e7 "Which word rhymes with 'time'?"
- **What I did and saw:** Both are judged by sound, but neither the question word nor the options (cap, cop, cape, bus; lime, Tim, team, tame) has a play button. As an absolute beginner I can only guess from the spelling. I chose "cap" and was told "ב-cap יש /æ/, כמו ב-cat. ב-cup יש /ʌ/." That explanation uses symbols I cannot hear either. (pa1-02-s06-e6-mcq-a, pa1-02-s06-e6-mcq-c-verdict)
- **Suggestion:** In sound-based multiple choice (the phonics topic), add a play button to the prompt word and to each option, as the matching tiles already have.

### F6. The picture game rushes me: it jumps ahead after 2.5 s and pays for speed (major)
- **Route:** `#/games/pictures/1`, `#/games`
- **What I did and saw:** I played board 1 slowly. About 3.5 s after my last match, board 2 was already on screen. I never saw "לוח 1 הושלם" or the Hebrew labels on the tiles I had just matched (16-pic-board1-done shows board 2). The cause is `setTimeout(nextBoard, 2500)` after any tap. Boards 2 and 3, played faster, each gave "בונוס מהירות 5+". The results say "ובונוס מהירות 10", so at my own pace I could never reach the "/ 135" maximum. The games hub describes the word quiz's speed bonus as "3s +5, 6s +3, 10s +1; בהקלדה: 8s +5, 15s +3, 25s +1" (12-games, 17-pic-summary-full). PRODUCT.md promises "no time pressure except opt-in timed writing".
- **Suggestion:** Remove the auto-advance and always wait for "ללוח הבא". Make speed bonuses an opt-in "מצב אתגר" that is off by default, or replace them with an accuracy bonus. If speed stays, at least leave it out of "השיא שלך", so a slow, careful player can still beat her own best.

### F7. At 150% the answers and bins are below the fold, under a tall footer (minor)
- **Route:** `#/lesson/pa1-01` e2 (listen), e6 (categorize)
- **What I did and saw:** The fixed exercise footer, with "לא יודע/ת" and a disabled "בדיקה" plus an "Enter" chip, is about 170-220 px. The top bar adds about 90 px. On the listen item, "השמעה" and "לאט" are stacked, and the G/J/Y options are completely below the fold, so I play, then scroll, then choose (pa1-01-s01-e2-listen-a). On categorize, the "Capital (A)" and "small (a)" bins start below the fold, so I scrolled down and up for each of the 8 words (pa1-01-s05-e6-categorize-a, -b-answered). After a wrong answer the verdict covers 416 of 896 px, and 530 px with "למה?" open.
- **Suggestion:** At 130% or more, put "השמעה" and "לאט" side by side, put "לא יודע/ת", "רמז" and "בדיקה" in one row, and hide the "Enter" chip (see F12). Make the categorize bins sticky or show them above the word chips, and scroll the selected chip's bin into view.

### F8. The lesson time and the daily split do not match my pace (minor)
- **Route:** `#/lesson/pa1-02`, `#/today`
- **What I did and saw:** The intro of lesson 2 said "עד תרגיל 1 מתוך 14, כ-5 דקות". After a single exercise I got "החלק של היום הושלם" (pa1-02-s01-partend). The learn page before it is 12,905 px tall at 150%, about 14 phone screens. It covers 5 short vowels, silent e, th/w/v and ship/sheep, yet its footer says "הסבר קצר, ועכשיו מתרגלים." The alphabet learn page is about 12 screens. The minutes count only the exercises, so a slow reader like me will always feel behind.
- **Suggestion:** Do not split a lesson when today's part is fewer than 3 exercises. Count reading time at the learner's text size. Break the learn page into short steps ("הסבר 1 מתוך 3") with practice between them. Replace "הסבר קצר" with a neutral line such as "קראו בקצב שלכם".

### F9. Lesson 1 asks a total beginner to type English words from memory (minor)
- **Route:** `#/lesson/pa1-01` e8, e10, e13; `#/lesson/pa1-02` e10, e11, e14
- **What I did and saw:** On my first day: "Sorry, how do you ___ that? ... E, ___ L, A." with no word bank (pa1-01-s08-e8-gap-a), then a dictation, then writing 2-3 lines. Lesson 2 has a full dictation "Get on the bus at ten." and "תקנו את האיות". My phone keyboard is Hebrew by default, and at 150% the on-screen keyboard would cover most of the exercise. The conversation in e8 also runs as one paragraph ("Ella: My name is Ella. Tom: Sorry...") instead of one line per speaker.
- **Suggestion:** At Pre-A1, give gaps a word bank (as `pa1-02` e9 "sit/seat" already does) and offer tap-to-build letters for dictations. Put each speaker on their own line.

### F10. A one-letter slip in a dictation counts as wrong (minor)
- **Route:** `#/lesson/pa1-02` e10
- **What I did and saw:** "Get on the bus at tenn." got "לא בדיוק" and went into the retries as a first-try miss. The answer line also wrapped awkwardly as "Get on the bus :התשובה הנכונה / at ten." (pa1-02-s10-e10-dictation-c-verdict). In the gap exercises, small slips get "כמעט!".
- **Suggestion:** Treat a single-letter slip in one word as "כמעט! בדקו את הפרטים הקטנים", as gaps do. Always show a sentence-long answer on its own left-to-right line (the `answer-block` threshold is 24 characters; this one has 22).

### F11. In review, one tap is a final answer (minor)
- **Route:** `#/review` (from Today's "להתחיל: חזרה")
- **What I did and saw:** In lessons I choose and then press "בדיקה". In review, touching an option grades it at once: I touched "רטוב" for "double" and immediately got "לא בדיוק" (27-review-1-after). With my eyes and fingers, that is an easy mis-tap with no way back. The same long distractor, "כבשה (ברבים: כבשים – ובאנגלית גם sheep, בלי s)", appeared on all three cards I saw, and its three lines make the list taller.
- **Suggestion:** Use the same choose-then-"בדיקה" pattern everywhere, or allow undo for about 2 s. Use only the short gloss ("כבשה") when a word is a distractor.

### F12. Keyboard hints on a touch phone (minor)
- **Route:** every lesson, review and part-end screen; `#/help`
- **What I did and saw:** Every main button carries an "Enter" chip ("בדיקה Enter", "המשך Enter", "לעצור כאן Enter"), even though the device reports `pointer: coarse`. Help lists "קיצורי מקלדת" but has nothing about touch. On my phone the chip is just noise, and on a disabled "בדיקה" it looks like a second button.
- **Suggestion:** Hide `.kbd` under `@media (pointer: coarse)`, and show the "קיצורי מקלדת" Help item only on devices with a keyboard.

### F13. The microphone notice opens scrolled to its bottom at 150% (minor)
- **Route:** speaking item in `#/lesson/pa1-01`, "לומר בקול"
- **What I did and saw:** The dialog opens with its heading "לפני שמשתמשים במיקרופון" and its first sentence scrolled out of view. The first thing I saw was "הדפדפן, לא על ידי Lucid." mid-sentence (20-mic-notice). Focus goes straight to "להשתמש במיקרופון".
- **Suggestion:** Open the dialog at its top and focus the heading, or shorten it to two short paragraphs at 130% or more so that the buttons and the heading fit together.

### F14. Help does not answer a beginner's real questions (minor)
- **Route:** `#/help`
- **What I did and saw:** There is nothing on hearing (see F4), nothing on how speaking practice works without a microphone, and nothing on what "Pre-A1", "חזרה מרווחת" or "לחזרה" mean. "נוחות קריאה" says "בהגדרות: גודל טקסט..." but has no link, while "שימוש בלי אינטרנט" does have one (11-help-02).
- **Suggestion:** Add "לא שומעים", "איך מתרגלים דיבור", and "מה המילים במסך אומרות" (levels, spaced review, retries). Give "נוחות קריאה" a direct button to the text-size control.

### F15. AI consent is offered where AI does not exist (minor)
- **Route:** `#/start`, step 4 "פרטיות, בקצרה"
- **What I did and saw:** A 7-line checkbox, "לאפשר משוב AI (כתיבה, שיחות, מורה; צריך חשבון)...", sits above the terms. This site is device-only and has no AI or accounts (Settings says "(משוב AI עוד לא זמין באתר הזה.)"). I would have ticked it, hoping for a tutor (05b-ob-step4-noterms).
- **Suggestion:** In device-only mode, hide the checkbox or replace it with one line: "משוב AI לא זמין באתר הזה".

### F16. Large-text craft details (polish)
- **Routes:** `#/lesson/pa1-01`, `#/today`, `#/games`, `#/games/pictures/1`
- **What I saw:**
  - Spelled names break at their hyphens: "My name is Noa. N-" / "O-A." and "Omer Katz: O-M-E-" / "R, K-A-T-Z." (24-examples).
  - The top-bar icons (X, ⓘ, gear) stay at 18-20 px while the text grows to 22-45 px (pa1-01-00-intro-vp).
  - The Today path ladder shows only "Pre-A1", and "C2" is clipped (10-today-150-2).
  - The top-bar title shortens to "משחקי מיל..." (12-games-0).
  - In the writing checks, a ✓ wraps away from "כל משפט מתחיל באות גדולה" (pa1-01-s13-e13-write-c-verdict).
  - The "Worth watching" note labels my B/V/J/E listening slip as "איות: האיות באנגלית לא תמיד תואם את ההגייה", which is not what I got wrong (pa1-01-99-review).
- **Suggestion:**
  - Use non-breaking hyphens (U+2011) or `white-space: nowrap` for spelled sequences.
  - Size the top-bar icons in rem.
  - Abbreviate or drop the ladder labels at large text instead of clipping them.
  - Keep each check icon on the same line as its text.
  - Map letter-dictation errors to a "שמות האותיות" tag.

## Top 3 wishes

1. **Set me up for my eyes and ears on day one.** Ask about text size (with a preview) and run a short sound check during onboarding. After that, every play button should show that it is playing, and should say so when nothing came out.
2. **No clock in the games unless I ask for it.** Don't auto-advance after 2.5 s, and keep the speed bonus off by default (an optional "מצב אתגר"). Then a slow, careful player can win too.
3. **A Pre-A1 alphabet and sounds course I can hear.** Letter cards instead of a sideways-scrolling table, the Hebrew sound always visible, a play button on every letter and on every answer that is about sound, and no IPA until I ask for it. I would also like to choose American English at the start: my grandchildren are in New York.
