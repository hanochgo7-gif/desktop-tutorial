// Validates every content file against docs/content-schema.md.
// Usage: node tools/validate-content.mjs [--only lessons|placement|scenarios|slang|writing] [files...]
// Exit code 1 when any error is found. Warnings flag quality issues that do not block.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const taxonomy = read(join(ROOT, 'taxonomy.json'));
const curriculum = read(join(ROOT, 'curriculum.json'));
const TOPICS = new Set(taxonomy.topics.map((t) => t.id));
const ERRORS = new Set(taxonomy.error_types.map((t) => t.id));
const SKILLS = new Set(taxonomy.skills.map((t) => t.id));
const LEVELS = taxonomy.levels.map((l) => l.id);
const LESSONS = new Map(curriculum.levels.flatMap((l) => l.lessons.map((x) => [x.id, x])));
const HE_REQUIRED = new Set(['PreA1', 'A1', 'A2']);
const RUBRIC = new Set(['grammar', 'vocabulary', 'sentence_structure', 'coherence', 'cohesion', 'argument_strength', 'evidence_quality', 'counterarguments', 'academic_tone', 'clarity', 'precision', 'overall']);

const errors = [];
const warnings = [];
const err = (file, path, msg) => errors.push(`${file} ${path}: ${msg}`);
const warn = (file, path, msg) => warnings.push(`${file} ${path}: ${msg}`);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const hebrew = /[֐-׿]/;

function bilingual(file, path, v, { he = false, required = true } = {}) {
  if (v == null) { if (required) err(file, path, 'missing'); return; }
  if (typeof v !== 'object' || !isStr(v.en)) { err(file, path, 'must be {en, he?} with non-empty en'); return; }
  if (he && !isStr(v.he)) err(file, path, 'Hebrew (he) required at this level');
  if (v.he != null && !hebrew.test(v.he)) err(file, path, 'he must be Hebrew text');
  if (hebrew.test(v.en)) warn(file, path, 'en contains Hebrew characters');
}
const strArr = (file, path, v, min = 1) => {
  if (!Array.isArray(v) || v.length < min || !v.every(isStr)) err(file, path, `must be an array of >= ${min} non-empty strings`);
};

function feedbackList(file, path, list, he) {
  if (list == null) return;
  if (!Array.isArray(list)) return err(file, path, 'must be an array');
  list.forEach((f, i) => {
    if (!isStr(f.match)) err(file, `${path}[${i}].match`, 'missing');
    bilingual(file, `${path}[${i}].feedback`, f.feedback, { he });
    if (f.error_type && !ERRORS.has(f.error_type)) err(file, `${path}[${i}].error_type`, `unknown error type ${f.error_type}`);
  });
}

function mcqCore(file, path, ex, he, { minOptions = 3 } = {}) {
  if (!isStr(ex.question)) err(file, `${path}.question`, 'missing');
  strArr(file, `${path}.options`, ex.options, minOptions);
  if (Array.isArray(ex.options)) {
    if (new Set(ex.options.map((o) => o.trim().toLowerCase())).size !== ex.options.length) err(file, `${path}.options`, 'duplicate options');
    if (!Number.isInteger(ex.answer) || ex.answer < 0 || ex.answer >= ex.options.length) err(file, `${path}.answer`, 'must be a valid option index');
  }
  if (ex.option_feedback) for (const [k, v] of Object.entries(ex.option_feedback)) bilingual(file, `${path}.option_feedback.${k}`, v, { he });
  if (ex.option_errors) for (const [k, v] of Object.entries(ex.option_errors)) if (!ERRORS.has(v)) err(file, `${path}.option_errors.${k}`, `unknown error type ${v}`);
}

function exercise(file, path, ex, ctx, { nested = false } = {}) {
  const { he } = ctx;
  if (!isStr(ex.id) && !nested) err(file, `${path}.id`, 'missing');
  if (!nested) {
    if (!SKILLS.has(ex.skill)) err(file, `${path}.skill`, `unknown skill ${ex.skill}`);
    if (ex.topic && !TOPICS.has(ex.topic)) err(file, `${path}.topic`, `unknown topic ${ex.topic}`);
    bilingual(file, `${path}.prompt`, ex.prompt, { he });
  }
  if (ex.type !== 'read' && ex.type !== 'write') bilingual(file, `${path}.explanation`, ex.explanation, { he });
  if (ex.hint) bilingual(file, `${path}.hint`, ex.hint, { he });
  if (ex.error_type && !ERRORS.has(ex.error_type)) err(file, `${path}.error_type`, `unknown error type ${ex.error_type}`);
  switch (ex.type) {
    case 'mcq': mcqCore(file, path, ex, he); break;
    case 'tf':
      if (!nested) err(file, path, 'tf is only allowed inside read');
      if (!isStr(ex.statement)) err(file, `${path}.statement`, 'missing');
      if (typeof ex.answer !== 'boolean') err(file, `${path}.answer`, 'must be boolean');
      break;
    case 'gap': {
      if (!isStr(ex.text)) { err(file, `${path}.text`, 'missing'); break; }
      const blanks = ex.text.split('___').length - 1;
      if (blanks < 1) err(file, `${path}.text`, 'needs at least one ___');
      if (!Array.isArray(ex.answers) || ex.answers.length !== blanks) err(file, `${path}.answers`, `needs one array of accepted answers per blank (${blanks})`);
      else ex.answers.forEach((a, i) => strArr(file, `${path}.answers[${i}]`, a));
      if (ex.word_bank) {
        strArr(file, `${path}.word_bank`, ex.word_bank, 2);
        if (Array.isArray(ex.answers) && Array.isArray(ex.word_bank)) ex.answers.forEach((a, i) => {
          if (Array.isArray(a) && !a.some((x) => ex.word_bank.map((w) => w.toLowerCase()).includes(x.toLowerCase()))) err(file, `${path}.word_bank`, `no accepted answer for blank ${i} is in the word bank`);
        });
      }
      feedbackList(file, `${path}.wrong_feedback`, ex.wrong_feedback, he);
      break;
    }
    case 'order':
      strArr(file, `${path}.tokens`, ex.tokens, 3);
      if (ex.answers) strArr(file, `${path}.answers`, ex.answers);
      break;
    case 'match':
      if (!Array.isArray(ex.pairs) || ex.pairs.length < 3 || ex.pairs.length > 8) err(file, `${path}.pairs`, 'needs 3-8 pairs');
      else {
        ex.pairs.forEach((p, i) => { if (!Array.isArray(p) || p.length !== 2 || !p.every(isStr)) err(file, `${path}.pairs[${i}]`, 'must be [left, right]'); });
        const lefts = ex.pairs.map((p) => p[0]); const rights = ex.pairs.map((p) => p[1]);
        if (new Set(lefts).size !== lefts.length || new Set(rights).size !== rights.length) err(file, `${path}.pairs`, 'duplicate left or right values make the match ambiguous');
      }
      break;
    case 'categorize':
      strArr(file, `${path}.categories`, ex.categories, 2);
      if (!Array.isArray(ex.items) || ex.items.length < 4) err(file, `${path}.items`, 'needs at least 4 items');
      else ex.items.forEach((it, i) => {
        if (!isStr(it.text)) err(file, `${path}.items[${i}].text`, 'missing');
        if (!Array.isArray(ex.categories) || !ex.categories.includes(it.category)) err(file, `${path}.items[${i}].category`, 'must be one of categories');
      });
      break;
    case 'transform':
      if (!isStr(ex.source)) err(file, `${path}.source`, 'missing');
      strArr(file, `${path}.answers`, ex.answers);
      feedbackList(file, `${path}.wrong_feedback`, ex.wrong_feedback, he);
      break;
    case 'correct':
      if (!isStr(ex.sentence)) err(file, `${path}.sentence`, 'missing');
      strArr(file, `${path}.answers`, ex.answers);
      if (!ERRORS.has(ex.error_type)) err(file, `${path}.error_type`, 'required and must be a taxonomy error type');
      if (Array.isArray(ex.answers) && ex.answers.some((a) => a.trim().toLowerCase() === String(ex.sentence).trim().toLowerCase())) err(file, `${path}.answers`, 'an accepted answer equals the incorrect sentence');
      break;
    case 'listen':
      if (!isStr(ex.audio_text)) err(file, `${path}.audio_text`, 'missing');
      mcqCore(file, path, ex, he);
      break;
    case 'dictation':
      if (!isStr(ex.audio_text)) err(file, `${path}.audio_text`, 'missing');
      strArr(file, `${path}.answers`, ex.answers);
      break;
    case 'speak':
      if (!isStr(ex.target)) err(file, `${path}.target`, 'missing');
      if (ex.focus) bilingual(file, `${path}.focus`, ex.focus, { he });
      break;
    case 'read':
      if (!isStr(ex.passage)) err(file, `${path}.passage`, 'missing');
      if (!Array.isArray(ex.questions) || ex.questions.length < 2) err(file, `${path}.questions`, 'needs at least 2 questions');
      else ex.questions.forEach((q, i) => {
        if (!['mcq', 'tf', 'gap'].includes(q.type)) err(file, `${path}.questions[${i}].type`, 'must be mcq, tf or gap');
        exercise(file, `${path}.questions[${i}]`, q, ctx, { nested: true });
      });
      break;
    case 'write':
      bilingual(file, `${path}.task`, ex.task, { he });
      if (!Number.isInteger(ex.min_words) || ex.min_words < 3) err(file, `${path}.min_words`, 'must be an integer >= 3');
      if (ex.max_words != null && ex.max_words < ex.min_words) err(file, `${path}.max_words`, 'must be >= min_words');
      if (ex.must_include) strArr(file, `${path}.must_include`, ex.must_include);
      if (!isStr(ex.model_answer)) err(file, `${path}.model_answer`, 'missing');
      if (!Array.isArray(ex.checklist) || ex.checklist.length < 2) err(file, `${path}.checklist`, 'needs at least 2 items');
      else ex.checklist.forEach((c, i) => bilingual(file, `${path}.checklist[${i}]`, c, { he }));
      break;
    default:
      err(file, `${path}.type`, `unknown exercise type ${ex.type}`);
  }
}

function lesson(file) {
  let d;
  try { d = read(file); } catch (e) { return err(file, '', `invalid JSON: ${e.message}`); }
  const f = file.replace(ROOT + '/', '');
  const plan = LESSONS.get(d.id);
  if (!plan) return err(f, 'id', `not in curriculum.json: ${d.id}`);
  if (d.level !== plan.level) err(f, 'level', `expected ${plan.level}`);
  if (JSON.stringify(d.topics) !== JSON.stringify(plan.topics)) err(f, 'topics', `expected ${JSON.stringify(plan.topics)}`);
  const he = HE_REQUIRED.has(d.level);
  const ctx = { he };
  if (!isStr(d.title_en) || !isStr(d.title_he)) err(f, 'title', 'title_en and title_he required');
  if (!Number.isInteger(d.minutes) || d.minutes < 5 || d.minutes > 40) err(f, 'minutes', 'integer 5-40');
  if (!Array.isArray(d.objectives) || d.objectives.length < 1) err(f, 'objectives', 'needs 1-4');
  else d.objectives.forEach((o, i) => bilingual(f, `objectives[${i}]`, o, { he }));
  bilingual(f, 'warmup', d.warmup, { he, required: false });
  if (!Array.isArray(d.explanation) || d.explanation.length < 2) err(f, 'explanation', 'needs at least 2 blocks');
  else d.explanation.forEach((b, i) => {
    const p = `explanation[${i}]`;
    if (['p', 'rule', 'tip', 'warning'].includes(b.type)) bilingual(f, p, b, { he });
    else if (b.type === 'table') {
      strArr(f, `${p}.headers`, b.headers, 2);
      if (!Array.isArray(b.rows) || !b.rows.length || !b.rows.every((r) => Array.isArray(r) && r.length === b.headers?.length)) err(f, `${p}.rows`, 'rows must match headers');
    } else if (b.type === 'examples') {
      if (!Array.isArray(b.items) || !b.items.length || !b.items.every((x) => isStr(x.en))) err(f, `${p}.items`, 'needs items with en');
    } else err(f, `${p}.type`, `unknown block type ${b.type}`);
  });
  if (!Array.isArray(d.examples) || d.examples.length < 3) err(f, 'examples', 'needs at least 3');
  else d.examples.forEach((x, i) => { if (!isStr(x.en)) err(f, `examples[${i}].en`, 'missing'); if (he && !isStr(x.he)) warn(f, `examples[${i}].he`, 'Hebrew translation recommended at this level'); });
  if (!Array.isArray(d.vocab) || d.vocab.length < 4) err(f, 'vocab', 'needs at least 4 items');
  else d.vocab.forEach((v, i) => {
    for (const k of ['word', 'pos', 'he', 'def', 'example']) if (!isStr(v[k])) err(f, `vocab[${i}].${k}`, 'missing');
    if (v.he && !hebrew.test(v.he)) err(f, `vocab[${i}].he`, 'must be Hebrew');
    if (v.level && !LEVELS.includes(v.level)) err(f, `vocab[${i}].level`, 'unknown level');
  });
  if (d.hebrew_pitfalls) d.hebrew_pitfalls.forEach((h, i) => { bilingual(f, `hebrew_pitfalls[${i}]`, h, { he: true }); if (h.error_type && !ERRORS.has(h.error_type)) err(f, `hebrew_pitfalls[${i}].error_type`, 'unknown error type'); });
  if (!Array.isArray(d.exercises) || d.exercises.length < 8) err(f, 'exercises', `needs at least 8 (has ${d.exercises?.length ?? 0})`);
  else {
    const ids = new Set();
    d.exercises.forEach((ex, i) => {
      if (ids.has(ex.id)) err(f, `exercises[${i}].id`, `duplicate id ${ex.id}`);
      ids.add(ex.id);
      exercise(f, `exercises[${i}]`, ex, ctx);
    });
    const types = new Set(d.exercises.map((e) => e.type));
    if (types.size < 4) warn(f, 'exercises', `only ${types.size} exercise types; aim for variety`);
    const mcqs = d.exercises.filter((e) => e.type === 'mcq');
    if (mcqs.length >= 4 && new Set(mcqs.map((e) => e.answer)).size === 1) warn(f, 'exercises', 'every mcq has the same answer index');
    if (d.exercises.length > 18) warn(f, 'exercises', 'more than 18 exercises; lesson may be too long');
    if (plan.final && !d.exercises.some((e) => e.type === 'write')) err(f, 'exercises', 'final lesson needs a write exercise for the level assessment');
    // Lesson template (research C2, D13-D15): meaningful input and free production are both required.
    if (!d.exercises.some((e) => ['read', 'listen', 'dictation'].includes(e.type))) err(f, 'exercises', 'needs at least one input exercise (read, listen or dictation)');
    if (!d.exercises.some((e) => ['write', 'speak'].includes(e.type))) err(f, 'exercises', 'needs at least one free-production exercise (write or speak)');
  }
  if (!d.review || !Array.isArray(d.review.key_points) || d.review.key_points.length < 2) err(f, 'review.key_points', 'needs at least 2');
  else d.review.key_points.forEach((k, i) => bilingual(f, `review.key_points[${i}]`, k, { he }));
  if (d.completion && (typeof d.completion.pass_score !== 'number' || d.completion.pass_score < 0.5 || d.completion.pass_score > 1)) err(f, 'completion.pass_score', '0.5-1');
}

function placement(file) {
  const d = read(file); const f = 'placement.json';
  if (!Array.isArray(d.items)) return err(f, 'items', 'missing');
  const ids = new Set();
  const per = {};
  d.items.forEach((it, i) => {
    if (ids.has(it.id)) err(f, `items[${i}].id`, 'duplicate'); ids.add(it.id);
    if (!LEVELS.includes(it.level)) err(f, `items[${i}].level`, 'unknown');
    if (!['mcq', 'gap', 'listen'].includes(it.type)) err(f, `items[${i}].type`, 'must be mcq, gap or listen');
    exercise(f, `items[${i}]`, { ...it, prompt: it.prompt || { en: 'x' }, explanation: it.explanation || { en: 'x' } }, { he: false });
    per[it.level] = (per[it.level] || 0) + 1;
  });
  if (!arg('--file')) for (const l of LEVELS) if ((per[l] || 0) < 10) err(f, 'items', `${l} has ${per[l] || 0} items; needs >= 10`);
}

function scenarios(file) {
  const d = read(file); const f = 'scenarios.json';
  const MODULES = ['airport', 'hotel', 'restaurant', 'transport', 'shopping', 'social', 'emergency'];
  const ids = new Set();
  (d.scenarios || []).forEach((s, i) => {
    const p = `scenarios[${i}](${s.id})`;
    if (ids.has(s.id)) err(f, p, 'duplicate id'); ids.add(s.id);
    if (!MODULES.includes(s.module)) err(f, `${p}.module`, 'unknown module');
    if (!isStr(s.title_en) || !isStr(s.title_he)) err(f, p, 'titles required');
    if (!LEVELS.includes(s.level)) err(f, `${p}.level`, 'unknown level');
    bilingual(f, `${p}.situation`, s.situation, { he: true });
    bilingual(f, `${p}.goal`, s.goal, { he: true });
    if (!isStr(s.partner_role)) err(f, `${p}.partner_role`, 'missing');
    if (!Array.isArray(s.phrases) || s.phrases.length < 5) err(f, `${p}.phrases`, 'needs >= 5');
    else s.phrases.forEach((x, j) => {
      if (!isStr(x.en) || !isStr(x.he)) err(f, `${p}.phrases[${j}]`, 'en and he required');
      if (!['polite', 'neutral', 'casual'].includes(x.register)) err(f, `${p}.phrases[${j}].register`, 'polite|neutral|casual');
      if (x.variant && !['US', 'UK'].includes(x.variant)) err(f, `${p}.phrases[${j}].variant`, 'US|UK');
    });
    if (!Array.isArray(s.model_dialogue) || s.model_dialogue.length < 4) err(f, `${p}.model_dialogue`, 'needs >= 4 lines');
    else s.model_dialogue.forEach((x, j) => { if (!['partner', 'you'].includes(x.speaker) || !isStr(x.text)) err(f, `${p}.model_dialogue[${j}]`, 'speaker partner|you and text'); });
    if (!Array.isArray(s.practice) || s.practice.length < 3) err(f, `${p}.practice`, 'needs >= 3 turns');
    else s.practice.forEach((t, j) => {
      const q = `${p}.practice[${j}]`;
      if (!isStr(t.partner)) err(f, `${q}.partner`, 'missing');
      if (!Array.isArray(t.options) || t.options.length < 3) err(f, `${q}.options`, 'needs >= 3');
      else {
        if (!t.options.some((o) => o.verdict === 'best')) err(f, `${q}.options`, 'needs a best option');
        t.options.forEach((o, k) => { if (!isStr(o.text) || !['best', 'ok', 'poor'].includes(o.verdict)) err(f, `${q}.options[${k}]`, 'text and verdict best|ok|poor'); bilingual(f, `${q}.options[${k}].feedback`, o.feedback, { he: true }); if (o.error_type && !ERRORS.has(o.error_type)) err(f, `${q}.options[${k}].error_type`, `unknown error type ${o.error_type}`); });
      }
      strArr(f, `${q}.model_replies`, t.model_replies);
      strArr(f, `${q}.keywords`, t.keywords);
    });
    if (!s.roleplay || !isStr(s.roleplay.persona) || !isStr(s.roleplay.complication) || !isStr(s.roleplay.opening_line)) err(f, `${p}.roleplay`, 'persona, complication, opening_line required');
  });
  const perModule = {};
  (d.scenarios || []).forEach((s) => { perModule[s.module] = (perModule[s.module] || 0) + 1; });
  if (!arg('--file')) for (const m of MODULES) if (!perModule[m]) err(f, 'scenarios', `no scenarios for module ${m}`);
}

function slang(file) {
  const d = read(file); const f = 'slang.json';
  const ids = new Set(); const terms = new Set();
  (d.entries || []).forEach((e, i) => {
    const p = `entries[${i}](${e.id})`;
    if (ids.has(e.id)) err(f, p, 'duplicate id'); ids.add(e.id);
    const t = String(e.term).toLowerCase(); if (terms.has(t)) err(f, p, 'duplicate term'); terms.add(t);
    for (const k of ['term', 'meaning_en', 'meaning_he']) if (!isStr(e[k])) err(f, `${p}.${k}`, 'missing');
    bilingual(f, `${p}.usage`, e.usage, { he: true });
    if (!['very informal', 'informal', 'neutral'].includes(e.formality)) err(f, `${p}.formality`, 'very informal|informal|neutral');
    if (!['US', 'UK', 'both', 'AU'].includes(e.region)) err(f, `${p}.region`, 'US|UK|both|AU');
    if (!Array.isArray(e.example_dialogue) || e.example_dialogue.length < 2) err(f, `${p}.example_dialogue`, 'needs >= 2 lines');
    if (!Array.isArray(e.mistakes) || !e.mistakes.length) err(f, `${p}.mistakes`, 'needs >= 1');
    else e.mistakes.forEach((m, j) => bilingual(f, `${p}.mistakes[${j}]`, m, { he: true }));
    bilingual(f, `${p}.avoid_when`, e.avoid_when, { he: true });
    if (e.warning) bilingual(f, `${p}.warning`, e.warning, { he: true });
  });
}

function writing(file, kind) {
  const d = read(file); const f = `writing/${kind}.json`;
  const list = d[kind] || [];
  const ids = new Set();
  const KINDS = ['sentence-correction', 'sentence-transformation', 'paragraph-completion', 'argument-construction', 'thesis-development', 'evidence-evaluation', 'counterargument', 'outlining', 'essay', 'editing', 'summarization', 'critical-response', 'research', 'timed'];
  list.forEach((w, i) => {
    const p = `${kind}[${i}](${w.id})`;
    if (ids.has(w.id)) err(f, p, 'duplicate id'); ids.add(w.id);
    if (!Number.isInteger(w.stage) || w.stage < 1 || w.stage > 10) err(f, `${p}.stage`, '1-10');
    if (!LEVELS.includes(w.level)) err(f, `${p}.level`, 'unknown level');
    if (!KINDS.includes(w.kind)) err(f, `${p}.kind`, `unknown kind ${w.kind}`);
    if (!isStr(w.title_en) || !isStr(w.title_he)) err(f, p, 'titles required');
    bilingual(f, `${p}.instructions`, w.instructions, { he: HE_REQUIRED.has(w.level) });
    if (w.items) w.items.forEach((ex, j) => exercise(f, `${p}.items[${j}]`, ex, { he: HE_REQUIRED.has(w.level) }));
    if (!w.items && !Number.isInteger(w.min_words)) err(f, p, 'needs items (auto-graded) or min_words (free writing)');
    if (!Array.isArray(w.focus) || !w.focus.length || !w.focus.every((c) => RUBRIC.has(c))) err(f, `${p}.focus`, 'rubric category ids required');
    if (!Array.isArray(w.checklist) || w.checklist.length < 2) err(f, `${p}.checklist`, 'needs >= 2');
    if (kind === 'assignments') {
      if (!isStr(w.prompt)) err(f, `${p}.prompt`, 'missing');
      strArr(f, `${p}.required_elements`, w.required_elements);
      if (!Array.isArray(w.word_range) || w.word_range.length !== 2 || w.word_range[0] >= w.word_range[1]) err(f, `${p}.word_range`, '[min, max]');
      if (w.source_pack) w.source_pack.forEach((s, j) => { if (s.kind !== 'illustrative' || !isStr(s.text)) err(f, `${p}.source_pack[${j}]`, 'kind must be illustrative and text required'); });
    }
  });
}

// ---- run ----
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
// Single-file mode for authors: --file <path> --kind lesson|placement|scenarios|slang|writing-exercises|writing-assignments
if (arg('--file')) {
  const file = arg('--file'), kind = arg('--kind');
  const run = { lesson, placement, scenarios, slang, 'writing-exercises': (f) => writing(f, 'exercises'), 'writing-assignments': (f) => writing(f, 'assignments') }[kind];
  if (!run) { console.log('ERROR unknown --kind'); process.exit(2); }
  try { run(file); } catch (e) { err(file, '', `invalid JSON or crash: ${e.message}`); }
  for (const w of warnings) console.log('WARN ', w);
  for (const e of errors) console.log('ERROR', e);
  console.log(`\n${file}: ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
}
const only = arg('--only');
const want = (k) => !only || only === k;
let lessonCount = 0;
if (want('lessons')) {
  const dir = join(ROOT, 'lessons');
  if (existsSync(dir)) for (const name of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) { lesson(join(dir, name)); lessonCount++; }
  const missing = [...LESSONS.keys()].filter((id) => !existsSync(join(dir, `${id}.json`)));
  if (missing.length) warn('lessons', '', `${missing.length} curriculum lessons have no file yet: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '...' : ''}`);
}
const opt = (rel, fn, ...a) => { const p = join(ROOT, rel); if (existsSync(p)) { try { fn(p, ...a); } catch (e) { err(rel, '', `invalid JSON or crash: ${e.message}`); } } else warn(rel, '', 'not present yet'); };
if (want('placement')) opt('placement.json', placement);
if (want('scenarios')) opt('real-life/scenarios.json', scenarios);
if (want('slang')) opt('real-life/slang.json', slang);
if (want('writing')) { opt('writing/exercises.json', writing, 'exercises'); opt('writing/assignments.json', writing, 'assignments'); }

for (const w of warnings) console.log('WARN ', w);
for (const e of errors) console.log('ERROR', e);
console.log(`\n${lessonCount} lesson files checked; ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
