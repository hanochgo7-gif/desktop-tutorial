Simulated review (AI persona), not real user research.

# Panel r3 re-test: UX writing and mobile ergonomics

## Who I am

A UX writer and mobile UX specialist on the UX team. I read the visible strings in the Hebrew UI and the English
UI (tone, terms, forms of address, errors, empty states, button verbs) and use the app on a phone at 320x568 and
390x844 portrait and 844x390 landscape, including a simulated on-screen keyboard. This is a re-test of my
report `docs/qa/panels-r3/ux-writing-mobile.md` against the build after the r3 plan.

## What I did

Screenshots and scripts:
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/ux-writing-mobile/`
(file names below are relative to it). Playwright Chromium, `locale: he-IL`, touch and mobile on.

1. Onboarding at 390 and 320 (`#/welcome` → `#/start` steps 1-4, "אני מכיר/ה קצת", terms → placement intro).
   (`phone-0*.png`, `se-0*.png`)
2. A2 learner, Hebrew UI, at 390: Today, Path, Practice, Review, Settings, Account, Real life, Progress, Grammar,
   Vocabulary, checkpoint A2, Games, Tutor, Writing, Free writing, Speaking, Help, Profile
   (`phone-he-A2-*.png`, text dump `phone-he-A2-routes.txt`).
3. Lesson `a2-01` start to end with wrong answers on purpose, including the new second try, the retry round and
   the end screen (`phone-he-La2-01-*.png`, `phone-he-La2-01.txt`); Enter between gaps (`s23`).
4. A 10-minute day: Today → lesson part → part end → Today "done" (`phone-he-part-end.png`,
   `phone-he-today-after-part.png`); adding the A1 words and the review with select-then-check
   (`phone-he-today-after-add.png`, `kbd-review.png`).
5. Pre-A1 `pa1-01` matching, "לא יודע/ת" at 320 (`se-match-after.png`).
6. Keyboard simulation (viewport shrunk by 330 / 260 / 200 px after focusing): lesson gap and textarea, free
   writing and `final-B2` (`se-he-kbd-*.png`, `land-he-kbd-*.png`, `land-essay-kbd.png`).
7. 150% and 130% text at 320 (`se-150-*.png`), landscape screens (`land-*.png`), English UI (`phone-en-A2-*.png`),
   settings restore with a bad file, games hub and one word-game question (`phone-he-game-after.png`).

Method note: Playwright full-page screenshots on an emulated phone drop the `(hover: none)` media state, so in
full-page shots the "Enter" chips reappear. I checked every chip claim on viewport-only screenshots and with
`matchMedia` (`s29-kbd.mjs`); the chips are really gone on touch.

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| 1 | Three ways of addressing the learner | partly | Welcome, onboarding, placement, Today and the writing instructions are now plural ("ההתקדמות שלכם נשמרת", "לא בטוחים?"). Still mixed: Real life "הרמה שלך במסלול: A2. תרחישים ברמה A2 ומטה מתאימים לך" one line under "שמרו אותם במכשיר", "תרחישים שעוד לא עשית, לפי הרמה והמטרות שלך."; scenario "המטרה שלך" under "אתם בשדה התעופה" and "את/ה מדבר/ת עם: check-in agent"; Settings "המידע שלך" / "הכול שלך"; Grammar and Games tag "הרמה שלך" under "הרמה שלכם"; Speaking "המשפט הבא בשבילך" next to "מומלץ לרמה שלכם"; Free writing "מה אתם כותבים?" above "הטקסט שלך". The lesson title translation is still masculine "מה אתה עושה עכשיו?" on Today, Path, Progress, Speaking and the lesson. The sweep was deferred on purpose (plan.deferred); the glossary and `tests/unit/copy.test.mjs` exist. `phone-he-A2-routes.txt`, `crop-rl-top.png`, `land-scenario_rl-airport-checkin-overweight.png` |
| 2 | "חזרה" means back, review and retries | partly | Fixed: Today key "להתחיל: חזרה על 8 מילים", onboarding "הקודם", review empty state "להיום", retry counter "חוזרים 3 מתוך 10". Still there: Vocabulary "ומתי כל אחת חוזרת לחזרה." and the empty state "והן חוזרות לחזרה בדיוק לפני שהן נשכחות." (`phone-he-A2-vocab.png`) |
| 3 | "כמעט שם" at 8% | fixed | 8% now reads "השיעור עוד פתוח" with "לקרוא שוב את ההסבר ואז לתרגל" as the main key (`phone-he-La2-01-66-done.png`) |
| 4 | AI consent and AI status contradict | partly | Onboarding shows "AI לא פעיל באתר הזה. כל השאר עובד. אם יתווסף, נשאל קודם." with no checkbox; Settings checkbox is disabled, no toast; Practice "לא פעיל באתר הזה"; tutor notice first, no chips; writing and scenario use the same sentence. Left over: Help "משוב AI, שיחות AI והמורה" still says "אלה דורשים שרת שבו הוגדר שירות AI, חשבון, והסכמה בהגדרות." (accounts don't exist here), and the two AI-only segmented controls in Settings are `aria-disabled` but look active (`phone-he-settings-ai.png`) |
| 5 | Sticky bars cover what you type | fixed | `body.typing` hides the tab bar, the top bar is static: in landscape with the keyboard the essay's last line stays visible (`land-essay-kbd.png`); at 320 and in landscape the focused gap and textarea sit above the footer (gap bottom 171 < footer top 179 at 320; textarea 109 < 117 in landscape) |
| 6 | Lesson footer: position, size, Enter chips | partly | Enter chips gone on touch (lesson, review, placement, checkpoint); the main key is full width at the bottom and never moves (x 16-374 for "בדיקה", "המשך", "לנסות שוב"); landscape is one 73 px row. Still tall: 129 px at 320 (42% of the screen with the keyboard open, `se-he-kbd-gap-after.png`) and 193 px at 150% text (see new finding 1) |
| 7 | Enter does nothing between gaps | fixed | `enterkeyhint` next/next/done; Enter moves gap 1 → 2 → 3 and checks on the last |
| 8 | Mastery words keep changing | partly | Checkpoint now "75% ומעלה מסמנים את הרמה כ״מוכחת״" and "כך רואים מה באמת בשליטה"; Grammar uses "בשליטה"; Today "אוספים ראיות". Still: Grammar intro "מה כבר יושב", Practice card "כל נושא דקדוק, כמה הוא יושב", Progress "לפי ראיות" |
| 9 | One feature, four names (real-life situations) | not-fixed | Welcome "30 מצבים אמיתיים", Today "מצב אחד מנסיעה" under the label "מהחיים:", Real life "תרחישים", a link "סימולציות שיחה", tab "אנגלית לחיים". Only the tab's large-text label "לחיים" changed. "שיחת חולין" and "סמול טוק" both appear on the Real life list |
| 10 | Hebrew errors and awkward phrases | fixed | "כדי שלא ייווצר עומס", "בלחיצה" matches its option, account "באתר הזה אין חשבונות.", checkpoint "כ״מוכחת״", Today new cards "8 מילים חדשות: סבב ראשון", the lesson-intro line is gone, "עוד לא נבדק" replaced |
| 11 | Today time chips have no label | fixed | "כמה זמן יש לכם היום?" visible; after 10 → role=status "התוכנית עודכנה ל-10 דקות" |
| 12 | English titles in the Hebrew top bar, truncation | fixed | Top bar "מעבדת כתיבה" on free writing and final-B2, "אנגלית לחיים" on a scenario; no truncation at 320/150%; tab "לחיים" at 150%. (Side effect: new finding 2) |
| 13 | "I don't know" hides the matching board | fixed | The board stays with every pair ticked; footer title "הנה התשובה" (`se-match-after.png`). The footer key is still one dense mixed-direction line, but the board now carries the answer |
| 14 | Path "wrong level?" card | fixed | "✓ זו הרמה הנוכחית שלכם", "לבדיקת רמה A2", "מבחן מיקום מחדש" (`crop-path-bottom.png`) |
| 15 | "שליחה" when nothing is sent | fixed | Button "שמירה ובדיקה", verdict "נשמר." (new wording issue in new finding 3) |
| 16 | Language switch, verbs, game units, restore error, shadowing | partly | Fixed: Settings "עברית / English"; restore error adds "בחרו את קובץ ה-JSON שהורדתם ב״הורדת כל המידע״."; "חוזרים אחרי הדובר (shadowing)"; speed bonus off by default with no "3s" units. Not changed: "המשך" (verdict) next to "להמשיך ולסיים" (part screen); "סמול טוק" and "שיחת חולין" |
| 17 | English UI strings read as translations | fixed | "You skipped A1. Add its key words to your reviews? Up to 8 new a day.", "Today you'll do part of this 25-minute lesson: up to exercise 9 of 16.", "High (95%)" (`phone-en-A2-today.png`, `phone-en-A2-settings.png`) |
| – | Seen in passing: review options by elimination | fixed | "work": ללמד / לעבוד / לצפות / לסיים, all verbs (`kbd-review.png`) |

## New findings

Severity: blocker / major / minor / polish.

### 1. At 320 px with 150% text the lesson leaves 160 px for the exercise (major)
Route: `#/lesson/a2-01?stage=practice`, 320x568, text 150%. Evidence: `se-150-lesson-1.png`, `s27-big2.mjs`.
The player top is now three rows (progress bar and ✕; the ⓘ alone; "1 מתוך 16"), 215 px, and the footer is
193 px ("לא יודע/ת" on its own row above a full-width "בדיקה"). Between them: 160 px. On the first matching
exercise I see only the instruction "Match the English phrases with their Hebrew meaning."; none of the tiles. At
130% it is 277 px, at 100% 344 px. Learners who choose 150% are the ones who need the space.
**Suggestion:** at `data-text` 130+ and under 30rem, keep ⓘ in the ✕ row and the counter at the end of the bar row
(one row, about 56 px); put "רמז" / "לא יודע/ת" as compact icon+label keys in the same row as "בדיקה" when they
fit, or behind one "עזרה" key; let the footer scroll with the page when the exercise is taller than the viewport.

### 2. Today at 320 with large text: the start key is below the fold (minor)
Route: `#/today`, 320x568. Evidence: `se-150-today.png`, `s27-big2.mjs`.
The top bar grew to 103 px at 130-150% (labels "עזרה" / "הגדרות" under the icons) and the tab bar is 73 px. The
first screen shows the greeting, the weekly line and the time chips; "להתחיל: What are you doing?" starts at
y 679 (150%) and 590 (130%) while the tab bar starts at 495-498. At 100% it is visible (390-461).
**Suggestion:** at 320 keep the icon labels off (they already have accessible names) or put the time chips under
the plan; the main key should be on the first screen at every text size.

### 3. Lesson writing step: three numbers for one requirement (minor)
Route: `#/lesson/a2-01`, exercise 16 ("Write a message to a friend."). Evidence: `phone-he-La2-01.txt` steps 43-45.
With 6 words the counter says "6 מילים · לפחות 40" and the disabled key says "שמירה ובדיקה · עוד 4 מילים". The
key then unlocks at 10 words although the line says at least 40. After saving, the check says
"40 מילים (יעד 40-90)". A learner cannot tell which number counts.
**Suggestion:** counter "6 מילים · יעד 40-90"; disabled key "אפשר לבדוק מ-10 מילים (עוד 4)"; after 10 words,
"שמירה ובדיקה". English: "6 words · aim 40-90", "You can check from 10 words (4 more)".

### 4. A green tick next to an unmet word target (minor)
Routes: `#/writing/final-B2`, `#/writing/free`. Evidence: `crop-checks-a.png`, `land-essay-kbd.png`.
With 162 words the editor bar reads "162 מילים  יעד 450-600 ✓". The ✓ is the "draft saved" icon; its words
("הטיוטה נשמרה במכשיר") are only a `title` and sr-only text. On a phone there is no hover, so the tick reads as
"target met", which contradicts the amber "162 מילים (יעד 450-600)" check below.
**Suggestion:** show the word "נשמר" (or a cloud icon with "נשמר") apart from the target, and keep the target
neutral or amber until it is reached.

### 5. Writing checks: wording and number agreement (minor)
Route: `#/writing/final-B2` after "בדיקה אוטומטית". Evidence: `crop-checks-a.png`, `crop-checks-b.png`.
- "מצאנו 4 מהדברים שאנחנו בודקים" reads like "4 of our checks passed"; the summary above says
  "4 דברים לבדוק". → "4 דברים לבדוק".
- "1 פסקאות (כדאי 3 לפחות)" and "12 משפטים · … · 1 פסקאות" → "פסקה אחת (כדאי 3 לפחות)".
- Linking-word tags show English category names in the Hebrew UI: "contrast", "cause" → "ניגוד", "סיבה".
- "6 משפטים מתחילים ב-"many"." uses straight quotes; the rest of the UI uses ״ ״ → "ב-״many״" or an isolated
  English word without quotes.

### 6. One setting, two names with opposite meaning (minor)
Routes: `#/settings`, `#/games`. Evidence: `s31-pace.mjs`, `phone-he-games-top.png`.
Settings has a checked box "קצב רגוע (בלי בונוס מהירות ובלי מעבר אוטומטי במשחקים)"; the games hub has an
unchecked box "אתגר מהירות". They are the same setting: turning "אתגר מהירות" on unchecks "קצב רגוע". A learner
who unticks "קצב רגוע" to get sounds off, or reads both, will not see they are linked.
**Suggestion:** one name and one polarity in both places: "אתגר מהירות במשחקים" (off by default), with the
same help line "כבוי: אין שעון, והמשחק מחכה לכם."

### 7. The game says "לא נכון" where everything else says "לא בדיוק" (minor)
Route: `#/games/A2/1`. Evidence: `phone-he-game-after.png`.
A wrong pick gets a red box titled "לא נכון". Lessons, review and scenarios use "לא בדיוק", which the brand's
calm tone relies on. **Suggestion:** "לא בדיוק" in the games too (English "Not quite").

### 8. "איך מנקדים?" (polish)
Route: `#/games` with "אתגר מהירות" on. In Hebrew "לנקד" first means adding vowel points (ניקוד), which a
language app also teaches. **Suggestion:** "איך סופרים נקודות?".

### 9. Today "done": the finished lesson still says "המשך:" and the minutes disagree (minor)
Routes: `#/today` after a 10-minute part, part-end screen. Evidence: `phone-he-today-after-part.png`,
`phone-he-part-end.png`.
Under "התוכנית להיום הושלמה (כ-5 דק׳)" the ticked, greyed lesson card is labelled "המשך: What are you doing?" with
"10 דק׳". The part-end screen said "(עד תרגיל 4, כ-10 דקות)". So the same work is "Continue", 10 minutes and
5 minutes on two screens.
**Suggestion:** label done cards "הושלם היום:"; on the part-end screen say "עד תרגיל 4" without a time, or use
the measured minutes everywhere.

### 10. Mixed direction: "ל-y: lie → lying" and wrapped arrow pairs (minor)
Routes: `#/lesson/a2-01` second-try footer and end screen. Evidence: `zoom-second-try-foot.png`,
`phone-he-La2-01-66-done.png`, DOM in `s34-bidi2.mjs`.
The Hebrew hint "בפעלים שמסתיימים ב-ie, ה-ie הופך ל-y: lie → lying." isolates the whole run
`y: lie → lying` as one LTR unit glued to "ל-", so it displays as "y: lie → lying-ל" with the hyphen next to
"lying". In "מה לזכור", "איות: make → making, run → running, lie → lying." wraps between "lie" and "→ lying".
**Suggestion:** after a Hebrew prefix isolate only the next token (`ל-<bdi>y</bdi>: <bdi>lie → lying</bdi>`), and
keep each "x → y" pair `nowrap`.

### 11. The failed-lesson footer stacks three keys, and "אחר כך" is vague (minor)
Route: `#/lesson/a2-01` end screen at 390. Evidence: `phone-he-La2-01-66-done.png`.
The footer is 185 px: "אחר כך", "לתרגל רק את 13 הטעויות · כ-17 דק׳", "לקרוא שוב את ההסבר ואז לתרגל". "אחר כך"
does not say where it goes (it goes to Today). The body line "התשובות הנכונות נשארות." is unclear (kept where?).
**Suggestion:** "אחר כך" → "להיום" as a text link in the page, not a third key; body → "מה שעניתם נכון נשמר,
ולא צריך לעשות אותו שוב."

### 12. AI-only Settings controls look active (polish)
Route: `#/settings`, "משוב" card. Evidence: `phone-he-settings-ai.png`.
"כמה תיקונים בשיחה ובמורה" and "משוב על כתיבה" are `aria-disabled`, but "רגיל" and "לפי הרמה" still show a
white selected chip at full contrast. **Suggestion:** dim the whole group and put the AI-off line directly above
it, as the checkbox already is.

### 13. Top-bar title size changes from screen to screen at 150% (polish)
Routes: `#/today`, `#/writing/free`, `#/real-life` at 320/150%. Evidence: `s26-big.mjs`.
The shrink-to-fit title is 25.5 px for "היום", 17.5 px for "אנגלית לחיים" and 16.5 px for "מעבדת כתיבה". The bar
jumps as you move between tabs. **Suggestion:** one size per breakpoint and text size, chosen to fit the longest
section name, with shrinking only as a fallback.

## What worked (keep these)

- **The second try is the best new copy in the app.** "עוד לא. אפשר לתקן בעצמכם" with the specific rule, "לנסות
  שוב" as the main key and "להציג את התשובה" beside it; the text stays, the right gap turns green, the focus goes
  to the first wrong gap (`phone-he-La2-01-13-second-try.png`, `phone-he-reopen.png`).
- **Retry round wording.** "חוזרים 3 מתוך 10" and "עוד פעם אחת, כדי שיישאר" replace the old "2 לחזרה".
- **Honest end screen.** "השיעור עוד פתוח · 8% בניסיון הראשון. צריך 70% כדי להשלים." leads with re-reading
  the explanation.
- **Today can end.** "התוכנית להיום הושלמה", then "רוצים עוד? לא חובה. כל אחד מאלה עומד בפני עצמו." Calm and
  adult. The time chips have a real question, "כמה זמן יש לכם היום?", and a status line after a change.
- **One AI-off sentence.** "AI לא פעיל באתר הזה. כל השאר עובד." in onboarding, Settings, tutor, writing and
  scenarios, and "אם יתווסף, נשאל קודם." in onboarding.
- **A keyboard-aware shell.** Tab bar hidden while typing, static top bar, Enter walking through the gaps with the
  right `enterkeyhint`. In landscape the essay line you type stays visible.
- **Games are calm by default.** "כבוי: אין שעון, והמשחק מחכה לכם." and the honest "הבחירה נבדקת מיד."
- **Review selects, then checks**, and the wrong options are now the same part of speech.
- **Error with a next step.** "הקובץ הזה לא גיבוי תקין של Lucid. בחרו את קובץ ה-JSON שהורדתם ב״הורדת כל
  המידע״."
- **Writing checks say what they are.** "הבדיקה מחפשת ביטויים אופייניים… היא לא שופטת את איכות הטיעון."
- **Kept from before:** "יום חופש לא מוחק כלום.", the destructive-action dialog, no overflow at 320 even at 150%.

## Top 3 wishes

1. **Run the deferred address sweep now**, with the copy test turned from allowlist to fail: Real life, scenario
   header, Settings data card, the "הרמה שלך" tags, Speaking, the writing label, and the masculine lesson-title
   translations. Name the 30 situations one way ("מצבים") and the scripted dialogues another ("שיחות מובנות").
2. **Make large text work at 320.** A one-row player top, a compact footer, and the Today start key on the first
   screen at 130-150%.
3. **One number, one word, one meaning.** One word target in the lesson writing step, no green tick next to an
   unmet target, "פסקה אחת", one name for the speed setting, "לא בדיוק" in the games, and "הושלם היום:" on done
   cards.
