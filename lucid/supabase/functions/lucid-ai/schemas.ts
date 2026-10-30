// Request and response schemas for the lucid-ai edge function.
// Requests are validated strictly (bounded strings and arrays); responses are the structured
// outputs Claude must return, so the app can render them without parsing free text.
import { z } from 'npm:zod@4.6.7';

export const LEVELS = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const SUPPORT = ['full', 'partial', 'minimal', 'off'] as const;
export const RUBRIC_IDS = [
  'grammar', 'vocabulary', 'sentence_structure', 'coherence', 'cohesion', 'argument_strength',
  'evidence_quality', 'counterarguments', 'academic_tone', 'clarity', 'precision', 'overall',
] as const;
export const ERROR_TYPES = [
  'copula-omission', 'article', 'third-person-s', 'do-support', 'word-order', 'tense-choice', 'verb-form',
  'agreement', 'plural-form', 'countability', 'preposition', 'pronoun', 'spelling', 'capitalization',
  'punctuation', 'word-choice', 'false-friend', 'register', 'modal-use', 'conditional-form', 'passive-form',
  'reported-speech', 'gerund-infinitive', 'relative-clause', 'comparison-form', 'cohesion',
  'unsupported-claim', 'weak-thesis', 'missing-counterargument', 'fallacy',
] as const;
export const TUTOR_MODES = ['beginner', 'conversation', 'grammar', 'vocabulary', 'writing', 'debate', 'travel', 'pronunciation'] as const;

const text = (max: number) => z.string().trim().min(1).max(max);

const Scenario = z.object({
  title: text(120),
  partner_role: text(200),
  persona: text(600),
  complication: text(600),
  goal: text(300),
  level: z.enum(LEVELS),
  variant: z.enum(['US', 'UK', 'any']).default('any'),
});
const Turn = z.object({ role: z.enum(['partner', 'learner']), text: text(1200) });

export const Request = z.discriminatedUnion('task', [
  z.object({
    task: z.literal('evaluate_writing'),
    level: z.enum(LEVELS),
    hebrew_support: z.enum(SUPPORT).default('partial'),
    exercise: z.object({
      title: text(200),
      instructions: text(2000),
      kind: text(40),
      min_words: z.number().int().min(1).max(3000).optional(),
      max_words: z.number().int().min(1).max(4000).optional(),
      focus: z.array(z.enum(RUBRIC_IDS)).max(12).default([]),
      required_elements: z.array(text(200)).max(12).default([]),
    }),
    text: text(16000),
    previous: z.object({ text: text(16000), priorities: z.array(text(400)).max(8).default([]) }).optional(),
  }),
  z.object({
    task: z.literal('roleplay_turn'),
    hebrew_support: z.enum(SUPPORT).default('partial'),
    scenario: Scenario,
    opening_line: text(600),
    history: z.array(Turn).max(40),
  }),
  z.object({
    task: z.literal('roleplay_feedback'),
    hebrew_support: z.enum(SUPPORT).default('partial'),
    scenario: Scenario,
    opening_line: text(600),
    history: z.array(Turn).min(1).max(40),
  }),
  z.object({
    task: z.literal('tutor_turn'),
    mode: z.enum(TUTOR_MODES),
    level: z.enum(LEVELS),
    hebrew_support: z.enum(SUPPORT).default('partial'),
    learner: z.object({
      goals: z.array(text(80)).max(8).default([]),
      weak_topics: z.array(text(80)).max(12).default([]),
      recurring_errors: z.array(text(80)).max(12).default([]),
      recent_lessons: z.array(text(120)).max(8).default([]),
    }).default({ goals: [], weak_topics: [], recurring_errors: [], recent_lessons: [] }),
    history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: text(4000) })).max(40),
    message: text(2000),
  }),
]);
export type Request = z.infer<typeof Request>;

// ---------- structured outputs ----------
// Structured outputs support a subset of JSON Schema, so numeric ranges are checked after parsing
// (see clampEvaluation) rather than declared here.
export const WritingEvaluation = z.object({
  cefr_estimate: z.enum([...LEVELS, 'below_PreA1']),
  summary: z.string(),
  summary_he: z.string().nullable(),
  strengths: z.array(z.string()),
  priorities: z.array(z.string()),
  categories: z.array(z.object({
    id: z.enum(RUBRIC_IDS),
    applicable: z.boolean(),
    score: z.number().int().nullable(),
    explanation: z.string(),
    examples: z.array(z.object({ quote: z.string(), comment: z.string() })),
    improvement: z.string(),
    practice: z.string(),
  })),
  errors: z.array(z.object({
    quote: z.string(),
    type: z.enum(ERROR_TYPES),
    severity: z.enum(['critical', 'important', 'style']),
    explanation: z.string(),
    explanation_he: z.string().nullable(),
    hint: z.string(),
    correction: z.string(),
  })),
  required_elements: z.array(z.object({ element: z.string(), present: z.boolean(), comment: z.string() })),
  revision: z.object({
    tasks: z.array(z.string()),
    progress_since_previous: z.string().nullable(),
  }),
});
export type WritingEvaluation = z.infer<typeof WritingEvaluation>;

export const RoleplayTurn = z.object({
  reply: z.string(),
  scene_complete: z.boolean(),
  hint_he: z.string().nullable(),
});

export const RoleplayFeedback = z.object({
  conversation_score: z.number().int(),
  task_completed: z.boolean(),
  grammar: z.object({ score: z.number().int(), comments: z.array(z.string()) }),
  vocabulary: z.object({ score: z.number().int(), comments: z.array(z.string()) }),
  naturalness: z.object({ score: z.number().int(), comments: z.array(z.string()) }),
  better_alternatives: z.array(z.object({ you_said: z.string(), more_natural: z.string(), why: z.string() })),
  practice: z.array(z.string()),
  summary: z.string(),
  summary_he: z.string().nullable(),
});

const clampInt = (n: number | null, lo: number, hi: number) => (n == null ? null : Math.min(hi, Math.max(lo, Math.round(n))));

export function clampEvaluation(e: WritingEvaluation): WritingEvaluation {
  return {
    ...e,
    categories: e.categories.map((c) => ({ ...c, score: c.applicable ? clampInt(c.score, 0, 5) : null })),
    errors: e.errors.slice(0, 15),
  };
}
export function clampFeedback(f: z.infer<typeof RoleplayFeedback>) {
  const s = (n: number) => clampInt(n, 0, 100) as number;
  return {
    ...f,
    conversation_score: s(f.conversation_score),
    grammar: { ...f.grammar, score: s(f.grammar.score) },
    vocabulary: { ...f.vocabulary, score: s(f.vocabulary.score) },
    naturalness: { ...f.naturalness, score: s(f.naturalness.score) },
  };
}

// Weighted cost of each route for rate limiting.
export const UNITS: Record<Request['task'], number> = {
  evaluate_writing: 3,
  roleplay_turn: 1,
  roleplay_feedback: 2,
  tutor_turn: 1,
};
