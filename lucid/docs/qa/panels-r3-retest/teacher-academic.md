Simulated review (AI persona), not real user research.

# Teacher panel, round 3 re-test: university lecturer, English for Academic Purposes and academic writing

## Who I am

An AI playing a university lecturer in EAP and academic writing who teaches Hebrew-speaking first-year and
graduate students. A few hours ago I reviewed Lucid's B2-C2 content and writing lab
(`docs/qa/panels-r3/teacher-academic.md`). The team then shipped the plan in `docs/qa/panels-r3/plan.json`
(RW-2, RW-4, RW-5, RW-6, RW-7, RW-12, EX-11, BL-4 answer my findings; genres, export, topic rotation and
"lesson task continues in the lab" were deferred on purpose). This is the re-test on the new build.

Screenshots and scripts: `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/teacher-academic/`
(below only the file name is given). Playwright Chromium, he-IL, Hebrew UI, light mode, desktop 1366x900 unless
I say 1440x900, dark mode, or phone 390x844 at 130% text. AI is off on this site; I judged flow, automatic checks
and honesty.

## What I did

1. Onboarding `#/start` as a graduate student (Noa, 2001, writing + studies goals, 35 min, "advanced" start): it
   still leads to `#/placement?start=advanced` (shots `01-ob-*`).
2. Lab hub `#/writing` as B2 and C1 (`08-lab-b2`, `05-lab-c1`).
3. C1 assignment `#/writing/wa-05`: my old 201-word draft with two uncited sentences copied from Source A (`05-wa05-*`),
   then a new 432-word draft with all three sources cited and one quoted sentence; rated it in the new "מחוון" tab,
   saved the rating, marked it "final (self-assessed)", then looked at the lab, `#/progress` and `#/today`
   (`05b-*`).
4. B2 exercise `#/writing/we-10` with my 213-word essay full of first-year errors (`03-we10-*`).
5. `#/writing/we-16` (3-word check, model gate, Sources tab), `#/writing/we-14` (timer + versions),
   `#/writing/we-12` (two drafts compared), `#/writing/free` (`09-*`, `08-we12-versions`).
6. `#/writing/final-B2` at 1440 (sticky checks), `#/writing/final-C2` after starting `wa-08` (`07-*`).
7. Phone 390x844, 130% text: `#/writing/wa-06` sources, checks, rubric (`12-phone-*`).
8. Lessons `#/lesson/c1-03` and `#/lesson/c2-03` through to their long writing steps (`06-*`, log `s06b.log`).
9. Probed `analyzeWriting` directly with the Hebrew-L1 sentences from last time and a few more
   (`s11-analyzer.mjs`, `s11b-analyzer.mjs`, `s11c.mjs`). Dark mode check of the issue cards and rubric (`08-dark-*`).

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| 1 | Without AI, no rubric, no self-assessment, no way to finish a task | **fixed** | `#/writing/wa-05`: new tab "מחוון" shows "המחוון לשלב 8" with 11 categories, Band 5/3/1 descriptors and a "הדירוג שלכם" select each; "שמירת הדירוג עם הגרסה" gave "הדירוג נשמר עם גרסה 1."; "לסמן כסופית (הערכה עצמית)" produced "סופית · הערכה עצמית גרסה 1." The lab card now reads "בוצעה · הערכה עצמית" and stage 8 "4 משימות · אחת בוצעה"; Progress still says writing gets a level only from AI feedback (`05b-rubric-after-final`, `05b-lab-after`, `05b-progress`). See new findings N1 and N6 about the length gate and the panel length. |
| 2 | Checks miss the Hebrew-L1 errors the C1/C2 lessons teach | **partly** (big step) | Probe: "Although …, but", "has found in 2021", "Rarely we", "offers new reading", "Why we should…?" are now flagged at B2, C1 and C2; "proves", "all", "Everyone" are highlighted as "טענה גורפת?" from stage 8. In `we-10` the checks now catch "a student write", "people is", "depends in", "informations", "I am agree", "more better" (`03-we10-checked`). Still missed: "this tools **in** the university" (caught only at sentence end, "They need this tools."), the comma splice "This is a serious concern, a student who copies does not practise." at B2, "Since …, so …", "The results was", "Researches show", "The number of students increase", "It is depend", "According to Smith (2020) he claims". |
| 3 | Source tasks: copied sentences and missing citations pass silently | **fixed** | `wa-05` 201-word draft: "שימוש במקורות · צוטטו: Dana Merrow (2025) · לא צוטטו: Halvarden City Planning Office (2025), Halvarden Residents' Panel (2025) · 5 קטעים תואמים מקור כמעט מילה במילה"; each card names the source ("תואם למקור A/B/C") with "quote it and name the source, or put it in your own words". A sentence I put in quotation marks with "(Halvarden City Planning Office, 2025)" was not flagged, and the 432-word draft lists all three as cited (`05-wa05-checked-viewport`, `05b-*`). Small false positive in N4. |
| 4 | Argument-structure signals misread academic prose | **partly** | Each tick now shows what it matched ("נמצא: “Merrow (2025) argues”", "“According to”", "“This essay argues”", "“could”"); "I think" now counts as a position; hedging is shown at stage 8; author-year citations count. Still: my concession "However, Merrow's strongest point is…" ticks "הפרכה" on "However" alone (`05-wa05-checked-viewport`), and the bare noun "research" in "The research proves it." ticks "ראיות או דוגמאות" (phone, `12-phone-wa06-checked`). |
| 5 | English inside Hebrew panels loses direction | **partly** | Lab: source passages are left-aligned with full stops at line ends on desktop and phone (`05-wa05-tab-sources`, `12-phone-wa06-sources`); the `we-10` plan is numbered "1." on the left and checklist boxes sit beside their text (`03-we10-expanded`); C1 issue explanations read LTR in light and dark (`08-dark-wa05-issues`). Still broken inside lessons: the c1-03 writing check card reads '.sentences start with "research". Vary how sentences begin 4 “research”' (`06-c1-03-write-after`). |
| 6 | Long lesson writing tasks are one-shot, cramped, never reach the lab | **partly** | Label is now "שמירה ובדיקה", disabled with "עוד 56 מילים" at 7 words; the box grows; the checklist is a readable LTR grid (`06-c1-03-write-7w`, `06-c1-03-write-after`). But an 84-word discussion section (target 250) still gets a green "נשמר. עברו על הבדיקות והדוגמה.", the textarea becomes read-only, and the text is not in the lab (continuation deferred in the plan). |
| 7 | "No known problems" under a length warning | **fixed** | `we-16`, 3 words: status "דבר אחד לבדוק: אורך (חסרות 297 מילים)." (`09-we16-gate`). Headline wording, see N2. |
| 8 | Model answer opens after a 3-word check | **fixed** | `we-16`: after checking "This is short." the only summaries are "תוכנית עבודה" and "רשימת בדיקה עצמית"; the lock line says "דוגמה לתשובה תיפתח אחרי בדיקה של טיוטה עם 150 מילים לפחות (חצי מהמינימום)". |
| 9 | Word ranges disagree between instructions and checks | **partly** | Lab fixed: `final-C2` "יעד 1,500-2,000 (מתקבל 1,400-2,200)", lab card "800-1,000 מילים (מתקבל 750-1,100)". Lessons not: `c1-03` prompt says "(250-350 words)" and its check says "84 מילים (יעד 250-400)" (`06-c1-03-write-after`); `c2-03` prompt 350-550, data `max_words` 650; `c1-05`, `c2-01` similar. |
| 10 | Internal IDs in the C2 final, no memory of what was written | **fixed** | `final-C2`: "(source pack of assignment “A minimum age for social media”)" and a yellow tag "כתבתם את המטלה הזו ב-3.11.2026" on the topic I had started (`07-finalC2-open`). Wording caveat in N8. |
| 11 | Text to respond to is far from the editor | **fixed** | `we-16`: "הטקסט שעליו עונים נמצא בלשונית ״מקורות״" with "לפתוח ליד הטקסט"; the Sources tab shows the opinion piece LTR beside the editor (`09-we16-sources`). At 1440 the checks panel is sticky and visible next to the textarea after a check (`07-finalB2-checked-viewport`). |
| 12 | Topics repeat across stages | **not-fixed** (deferred) | Stage 5 still has "Phones away all day? Smartphones in secondary schools" right after stage 4 phones (`08-lab-b2`). Plan defers rotation. |
| 13 | Coverage stops at the argumentative essay | **not-fixed** (deferred) | `#/writing/free` still offers "חיבור או טקסט דעה / מייל / הודעה", no own prompt or range; no abstract, summary, data commentary, discussion or literature review in the lab (`09-free`). |
| 14 | No way to hand an essay to a teacher | **not-fixed** (deferred) | Versions tab has the list, compare and "מחיקת הטקסט" only; Settings still offers only "הורדת כל המידע (JSON)". |
| 15 | Polish: band labels, can't, "יתרון כפול", stage counts, timer | **partly** | Fixed: "4 · מעט מעל היעד", "5 · הרבה מעל היעד"; can't → "cannot"; "השוואה כפולה" with "בסיומת er"; stage cards "4 משימות", numbered circles, chevrons, "השלב שלכם" tag (`08-lab-b2`). Not fixed: a draft written with the `we-14` timer running is saved as plain "v1 … 20 מילים", no timed marker (`09-we14-timer-versions`). |

## New findings

### N1. "Final (self-assessed)" at half the length counts the assignment as done (minor)
Route `#/writing/wa-05` (800-1,000 words). My 432-word draft could be marked "לסמן כסופית (הערכה עצמית)"
(the gate is "אפשר לסמן כסופית מ-400 מילים"), and the lab then shows "בוצעה · הערכה עצמית" and "4 משימות · אחת
בוצעה" while the editor still says "דבר אחד לבדוק: אורך (חסרות 368 מילים)" (`05b-lab-after`,
`05b-rubric-after-final`). A student can "complete" a university-length assignment at 54% of its minimum, and
the card does not say so. Suggestion: allow final from the minimum (or the accepted lower bound, 750), or keep
the half gate but label the card "סופית · הערכה עצמית · קצרה מהיעד".

### N2. The checks headline is ambiguous and undercounts (minor)
Routes `#/writing/we-16`, `#/writing/wa-06` (phone). The heading "מצאנו דבר אחד מהדברים שאנחנו בודקים" can read
as "we found one of the things we look for" (a success). On `wa-06` it said "דבר אחד" while the same panel listed
three uncited sources and two sweeping words (`12-phone-wa06-checked`). Suggestion: "יש N דברים לבדוק" and count
source-use and sweeping-word notes too, or say "1 בעיה, 2 מילים גורפות, 3 מקורות שלא צוטטו".

### N3. Evidence tick fires on a bare noun (minor)
Route `#/writing/wa-06` at 390: "Everyone agrees that teenagers are harmed. The research proves it." ticks
"ראיות או דוגמאות · נמצא: “research”" (`12-phone-wa06-checked`); on `wa-05`, "The survey shows" ticks on
"survey". An unsupported claim gets a green tick for evidence, which is exactly the habit the stage teaches
against. Suggestion: at stage 8+, count evidence only for a citation, a number or a reporting phrase with an
attributed source; show bare "research/survey" as "מוזכר מחקר, בלי מקור".

### N4. Sweeping-word and overlap highlighters have predictable false positives (minor)
Probe and `wa-05`. "every year" ("The number of students increase every year.", "Every year more students
apply.") and "he learns nothing" are flagged "טענה גורפת?"; a neutral method sentence "All participants completed
every task." gets two flags. On `wa-05` the place phrase "on the northern edge of Orrin Fields" is flagged "תואם
למקור A" as copying, though a student must name the site. Suggestion: skip every/all + time noun (year, day,
week, time) and "nothing" as an object; exclude n-grams that are mostly proper nouns from the overlap check.

### N5. Lesson writing step: two thresholds, one unexplained (minor)
Route `#/lesson/c2-03` step 16 (`06-c2-03-write-80w`): the counter says "84 מילים · לפחות 350" while the button
says "שמירה ובדיקה · עוד 4 מילים". The learner cannot tell which number matters; in `c1-03` the same 84 words were
saved with a green "נשמר" (see verdict 6). Suggestion: say it on the button: "אפשר לשמור טיוטה מ-88 מילים · היעד
350-550".

### N6. The rubric tab is about six screens long in a narrow panel (minor)
Route `#/writing/wa-05`, tab "מחוון": 11 categories x 3 band descriptors plus a select each, 4,955 px of content in
an 848 px sticky panel; "שמירת הדירוג" and "לסמן כסופית" are at the very bottom (`05b-rubric-after-final`,
script `s13.mjs`). It is complete and honest, but students will not read it at this length. Suggestion: one row
per category (name + select) with the descriptors folded under "מה זה אומר?", and put the save/final keys at
the top or keep them pinned.

### N7. Writing work is invisible on Progress and Today (minor)
After checking and finalising a 432-word C1 assignment, `#/progress` still said "הדוח הראשון יופיע אחרי התרגול
הראשון" and Today (goal "writing") offered a lesson and "קריאה: טקסט קצר" with no link back to the open
assignment or the next lab task (`05b-progress`, `05b-today`). The level rule (only AI-assessed writing gets a
level) is right; but the weekly report should count writing sessions, and a writing-goal learner should see
"להמשיך: Homes or parkland? (גרסה 1)" on Today.

### N8. "כתבתם את המטלה הזו" after a 19-word start (polish)
Route `#/writing/final-C2` (`07-finalC2-open`): I had typed one sentence in `wa-08` and checked it; the C2 final
now says "כתבתם את המטלה הזו ב-3.11.2026". Suggestion: "התחלתם" for drafts, "כתבתם" only for a final.

### N9. "בעברית" chips under every line of the C2 brief (polish)
Route `#/writing/final-C2`: each of 4 topics and each of 7 required elements carries its own "בעברית" chip,
11 chips in one card (`07-finalC2-open`). At C2 one "show all in Hebrew" toggle per card is enough.

## What I liked (keep it)

- **The lab now teaches without AI.** Rubric tab with real descriptors, self-rating saved per version, "final
  (self-assessed)" kept apart from the writing level, and the Progress line that says so. This was my top wish.
- **Source-use checks are exactly what an EAP tutor wants**: cited / not cited against the pack, overlaps named by
  source, quoted text exempt, and an honest note: "היא לא בודקת אם הציטוט מדויק".
- **"נמצא: …" beside each structure tick** lets the student judge the signal instead of trusting a tick.
- **The Hebrew-L1 rules** (Although…but, has found in 2021, Rarely we, Why we should…?, a/an before adjective +
  noun, people is, a student write) with one-line Hebrew explanations and a suggested form.
- **Sweeping-claims highlighter from stage 8**, phrased as a question ("טענה גורפת?"), not an error.
- **Sticky checks panel** at 1440 and scrolled-into-view results on the phone; LTR sources, plans and checklists
  on desktop, phone and dark mode.
- **Model answer gate at half the minimum** and the length-aware status line.
- Kept from last time: version comparison by paragraph, fair open-rewrite verdicts, the honest AI-off notices,
  the strong C1/C2 lesson content (c1-03 calibration, c2-03 synthesis and APA).

## My top 3 wishes now

1. **University genres and "bring your own assignment"** in the editor (summary, abstract, data commentary,
   discussion section, literature review), and the c1-03/c2-03 genre tasks continued in the lab as v1.
2. **Export one essay with its versions, checks and self-ratings** (PDF or .docx) so a lecturer can see the
   revision history.
3. **Tighten the checks' judgment**: final only at the accepted minimum, evidence only for real support, the
   remaining L1 rules (this + plural noun mid-sentence, Since…so, results was, researches, the number of … +
   plural verb), and the same ranges and LTR explanations inside lessons as in the lab.
