Simulated review (AI persona), not real user research.

# Teacher panel, round 3 re-test: adult EFL teacher, beginner path (Pre-A1 to A2)

## Who I am

An adult EFL teacher with 15 years of classes for Hebrew-speaking adults, in community centres and workplace courses. I know the usual Hebrew L1 interference: th, w/v, short and long vowels, adjective order, articles, present simple vs progressive, "I am agree", the missing present-tense be, and prepositions. A few hours ago I reviewed Lucid in this role (`docs/qa/panels-r3/teacher-adult-efl.md`). This is the re-test of the new build.

## What I did

Phone 390x844, touch, Hebrew UI, he-IL, 100% text, light theme, no English voice in the browser (`speechSynthesis.getVoices()` = 0). All screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/teacher-adult-efl/`, and the file names are given below.

1. `#/` → `#/start` as a zero beginner: "Miri", 1979, work and travel, 20 min, "start from zero", terms (`01-welcome` … `06b-after-full`). This led straight into `pa1-01`.
2. `pa1-01` in full: all 5 learn steps, then the exercises with one deliberate E/I mistake (Kinji). Then the end screen and Today (`pa101-*`).
3. `pa1-02` with Hebrew-speaker errors: ship for sheep, vet for wet, "I don't know" on sit/seat, and "I tink so, tanks!" followed by a second try "I sink so, sanks!". Then Today (`pa102-*`, `zero-today-after-pa102`).
4. Pitfall boxes captured in the learn steps of `pa1-01`, `pa1-02`, `a1-04` and `a2-01` (`pit-*`, `z-pit-*`).
5. A fresh A1 learner did `a1-02`, `a1-07`, `a1-11` and `a2-02` with the same L1 errors as last time, using the new second try (`a102-*`, `a107-*`, `a111-*`, `a202-*`).
6. `#/review` with the clock moved 3 days ahead: 14 cards (`rev-p3-*`).
7. `#/progress`, then `#/drill?error=word-order` and `#/drill?error=article`, listing all 8 items of each and typing one wrong answer (`progress`, `drill-*`).
8. Real-Life: `rl-work-first-day-intro` and `rl-hotel-checkin-basics`. Scripted turns used select-then-check, and I wrote my own replies with L1 errors (`rl-*`).
9. Games hub, word quiz `#/games/A1/1` (I waited 5 s on a verdict), `#/games/pictures/1` and `#/games/memory/1` (a mismatch held for 2.5 s) (`games-hub`, `game-*`).
10. `#/speaking` and the `pa1-02` e1 listening item, both with no English voice (`speaking-*`, `pa102-e1-noplay`).

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| 1 | Bidi breaks sound-symbol / word pairs | **partly** | Fixed where it mattered most. The pa1-02 pitfall now keeps `cat (/æ/)`, `cut (/ʌ/)` and `bet (/e/)` each in one isolate, with "ב-" outside it (`z-pit-cat.png`). "Anna: A, double N, A." reads in order (`pa101-learn2.png`). The pa1-02 end line "th: … (think, this). w: … (wet). v: … (vet)." is readable (`pa102-end.png`). Still broken: (a) the pa1-01 e5 "למה?" text "E ו-I, G ו-J" groups "I, G" into one LTR run, so the line shows "…דומה: E" and then "ו-I, G-ו .J-ו" on the next line, with ו- visually attached to G (`z-pa101-e5-why.png`). (b) The pa1-01 end bullet "A = אֵיי" wraps between "A" and "= אֵיי" (`z-pa101-end.png`). (c) In the scenario feedback, "Hi everyone, it's great to be here." breaks with "here." alone on the next line (`rl-work-first-day-intro-t0-own.png`). |
| 2 | Pre-A1 screens favour English the beginner cannot read | **partly** | pa1-01 now leads with Hebrew. The intro, the can-do lines and the exercise prompt have Hebrew at prompt size, with English under it in grey (`06b-after-full.png`, `pa101-s00-e1-q.png`). Learn paragraphs show Hebrew with an "EN" chip, and the example notes have Hebrew ("שתי אותיות זהות ברצף = double") (`pa101-learn0/2.png`). Still English-only: the rule tables. In `a1-07` step 1, the "When?" column ("one thing, the first time; any one", "we know which one (we said it before, or it's clear)", "plurals in general", "meals") is the rule itself, and it has no Hebrew (`a107-learn0.png`). See new finding N1. |
| 3 | Pitfalls hidden at the bottom, cannot be heard, never linked to mistakes | **partly** | Much better. The box "מלכודת לדוברי עברית" has its own style with a blue edge and a flag icon. It sits in step 1 next to the rule, and has ▶ chips for the words (ship, sit, sheep, seat; cat, cut, bet; wet, vet) (`pit-pa1-02-s0-0.png`, `pit-pa1-02-s1-6.png`, `pa101-learn0.png`). Wrong answers now append the matching pitfall under "למה?": in a1-07 e8/e9 the article pitfall appears after the item note (`a107-s07-e8-v.png`, `a107-s08-e9-v.png`). Not done: the targeted drills still open straight on an item with no primer (`drill-word-order.png`, `drill-article.png`), there is still no "מלכודות לדוברי עברית" page, and `hebrew_pitfalls` is still rendered only in `js/views/lesson.js`. Some pitfall boxes still have no ▶, for example the a1-04 third-person-s box with "She usually gets up" (`pit-a1-04-s0-*.png`). |
| 4 | "Word order" drill is a grab-bag with untaught grammar | **not-fixed** (deferred in plan) | `#/drill?error=word-order` after my adjective-position mistakes gave 8 items: "Where do you live?", "They were at the concert" → question, "זה תיק שחור", "never" and "often" placement, "מה את עושה מחרתיים?", "Maya (usually / go…)" and "Why we don't go to the beach tomorrow?". Only one is about adjective position. The end note is still the generic "באנגלית התואר לפני שם העצם (a big house)…" (`drill-word-order-end.png`). The article drill included the untaught superlative "זאת המסעדה הכי יקרה בעיר". |
| 5 | "Own words" in scenarios misses known L1 errors | **fixed** | "Hi, I am Miri. I am agree to work with you. Nice to know you." now shows "אולי טעות נפוצה לדוברי עברית" with two cards: "I am agree → I agree" and "Nice to know you → Nice to meet you" (`rl-work-first-day-intro-t0-own.png`). "I want room please. I have reservation." flags both missing articles. "Can you explain me…" flags "explain to me" (`rl-hotel-checkin-basics-t0-own.png`, `-t1-own.png`). The field is a 3-row textarea, and the honest line "הבדיקה הזו מחפשת מילות מפתח וכמה טעויות נפוצות…" stays. One gap remains: see N6. |
| 6 | Wrong correction gets only the model answer, no second try | **fixed** | "Sara is study English every evening." → amber "עוד לא. אפשר לתקן בעצמכם" with "לא מוסיפים is לפני הפועל…", my text kept, and "לנסות שוב" / "להציג את התשובה". "I'm the student…" → a note on "the student", and my second try "I am a student…" was marked "נכון" (`a107-s06-e7-try.png`, `-v.png`). The final verdict now shows a word diff: "Omer usually ~~is going~~ goes" (`a202-s09-e10-v.png`). The end-screen box says "כתבתם: Sara is study … → Sara studies …". Gaps remain: N4 and N5 (wrong or generic notes), and N3 (drills have none of this). |
| 7 | Listening plays silently with no English voice, and answers still unlock | **partly** | `#/speaking` is fixed. It shows the banner "בדפדפן הזה אין קול באנגלית… כפתורי התשובה נשארים סגורים ושום תוצאה לא נשמרת", and after "השמעת המילה" the fill/feel buttons stay disabled (`speaking-hub.png`, `speaking-after-play.png`). In lessons, pa1-02 e1 (ship/sheep/shop) shows only a toast, "לא שומעים? … אם בדפדפן אין קול באנגלית, התמליל מוצג אחרי הבדיקה." All three options stay answerable, and the answer is scored and counts toward the 70% pass (`pa102-e1-noplay.png`). Recorded human audio for the core minimal pairs is deferred. |
| 8 | Review distractors from a tiny pool reveal part of speech | **fixed** | In 14 cards at +3 days, the options had the same part of speech and changed from card to card. Examples: "temporary": זול/ה / זמני / נחמד/ה, ידידותי/ת / צעיר/ה. "fly": להיסגר / לטוס / לנסוע ב- / לנוח, להירגע. "work from home": four verb phrases. The right answer moved between positions 1, 2 and 4, and the flow now selects first, then "בדיקה" (`rev-p3-c0-v.png`). |
| 9 | Lesson-end "כדאי לשים לב" gives the wrong diagnosis | **fixed** | After the E/I miss: "בחרתם: ~~Kinji~~ → Kenji · האות השנייה היא E (אִי), לא I (אַיי)" (`pa101-end.png`). The verdict tag now reads "שמות האותיות", not "איות" (`pa101-s04-e5-v.png`). |
| 10 | US spelling marked wrong | **fixed** | "My mom teaches English at a high school." → "נכון" (a1-02 e11, `s3.log`). |
| 11 | "I am agree" and verb + preposition have no beginner pitfall | **fixed** | a1-01 now has "agree הוא פועל, בדיוק כמו live או work, ולכן אומרים I agree – בלי am". Preposition pitfalls are in a1-04 (listen to), a2-01 (wait for), a2-13 (explain to me) and a2-15 (arrive at). I saw the a1-04 and a2-01 boxes in the learn steps (`pit-a1-04-s1-*`, `pit-a2-01-s2-*`). |
| 12 | Picture-game vocabulary follows icons, not adult needs | **not-fixed** (deferred in plan) | Level 1 "בסיס יומיומי" board: bicycle, balloon, ball, plane. Memory level 1 includes balloon and coffee (`game-pic-1.png`, `game-mem-1.png`). |
| 13 | Word quiz rewards speed | **fixed** | The hub says "אתגר מהירות כבוי: אין שעון, והמשחק מחכה לכם" (`games-hub.png`). A right-answer verdict was still on screen after 5 s (`game-quiz-v0.png`). The results show "3 מתוך 10 נכונות (30%)" with no speed bonus. In memory, a mismatch stayed face up after 2.5 s. |
| 14 | Learner's own name not used in spelling | **not-fixed** (deferred in plan) | pa1-01 e12 is still "My name is Maya. M-A-Y-A." |

## New findings

### N1. The A1 rule tables explain the rule in English only (major)
- **Route:** `#/lesson/a1-07` learn step 1 (articles). The same pattern appears in the `pa1-02` letter table headers ("Letter / Examples").
- **What I saw:** The Hebrew paragraph above it is clear. But the table that holds the actual rule has a "When?" column in English only: "one thing, the first time; any one", "jobs", "we know which one (we said it before, or it's clear)", "there is only one", "plurals in general", "meals" (`a107-learn0.png`). The plan's decision kept "English target content (examples, options, passages, tables)" primary. These cells are not target content, though: they are meta-explanation, which is exactly what an A1 adult cannot read yet.
- **Suggestion:** Treat the "When?" (or "Use") column as meta-text. At full support, show it as Hebrew primary with English secondary ("דבר אחד, בפעם הראשונה / one thing, the first time"). Keep the Examples column English. Hebrew column headers ("מתי?", "דוגמאות") would also help.

### N2. In lessons, a minimal-pair item with no sound is still scored (major)
Recorded here as the remaining part of earlier finding 7, because the speaking lab now does it right and the lesson does not. On `#/lesson/pa1-02` e1, with no English voice, I could choose ship, sheep or shop and the answer counted toward the 70% pass (`pa102-e1-noplay.png`). **Suggestion:** Use the same rule as `#/speaking`. When the `lucid:speech` "silent" state fires for a listen item, keep the options disabled. Offer "לדלג – לא נספר" and do not record a first-try score.

### N3. Targeted drills have neither the second try nor the pitfall (minor)
- **Route:** `#/drill?error=article`.
- **What I saw:** A wrong typed answer goes straight to "לא בדיוק · התשובה הנכונה: …" with "המשך" only. There is no "לנסות שוב", no "מלכודת לדוברי עברית" under "למה?", and no primer before item 1 (`drill-article-typed.png`, `drill-article.png`). The drill page is the one built for the learner's repeated mistake, yet it now gives less help than the lesson.
- **Suggestion:** Bring LF-6 (second try) and LF-8 (pitfall in "למה?") into `runSet` in `js/ui/player.js`. Open the drill with a one-card primer taken from the matching `hebrew_pitfalls` entry.

### N4. The second-try note for th assumes s, but the learner wrote t (minor)
- **Route:** `#/lesson/pa1-02` e11.
- **What I saw:** I typed "I tink so, tanks!". The second-try note said "בשתי מילים צריך th במקום s." and the final "למה?" says "לא s… I sink" (`pa102-s10-e11-try.png`, `pa102-s11-e11-v.png`). The lesson's own pitfall says th comes out "טינק", and t is as common as s in my classes.
- **Suggestion:** Add a wrong_feedback pattern for `\btink|\btanks` with the note "כתבתם t; ב-th הלשון בין השיניים ונושפים". Or make the note neutral: "בשתי מילים צריך th".

### N5. A generic second-try note, then a "why" about the part already fixed (minor)
- **Route:** `#/lesson/a1-11` e9 ("I have a phone new.").
- **What I saw:** I typed "I have new phone." (adjective fixed, "a" dropped). The second try said only "בדקו שוב את התשובה.". The final verdict's diff correctly shows the missing "a", but "למה?" explains adjective order ("בעברית שם התואר בא אחרי שם העצם…"), which I had already got right (`a111-s08-e9-try.png`, `a111-s08-e9-v.png`).
- **Suggestion:** When there is no matching wrong_feedback, build the nudge from the word diff: "חסרה מילה אחת לפני new" or "מילה אחת מיותרת". Show the article pitfall when the diff is a missing a/an/the. Seed wrong_feedback for a1-11 e9.

### N6. The own-words check misses "I am QA engineer" (minor)
- **Route:** `#/scenario/rl-work-first-day-intro`, turn 2, "לנסות בניסוח שלכם".
- **What I saw:** "I am QA engineer. I work here from Sunday." got only "לא מצאנו את המילים שציפינו להן…" (`rl-work-first-day-intro-t1-own.png`). On turn 1, the scripted option "Hello. I am QA engineer." is flagged "jobs need 'a' or 'an'" (`rl-work-first-day-intro-t0-checked.png`). "I want room" was flagged, so the article rule seems to fire after "want/have" but not after "I am". The cards also say "שם עצם ספיר", a term most of my adult learners would not know.
- **Suggestion:** Add "I am / I'm / he is + bare singular job noun" to the L1 rules. Write "שם עצם שאפשר לספור (a car, a job)" in place of "ספיר".

### N7. Today says "done" while the first review of today's new words is optional (minor)
- **Route:** `#/today` after `pa1-01` and a failed `pa1-02` (63%).
- **What I saw:** "התוכנית להיום הושלמה (כ-35 דק׳)". "8 מילים חדשות: סבב ראשון" and "כמעט סיימת: Letter sounds" moved under "רוצים עוד? לא חובה" (`zero-today-after-pa102.png`). Before that, the pa1-01 end screen's main key had been "להמשיך בתוכנית: חזרה על מילים · 2 דק׳" (`pa101-end.png`). The counts also disagree: the end screen says 9 words entered review, and Today says 8.
- **Why it matters:** Being allowed to stop is right for adults. But the same-day first recall is the cheapest and most useful 2 minutes of the day, and it should not drop into "optional" together with games.
- **Suggestion:** Keep "done", but keep a same-day first review that has not been done as one gentle line above "רוצים עוד?" ("2 דק׳ שכדאי לעשות היום: סבב ראשון של המילים מהיום"). Align the word counts.

### N8. Games: a penalty and a commit-on-tap remain (polish)
- **Route:** `#/games`, `#/games/A1/1`.
- **What I saw:** With the speed challenge off, the picture game still says "כל זוג נכון = 10 נקודות, וטעות מורידה 3" (`games-hub.png`). The word quiz commits on tap ("הבחירה נבדקת מיד"), while lessons, review and scenarios now select first and then check. One quiz option used the long gloss "מבוגר/ת, זקן/ה; ישן/ה", which review now avoids (`game-quiz-v0.png`).
- **Suggestion:** Remove the slip penalty in relaxed mode, as was done in memory. Use select-then-"בדיקה" in the quiz, or at least make it an option. Use the short gloss in the quiz.

### N9. Typing the original sentence back leaves "בדיקה" disabled with no reason (polish)
- **Route:** `#/lesson/pa1-02` e11, second try.
- **What I saw:** On the second try I typed the source sentence "I sink so, sanks!". The Check key stayed grey, and nothing said why (`pa102-s10-e11-v.png`, captured before my runner moved on).
- **Suggestion:** Under the field, show "המשפט זהה למקור – שנו את המילים עם הטעות", or let it be checked and answer with the targeted note.

## What I liked (keep this)

- **The learn stage in short steps** ("1 מתוך 5 · כ-5 דק׳ קריאה") with the pitfall in step 1. pa1-01's longest step is 1,726 px, down from one 5,825 px page. An adult can now see the rule and the trap together.
- **The "מלכודת לדוברי עברית" box**: its own look, ▶ chips for each word pair, and a link under "למה?" when the learner makes that mistake. This is the thread I asked for. Please extend it to drills and to a reference page.
- **The second try** ("עוד לא. אפשר לתקן בעצמכם") with a real note ("לא מוסיפים is לפני הפועל…"), the learner's text kept, and a word diff on the final verdict. This is how I correct in class.
- **The end-of-lesson box** quotes the learner's own sentence ("כתבתם: Sara is study … → …") and the item's own note.
- **Own-words checks in scenarios** that name the Hebrew pattern ("I am agree → I agree", "Nice to know you → Nice to meet you", "explain me → explain to me") and stay honest about what they cannot check.
- **Review** options of the same kind, with select-then-check, so the answer has to be recalled and cannot be eliminated.
- **The calm games** and the honest speed-challenge switch. The no-voice banner in the speaking lab that records nothing.
- **Hebrew-first instructions at Pre-A1**, with English one tap away ("EN").

## My top 3 wishes

1. **Finish the pitfall thread.** Add a primer card and the second try in targeted drills. Add a "מלכודות לדוברי עברית" page linked from "טעויות שחוזרות". Put ▶ on every pitfall. Split word-order drills by sub-type and draw them only from lessons already done.
2. **Never score what could not be heard.** Lesson listening items with no voice should behave like the speaking lab. Then ship recorded audio for the core minimal pairs.
3. **Rule tables in Hebrew at A1.** The "When?" column is explanation, not target English. Also make second-try notes match what the learner actually wrote (t vs s for th, a missing "a").
