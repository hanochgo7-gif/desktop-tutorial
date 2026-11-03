Simulated review (AI persona), not real user research.

# Teacher panel, round 3 re-test: high-school English teacher (Bagrut 3, 4 and 5 units)

## Who I am

An AI playing an Israeli high-school English teacher with 20 years of Bagrut preparation at 3, 4 and 5 units. I
care about unseen-text reading, access to text for weaker readers, written answers and short writing tasks, and
whether a tool teaches or only marks. A few hours ago I reviewed Lucid in this role
(`docs/qa/panels-r3/teacher-bagrut.md`, findings F1 to F17). This is the re-test of the new build.

Screenshots, logs and scripts:
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/teacher-bagrut/`
(below, only file names). All runs used Playwright Chromium with locale he-IL and the Hebrew UI in light mode, on a
1280x860 desktop unless I mention a 390x844 phone (touch emulation). Speech does not work in headless Chromium. Any
counts below are my own counts over `content/lessons/*.json` or my own runs, not data from students.

## What I did

1. **Onboarding as my 11th-grader Noa** (`#/start`): born 2009, goals "בגרות, פסיכומטרי ולימודים אקדמיים" and "כתיבה
   אקדמית וטיעונית", 20 minutes, start "אני די בנוח/ה". Then I did the placement test as a solid B1 reader (12
   questions, result B1), and looked at `#/today` and `#/path` (`01-start-1.png` to `08-path.png`).
2. **Three full lessons, the same wrong answers as last time**, plus second tries:
   - A2 `#/lesson/a2-05`, wrong on e3, e6, e8, e10 and e13; I fixed e8 and e10 on the second try and missed e13 again
     (`a2-05-*`, `a2-05-log.txt`). I ran it again with a typical A2 text in the writing task (`a2-05w-*`).
   - B1 `#/lesson/b1-02`, wrong on e2, e7, e8, e9, e11 and e13 (`b1-02-*`). A second run tried self-credit:
     "I did lived…" first, then the version the hint suggests (`b1-02c-*`).
   - B2 `#/lesson/b2-09` "Reading critically", wrong on e2, e8 and e10 (`b2-09-*`).
3. **The "הכול בעברית" switch at B1** on a phone at 115% text (`he-b1-02-*`, `he-b1-06-learn.png`).
4. **Level check** `#/checkpoint/B1` on a phone, about one answer in four wrong (`cp-*`, `cp-log.txt`).
5. **Self-credit checks**: the same grading functions the lesson uses, run in the page on wrong rewrites my students
   really write (`02-selfcredit.mjs`, `02b.mjs`; output quoted below).
6. **Reading centre** on a phone at 130% (`rd-b1-10-130-*`), **listening, reading, games and writing hubs** on a phone
   (`hub-*-390.png`).
7. **Writing lab** `#/writing/we-06`, with the same 139-word text and its 14 typical errors as last time (`w-we06-*`,
   `crop-we06-a.png`).
8. **Games**: the B1 word quiz (calm pace, end screen), a locked stage URL, picture game level 3 (`g-*`,
   `games-log.txt`).
9. **Review**: the empty state, adding the A2 words from Today, and select-then-check (`rv-*`, `td-after-add.png`).
10. **Hebrew grammar explanations**: re-read the Hebrew that changed in b1-02, b1-05, b1-06 and b1-08 (git diff and the
    app).

I did not take Today all the way to "done", so I give no verdict on that.

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| F1 | B1 level check has no reading and reuses lesson items | **not-fixed** (deferred in plan) | `cp-log.txt`: 16 items again, 13 grammar, 1 listening and 2 dictations, with no reading text and no vocabulary set. b1-01 e3 "Have you ever ___ sushi?" is back word for word. The intro is more honest ("75% ומעלה מסמנים את הרמה כ״מוכחת״"), but it still promises "כך רואים מה באמת בשליטה". |
| F2 | Reading questions closed and literal; Bagrut skills rare | **partly** | Passages now have paragraph numbers (`crop-b1-02-e8-a.png`). The question bank is unchanged: 399 questions, 186 mcq, 146 tf and 67 gap, and no open-answer type. Only 16 questions in the whole course mention a paragraph. |
| F3 | "גם התשובה שלי נכונה" lets a wrong sentence count as 100% | **partly** | "I did lived in Tel Aviv since 2020." is now refused. The amber screen shows a word diff (`b1-02c-ex-10-e11-correct-WRONG.png`), and the end screen says "כולל תשובה אחת שסימנתם בעצמכם כנכונה". But "I did live…", "I lived…", "I am living…", "I have live…" and "I have been lived… since 2020" are all still offered self-credit. The second-try hint steers students to the first of these (see N1). |
| F4 | Wrong typed answer reveals the answer; no second try | **partly** | A real second try now works: "עוד לא. אפשר לתקן בעצמכם", the student's text stays, and only the wrong gap reopens (`a2-05-ex-07-e8-TRY2-open.png`). But in all 5 second tries I saw, the note itself contains the answer (see N2). |
| F5 | Writing check misses common Israeli errors and sounds complete | **fixed** | The same text now gets 12 flags instead of 4: agree, a/an ×2, an, alot, "people was", there CV, "more better", "for find", "In the other hand", dont and "every school need". Each has a Hebrew note and "אפשר לכתוב", under the headline "מצאנו 12 מהדברים שאנחנו בודקים" (`w-we06-log.txt`, `crop-we06-a.png`). Still missed: "volunteering give" (a gerund subject) and "one hour in week". |
| F6 | From B1 the Hebrew hides behind tiny "עב" chips | **fixed** | The chip now reads "בעברית" at every level and sits on its own line. A "הכול בעברית" key (150x41 on the phone) shows all the Hebrew. It stays on in practice and in another B1 lesson (b1-06 opened with aria-pressed=true) and is cleared on Today (`he-b1-02-learn-all.png`, `he-b1-02-ex1-all.png`). The chips still measure 69x27 in my run, but headless Chromium did not report `pointer: coarse`, so I could not see the 44 px rule work. Hebrew is still folded by default. |
| F7 | 5/6 reading counts as a mistake and scores 0.5 | **fixed** | b1-02 e8 shows an amber "5 מתוך 6 נכונות" and is left out of the missed list (`crop-b1-02-e8-b.png`). |
| F8 | True/False doesn't show the student's choice | **fixed** | The chosen key is marked with ✗ in red and the right key with ✓ in green. The line reads "התשובה: True", and "(הבחירה שלכם)" / "(התשובה הנכונה)" are there for screen readers (`crop-b1-02-e8-a.png`). |
| F9 | On a phone the text is out of view while answering | **partly** | Paragraph numbers were added, but there is still no "back to the text" link or sticky text. At 130% the page is 5,100 px tall, with all questions below the text (`rd-b1-10-130-full.png`). The numbering also counts signature lines and headings (N8). |
| F10 | Level-check results don't show the student's answer | **fixed** | "בחרתם: Have you ever eating" and "כתבתם: If you zzz (לא בתשובה)…", with the wrong words marked (`crop-cp-result-top.png`, `crop-cp-result-mid.png`). Multiple-choice items still lose their question stem (N9). |
| F11 | Off-topic generic notes on the lesson summary | **fixed** | "כדאי לשים לב" now shows my own sentences, for example "כתבתם: Maya has just pass her driving test. → …passed…", with the item's own note. There is no "depends on" note after b1-02 (`b1-02-log.txt`). |
| F12 | The Bagrut goal changes little; finals don't look like Bagrut tasks | **not-fixed** (deferred) | With 20 minutes, Today still adds only "קריאה: טקסט קצר ברמה שלכם · 4 דק׳" (`07-today-after-placement.png`). With 10 minutes it is now an optional extra, "יש עוד 4 דקות? קריאה ברמה שלכם". There is no unseen-text practice and no timer. The B1 final still asks for "Write a 300-word opinion essay" (`08-path.png`). |
| F13 | Games below level; a third of the score is speed | **partly** | The speed bonus is off by default, with an opt-in "אתגר מהירות" switch. The verdict stayed on screen after 4 s and play waited for "המשך". The end screen shows "3 מתוך 10 נכונות (30%)" with no bonus line. `#/games/B1/3` shows "השלב הזה עוד נעול" with a link, and the picture levels now go up to "A2–B1" (`games-log.txt`, `hub-games-390.png`). Still missing: a "words from this lesson" homework mode (deferred). Picture level 3 is still concrete nouns (drop, palm tree, hammer, dice). |
| F14 | Listening starts at the alphabet; short items | **partly** | It opens at "B1 · בינוני · מומלץ לרמה שלכם" with Hebrew lesson titles, and Pre-A1 is folded at the bottom (`hub-listening-390.png`, 3,326 px). Extended listening is still missing: the B1 items run 24-54 words with one question (deferred). |
| F15 | Placement reading runs text and question together | **fixed** | The passage sits in a panel and the question is in bold below it, with "שאלה 3 מתוך כ-20" (`07-placement-q2.png`). |
| F16 | Dialogue gap text is one paragraph | **fixed** | One speaker per line, names in bold (`b1-02-ex-06-e7-gap-q.png`). |
| F17 | Path and copy details | **fixed** | The can-dos now have Hebrew ("אני יודע/ת לדבר על חוויות בחיים."), and b1-01 and b1-09 have Hebrew titles (`08-path.png`). The lesson end says "יחזרו בזמן שמתאים לזיכרון", and the check is called "השוואה כפולה". "V3" now appears in the b1-01 and b1-02 Hebrew, but there is no "past participle (V3)" link at B2. |

## New findings

### N1. The second-try hint leads to another wrong sentence, which can then be self-credited (major)
Route `#/lesson/b1-02`, e11 "Find the mistake and write the sentence correctly: I live in Tel Aviv since 2020." I typed
"I did lived in Tel Aviv since 2020." The second-try note says "After did, does or do the verb is in its base form:
did live, not did lived." (`b1-02c-ex-10-e11-TRY1.png`). That rule is true, but it is the wrong lesson for this item.
I did what it says and typed "I did live in Tel Aviv since 2020." I got the amber "לא אחת מהתשובות שלנו" with the button
"גם התשובה שלי נכונה" (`b1-02c-ex-10-e11-correct-WRONG.png`). One tap gave "נספר כנכון". On the end screen,
with a second error on e13 as well, the lesson read "השיעור הושלם · ענית נכון בניסיון הראשון על 99% מהתרגילים"
(`b1-02c-log.txt`). In the page, the self-credit check still offers the button for "I lived in Tel Aviv since 2020.",
"I am living in Tel Aviv since 2020.", "I have live…", "I have been lived…", "I have lived in Tel Aviv for 2020.",
"Maya have just passed her driving test." and "Maya has just past her driving test." (output of `02-selfcredit.mjs`).
These are exactly the sentences my students write.
**Suggestion:** when the item has a target structure (this one is "since → have/has + V3"), the note should name it
("since + present perfect: have/has + V3") instead of a generic "did-past" rule. Offer self-credit only when the answer
contains the key's structure (have/has + a past participle here, and has/have agreeing with the subject). Never offer
self-credit on an answer that came after a second-try note. Do not count a self-credited first-try miss as a full
first-try point.

### N2. The "fix it yourself" note usually gives the answer away (major)
In every second try I saw, the note contained the corrected form, so the second attempt was copying:
- a2-05 e8: "leave → left" (`a2-05-ex-07-e8-TRY1.png`).
- a2-05 e10: "gets up → got up, has → had" (`a2-05-ex-09-e10-TRY1.png`).
- a2-05 e13: "say I went by bus or I took the bus".
- b1-02 e9: "has just passed".
- b1-02 e13: "…English needs the present perfect…: I've known Noa for ten years." (`b1-02-log.txt`).

The second try is the most important change in this build, and it is well made. But the authored `wrong_feedback`
texts were written to come after the answer, not before it.
**Suggestion:** split each note into a rule part ("leave is irregular, and the long vowel becomes a short e") shown on the
first miss, and an answer part ("leave → left") shown with the answer. Where a note has only one part, show the
item's hint or the error-type name on the first miss.

### N3. A missing past participle is graded as a spelling slip and counted right (major)
Route `#/lesson/b1-02` e13 (translate "אני מכירה את נועה כבר עשר שנים"). "I have know Noa for ten years." gets "כמעט!
בדקו את הפרטים הקטנים · המילה נכונה; האיות: known" with a tick, and counts as right (0.9 points)
(`b1-02c-ex-12-e13-transform-WRONG.png`). In the page, "The house was build in 1950." is accepted the same way
against "built" (`02b.mjs`). know/known and build/built are the target forms of the present perfect and passive
lessons, not spelling. Calling them "איות" teaches the student that the V3 does not matter.
**Suggestion:** turn off the one-letter typo tolerance when the expected word is a verb form in the lesson's topic, or
when the typed word is itself a real English word (know, build, pass, live). Treat it as a grammar error with "V3:
known".

### N4. The lesson writing check misses the lesson's own target errors (major)
Route `#/lesson/a2-05` e15 "Write about your last weekend" (irregular verbs). My text: "Last weekend I goed to Haifa…
We eated falafel… we see a big ship. My brother buyed a new shoes… we was very tired, so we sleeped early. It was a
amazing day…". The automatic check found only "an לפני תנועה 'a amazing'" (`a2-05w-ex-14-e15-write-ok.png`,
`a2-05w-log.txt`). It missed goed, eated, buyed and sleeped, the very errors the checklist under it warns about ("אין ed
על פעלים חריגים (לא goed ולא buyed)"). It also missed "we was" and "a new shoes". With AI off, a student reads this
as "only one problem".
**Suggestion:** add an over-regularisation rule (an irregular base form + -ed, from the lesson's own vocabulary list)
and "we/you/they was" to the analyser, and run the lesson's topic rules first. When the checklist names an error, the
automatic check should look for it.

### N5. Fixing a mistake yourself earns nothing and is not acknowledged (minor)
In `#/lesson/b1-02` I fixed e9 and e11 on the second try. The lesson ended "כמעט שם · 64% בניסיון הראשון. צריך 70%
כדי להשלים", and both fixed items were in "לתרגל רק את 5 הטעויות". The summary lists "כתבתם: Maya has just pass her
driving test." with no sign that I corrected it (`b1-02-log.txt`, `b1-02-99-end.png`). In class I would give credit for
a self-correction. Repeating the item later is good retrieval practice, but the student should see that the fix
counted.
**Suggestion:** give 0.5 points for a right second try. In the mistakes box, tag those items "תיקנתם בעצמכם בניסיון
השני", and keep them in the later practice.

### N6. "כדאי לשים לב" frames a multiple-choice choice as a wrong-to-right correction (minor)
Route `#/lesson/b2-09` e2 "Which sentence presents an opinion as if it were a fact?" I chose "In my view…". The lesson
summary shows "בחרתם: In my view, the new parking rules are too strict. → Everyone knows the new parking rules are
pointless.", with the second sentence in green bold (`b2-09-log.txt`, `crop-b2-09-end.png`). The arrow and green
say "this is the correct form", but the green sentence is the flawed one the item asked students to find. In a
critical-reading lesson that is confusing.
**Suggestion:** for multiple-choice items show "בחרתם: … · התשובה: …" with no arrow, and keep the arrow layout for
typed corrections.

### N7. The mistakes box strikes out whole sentences instead of the wrong words (minor)
a2-05 e8: the whole 25-word message "Hi Noa! Sorry about last night. I leaved (leave)…" is struck through and then
repeated in green, where only "leaved → left" changed (`a2-05-99-end.png`). The b2-09 e10 rewrite shows the same thing
(`crop-b2-09-end.png`). The exercise verdict already has a word-level diff ("did live → have lived").
**Suggestion:** use the same word diff in the summary, or show just the changed words with three words of context.

### N8. Paragraph numbers count salutations, signatures and headings (minor)
The b1-02 e8 email numbers "Hi Noa," as 1, "Love," as 7 and "Maya" as 8 (`crop-b1-02-e8-a.png`). In the b1-10 blog
post, "– Lior, 16" is 5 and "COMMENTS" is 6 (`rd-b1-10-130-full.png`). The questions that refer to paragraphs happen to
match today, but a Bagrut-style "In paragraph 3…" relies on body paragraphs only. Also, the answer explanations quote
the line but never say "בפסקה 3", which is the habit the numbers should build.
**Suggestion:** do not number lines of three words or fewer, greetings, sign-offs or labels. Add "(פסקה N)" to each
answer explanation.

### N9. Level-check results drop the question stem for multiple-choice items (minor)
`#/checkpoint/B1` results on a phone: "Read and answer the question. · בחרתם: She had one in the past, but she sold
it. · התשובה: No, she doesn't." The stem "Noa says: 'If I had a car, I'd drive to work.' Does Noa have a car?" is
missing, so the answer makes no sense on its own. Also "בחרתם: Have you ever eating" drops "sushi?"
(`crop-cp-result-top.png`).
**Suggestion:** show the item's question or sentence (with the gap filled by the student's choice) above "בחרתם".

### N10. The writing-check summary count doesn't add up (polish)
`#/writing/we-06`: "12 דברים לבדוק: agree הוא פועל, a / an לפני שם עצם ביחיד, a / an לפני מקצוע ועוד 8." That is 3 + 8 =
11, while the panel lists 12 (`crop-we06-a.png`). **Suggestion:** "ועוד 9", or count from the same list.

### N11. Small bidi and alignment slips (polish)
- On Today, the primary key reads "להתחיל: ?...Have you ever": the "?..." jumps between the colon and the title
  (`crop-today-btn.png`). Isolate the English title.
- In reading-question cards, one-line English explanations are right-aligned and two-line ones left-aligned, so the
  edges change from card to card (`crop-b1-02-e8-b.png`). In a reading task I would keep all English explanations
  left-aligned.
- With 10 minutes chosen, the plan says "כ-13 דקות" (`td-after-add.png`). Say "כ-13 דקות (קצת יותר מה-10 שבחרתם)",
  or trim it.

## Hebrew grammar explanations (re-check)

The shortened B1 Hebrew (BL-2) is still accurate and still contrastive. I found no errors in b1-02, b1-05, b1-06 or
b1-08. Examples: "בעברית הסביל מסומן בתוך הפועל עצמו … ולכן קל לשכוח את be"; "'הספר שקראתי אותו' … ולכן לא
מוסיפים it, him, her או them"; "'הייתי קונה' = would + צורת הבסיס". Two nits. The new short example "I've known Noa."
drops "for ten years", which is the point of b1-02 e13. And the b1-08 /w/ note "ואל תגעו בשיניים בשפה" is vaguer than
b1-05's "ואל תיגעו בשיניים העליונות בשפה התחתונה".

## What I liked (keep this)

- **A real second try.** "עוד לא. אפשר לתקן בעצמכם" keeps the student's sentence, reopens only the wrong gap and offers
  "להציג את התשובה" as an honest exit. With better notes (N2), this is exactly how I correct in class.
- **The writing check now catches 12 of the 14 errors** in my test text, each with a Hebrew reason and "אפשר לכתוב", under
  an honest headline. With AI off, this is now usable feedback for 4-unit students.
- **"הכול בעברית"**: one tap, remembered per level, and it carries into practice. The B1 Hebrew contrast is back where my
  students can see it.
- **Reading feedback**: True/False marks both keys, a 5/6 reads "5 מתוך 6 נכונות", and paragraphs are numbered.
- **The mistakes box shows the student's own sentence** next to the correct one, with the item's own note: no more
  off-topic generic notes.
- **Level-check results show what the student chose or wrote**, with the wrong words marked.
- **Honest self-credit wording**: "סימנתם שהתשובה שלכם נכונה, והיא נשמרת כשיפוט שלכם ולא של Lucid", and "כולל תשובה אחת
  שסימנתם בעצמכם כנכונה" on the end screen.
- **Calm games**: no clock by default, the verdict waits, and the results show accuracy, word examples and "להוסיף 7 מילים
  לחזרה המרווחת". A locked stage explains itself.
- **The listening centre opens at the student's level**, and dialogues show one speaker per line.
- **Review is select-then-check** and marks both the chosen and the right option (`rv-0-fb.png`).
- **The Hebrew grammar explanations are still the best thing in the product.**

## Before I would recommend Lucid to my students

Fix N1 to N4 first: they are about what the app tells a student is right. Then F1 (a reading text in every level check).

## Top 3 wishes

1. **Close the fix-it-yourself loop.** Use rule-first notes that don't contain the answer (N2), self-credit only when the
   target structure is present (N1), no typo tolerance on target verb forms (N3), and half credit with an "תיקנתם
   בעצמכם" tag for a right second try (N5).
2. **A Bagrut track and fair level checks.** Weekly unseen texts with numbered body paragraphs and open, reference,
   inference and word-in-context questions; one unseen reading text in every level check from items never seen in
   lessons; Bagrut-length writing with an optional timer.
3. **Lesson writing checks that look for the lesson's own targets** (over-regularised past forms, was/were, a/an +
   plural), and a printable progress summary a student can bring to their teacher.
