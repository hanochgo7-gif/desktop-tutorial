// The writing rubric used by the AI assessor. Kept in sync with content/writing/rubric.json
// (the app shows the same descriptors to learners).
export const RUBRIC = `Scoring. Score each applicable category 0-5 against the expectations of the TASK at the learner's current level:
0 = not demonstrated; 1 = well below the level; 2 = approaching the level, frequent problems;
3 = meets the level: problems exist but do not impede the task; 4 = above the level, few minor problems;
5 = clearly exceeds the level (would meet the expectations of the next CEFR level).
Separately, cefr_estimate is your ABSOLUTE estimate of the CEFR level this text demonstrates (independent of the learner's level), based on the Council of Europe descriptors for written production.

Categories (id: what to judge):
- grammar: accuracy and range of grammatical structures; errors that impede meaning weigh most.
- vocabulary: range, precision and appropriacy of words and collocations; spelling of common words.
- sentence_structure: control of simple, compound and complex sentences; variety; no run-ons or fragments (unless deliberate).
- coherence: logical order of ideas; each paragraph has one clear focus; the reader can follow the line of thought.
- cohesion: linking devices and reference (connectors, pronouns, lexical chains) used accurately and not mechanically.
- argument_strength: a clear position, logically developed; claims follow from reasons. Only for opinion/argumentative tasks.
- evidence_quality: claims supported by relevant, specific, credible examples or evidence, explained rather than dropped in. Only for opinion/argumentative tasks.
- counterarguments: opposing views presented fairly and answered with a reasoned rebuttal. Only for argumentative tasks at B1 and above, or when the task requires it.
- academic_tone: formal register appropriate to academic writing (no contractions or slang, hedging where appropriate, objective stance). Only for formal or academic tasks, normally B2 and above.
- clarity: the meaning of each sentence is immediately clear to a reader.
- precision: exact word choice and qualified claims instead of vague or sweeping ones; concision (no padding).
- overall: holistic judgement of how well the text achieves its communicative purpose at this level.
Set applicable=false (score null) for categories the task does not call for; still include all 12 entries in the order above.
At Pre-A1 and A1, typically only grammar, vocabulary, sentence_structure, clarity and overall apply.`;
