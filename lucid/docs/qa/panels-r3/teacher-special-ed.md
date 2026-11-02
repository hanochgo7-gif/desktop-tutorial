Simulated review (AI persona), not real user research.

# Teacher panel, round 3: special-education teacher (learning disabilities)

## Who I am

I am a special-education teacher. I work with Hebrew-speaking teenagers and adults who learn English and have dyslexia, ADHD or slow processing. In my lessons I look at a few things. How much has to be read, and in which direction. Whether instructions come one at a time. Whether a mistake is shown as information or as a judgement. Whether anything runs on a clock. How much has to be held in working memory. Whether every word can be heard as well as seen.

## What I did

All screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/teacher-special-ed/`, named below by file. Phone 390x844, touch, Hebrew UI, he-IL.

1. `#/` welcome. Then `#/start` as a beginner: name "Noa", year 2007, goal "אנגלית ליום-יום", 10 minutes, "אני לא יודע/ת אנגלית בכלל". I submitted once without the terms box, then accepted. This led straight to `#/lesson/pa1-01` (01 to 06).
2. `pa1-01` (alphabet): the full learn page and all 13 exercises, with deliberate mistakes. One wrong tap in each matching task. Wrong options in the listening and MCQ items. "say" and "dubble" in the gap. "B V G E" for the booking code. I skipped speaking with "לא יכול/ה לדבר כרגע" and wrote a short text. I saw the part-end screen, the resume, the retry round and the end screen (10 to 13).
3. Today, then `#/review` with the 8 new words. I answered 5 of them wrong (30, 31).
4. An A1 learner at text size 150% with reduced motion: `#/lesson/a1-01` learn and practice with three deliberate errors, and the summary (20 to 24). I compared the grammar table at 100% and 150% (25). I measured the lesson header progress bar at both sizes (86).
5. `#/lesson/a1-02`: I left mid-exercise through the (i) icon, then pressed Back (82 to 85).
6. Games at A1, 100%: hub `#/games`; word quiz `#/games/A1/1` (two rounds, fast, slow and wrong answers); words and pictures `#/games/pictures/1` (3 boards, one mistake); memory `#/games/memory/1` (one round with slips). To look at memory level 3, I unlocked it in the browser by logging two practice events, then viewed it at 100% and 150% (40 to 68).
7. `#/settings` at 100% and 150%, and `#/help` (70 to 72).
8. To understand timings and grading, I read the exercise, grading and game code (`js/ui/exercise.js`, `js/core/grading.js`, `js/views/*game.js`). I also ran `checkTyped` on typical dyslexic misspellings in Node.

## What worked for me (keep this)

- **There is always a way out that is not a failure.** Every exercise has "לא יודע/ת". Speaking offers "לא יכול/ה לדבר כרגע", and "תרגול דיבור לא מקבל ציון" sits under the self-rating buttons "אמרתי את זה בבירור / צריך עוד תרגול" (`11-pa1-ex12-speak.png`).
- **The wording of mistakes is calm and adult.** A wrong answer is "לא בדיוק", never "Wrong!". A failed lesson ends with "כמעט שם … אפשר לתרגל רק את 5 התרגילים שפספסתם, והתשובות הנכונות נשארות" (`24-a1-summary-top.png`). A passed one ends with "ענית נכון בניסיון הראשון על 80% מהתרגילים" (`13-pa1-summary.png`). The game tones are soft sine beeps, and they can be turned off.
- **Short daily parts.** "החלק של היום הושלם … המקום שלכם נשמר: בפעם הבאה ממשיכים מתרגיל 8 מתוך 13". "לעצור כאן" is the default button (`11-pa1-partstop.png`). This is exactly what an ADHD learner needs.
- **Multisensory listening.** The audio plays once by itself. There are buttons for "השמעה" and "לאט" (turtle), and "תמליל: The letter is J." appears after the check (`11-pa1-ex02-verdict.png`). Letter tiles in the matching task each have a play button, and the Hebrew letter names carry niqqud (`11-pa1-ex1-match-wrongtap.png`). Speech speed "איטית" is in Settings.
- **The dictation diff marks only the wrong letter.** "B V **J** E" has a wavy red mark under J (`11-pa1-ex11-verdict.png`).
- **The games have good bones.** Pictures are big (4 pairs on a board), each matched word is spoken, and the Hebrew appears under the picture after the match (`52-pic-board0-done.png`). In the memory game the second card is named in text ("לא זוג. מילה: cake"), which supports memory. The word quiz does not count listening time against the learner ("Listening does not cost speed points"), and stages unlock by accuracy, not score. The end screens list missed words with picture, word, Hebrew and audio, plus "להוסיף לחזרה המרווחת" (`66-mem-done-board.png`, `45-wq2-summary.png`).
- **Review lets the learner overrule the machine.** A typed Hebrew meaning that was judged wrong gets "התכוונתי לזה – זה נכון".
- **No streak guilt.** "יעד שבועי: 1 מתוך 5 ימים. יום חופש לא מוחק כלום." (`30-today-after-pa1.png`).
- **The basics help.** Reduced motion is respected globally in CSS. Text size 150% scales everything. Touch targets are at least 44 px. Line height is 1.55 (1.6 for Hebrew). "ישר לתרגול" lets a learner skip the explanation.

## What did not work

### 1. Major: the sentence table reads backwards (`#/lesson/a1-01`, learn)
The present-simple table has the columns "Who? | Verb | The rest | עברית". It inherits the page's RTL direction, so "Who?" is the rightmost column (DOM: `direction: rtl`, the "Who?" header at x=289, "The rest" at x=117). Read left to right, as English must be, the first row shows "in a bank. · work · I" (`25-a1-table-100.png`). At 150% the Hebrew column moves off-screen to the left, the "The rest" column is cut by a fade, and a note says "הטבלה רחבה מהמסך: גללו אותה הצידה" (`22-a1-learn-part1.png`). For a dyslexic reader a reversed sentence is the worst possible model.
**Suggestion:** give tables whose columns build an English sentence `dir="ltr"` (Who, Verb, The rest from left to right) and put the Hebrew column last or under each row. At 130% and above, show each row as a stacked card.

### 2. Major: Hebrew source sentences are marked as English (`#/lesson/a1-01`, exercise 9 "תרגמו לאנגלית")
The Hebrew sentence "אנחנו גרים בירושלים ועובדים בתל אביב." is rendered left-aligned and the full stop lands on the wrong side (`23-a1-k08.png`). In code, `transform` puts the source in `<p class="ex-text" lang="en" dir="ltr">` whatever its script. A screen reader or read-aloud tool will also use an English voice for Hebrew text.
**Suggestion:** set `lang`/`dir` from the script of the source: Hebrew sources get `he`/`rtl`.

### 3. Major: mixed Hebrew–English lines break into reversed fragments (several screens)
- The `a1-02` objective "…כ-/s/, /z/ או /ɪz/: works, lives, watches." displays as "/s/, /z/ או" and then ".z/: works, lives, watchesɪ/". The IPA is cut in half, and "ɪ/" is glued to "watches" (`85-ipa-bidi-crop.png`).
- In the `a1-01` summary at 150%, the lines end in ".Mondays" and ".am/is/are" (`24-a1-summary-top.png`).
- In the `a1-01` title at 150%, "I," sits alone on the first line of "הווה פשוט: I, you, we, they" (`22-a1-learn-part0.png`).
- In the `pa1-01` warm-up, "OK," is stranded at the end of a line, away from "USB, PDF, DJ" (`06c-tip-crop.png`).

Readers who already struggle with direction cannot recover the order.
**Suggestion:** isolate every English or IPA run together with its slashes and trailing punctuation (`<bdi>`/FSI), and keep short runs on one line (`white-space: nowrap`). Better still, put English examples on their own line under the Hebrew sentence.

### 4. Major: one slip makes a whole matching task wrong, and the pairs are never shown (`#/lesson/pa1-01`, exercises 1 and 3)
I tapped one wrong pair, then matched all six correctly. The footer turned red with "לא בדיוק · ניסיון שגוי אחד", and the task went into the retry queue (`11-pa1-ex1-match-wrongtap.png`, `11-pa1-ex01-verdict.png`). Exercise 3 is B/D/P/Q against b/d/p/q, the exact confusion of dyslexia, so these learners will fail it by design. After matching, the paired tiles fade to 45% opacity (computed `opacity: 0.45`) and stay in their shuffled columns. The screen never shows "E = אִי" side by side, even after a fully correct round (`12-pa1-retry-verdict.png`).
**Suggestion:** give partial credit ("5 מתוך 6 בניסיון הראשון") in a neutral colour. When the task is done, reorder the columns so each pair sits on one row (or merge each pair into one chip with its play button), at full contrast.

### 5. Major: speed bonuses in all three games (`#/games`, `#/games/A1/1`, `#/games/pictures/1`, `#/games/memory/1`)
The hub announces "בונוס מהירות לכל תשובה נכונה: 3s +5, 6s +3, 10s +1; בהקלדה: 8s +5…". In my word-quiz round, 31 of 101 points were speed ("7 × 10 = 70, ובונוס מהירות 31"). The maximum is 150, and 50 of that is speed. A slow processor with 10 out of 10 right can reach only 100/150, which looks like 67% (`45-wq2-summary.png`). The picture game adds "בונוס מהירות 5+" per board, and the memory game rewards few turns. There is no setting to turn any of this off. This contradicts PRODUCT.md, which says "no time pressure except opt-in timed writing".
**Suggestion:** make speed bonuses opt-in (a "אתגר מהירות" switch, off by default), and show the score as accuracy out of 100.

### 6. Major: the games move on by themselves (word quiz and pictures)
After a right answer the word quiz shows the pair, an example ("The days get shorter in the autumn.") and a "לשאלה הבאה" button. All of it disappears after 1.1 s; my check at 1.3 s found the feedback gone (`44-wq2-k0.png`). A finished picture board moves on after 2.5 s. A slow reader cannot read the example. An ADHD learner sees a button vanish just as they reach for it.
**Suggestion:** add a setting "מעבר אוטומטי" (on/off). When it is on, use at least 3 to 4 s and pause on touch. When it is off, the "next" button waits.

### 7. Major: the memory game punishes memory weakness (`#/games/memory/1` and `/3`)
- A "פספוס" costs 3 points, with the message "הזוג של הקלף הראשון כבר נראה (פחות 3 נקודות)" (`65-mem-slip.png`).
- Level 2 opens only at 70% "accuracy", and accuracy is pairs / (pairs + slips). My round of 6 pairs with 4 slips scored 60%, so the level stayed locked.
- "מילים לחזור עליהן" then listed ball, lamp, clock and rabbit as words to study (`66-mem-done-board.png`). These were location slips, not vocabulary gaps.
- A mismatch turns back after 1.3 s.
- Level 3 has 20 cards. At 100% the word text is 11 px ("stethoscope" at 11.0 px, `68-mem3-100.png`). At 150% the grid is 1,258 px tall and must be scrolled during play (`68-mem3-150.png`).

**Suggestion:** drop the slip penalty, or keep it only in an optional challenge mode. Unlock by pairs found. Keep a mismatch face up until the next tap. Offer a 4-pair board. Set a 14 px minimum for words on cards. List only words the learner actually could not match.

### 8. Major: the lesson progress bar disappears at 150% (`#/lesson/*`, header)
At 100% the bar is 103 px wide. At 150% it is 2 px, because the counter "4 מתוך 15 · 1 לחזרה" takes 197 px (`86-progress-100.png`, `86-progress-150.png`). The people who choose large text lose the visible progress that the product promises.
**Suggestion:** move the counter under the bar, or shorten it to "4/15", and give the bar a minimum width.

### 9. Major: the learn pages are one very long scroll (`#/lesson/pa1-01`, `#/lesson/a1-01`, learn)
The `pa1-01` learn page is about 5,800 CSS px at 100%, roughly 7 phone screens. It holds a bilingual paragraph, a 26-row table with an IPA column, four explanation blocks each in Hebrew and then English, 8 example cards, pitfalls and 9 vocabulary cards (`10-pa1-learn-part0.png` to `part6`). The `a1-01` learn page at 150% is about 10,800 px. Meanwhile the footer says "הסבר קצר, ועכשיו מתרגלים." (`25-a1-learn-viewport-150.png`). Nothing breaks this into steps, and nothing shows how much is left.
**Suggestion:** chunk the learn stage into cards, one idea per screen, with step dots ("2 מתוך 5"). Make vocabulary its own step, or move it into the exercises.

### 10. Major: in instructions the Hebrew is the weaker line, and everything is read twice (all exercises at Pre-A1/A1)
The Hebrew instruction is 17 px, regular weight, blue. The English line under it is 20 px, semibold, black (measured on `pa1-01` exercise 1, `11-pa1-ex02-mcq.png`). A learner who "doesn't know English at all" reads the weaker line and must skip the dominant one. The same Hebrew-then-English doubling runs through objectives, warm-ups, explanations and "מה לזכור" (`06-after-onboard.png`, `13-pa1-summary.png`). The Hebrew-support setting can only reduce Hebrew; nothing hides the English translations.
**Suggestion:** at "full" support, make Hebrew the primary line (dark, larger) and fold the English translation of instructions and explanations behind an "EN" tap, the mirror of the existing "עב". Keep English examples visible.

### 11. Minor: spelling tolerance does not fit dyslexic spelling (`#/lesson/pa1-01`, exercise 8)
"dubble" for double was marked plainly wrong, red like the meaning error "say", and the feedback spoke only about "say" (`11-pa1-ex09-verdict.png`). In Node, `checkTyped` accepts "dobule" and "bouble" as "almost" (one edit or one swap), but rejects phonetic "dubble" (two edits). Words under 5 letters get no tolerance at all.
**Suggestion:** accept two edits for words of 6 letters and more, or use phonetic similarity, with a note like "המילה נכונה; האיות: double". Add an accommodation setting "לא לבדוק איות" for learners with a diagnosis.

### 12. Minor: one try only, and option taps behave differently in different places (`#/lesson/*` MCQ, `#/review`, `#/games/A1/1`)
In lesson MCQs a wrong pick reveals the answer at once, with no second try or hint first. That goes against "hints before answers" (`11-pa1-ex02-verdict.png`). Lessons use tap to select, then "בדיקה". Review and the word quiz commit on the first tap (`31-review-k1-v.png`), so an impulsive tap there is final and red.
**Suggestion:** use one pattern everywhere (select, then check), or offer a confirm-before-check setting. In lessons, allow a second attempt with the first choice struck through.

### 13. Minor: a running mistake count in the lesson header (`#/lesson/pa1-01`)
The header reads "6 מתוך 13 · 3 לחזרה" and grows with each mistake (`11-pa1-ex06-cat.png`). For an anxious learner this is a live error tally.
**Suggestion:** hide it during the first pass. The retry round already announces itself ("חוזרים 1 מתוך 6").

### 14. Minor: green ticks on wrong sentences (`#/lesson/a1-01`, exercise 3 "Correct or wrong?")
After checking, the sentences I put correctly in "Wrong" show a green ✓: "✓ They lives in Eilat.", "✓ My parents drinks coffee." (`23-a1-k02-v.png`). A learner who encodes visually sees the incorrect form marked green.
**Suggestion:** in the "Wrong" bin, strike through the error and show the fix next to it ("They ~~lives~~ live in Eilat.").

### 15. Minor: the picture game consolidates picture and Hebrew, not picture and English (`#/games/pictures/1`)
After a board the picture tiles show "עין, ספינה, ענבים, ירח". The English words stay in a separate grid (`52-pic-board0-done.png`), so the last thing seen next to each picture is the Hebrew, not the target word.
**Suggestion:** after the match, print the English word on the picture tile, with the Hebrew smaller underneath.

### 16. Minor: the way back into a lesson is below the fold (`#/lesson/a1-02`)
The (i) icon in the lesson header opens the full Help page. When I came back, "עצרתם באמצע: 2 מתוך 16 / להמשיך מאיפה שעצרתי" sat under the objectives and the warm-up, below the fold at 390x844. The sticky Enter button said "בואו נלמד" (`84-help-back.png`, `84b-help-back-full.png`).
**Suggestion:** put the resume banner at the top and make it the Enter default. Open Help as an overlay inside the lesson.

### 17. Minor: the first lesson assumes the learner can read Latin script (`#/lesson/pa1-01`)
Vocabulary cards show English-only example sentences ("Z is the last letter of the alphabet."), IPA on every card and the labels noun/verb/adjective (`10-pa1-learn-part5.png`). The alphabet table has a "Name (IPA)" column (/eɪ/) but no play button per letter (`10-pa1-learn-part0.png`). The lesson ends with "כתבו 2-3 שורות" with a target of 8 to 40 words (`11-pa1-ex14-textarea.png`). Four scripts in one table (Latin, IPA, pointed Hebrew, English in brackets) is heavy for a dyslexic beginner.
**Suggestion:** add a play button to each alphabet row, hide IPA at Pre-A1 behind a toggle, add audio or Hebrew to the vocabulary examples, and keep the first writing task to name and city.

### 18. Minor: settings have no learning-support controls (`#/settings`)
There is text size, slow speech and a game-sound switch. There is no in-app reduced motion (OS only), no auto-advance switch, no timers or speed-bonus switch, no line or letter spacing, no font choice, and no way to hide English translations. At 150% the page is about 6,300 CSS px, and the useful options are scattered inside "ממשק" (`71-settings-150.png`, `71-settings-150-mid.png`).
**Suggestion:** add a "תמיכה בלמידה" section at the top that brings these together.

### 19. Polish: dialogues and messages run together
The `pa1-01` exercise 8 dialogue is one paragraph: "Ella: My name is Ella. Tom: Sorry, how do you ___ that? Ella: E, ___ L, A." (`11-pa1-ex09-verdict.png`). It should be one line per speaker. The memory-game slip message reads "תמונה: כוכב הזוג של הקלף הראשון כבר נראה" with no break between the card name and the next sentence (`65-mem-slip.png`).

## Top 3 wishes

1. **One "learning support" switch**, offered in onboarding and in Settings. It would bring together: no speed bonuses or timers, no auto-advance, no memory-slip penalty, Hebrew-first instructions with English folded, learn pages in short steps, and phonetic spelling tolerance.
2. **Fix text direction everywhere English appears inside Hebrew.** That means LTR sentence tables, `he`/`rtl` on Hebrew source sentences, isolated IPA and English runs, and a progress bar that survives 150%.
3. **Mistakes that teach pairs instead of tallies.** Show matched pairs side by side, give partial credit and a second try before the answer, and build "words to review" only from real vocabulary errors.
