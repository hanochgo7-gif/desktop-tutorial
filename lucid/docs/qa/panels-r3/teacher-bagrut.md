Simulated review (AI persona), not real user research.

# Teacher panel (round 3): high-school English teacher, Bagrut 3, 4 and 5 units

## Who I am

An AI playing an Israeli high-school English teacher with 20 years of preparing students for the Bagrut at 3, 4
and 5 units. I care about reading comprehension of unseen texts, access to text for weaker readers, written
answers and short writing tasks, and whether a tool teaches or only marks. I am deciding whether I would
recommend Lucid to my students, and what would have to change first.

Screenshots and scripts are in
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/teacher-bagrut/`
(below, only the file name is given). All runs: Playwright Chromium, he-IL, Hebrew UI, light mode; desktop
1280x860 unless a 390x844 phone is mentioned. Speech does not work in headless Chromium, so listening and
speaking screens were judged by flow and wording only. Numbers such as "5 of 399" below are counts I made myself
over `content/lessons/*.json`; nothing here comes from real students.

## What I did

1. **Curriculum.** Read `content/curriculum.json` (75 lessons, finals per level) and tallied exercise types,
   reading-question types and listening lengths over all lesson files.
2. **Onboarding as one of my 11th-graders** (`#/start`): Noa, born 2009, goals "בגרות, פסיכומטרי ולימודים
   אקדמיים" and "כתיבה אקדמית וטיעונית", 20 minutes, start "אני די בנוח/ה: קורא/ת וכותב/ת לא רע". Shots 01 to 06.
3. **Placement** (`#/placement?start=comfortable`), answered as a solid B1 reader: 12 questions, result B1.
   Then `#/today` and `#/path`. Shots 07, 08, 09, 10.
4. **Three full lessons**, every exercise, with wrong answers on purpose (the errors my students really make):
   - A2 `#/lesson/a2-05` "Past simple: irregular verbs" (wrong: e3, e6, e8, e10, e13). Shots `a2-05-*`.
   - B1 `#/lesson/b1-02` "Present perfect or past simple?" (wrong: e2, e7, e8, e9, e11, e13), and a second run
     where I pressed "גם התשובה שלי נכונה" on a wrong rewrite. Shots `b1-02-*`, `b1-02self-*`.
   - B2 `#/lesson/b2-09` "Reading critically" (wrong: e2, e8, e10). Shots `b2-09-*`.
5. **Level check** `#/checkpoint/B1` on a phone, about one answer in four wrong. Shots `cp-*`, log `cp-log.txt`.
6. **Reading and listening centres** (`#/reading`, `#/listening`), and a B1 text from the reading centre on a
   phone at 130% text (`rd-b1-10-130-*`).
7. **Writing**: lesson writing tasks, the Writing lab list (`#/writing`), the B1 opinion task
   `#/writing/we-06` with a 139-word student text full of typical Israeli errors, `#/writing/final-B1`,
   `#/writing/free`. Shots `w-we06-*`, `hub-writing*`.
8. **Games**: `#/games`, the B1 word quiz (stages 1 and 2), the picture and memory games. Shots `quiz-B1-*`,
   `hub-games*`.
9. **Hebrew grammar explanations**: read the Hebrew of a2-05, a2-07, a2-11, b1-02, b1-05, b1-06, b1-07, b1-08 and
   b2-02 line by line, in the app and in the JSON.

## What worked for me (keep this in any redesign)

- **The Hebrew grammar explanations are accurate, clear and genuinely contrastive.** I found no errors. They
  explain exactly the mistakes I correct every week, in the way I would: b1-06 "The house built in 1950 –
  שמשמעו שהבית בנה משהו!"; b1-08 the resumptive pronoun ("הספר שקראתי אותו" → the book (that) I read); b1-05
  "'הייתי עושה' זה I would do, ולא I was doing"; a2-11 "How much money you have?"; b1-07 "נועה אמרה שהיא
  עייפה" vs Noa said she was tired; a2-07 "בעברית אין 'להיות' בהווה". This is the strongest thing in the product.
- **Anticipated-error feedback.** Typed answers are matched against the errors Hebrew speakers actually make, with
  a targeted note: a2-05 e13 "drove means you were the driver. On a bus, say I went by bus" (`a2-05-ex-12-*`);
  b1-02 e13, for a literal translation of "אני מכירה את נועה כבר עשר שנים": "Hebrew uses the present here, but
  English needs the present perfect for a situation that started in the past and continues"
  (`b1-02-ex-12-e13-transform-WRONG.png`). In the content files the same care shows everywhere (a2-05 e10 has
  "Change the second verb too: has → had" for a half-corrected sentence).
- **Reading answers point back to the text.** Every reading question explains itself with the quoted sentence
  ("בטקסט: We took the early train to Haifa. take → took", `a2-05-ex-05-e6-read-WRONG.png`). That teaches the
  habit I spend months building: go back and find the line.
- **The B2 "Reading critically" lesson** (fact vs opinion, loaded language, the writer's purpose, selective
  evidence, two opinion pieces side by side, `b2-09-log.txt`) is excellent 5-unit material and better than most
  textbook units on the same skill.
- **Mediation tasks** (a2-03, a2-08, a2-11, b1-04, b1-07, b1-11: a Hebrew message to pass on in English to a
  friend who doesn't read Hebrew) are realistic for Israeli students and rare in other products.
- **Lesson writing tasks at Bagrut-like lengths and genres**: B1 lessons ask for 80-130-word emails, forum posts,
  blog comments and stories with a checklist and a model answer. In the Writing lab the model answer stays closed
  "אחרי הבדיקה או המשוב הראשונים, כדי שתכתבו קודם בעצמכם" (`w-we06-00.png`). Exactly right.
- **Honest placement and progress.** Per-skill results, "לא נבדק במבחן הזה" for speaking and writing, "לא
  יודע/ת עדיף על ניחוש" (`08-placement-result.png`); the level check promises "אפשר לנסות שוב מתי שרוצים. אין
  עונש." No streaks, no guilt.
- **Missed items come back at the end of the lesson**, and "לתרגל את 6 הטעויות" redoes only those
  (`a2-05-99-end.png`). Good retrieval practice with no shaming.
- **Access to text**: "הקראת הטקסט" on every reading text, slow audio everywhere, 130% text works on a phone
  without horizontal scroll (`rd-b1-10-130-0.png`). Valuable for my students with reading accommodations.
- **Word quiz feedback** shows the pair and an example sentence, and offers "להוסיף את המילה לחזרה המרווחת"
  (`quiz-B1-s1-end.png`).

## What did not work (findings)

### F1. The B1 level check has no reading at all, and reuses lesson items word for word (major)
Route `#/checkpoint/B1`. The intro promises "16 שאלות מכל נושאי הרמה" and "כך רואים מה באמת יושב"
(`cp-00-intro.png`). My 16 items (`cp-log.txt`): 13 grammar, 1 listening, 1 dictation, 1 paragraph-ordering;
**no reading text and no vocabulary item**. `js/core/pool.js` builds the check from `AUTO_TYPES`, which leaves
out `read`, so a reading text can never appear. The items are also the lesson exercises themselves: "I live in
Tel Aviv since 2020." (b1-02 e11), "Have you ever ___ sushi?" (b1-01 e3) and the "Has your brother ever ridden a
horse" ordering (b1-01 e12) were all ones I had just done in the lessons. Passing therefore partly measures
memory of items, and says nothing about what my students are examined on.
**Suggestion:** reserve a separate item bank per level that never appears in lessons, and include at least one
unseen reading text with 4-6 questions (and one vocabulary-in-context set) in every level check.

### F2. Reading questions are almost all closed and literal; the Bagrut skills are rare (major)
All 73 lesson reading tasks use only `tf`, `mcq` and one-word `gap` questions; there is no open question
("Answer in English", "Copy the words that show...", "Give two reasons"). By my keyword count over 399 reading
questions, only 5 ask what a word refers to, 4 ask for the main idea or purpose, and 8 ask for a word's meaning
in context. Most are detail retrieval or the lesson's grammar point in the text (b1-02 Q3 "Why does Maya write
'I bought an old camera' and not 'I've bought an old camera'?", `b1-02-ex-07-e8-read-WRONG.png`). Passages have
no line or paragraph numbers, so a question can never send the student to "line 12". These are the question
types my students lose points on.
**Suggestion:** add reference, inference, main-idea and word-in-context questions to every B1+ text; number the
paragraphs; add a short open-answer type with a model answer and a self-check list (the same pattern the
writing tasks already use).

### F3. "גם התשובה שלי נכונה" lets a wrong sentence count as 100% (major)
Route `#/lesson/b1-02`, exercise e11 "Find the mistake and write the sentence correctly: I live in Tel Aviv since
2020." I typed **"I did lived in Tel Aviv since 2020."**. The verdict is amber, not red: "לא אחת מהתשובות שלנו
... אם התשובה שלכם אומרת את אותו הדבר ועושה מה שהמשימה מבקשת, אפשר לספור אותה" with a one-tap button "גם
התשובה שלי נכונה" (`b1-02-ex-10-e11-correct-WRONG.png`). Pressing it gives "נספר כנכון", and with that being my
only error the lesson ends "ענית נכון בניסיון הראשון על 100% מהתרגילים" (`b1-02self-ex-10-e11-SELFJUDGED.png`,
`b1-02self-log.txt`). A 16-year-old who believes "did lived" is fine will press the button every time. The
lesson summary does not say that one answer was self-marked.
**Suggestion:** before the button, show a word-level diff against the model and ask one concrete question tied to
the item ("Does your sentence use have + past participle (V3)?"); only offer self-credit when the answer passes
basic checks (no double past forms, required structure present); and mark self-judged answers in the score line.

### F4. A wrong typed answer reveals the full answer at once; there is no second try (major)
In every lesson, a wrong typed answer immediately shows "התשובה הנכונה: ..." with the explanation, and moves on
(the lesson's own header comment: "Wrong answers show the right answer at once"). Example a2-05 e10: the
excellent authored nudge "Change the second verb too: has → had" and the full corrected sentence appear
together, so the student copies instead of thinking (`a2-05-ex-09-e10-transform-WRONG.png`; also b1-02 e13
`b1-02-ex-12-e13-transform-WRONG.png`). The "רמז" button exists only before the first attempt. PRODUCT.md
promises "hints before answers, the learner fixes their own mistakes"; the item comes back once at the end, but by
then the answer has been seen.
**Suggestion:** on a first wrong typed answer, show only the matched targeted note (or the hint) and keep the
field editable for one more attempt; reveal the answer after the second miss or on "לא יודע/ת".

### F5. The automatic writing check misses the most common Israeli errors and sounds complete (major)
Route `#/writing/we-06` (B1, 120-180 words). My 139-word text had about 14 typical errors. The check reported
"הבדיקה מצאה 4 דברים לבדוק": "I am agree", "a old", "more better", "In the other hand" (`w-we06-01-checked.png`).
It missed every subject-verb agreement error ("volunteering give", "every school need", "The old people was"),
missing articles ("it is very important thing", "I was volunteer"), "there CV", "alot", "dont", "for find a job",
"one hour in week". The small print "הן יכולות לפספס טעויות" is honest, but the headline count invites a weak
writer to think the rest is clean. With AI feedback off on this site, this check is all the feedback a student gets.
**Suggestion:** add rules for third-person -s after singular subjects and "every/each", "people was", alot,
dont/doesnt/didnt without an apostrophe, their/there/they're before a noun, "for + base verb"; and reword the
headline to "מצאנו 4 מהדברים שאנחנו בודקים. קראו שוב ובדקו במיוחד s בגוף שלישי ו-a/an/the".

### F6. From B1 the Hebrew explanations hide behind tiny "עב" chips, one per paragraph (major)
At B1 (support "minimal" by level) every paragraph, rule box, key point and even the exercise instructions fold
their Hebrew behind a chip labelled only "עב" (about 26x18 px), e.g. the whole b1-02 explanation of present
perfect vs past simple (`crop-b1-02-learn-a.png`) and five "עב / הצגת ההסבר בעברית" toggles on the end screen.
At A2 the same control is labelled "בעברית" (`crop-a2-05-learn-top.png`), so the label changes between levels.
Present perfect vs past simple is exactly where my 4-unit students most need the Hebrew contrast; the excellent
content above is hidden from them by default. The setting "הסברים בעברית" exists in Settings, but nothing in the
lesson points to it. On the level-check results page on a phone the chip lands in the middle of English sentences
("Complete Omer's message with the correct form [עב] of the verbs in brackets", `cp-99-result.png`).
**Suggestion:** keep Hebrew visible for "rule", "warning" and "Watch out (Hebrew speakers)" blocks through B1,
fold only plain paragraphs; add one "הצגת כל העברית בשיעור" switch at the top of the lesson that also links to
the setting; use one clear label ("בעברית") with a 44 px target; place the chip on its own line after the text.

### F7. A 5/6 reading score counts as a mistake and halves the reading's points (minor)
Routes `#/lesson/a2-05` (e6) and `#/lesson/b1-02` (e8). One wrong question out of five or six gives "4/5 · לא
בדיוק" / "5/6 · לא בדיוק" (`b1-02-ex-07-e8-read-WRONG.png`), scores the whole text as 0.5 (the `Math.min(0.5,
score)` rule in `js/views/lesson.js`), and lists it among "6 התרגילים שפספסתם". In my B1 run this one question
was the difference between "כמעט שם" at 63% and the 70% pass. A reader who got 5 of 6 right did well.
**Suggestion:** score a reading text per question (5/6 = 0.83), call it "5 מתוך 6 נכונות", and offer to redo only
the missed question.

### F8. True/False answers do not show what the student chose (minor)
After "בדיקה" on a reading text, both "True" and "False" turn grey; the student's own choice is not marked and
the right button is not highlighted. The only signal is a red line "התשובה: true" in lowercase
(`crop-a2-05-tf.png`). Multiple-choice items in the same task do show green and red.
**Suggestion:** mark the chosen button red or green and the correct one green, as for options, and write
"התשובה: True" (or "נכון/לא נכון").

### F9. On a phone the student cannot see the text while answering (minor)
`#/reading?l=b1-10&e=e9` at 390x844, 130% text: the page is 4,661 px tall; the 207-word text comes first and the
five questions below it (`rd-b1-10-130-full.png`), so every question means scrolling up and down through the
text. With no paragraph numbers there is nothing to jump to.
**Suggestion:** number paragraphs, add "לחזור לטקסט" under each question (scrolls to the paragraph and back), or a
collapsible sticky text panel on phones.

### F10. Level-check results show the key but not what the student wrote (minor)
`cp-99-result.png`: each missed item shows the prompt, "התשובה: ...", the explanation and "תרגול ממוקד לנושא",
but never the student's own answer, so they cannot see their actual mistake. **Suggestion:** add "כתבת: ..." with
the wrong words marked, as the dictation diff already does.

### F11. Generic error notes on the lesson summary are off-topic (minor)
After b1-02, where I misplaced for/since/yet, the summary "כדאי לשים לב" shows "מילת יחס: מילות היחס לא מתורגמות
אחד לאחד: 'תלוי ב' = depends on, לא depends in." (`b1-02-log.txt`). That note has nothing to do with for/since.
**Suggestion:** use the missed item's own explanation (or the lesson's key point for that topic) instead of the
error type's generic note.

### F12. The "בגרות" goal changes very little, and the level finals do not resemble Bagrut tasks (minor)
Choosing "בגרות, פסיכומטרי ולימודים אקדמיים" adds one item to Today, "קריאה: טקסט קצר ברמה שלך ... 4 דק׳"
(`09-today-after-placement.png`). There is no unseen-text practice, no Bagrut-length writing format and no
timing option. The B1 final asks for "Write a 300-word opinion essay" and the B2 final for 500 words
(`cp-00-intro.png`, `#/path`), far longer than the written tasks my students sit; the lesson tasks (80-130 words
at B1) are closer. **Suggestion:** with the Bagrut goal, add a weekly "unseen" (one text, mixed open and closed
questions) and a Bagrut-length writing task in the plan, with an optional timer.

### F13. Games: most are below my students' level, and a third of the quiz score is speed (minor)
`#/games`: the picture and memory games use only "Pre-A1–A1" words in all three levels, useful only for my weakest
3-unit students. The B1 word quiz is good (`quiz-B1-s1-q2-fb.png`), but in my round 45 of 135 points were "בונוס
מהירות" (`quiz-B1-s1-end.png`), which rewards speed over accuracy for students with accommodations. I also could
not choose a word set (for example "the words of lesson b1-02") to set as homework; opening a locked stage URL
(`#/games/B1/3`) silently dropped me on the games hub. **Suggestion:** a "בלי בונוס מהירות" switch, a "words from
this lesson / unit" option, picture sets for A2-B1 topics, and a one-line message when a stage is locked.

### F14. Listening centre: short items, and a B1 learner starts at the alphabet (minor)
`#/listening` lists Pre-A1 first ("Which letter do you hear?") for a B1 learner, while `#/reading` opens at B1
with "מומלץ לרמה שלך" (`crop-listening-top.png`, `crop-reading-top.png`). Titles repeat ("What do you answer?",
"תכתיב: לכתוב את מה ששומעים" many times). By my count, B1 listening texts are at most 54 words and B2 at most 51,
each with one question, so there is no extended listening. **Suggestion:** open at the learner's level like the
reading centre, give items distinct titles, and add a few 1-2 minute listening texts with 4-5 questions from B1.

### F15. Placement reading items run text and question together (polish)
`07-placement-q2.png`: "...she can't imagine living anywhere else. Which sentence about Adi is true today?" The
question looks like the last line of the text, with the same size and weight. **Suggestion:** set the passage in a
panel and the question below it in bold, as the lesson reading tasks do.

### F16. Dialogue gap text is one run-on paragraph (polish)
b1-02 e7: "Sara: Any news about your application? Kenji: No, not ___. I applied six weeks ago ... Sara: Six weeks
isn't long." is one block with no line breaks between speakers (`b1-02-ex-06-e7-gap-q.png`), hard for weaker
readers. **Suggestion:** break lines at each "Name:" in dialogue texts.

### F17. Path and copy details (polish)
- Can-do lines on `#/path` are English only even in Hebrew UI ("I can talk about life experiences."), and b1-01
  and b1-09 have no Hebrew title (`10-path.png`). Weaker students cannot read the goal of the lesson.
- The lesson end says new words "יחזרו בדיוק לפני שתשכחו" (`b2-09-log.txt`): "בדיוק" overclaims for a calm,
  honest brand; "יחזרו בזמן שמתאים לזיכרון" is enough.
- Terms are mixed: "past participle" in most lessons, "had + V3" in b2-02. My students know "V3"; writing
  "past participle (V3)" once per lesson would connect the two.
- The writing check's label "יתרון כפול" for "more better" reads as "double advantage"; "השוואה כפולה" (or
  "ערך היתרון פעמיים") is clearer.

## Before I would recommend Lucid to my students

1. Fix F3 and F4: feedback must make the student correct the sentence, and a wrong sentence must never become
   100%.
2. Put real reading into the level checks (F1) and widen reading question types (F2), with paragraph numbers.
3. Strengthen the automatic writing check for agreement and articles (F5), since without AI it is the only
   feedback on writing.
4. Keep the Hebrew contrast visible at B1 (F6); it is Lucid's best asset and my 4-unit students need it.

With those, I would happily give Lucid to my 4- and 5-unit students as home practice next to the coursebook,
especially the B1-B2 lessons and the Reading critically lesson.

## Top 3 wishes

1. **A Bagrut track** tied to the "בגרות" goal: weekly unseen texts with numbered paragraphs and mixed open and
   closed questions (reference, inference, main idea, word in context), plus Bagrut-length writing tasks with an
   optional timer.
2. **Feedback that makes the student fix it**: a second try after the targeted note, and a guided self-check
   instead of the one-tap "גם התשובה שלי נכונה".
3. **A fair level check and a report I can see**: fresh items and a reading text in every level check, and a
   printable or shareable progress summary (skills, demonstrated levels, recurring errors) that a student can
   bring to their teacher.
