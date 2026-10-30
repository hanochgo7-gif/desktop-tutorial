# Deliverable 4: Educational methodology

Team C, compiled 2026-10-30 from three fact-checked reports, and Team E for writing:
`C1-memory-practice.md` (memory, practice, retention), `C2-pedagogy-feedback.md` (CEFR, pedagogy, feedback, AI,
motivation, placement), `C3-hebrew-l1.md` (Hebrew-speaking learners, Israeli context, L1 support), and
`E-advanced-writing.md` (writing curriculum and rubric). Evidence and citations are in those reports; decision IDs
(C1-D4, C2-D20, C3-S1 ...) refer to their "Implementation decisions" sections.

Each method below states what the evidence supports, how strong it is, and exactly where Lucid implements it.

## 1. Methods implemented

| Method | Evidence (strength) | How Lucid implements it | Where |
|---|---|---|---|
| **Spaced repetition** | Distributed practice beats massed practice for long-term retention (strong; meta-analytic). FSRS predicts recall better than SM-2 on large open benchmarks (strong, but on Anki-style data). | FSRS via `ts-fsrs`, retention target 0.90 (0.85 / 0.95 options), interval cap, workload governor (8 new words a day, 4 when reviews pile up) | `js/core/srs.js`, `learner.js` (C1-D1-D3, D6) |
| **Retrieval practice and active recall** | Testing effect is robust, larger with feedback and delayed tests (strong). | Every review is a recall attempt; correct answer shown on every error; no "re-read" modes; delayed second recall inside the session (exit check) | `views/review.js`, `adaptive.dailyPlan` (C1-D5, D8) |
| **Objective grading, not self-rating** | Learners' judgements of their own recall are poorly calibrated (moderate). | Wrong = Again, hinted/slow = Hard, correct = Good, Easy only when fast and proven; no four-button self-rating | `srs.gradeFrom` (C1-D4) |
| **Retrieval format ladder** | Recall beats recognition; direction of learning matters (moderate). | Recognition on first exposures, then typed meaning recall, then form recall (Hebrew to English) once stable | `review.js`, `srs.unlockedFormCards` (C1-D7) |
| **Blocked then interleaved practice** | Interleaving helps discrimination between confusable categories after initial learning (moderate for L2 grammar; mixed). | New structures are taught blocked in their lesson; targeted drills mix each topic with its "competitor" (past simple vs present perfect, etc.) | `pool.COMPETITORS`, `drill.js` (C1-D11) |
| **Worked examples and cognitive load** | Worked examples help novices; the effect reverses for experts (strong for novices). | Example-first explanations at low levels; Hebrew placed next to the English it explains, not in a separate panel; explanations short | lesson schema, `i18n.bi` (C1-D15) |
| **CEFR as the spine, assessed not assigned** | CEFR Companion Volume (framework; authoritative). Levels must be demonstrated (CV, Manual). | 75 lessons with can-do objectives; per-skill levels from evidence; level checks without hints or AI; "Lucid estimate, aligned to CEFR descriptors", never "certified" | `adaptive.skillLevels`, `checkpoint.js` (C2-D1-D3, D9, D31) |
| **Explicit instruction plus meaningful use** | Explicit instruction yields larger, durable effects (strong meta-analyses); output and interaction support acquisition (moderate). | Lesson template: input, short explicit focus, controlled practice, free production, feedback, retrieval; validator rejects lessons without input or production | `validate-content.mjs`, lesson schema (C2-D13-D15) |
| **Task-supported learning** | Task-based teaching shows benefits; "strong TBLT" superiority is contested. | Real-life scenarios end in real tasks (book, complain, negotiate) after explicit phrase support; no "TBLT is proven" claims | `scenario.js` (C2-D16) |
| **Comprehensible input and extensive reading** | Extensive reading has positive effects (moderate); comprehension needs high lexical coverage. | Graded reading and listening in every lesson and in the centers; texts recommended at or below the learner's level | `reading.js`, `listening.js` (C2-D18, C1-D17 partially) |
| **Corrective feedback** | Oral and written CF are effective; prompts that push self-repair work well; focused WCF is defensible at lower levels (moderate). | Lessons explain why, with error-specific feedback; AI writing feedback is hint-first and minimal-edit; focused at A2-B1, comprehensive available at B2+; tutor prompts before correcting, at most one correction per turn by default, learner-controlled intensity | `exercise.js`, `lucid-ai/prompts.ts` (C2-D20-D23, D26) |
| **Revise and transfer** | Revision with feedback improves the revised text; transfer to new texts needs measuring separately (moderate). | Every submission is a version; the AI reports progress since the previous draft; versions compared word by word | `essay.js`, `diff.js` (C2-D24) |
| **Pronunciation for intelligibility** | Intelligibility, not nativeness, is the target; perception training generalises better than production training (moderate). | Minimal-pair perception drills for Hebrew-relevant contrasts (tier 1 /ɪ-iː/ and /w-v/); speech recognition shown as "what was heard", never as an accent score; self-assessment fallback | `speaking.js`, `exercise.js` speak (C2-D34-D37, C3-P1, P6) |
| **Hebrew as a fading scaffold** | L1 support helps beginners most, and its benefit shrinks with proficiency (moderate); higher-level learners expect English-only. | Hebrew UI and explanations at Pre-A1-A1, partial at A2, on tap at B1-B2, off from C1; learner can override; always one tap away | `i18n.SUPPORT_BY_LEVEL` (C3-S1-S2) |
| **Contrastive notes where Hebrew differs** | Typological differences (no present copula, no indefinite article, no grammatical aspect, no do-support, adjective order, no capitals) are well documented; claims about specific Hebrew-speaker error rates are hypotheses. | Short contrastive notes only for these documented contrasts, worded as "in Hebrew this works differently"; no unsupported transfer claims | lesson authoring brief, `taxonomy.json` (C3-G1-G2, "what not to build") |
| **Adaptive learner model** | Personalised practice targeting weak areas is supported in principle; placement needs adaptive testing with honest uncertainty. | Time-weighted topic mastery; recurring errors across days trigger targeted drills; adaptive placement with "I don't know"; placement provisional and learner-adjustable | `adaptive.js`, `placement.js` (C2-D5, D8) |
| **Delayed retention as the success metric** | Immediate performance misleads; delayed tests show learning (strong). | Progress reports recall on due reviews against the target, and recall after 30 days when enough data exists; mastery needs evidence on two days | `adaptive.periodReport` (C1-D22) |
| **Motivation without manipulation** | Self-determination theory: autonomy, competence and relatedness; extrinsic rewards for activity can undermine motivation; no peer-reviewed evidence found for streaks. | No XP for time, no leaderboards, no loss-framed streaks; a weekly goal with free days; informational feedback (what you can now do) | `today.js`, `progress.js` (C2-D38-D42) |

## 2. Deliberately not built (and why)

- No SM-2 or home-made scheduler; no "mark as known" without a recall check (C1).
- No accent scores, "% native" or accent-reduction claims (C2-D34, C3-P6).
- No AI tutor that writes the learner's work; no LLM rewriting of learner texts (C2-D30, D26).
- No single global level without the per-skill profile; no certificates (C2-D2, D3).
- No efficacy marketing ("X hours = a semester"): Lucid has no outcome study yet (C2-D43-D44).
- No hard-coded "Hebrew speakers' mistakes" list presented as research; no Swan & Smith citation (it has no Hebrew
  chapter) (C3).
- No Bagrut or AMIRNET score predictor; no reuse of official exam items (C3-I3).

## 3. Partially implemented or deferred (documented, not claimed)

- Rasch-calibrated adaptive placement (C2-D5): the current placement is a staircase over an expert-levelled bank;
  calibration needs real response data.
- Lexical-coverage gating of texts (C1-D17) and encounter counting (C1-D18).
- High-variability perception training with several voices (C3-P2): browser voices vary by device.
- Human audit of AI corrections (C2-D28): the "report a mistake" log exists; the audit process is operational, not code.
- Productive sample in placement (C2-D6) and a spelling probe (C3-W2).
- Delayed probe items scheduled deliberately at 1, 7 and 30 days (C1-D22): 30-day recall is currently measured from
  naturally due reviews.

## 4. Writing development

See `E-advanced-writing.md` for the ten-stage writing curriculum, the 12-category rubric with band descriptors and
the feedback protocol, implemented in `content/writing/*`, `views/writing.js`, `views/essay.js` and the
`lucid-ai` rubric.
