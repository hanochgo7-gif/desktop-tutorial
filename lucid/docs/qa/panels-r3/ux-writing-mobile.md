Simulated review (AI persona), not real user research.

# Panel r3: UX writing and mobile ergonomics

## Who I am

A UX writer and mobile UX specialist on the UX team. I read every visible string on the main screens in the
Hebrew UI and the English UI (clarity, tone, term consistency, Hebrew address forms, English-in-Hebrew mixing,
errors and empty states, button verbs) and used the app on a phone at 320x568 and 390x844 portrait and
844x390 landscape, including typing with a simulated on-screen keyboard.

## What I did

All screenshots are in
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/ux-writing-mobile/`
(file names below are relative to that folder). Playwright, Chromium, `locale: he-IL`, touch and mobile on.

1. Onboarding as a new learner at 390x844 and 320x568: `#/welcome` → `#/start` (tried to continue without a
   year, picked 2008, goals travel + studies, 20 min, "אני מכיר/ה קצת", tried to finish without terms, then
   finished) → placement intro. (`phone-00-welcome.png` … `phone-05-placement-start.png`, `se-*.png`)
2. As an A2 learner (Hebrew UI): Today, Path, Practice, Review (empty and after adding the A1 words), Real life,
   Progress, Settings, Profile, Help, Account, Vocabulary, Grammar lab, Games hub, checkpoint A2, placement
   restart. (`phone-he-A2-*.png`, `phone-he-review-*.png`, `se-placement-*.png`)
3. Lesson `a2-01` from start to the end screen, answering wrongly on purpose (`phone-he-La2-01-*.png`), and
   `pa1-01` at 320 as a Pre-A1 learner (`se-he-Lpa1-01-*.png`, `se-match-*.png`).
4. Scenario `rl-airport-checkin-overweight`: all four tabs (`phone-he-scn-*.png`).
5. Writing lab, free writing and `final-B2` as a B2 learner; tutor; speaking lab (`phone-he-B2-*.png`).
6. Keyboard simulation: focused a lesson gap input, a lesson textarea and the essay editor, then shrank the
   viewport by a keyboard's height (330 px at 390x844, 260 px at 320x568, 200 px at 844x390) and measured what
   stays visible (`*-kbd-*.png`, `*-essay-kbd.png`). This imitates browsers that resize the page for the
   keyboard; it is a simulation, not a real device.
7. Text size 150% at 320 (`se-150-*.png`), landscape screens (`land-*.png`), English UI on the same screens
   (`phone-en-A2-*.png`), settings restore with a bad file and the delete confirmation.

## What worked (keep these)

- **No-guilt copy is real, not decoration.** "יעד שבועי: 0 מתוך 5 ימים. יום חופש לא מוחק כלום." (Today),
  "אין רצף שנשבר: יום חופש לא מוחק שום דבר." (onboarding), "אין ציון ואין ״נכשל״. זו רק נקודת פתיחה."
  (placement), "אפשר לנסות שוב מתי שרוצים. אין עונש." (checkpoint). Calm and adult.
- **The partial-lesson split respects time.** Today says "השיעור כולו כ-25 דקות, אז היום עושים חלק: עד תרגיל 9
  מתוך 16", and at exercise 9 the lesson stops with "החלק של היום הושלם" and the primary button is
  "לעצור כאן", not "keep going" (`phone-he-La2-01-20-part.png`).
- **Verdict footer.** "לא בדיוק" (never "Wrong!"), the correct answer first, the explanation one tap away behind
  "למה?", and a full-width "המשך" that a thumb reaches from either side (`phone-he-La2-01-05-verdict.png`).
- **Honest AI-off states in the tutor and the scenario.** "שיחה חופשית עם AI עוד לא זמינה באתר הזה." with a
  "לתרגול המובנה" button; the tutor lists what still works without AI.
- **Mixed-direction text is solid.** I measured the verdict "המילה Shh! מראה…": the `Shh!` isolate sits in the
  right place with its "!" (DOM positions, `phone-he-verdict-zoom.png`). Step counters in words ("6 מתוך 16")
  never read backwards.
- **Nothing overflows at 320, even at 150% text** (scrollWidth = 320 on Today, lesson, Settings, Progress), and
  touch targets are at least 44 px tall (only the "עב" reveal button is 27 px wide).
- **Destructive action copy.** "למחוק את כל המידע מהמכשיר? … אי אפשר לבטל. כדאי להוריד גיבוי קודם." with
  "מחיקה לצמיתות" / "ביטול" (`phone-he-delete-confirm.png`).
- **Retry what you missed, with a time estimate.** "לתרגל את 13 הטעויות · כ-18 דק׳".

## What did not work

Severity: blocker / major / minor / polish.

### 1. Three ways of addressing the learner, often on one screen (major)
Routes: `#/welcome`, `#/start` step 4, `#/placement`, `#/lesson/a2-01` (speaking step), `#/writing/free`,
`#/scenario/rl-airport-checkin-overweight`.
The Hebrew UI mixes singular ("שלך", "אליך", "בחרת"), plural ("בחרו", "אתם", "שלכם") and slash forms
("יודע/ת", "את/ה מדבר/ת") with no rule:
- Welcome: "תרגול שמתאים את עצמו לטעויות שלך" and, three lines down, "רמה שנמדדת לפי מה שאתם יודעים לעשות".
- Onboarding step 4: "ההתקדמות שלך נשמרת" next to "הטקסטים שתשלחו, עם הרמה וההגדרות שלכם".
- Placement intro: "לפי התשובות שלך", "לא בטוחים?", "״לא יודע/ת״" in one list.
- Lesson speaking step: "אפשר גם לומר בקול ולסמן בעצמכם" above the button "לא יכול/ה לדבר כרגע".
- Free writing: "מה אתם כותבים?" above the label "הטקסט שלך".
- Scenario: "אתם בשדה התעופה" under the heading "המטרה שלך", and the header "את/ה מדבר/ת עם: check-in agent".
- The lesson title translation is masculine ("מה אתה עושה עכשיו?") while the same lesson's example says
  "מה את/ה עושה?".
In the UI code I counted about 56 "שלך", 36 "שלכם", about 120 plural imperatives and about 25 slash forms.
**Suggestion:** one rule. Instructions, labels and possessives use the plural ("בחרו", "שלכם", "הרמה שלכם"),
which is gender-neutral and already the commonest form. Slash forms stay only where the learner speaks in the
first person ("לא יודע/ת", "אני יכול/ה…", "אמרתי את זה בבירור"). Examples: "הטקסט שלך" → "הטקסט שלכם";
"המטרה שלך" → "המטרה שלכם"; "את/ה מדבר/ת עם:" → "מדברים עם:"; "בחרת טיולים" → "בחרתם טיולים". Add a
content test that flags "שלך" and "אליך" in UI strings.

### 2. "חזרה" means three different things (major)
Routes: `#/review`, `#/today`, `#/lesson/a2-01`, `#/start`, `#/vocab`.
- Back: the onboarding "חזרה" button, the review empty state's "חזרה להיום", the end of a review "חזרה להיום".
- Spaced review: "חזרה מרווחת", "עוד אין מילים בחזרה", "להוסיף לחזרה המרווחת…".
- Lesson retries: the step counter "6 מתוך 16 · 2 לחזרה".
After I added the A1 words, Today's main button read **"להתחיל: חזרה"**, which can be read as "Start: go back".
The empty review screen says "עוד אין מילים בחזרה" with a button "חזרה להיום" right under it
(`phone-he-A2-review.png`). Vocabulary says "ומתי כל אחת חוזרת לחזרה".
**Suggestion:** keep "חזרה" only for word review and name it in full on buttons: "להתחיל: חזרה על 8 מילים".
Back buttons: "הקודם" (onboarding), "להיום" / "למסך היום". Retry counter: "2 יחזרו בסוף". Vocabulary:
"ומתי כל מילה תופיע שוב".

### 3. "כמעט שם" at 8% (major)
Route: `#/lesson/a2-01`, end screen. Evidence: `phone-he-La2-01-54-done.png`.
Any score under the pass mark gets the title "כמעט שם" / "Nearly there", even "8% בניסיון הראשון. צריך 70%
כדי להשלים." The body is honest; the title is not, and it undercuts the product's promise to report honestly.
**Suggestion:** band the title. 50-69%: "כמעט שם". Under 50%: "השיעור עוד פתוח" with a secondary
"לקרוא שוב את ההסבר" before the retry button (that button already exists on the resume banner). English:
"Not complete yet".

### 4. AI consent and AI status contradict each other (major)
Routes: `#/start` step 4, `#/settings`, `#/practice`, `#/tutor`, `#/writing/free`.
- Onboarding asks for consent "לאפשר משוב AI (כתיבה, שיחות, מורה; צריך חשבון)…" (a 55-word checkbox label)
  although this site has neither accounts nor AI.
- In Settings the AI checkbox is enabled; I ticked it and got the toast **"משוב AI הופעל"**, while the same
  card says "(משוב AI עוד לא זמין באתר הזה.)" and free writing still says it is not available
  (`phone-he-settings-ai.png`).
- The off state has four explanations: "צריך חשבון" (onboarding), "דורש הגדרת AI" (Practice, AI tutor card),
  "עוד לא זמין באתר הזה" (Settings, writing), "שירות ה-AI עוד לא זמין באתר הזה, ולכן המורה לא זמין: אנחנו לא
  מציגים שיחה מזויפת." (tutor).
- The tutor's eight mode chips ("מתחילים", "שיחה", "דקדוק"…) stay selectable above that notice.
**Suggestion:** when AI is off, hide the onboarding consent, disable the Settings checkbox, and use one
sentence everywhere: "AI לא פעיל באתר הזה. כל השאר עובד." Practice card: "לא פעיל באתר הזה" instead of
"דורש הגדרת AI". Tutor: put the notice first and hide the chips; drop "אנחנו לא מציגים שיחה מזויפת" (it
answers a worry the learner never had).

### 5. Sticky bars cover what you type on small and landscape phones (major)
Routes: `#/writing/free`, `#/lesson/a2-01` (typed exercises). Simulated keyboard (see "What I did").
- Landscape 844x390 with the keyboard (190 px left): the sticky top bar (69 px) and the fixed tab bar (63 px)
  take 132 px; the essay textarea ends above the visible area, so you cannot see what you type
  (`land-essay-kbd.png`). In a lesson, the 73 px footer covers 50 of the textarea's 87 px
  (`land-he-kbd-ta-after.png`).
- 320x568 with the keyboard (308 px left): top bar 69 + tab bar 81 = 150 px; in a gap exercise the two-row
  footer (129 px) overlaps the focused input (`se-he-kbd-gap-after.png`).
- Landscape without a keyboard: the bars take 132 of 390 px; Today shows only the greeting and the start button
  (`land-today.png`), a scenario shows only its header and tabs (`land-scenario_rl-airport-checkin-overweight.png`).
The shell has no focus or `visualViewport` handling.
**Suggestion:** hide `#tabbar` while an input or textarea has focus; make `#top` non-sticky under
`@media (max-height: 500px)`; in the essay editor on phones, let the textarea fill the visible viewport.

### 6. The lesson footer on phones: position, size and the "Enter" chips (minor)
Routes: `#/lesson/*`, `#/placement`, `#/review`.
- At 390 the main button "בדיקה" sits bottom-left (x 16-155), the hardest corner for a right thumb, while the
  rarely used "רמז" is bottom-right; after checking, "המשך" becomes full width, so the main target jumps.
- At 320 the footer wraps into two rows (129 px) and "בדיקה" moves to the right; at 150% text the footer is
  193 px, a third of the screen (`se-150-lesson_c1-01_stage_practice.png`).
- Every primary button carries an "Enter" key chip, also on touch phones, where there is no Enter key to see.
**Suggestion:** hide `.kbd` under `@media (hover: none)`; make "בדיקה" full width like "המשך" so the main
action never moves; put "רמז" and "לא יודע/ת" in one compact row above it (icon plus short label).

### 7. Typing several gaps: Enter does nothing (minor)
Route: `#/lesson/a2-01`, exercise 6 (three gaps). I typed "swimming" in the first gap and pressed Enter: focus
stayed, nothing happened, and "בדיקה" stayed disabled. On a phone the keyboard's Enter key is the natural "next".
Lesson inputs have no `enterkeyhint` (the word game uses `enterkeyhint="go"`).
**Suggestion:** Enter moves to the next empty gap; `enterkeyhint="next"` on every gap but the last, `"done"`
on the last.

### 8. Mastery words keep changing (minor)
Routes: `#/progress`, `#/grammar`, `#/checkpoint/A2`, `#/path`.
Progress: "0 בשליטה · 0 בתרגול · 0 דורשים חיזוק" and "״בשליטה״ = לפחות 85%…". Grammar lab: "״נשלט״ דורש 85%
לפחות…" (same rule, another word). Path: "כך מראים שהרמה באמת יושבת"; checkpoint: "כך רואים מה באמת יושב"
and "75% ומעלה מסמן את הרמה כ״הוכחה״ בפרופיל שלך" (ungrammatical: a level is not "a proof"). Progress also
leans on "לפי ראיות".
**Suggestion:** one word per idea: "בשליטה" for topics, "רמה מוכחת" for a passed checkpoint. Rewrite: "75%
ומעלה מסמנים את הרמה כ״מוכחת״ בפרופיל שלכם." Replace "יושב" with "בשליטה" and "לפי ראיות" with "לפי מה
שהראיתם בתרגול".

### 9. One feature, four names: real-life situations (minor)
Routes: `#/welcome`, `#/today`, `#/real-life`, `#/conversations`, tab bar.
"30 מצבים אמיתיים" (welcome), "מצב אחד מנסיעה" (Today), "תרחישים שעוד לא עשית" (Real life),
"סימולציות שיחה" (link on the Real life page), "השיחות המובנות" (Settings). The tab is "אנגלית לחיים" but the Today card label is
"מהחיים:". English: "real situations", "Scenarios", "Conversations".
**Suggestion:** "מצבים" everywhere for the 30 situations, "שיחות מובנות" for the simulations, and
one name for the area ("אנגלית לחיים", also on the Today card instead of "מהחיים:").

### 10. Hebrew errors and awkward phrases (minor)
- Settings, "מילים חדשות ביום": "כדי שלא תיווצר עמסה" ("עמסה" is not a word) → "כדי שלא ייווצר עומס".
- Today, "הרמה לפי מיומנות": "עוד לא נבדק" (gender) → "עוד לא נבדקה" or "עוד אין מספיק נתונים".
- Checkpoint: "כ״הוכחה״" → "כ״מוכחת״" (see 8).
- Today after adding words: "המילים האלה בדיוק לפני שכחה." It is not true for words never studied, and awkward →
  "8 מילים מ-A1 שעוד לא תרגלתם, ועוד מילים שכדאי לרענן."
- Lesson intro: "כשהחלק נגמר, השיעור אומר את זה." → "כשהחלק של היום ייגמר, נעצור ונגיד לכם."
- Settings, Hebrew support: the help text says "בלחיצה ב-B1-B2" but the option is labelled "מינימלי"; use one
  word ("בלחיצה" for both, which describes the behaviour).
- Account: "השרת הזה לא מוגדר לחשבונות." → "באתר הזה אין חשבונות."

### 11. The Today time chips have no visible label (minor)
Route: `#/today`. "10 דק׳ · 20 דק׳ · 35 דק׳ · 50 דק׳" float under the greeting with no label; the only name is
the hidden `aria-label="אורך האימון היום"`, which brings in yet another word ("אימון"). Tapping 10 silently
shrinks the plan ("כ-10 דקות", the real-life card disappears).
**Suggestion:** a visible label "כמה זמן יש לכם היום?" and, after a change, one line: "התוכנית עודכנה ל-10 דקות".

### 12. English titles in the Hebrew top bar, and truncation (minor)
Routes: `#/writing/free`, `#/scenario/*`, `#/today` at 150%.
In the Hebrew UI the top bar shows the English content title, "Free writing" and "Check-in: an overweight …"
(truncated), duplicating the H1 right below it (`phone-he-B2-writing_free.png`,
`phone-he-scn-2.png`). At 320 and 150% text the top bar truncates even "היום" to "הי…" (`se-150-today.png`),
and the tab label "אנגלית לחיים" wraps to two lines, making the tab bar 110 px tall.
**Suggestion:** in the Hebrew UI, show the section name in the top bar ("מעבדת כתיבה", "אנגלית לחיים");
let the title shrink one step before truncating; give the tab a one-word label that fits ("לחיים").

### 13. "I don't know" on a matching board hides the board (minor)
Route: `#/lesson/pa1-01` at 320 (`se-match-before.png`, `se-match-after.png`).
After "לא יודע/ת" the board disappears and the answer is one dense line in mixed directions:
"A = אֵיי (כמו day) · E = אִי (כמו see) · I = אַיי (כמו my) · G = ג'י · J = ג'יי · H = אֵייץ'".
A Pre-A1 learner who cannot yet read Latin letters has to decode it without the tiles.
**Suggestion:** keep the board and show the right pairs on it, or list one pair per line.

### 14. The path's "wrong level?" card offers a button that does nothing (minor)
Route: `#/path` (A2 learner). Three buttons: "להתחיל מ-A2", "לבחון את עצמי", "מבחן מיקום מחדש". I am already
at A2; "להתחיל מ-A2" changed nothing. "לבחון את עצמי" goes to `#/checkpoint/A2`, the same place as the
"בדיקת רמה A2" card just above it, under another name.
**Suggestion:** hide "להתחיל מ-…" for the current level (or show "זו הרמה הנוכחית שלכם"); rename
"לבחון את עצמי" to "לבדיקת רמה A2".

### 15. "שליחה" when nothing is sent (polish)
Route: `#/lesson/a2-01`, writing step. The button says "שליחה" / "Submit"; in device-only mode nothing is
sent, and the verdict says "נשמר". **Suggestion:** "שמירה ובדיקה" / "Save and check".

### 16. Language switch, button verbs, games units (polish)
- Settings shows "עברית / אנגלית"; welcome and onboarding show "עברית / English". Show each language in its own
  name in Settings too, so someone stuck in the wrong UI can find theirs.
- Button verbs mix nouns and infinitives in one flow: "המשך" (verdict) next to "להמשיך עכשיו" (part screen)
  and "להמשיך מאיפה שעצרתי" (resume); "להתחיל" (placement), "בואו נתחיל" (welcome), "סיום והתחלה"
  (onboarding). Rule: nouns for commits ("שמירה", "ביטול", "בדיקה"), infinitives for moving on ("להמשיך",
  "להתחיל"); "המשך" → "להמשיך".
- Games hub: "בונוס מהירות לכל תשובה נכונה: 3s +5, 6s +3, 10s +1" uses English units in Hebrew → "3 שנ׳";
  a speed bonus is also a mild time-pressure mechanic, so say it is optional.
- Restore error "הקובץ הזה לא גיבוי תקין של Lucid." gives no next step → add "בחרו את קובץ ה-JSON שהורדתם
  ב״הורדת כל המידע״."
- "שאדואינג: חזרה אחרי משפטים" (speaking lab) → "חזרה צמודה אחרי דובר (shadowing)"; "סמול טוק" and
  "שיחת חולין" both appear for small talk.

### 17. English UI: a few strings read as translations (polish)
- Today: "Add the key words of the A1 lessons you placed out of to your spaced review?" → "You skipped A1. Add
  its key words to your reviews? Up to 8 new a day."
- Today: "The whole lesson takes about 25 min, so today is a part: up to exercise 9 of 16." → "Today you'll do
  part of this 25-minute lesson: up to exercise 9 of 16."
- Settings, retention target "Light (85%) / Standard (90%) / Exam (95%)": "Exam" is unclear → "High (95%)".

### Seen in passing (for the learning team)
Review after adding the A1 words: "work", "play" and "drink" all had the same three wrong options (בין, סניף
דואר, צעיר/ה), none of them a verb, so the answer can be found by elimination (`phone-he-review-*.png`).

## Top 3 wishes

1. **A Hebrew microcopy guide applied to the whole app, with a test.** Plural forms for instructions and
   possessives, slash forms only in first-person learner statements, and a glossary: "חזרה" = word review
   only, "מצבים", "בשליטה", "רמה מוכחת", "בדיקת רמה", one name for the AI-off state.
2. **A keyboard-aware phone layout.** Hide the tab bar while typing, unstick the top bar in landscape, a
   one-row lesson footer with a full-width main button and no "Enter" chips, and Enter moving between gaps.
3. **Results and states that say exactly what is true.** Score-banded lesson end titles, no "משוב AI הופעל"
   for a feature that is off, and the same AI sentence everywhere.
