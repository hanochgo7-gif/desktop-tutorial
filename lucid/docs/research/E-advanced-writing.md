# Team E — Advanced writing curriculum and evaluation rubric (A1 to C2)

Accessed and compiled 2026-10-30. Scope: Lucid's writing lab (curriculum, rubric, AI evaluator, feedback protocol) for Hebrew-speaking learners aged 16+, from Pre-A1 sentence building to C1–C2 argumentative and academic writing.

## Method and limitations

**How the evidence was gathered.** Every numbered citation [n] points to a page, record or PDF that was opened with WebFetch in this session. Where WebFetch returned a binary PDF, the saved file was converted with `pdftotext` and read directly. Abstract-level records come from the ERIC database, opened either as individual record pages (`eric.ed.gov/?id=…`) or through the ERIC public API (`api.ies.ed.gov/eric/…`); the exact URL opened is listed in Sources. Effect sizes are given only where the opened source states them.

**Evidence grades used below.**
- **A**: meta-analysis or systematic review.
- **B**: experiment or quasi-experiment.
- **C**: descriptive, correlational, case or corpus study, or conference abstract.
- **D**: framework, assessment specification, institutional guidance or expert opinion.

**Limitations. Please read these before relying on specific wording.**
1. **CEFR Companion Volume (2020) was not opened.** All `coe.int` and `rm.coe.int` URLs returned HTTP 403 to WebFetch, and so did the ECML mirrors. CEFR descriptors here come from reproductions of the 2001 CEFR scales: the University of Helsinki CEFTrain project [5] and a university language centre's copy of the self-assessment grid [6]. The CEFTrain text came back paraphrased by the fetch tool, so it is not quoted verbatim. Pre-A1 written descriptors, the 2020 wording changes and the CV competence scales (grammatical accuracy, coherence and cohesion, propositional precision and others) are **not verified in this report**. They must be checked against the CV before content is written. Team C2's report covers the CV and should be cross-checked.
2. **Harvard Writing Center's counter-argument handout was blocked (403).** Counterargument guidance comes from UNC [11] and a University of Hohenheim writing aid [14] instead.
3. **The Cambridge English Writing Assessment Scale was read through two teacher guides**, B2 First for Schools [3] and C2 Proficiency [4]. These give the B2 and C2 band descriptors and the cross-level progression of the Organisation subscale. A2, B1 and C1 band tables were not opened in full.
4. **Many records are abstracts.** Moderator details were not available for Kang & Han [44], Abrami [24], Wolfe [19] and others.
5. **Much argumentation, critical-thinking and lateral-reading research is L1 English** (US, Canada, Australia), often with school-age or undergraduate samples. Much written corrective feedback (WCF) research targets a single structure, usually English articles. The transfer to adult Hebrew-L1 EFL writers is an inference.
6. **LLM-scoring evidence dates from 2023–2025 models** [62][63]. Lucid's evaluator must be validated locally.
7. **No Hebrew-L1 learner-corpus study of English writing errors could be opened.** The web-search budget for this session ran out before a deeper search. Hebrew-specific error priors below are hypotheses (see Team C3).

---

## 1. Level frameworks: CEFR, Cambridge English and IELTS

### Evidence summary

**CEFR written production scales (2001 wording via [5][6]).**
- *Overall written production*, in paraphrase [5]:
  - A1: simple isolated phrases and sentences.
  - A2: simple phrases and sentences linked with simple connectors such as "and", "but" and "because".
  - B1: straightforward connected texts on familiar subjects, made by linking shorter elements into a linear sequence.
  - B2: clear, detailed texts on a variety of subjects related to the writer's field of interest, "synthesising and evaluating information and arguments from a number of sources".
  - C1: clear, well-structured texts on complex subjects that highlight the salient issues and support the writer's points before reaching a conclusion.
  - C2: clear, smoothly flowing, complex texts in an effective style, with a logical structure that helps the reader find significant points.
- *Reports and essays* [5]:
  - **No descriptor at A1 or A2.**
  - B1: short, simple essays on topics of interest; summarising factual information and giving an opinion.
  - B2: an essay or report that develops an argument systematically, gives reasons for or against a point of view, explains the advantages and disadvantages of options, and evaluates ideas or solutions.
  - C1: well-structured expositions of complex subjects, supporting points with reasons and examples.
  - C2: complex reports or essays that present a case or critically appraise proposals or works, with an effective logical structure.
- *Self-assessment grid* [6]:
  - B2: "I can write an essay or report, passing on information or giving reasons in support of or against a particular point of view."
  - C1: "I can select style appropriate to the reader in mind."
  - C2: "I can write complex letters, reports or articles which present a case with an effective logical structure which helps the recipient to notice and remember significant points."
- *Monitoring and repair* [5]: at B2 the learner corrects slips that cause misunderstanding and monitors their own recurring mistakes. This is a general production-strategy scale, worded mainly for speech. Nothing is described below B1.

**Cambridge English Writing Assessment Scale [3][4].**
- **Four subscales:** Content, Communicative Achievement, Organisation and Language. Each is marked separately from 0 to 5; "together, these indicate the learner's areas of strength and weakness" [3].
- **Band definitions.** Descriptors are written for Bands 1, 3 and 5. Bands 2 and 4 are defined as "Performance shares features of Bands 1 and 3 / 3 and 5" [3][4].
- **Bands are relative to the exam's target level.** "If a candidate scores Band 3 or above in the B2 First for Schools exam, this generally indicates an ability of at least CEFR B2 level. Bands 1 and 2 indicate that the learner is still performing at B1 level" [3]. C2 Proficiency uses the same structure, with Band 3+ meaning C2 and Bands 1–2 meaning C1 [4].
- **Subscale meanings [3]:**
  - Content: did the writer do what the task asked, with nothing irrelevant?
  - Communicative Achievement: is the style appropriate to the communicative context? A very formal email to a friend is the example of failure.
  - Organisation: is the text logical and ordered, with genre-appropriate organisation?
  - Language: are range and accuracy adequate? "Examiners focus on whether the reader is still able to understand the text."
- **Organisation progression across levels [3][4]:**
  - A2: "connected using basic, high-frequency linking words".
  - B1: "connected and coherent, using basic linking words and a limited number of cohesive devices".
  - B2: "generally well organised and coherent, using a variety of linking words and cohesive devices".
  - C1: "a well-organised, coherent whole, using a variety of cohesive devices and organisational patterns with flexibility".
  - C2: "organised impressively and coherently using a wide range of cohesive devices and organisational patterns with complete flexibility".
- **C2 Band 5 Language [4]:** "wide range of vocabulary, including less common lexis, with fluency, precision, sophistication and style… Any inaccuracies occur only as slips".

**IELTS Writing Task 2 public band descriptors (updated May 2023) [1].**
- **Four criteria:** Task Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy, on a 0–9 scale.
- **Fit rule:** "A script must fully fit the positive features of the descriptor at a particular level. Bolded text indicates negative features that will limit a rating" [1].
- **Task Response, band by band:**
  - Band 9: "The prompt is appropriately addressed and explored in depth. A clear and fully developed position is presented which directly answers the question/s. Ideas are relevant, fully extended and well supported."
  - Band 7: main ideas are extended and supported, "but there may be a tendency to over-generalise or there may be a lack of focus and precision in supporting ideas/material".
  - Band 6: "some supporting arguments and evidence may be less relevant or inadequate".
  - Band 4: "A position is discernible, but the reader has to read carefully to find it" [1].
- **Grammatical Range & Accuracy:**
  - Band 6: "Errors in grammar and punctuation occur, but rarely impede communication."
  - Band 5: "Grammatical errors may be frequent and cause some difficulty for the reader."
  - Band 4: "Subordinate clauses are rare and simple sentences predominate".
  - Band 8 separates "occasional, non-systematic errors" [1].
- **Lexical Resource:**
  - Band 6: "If the writer is a risk-taker, there will be a wider range of vocabulary used but higher degrees of inaccuracy."
  - Band 4: penalises "inappropriate use of lexical chunks (e.g. memorised phrases, formulaic language and/or language from the input material)" [1].
- **Hard rules:**
  - "Responses of 20 words or fewer are rated at Band 1".
  - "Any copied rubric must be discounted".
  - Band 0 applies where an answer "has been totally memorised" [1].
- **No separate counterargument criterion.** Depth and development are folded into Task Response [1].

**IELTS–CEFR relationship [2]:**
- Band 8.5+ is recognised as C2.
- The C1 threshold lies between 6.5 and 7.
- Band 5 is borderline B1/B2.
- IELTS states that the test is not level-based, that there is "no one-to-one correspondence", and that the mapping refers to overall band scores, not individual skills.

### Strength of evidence
- **Grade D throughout.** These are assessment frameworks and specifications, authoritative for *what to assess*.
- **They are not evidence that a teaching sequence works.**
- **Two scale designs compared.** Cambridge's level-relative bands and IELTS's single absolute scale are both established designs. Cambridge's makes it explicit that the same band number means different things at different levels [3][4].

### What it means for Lucid
- **Mixed scale design.** Use a Cambridge-style 0–5 band per category, relative to the stage's target CEFR level, for diagnostic feedback [3]. Keep a separate absolute CEFR estimate for progress analytics (rubric category 12).
- **Borrow IELTS rules.** Take the "must fully fit" rule, the under-length rule and the memorised or copied-text rules as evaluator rules [1].
- **Do not equate.** Do not present IELTS band equivalents as scores [2].
- **Argument categories at low levels.** The CEFR has no Reports-and-essays descriptor at A1–A2 [5]. Argument-specific categories should be NOT APPLICABLE there (see §8.4).

---

## 2. What works in writing instruction (general evidence base)

### Evidence summary
- **Graham & Perin (2007) [7]** meta-analysed experimental and quasi-experimental studies in grades 4–12: 123 documents yielding 154 effect sizes on writing quality.
  - Strategy instruction and summarisation had the largest average weighted effects (**0.82 each**).
  - Grammar instruction had a **negative** effect (**−0.32**).
- **The Writing Next report [8]** lists eleven research-supported elements:
  - strategies for planning, revising and editing;
  - summarisation;
  - collaborative writing;
  - specific product goals (assigning "specific, reachable goals");
  - word processing;
  - sentence combining;
  - prewriting;
  - inquiry;
  - process writing;
  - study of models;
  - writing for content learning.
  - The report cautions that together they do not make a full curriculum.
- **The What Works Clearinghouse practice guide [9]** rates its recommendations:
  - **Strong evidence:** "Explicitly teach appropriate writing strategies using a Model-Practice-Reflect instructional cycle".
  - **Moderate evidence:** integrating reading and writing to emphasise key writing features.
  - **Minimal evidence:** using assessments of student writing to inform instruction and feedback.
- **Fading scaffolds (McNeill et al., 2006) [23].** 331 seventh-graders worked through an 8-week project-based chemistry unit, with written claim–evidence–reasoning (CER) scaffolds either kept continuous or faded. Students made significant learning gains overall (the record does not report gains separately per group). On post-test items **without** scaffolds, the faded group wrote **stronger reasoning**.

### Strength of evidence
- **Grade A** for [7][8]; **Grade D, evidence-rated by an external panel,** for [9]; **Grade B** for [23].
- **Main caveat:** these are L1 English adolescents (grades 4–12), not adult EFL learners.
- **The negative grammar effect** concerns traditional, decontextualised grammar teaching as a *writing* intervention [7]. It does not show that grammar feedback on learners' own texts is useless (see §9).

### What it means for Lucid
- **Model–practice–reflect cycle.** Build every writing lesson on it [9]: show an annotated model, practise with scaffolds, then self-assess against the rubric.
- **Strategies and summary writing.** Teach explicit planning and revising strategies, and include summary writing as a core task type [7][8].
- **Sentence combining** is the main Stage 1 exercise, rather than isolated grammar drills [7][8].
- **Fade scaffolds within each stage** and test exit with scaffolds off [23].

---

## 3. The 10-stage writing curriculum

**Design notes.**
- **CEFR alignment** means the *language* level at which the stage's output is described in [5][6].
- **Argument skill versus language level.** Argumentative competence is partly separate from language level. In grade 4–12 writing samples, few students at any grade used opposition or a response to it [21] (the record does not say whether they had been taught to), and elaborated goals improved even sixth-graders' argumentative writing [15]. Lucid's learners are 16+ and cognitively ready for argument before their English is. Stages 3–6 can therefore start with heavily scaffolded frames at B1, while language demands rise more slowly.
- **Task lengths are design defaults, not evidence.** They should be tuned with Lucid data.

| # | Stage | Target CEFR (language) | Objectives (learner can…) | Exercise types | Scaffolds (faded across the stage [23]) | Exit criteria (all on an unseen prompt, scaffolds off) |
|---|---|---|---|---|---|---|
| 1 | **Sentence construction** | Pre-A1 → A2 (A1: simple isolated phrases and sentences; A2: sentences linked with simple connectors such as and, but, because [5]; Pre-A1 unverified, see Limitations) | Write SVO statements, questions and negatives about self and others. Use the indefinite and definite article, plural -s, present and past simple. Join clauses with and/but/because/so. | Sentence combining [8]; unscrambling; picture-prompt sentences; transforming statement→question→negative; gap-fill frames; error-spotting in one sentence. | Word bank; sentence frames ("I like ___ because ___"); Hebrew gloss of the instruction (see Team C3); colour-coded S-V-O slots. | Five of six sentences grammatical. At least two sentences use a connector correctly. No sentence-boundary errors (fragment or run-on) that impede meaning. Grammar, vocabulary and sentence structure each band ≥3. |
| 2 | **Paragraph development** | A2 → B1 (B1: straightforward connected texts made by linking shorter elements in sequence [5]; Cambridge A2→B1 organisation [3]) | Write a 5–8 sentence paragraph with a topic sentence, 2–3 supporting sentences and a closing sentence. Sequence events or reasons. Use pronoun reference without ambiguity. | Topic-sentence choice; paragraph reordering; "add a supporting detail"; summary of a short text [7]; a guided email or narrative paragraph. | Paragraph skeleton (TS → 2–3 support → close); linker menu (first, then, also, however, because); annotated model paragraph [9]. | Coherence and cohesion band ≥3. One clear topic per paragraph. At least three accurate cohesive devices. Register appropriate for the genre (Cambridge Communicative Achievement [3]). |
| 3 | **Expressing opinions** | B1 (B1 Reports and essays: short essays, opinion with summary [5]) | State a clear opinion. Give 2+ reasons, each with an example. Distinguish fact from opinion. Use opinion language (I believe / In my view / I disagree that…). | Fact-or-opinion sorting; "reason + example" expansion; agree/disagree short essays (120–180 words); comparing two model opinions. | Opinion frame (Opinion → Reason 1 + example → Reason 2 + example → restated opinion); stance-phrase bank. | Opinion explicit in the first two sentences. Every reason relevant and exemplified. Argument strength (simplified) band ≥3. Language categories band ≥3 at B1. |
| 4 | **Building arguments** (claim, reasons, evidence, examples) | B1+ → B2 (B2: develops an argument systematically [5]; "giving reasons in support of or against a particular point of view" [6]) | Write a debatable claim [11]. Support it with reasons. Supply relevant, sufficient evidence (data, example, expert, experience). Make the warrant explicit (Toulmin [10]; CER [23]). | Claim-strength ranking (too broad / not debatable / good); match evidence to claims; "explain the link" (warrant) prompts; 180–250-word argument paragraphs; evaluate weak versus strong support. | CER or Toulmin template [10][23]; elaborated-goal checklist [15]; graphic organiser. | Argument strength and evidence quality band ≥3. Every reason carries evidence plus an explicit link. No unsupported key claim. Evidence quality predicts argument quality, so presence of parts alone does not count [22]. |
| 5 | **Counterarguments** | B2 (B2 reports and essays: weighing pros and cons and evaluating different solutions [5]) | Identify the strongest opposing view and state it fairly. Attribute it ("Critics argue…"). Signal it clearly so it is not mistaken for the writer's own view [14]. | "Naysayer" generation; steel-manning a weak objection; choosing which objection matters most; spotting straw men [12]; one-paragraph counterargument insertion. | Goal instruction that names counterarguments explicitly [16]; argument–counterargument organiser [17]; attribution phrase bank [14]. | Counterarguments band ≥3. At least one serious, fairly stated objection [11]. Correct signalling. No straw man. |
| 6 | **Rebuttals** | B2 → B2+ | Answer an objection by refuting it, conceding and outweighing, or qualifying the claim [11][14]. Integrate the response into the argument [17][18]. | Matching objections to rebuttal types; "concede-then-outweigh" rewriting; weighing pros and cons (Argumentation Vee Diagrams, AVD [18]); peer-model comparison. | Rebuttal-move menu; criteria for weighing arguments [17][18]; sentence frames ("Although X, Y because…"). | Counterarguments band ≥3 *including the rebuttal*. Rebuttal relies on reasoning or evidence, not dismissal [14]. The claim is adjusted when a concession is made [11]. |
| 7 | **Essay structure** | B2+ → C1 (C1: well-structured texts on complex subjects, supporting points with reasons and examples and reaching a conclusion [5]; Cambridge C1 organisation [4]) | Plan and write a full argumentative essay (250–350 words): introduction with thesis, body paragraphs (one point each), placed counterargument and rebuttal, conclusion with no new arguments [14]. | Outline-first tasks; thesis-to-outline mapping; reverse outlining of models; body-paragraph unity edits; timed essays. | Essay blueprint; reverse-outline tool; model essays at Bands 3 and 5 [9][3]. | All applicable categories ≥3 and none <2. Coherence and cohesion ≥3 at the C1 descriptor (a "coherent whole… with flexibility" [4]). Counterargument placed before the conclusion. |
| 8 | **Critical thinking** (assumptions, bias, fallacies) | C1 | Detect unstated assumptions, myside bias [19][20] and fallacies [12][13] in others' texts *and own drafts*. Qualify overgeneralisations (IELTS Band 7 negative feature [1]). | Spot-and-fix weak reasoning in context (not name-only quizzes); argument mapping [26]; "argue against your own conclusion" [12]; bias audit of own draft. | Fallacy catalogue (§5); UNC self-check questions [12]; argument-map editor. | Argument strength ≥3 at C1. No fallacy flagged as major in two consecutive essays. A bias-audit task shows the learner can state both sides. |
| 9 | **Academic writing** (formal register, hedging, citation, source evaluation) | C1 → C2 (B2: synthesising and evaluating information and arguments from several sources [5]; C1: "select style appropriate to the reader in mind" [6]) | Write in formal register. Calibrate stance with hedges and boosters [37][39]. Quote, paraphrase and summarise with attribution [40]. Evaluate sources with SIFT and lateral reading [29][31]. Synthesise 2–3 sources. | Hedge calibration (rewrite overclaims); paraphrase-not-patchwrite drills [41][42]; SIFT source triage [29]; mini literature syntheses (350–500 words); citation formatting. | Phrasebank categories [39]; source-evaluation checklist built on SIFT moves (not CRAAP-only [36]); paraphrase comparison view. | Academic tone and evidence quality ≥3. Every source-derived idea attributed. No uncorrected patchwriting. At least one source checked laterally before use. |
| 10 | **Independent argumentation** | C2 (C2: "present a case with an effective logical structure" [6]; reports and essays that present a case or critically appraise proposals [5]; Cambridge C2 Band 3+ [4]) | Choose a position on an open prompt. Research, plan, draft and revise a 400–700-word argument independently, with no scaffolds and self-assessment only. | Open prompts; self-assessment against the rubric before AI feedback [61]; one revision cycle; timed and untimed versions. | None by default; scaffolds on request only, and their use is logged. | Overall CEFR estimate = C2 on two essays separated by at least 2 weeks. All applicable categories ≥3 at the C2 descriptor. Self-assessment within ±1 band of the evaluator on at least 9 of 12 categories. |

**Cross-stage rules.**
- **Write before seeing a model of the same prompt.** Feedback after an attempt is more effective [58], so models are shown for parallel prompts.
- **Re-test exit on a new text.** WCF gains transferred to new texts at 1- and 4-week delays [48]. Exit therefore requires performance on a new prompt, not on a revised draft.
- **Summary-writing tasks recur in Stages 2–9.** Summarisation was among the highest-effect elements [7].

---

## 4. Argumentation models: Toulmin, CER, counterargument and rebuttal

### Evidence summary
- **Toulmin model [10]:**
  - **Claim**: the point to prove.
  - **Grounds or data**: evidence.
  - **Warrant**: the stated or implied assumption linking grounds to claim.
  - **Backing**: support for the warrant.
  - **Qualifier**: words such as "presumably", "some", "many" that show the claim may not always hold.
  - **Rebuttal**: an acknowledged alternative view.
  - Qualifiers and rebuttals strengthen credibility by showing a careful, unbiased approach [10].
- **Claim–evidence–reasoning (CER)** is a simplified three-part version used successfully with faded scaffolds [23].
- **University writing-centre guidance on arguments [11]:**
  - A claim should be specific and debatable.
  - Evidence standards vary by field.
  - Anticipate objections by imagining who would deny each premise.
  - Either concede a point while explaining why the argument still holds, or reject the objection and explain the error.
  - State opposing views fairly, not as caricatures.
  - "It is usually better to consider one or two serious counterarguments in some depth" than to give a long but superficial list [11]. (Corrected 2026-10-30: an earlier version presented a paraphrase of this sentence as a direct quotation.)
  - If an objection changes the writer's position, revise the argument [11].
- **The Hohenheim writing aid [14]:**
  - Choose counterarguments with sound evidence or wide currency.
  - Signal them ("However…", "Many people think…") so readers do not think the writer contradicts themselves.
  - Reaffirm the claim by showing the counterargument is mistaken, by granting it validity while arguing the claim is stronger on balance, or by refining the claim.
  - Never place counterarguments in the conclusion.
- **Explicit goals increase counterarguments.**
  - Ferretti et al. [15]: sixth-graders given an elaborated goal, with subgoals based on the elements of argumentation, wrote more persuasive essays containing more argumentative elements.
  - Nussbaum & Kardash [16], 184 undergraduates: specific goals produced more counterarguments and rebuttals. **Instructions to "persuade" reduced counterargumentation and overall argument quality.** A text outlining arguments and counterarguments helped, but only for students with less extreme prior attitudes.
- **Integration needs criteria, not only organisers.**
  - Nussbaum & Schraw [17], 84 undergraduates: a graphic organiser produced more *refutations*, while criteria instruction produced better argument–counterargument *integration*, with stronger rebuttals and more balanced reasoning.
  - Nussbaum [18], 45 undergraduates: Argumentation Vee Diagrams improved integration and revealed a "minimization" strategy of downplaying a disadvantage.
- **Myside bias.**
  - Wolfe, Britt & Butler [19]: arguments that rebutted opposing evidence were rated higher than myside-biased ones, and **a brief written tutorial** improved essays by sharpening claims, elaborating reasons and reducing myside bias.
  - Wolfe [20]: balanced and fact-based argumentation *schemata* predicted myside bias in essays.
  - Macpherson & Stanovich [28]: instructional set (decontextualising versus non-directive instructions) had a significant effect on myside bias in argument generation; the debiasing effect of decontextualising instructions was largest among the lowest-ability participants. Neither cognitive ability nor thinking dispositions predicted myside bias.
- **Development across grades.** Knudson [21] scored grade 4, 6, 10 and 12 argumentative samples with the Toulmin model and holistic scoring. There were significant grade-level differences, but "few children in any grade used features of opposition or response to opposition".
- **Structure is not quality.** In essays by 33 advanced Korean high-school EFL learners, quality tracked the use of the fundamental Toulmin elements, especially data, and was best predicted by how well each claim was supported with relevant and sufficient data, rather than by whether the elements merely appeared [22].

### Strength of evidence
- **Grade B** for [15][16][17][18][19][23] and **Grade C** for [20][21][22]. Effect sizes were not available in the opened records.
- **Mostly L1 English samples.** Only [22] is EFL.
- **The persuasion-instruction finding [16]** is a single study, but it is directly actionable for prompt wording.

### What it means for Lucid
- **Prompt wording.** Ask learners to "write an argumentative essay that considers and responds to opposing views", never only to "persuade" [16]. Show an elaborated-goal checklist [15].
- **Score substance, not structure.** The AI must score the *relevance and sufficiency* of support and the fairness of counterarguments, never award points for labelled Toulmin parts [22].
- **Teach weighing criteria explicitly** [17][18]. Add a short "myside" tutorial at Stage 5 [19].
- **Depth over coverage.** Require one or two serious objections handled in depth, not a list [11].

---

## 5. Critical thinking and the logical-fallacies catalogue

### Evidence summary
- **Abrami et al. (2015) [24]:** 341 effect sizes from quasi- and true experiments. Weighted random-effects mean **g+ = 0.30**, heterogeneous. Three approaches improved critical-thinking skills:
  - dialogue;
  - exposure to authentic or situated problems and examples;
  - mentoring.
- **Abrami et al. (2008) [25]:** 117 studies, 20,698 participants, **g+ = 0.341** (SD 0.610). Intervention type and pedagogical grounding explained 32% of variance. Critical-thinking objectives should be **explicit**, not left to "implicit expectation".
- **Argument mapping.**
  - In a single-semester undergraduate course, web-based argument-mapping exercises with automated feedback were followed by a pre-to-post-test gain of **0.45 standard deviations** on a standardised critical-thinking test, which the authors call "a modest, but encouraging result" [26]. This is a within-course pre–post gain compared informally with other courses, not a controlled comparison.
  - A 2025 systematic review found 124 studies (102 empirical), most on attitudes, collaboration or map quality [27].
- **Fallacy sources.**
  - UNC's handout [12] lists 16 fallacies.
  - Purdue OWL [13] adds the genetic fallacy, circular argument and moral equivalence.
  - UNC recommends self-checks [12]:
    - argue against your own conclusion;
    - outline premises to find gaps;
    - review past papers for the fallacies you tend to commit;
    - be wary of "all", "never" and "everyone";
    - check that descriptions of opponents are fair;
    - explain the mechanism behind any causal claim;
    - check analogies on relevant properties;
    - keep key terms constant;
    - look for alternatives to "only two options".

**Lucid fallacy catalogue (18 entries).** Definitions are paraphrased from [12][13]. Detection cues and fix prompts are Lucid design.

| Code | Fallacy | Definition | Evaluator detection cue | Fix prompt (shown at hint rung H2+) |
|---|---|---|---|---|
| F01 | Hasty generalisation | Broad conclusion from a small or unrepresentative sample [12][13] | Universal quantifier and a single anecdote | "How many cases support this? Can you qualify it?" |
| F02 | Missing the point | Premises support a different conclusion [12] | Reasons don't connect to the thesis | "Does this reason prove *your* claim?" |
| F03 | Post hoc / false cause | Sequence treated as causation [12][13] | "after… so…", with no mechanism | "Explain *how* X causes Y" |
| F04 | Slippery slope | Unsupported chain to an extreme outcome [12][13] | "will lead to… eventually…" | "Which step has evidence? Which doesn't?" |
| F05 | Weak analogy | Comparison fails on the relevant properties [12] | "just like…" | "In what relevant way are they alike?" |
| F06 | Appeal to (irrelevant) authority | Expert outside their expertise [12] | Celebrity or non-expert cited | "Is this person an expert *on this*?" |
| F07 | Ad populum / bandwagon | True because many believe it [12][13] | "Everyone knows…", "most people…" | "Is popularity evidence here?" |
| F08 | Ad hominem | Attacks the person [12][13] | Insult or character claim against opponents | "Respond to their *argument*" |
| F09 | Tu quoque | Dismissed because the arguer is inconsistent [12] | "But they also…" | "Is the argument still sound?" |
| F10 | Appeal to pity | Sympathy instead of reasons [12] | Emotional appeal with no reason | "What reason supports this?" |
| F11 | Appeal to ignorance | True because not disproven [12] | "No one has proved…" | "Absence of proof is not proof" |
| F12 | Straw man | Opponent misrepresented as weaker [12][13] | Counterargument is an extreme caricature | "Would the other side accept this description?" |
| F13 | Red herring | Distracting side issue [12][13] | Topic shift in the rebuttal | "Return to the main question" |
| F14 | False dichotomy / either-or | Only two options presented [12][13] | "either… or…" | "Are there other options?" |
| F15 | Begging the question / circular | Conclusion assumed in the premises [12][13] | Claim restated as its own reason | "Give a reason that isn't the claim itself" |
| F16 | Equivocation | Key term shifts meaning [12] | Same word, two senses | "Define the term once and keep it" |
| F17 | Genetic fallacy | Judged by origins, not merits [13] | "It comes from X, so…" | "Judge the idea on its merits" |
| F18 | Moral equivalence | Minor wrong equated with a major one [13] | Disproportionate comparison | "Are these really comparable?" |

### Strength of evidence
- **Grade A** for [24][25]. Effects are modest, around g ≈ 0.30–0.34, and highly heterogeneous.
- **Grade C** for [26]. A single course, single-group pre–post gain of 0.45 SD.
- **Grade A, descriptive,** for [27].
- **Grade D** for the fallacy catalogues [12][13].
- **No opened source showed** that learning fallacy *names* transfers to better writing. This is the key gap.

### What it means for Lucid
- **Make critical-thinking objectives explicit** [25].
- **Teach through dialogue-like AI exchanges and authentic problems** [24]: real Israeli and global issues relevant to 16+ learners.
- **Spot-and-fix in context.** Teach fallacies as **"spot-and-fix in a real paragraph, including your own"** [12]. Name-matching quizzes alone are not a substitute.
- **Argument maps** are an optional planning tool [26]. Expect modest gains.

---

## 6. Source evaluation: SIFT and lateral reading

### Evidence summary
- **SIFT (Caulfield, 2019) [29]:**
  - **S**top: don't read or share until you know what the source is.
  - **I**nvestigate the source.
  - **F**ind better coverage.
  - **T**race claims, quotes and media to the original context.
  - All four moves reconstruct the context the web strips away.
- **Fact-checkers versus experts.** In a think-aloud study of 45 people, professional fact-checkers **read laterally** (leaving the site to check it) and reached warranted conclusions faster. Historians and students read vertically and were misled by logos and domain names [30].
- **High school field study.** **Six 50-minute lessons** in a district-wide government course, treatment n = 271 against matched controls n = 228, produced significant growth in judging the credibility of digital content [31].
- **College course.** A general-education civics curriculum (n = 136 against 94, instructor-matched sections) increased lateral reading and correct trustworthiness judgements [32].
- **Canadian schools.**
  - A Canadian middle and high school curriculum (CTRL-F) (N = 2,278; teacher-matched subset 316 against 287) increased preference for and use of lateral reading, with gains maintained at a delayed post-test (N = 994) [33].
- **Caveats.**
  - Undergraduates (N = 483) often *preferred* lateral reading on multiple-choice items but rarely *demonstrated* it on open-response tasks [34].
  - Judging source credibility and verifying claims appear to involve different reasoning and may need separate teaching [35].
  - A 2024 critique argues for replacing "vertical" checklists such as CRAAP with lateral reading [36].

### Strength of evidence
- **Grade B** (quasi-experimental field studies) for [31][32][33]; **Grade C** for [30][34][35]; **Grade D** for [29][36].
- **Consistent direction across studies.**
- **Limits:**
  - L1 English contexts.
  - Outcome measures are credibility judgements, not writing quality.
  - Preference does not equal performance [34].

### What it means for Lucid
- **Teach SIFT as actions inside the writing task.** At Stage 9 the learner must log one lateral check (a new tab or search) per source before citing it [29][31].
- **Assess performance, not stated preference.** Use open-response tasks [34].
- **Separate the two skills.** Use separate exercises for "is this source credible?" and "is this claim true?" [35].
- **Language of lateral reading.** Allow lateral reading in Hebrew. The skill is source investigation, not English reading. This is a design inference.

---

## 7. Academic register: hedging, stance, citation and paraphrase

### Evidence summary
- **Hyland's model [37][38].** Hyland (2005) built a model of stance and engagement from 240 research articles across eight disciplines, plus insider interviews [37]. As summarised in [38], it has nine categories:
  - **Stance:** hedges, boosters, attitude markers, self-mention.
  - **Engagement:** reader references, directives, asides, questions, appeals to shared knowledge.
- **Calibrated commitment.** Writers "must weigh up the commitment they want to invest in their arguments based on its epistemic status" (Hyland, cited in [38]).
- **Manchester Academic Phrasebank [39]** organises cautious language by function:
  - devices that distance the author from a proposition ("It is thought that…");
  - being cautious when giving explanations ("It is probable…");
  - being cautious when explaining results ("This inconsistency may be due to…") and advising cautious interpretation of results;
  - implications ("The findings of this study suggest that…");
  - recommendations ("A reasonable approach … could be to…");
  - the future ("It is likely…");
  - devices for avoiding over-generalisation (e.g. "tends to").
- **Quote, paraphrase, summarise [40].** Quotations reproduce a narrow segment word for word and should be used "only sparingly", with a good reason. Paraphrase restates a passage in the writer's own words. Summary gives only the main ideas. **All three require attribution.**
- **Patchwriting.**
  - Howard (1992) separated patchwriting from plagiarism and argued that writing teachers should treat it as an acceptable, developmental source-use practice [41]. Her definition, "copying from a source text and then deleting some words, altering grammatical structures" (and substituting synonyms), is quoted in a later ERIC record (Crook, 2016, ED571856) returned by the same ERIC query [41]; the 1992 record itself does not contain it.
  - Two first-year Hong Kong students who understood the plagiarism policy still produced patchwriting and weak citation [42].
  - Pedagogical contexts that deny ESL writers authority can encourage patchwriting [43].

### Strength of evidence
- **Grade C** (corpus and interview) for [37][38]. These describe expert norms, not learning outcomes.
- **Grade D** for [39][40].
- **Grade C/D** for [41][42][43].
- **No opened source tested** a hedging intervention's effect on L2 writing quality. This is a gap.

### What it means for Lucid
- **Teach calibration, not more hedging.** A claim's strength should match its evidence [38]. The evaluator flags both overclaiming (boosters without evidence; IELTS "over-generalise" [1]) and needless stacked hedges.
- **Patchwriting is a learning event.** Treat close paraphrase as a feedback item in the "Source use" error family, not an integrity accusation [41][42]. Show the source and the learner's sentence side by side.
- **Use the Phrasebank's functional categories** for the hedging phrase bank [39].

---

## 8. The 12-category writing rubric

### 8.1 Design principles from evidence
- **Analytic, topic-specific rubrics with exemplars and rater training** improve scoring reliability. Rubrics alone do not guarantee valid judgement, and they "make expectations and criteria explicit", which supports feedback and self-assessment [60].
- **Formative rubric use** may improve performance and self-regulation, moderated by several factors [61].
- **Separate subscale marks** reveal strengths and weaknesses [3].
- **Level-relative bands** (Band 3 = target level achieved) [3][4].
- **Rating rules.** Use the "must fully fit the positive features" rule; negative features limit the rating [1].
- **LLM raters need calibration examples.** With one calibration essay per rating category (here, per CEFR level of a single holistic rating), GPT-4 reached QWK 0.81 against a human rater, versus 0.84 for a strong automated writing evaluation (AWE) baseline. Without examples, neither GPT-3.5 nor GPT-4 beat a character-length-only baseline. A detailed rubric and required rationales added "negligible benefit" once at least one calibration example per rating category was present [62]. Whether this carries over to *analytic*, multi-category scoring is untested in [62].

### 8.2 Scale

Each category is scored **0–5 or N/A**, relative to the **stage target CEFR level**. This follows Cambridge [3][4].

| Band | Meaning |
|---|---|
| **5** | Fully meets every positive feature of the Band 5 descriptor. Performance is clearly above the stage target. |
| **4** | Shares features of Bands 3 and 5 [3]. Lucid operationalises this as all Band 3 features and at least half of the Band 5 features (Lucid design; Cambridge gives no such rule). |
| **3** | **Meets the stage target** and fully fits the Band 3 descriptor. For language categories this means the target CEFR level is shown [3]. |
| **2** | Shares features of Bands 1 and 3 [3]. |
| **1** | Fits the Band 1 descriptor: performance typical of roughly one CEFR level below target [3]. |
| **0** | Below Band 1, or no rateable evidence. Examples: content totally irrelevant (Cambridge Content Band 0 [3]); an answer totally memorised (IELTS Band 0 [1]); ≤20 words of own language (Lucid design: IELTS rates responses of 20 words or fewer at **Band 1**, not 0 [1]). Copied prompt text is discounted before scoring rather than scored [1]. |
| **N/A** | The category is not assessed at this stage or for this task (see §8.4). It is excluded from all aggregates. It is **not** the same as 0. |

**Task-fulfilment gate.** This is a gap in the 12-category brief. The brief has no Content or Task Response category, yet both Cambridge (Content) [3] and IELTS (Task Response) [1] treat task fulfilment as central. Lucid adds a non-scored gate:
- If the prompt is misunderstood, or any required part is missing, argument strength, evidence quality and counterarguments are **capped at 2**.
- The overall CEFR estimate is capped one sub-level lower.
- If the response is off-topic, all categories are capped at 1 and the learner is asked to resubmit.
- Copied prompt text is discounted before scoring [1].

### 8.3 Category descriptors

Bands 5, 3 and 1 are defined. Bands 4 and 2 are interpolated as in §8.2. "Target" means the stage's CEFR target. Mappings cite only opened sources.

| # | Category | Band 5 | Band 3 (meets target) | Band 1 | Maps to |
|---|---|---|---|---|---|
| 1 | **Grammar** (accuracy and range of forms) | Range beyond target used with control and flexibility; any errors are slips that never impede meaning. | Forms expected at target used with good control; errors noticeable but meaning always recoverable; complex forms less accurate than simple ones. | Mostly simple or memorised forms; frequent errors, some impeding meaning. | Cambridge Language [3][4]; IELTS GRA bands 5–8 [1] |
| 2 | **Vocabulary** (range, precision, collocation, word form, spelling) | Range including less common lexis used appropriately and precisely; collocation natural; spelling errors only as slips. | Range adequate for the task at target; occasional inappropriate word choice or collocation; spelling and word-form errors don't impede. | Limited, repetitive vocabulary; frequent wrong word choice; errors impede meaning; reliance on memorised chunks or prompt language. | Cambridge Language [3][4]; IELTS LR, incl. Band 4 "memorised phrases… language from the input" [1] |
| 3 | **Sentence structure** (boundaries, word order, subordination, variety) | Varied, flexible sentence forms suited to purpose; no boundary errors. | Mix of simple and complex sentences at target; boundary errors rare and non-impeding. | Simple sentences predominate and subordination is rare (IELTS Band 4 [1]); fragments or run-ons obscure meaning. | IELTS GRA [1]; CEFR A1→A2 linking [5] |
| 4 | **Coherence** (logical sequencing, progression, paragraph unity) | Ideas progress logically throughout; every paragraph has a clear central idea; the reader follows "effortlessly". | Clear overall progression; paragraphing logical with minor lapses. | Organisation hard to follow; no clear progression or paragraph focus. | IELTS CC [1]; Cambridge Organisation [3][4]; CEFR B1→C2 [5] |
| 5 | **Cohesion** (linkers, reference, substitution) | Cohesive devices used flexibly, so cohesion rarely "attracts attention"; reference always unambiguous. | Variety of devices appropriate to target (A2 basic linkers → B2 variety [3]); some mechanical use or misuse. | Few or repetitive devices; inaccurate or unclear referencing. | Cambridge Organisation progression [3][4]; IELTS CC [1] |
| 6 | **Argument strength** (debatable position, reasons, warrant, logic, qualification) | Clear, debatable thesis; every reason logically supports it with an explicit warrant; appropriate qualifiers; no fallacies. | Clear position; reasons relevant and mostly linked to the claim; at most one minor logical weakness. | Position hard to find ("reader has to read carefully" [1]); reasons irrelevant or circular; major fallacy. | IELTS TR [1]; CEFR B2–C2 essays [5]; Toulmin [10]; UNC [11][12] |
| 7 | **Evidence quality** (relevance, sufficiency, specificity, credibility) | Each claim backed by relevant, sufficient, specific evidence; sources credible and evaluated. | Most claims supported with relevant evidence; some support general or thin. | Support absent, irrelevant or purely assertive. | IELTS TR Bands 6–7 [1]; Paek & Kang [22]; SIFT [29] |
| 8 | **Counterarguments** (fair opposing view, rebuttal, integration) | Strongest objection stated fairly and attributed; rebutted through reasoning or evidence; claim refined where conceded; fully integrated. | At least one relevant objection, clearly signalled; a reasoned (if brief) response. | Objection missing (where required), a straw man, or dismissed without reasons. | UNC [11]; Hohenheim [14]; Nussbaum [16][17]; Wolfe [19] |
| 9 | **Academic tone** (register for genre and reader; calibrated stance; citation conventions) | Register consistently appropriate; stance calibrated to evidence; citation conventions correct. | Generally appropriate register with occasional informal lapses; some over- or under-hedging. | Register inappropriate for the genre (e.g. chatty in an essay); unqualified overclaims; no attribution. | Cambridge Communicative Achievement [3]; CEFR C1 "select style" [6]; Hyland [37][38]; Phrasebank [39] |
| 10 | **Clarity** (intelligibility of each proposition at first reading) | Every sentence's meaning is clear at first reading. | Meaning clear overall; a few sentences need re-reading. | Many sentences unintelligible without guessing. | Cambridge "whether the reader is still able to understand" [3]; IELTS "impede communication" [1] |
| 11 | **Precision** (exactness of words and claims: scope, quantifiers, specificity) | Words and claims exact; scope stated; no vague or over-general statements. | Mostly precise; some vague wording or over-generalisation. | Pervasive vagueness; sweeping claims ("all", "never") without support. | IELTS LR "precise meanings", TR Band 7 "over-generalise… lack of… precision" [1]; Cambridge C2 "precision" [4]; UNC on "all/never" [12] |
| 12 | **Overall CEFR-aligned performance** | Absolute label: Pre-A1, A1, A2, A2+, B1, B1+, B2, B2+, C1, C2 (see §8.5). | | | CEFR production scales [5][6]; Cambridge Band 3 = target [3][4]; IELTS–CEFR caveats [2] |

**Avoiding double-counting.**
- *Clarity* is local intelligibility. *Coherence* is the logical relation between ideas.
- *Precision* is exactness of wording and scope. *Vocabulary* is lexical range and correctness.
- *Argument strength* is logic. *Evidence quality* is the support.
- The evaluator prompt must state these boundaries, and each error is tagged to one primary category (§9.2).

### 8.4 NOT APPLICABLE matrix (by stage)

Key: **●** = full descriptor. **◐** = simplified descriptor (named below). **N/A** = not scored.

| Category | S1 Sentence (Pre-A1–A2) | S2 Paragraph (A2–B1) | S3 Opinion (B1) | S4 Argument (B1+–B2) | S5 Counter (B2) | S6 Rebuttal (B2–B2+) | S7 Essay (B2+–C1) | S8 Critical (C1) | S9 Academic (C1–C2) | S10 Independent (C2) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 Grammar | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 2 Vocabulary | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 3 Sentence structure | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 4 Coherence | N/A (single sentences) / ◐ multi-sentence | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 5 Cohesion | ◐ (and/but/because only, from A2 [5]); N/A at Pre-A1–A1 | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 6 Argument strength | N/A | N/A | ◐ (opinion + relevant reason) | ● | ● | ● | ● | ● | ● | ● |
| 7 Evidence quality | N/A | N/A | N/A (examples scored under 6) | ● | ● | ● | ● | ● | ● | ● |
| 8 Counterarguments | N/A | N/A | N/A | N/A | ● (objection) | ● (+ rebuttal) | ● | ● | ● | ● |
| 9 Academic tone | N/A | ◐ (genre register only [3]) | ◐ | ◐ | ◐ | ◐ | ● | ● | ● (+ hedging, citation) | ● |
| 10 Clarity | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 11 Precision | N/A | ◐ (word choice only) | ◐ | ● | ● | ● | ● | ● | ● | ● |
| 12 Overall CEFR | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |

**Rationale.**
- The CEFR has no reports or essays descriptor at A1–A2 [5], so argument categories are N/A in Stages 1–2.
- Cambridge assesses register appropriacy at every level [3], which is why tone is simplified rather than N/A from S2 onward.
- Counterarguments become applicable at B2, where the CEFR first describes evaluating alternatives and advantages or disadvantages [5].
- **Placement exception.** If a learner placed below a stage's language target takes an argument task, the argument categories stay applicable. Language categories are judged against the learner's *current* level so that argument feedback is not drowned out.

### 8.5 Category 12: overall CEFR-aligned performance
- **Holistic judgement with anchors.** The evaluator assigns an absolute CEFR label holistically, using CEFR-anchored calibration essays, as in the Duolingo study [62].
- **Rule-based cross-check.** The label is compared with a mapping from the stage target and the language-category bands:
  - Bands ≥3 on categories 1–3 and 10 support the target level.
  - Bands 1–2 suggest one level lower [3][4].
- **Disagreement flag.** If the holistic and rule-based labels differ by more than one sub-level, the result is flagged for review and shown as a range.
- **Display.** Show learners a range (e.g. "B1+–B2"), not a single point. GPT-4 "struggled to distinguish between adjacent CEFR levels" [62].
- **No IELTS or Cambridge score predictions** [2].

### 8.6 Evidence on AI essay scoring and the consistency protocol

**Evidence.**
- **Duolingo study [62]** (short L2 essays, CEFR rubric, 2,457 essays in the fairness analysis):
  - With calibration, GPT-4 used the full CEFR range but confused adjacent levels, especially B2.
  - Ratings were slightly positively biased, about **+0.15 CEFR levels** overall; this bias did not vary significantly by gender or L1 (p > 0.10), and agreement did not differ significantly by gender.
  - Agreement varied by L1: **QWK 0.66 (Telugu) to 0.89 (Spanish)**.
  - Human–human QWK was 0.87 [62].
- **University essays [63]** (67 Italian psychology essays, five LLMs, four content-heavy criteria, three replications):
  - Human–LLM QWK was low and non-significant.
  - Within-model consistency across replications was weak (median Kendall's W < 0.30).
  - Models showed a tendency to inflate Coherence scores and handled context-dependent criteria inconsistently.
- **Interpretation.** LLMs approach AWE agreement on *holistic CEFR language level* with calibration [62]. They are unreliable on *context-dependent content* criteria without strong anchoring [63]. Argument strength, evidence quality and counterarguments are content criteria, so this is the highest-risk part of Lucid's rubric.

**Consistency protocol.** This is a Lucid design, linked to the evidence above.
1. **Calibration essays.** Score with at least one calibration essay per band per category per stage, at least five per category-stage, drawn from Hebrew-L1 learners (L1 variation [62]). Annotate each with its rationale. [62] tested one example per CEFR level for a single holistic rating; extending this to per-band, per-category analytic scoring is a Lucid inference that local validation must test.
2. **Analytic scoring.** Use an analytic, stage-specific rubric with exemplars [60]. Score one category at a time with an evidence quote from the text before each score.
3. **Repeated runs.** Run each scoring 3 times at low temperature and take the median per category. If any category's runs span more than 1 band, mark it "low confidence" and show "~" in the UI [63].
4. **Bias monitoring.** Track mean bias against a human-scored audit set. Apply an offset if the bias is above 0.25 band [62].
5. **Human review.** Low-confidence content-category scores at exit points (stage promotion) need either a second AI pass with different calibration essays or human review before they are used for promotion.

---

## 9. Feedback protocol

### 9.1 Evidence summary: written corrective feedback (WCF)

**Meta-analyses.**
- **Kang & Han (2015) [44]:** 21 studies. WCF *can* improve grammatical accuracy, with efficacy moderated by proficiency, setting and genre.
- **Lim & Renandya (2020) [45]:** 35 studies.
  - **g = 0.72** before three outlier studies were removed; the final sample of 35 studies gave **g = 0.59** (CI 0.423–0.755), with significant heterogeneity. Delayed post-tests (at least 2 weeks after treatment; 23 of the 35 studies) gave **g = 0.569**.
  - Proficiency was the strongest moderator: **low/low-intermediate g = 0.982**, high-intermediate/advanced **g = 0.696**, intermediate **g = 0.364**.
  - Direct **g = 0.761** versus indirect **g = 0.625**, not significantly different.
  - Focused **g = 0.628** versus unfocused **g = 0.445**, not significantly different.
  - One-shot treatment **g = 0.641**, which did not differ significantly from multiple sessions.
- **Brown, Liu & Norouzian (2026) [46]:** a Bayesian meta-analysis of 52 controlled studies. "Robust evidence of the durability of moderate effectiveness" over time. Direct, indirect and metalinguistic feedback gave similar effect sizes.
- **Truscott (2007) [47], the contested counter-view:** the best estimate is a **small negative** effect of correction on accuracy, with any benefit "very small" at 95% confidence.

**Experiments.**
- **Van Beuningen et al. (2012) [48]**, N = 268:
  - Comprehensive direct and indirect CF both improved accuracy in revision *and new texts* at 1- and 4-week delays.
  - **Direct CF** produced grammatical gains in new writing. **Indirect CF** helped non-grammatical accuracy most.
  - CF did **not** reduce structural complexity or lexical diversity.
- **Focused and unfocused feedback on English articles were equally effective** [49].
- **Direct metalinguistic CF outperformed direct-only** at delayed post-test [50].
- **Focused CF can backfire.** It improved targeted article functions but may have *hurt* non-targeted ones, especially with metalinguistic explanation [51].
- **Focused CF plus revision** gave the best sentence-error reduction and writing quality. Comprehensive CF plus revision gave the best overall accuracy [52].
- **Coded versus uncoded error marking** gave no significant difference. Both beat no feedback for self-editing [53].
- **Personalised self-editing on major error patterns** reduced error rates [54]. Teaching self-editing for common error patterns is also recommended for L2 university writers [55].

**Graduated help.**
- **Aljaafreh & Lantolf (1994) [56]:** three ESL learners in an 8-week course, with feedback on articles, tense, prepositions and modals.
  - The study set out a 13-step (0–12) regulatory scale, running from implicit help (read and find errors yourself) through locating, naming the error type, clues and the correct form, to explanation and examples.
  - Help should be **graduated** (start implicit, become explicit only as needed) and **contingent** (withdrawn when the learner shows self-control).
  - Development was measured partly as the learner needing *less explicit help* over time [56].
- **Ai (2017) [57]:** in an intelligent computer-assisted language learning (ICALL) system, graduated feedback helped learners self-identify and self-correct a number of grammatical problems. When the system failed to give adequate help, an onsite tutor stepped in. The article's keywords indicate Chinese as a foreign language (the *ba*-construction), not English; the sample size is not in the abstract.

**General feedback evidence.**
- **Wisniewski et al. (2020) [59]:** 435 studies, 994 effect sizes. Mean **d = 0.48** (after removing extreme values; 0.55 before). **High-information feedback d = 0.99**, corrective **0.46**, reinforcement or punishment **0.24**. Motivational outcomes were lower (0.33).
- **Shute (2007) [58]** recommends:
  - elaborated feedback in manageable units;
  - specific, simple feedback;
  - feedback after the learner attempts;
  - caution with overall grades (grades alone or with comments can crowd out comments);
  - sparing praise;
  - **"Avoid using progressive hints that always terminate with the correct answer"**: prevent hint abuse;
  - minimal extensive error diagnosis;
  - immediate feedback for difficult tasks, delayed feedback for simple ones.

**Automated and generative-AI feedback.**
- **AWE meta-analyses:**
  - Zhai & Ma [64]: **g = 0.861**, 26 studies.
  - Ngo et al. [65]: between-group **g = 0.59**, 24 studies.
  - Xue [66]: **SMD = 0.422**, 29 studies.
- **Low-level feedback alone.** In an AWE system, spelling and grammar feedback had little to no impact on essay properties [67].
- **Generative-AI studies:**
  - **Human versus AI.** A counterbalanced design (two groups swapped human-tutor and GenAI feedback across two argumentative writing tasks) with 59 EFL learners in Turkey found **no significant effect** of GenAI feedback, while human-tutor feedback improved language, mechanics and overall scores [68].
  - **AI versus no feedback.** An RCT with first-year university students in Hong Kong reported significant essay-quality gains in the LLM-feedback group, with a no-feedback control [69]. The record gives no sample size and no between-group statistics, so the size of the advantage is unknown.
  - **AI plus teacher.** Combined ChatGPT and teacher feedback was not better than teacher feedback alone on syntactic complexity (n = 35) [70].
  - **Learner preferences.** EFL students preferred teacher, or teacher plus ChatGPT, feedback [71].

### Strength of evidence
- **WCF: Grade A, consistent moderate positive effects** [44][45][46], with a vocal dissent [47]. Many primary studies are narrow (one structure, often articles [49][50][51]), short-term and classroom- or lab-specific.
- **Focused versus unfocused is unresolved** [45][49][51][52].
- **Graduated help** rests on a small qualitative study of three ESL learners [56] and one ICALL study in L2 Chinese [57] (Grade C), plus expert guidance [58] (Grade D). It is theoretically coherent but under-tested at scale.
- **AWE effects are positive but vary widely across meta-analyses** (g 0.42–0.86) [64][65][66].
- **GenAI feedback evidence is young and mixed** [68][69][70]. Comparisons with *no feedback* look better than comparisons with *human feedback*.

### 9.2 Error taxonomy (codes used by the evaluator, error log and analytics)

Each error gets one primary code, a rubric category, a severity, and a span with location.

| Family | Codes (examples) | Rubric category |
|---|---|---|
| **G — Grammar** | G-VT verb tense/aspect · G-VF verb form · G-SVA agreement · G-ART articles/determiners · G-PREP prepositions · G-NUM noun number · G-MOD modals · G-PRON pronouns · G-COP missing or extra be | 1 |
| **S — Sentence** | S-FRAG fragment · S-RUN run-on/comma splice · S-WO word order · S-SUB faulty subordination · S-PAR parallelism | 3 |
| **L — Lexis** | L-WC word choice · L-COL collocation · L-WF word form · L-SP spelling · L-REG register-inappropriate word | 2 (L-REG → 9) |
| **M — Mechanics** | M-PUNC punctuation · M-CAP capitalisation | 1 (for Hebrew–English orthography contrasts, see Team C3 §4) |
| **D — Discourse** | D-REF unclear reference · D-LINK missing or misused linker · D-OVERLINK mechanical overuse · D-PARA paragraphing · D-TS missing topic sentence · D-PROG broken progression | 5 / 4 |
| **A — Argument** | A-CLM claim not debatable or unclear · A-UNSUP unsupported claim · A-WAR missing link (warrant) · A-EVID irrelevant or weak evidence · A-FAL-F01…F18 fallacy (§5) · A-CA-MISS objection missing · A-CA-STRAW straw man · A-REB-WEAK rebuttal dismissive · A-MYSIDE one-sided treatment · A-OVERGEN overgeneralisation | 6 / 7 / 8 / 11 |
| **R — Register and stance** | R-INF informal in academic genre · R-OVERCLAIM unhedged claim beyond the evidence · R-OVERHEDGE stacked hedges · R-PERS inappropriate personalisation | 9 |
| **U — Source use** | U-CITE missing attribution · U-PATCH patchwriting · U-QUOTE over-quoting · U-SRC unevaluated or weak source | 9 / 7 |
| **C — Clarity** | C-AMB ambiguous sentence · C-UNINT unintelligible | 10 |

**Hebrew-L1 priors are a hypothesis to validate.** Hebrew marks only definiteness (*ha-*) and leaves indefinite noun phrases unmarked, whereas English has *a/an* [72]. This predicts G-ART omission of *a/an* among Hebrew-L1 writers. Team C3 lists further grammar and orthography contrasts. Lucid should verify these priors against its own error-log data before prioritising them, and must not assume them.

### 9.3 Severity: critical, major and stylistic

The operational criterion is reader comprehension, taken from Cambridge ("whether the reader is still able to understand the text" [3]) and IELTS ("impede communication", "non-systematic errors" [1]).
- **Critical:** the error impedes meaning at first reading (C-UNINT, some S-WO, G-VT that changes time reference, or a missing thesis). It is always shown, whatever the focus.
- **Major (systematic):** a recurring, rule-governed error that does not block meaning, such as three or more of the same G or L code in a text, or the stage's focus category. It is shown when it is in the feedback focus (§9.4).
- **Stylistic or minor:** a slip, a non-systematic error, or a stylistic preference (e.g. a more elegant linker). It is logged and hidden by default; "Show all" reveals it.

### 9.4 Focused feedback rules
- **Show feedback in manageable units** [58]: at most **3 error patterns** (codes, not instances) per draft, plus every critical error.
- **Selection order:**
  1. critical errors;
  2. the stage-focus category;
  3. the learner's recurring codes (§9.7);
  4. frequency.
- **Log comprehensively, display selectively.** All errors are still logged. Comprehensive CF works and does not cause simplification [48], focused and unfocused effects are statistically similar [45][49], and focused-only treatment may degrade untargeted forms [51]. "Show all" is available from B2.
- **Content before form in early drafts.** For argument-stage drafts (S4+), draft 1 gets argument and organisation feedback first, plus critical language errors only. Language patterns move to draft 2. Combining focused feedback with revision gave the best quality gains [52]. The ordering itself is a Lucid design choice.
- **Grade display.** Show band profiles rather than a single overall grade during revision, because grades can crowd out comments [58]. Overall CEFR appears only on the final draft.

### 9.5 Hint ladder before revealing a solution

This is adapted from Aljaafreh & Lantolf's regulatory scale [56], applied per error pattern or per argument issue.

| Rung | Language error (A&L levels) | Argument issue (analogue) |
|---|---|---|
| **H0 Self-check** | "Paragraph 2 has 2 problems with verb forms. Can you find them?" (0–2) | "Read your second paragraph as someone who disagrees. What would they say?" [12] |
| **H1 Locate** | Highlight the sentence or phrase (3–5) | Highlight the claim that lacks support |
| **H2 Name** | Category plus code: "verb tense (G-VT)" (6–7) | Name the issue: "unsupported claim" or "possible straw man (F12)" |
| **H3 Clue** | Context clue or mini-rule: "this action is still continuing" (9) | Guiding question: "What evidence would convince a sceptical reader?" |
| **H4 Model** | Correct form, a 1–2 line explanation and one more example (10–12) [50] | Model sentence or paragraph showing the move, which the learner must then adapt |

**Rules.**
1. **Attempt before each rung.** Each rung opens only after a learner attempt or an explicit "I'm stuck" [58]. This prevents clicking straight to the answer [58].
2. **Starting rung:**
   - Learners at A1–A2: start at **H2** for grammar. Low-proficiency learners gain most from WCF [45], and direct CF helps grammar in new texts [48].
   - Learners at B1+: start at **H0/H1** [56].
   - Spelling and lexis (non-grammatical): start at **H1**. Indirect CF helps non-grammatical accuracy most [48].
3. **Cap.** H4 is shown after at most 3 failed attempts in total. Difficult tasks need prompt help so learners don't stall [58]. **Evidence tension (added 2026-10-30):** Shute's guideline 16 says "Avoid using progressive hints that always terminate with the correct answer" and to make provisions against hint abuse [58]. A guaranteed H4 after 3 attempts, plus the "I'm stuck" bypass in rule 1, means this ladder always can end in the answer. The attempt requirement is the only anti-abuse provision. The cap is therefore a Lucid design choice that [58] does not support; consider ending some ladders at H3 plus a parallel practice item instead of H4.
4. **H4 always includes the explanation.** Direct metalinguistic beat direct-only at delayed post-test [50].
5. **Log the help level used** (H0–H4) per error instance. Falling help levels over time count as development, separately from the error rate [56].

### 9.6 Revision cycles
- **Default:** Draft 1 → focused feedback → Revision 1 (required) → re-score → optional Revision 2 → final.
- **Limit:** at most 2 AI-feedback revision cycles per task. A single treatment was as effective as several in the meta-analysis [45]; the cap itself is a Lucid choice, not something the meta-analysis tested.
- **Score revisions, then test transfer.** Count the revision score for task completion. Promotion uses a **new-text** check within 1–4 weeks [48].
- **Explain the revision prompt.** Text-specific comments matter for revision, and students need help processing feedback [73]. In practice, each feedback item must name the location and the action expected.

### 9.7 Tracking recurring errors
- **Error log per learner.** Store code, stage, text ID, help level and resolution.
- **Recurring flag:** a code appears in ≥3 of the learner's last 5 texts, or at least 3 instances in one text. These are design thresholds.
- **What happens to recurring codes:**
  - they get priority in focused feedback (§9.4);
  - they generate a targeted micro-lesson and spaced-review items for the SRS and adaptive engine;
  - they appear in a learner-facing "My patterns" page, supporting self-editing on major patterns [54][55] and the UNC habit of reviewing past papers for typical fallacies [12].
- **Resolution:** a code is resolved when it is absent, or self-corrected at H0–H1, in 3 consecutive texts.
- **CEFR alignment:** this echoes the B2 production-strategy descriptor about monitoring one's own recurring mistakes [5]. That scale is worded mainly for speech, so the link to writing is an inference.

### What it means for Lucid
- Feedback should be **high-information** (what, why, how to fix [59]), **graduated** [56][57], **focused in display but comprehensive in logging** [45][48][51], and **tied to revision and transfer** [48][52].
- **AI feedback should not be marketed as equivalent to a teacher** [68][70]. Lucid's claim should be "immediate, specific, graduated practice feedback" compared with no feedback [69].

---

## Implementation decisions for Lucid

Each decision is testable. Evidence is in brackets. "Design default" means no direct evidence; tune with data.

**Curriculum**
1. **Ten stages with fixed CEFR targets.**
   - S1 Pre-A1–A2; S2 A2–B1; S3 B1; S4 B1+–B2; S5 B2; S6 B2–B2+; S7 B2+–C1; S8 C1; S9 C1–C2; S10 C2 [5][6].
   - Test: every writing task in the content schema has `stage`, `cefr_target` and `focus_categories`.
2. **Model–Practice–Reflect lesson template** for every writing lesson: annotated model → scaffolded practice → rubric self-assessment [9].
   - Test: the lesson schema rejects writing lessons that lack any of the three phases.
3. **Scaffold fading inside each stage.** Tasks 1–3 are fully scaffolded, tasks 4–6 partially, and the exit task has none [23].
   - Test: exit tasks have `scaffolds = []`.
4. **Exit rule:**
   - two consecutive unseen-prompt tasks with every applicable category ≥3 and none <2, and stage-focus categories ≥3;
   - plus one new-text transfer task 1–4 weeks later at ≥3 on the focus categories [3][23][48].
   - Test: promotion events always reference ≥3 qualifying task IDs.
5. **Prompt wording rule.** Argument prompts (S4+) say "argue… and respond to opposing views" and never only "persuade". They show an elaborated-goal checklist [15][16].
   - Test: a lint rule on prompt text.
6. **Sentence combining and summary writing** are core recurring task types (S1–S9) [7][8].
7. **Fallacies** are taught as spot-and-fix in a paragraph (including the learner's own) with the 18-item catalogue (§5) [12][13][24]. Name-only quizzes are capped at 20% of S8 items (design default).
8. **Source evaluation at S9** requires one logged lateral-reading action per cited source before submission [29][31]. Assessment uses open-response tasks [34]. Credibility and claim verification are separate exercises [35].
9. **Hedging is taught as calibration.** The evaluator flags both R-OVERCLAIM and R-OVERHEDGE. The phrase bank uses the Phrasebank's functions [38][39].
10. **Patchwriting is handled as feedback (U-PATCH)** with a side-by-side source view. It never triggers an integrity accusation in practice tasks [41][42].
11. **Task lengths are design defaults:** S1 1–6 sentences; S2 60–120 words; S3 120–180; S4 180–250; S5–S6 200–280; S7 250–350; S8 300–400; S9 350–500 with 2–3 sources; S10 400–700.

**Rubric and evaluator**
12. **Scale:** 0–5 per category plus N/A. Band 3 = stage target achieved. Bands 2 and 4 = "shares features of" adjacent bands [3][4]. The "at least half of the Band 5 features" rule for Band 4 is Lucid design, not Cambridge's.
    - Test: evaluator output schema enum `{0,1,2,3,4,5,"NA"}`.
13. **N/A matrix exactly as in §8.4** [3][5]. N/A is excluded from every aggregate and never converted to 0.
    - Test: a unit test computes aggregates with N/A present.
14. **Task-fulfilment gate:**
    - prompt misunderstood or a part missing → categories 6–8 capped at 2 and overall CEFR −1 sub-level;
    - off-topic → all categories capped at 1;
    - copied prompt text discounted;
    - ≤20 words of own language → 0. **Evidence note (2026-10-30):** IELTS rates responses of 20 words or fewer at Band 1, not 0 [1]; scoring them 0 is a Lucid design choice. Cambridge's Band 0 is for "totally irrelevant" content [3].
15. **"Must fully fit" rule:** the evaluator assigns the highest band whose positive features are *all* met [1]. It quotes the supporting text span for each category score.
16. **Calibration set:**
    - at least 5 human-scored, rationale-annotated Hebrew-L1 essays per category × stage, covering Bands 1, 3 and 5 at minimum, included in the evaluator context [60][62]. [62] supports calibration examples for a holistic CEFR rating only; their value for analytic category scores is an untested extension;
    - launch gate: evaluator–human QWK ≥0.70 on language categories and ≥0.60 on content categories on a held-out set of ≥100 essays per stage group. These thresholds are design defaults below human–human 0.87 [62].
17. **Three scoring runs, median taken.** A spread above 1 band marks the category low-confidence [63]. Low-confidence content scores cannot alone trigger promotion.
18. **Bias monitoring.** A monthly audit of 50 human-scored essays per stage group. Correct an offset if the mean bias exceeds ±0.25 band. Report agreement by learner subgroup [62].
19. **Overall CEFR (category 12)** is holistic with calibration anchors, cross-checked against the rule-based mapping. Discrepancy over 1 sub-level → shown as a range and flagged [3][62].
20. **No IELTS or Cambridge score predictions in the UI** [2]. Criteria names can be cross-referenced in teacher or analytics views only.

**Feedback**
21. **Display:** at most 3 error patterns per draft plus all critical errors. Everything is logged. "Show all" is available from B2 [45][48][51][58].
22. **Severity labels** (critical, major, stylistic) use the reader-comprehension criterion [1][3]. Critical errors always appear.
23. **Hint ladder H0–H4** (§9.5) [56][57][58]:
    - start H2 for A1–A2 grammar, H0/H1 for B1+, H1 for spelling and lexis [45][48];
    - an attempt is needed between rungs;
    - H4 after at most 3 failed attempts and always with an explanation [50]. The guaranteed H4 is design only: Shute advises against progressive hints that always end in the correct answer [58] (see §9.5 rule 3);
    - log the help level.
    - Test: event log shows a monotonic rung sequence per error.
24. **Draft order for S4+:** draft 1 gets argument and organisation feedback plus critical language errors; draft 2 gets language patterns [52].
25. **Revision cycles:** one required revision per task and at most two AI-feedback cycles. Promotion requires new-text performance [45][48].
26. **Feedback content must be high-information** (what, why, how) [59]. Praise is specific and sparing. No normative comparisons with other learners [58].
    - Test: an evaluator prompt rubric; QA samples checked for "why" and "how" fields.
27. **Grades during revision:** show category bands only. The overall CEFR label appears on the final draft only [58].
28. **Error log and recurrence:**
    - recurring flag = a code in ≥3 of the last 5 texts or ≥3 instances in one text;
    - resolved = absent or self-corrected at H0–H1 in 3 consecutive texts;
    - recurring codes feed SRS micro-items and the "My patterns" page [5][54][55].
29. **Independence metric:** mean hint rung needed per error family, tracked over time. It is a secondary progress indicator alongside error rate [56].
30. **Hebrew-L1 priors** (e.g. G-ART indefinite omission [72]) seed the error-pattern selector at low weight. They are re-weighted from Lucid's own log after 1,000 learner texts. Default weight is design-only.
31. **Self-assessment before AI feedback** from S7 upward. Learners score themselves on the rubric before seeing the AI's scores. The gap is tracked, and S10 exit requires ±1 band agreement on ≥9 of 12 categories [60][61].

## What not to build

- **No single "overall writing score" during drafting.** Grades can crowd out comments [58], and subscales carry the diagnostic information [3].
- **No predicted IELTS or Cambridge band or "exam score".** There is no one-to-one CEFR correspondence [2]. Lucid's evaluator is not validated against those exams, and branded exam scores invite misleading claims.
- **No feedback that marks every error at once by default.** It overloads learners [58]. Comprehensive *logging* is kept [48].
- **No hint ladders that a learner can click straight through to the answer** [58]. Note that the "I'm stuck" bypass in §9.5 must not count as an attempt, or this rule is violated.
- **No points for Toulmin labels.** Do not score the presence of "claim/warrant/rebuttal" parts. Score support quality and fairness [22].
- **No "persuade the reader" prompts without a counterargument requirement** [16].
- **No CRAAP-style checklist as the only source-evaluation tool** [36]. Use SIFT and lateral reading [29][31].
- **No fallacy-name flashcard drills as the main critical-thinking activity.** Transfer to writing is unevidenced. Use spot-and-fix in context [12][24].
- **No plagiarism or AI-detection accusations on practice texts.** Treat patchwriting developmentally [41][42][43].
- **No standalone decontextualised grammar-lesson track presented as writing instruction** [7]. Grammar instruction is attached to learners' own error patterns.
- **No marketing claim that AI feedback equals teacher feedback** [68][70].
- **No promotion based on one AI score of content categories.** Within-model consistency on content criteria can be weak [63].
- **No hard-coded Hebrew-L1 error assumptions.** They are priors to validate [72] (see Team C3).

---

## Sources

All accessed 2026-10-30. "ERIC API" = record retrieved from `api.ies.ed.gov/eric` with the query URL shown.

1. IELTS (British Council, IDP: IELTS Australia, Cambridge University Press & Assessment). (2023, updated May). *IELTS Writing Band Descriptors (Task 1 and Task 2)*. https://ielts.org/cdn/ielts-guides/ielts-writing-band-descriptors.pdf. Framework / assessment specification.
2. IELTS. (n.d.). *IELTS and the CEFR*. https://ielts.org/organisations/ielts-for-organisations/compare-ielts/ielts-and-the-cefr. Guidance.
3. Cambridge University Press & Assessment. (n.d.). *Assessing writing for Cambridge English Qualifications: A guide for teachers — B2 First for Schools* (290476). https://www.cambridgeenglish.org/pl/Images/290476-cambridge-english-assessing-writing-performance-at-level-b2.pdf. Framework / guidance.
4. Cambridge University Press & Assessment. (n.d.). *Assessing writing for Cambridge English Qualifications: A guide for teachers — C2 Proficiency* (600977). https://www.cambridgeenglish.org/Images/600977-teacher-guide-for-writing-c2-proficiency.pdf. Framework / guidance.
5. Council of Europe (2001) CEFR scales, reproduced by CEFTrain project, University of Helsinki. *Productive activities and strategies* (Overall written production; Creative writing; Reports and essays; Planning; Monitoring and repair). https://blogs.helsinki.fi/ceftrain/familiarisation/scales-for-multiple-purposes/communicative-language-activities-and-strategies/productive-activities-and-strategies/. Framework (secondary reproduction; returned in paraphrase).
6. Council of Europe CEFR self-assessment grid, reproduced by Hochschule Bonn-Rhein-Sieg Sprachenzentrum (PDF dated 2010). *Levels according to the CEFR*. http://www.h-brs.de/sites/default/files/spz/cefr.pdf. Framework (secondary reproduction).
7. Graham, S., & Perin, D. (2007). A meta-analysis of writing instruction for adolescent students. *Journal of Educational Psychology*, 99(3). ERIC EJ772018 via ERIC API: https://api.ies.ed.gov/eric/?search=title%3A%22meta-analysis%20of%20writing%20instruction%20for%20adolescent%20students%22&format=json&fields=id,title,author,publicationdateyear,source,description. Meta-analysis.
8. Graham, S., & Perin, D. (2007). *Writing Next: Effective strategies to improve writing of adolescents in middle and high schools*. Alliance for Excellent Education. ERIC ED517367 via ERIC API: https://api.ies.ed.gov/eric/?search=title%3A%22Writing%20Next%22%20AND%20author%3AGraham&format=json&fields=id,title,author,publicationdateyear,source,description,url. Meta-analytic report.
9. Graham, S., Fitzgerald, J., Friedrich, L. D., Greene, K., Kim, J. S., & Booth Olson, C. (2016, rev. 2019). *Teaching Secondary Students to Write Effectively* (WWC Practice Guide). Institute of Education Sciences. https://ies.ed.gov/ncee/wwc/PracticeGuide/22. Guidance (evidence-rated).
10. Purdue OWL. (n.d.). *Toulmin Argument*. https://owl.purdue.edu/owl/general_writing/academic_writing/historical_perspectives_on_argumentation/toulmin_argument.html. Guidance.
11. The Writing Center, University of North Carolina at Chapel Hill. (n.d.). *Argument*. https://writingcenter.unc.edu/tips-and-tools/argument/. Guidance.
12. The Writing Center, University of North Carolina at Chapel Hill. (n.d.). *Fallacies*. https://writingcenter.unc.edu/tips-and-tools/fallacies/. Guidance.
13. Purdue OWL. (n.d.). *Logical Fallacies*. https://owl.purdue.edu/owl/general_writing/academic_writing/logic_in_argumentative_writing/fallacies.html. Guidance.
14. Cresswell Riol, K. (2016, last edited 11 January). *How to write a counterargument* (Academic Writing Aid Series). Faculty of Agricultural Sciences, University of Hohenheim. https://agrar.uni-hohenheim.de/fileadmin/einrichtungen/agrar/Studium/Internat-Masters/Writing_Aid_Materials/How_to_write_a_counterargument.pdf. Guidance.
15. Ferretti, R. P., MacArthur, C. A., & Dowdy, N. S. (2000). The effects of an elaborated goal on the persuasive writing of students with learning disabilities and their normally achieving peers. *Journal of Educational Psychology*. ERIC EJ621009 via ERIC API: https://api.ies.ed.gov/eric/?search=author%3AFerretti%20AND%20title%3A%22elaborated%20goal%22&format=json&fields=id,title,author,publicationdateyear,source,description. Experiment.
16. Nussbaum, E. M., & Kardash, C. M. (2005). The effects of goal instructions and text on the generation of counterarguments during writing. *Journal of Educational Psychology*. ERIC EJ688216 via ERIC API: https://api.ies.ed.gov/eric/?search=author%3ANussbaum%20AND%20title%3Acounterargument&format=json&fields=id,title,author,publicationdateyear,source,description&rows=10. Experiment.
17. Nussbaum, E. M., & Schraw, G. (2007). Promoting argument–counterargument integration in students' writing. *Journal of Experimental Education*. ERIC EJ776276, same API query as [16]. Experiment.
18. Nussbaum, E. M. (2008). Using argumentation vee diagrams (AVDs) for promoting argument–counterargument integration in reflective writing. *Journal of Educational Psychology*. ERIC EJ807872, same API query as [16]. Experiment.
19. Wolfe, C. R., Britt, M. A., & Butler, J. A. (2009). Argumentation schema and the myside bias in written argumentation. *Written Communication*. ERIC EJ833731 via ERIC API: https://api.ies.ed.gov/eric/?search=myside&format=json&fields=id,title,author,publicationdateyear,source,description&rows=10. Experiments.
20. Wolfe, C. R. (2012). Individual differences in the "myside bias" in reasoning and written argumentation. *Written Communication*. ERIC EJ983752, same API query as [19]. Correlational studies.
21. Knudson, R. E. (1992). The development of written argumentation: An analysis and comparison of argumentative writing at four grade levels. *Child Study Journal*. ERIC EJ456314 via ERIC API: https://api.ies.ed.gov/eric/?search=title%3A%22argumentative%20writing%22%20AND%20title%3Ameta-analysis&format=json&fields=id,title,author,publicationdateyear,source,description&rows=10. Descriptive study.
22. Paek, J. K., & Kang, Y. (2017). Investigation of content features that determine Korean EFL learners' argumentative writing qualities. *English Teaching*. ERIC EJ1466712 via ERIC API: https://api.ies.ed.gov/eric/?search=Toulmin%20AND%20(EFL%20OR%20L2%20OR%20ESL)%20AND%20writing&format=json&fields=id,title,author,publicationdateyear,source,description&rows=15. Correlational study (33 participants).
23. McNeill, K. L., Lizotte, D. J., Krajcik, J., & Marx, R. W. (2006). Supporting students' construction of scientific explanations by fading scaffolds in instructional materials. *Journal of the Learning Sciences*. ERIC EJ733792 via ERIC API: https://api.ies.ed.gov/eric/?search=author%3AMcNeill%20AND%20title%3A%22fading%20scaffolds%22&format=json&fields=id,title,author,publicationdateyear,source,description&rows=5. Experiment.
24. Abrami, P. C., Bernard, R. M., Borokhovski, E., Waddington, D. I., Wade, C. A., & Persson, T. (2015). Strategies for teaching students to think critically: A meta-analysis. *Review of Educational Research*. ERIC EJ1061695 via ERIC API: https://api.ies.ed.gov/eric/?search=title%3A%22Strategies%20for%20Teaching%20Students%20to%20Think%20Critically%22&format=json&fields=id,title,author,publicationdateyear,source,description&rows=5. Meta-analysis.
25. Abrami, P. C., Bernard, R. M., Borokhovski, E., Wade, A., Surkes, M. A., Tamim, R., & Zhang, D. (2008). Instructional interventions affecting critical thinking skills and dispositions: A stage 1 meta-analysis. *Review of Educational Research*. ERIC EJ896709 via ERIC API: https://api.ies.ed.gov/eric/?search=author%3AAbrami%20AND%20title%3A%22critical%20thinking%22%20AND%20title%3Ameta-analysis&format=json&fields=id,title,author,publicationdateyear,source,description&rows=10. Meta-analysis.
26. Butchart, S., Forster, D., Gold, I., Bigelow, J., Korb, K., Oppy, G., & Serrenti, A. (2009). Improving critical thinking using web based argument mapping exercises with automated feedback. *Australasian Journal of Educational Technology*. ERIC EJ847457 via ERIC API: https://api.ies.ed.gov/eric/?search=title%3A%22argument%20mapping%22&format=json&fields=id,title,author,publicationdateyear,source,description&rows=10. Course study.
27. Nesbit, J. C., & Liu, Q. (2025). Argument mapping in higher education: A systematic review. *Higher Education Quarterly*. ERIC EJ1487616, same API query as [26]. Systematic review.
28. Macpherson, R., & Stanovich, K. E. (2007). Cognitive ability, thinking dispositions, and instructional set as predictors of critical thinking. *Learning and Individual Differences*. ERIC EJ782941, same API query as [19]. Experiment / correlational.
29. Caulfield, M. (2019, June 19). *SIFT (The Four Moves)*. Hapgood. https://hapgood.us/2019/06/19/sift-the-four-moves/. Expert guidance.
30. Wineburg, S., & McGrew, S. (2019). Lateral reading and the nature of expertise: Reading less and learning more when evaluating digital information. *Teachers College Record*. ERIC EJ1262001 via ERIC API: https://api.ies.ed.gov/eric/?search=title%3A%22lateral%20reading%22&format=json&fields=id,title,author,publicationdateyear,source,description&rows=15. Think-aloud study.
31. Wineburg, S., Breakstone, J., McGrew, S., Smith, M. D., & Ortega, T. (2022). Lateral reading on the open Internet: A district-wide field study in high school government classes. *Journal of Educational Psychology*. ERIC EJ1372738, same API query as [30]. Quasi-experimental field study.
32. Brodsky, J. E., Brooks, P. J., Scimeca, D., Todorova, R., Galati, P., Batson, M., Grosso, R., Matthews, M., Miller, V., & Caulfield, M. (2021). Improving college students' fact-checking strategies through lateral reading instruction in a general education civics course. *Cognitive Research: Principles and Implications*. ERIC EJ1292610, same API query as [30]. Quasi-experiment.
33. Brodsky, J. E., Brooks, P. J., Pavlounis, D., & Johnston, J. L. (2023). Instruction increases Canadian students' preference for and use of lateral reading strategies to fact-check online information. *AERA Open*. ERIC EJ1405236, same API query as [30]. Quasi-experiment.
34. Lodhi, A. K., Brooks, P. J., Gravelle, C. D., Brodsky, J. E., Syed, M., & Scimeca, D. (2025). Effects of Wikipedia knowledge, algorithm awareness, and reading comprehension on undergraduates' preference for and use of lateral reading strategies to evaluate information. *Journal of Media Literacy Education*. ERIC EJ1471132, same API query as [30]. Correlational study.
35. McGrew, S., & Reynolds, E. C. (2026). Discussing credibility and corroboration: Students' reasoning about digital sources and claims during lateral reading lessons. *American Educational Research Journal*. ERIC EJ1505183, same API query as [30]. Qualitative classroom study.
36. Kamela, M. (2024). Cut the CRAAP: Replacing vertical evaluation with lateral reading. *New Directions for Teaching and Learning*. ERIC EJ1451765, same API query as [30]. Opinion / review.
37. Hyland, K. (2005). Stance and engagement: A model of interaction in academic discourse. *Discourse Studies*, 7(2), 173–192. https://doi.org/10.1177/1461445605050365. Record opened: https://ueaeprints.uea.ac.uk/id/eprint/65827/. Corpus and interview study.
38. Menkabu, A. (2017). *Stance and engagement in postgraduate writing: A comparative study of English NS and Arab EFL student writers in Linguistics and Literature* (PhD thesis). University of Essex. https://repository.essex.ac.uk/19115/1/Menkabu%202017%20Stance%20and%20engagement%20in%20postgraduate%20writing.pdf. Corpus and interview study (secondary source for Hyland's categories).
39. University of Manchester. (n.d.). *Academic Phrasebank: Being cautious*. https://www.phrasebank.manchester.ac.uk/using-cautious-language/. Guidance.
40. Purdue OWL. (n.d.). *Quoting, Paraphrasing, and Summarizing*. https://owl.purdue.edu/owl/research_and_citation/using_research/quoting_paraphrasing_and_summarizing/index.html. Guidance.
41. Howard, R. M. (1992). A plagiarism pentimento. *Journal of Teaching Writing*. ERIC EJ475663 via ERIC API: https://api.ies.ed.gov/eric/?search=patchwriting&format=json&fields=id,title,author,publicationdateyear,source,description&rows=10. Theory / opinion. (The same query returns Crook, S. (2016), *Moving beyond transgression: Contextualizing plagiarism and patchwriting*, ERIC ED571856, whose record quotes Howard's 1992 definition.)
42. Li, Y., & Casanave, C. P. (2012). Two first-year students' strategies for writing from sources: Patchwriting or plagiarism? *Journal of Second Language Writing*. ERIC EJ966817, same API query as [41]. Case study.
43. Abasi, A. R., & Akbari, N. (2008). Are we encouraging patchwriting? Reconsidering the role of the pedagogical context in ESL student writers' transgressive intertextuality. *English for Specific Purposes*. ERIC EJ799977, same API query as [41]. Qualitative study.
44. Kang, E., & Han, Z. (2015). The efficacy of written corrective feedback in improving L2 written accuracy: A meta-analysis. *The Modern Language Journal*, 99(1), 1–18. https://doi.org/10.1111/modl.12189. Record opened: https://eric.ed.gov/?id=EJ1059618. Meta-analysis.
45. Lim, S. C., & Renandya, W. A. (2020). Efficacy of written corrective feedback in writing instruction: A meta-analysis. *TESL-EJ*, 24(3). https://files.eric.ed.gov/fulltext/EJ1275821.pdf (record: https://eric.ed.gov/?id=EJ1275821). Meta-analysis.
46. Brown, D., Liu, Q., & Norouzian, R. (2026; issue year as listed by ERIC). Effectiveness of written corrective feedback in developing L2 accuracy: A Bayesian meta-analysis. *Language Teaching Research*, 30(3), 1357–1389. https://doi.org/10.1177/13621688221147374. Record opened: https://eric.ed.gov/?id=EJ1500301. Meta-analysis.
47. Truscott, J. (2007). The effect of error correction on learners' ability to write accurately. *Journal of Second Language Writing*, 16(4), 255–272. https://doi.org/10.1016/j.jslw.2007.06.003. Record opened: https://eric.ed.gov/?id=EJ780428. Meta-analysis / review (contested).
48. Van Beuningen, C. G., De Jong, N. H., & Kuiken, F. (2012). Evidence on the effectiveness of comprehensive error correction in second language writing. *Language Learning*. ERIC EJ956800 via ERIC API: https://api.ies.ed.gov/eric/?search=author%3A%22Van%20Beuningen%22&format=json&fields=id,title,author,publicationdateyear,source,description&rows=10. Experiment.
49. Ellis, R., Sheen, Y., Murakami, M., & Takashima, H. (2008). The effects of focused and unfocused written corrective feedback in an English as a foreign language context. *System*. ERIC EJ804984 via ERIC API: https://api.ies.ed.gov/eric/?search=title%3A%22focused%22%20AND%20title%3A%22corrective%20feedback%22&format=json&fields=id,title,author,publicationdateyear,source,description&rows=15. Experiment.
50. Sheen, Y. (2007). The effect of focused written corrective feedback and language aptitude on ESL learners' acquisition of articles. *TESOL Quarterly*. ERIC EJ788008, same API query as [49]. Experiment.
51. Ekiert, M., & di Gennaro, K. (2021). Focused written corrective feedback and linguistic target mastery: Conceptual replication of Bitchener and Knoch (2010). *Language Teaching*. ERIC EJ1279343, same API query as [49]. Experiment (replication).
52. Rahimi, M. (2021). A comparative study of the impact of focused vs. comprehensive corrective feedback and revision on ESL learners' writing accuracy and quality. *Language Teaching Research*. ERIC EJ1307457, same API query as [49]. Experiment.
53. Ferris, D., & Roberts, B. (2001). Error feedback in L2 writing classes: How explicit does it need to be? *Journal of Second Language Writing*, 10(3), 161–184. Record opened: https://eric.ed.gov/?id=EJ632782. Experiment.
54. Ferris, D. (1995). Teaching students to self-edit. *TESOL Journal*. ERIC EJ510199 via ERIC API: https://api.ies.ed.gov/eric/?search=author%3A%22Ferris%2C%20Dana%22&format=json&fields=id,title,author,publicationdateyear,source,description&rows=25. Classroom study / practice report.
55. Eckstein, G., & Ferris, D. (2018). Comparing L1 and L2 texts and writers in first-year composition. *TESOL Quarterly*. ERIC EJ1170140, same API query as [54]. Comparative study.
56. Aljaafreh, A., & Lantolf, J. P. (1994). Negative feedback as regulation and second language learning in the zone of proximal development. *The Modern Language Journal*, 78(4), 465–483. Copy opened: https://files.cercomp.ufg.br/weby/up/1752/o/Negative_Feedback_as_Regulation_and_Seco.pdf. Qualitative microgenetic study.
57. Ai, H. (2017). Providing graduated corrective feedback in an intelligent computer-assisted language learning environment. *ReCALL*, 29(3), 313–334. https://doi.org/10.1017/S095834401700012X. Page opened: https://www.cambridge.org/core/journals/recall/article/providing-graduated-corrective-feedback-in-an-intelligent-computerassisted-language-learning-environment/BADDC5BCB3E8C333A601440155F5FE1B. Study (ICALL).
58. Shute, V. J. (2007). *Focus on formative feedback* (ETS Research Report RR-07-11). ETS (March 2007). https://files.eric.ed.gov/fulltext/EJ1111586.pdf. Review. (A journal version in *Review of Educational Research*, 2008, ERIC EJ787077, was not opened in this audit: unverified.)
59. Wisniewski, B., Zierer, K., & Hattie, J. (2020). The power of feedback revisited: A meta-analysis of educational feedback research. *Frontiers in Psychology*, 10, 3087. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.03087/full. Meta-analysis.
60. Jonsson, A., & Svingby, G. (2007). The use of scoring rubrics: Reliability, validity and educational consequences. *Educational Research Review*. ERIC EJ796733 via ERIC API: https://api.ies.ed.gov/eric/?search=title%3A%22scoring%20rubrics%22%20AND%20(author%3AJonsson%20OR%20author%3APanadero)&format=json&fields=id,title,author,publicationdateyear,source,description&rows=10. Review (75 studies).
61. Panadero, E., & Jonsson, A. (2013). The use of scoring rubrics for formative assessment purposes revisited: A review. *Educational Research Review*. ERIC EJ999454, same API query as [60]. Review.
62. Yancey, K. P., LaFlair, G. T., Verardi, A. R., & Burstein, J. (2023). Rating short L2 essays on the CEFR scale with GPT-4. In *Proceedings of the 18th Workshop on Innovative Use of NLP for Building Educational Applications (BEA 2023)*, 576–584. https://aclanthology.org/2023.bea-1.49.pdf. Empirical scoring study.
63. Gaggioli, A., Casaburi, G., Ercolani, L., Collova', F., Torre, P., & Davide, F. (2025). Assessing the reliability and validity of large language models for automated assessment of student essays in higher education (arXiv:2508.02442). https://arxiv.org/abs/2508.02442. Empirical scoring study (preprint).
64. Zhai, N., & Ma, X. (2023). The effectiveness of automated writing evaluation on writing quality: A meta-analysis. *Journal of Educational Computing Research*. ERIC EJ1380424 via ERIC API: https://api.ies.ed.gov/eric/?search=title%3A%22automated%20writing%20evaluation%22%20AND%20title%3Ameta-analysis&format=json&fields=id,title,author,publicationdateyear,source,description&rows=10. Meta-analysis.
65. Ngo, T. T.-N., Chen, H. H.-J., & Lai, K. K.-W. (2024). The effectiveness of automated writing evaluation in EFL/ESL writing: A three-level meta-analysis. *Interactive Learning Environments*. ERIC EJ1419671, same API query as [64]. Meta-analysis.
66. Xue, Y. (2024). Towards automated writing evaluation: A comprehensive review with bibliometric, scientometric, and meta-analytic approaches. *Education and Information Technologies*. ERIC EJ1449031, same API query as [64]. Review with meta-analysis.
67. Allen, L. K., Likens, A. D., & McNamara, D. S. (2018). A multi-dimensional analysis of writing flexibility in an automated writing evaluation system. LAK18 conference paper (pp. 380–388), ERIC ED616690 (grantee submission), same API query as [64]. Empirical study (131 students).
68. Yıldız, M., Topuz, A. C., Polat, H., Taşlıbeyaz, E., Kurşun, E., & Yeşilyurt, S. (2026). A comparative analysis of human and GenAI-generated feedback on EFL students' argumentative writing performance. *Educational Psychology*, 46(1), 52–79. https://doi.org/10.1080/01443410.2025.2539797. Record opened: https://eric.ed.gov/?id=EJ1500948. Counterbalanced (crossover-type) experiment.
69. Chan, S., Lo, N., & Wong, A. (2024). Generative AI and essay writing: Impacts of automated feedback on revision performance and engagement. *rEFLections*, 31(3), 1249–1284. Record opened: https://eric.ed.gov/?id=EJ1459877. Randomised controlled trial (abstract-level; no sample size in record).
70. Alkhalifah, E., & Almutlaq, S. (2026). The combined impact of ChatGPT and teacher feedback on the syntactic complexity of EFL learners' writing. *SAGE Open*. ERIC EJ1512546 via ERIC API: https://api.ies.ed.gov/eric/?search=(title%3AChatGPT%20OR%20title%3A%22generative%20AI%22)%20AND%20title%3Afeedback%20AND%20title%3Awriting&format=json&fields=id,title,author,publicationdateyear,source,description&rows=20. Quasi-experiment.
71. Zeevy Solovey, O. (2024). Comparing peer, ChatGPT, and teacher corrective feedback in EFL writing: Students' perceptions and preferences. *Technology in Language Teaching & Learning*, 6(3). Record opened: https://eric.ed.gov/?id=EJ1441682. Pilot perception study.
72. Plaut-Forckosh, D., Hindi, I., Beradze, M., & Meir, N. (2024). Cross-linguistic influence in the acquisition of definiteness: Evidence from L2-Hebrew in the context of different L1s (English and Russian) [Conference abstract, CLS 2024, hosted at blogs.ncl.ac.uk; authors at Bar-Ilan University]. https://blogs.ncl.ac.uk/cls2024/files/2024/07/Plaut.pdf. Conference abstract on child L2-Hebrew (cited only for the Hebrew–English definiteness contrast it states, citing Danon 2001; it does not study Hebrew-L1 writers of English).
73. Ferris, D. R. (1997). The influence of teacher commentary on student revision. *TESOL Quarterly*. ERIC EJ547559, same API query as [54]. Empirical study (abstract-level record).

---

## Verification log (2026-10-30)

Adversarial re-check of every numbered source. Each URL in the Sources list was reopened with WebFetch on 2026-10-30. PDFs that WebFetch returned as binary (IELTS [1], Cambridge [3][4], CEFR grid [6], Hohenheim [14], Menkabu [38], Lim & Renandya [45], Aljaafreh & Lantolf [56], Shute [58], Yancey et al. [62], Plaut-Forckosh et al. [72]) were converted with `pdftotext` and the quoted passages were searched in the text. ERIC API queries were reopened and the named records checked for authors, year, title, venue and the stated findings.

Status key: **confirmed** = claims and bibliographic details match the opened source; **corrected** = source supports the point but a detail, quotation, attribution or caveat was wrong or missing and has been fixed in the text above; **unsupported** = claim removed or marked unverified; **dead/blocked** = source could not be opened.

| # | Status | Notes |
|---|---|---|
| 1 | corrected | All quoted descriptors verified verbatim (Updated May 2023). Fixed: IELTS rates responses of 20 words or fewer at **Band 1**, not Band 0; the document had used [1] for a Band 0 rule (§8.2, decision 14). Band 0 is for no attempt, another language, or a totally memorised answer. |
| 2 | confirmed | C2 = 8.5+, C1 threshold 6.5–7, "not clear whether band 5 is B1 or B2", "not … a one-to-one correspondence", overall bands only. |
| 3 | corrected | Subscales, "shares features of" wording, Band 3+ = at least B2, A2/B1/B2 Organisation descriptors, "whether the reader is still able to understand the text", "Content is totally irrelevant" all verified. Fixed a non-verbatim quotation ("to indicate…"). The Band 4 "at least half of Band 5 features" rule was attributed to [3] but is Lucid design; reattributed. |
| 4 | corrected | C1 and C2 Organisation descriptors, C2 Band 5 Language and Band 3+ = C2 / Bands 1–2 = C1 verified. Title corrected to the guide's actual title. |
| 5 | confirmed | Overall written production, Reports and essays (no descriptor at A1–A2), Monitoring and repair (B2 slips and "favourite mistakes"; nothing below B1) verified. B2 wording tightened. |
| 6 | confirmed | B2, C1 and C2 writing self-assessment statements verbatim; PDF metadata dated 2010. |
| 7 | confirmed | 123 documents, 154 effect sizes, grades 4–12, strategy instruction and summarisation 0.82, grammar −0.32. |
| 8 | corrected | Eleven elements and "do not constitute a full writing curriculum" verified. Quotation fixed to "specific, reachable goals" (not "…product goals"). |
| 9 | confirmed | Strong / moderate / minimal ratings and Model-Practice-Reflect wording; 2016, revised 2019. |
| 10 | confirmed | Six Toulmin elements, qualifier words, "careful, unbiased thinker". |
| 11 | corrected | All seven points supported, but the sentence in quotation marks was a paraphrase; replaced with the page's actual wording. |
| 12 | confirmed | 16 fallacies and the self-check tips. |
| 13 | confirmed | 12 fallacies, including genetic fallacy, circular argument / begging the claim and moral equivalence. |
| 14 | confirmed | All four counterargument points; creator Katharine Cresswell Riol, last edited 11 Jan 2016. |
| 15 | confirmed | Elaborated goal, sixth-graders, more persuasive essays with more argumentative elements; sample included students with learning disabilities. |
| 16 | confirmed | Two experiments, 184 undergraduates; persuasion instructions reduced counterargumentation and argument quality; text helped only less-extreme students. |
| 17 | confirmed | 84 undergraduates; organiser → more refutations; criteria → better integration. |
| 18 | confirmed | 45 undergraduates; AVDs improved integration; "minimization" strategy. |
| 19 | confirmed | Rebuttal rated higher; brief written tutorial improved essays (Study 3). |
| 20 | confirmed | Fact-based and balanced schemata predicted myside bias in essays. |
| 21 | corrected | Placeholder title replaced with the real title. Finding verified ("few children in any grade used features of opposition…"). Removed the unsupported qualifier "without instruction". |
| 22 | corrected | Placeholder title replaced with the real title; 33 participants (one essay each); finding wording aligned with record (data use mattered most). |
| 23 | corrected | 331 seventh-graders, 8-week unit and faded-group reasoning advantage verified. "Both groups improved" not stated per group; reworded to overall gains. |
| 24 | confirmed | 341 effect sizes, g+ = 0.30, heterogeneous, dialogue / authentic problems / mentoring. |
| 25 | confirmed | 117 studies, 20,698 participants, g+ = 0.341, SD 0.610, 32% of variance, "implicit expectation". |
| 26 | corrected | 0.45 SD verified, but "modest gain" was not the source's wording ("a modest, but encouraging result"); it is a single-group pre–post gain, so the grade was lowered from B/C to C. |
| 27 | confirmed | 124 studies coded, 102 empirical; attitudes 44%, collaboration 40%, map quality 51%. |
| 28 | corrected | Partially supported: the record reports a significant instructional-set effect on myside bias in argument generation, largest among low-ability participants, but no simple "reduced" statement. Reworded. |
| 29 | confirmed | Four moves and "context that the web so often strips away"; Caulfield, 19 June 2019. |
| 30 | confirmed | 45 participants (10 historians, 10 fact-checkers, 25 undergraduates); lateral versus vertical reading. |
| 31 | confirmed | Six 50-minute lessons; treatment n = 271, control n = 228. |
| 32 | confirmed | N = 136 versus 94, instructor-matched civics sections. |
| 33 | corrected | Numbers verified (2,278; 316 versus 287; delayed N = 994), but the study was listed under "College courses" although it is middle and high school; heading fixed. |
| 34 | confirmed | N = 483; preference on multiple-choice items, not demonstrated on open-response tasks. |
| 35 | confirmed | Credibility and corroboration involve different reasoning; teach separately. No sample size in record. |
| 36 | confirmed | Critique of CRAAP; endorses lateral reading; no data. |
| 37 | confirmed | 240 research articles, eight disciplines, insider interviews; Discourse Studies 7(2), 173–192. |
| 38 | confirmed | Nine categories and the "weigh up the commitment…" quotation (Hyland 2005b, p. 180) found verbatim in the thesis. |
| 39 | corrected | Functional categories verified; several example phrases were not on the page and were replaced with phrases that are. |
| 40 | corrected | Definitions and attribution requirement verified; "quote only when exact wording matters" is not on the page; replaced with the page's advice to quote "only sparingly" with a good reason. |
| 41 | corrected | The 1992 record supports the separation from plagiarism and the pedagogical stance, but not the definition. The definition is now attributed to Howard (1992) as quoted in the Crook (2016) record returned by the same ERIC query. |
| 42 | confirmed | Two first-year Hong Kong students; patchwriting despite understanding the policy. |
| 43 | confirmed | Pedagogical context treating ESL writers as without authority encourages patchwriting. |
| 44 | confirmed | 21 studies; moderators proficiency, setting, genre; MLJ 99(1), 1–18. |
| 45 | corrected | All moderator effect sizes verified in the full text. Fixed: g = 0.72 was computed before removing three outlier studies; the final 35-study estimate is g = 0.59. Delayed post-tests 23 of 35 studies. |
| 46 | confirmed | 52 controlled studies; "robust evidence of the durability of moderate effectiveness"; feedback types similar; LTR 30(3), 1357–1389. |
| 47 | confirmed | Small negative best estimate; benefits "very small" at 95% confidence. |
| 48 | confirmed | N = 268; 1- and 4-week delays; direct CF grammatical gains in new texts; indirect CF non-grammatical; no simplification. |
| 49 | confirmed | Japanese university EFL learners; focused and unfocused equally effective on articles. |
| 50 | confirmed | 91 adult intermediate ESL learners; direct metalinguistic beat direct-only at delayed post-test. |
| 51 | confirmed | Focused CF improved targeted article functions; may have hurt non-targeted ones, especially with most explicit metalinguistic explanation. |
| 52 | confirmed | 78 intermediate ESL learners, 15 weeks; focused + revision best for sentence errors and quality; comprehensive + revision best overall accuracy. |
| 53 | confirmed | Coded versus uncoded no significant difference; both beat no feedback. Sample size not in record. |
| 54 | confirmed | Focus on major error patterns; students significantly lowered error rates. |
| 55 | confirmed | 56 L1 and 74 L2 first-year composition students; recommends self-editing for common error patterns. |
| 56 | confirmed | Three learners (of nine), eight-week course, articles / tense / prepositions / modals, 0–12 regulatory scale, graduated and contingent help; MLJ 78(4). |
| 57 | confirmed | Graduated feedback in ICALL; tutor filled gaps; ReCALL 29(3), 313–334. Added: L2 Chinese, not English. |
| 58 | confirmed | All quoted guidelines found verbatim (Tables 2–4, RR-07-11, March 2007). The RER 2008 journal version was not opened and is marked unverified. Implementation conflict flagged: the hint-ladder cap contradicts guideline 16. |
| 59 | confirmed | 435 studies, 994 effect sizes, d = 0.48 (after removing extreme values), 0.99 / 0.46 / 0.24 / 0.33. |
| 60 | confirmed | 75 studies; analytic topic-specific rubrics with exemplars or rater training; rubrics alone do not ensure validity; "make expectations and criteria explicit". |
| 61 | confirmed | 21 studies; rubrics may improve performance and self-regulation; several moderators. |
| 62 | corrected | All numbers verified in the paper (QWK 0.81 v 0.84, length-only baseline, "negligible benefit", 2,457 essays, +0.15, Telugu 0.66 to Spanish 0.89, human–human 0.87, B2 confusion; BEA 2023 pp. 576–584). Fixed: the bias "did not vary significantly by gender or L1" (not "no bias by L1"); added that calibration was per CEFR level for a holistic score. |
| 63 | corrected | 67 Italian psychology essays, five LLMs, four criteria, three replications, low non-significant QWK, median W < 0.30 verified. Coherence inflation is a "tendency"; wording adjusted. |
| 64 | confirmed | 26 studies, 2,468 participants, g = 0.861. |
| 65 | confirmed | 24 studies, between-group g = 0.59 (within-group 0.98). |
| 66 | confirmed | 29 experimental studies, SMD = 0.422. |
| 67 | confirmed | 131 students; spelling and grammar feedback had "little to no impact"; LAK18 pp. 380–388. |
| 68 | corrected | 59 students, no significant GenAI effect, human feedback improved language, mechanics and overall scores verified; "Turkish" changed to "in Turkey" (nationality not stated) and the design described as counterbalanced. |
| 69 | corrected | RCT and significant gains in the AI-feedback group verified; sample size and between-group statistics are not in the record, so a caveat was added. |
| 70 | confirmed | 35 Saudi EFL undergraduates, 9 weeks, quasi-experiment, no reliable advantage for combined feedback. |
| 71 | confirmed | Pilot; preferences lean to teacher and teacher + ChatGPT feedback; 15 pairs. |
| 72 | corrected | Hebrew ha- / unmarked indefinite contrast verified, citing Danon (2001). Venue description fixed; noted that it studies child L2-Hebrew, not Hebrew-L1 writers of English. |
| 73 | confirmed | Advanced university ESL students; text-specific comments and help processing feedback recommended (descriptive, not causal). |

**Counts:** 73 sources checked; 53 confirmed; 20 corrected; 0 unsupported sources (3 individual claims removed or marked unverified: the "without instruction" qualifier on [21], the Band 4 "at least half" rule's attribution to [3], and the unopened RER 2008 version of [58]); 0 dead or blocked.

**Implementation decisions affected by this audit:**
- Decision 14 (≤20 words → 0): the IELTS evidence supports Band 1, not 0. Scoring 0 is now labelled a Lucid design choice.
- Decision 23 and §9.5 rule 3 (guaranteed H4 after 3 attempts, "I'm stuck" bypass): [58] advises *against* hint sequences that always end in the correct answer. The cap has lost its evidential support and is labelled design only.
- Decision 12 / §8.2 Band 4 operationalisation: design, not Cambridge.
- Decision 16 and consistency protocol step 1: [62] supports calibration examples for a single holistic CEFR rating; their use for 12 analytic categories is an untested extension.
- Decision 7 (20% cap on name-only fallacy quizzes): labelled design default.
