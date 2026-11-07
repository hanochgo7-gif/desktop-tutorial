# Deliverable 1: Market research report

Team A, 2026-10-30. This report synthesises four fact-checked competitor reports. Every factual claim below is
sourced in those reports (citations there were opened and checked; see each report's verification log):

- `A-competitors-core-gamified.md`: Duolingo, Babbel, Busuu, Memrise
- `A-competitors-speaking-ai.md`: ELSA Speak, Speak, Praktika, Rosetta Stone
- `A-competitors-input-writing-institutional.md`: LingQ, Quizlet, Cambridge Write & Improve, British Council LearnEnglish
- `A-competitors-discovered.md`: Cambly, Preply, Loora, Grammarly, Jerusalem Post LiteTalk (discovered during research)

Each competitor was assessed on the brief's 15 dimensions plus a 16th: whether English is taught from Hebrew.
The comparison matrix is deliverable 2 (`02-competitor-matrix.md`); real-user evidence is deliverable 3.

## 1. The market in one page

1. **Nobody teaches English from Hebrew.** None of the 17 products profiled offers an English course with a Hebrew
   interface, Hebrew explanations and Hebrew-aware feedback from zero. Duolingo's catalogue has no Hebrew base
   language; Babbel, Busuu and Memrise have no Hebrew UI (Busuu, Memrise and Duolingo do serve Arabic and Russian
   speakers, so the gap is specific to Hebrew-dominant learners). An Israeli academic project (EngliFun, Academic
   College of Tel Aviv-Yaffo) was created for exactly this reason. Yet ELSA, Speak, Praktika, Rosetta Stone and
   others sell in Israel with shekel prices: the demand is served badly, not absent. User reviews confirm the cost
   (deliverable 3, section 6).
2. **The top of the CEFR ladder is empty.** Duolingo English stops at B2 (expanded from A2 only in April 2026);
   Babbel's C1 is something to "work towards" and it says C2 needs practice outside the app; Busuu's C1 is
   English-only; Memrise does not map to CEFR; Speak and Praktika publish no CEFR mapping. "Advanced" in the
   speaking apps means oral polish, not academic language.
3. **Argumentative and academic writing is unserved.** Duolingo has no composition tasks; Babbel's writing is typing
   in context; Busuu relies on unrubricked peer corrections of short answers; ELSA, Speak, Praktika and Loora have
   no writing module; Cambridge Write & Improve flags word- and sentence-level errors (only above high confidence,
   and asks learners to self-correct, a deliberate design worth learning from) but gives no argument or coherence
   feedback; Grammarly corrects without teaching and does not support Hebrew. Tutor marketplaces leave writing to
   individual tutors.
4. **AI conversation is a commodity.** Duolingo says a Video Call costs it under $0.01; Babbel Speak is included at
   no extra cost; Busuu, Memrise, Praktika, Speak, ELSA and Loora all ship AI conversation. Owning an AI tutor is
   no longer a differentiator. What is scarce is AI feedback that is calibrated, explained and trustworthy.
5. **Pronunciation scoring is miscalibrated in both directions** (ELSA judged too strict, Speak too lenient) and is a
   frequent source of distrust in reviews (Rosetta Stone's largest complaint).
6. **Trust and billing dominate negative sentiment:** trial auto-conversion, refund disputes, lifetime-licence
   lock-outs during platform migrations, AI and features gated behind ever-higher tiers.
7. **Gamification is diverging and drawing backlash.** Duolingo's Energy system drew strong reader disapproval in
   an Android Authority poll; peer-reviewed work documents gamification misuse; Speak said it had no gamification
   in 2024 and shipped leagues and streak freezes by 2025; Babbel positions itself against gamification.
8. **Placement, accessibility and offline use are weak across the field.** ELSA has no placement test; only Rosetta
   Stone's enterprise product places onto CEFR paths. Almost no product declares accessibility features in its
   store listing; Busuu self-reports not yet meeting WCAG 2.1 AA. Offline study is rare or undocumented.
9. **Efficacy evidence is thin and mostly vendor-funded,** covering Spanish/French or English receptive skills at
   about A2. No study measures English writing at B2 or above for any of these products.
10. **Price anchors in Israel** (Israeli App Store, 2026-10-30): the four mass-market apps range from about ₪24-₪64
    a month and ₪114-₪539 a year; AI speaking coaches such as Loora run about ₪200-₪410 a year; weekly human
    tutoring costs far more. (Lucid's pricing is out of scope for this build.)

## 2. Segments

| Segment | Products | What they do best | What they leave open |
|---|---|---|---|
| Gamified mass-market | Duolingo, Memrise | Habit, breadth, free entry | Depth, writing, C1-C2, Hebrew |
| Structured courses | Babbel, Busuu, Rosetta Stone | Explanations (Babbel), CEFR structure (Busuu), immersion (Rosetta) | Calibrated writing feedback, Hebrew, true C1-C2 |
| AI speaking coaches | ELSA, Speak, Praktika, Loora | Cheap, unlimited speaking practice | Writing, curriculum depth, trustworthy scoring |
| Input and vocabulary | LingQ, Quizlet | Reading volume, flashcards | Production, feedback, beginners |
| Institutional | British Council, Cambridge Write & Improve | Credibility, assessment know-how | A guided path; progress tracking (BC site); instruction around feedback |
| Human tutoring | Cambly, Preply, LiteTalk | Real conversation | Price, consistency, structured writing curriculum |
| Writing assistants | Grammarly | Polishing text | Teaching; Hebrew; argument |

## 3. Opportunity

A Hebrew-first course that runs from the alphabet to research-based argumentative writing, with feedback that
teaches self-correction and honest per-skill evidence, sits in a gap no profiled product occupies. The opportunity
is strongest at both ends of the ladder: the true beginner who cannot read an English-only interface, and the
B2-C2 learner (university applicants, students, professionals) who needs academic writing and argument, which the
market treats as out of scope.

Risks the strategy must respect:
- AI features are cheap for competitors too; Lucid must not compete on "has AI".
- The Real-Life track is crowded (Praktika's slang avatar, ELSA's coaches, Speak's roleplays, Rosetta's Chat
  Missions); it is a retention and usefulness feature for Lucid, not its differentiator.
- Writing feedback quality is the core promise; it must be calibrated and audited, or it becomes the same trust
  problem reviewers report elsewhere.

## 4. Limitations

Desk research only: no interviews or usability tests with real Israeli learners. Some features could only be
verified from vendor material (labelled "vendor claim" in the reports). Prices and features change quickly; all
were observed on 2026-10-30. Reddit could not be accessed.
