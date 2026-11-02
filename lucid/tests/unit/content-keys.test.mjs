// Every authored wrong answer in the lessons must be graded wrong by the real grader, as the
// exercise player calls it (with the exercise's wrong_feedback list).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { checkTyped, variants } from '../../js/core/grading.js';

const dir = new URL('../../content/lessons/', import.meta.url);
const lessons = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f, JSON.parse(readFileSync(new URL(f, dir), 'utf8'))]);

test('no authored wrong answer passes as correct or as a typo', () => {
  const leaks = [];
  for (const [f, l] of lessons) for (const e of l.exercises || []) {
    if (!['gap', 'transform', 'correct'].includes(e.type) || !e.wrong_feedback) continue;
    const keys = e.type === 'gap' ? e.answers : [e.answers];
    for (const w of e.wrong_feedback) for (const k of keys) {
      if (k.some((a) => variants(a).some((v) => variants(w.match).includes(v)))) continue; // the match is itself a key for another blank
      if (checkTyped(w.match, k, e.wrong_feedback).correct) leaks.push(`${f} ${e.id}: "${w.match}"`);
    }
  }
  assert.deepEqual(leaks, []);
});

// The keys the lesson player, Today, the path and the review read from a lesson file.
const LESSON_KEYS = ['id', 'level', 'title_en', 'title_he', 'topics', 'minutes', 'objectives', 'explanation', 'examples', 'vocab', 'exercises', 'review'];
const EXERCISE_KEYS = {
  mcq: ['question', 'options', 'answer'], gap: ['text', 'answers'], order: ['tokens'], match: ['pairs'], categorize: ['categories', 'items'],
  transform: ['source', 'answers'], correct: ['sentence', 'answers', 'error_type'], listen: ['audio_text', 'question', 'options', 'answer'],
  dictation: ['audio_text', 'answers'], speak: ['target'], read: ['passage', 'questions'], write: ['task', 'min_words', 'model_answer', 'checklist'],
};
test('every lesson keeps the keys the app reads', () => {
  const missing = [];
  for (const [f, l] of lessons) {
    for (const k of LESSON_KEYS) if (l[k] == null) missing.push(`${f} ${k}`);
    if (!Array.isArray(l.review?.key_points)) missing.push(`${f} review.key_points`);
    for (const e of l.exercises || []) {
      for (const k of ['id', 'type', 'skill', 'prompt']) if (e[k] == null) missing.push(`${f} ${e.id} ${k}`);
      for (const k of EXERCISE_KEYS[e.type] || []) if (e[k] == null) missing.push(`${f} ${e.id} ${k}`);
    }
    for (const v of l.vocab || []) for (const k of ['word', 'pos', 'he', 'def', 'example']) if (v[k] == null) missing.push(`${f} vocab ${v.word} ${k}`);
  }
  assert.deepEqual(missing, []);
});

// BL-2: a Hebrew gloss states the claim and quotes only short English tokens. The full English examples
// live in the English field, the examples list or a table (tools/validate-content.mjs, glossStats).
const { glossStats, glossProblem, GLOSS_STRICT } = await import('../../tools/validate-content.mjs');

test('the gloss rule counts English sentences and words in Hebrew text', () => {
  const repeated = "אני יודע/ת לבנות משפטי שלילה עם don't ו-doesn't: I don't eat meat. She doesn't work on Fridays.";
  assert.equal(glossStats(repeated).sentences.length, 2);
  assert.ok(glossProblem(repeated));
  assert.equal(glossProblem("אני יודע/ת לבנות שלילה עם don't ו-doesn't."), null);
  // One quoted sentence is fine; two are not.
  assert.equal(glossProblem('בפגישה ראשונה אומרים Nice to meet you, ו-meet כאן הוא "להכיר".'), null);
  assert.ok(glossProblem('אומרים Nice to meet you, לא Nice to know you.'));
  // More than 8 English words, even without a sentence.
  assert.ok(glossProblem('במילים קצרות: cat, bed, sit, hot, cup, man, ten, big, dog.'));
  // IPA in slashes and single letters (letter names, spelled names) are not English words or sentences.
  assert.equal(glossProblem('מותחים את השפתיים כמו בחיוך ומאריכים את התנועה (/iː/, כמו ב-leave), וב-live היא קצרה (/ɪ/).'), null);
  assert.equal(glossProblem('מאייתים אות אחרי אות: N-O-A, ובשתי אותיות זהות אומרים double.'), null);
});

test('lesson glosses at the Hebrew-first levels pass the gloss rule', () => {
  const bad = [];
  const walk = (f, v, path) => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(f, x, `${path}[${i}]`));
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (typeof x === 'string' && (k === 'he' || k.endsWith('_he')) && glossProblem(x)) bad.push(`${f} ${path}.${k}`);
      else if (typeof x === 'string' && (k === 'en' || k.endsWith('_en')) && /[֐-׿]/.test(x)) bad.push(`${f} ${path}.${k} (Hebrew in en)`);
      else walk(f, x, path ? `${path}.${k}` : k);
    }
  };
  for (const [f, l] of lessons) if (GLOSS_STRICT.has(l.level)) walk(f, l, '');
  assert.deepEqual(bad, []);
});
