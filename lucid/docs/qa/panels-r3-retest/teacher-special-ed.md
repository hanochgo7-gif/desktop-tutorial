Simulated review (AI persona), not real user research.

# Teacher panel, round 3 re-test: special-education teacher (learning disabilities)

## Who I am

I am a special-education teacher. I work with Hebrew-speaking teenagers and adults who have dyslexia, ADHD or slow processing and are learning English. I look at reading load and text direction, whether instructions come one step at a time, whether mistakes are shown without shame, any clock pressure, working-memory load, and whether every word can be heard as well as seen.

## What I did (re-test)

Phone 390x844, touch, Hebrew UI, he-IL. All screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/teacher-special-ed/`, named below by file.

1. Onboarding at `#/start` as a beginner ("Noa", 2007, everyday English, 10 minutes, "אני לא יודע/ת אנגלית בכלל", terms). This took me to `#/lesson/pa1-01` (`06-after-onboard.png`).
2. `pa1-01`: all 5 new learn steps (`10-pa1-learn-step0..4.png`), then every exercise with deliberate mistakes: one wrong pair in each matching task, wrong options, "say" from the word bank, "BVGE" in dictation followed by the second try, skipped speaking, the writing task, the daily part stop, the retry round and the end screen (`11-pa1-*.png`). I also sorted the capitals task with two errors (`15-cat-verdict.png`).
3. An A1 learner at 150% text with reduced motion: Today (`20-a1-today-150.png`), the 8 learn steps of `a1-01` (`22-a1-learn-150-step*.png`), all 15 exercises with errors, the second try on the translation, the dictation with "thursday mornng", and the summary (`23-a1-*.png`, `24-a1-summary-p*.png`). At 130% I typed "evrey … in" in `a1-01` e7 (`26-a1-gap-*.png`).
4. `#/lesson/a1-02`: two exercises, then out through (i), then Back (`84-help-back.png`). I also checked the IPA objective (`85-ipa-bidi-crop.png`) and the header at 150% in `a1-03` (`86-progress-150.png`).
5. `#/review` with the 8 Pre-A1 words added from Today; 7 of 8 answered wrong (`31-review-*.png`, `32-review-end.png`).
6. Games at A1, 100%: hub (`40-games-hub.png`), word quiz `#/games/A1/1` with 4 wrong answers and a 9 s pause (`44-wq-*.png`), pictures `#/games/pictures/1` with one wrong pair, waiting 6 s on every finished board (`51/52-pic-*.png`), memory `#/games/memory/1` with slips (`62/63/65/66-mem-*.png`), and memory at 150% with the full and the small board (`67-mem-150*.png`).
7. `#/settings` at 130% and 150% (`70-settings-150*.png`, `72-seg-130.png`, `72-seg-150.png`).
8. In Node I ran `checkTyped` from `js/core/grading.js` on typical dyslexic spellings: dubble, dobule, spel, frend, becuase, tomorow, wensday, sed.

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| 1 | Sentence table reads backwards (a1-01) | **fixed** | At 150% each row is now an LTR card: "Who? I · Verb work · The rest in a bank." with "אני עובד/ת בבנק." under it. No sideways scroll (table 340 px in a 340 px box) (`22-a1-learn-150-step1.png`). |
| 2 | Hebrew source sentence marked as English (a1-01 e9) | **fixed** | The source "אנחנו גרים בירושלים ועובדים בתל אביב." is `lang=he dir=rtl`, right-aligned, with its full stop on the left. |
| 3 | Mixed Hebrew–English lines break into reversed fragments | **partly** | IPA is now whole: "כ-/s/, /z/ או /ɪz/: works, lives," (`85-ipa-bidi-crop.png`). "OK, USB, PDF, DJ" is kept together (`06c-tip-crop.png`), and the title "הווה פשוט: I, you, we, they" keeps the English on one line. However, when English ends a Hebrew sentence, the full stop still lands before it for an LTR reader. The a1-01 summary at 150% shows ".I work in a bank", ".am/is/are" and ".I, you, we, they: live", and "I, you, we, they + פועל בסיס" displays as "+ I, you, we, they" (`24-crop-bank.png`, `24-a1-summary-p0.png`, `-p2.png`). The markup is correct bidi (the full stop is outside the `<bdi>`), but a dyslexic reader switching to LTR sees the dot in front of "I". |
| 4 | One slip fails a matching task; pairs never shown | **fixed** | A wrong pair shows a red outline and ✕ on both tiles, and the live line says "E – אַיי (כמו my): לא מתאים" (`11-pa1-ex1-match-wrongtap.png`). Once all pairs are matched, the task checks itself. The verdict is amber: "כל הזוגות נכונים · ניסיון נוסף אחד". The task is not queued again, and the board becomes full-contrast rows "B — b", "D — d" with play buttons (`11-pa1-ex03-verdict.png`). |
| 5 | Speed bonuses in all three games | **fixed** | The hub has "אתגר מהירות" switched off by default: "כבוי: אין שעון, והמשחק מחכה לכם" (`40-games-hub.png`). The quiz scores only accuracy: "6 מתוך 10 נכונות (60%) · הניקוד: 6 × 10 = 60" (`45-wq-summary.png`). Pictures: "117 נקודות / 120" with no bonus line. (The picture game's −3 per wrong tap remains; see N5.) |
| 6 | Games move on by themselves | **fixed** | Quiz feedback, with its example sentence and a full-width "המשך" key, was still there after 3.7 s on every question (`44-wq-k0-after4s.png`). Finished picture boards stayed 6 s with "ללוח הבא" waiting (`52-pic-board0-after6s.png`). |
| 7 | Memory game punishes memory weakness | **partly** | In calm mode: no slip penalty (60/60). A mismatch stays face up until the next tap (still up after 4 s, `63-mem-after-4s.png`). The live line names both cards. Card words are 24 px. The end screen lists every pair with picture, word, Hebrew and play button, and lists no slipped words (`66-mem-done-100.png`). A "ללוח קטן: 8 קלפים" option now exists. **Still there:** level 2 opens at "70% דיוק", and that accuracy counts slips. I found all 6/6 pairs and scored 60/60, but the screen says "(55% דיוק)", "5 פעמים נבחר קלף אחר אף שהזוג כבר נראה" and "רמה 2 נפתחת ב-70% דיוק". I could not re-check level 3 (locked). |
| 8 | Lesson progress bar disappears at 150% | **fixed** | The bar is 198 px at 150% in a1-01 and a1-03, with the counter on its own row (`86-progress-150.png`). |
| 9 | Learn pages are one very long scroll | **partly** | The learn stage is now in steps, with dots, "1 מתוך 5 · כ-5 דק׳ קריאה" and "הבא"/"הקודם"/"לתרגול" keys, and the pitfall "מלכודת לדוברי עברית" comes first with play buttons for I, Noa and Haifa (`10-pa1-learn-step0.png`). But the total got longer. pa1-01 is 910 + 1,605 + 1,726 + 1,671 + 1,429 px at 100%, about 7,300 px, against about 5,800 px before. a1-01 at 150% has **8** steps of 1,014–2,156 px each, about 2.5 phone screens per step. Both lessons say "כ-5 דק׳ קריאה". Step 4 of pa1-01 mixes examples, a pitfall, two notes and the first vocabulary cards. |
| 10 | Hebrew instruction weaker than English; everything doubled | **fixed** | The Hebrew instruction is now first, dark and bold, and the English is a smaller grey line under it (`11-pa1-ex02-verdict.png`). Explanation paragraphs show the Hebrew with an "EN" chip, "– להצגת הפסקה באנגלית", instead of both texts (`10-pa1-learn-step0.png`). |
| 11 | Spelling tolerance does not fit dyslexic spelling | **partly** | In Node, `checkTyped` now returns "almost" for dubble, dobule, spel, frend, becuase and tomorow (wensday and sed are still rejected). In the app, "evrey" gave "כמעט! … המילה נכונה; האיות: every" (`26-a1-gap-second-130.png`). But the misspelled word stays on screen in a **green** field (see N3). The pa1-01 e8 gap is now a word bank, so "dubble" can no longer be typed there. |
| 12 | One try only; option taps behave differently | **partly** | Review now selects, then checks: the first tap only highlights (`31-review-k0-selected.png`), and a different pick can still be chosen. Typed answers get a calm second try: "עוד לא. אפשר לתקן בעצמכם" with "לנסות שוב" as the default and my text kept (`11-pa1-ex11-verdict.png`). Lesson MCQs still reveal the answer on the first miss, which the team decided on purpose. The word quiz still commits on the first tap but now says "הבחירה נבדקת מיד." |
| 13 | Running mistake count in the header | **fixed** | The first pass shows only "6 מתוך 13". The retry round says "חוזרים 1 מתוך 5". |
| 14 | Green ticks on wrong sentences | **partly** | In a1-01 e3, wrong sentences in "Wrong" are struck through in red with a grey "במקום הנכון" tag and no tick (`23-a1-k02-v.png`). The fix is not shown beside them ("They ~~lives~~ live"). A sentence struck through is also hard to read for a dyslexic learner. A related case remains in pa1-01 (N4). |
| 15 | Picture game ends on Hebrew | **fixed** | Matched tiles show "egg" large and "ביצה" small under it (`52-pic-board0-after6s.png`). |
| 16 | Way back into a lesson is below the fold | **fixed** | After (i), then Back, the banner "עצרתם בתרגיל 3 מתוך 16. התשובות שכבר נתתם שמורות." is at the top, and the default key is "להמשיך מתרגיל 3 מתוך 16". Enter resumed at "3 מתוך 16" (`84-help-back.png`). (i) still leaves for the full Help page; it is not an overlay. |
| 17 | First lesson assumes Latin literacy | **partly** | The alphabet table now has a play button on each of the 26 rows, an "A–Z לאט" key, and IPA behind "להצגת IPA" (`10-pa1-learn-step1.png`). Vocabulary examples now carry Hebrew. Still at Pre-A1: every vocabulary card shows IPA (/ˈælfəbet/) and "noun/verb/adjective" (`10-pa1-learn-step3/4.png`). The writing task still demands "לפחות 8" words for 2–3 lines (`11-pa1-ex14-verdict.png`). |
| 18 | Settings have no learning-support controls | **partly** | "תמיכה בלמידה" is now the first section: text size, Hebrew explanations, speech speed, game sounds and "קצב רגוע" (on by default) (`70-settings-150-top.png`, `70-settings-150-mid.png`). There is still no in-app reduced motion, line or letter spacing, or font choice. At 130–150% the Hebrew-explanations control itself is broken (N1). The page is still 6,457 px at 150%. |
| 19 | Dialogues and messages run together | **fixed** | The pa1-01 e8 dialogue is one speaker per line: "Ella: … / Tom: … / Ella: …" (`11-pa1-ex09-verdict.png`). The memory line reads "מילה, ball. מילה, bag. ✕ לא זוג." (`63-mem-after-4s.png`). |

Summary: 10 fixed, 9 partly, none not fixed, no regressions.

## New findings

### N1. Major: the Hebrew-explanations switch is unreadable at 130% and 150% (`#/settings`, "תמיכה בלמידה")
The five-option control "לפי הרמה / מלא / חלקי / בלחיצה / כבוי" squeezes each option into about 50 px. "לפי הרמה" wraps onto two lines, and "בלחיצה" runs into "כבוי". On screen it reads "כבויבלחיצ" (`72-seg-150.png`). Measured at 150%: "בלחיצה" needs 82 px and has 50; at 130% it needs 71 px and has 53. This is the most important setting for my learners, and it breaks at exactly the text sizes they choose.
**Suggestion:** at 130% and above (or below 30rem), show this control as a vertical list of radio rows, or as a 2+3 grid like the text-size control above it.

### N2. Major: memory-game levels are still gated by working memory (`#/games/memory/1`, end screen)
I found 6 of 6 pairs. The screen then said "60 נקודות / 60 · 6 זוגות ב-14 תורות (55% דיוק)", "5 פעמים נבחר קלף אחר אף שהזוג כבר נראה" and "רמה 2 נפתחת ב-70% דיוק" (`66-mem-done-100.png`). The penalty has gone, but the gate and the tally have not. A learner with a working-memory difficulty knows every word and is still told 55% and kept at level 1. A full score next to 55% is also confusing.
**Suggestion:** in calm mode, unlock by pairs found, or by rounds finished. Drop the slip sentence, or move it into the speed-challenge mode. Call the turns figure "תורות", not "דיוק".

### N3. Minor: an "almost" spelling stays green in the field (`#/lesson/a1-01` e7, 130%)
I typed "evrey … in". On the first check "evrey" turned **green**, and only "in" was discussed. After the second try the footer said "המילה נכונה; האיות: every", but the field still showed "evrey" on a green background (`26-a1-gap-second-130.png`). The misspelled form is the last thing the learner sees, in the "correct" colour. The amber letter marks that were planned for "almost" did not appear in the gap.
**Suggestion:** show "almost" words in amber, with the differing letters marked. After the check, show the right spelling inside or under the field ("evrey → every").

### N4. Minor: the capital-letter task shows the answer in small letters (`#/lesson/pa1-01` e6)
The task asks which words need a capital. After the check, the "Capital (A)" bin shows "israel", "london", "maya" and "i" in lower case with green ticks. The answer line says "Capital (A): i, maya, london, israel" (`11-pa1-ex06-verdict.png`, `15-cat-verdict.png`). Israel, London, Maya and I are never shown capitalised, in the very task that teaches it.
**Suggestion:** after the check, render placed items in the Capital bin with their capital letter ("israel → Israel"), and write the answer line the same way.

### N5. Minor: the picture game still takes points for a wrong pair in calm mode (`#/games/pictures/1`)
A wrong pair shows red "לא מתאים. נסו שוב. (פחות 3 נקודות)" (`51-pic-wrong.png`), and the result reads "12 × 10 − 1 × 3 = 117". The hub says "וטעות מורידה 3". The other two games no longer penalise in calm mode, so this one is inconsistent.
**Suggestion:** in calm mode, no deduction. Keep "נסו שוב" and count accuracy separately.

### N6. Minor: a self-corrected answer is listed as a plain mistake (`#/lesson/a1-01`, end screen)
I typed "xx", got the hint, used "לנסות שוב" and answered correctly ("נכון"). The end screen still lists "כתבתם: ~~xx~~ → We live in Jerusalem…" in red and green, exactly like answers I never fixed (`24-a1-summary-p2.png`). The second try is the best moment in the new flow, and the summary does not acknowledge it.
**Suggestion:** label such items "תיקנתם בעצמכם" in a neutral style, and keep the red strike-through for answers that stayed wrong.

### N7. Minor: the 12-card memory board does not fit at 150% (`#/games/memory/1`)
At 150% the grid starts at y = 472 px and is 460 px tall. The fourth row is below the 844 px screen, and an empty band sits above the grid (`67-mem-150.png`). Scrolling during a memory game breaks the spatial memory the game depends on. The 8-card board fits (ends at 814 px), but it is a small link in the instruction text.
**Suggestion:** at 130% and above, offer the 8-card board first (or default to it), and remove the reserved empty band above the grid.

### N8. Minor: learn steps differ between lessons and do not adapt to text size (`#/lesson/a1-01` learn)
a1-01 has 8 steps, and at 150% each is 1,014–2,156 px tall. Every step says "כ-5 דק׳ קריאה", so the estimate does not change with the content (`22-a1-learn-150-step*.png`). For an ADHD learner, eight screens of 2.5 phone heights each is not "short".
**Suggestion:** cap a step at about one screen of text at the chosen size (split more, or fold examples behind "עוד דוגמה"), and compute the reading time per lesson.

### N9. Polish: word-quiz feedback has a harsher tone than the lessons (`#/games/A1/1`)
A wrong answer gets a red box titled "לא נכון". Lessons say "לא בדיוק". The option keycaps "1–4" still show on a touch phone (`44-wq-k0-after4s.png`).
**Suggestion:** use "לא בדיוק" and a neutral border, and hide the keycaps on touch, as planned.

### N10. Polish: "תחזור בעוד דקה" seven times on the review end screen (`#/review`)
After 7 misses, each card says "תחזור בעוד דקה" (`32-review-end.png`). Some learners read this as an instruction to wait a minute, or as a threat.
**Suggestion:** one line above the list ("המילים האלה יחזרו עוד היום"), and no repeated label.

## What I liked (keep this)

- **The second try on typed answers** is exactly what I asked for: "עוד לא. אפשר לתקן בעצמכם", a specific hint, my text kept, and "לנסות שוב" as the default with "להציג את התשובה" next to it (`11-pa1-ex11-verdict.png`).
- **Matching** that finishes itself, forgives one slip in amber, and ends as clear "B — b" rows with audio (`11-pa1-ex03-verdict.png`).
- **The calm pace by default** in all three games: no timers, no auto-advance, and the speed challenge opt-in and clearly worded on the hub.
- **Hebrew leads at Pre-A1/A1**, and the English duplicate is folded behind "EN".
- **The learn stage starts with "מלכודת לדוברי עברית"** and tappable audio for I, Noa and Haifa, and the alphabet has audio on every row plus slow A–Z.
- **LTR sentence cards at 150%**, a progress bar that survives large text, and no mistake tally in the header.
- **Review that selects, then checks**, and an end screen that lists the missed words with audio and a "לשחק במילים האלה" path (`32-review-end.png`).
- **Resume that respects the learner**: the banner on top, and Enter continues from the same exercise.
- Still true from last time: "לא יודע/ת" and "לא יכול/ה לדבר כרגע" everywhere, "תרגול דיבור לא מקבל ציון", the daily part stop with "לעצור כאן", and "יום חופש לא מוחק כלום".

## Top 3 wishes now

1. **Finish the working-memory fix in the memory game:** unlock by pairs found, no slip tally, and an 8-card default at large text.
2. **Large text that never breaks:** the Hebrew-support control at 130–150%, learn steps sized to one screen, and English sentence-final full stops kept with their English.
3. **Show the right form, never the wrong one in green:** amber with letter marks for "almost" spellings, capitalised answers in the capitals task, the fix next to struck-through sentences, and credit for self-corrections in the summary.
