// Launch audit, content lane (EK-02, EK-03, EK-05, EK-06, EK-07, EK-08, EK-09, TS-03, TS-09): answer keys, the grader's
// place-name and digit equivalences, the level finals, and social scenarios that do not coach swapping contacts.
// Each item is checked with the real grader, called as the exercise player calls it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { checkTyped, variants, findWrongFeedback, normalize, digitsAllowed, numberWords, placeNames } from '../../js/core/grading.js';
import { forLearner } from '../../js/core/age.js';

const dir = new URL('../../content/lessons/', import.meta.url);
const lessons = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
const lesson = (id) => lessons.find((l) => l.id === id);
const item = (id, eid) => lesson(id).exercises.find((e) => e.id === eid);
// As js/ui/exercise.js grades a transform or correct item.
const grade = (lessonId, eid, input) => {
  const ex = item(lessonId, eid);
  return checkTyped(input, ex.answers, ex.wrong_feedback, { numbers: digitsAllowed(lesson(lessonId).level) });
};
const accepts = (lessonId, eid, inputs) => {
  const rejected = inputs.filter((x) => !grade(lessonId, eid, x).correct);
  assert.deepEqual(rejected, [], `${lessonId}/${eid} rejects valid answers`);
};
const LATIN = /[a-z]/i;
const HEBREW = /[֐-׿]/;

test('EK-02: no rewrite passes when its English source is left unchanged (pa1-05/e9 "I am Dana." for the short form)', () => {
  const passes = [];
  for (const l of lessons) for (const e of l.exercises || []) {
    if (!['transform', 'correct'].includes(e.type)) continue;
    const source = e.type === 'transform' ? e.source : e.sentence;
    if (!LATIN.test(source) || HEBREW.test(source)) continue;
    if (checkTyped(source, e.answers, e.wrong_feedback, { numbers: digitsAllowed(l.level) }).correct) passes.push(`${l.id}/${e.id}`);
  }
  assert.deepEqual(passes, []);
  // The short form is now chosen, so "I am" cannot pass for "I'm".
  const e9 = item('pa1-05', 'e9');
  assert.equal(e9.type, 'mcq');
  assert.equal(e9.options[e9.answer], "I'm");
  assert.ok(e9.options.includes('Im') && e9.options.includes("I'am"));
  for (const k of Object.keys(e9.option_feedback)) assert.notEqual(Number(k), e9.answer);
});

test('EK-03: a2-11/e8 accepts "any advice" (taught in the same lesson) and Could you ...', () => {
  accepts('a2-11', 'e8', ['Can you give me any advice?', 'Could you give me some advice?', 'Could you give me any advice?', 'Could you give me advice?', 'Could you give me a piece of advice?']);
  assert.equal(grade('a2-11', 'e8', 'Can you give me an advice?').correct, false);
  assert.equal(grade('a2-11', 'e8', 'Can you give me advices?').correct, false);
});

test('EK-07: A2 typed items accept the full set of valid combinations', () => {
  const qs = ['How much money do you have?', 'How much money have you got?'];
  const as = ['I only have a few shekels.', 'I have only a few shekels.', 'I just have a few shekels.', 'I have just a few shekels.', "I've only got a few shekels.", 'Only a few shekels.'];
  accepts('a2-11', 'e12', qs.flatMap((q) => as.map((a) => `${q} ${a}`)));
  accepts('a2-11', 'e7', ['How much have you got?', 'How much do you have?']);
  accepts('a2-04', 'e12', ['We ordered some pizza yesterday.', 'Yesterday we ordered some pizza.', 'Yesterday, we ordered some pizza.']);
  assert.equal(grade('a2-04', 'e12', 'We invited a pizza yesterday.').correct, false);
  accepts('a2-13', 'e10', ['Can you turn out the light?', 'Could you turn off the light?', 'Could you turn the light off?', 'Could you switch off the lights?']);
  assert.equal(grade('a2-13', 'e10', 'Can you close the light?').correct, false);
  assert.equal(grade('a2-13', 'e10', 'Can you open the light?').correct, false);
});

test('EK-06: c1-03/e11 accepts "to a certain extent" and "to some degree"', () => {
  accepts('c1-03', 'e11', ['To a certain extent, the results support the original hypothesis.', 'To a certain extent the results support the original hypothesis.',
    'The results support the original hypothesis to a certain extent.', 'The results, to a certain extent, support the original hypothesis.',
    'To some degree, the results support the original hypothesis.']);
  assert.equal(grade('c1-03', 'e11', 'In some extent, the results support the original hypothesis.').correct, false);
});

test('EK-09: b1-02/e10 asks to keep "last year", and "I have seen this film." gets a note, not a bare red verdict', () => {
  const e = item('b1-02', 'e10');
  assert.match(e.prompt.en, /Keep last year/);
  assert.match(e.prompt.he, /last year/);
  assert.equal(grade('b1-02', 'e10', 'I have seen this film.').correct, false);
  const f = findWrongFeedback('I have seen this film.', e.wrong_feedback);
  assert.ok(f && /last year/.test(f.feedback.en) && /last year/.test(f.feedback.he));
  accepts('b1-02', 'e10', ['I saw this film last year.', 'Last year, I saw this film.']);
});

test('EK-08: Tel-Aviv and Be\'er Sheva spellings are the same place', () => {
  assert.equal(placeNames('we work in tel-aviv'), 'we work in tel aviv');
  accepts('a1-01', 'e9', ['We live in Jerusalem and work in Tel-Aviv.']);
  assert.ok(checkTyped("I live in Be'er Sheva.", ['I live in Beersheba.']).correct);
  assert.ok(checkTyped('I live in Beer-Sheva.', ["I live in Be'er Sheva."]).correct);
  assert.ok(!checkTyped('I work in Tel Aviv.', ['I work in Haifa.']).correct);
});

test('EK-08: digits 2-20 read as words in rewrites up to B1, never "1", never in gaps, single words or B2+ formal rewrites', () => {
  accepts('a2-04', 'e9', ['I called you 2 days ago.', '2 days ago, I called you.']);
  accepts('a1-05', 'e9', ['Noa has got 3 cousins.']);
  assert.equal(numberWords('at 5, 12 and 20; not 1, 21, 2020, 3.5, 7:30, B2 or 2nd'), 'at five, twelve and twenty; not 1, 21, 2020, 3.5, 7:30, B2 or 2nd');
  // Opt-in only: the default (gaps, word games, review cards, dictation) still asks for the word.
  assert.equal(checkTyped('4', ['four']).correct, false);
  assert.equal(checkTyped('Get on the bus at 10.', ['Get on the bus at ten.']).correct, false);
  assert.equal(checkTyped('My new phone is better than my old 1.', ['My new phone is better than my old one.'], null, { numbers: true }).correct, false);
  assert.equal(digitsAllowed('A2'), true);
  assert.equal(digitsAllowed(null), true);
  assert.equal(digitsAllowed('C2'), false);
  assert.equal(grade('c2-04', 'e12', 'However strong the objection may be, it does not apply to students over 16.').correct, false);
  // A different number is still wrong.
  assert.equal(grade('a2-04', 'e9', 'I called you 3 days ago.').correct, false);
});

test('EK-08: the exercise player passes the digit option with the same level rule as grading.js', () => {
  const src = readFileSync(new URL('../../js/ui/exercise.js', import.meta.url), 'utf8');
  assert.match(src, /checkTyped\(ta\.value, ex\.answers, ex\.wrong_feedback, \{ numbers: digitsAllowed\(level\) \}\)/);
  const local = /const digitsAllowed = \(level\) => (.+);/.exec(src)?.[1];
  const core = /export const digitsAllowed = \(level\) => (.+);/.exec(readFileSync(new URL('../../js/core/grading.js', import.meta.url), 'utf8'))?.[1];
  assert.ok(local && local === core, `exercise.js ${local} vs grading.js ${core}`);
});

test('EK-08: with the player\'s options, no authored wrong answer passes, as correct or as a typo', () => {
  const leaks = [];
  for (const l of lessons) for (const e of l.exercises || []) {
    if (!['transform', 'correct'].includes(e.type) || !e.wrong_feedback) continue;
    for (const w of e.wrong_feedback) {
      if (e.answers.some((a) => variants(a).some((v) => variants(w.match).includes(v)))) continue;
      if (checkTyped(w.match, e.answers, e.wrong_feedback, { numbers: digitsAllowed(l.level) }).correct) leaks.push(`${l.id}/${e.id}: "${w.match}"`);
    }
  }
  assert.deepEqual(leaks, []);
});

test('EK-05: one final per level; lesson write items are practice, and the C2 practice paper cites author-year like the C2 final', () => {
  const curriculum = JSON.parse(readFileSync(new URL('../../content/curriculum.json', import.meta.url), 'utf8'));
  const finals = [];
  for (const l of lessons) for (const e of l.exercises || []) {
    if (e.type !== 'write') continue;
    const text = `${e.prompt?.en || ''} ${e.prompt?.he || ''} ${e.explanation?.en || ''} ${e.explanation?.he || ''}`;
    if (/final (assessment|task)|checkpoint|משימת (ה)?סיום|סיום הרמה/i.test(text)) finals.push(`${l.id}/${e.id}`);
  }
  assert.deepEqual(finals, []);
  const c2 = item('c2-05', 'e15');
  assert.match(c2.prompt.en, /^Practice paper/);
  assert.doesNotMatch(c2.task.en, /MLA/);
  assert.match(c2.task.en, /author-year/);
  assert.match(curriculum.levels.find((x) => x.id === 'C2').final_assessment.required_elements.map((r) => r.en).join(' '), /author-year/);
  assert.doesNotMatch(readFileSync(new URL('../../content/lessons/c2-05.json', import.meta.url), 'utf8'), /APA or MLA/);
  // Each renamed practice item names the level's own writing task.
  for (const [id, eid, L] of [['b2-10', 'e14', 'B2'], ['c1-08', 'e16', 'C1'], ['c2-05', 'e15', 'C2']]) assert.match(item(id, eid).task.en, new RegExp(`${L} writing task`));
  // The level check names where the writing task is, and links to it.
  const cp = readFileSync(new URL('../../js/views/checkpoint.js', import.meta.url), 'utf8');
  assert.doesNotMatch(cp, /in its last lesson|בשיעור האחרון/);
  assert.match(cp, /href="#\/writing\/final-\$\{level\}"/);
});

// ---------- TS-03, TS-09: social content ----------
const scenarios = JSON.parse(readFileSync(new URL('../../content/real-life/scenarios.json', import.meta.url), 'utf8')).scenarios;
const slang = JSON.parse(readFileSync(new URL('../../content/real-life/slang.json', import.meta.url), 'utf8')).entries;
// Asking for, or handing over, a phone number or a social account.
const CONTACT = /swap (numbers|contacts)|(your|my|her|his) (phone )?number|are you on (instagram|whatsapp|snapchat|tiktok|facebook)|your (instagram|snapchat|tiktok|socials)|i'll follow you|put your number/i;
const under16 = { birth_year: new Date().getUTCFullYear() - 12 };

// Social settings, where the partner is someone the learner has just met (an airline form or a police report asking
// for a phone number is not this).
const SOCIAL = new Set(['social', 'restaurant']);
test('TS-03: no social scenario shown to an under-16 learner models or rewards swapping contacts', () => {
  const bad = [];
  const shown = forLearner(scenarios, under16).shown.filter((s) => SOCIAL.has(s.module));
  assert.ok(shown.length >= 6, 'the social scenarios are shown to under-16 learners');
  for (const s of shown) {
    const lines = [
      ...(s.phrases || []).map((p) => ['phrase', p.en]),
      ...(s.model_dialogue || []).map((d) => ['dialogue', d.text]),
      ...(s.practice || []).flatMap((t) => [...t.options.filter((o) => o.verdict !== 'poor').map((o) => [`${o.verdict} option`, o.text]),
        ...t.options.map((o) => ['feedback', `${o.feedback?.en || ''}`]), ...(t.model_replies || []).map((r) => ['model reply', r])]),
      ['goal', s.goal?.en || ''], ['roleplay', `${s.roleplay?.complication || ''}`],
    ];
    for (const [where, text] of lines) if (CONTACT.test(text)) bad.push(`${s.id} ${where}: ${text}`);
    for (const t of s.practice || []) for (const k of t.keywords || []) if (/^(numbers?|instagram|whatsapp|contacts?)$/i.test(k)) bad.push(`${s.id} keyword: ${k}`);
  }
  assert.deepEqual(bad, []);
});

test('TS-03: the language exchange has the safety note the hostel and beach-bar scenarios have, and the hostel plan has no contact swap', () => {
  const lx = scenarios.find((s) => s.id === 'rl-social-language-exchange');
  const note = lx.culture.find((c) => /public place/.test(c.en));
  assert.ok(note && /under 18, check with a parent/.test(note.en) && /מתחת לגיל 18/.test(note.he));
  assert.doesNotMatch(lx.culture.map((c) => c.en).join(' '), /Swapping numbers or social media with new friends is normal/);
  const hostel = scenarios.find((s) => s.id === 'rl-social-hostel-travellers');
  assert.doesNotMatch(hostel.roleplay.complication, /swap contacts/);
  assert.ok(hostel.culture.some((c) => /meet in public places/.test(c.en)));
  for (const id of ['rl-social-language-exchange', 'rl-social-hostel-travellers']) {
    const s = scenarios.find((x) => x.id === id);
    for (const t of s.practice) assert.equal(t.options.filter((o) => o.verdict === 'best').length, 1, `${id}: one best option per turn`);
  }
});

test('TS-03: expressions do not model swapping social accounts with someone just met', () => {
  const bad = slang.flatMap((e) => (e.example_dialogue || []).filter((d) => CONTACT.test(d.text)).map((d) => `${e.id}: ${d.text}`));
  assert.deepEqual(bad, []);
  const hit = slang.find((e) => e.id === 'ex-hit-me-up');
  assert.match(hit.example_dialogue.map((d) => d.text).join(' '), /group chat/);
});

test('TS-09: real-life content does not use "היכרויות" (in everyday Hebrew it reads as dating)', () => {
  const text = JSON.stringify({ scenarios, slang });
  assert.doesNotMatch(text, /היכרויות/);
});

test('every changed answer list is free of duplicates after normalising', () => {
  const dupes = [];
  for (const [id, eid] of [['a2-11', 'e7'], ['a2-11', 'e8'], ['a2-11', 'e12'], ['a2-04', 'e12'], ['a2-13', 'e10'], ['c1-03', 'e11']]) {
    const n = item(id, eid).answers.map(normalize);
    if (new Set(n).size !== n.length) dupes.push(`${id}/${eid}`);
  }
  assert.deepEqual(dupes, []);
});
