// The writing rubric used by the AI assessor (research E, section 8). Kept in sync with
// content/writing/rubric.json, which shows the same descriptors to learners; tools/validate-content.mjs checks
// that both use the same category ids and applicability matrix.

// Applicability by writing stage (index 0 = free writing / unknown stage, then stages 1..10).
// 'full' | 'simplified' | 'na'. N/A categories are excluded from every aggregate and never become 0.
export const APPLICABILITY: Record<string, Array<'full' | 'simplified' | 'na'>> = {
  grammar:            ['full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full'],
  vocabulary:         ['full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full'],
  sentence_structure: ['full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full'],
  coherence:          ['full', 'simplified', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full'],
  cohesion:           ['full', 'simplified', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full'],
  argument_strength:  ['simplified', 'na', 'na', 'simplified', 'full', 'full', 'full', 'full', 'full', 'full', 'full'],
  evidence_quality:   ['simplified', 'na', 'na', 'na', 'full', 'full', 'full', 'full', 'full', 'full', 'full'],
  counterarguments:   ['simplified', 'na', 'na', 'na', 'na', 'full', 'full', 'full', 'full', 'full', 'full'],
  academic_tone:      ['simplified', 'na', 'simplified', 'simplified', 'simplified', 'simplified', 'simplified', 'full', 'full', 'full', 'full'],
  clarity:            ['full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full'],
  precision:          ['simplified', 'na', 'simplified', 'simplified', 'full', 'full', 'full', 'full', 'full', 'full', 'full'],
  overall:            ['full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full', 'full'],
};
export const STAGE_TARGET = ['(learner level)', 'PreA1-A2', 'A2-B1', 'B1', 'B1+-B2', 'B2', 'B2-B2+', 'B2+-C1', 'C1', 'C1-C2', 'C2'];

export const RUBRIC = `SCALE. Score each category 0-5, or mark it not applicable, RELATIVE TO THE STAGE TARGET (the request states the stage and its CEFR target; for free writing the target is the learner's current level):
5 = fully meets every positive feature of the Band 5 descriptor, clearly above target.
4 = all Band 3 features and at least half of the Band 5 features.
3 = MEETS THE TARGET: fully fits the Band 3 descriptor.
2 = shares features of Bands 1 and 3.
1 = fits Band 1: typical of roughly one CEFR level below target.
0 = below Band 1 or no rateable evidence (20 words or fewer of the learner's own language, totally irrelevant, or memorised). Words copied from the task prompt do not count as the learner's own language; discount them before judging. (Scoring 20 words or fewer as 0 is a Lucid design choice, not an IELTS rule.)
"Must fully fit" rule: give the highest band whose positive features are ALL met; negative features limit the band. For every applicable category, quote in "examples" a short span of the learner's text that supports the score.

CATEGORIES (judge each only on its own criterion; do not double count):
1 grammar - accuracy and range of forms. B5: range beyond target with control; errors are slips that never impede meaning. B3: forms expected at target with good control; errors noticeable but meaning always recoverable. B1: mostly simple or memorised forms; frequent errors, some impeding meaning.
2 vocabulary - range, precision of word choice, collocation, word form, spelling. B5: less common lexis used appropriately and precisely; natural collocation. B3: range adequate for the task; occasional wrong word or collocation that does not impede. B1: limited, repetitive; frequent wrong words; reliance on memorised chunks or the prompt's words.
3 sentence_structure - sentence boundaries, word order, subordination, variety. B5: varied, flexible forms suited to purpose; no boundary errors. B3: mix of simple and complex sentences; boundary errors rare. B1: simple sentences dominate; fragments or run-ons obscure meaning.
4 coherence - logical sequencing, progression and paragraph unity (NOT local clarity). B5: ideas progress logically; each paragraph has one clear central idea. B3: clear overall progression; minor lapses. B1: hard to follow; no clear progression or paragraph focus.
5 cohesion - linkers, reference, substitution. B5: devices used flexibly, never mechanical; reference always clear. B3: a variety appropriate to target; some mechanical use or misuse. B1: few or repetitive devices; unclear reference.
6 argument_strength - debatable position, reasons, warrants, logic, qualification (NOT the evidence itself). B5: clear debatable thesis; every reason supports it with an explicit link; appropriate qualifiers; no fallacies. B3: clear position; reasons relevant and mostly linked; at most one minor logical weakness. B1: position hard to find; reasons irrelevant or circular; a major fallacy.
7 evidence_quality - relevance, sufficiency, specificity and credibility of support. B5: each claim backed by relevant, specific evidence; sources evaluated. B3: most claims supported; some support general or thin. B1: support absent, irrelevant or purely assertive.
8 counterarguments - fair opposing view, rebuttal, integration. B5: the strongest objection stated fairly and attributed, rebutted with reasoning or evidence, claim refined where conceded. B3: at least one relevant, clearly signalled objection with a reasoned response. B1: missing where required, a straw man, or dismissed without reasons. At stage 5 (where counterarguments are first taught) a fairly stated, signalled objection reaches Band 3 even if the rebuttal is weak or missing; from stage 6 the reasoned response is required for Band 3.
9 academic_tone - register for genre and reader; calibrated stance (hedging); attribution. B5: register consistently appropriate; stance calibrated to evidence; citation conventions correct. B3: generally appropriate with occasional informal lapses; some over- or under-hedging. B1: register wrong for the genre; unqualified overclaims; no attribution.
10 clarity - can each sentence be understood at first reading (NOT logical order). B5: every sentence clear at first reading. B3: clear overall; a few sentences need re-reading. B1: many sentences unintelligible without guessing.
11 precision - exactness of words and claims: scope, quantifiers, specificity (NOT lexical range). B5: words and claims exact; scope stated. B3: mostly precise; some vague wording or over-generalisation. B1: pervasive vagueness; sweeping claims ("all", "never") without support.
12 overall - holistic judgement of how well the text achieves its purpose at the target.
"Simplified" applicability means: judge only the simplified feature (opinion + relevant reason for argument; genre register only for tone; word choice only for precision). The request lists which categories apply; mark the others applicable=false with score null.

TASK-FULFILMENT GATE (decide first): status "complete" when every part of the task is addressed; "partial" when the prompt is misunderstood or a required part is missing; "off_topic" when the response does not address the task. Explain in task_fulfilment.note.

OVERALL CEFR: give cefr_estimate (your best single label) and a range cefr_low..cefr_high (adjacent levels are easy to confuse, so use a range of one or two levels whenever you are not sure). It is an estimate aligned to CEFR descriptors. Never mention IELTS or Cambridge scores.

SEVERITY (reader comprehension): "critical" = impedes meaning at first reading, or a missing thesis in an argument task; always reported. "important" = a recurring, rule-governed error (3+ of the same kind) or one in the task's focus categories. "style" = a slip or a stylistic improvement.
FOCUS: with feedback scope "focused", report every critical error plus at most 3 error patterns (types), chosen in this order: the task's focus categories, the learner's recurring errors, frequency. With "comprehensive", report up to 12. For argument tasks (stage 4+) on a FIRST draft, prioritise argument and organisation feedback and only critical language errors; language patterns come on the next draft.
Each error's "hint" is a clue that lets the learner find the fix (a guiding question or mini-rule), never the answer; "correction" fixes only the quoted span.`;
