Simulated review (AI persona), not real user research.

# Teacher panel (round 3): university lecturer, English for Academic Purposes and academic writing

## Who I am

An AI playing a university lecturer in English for Academic Purposes (EAP) and academic writing. I teach
Hebrew-speaking first-year students and graduate students who must summarise, synthesise and argue from
sources in English. I judged Lucid's B2-C2 content and its writing lab end to end, asking one question: would
this move a student from B2 writing to C1/C2 writing, and what is missing?

Screenshots and scripts are in
`/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/teacher-academic/`
(below, only the file name is given). All runs: Playwright Chromium, he-IL, Hebrew UI, light mode, desktop
1366x900 unless a 390x844 phone is mentioned. The AI features are off on this site, so I judged the AI feedback
by its flow, the code that would show it (`js/views/essay.js`) and the rubric (`content/writing/rubric.json`),
not by output. Every count below (for example "8 C1 lessons") is my own count over the content files.

## What I did

1. **Onboarding** (`#/start`) as one of my graduate students: Noa, born 2001, goals "כתיבה אקדמית וטיעונית" and
   "בגרות, פסיכומטרי ולימודים אקדמיים", 35 minutes, start "אני מתקדם/ת ורוצה לשפר כתיבה וטיעון". It led to
   `#/placement?start=advanced`. Shots `01-ob-*`. I read `js/core/placement.js` and the result wording: the test
   has grammar, vocabulary, reading and listening items only, and the result says so.
2. **Writing lab hub** (`#/writing`) as a B2 and a C1 learner; opened all ten stages. Shots `02-lab-b2*`,
   `05-lab-c1`.
3. **B2 writing**: `#/writing/we-10` (AI tools for homework, 200-280 words). I wrote a 213-word essay with the
   errors my Hebrew-speaking first-years make, pressed "בדיקה אוטומטית", then looked at every tab. Shots `03-we10-*`.
   Then `#/writing/we-12` (rebuttal paragraph): two drafts, compared in "גרסאות". Shots `08-we12-*`.
4. **B2 final** `#/writing/final-B2` and **C2 final** `#/writing/final-C2`, chose a topic in each. Shots `07-*`.
5. **C1 source-based assignment** `#/writing/wa-05` (Homes or parkland?): opened the source pack beside the
   editor, wrote a 201-word draft whose first two sentences are copied word for word from Source A, with
   "I think", "it's", "a lot of" and "All residents ... nobody would lose", and ran the checks. Shots `05-wa05-*`.
   Same assignment family on a phone: `#/writing/wa-06`, shots `12-phone-*`.
6. **C1/C2 exercise sets**: `#/writing/we-19` (C2 editing for concision): typed valid rewrites that are not in the
   answer list. Shots `04-we19-*`. Read the items of `we-17` (calibration and paraphrase).
7. **Timed essay** `#/writing/we-14` (timer), **critical response** `#/writing/we-16` (model-answer gate),
   **free writing** `#/writing/free` (an email to a professor). Shots `09-*`.
8. **C1 and C2 lessons**, every step: `#/lesson/c1-03` "Hedging and stance" and `#/lesson/c2-03` "Synthesising
   sources", including their long writing tasks. Shots `06-*`, log `s06.log`.
9. `#/today`, `#/path/C1` and `#/progress` as a C1 learner after writing. Shots `10-*`, `08-progress`.
10. Probed the automatic checker directly in the page (`js/core/writing-analyzer.js`) with seven Hebrew-L1
    errors that Lucid's own C1/C2 lessons teach (script `s11-analyzer.mjs`).

## What worked (keep this in any redesign)

- **The academic content is genuinely good.** Parallel-prompt models ("Model for a parallel prompt ... study the
  moves, not the content"), rebuttal moves taught as refute / concede and outweigh / qualify with weighing
  criteria (`we-12`), source packs built with deliberate flaws to evaluate (a self-selected online survey, a
  column with a false choice and an attack on the planners in `wa-05`), and a "bias audit" of the learner's own
  draft. This is how I teach source-based argument.
- **C1/C2 lessons teach the right things.** `c1-03` has a strength table (booster / probable / possible /
  distancing), treats over-hedging as an error, and ends with a discussion-section task (shot
  `06-c1-03-s1`). `c2-03` separates summary from synthesis, teaches reporting verbs by stance, past simple vs
  present perfect when reporting, and ends with a literature-review synthesis. `we-17` sorts paraphrases into
  "Acceptable paraphrase / Patchwriting / No attribution". The Hebrew-L1 notes where they exist are precise
  (`c2-04`: "אמנם ..., אבל" leading to *"Although ..., but ...").
- **Version comparison** (`#/writing/we-12`, tab "גרסאות", shot `08-we12-versions`): "השתנו 2 מתוך 2 פסקאות",
  word-level additions and deletions per paragraph, "רק מה שהשתנה / כל הטקסט". Seeing revision is the core of
  writing pedagogy; this is the best screen in the lab.
- **Honesty everywhere it matters.** "הבדיקה מחפשת ביטויים אופייניים ... היא לא שופטת את איכות הטיעון";
  "בדיקות אוטומטיות פשוטות: הן יכולות לפספס טעויות"; every source carries "חומר לדוגמה, לא נתונים אמיתיים";
  the AI tab says plainly "תכונות ה-AI עוד לא זמינות באתר הזה"; the placement result says writing was not
  tested; Progress says "כתיבה מקבלת רמה רק מטקסטים שהוערכו במשוב AI"; the rubric says the level is a range,
  only on a final draft, and "not an IELTS or Cambridge score". I would trust this tool not to oversell.
- **Open rewrites are fair** (`we-19`, shot `04-we19-i7-verdict`): a valid rewrite not on the list gets "לא אחת
  מהתשובות שלנו", one sample answer, and "גם התשובה שלי נכונה" to claim it.
- **Formal register at C1** (shot `05-wa05-checked`): contractions, "a lot of", "really", "nowadays" are flagged,
  and the low-precision rules (comma splice, if + will) are switched off at C1-C2 so correct academic prose is
  not punished. A reference list is excluded from the word count.
- **The lab says where you are**: "הרמה שלכם: B2. השלב שלכם: 5; משימת הסיום של B2 נמצאת בשלב 6."
- **Free writing text types** (`#/writing/free`): an email to a lecturer was checked without argument checks.
- **Designed-in pedagogy for AI feedback** (read in `essay.js`): hint ladder where the correction opens only after
  an attempt in the text, at most three feedback rounds, self-rating before the AI bands from stage 7.

## What did not work

### 1. Without AI, a student never sees the rubric, cannot self-assess, and can never finish a task (major)

Route: `#/writing/wa-05`, `#/writing/we-12`, `#/progress`. The `wa-05` instructions end "Score your draft against
the rubric before you request feedback", but the AI tab shows only "תכונות ה-AI עוד לא זמינות באתר הזה" (shot
`05-wa05-checked`, AI tab text logged). The rubric (`rubric.json`: 11 categories, bands 0-5, task gate, severity)
is shown only inside an AI result ("איך עובד הדירוג?"), and the self-rating form only inside the AI tab, so in
device-only mode neither exists. "לסמן כטיוטה סופית" also lives only in AI results, so after two drafts of
`we-12` the lab still lists it as "2 גרסאות" and the stage list as "בכתיבה" (shot `08-lab-after`), and Progress
shows nothing for writing. A B2-to-C1 student working here gets no judgment of argument, evidence or
counterargument at all.
Suggestion: a "מחוון" tab in the editor that always shows the stage's applicable categories with Band 1/3/5
descriptors; let the learner rate their draft against it without AI and "mark as final (self-assessed)", saved
with the version and labelled as a self-assessment (never as a level).

### 2. The automatic checks miss the Hebrew-L1 errors Lucid's own advanced lessons teach (major)

Route: `#/writing/we-10` and a direct probe of `analyzeWriting` at B2, C1 and C2. These sentences produced **zero**
issues at every level: "Although the scheme is costly, but the savings outweigh it." (taught in `c2-04`),
"Okafor has found in 2021 that ..." (taught in `c2-03`), "Rarely we see such a clear result." (`c1-02`),
"This paper offers new reading of the evidence." (`c2-05`, `c1-08`), "Why we should pay for this?" (`c1-07`),
"The study proves that green roofs reduce heat in all buildings.", "Everyone agrees that this is the best
solution." In my `we-10` essay the check also missed "a student write", "this tools" and the comma splice "This
is a serious concern, a student who copies does not practise." (shot `03-we10-checked`).
Suggestion: turn each `hebrew_pitfalls` entry of the B2-C2 lessons into a rule (Although/but, since/so pairs,
past time + present perfect, negative opener without inversion, statement-order question, a/an before
adjective + singular noun, "this/these" agreement). Add a "sweeping claims" highlighter (all, every, never,
everyone, nobody, proves, always) at stage 8+, which is exactly the bias audit `wa-05` asks for.

### 3. Source-based tasks have no source-use checks: copied sentences pass silently (major)

Route: `#/writing/wa-05`. My draft opens with two sentences copied word for word from Source A ("Halvarden's
population has grown faster than its housing supply for ten years ..."), uncited. The checks said nothing about
it; they also do not notice that I cited only one of the three sources while "author-year citation for every
source-derived idea" is a required element (shot `05-wa05-checked`). The lab teaches patchwriting in `we-17` and
`c2-03` but does not detect it in the learner's own essay, where it matters.
Suggestion: compare the draft with the task's source pack offline (shared 6- to 8-word sequences): "This
sentence matches Source A almost word for word: quote it with quotation marks and a citation, or paraphrase it".
List citations found (author, year) against the pack: "Cited: Merrow (2025). Not cited: Halvarden City Planning
Office (2025), Halvarden Residents' Panel (2025)." Show each required element with "you check" boxes beside
the draft.

### 4. The "argument structure" signals misread academic prose (major)

Route: `#/writing/wa-05` and the analyzer probe. In my C1 draft "I think the city should build ..." did not count
as "תזה / עמדה" (empty circle) while the same words were flagged "ניסוח אישי"; "Merrow (2025) argues that ..."
did not count as "טיעון נגדי"; "However, Merrow's strongest point is ..." (a concession) was ticked as "הפרכה"
(shot `05-wa05-checked`). In the probe, "Ferrant and Oyelaran (2024) suggest that ..." did not count as evidence,
because an author-year citation is not one of the evidence phrases. A hedging signal is computed but never shown,
even at stage 9 ("משלב רשמי, הסתייגות ..."). At C1 these signals reward B1 formulas ("Some people argue", "For
example") and miss the academic moves.
Suggestion: count "(Author, Year)" / "Author (Year) + reporting verb" as evidence, and attributed positions as
counterarguments; show the matched phrase next to each tick ("נמצא: However, ..."), so the learner can judge it;
show hedging and boosters from stage 7; drop the circle for "rebuttal" when the only signal is "However".

### 5. English texts inside Hebrew panels lose their direction: sources, explanations, plans and checklists (major)

Routes: `#/writing/wa-05` and `#/writing/wa-06` (tab "מקורות"), `#/writing/we-10` (plan and checklist), C1 issue
cards. The source passages are right-aligned with the full stop on the wrong side: ".incomes over the same
period" (shot `05-wa05-sources`), ".the district" on a phone (shot `12-phone-wa06-sources`). At C1, where the
explanations switch to English, the cards read ".not, it is" and '."…"This essay argues that' (shot
`05-wa05-checked`). The English plan items in `we-10` show ".1", ".2" numbering and a lone "it?" line, and long
checklist items push the checkbox onto its own line above the text (shot `03-we10-expanded`; the same checklist
layout in the `c2-03` writing step, shot `06-c2-03-write-s32`). For C1/C2 learners reading dense sources this is
a real reading cost.
Suggestion: `lang="en" dir="ltr"` with `text-align: left` on every source passage, on `<li>` items whose
content is English, on English issue explanations, and on checklist labels (checkbox inline at the start).

### 6. Long writing tasks inside lessons are one-shot, cramped and never reach the lab (major)

Route: `#/lesson/c2-03` step 16 "Write a synthesis for a literature review, with APA citations" (350-550 words)
and `#/lesson/c1-03` step 15 "Write the discussion section of a short report" (250-350 words). The box is about
five lines tall (`min-height: 10rem`). "שליחה" is enabled at 3 words; after my 7-word submission the footer turned
green with "נשמר. עברו על הבדיקות והדוגמה." and the text became read-only (shot `06-c2-03-write-s32`). The box
says "משוב מלא יש במעבדת הכתיבה", but the text is not in "הטיוטות שלי" and cannot be revised or compared. These
are the most valuable genre tasks in the app (discussion section, literature review) and they get the weakest
treatment.
Suggestion: replace the in-lesson box with "להמשיך במעבדת הכתיבה": open the essay editor with the task, the
sources and the draft as v1, keep versions, and return to the lesson. At minimum, keep the textarea editable after
the checks and do not show a green success state below the minimum length.

### 7. "No known problems" while the text is far too short (minor)

Route: `#/writing/we-16` with "This is short." (3 words, target 300-400): the checks panel shows the length
warning, and directly below it "הבדיקות האוטומטיות לא מצאו בעיות מוכרות", with the status line "הבדיקה לא מצאה
בעיות מוכרות." (shot `09-we16-model`). Same for my 147-word `we-12` draft against 200-280. The count includes
only pattern issues, not failed checks.
Suggestion: count failed checks in the status ("הטקסט קצר ב-53 מילים מהיעד; לא נמצאו טעויות מוכרות").

### 8. The model answer opens after a 3-word "check" (minor)

Route: `#/writing/we-16`. "דוגמה לתשובה תיפתח אחרי הבדיקה ... כדי שתכתבו קודם בעצמכם", but typing "This is
short." and pressing "בדיקה אוטומטית" unlocked "דוגמה למשימה דומה" (full model, shot `09-we16-model`). The
parallel-prompt models limit copying, yet the promise "write it yourself first" is not kept.
Suggestion: unlock at half the minimum length, or after the learner confirms "סיימתי טיוטה ראשונה" with the
word count shown.

### 9. Word ranges disagree between instructions and checks (minor)

Routes: `#/writing/final-C2` says "1,500-2,000 words" and shows "יעד 1400-2200"; `final-C1` instructions say
800-1,000 and the data range is 750-1,100; the `c2-03` synthesis says 350-550 and the check says "יעד
350-650" (shot `06-c2-03-write-s32`). My students would ask which number counts; in a university course it matters.
Suggestion: show the stated range, and if there is a tolerance, say it: "יעד 1,500-2,000 (מתקבל 1,400-2,200)".

### 10. Internal IDs in the C2 final and no memory of what was written (minor)

Route: `#/writing/final-C2` (shot `07-finalC2-topic`): "(the same packs as assignments wa-08, wa-09 and wa-10)" and
each topic "(source pack of assignment wa-08)". The lab never shows these IDs; it shows titles. The instruction
"if you have already written one of those assignments, choose another question" is left to memory although the
app has my drafts.
Suggestion: name the assignment ("A minimum age for social media") and tag a topic "כתבתם את המטלה הזו ב-<date>".

### 11. The text to respond to is far from the editor (minor)

Route: `#/writing/we-16` (critical response): the opinion piece sits inside the task panel, roughly 1,000 px above
the editor at 1366x900, and there is no "מקורות" tab for it (shot `09-we16-model`), so quoting and answering it
means scrolling up and down. `we-17`/`we-18` inputs behave the same. `wa-*` packs do have "לפתוח ליד הטקסט".
Suggestion: put every `input_text` in the Sources tab too, with the same "open beside your text" button.

### 12. Topics repeat across stages, which weakens the "transfer" check (minor)

Routes: `#/writing` stages 4-8. Phones at school: `we-08` (stage 4) then `wa-01` "Phones away all day?" (stage 5),
plus `we-19` and the `c1-03` reading. AI and homework: `we-10` (B2), `wa-04` (C1) and `we-16` "Ban the Homework
Apps" (C1). The four-day week: `wa-03`, `c1-03`, `c2-03`. The lab tells the learner "כדי לבדוק שזה עובר הלאה, נסו
משימה חדשה בשלב הזה"; with the same topic, recycled ideas look like progress.
Suggestion: rotate topics so consecutive stages use different domains, or tag same-topic tasks.

### 13. Coverage stops at the argumentative essay; university genres are missing (major)

Routes: `#/writing` (all ten stages), `#/path/C1`, `#/writing/free`. Twenty exercises and ten assignments, all
argument-centred; C1 has 8 lessons and C2 5. My first-years and graduate students also need: summary of a source
(only at A2, `we-04`), abstract, data commentary (describing a table or graph), compare-contrast and
problem-solution texts, research-article sections (introduction, method, discussion), a literature review as a
full editor task, and responding to a reading the way Israeli university EAP courses examine it. Free writing
offers "חיבור / מייל / הודעה" only, with no field for my own prompt or word range. The two genre tasks that do
exist (discussion section, literature-review synthesis) are hidden in lessons (finding 6). As it stands, Lucid
would strengthen argument and source evaluation from B2 to C1, but it would not by itself bring a student to
C1/C2 academic writing across the genres a degree needs.
Suggestion: add academic genres as lab tasks (with the same drafts, versions and checks), and a "bring your own
assignment" mode in free writing: paste the prompt, choose genre and word range, attach sources.

### 14. No way to hand an essay to a teacher (major for my role)

Routes: `#/writing/<id>`, `#/settings`. There is no copy, print or download of a text with its versions; the only
export is "הורדת כל המידע (JSON)" in Settings. I cannot ask students to submit their draft history from Lucid, so
the version comparison, which is its best feature for teaching, never reaches me.
Suggestion: "ייצוא הטקסט" in the Versions tab: PDF or .docx with the final text, each version with its date and
word count, the check results, the self-ratings and (when AI is on) the feedback, clearly marked as AI-generated.

### 15. Polish: labels and small wording

- Band labels in `essay.js`: 4 "מעל היעד / Above target" and 5 "מעבר ליעד / Beyond target" are near-synonyms,
  while the rubric defines 4 as "between Bands 3 and 5". Suggest "מעט מעל היעד" and "הרבה מעל היעד".
- The "can't" card says "In formal essays write the full form: do not, it is." (shot `05-wa05-checked`); give the
  form for the flagged word ("cannot").
- "יתרון כפול" for "Double comparative" is obscure to most learners ("השוואה כפולה: more better"), and its
  explanation renders as "בסיומת ,er-" (shot `03-we10-checked`).
- The stage list shows a bare number at the far end of each row ("3", "4", "6", shot `02-lab-b2`) with no label and
  no progress; suggest "3 משימות · 1 בוצעה" and a suggested order (exercises, short essay, assignment).
- The timed essay timer (`we-14`, shot `09-we14-timer`) is not saved with the version, so a timed draft cannot be
  told from an untimed one later.

## My top 3 wishes

1. **Make the lab teach without AI**: an always-visible rubric tab, self-assessment and "final (self-assessed)",
   and offline checks aimed at what Lucid already knows: the Hebrew-L1 pitfalls of its own C1/C2 lessons,
   sweeping claims, and source use (word-for-word overlap with the pack, which sources are cited).
2. **University genres in the essay editor**: summary, abstract, data commentary, discussion section, literature
   review, plus "bring your own assignment"; and lesson writing tasks continued in the lab with versions.
3. **A teacher handoff**: export one essay with its version history, checks and self-ratings as PDF or .docx.
