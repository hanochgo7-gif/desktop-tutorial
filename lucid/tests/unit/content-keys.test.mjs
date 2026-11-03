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

// ---------- UX round 4 (exercises lane) ----------
const lessonById = (id) => lessons.find(([, l]) => l.id === id)[1];
const exById = (id, eid) => lessonById(id).exercises.find((e) => e.id === eid);

test('r4 EX-5: the named first-try notes have a rule that does not give the answer', async () => {
  const { noteGivesAnswer } = await import('../../tools/validate-content.mjs');
  const named = [['a1-01', 'e10'], ['a2-05', 'e8'], ['a2-05', 'e10'], ['a2-05', 'e13'], ['b1-02', 'e9'], ['b1-02', 'e13']];
  const bad = [];
  for (const [id, eid] of named) {
    const e = exById(id, eid);
    const keys = e.type === 'gap' ? e.answers.flat() : e.answers;
    for (const f of e.wrong_feedback) {
      if (!noteGivesAnswer(e, f.feedback, f.match)) continue; // the feedback itself gives nothing away
      if (!f.rule?.en || !f.rule?.he) { bad.push(`${id} ${eid} "${f.match}": no rule`); continue; }
      if (noteGivesAnswer(e, f.rule, f.match)) bad.push(`${id} ${eid} "${f.match}": the rule gives the answer`);
      if (keys.some((k) => `${f.rule.en} ${f.rule.he}`.toLowerCase().includes(String(k).toLowerCase().replace(/[.!?]$/, '')))) bad.push(`${id} ${eid} "${f.match}": the rule holds an accepted answer`);
    }
  }
  assert.deepEqual(bad, []);
});

test('r4 EX-5: ruleNote names the rule, never the key\'s words', async () => {
  globalThis.document ??= { documentElement: { dataset: {}, lang: 'he', dir: 'rtl' }, visibilityState: 'visible' };
  const { ruleNote } = await import('../../js/ui/exercise.js');
  const { couldBeRight } = await import('../../js/core/grading.js');
  const e = exById('b1-02', 'e11');
  for (const typed of ['I did lived in Tel Aviv since 2020.', 'I did live in Tel Aviv since 2020.', 'I lived in Tel Aviv since 2020.']) {
    const could = couldBeRight(typed, { source: e.sentence, answers: e.answers, wrong_feedback: e.wrong_feedback });
    assert.equal(could.ok, false, typed);
    const note = ruleNote(could, e.sentence, e);
    const text = `${note.en} ${note.he}`;
    assert.ok(!/did live/.test(text) && !/have lived/.test(text), `${typed}: ${text}`);
    assert.ok(/since/.test(text) && /V3|past participle/.test(text), `${typed}: the note does not name the structure: ${text}`);
  }
});

test('r4 EX-6: the word range in a writing task is the one the data checks', () => {
  for (const id of ['c1-03', 'c2-03']) {
    const e = lessonById(id).exercises.find((x) => x.type === 'write');
    const m = /(\d+)\s*[-–]\s*(\d+)\s*words/.exec(e.task.en) || /words?\s*\((\d+)\s*[-–]\s*(\d+)/.exec(e.task.en) || /\((\d+)\s*[-–]\s*(\d+)\s*words\)/.exec(e.task.en);
    assert.ok(m, `${id}: no range in the task`);
    assert.deepEqual([e.min_words, e.max_words], [Number(m[1]), Number(m[2])], `${id}: the data and the task disagree`);
  }
});

test('r4 EX-6: Hebrew header labels are in headers_he, so English headers stay English', () => {
  const tables = lessonById('pa1-02').explanation.filter((b) => b.type === 'table');
  assert.ok(tables.length >= 2);
  for (const t of tables) {
    assert.ok(Array.isArray(t.headers_he) && t.headers_he.length === t.headers.length, `headers_he: ${JSON.stringify(t.headers_he)}`);
    // Every English header has a Hebrew label; a Hebrew column keeps its own Hebrew header and gets none.
    t.headers.forEach((h, i) => {
      if (/[֐-׿]/.test(h)) assert.equal(t.headers_he[i], '', `the Hebrew column "${h}" gets no second label`);
      else assert.ok(/[֐-׿]/.test(t.headers_he[i]) && !/[֐-׿]/.test(h), `"${h}" has no Hebrew label`);
    });
  }
  const a107 = lessonById('a1-07').explanation.find((b) => b.type === 'table');
  const at = a107.headers.indexOf('מתי?');
  assert.ok(at > 0 && a107.rows.every((r) => /[֐-׿]/.test(r[at])), 'a1-07 has no Hebrew "מתי?" column');
  assert.ok(!/[֐-׿]/.test(a107.headers[0]), 'the first header stays English, so the table stays an English table');
});

test('r4 EX-7 EX-8 EX-10 EX-11: exercise helpers', async () => {
  globalThis.document ??= { documentElement: { dataset: {}, lang: 'he', dir: 'rtl' }, visibilityState: 'visible' };
  const I18N = await import('../../js/core/i18n.js');
  I18N.setUiLang('he');
  const X = await import('../../js/ui/exercise.js');
  // EX-7: one range, and the informal genres.
  assert.equal(X.wordCountLine(40, { min_words: 80, max_words: 120 }), '40 מילים · יעד 80-120');
  assert.equal(X.wordCountLine(1, { min_words: 8, max_words: 40 }), 'מילה אחת · יעד 8-40');
  for (const p of ['Write a short story with flashbacks.', 'Write a short blog post about a place you know well.', 'Write a message to a friend.']) assert.ok(X.INFORMAL_TASK.test(p), p);
  assert.ok(!X.INFORMAL_TASK.test('Write a formal email using collocations from the lesson.'));
  // EX-8: where the slip is, never the letter.
  assert.match(X.slipWhere({ letter: 2, word: 3 }).he, /^האות השלישית במילה הרביעית עוד לא נכונה\./);
  assert.match(X.slipWhere({ letter: 2, more: 0 }).he, /^האות השלישית עוד לא נכונה\./);
  assert.match(X.slipWhere({ word: 0 }).he, /^המילה הראשונה עוד לא נכונה\./);
  // EX-10: a capital-letter group shows capitals; other groups are left as they are.
  assert.equal(X.capitalFor('israel', 'Capital (A)'), 'Israel');
  assert.equal(X.capitalFor('book', 'small (a)'), 'book');
  assert.deepEqual(X.categoryFixes({ categories: ['Capital (A)', 'small (a)'], items: [{ text: 'israel', category: 'Capital (A)' }, { text: 'book', category: 'small (a)' }] }, new Map()), [{ category: 'Capital (A)', items: ['Israel'] }, { category: 'small (a)', items: ['book'] }]);
  // EX-11: greetings, sign-offs, short labels and bylines are not numbered.
  for (const p of ['Hi Noa,', 'Love,', 'Maya', 'COMMENTS', '– Lior, 16', 'Best wishes,']) assert.equal(X.bodyPara(p), false, p);
  assert.equal(X.bodyPara("Sorry I haven't written for ages. Life here has been crazy!"), true);
});
