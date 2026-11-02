import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWriting, checkSummary, l1Issues, parseSources } from '../../js/core/writing-analyzer.js';
import { readFileSync } from 'node:fs';
import { countWords } from '../../js/core/grading.js';

const types = (text, opts) => analyzeWriting(text, opts).issues.map((i) => i.type);

test('flags common learner errors', () => {
  assert.ok(types('i think i am agree with you.').includes('capitalization'));
  assert.ok(types('I am agree with this idea.').includes('word-choice'));
  assert.ok(types('I need more informations and advices.').includes('countability'));
  assert.ok(types('This is more better than that.').includes('comparison-form'));
  assert.ok(types('It depends in the weather.').includes('preposition'));
  assert.ok(types('We discussed about the plan.').includes('preposition'));
  assert.ok(types('I have 20 years.').includes('false-friend'));
  assert.ok(types('Yesterday I didn\'t went home.').includes('verb-form'));
  assert.ok(types('You should to go.').includes('modal-use'));
  assert.ok(types('If it will rain, we will stay home.').includes('conditional-form'));
  assert.ok(types('I ate a apple.').includes('article'));
  assert.ok(types('It was an big house.').includes('article'));
  assert.ok(types('I like the city, it is very beautiful.').includes('punctuation'));
});

test('does not flag correct English', () => {
  const clean = 'I study at a university. It took an hour. I agree with you. An honest answer is a useful one. If it rains, we will stay. I am 20 years old. A one-day trip was enough.';
  assert.deepEqual(types(clean), []);
});

test('register checks only for formal levels; structure signals are detected', () => {
  const essay = 'This essay argues that cities should invest in public transport.\n\nFor example, research shows that buses reduce traffic. However, critics argue that it\'s too expensive.\n\nIn conclusion, the benefits are greater.';
  assert.ok(types(essay, { level: 'C1' }).includes('register'), 'contraction flagged at C1');
  assert.ok(!types(essay, { level: 'A2' }).includes('register'), 'not at A2');
  const a = analyzeWriting(essay, { level: 'B2', minWords: 30 });
  assert.deepEqual(Object.entries(a.structure).filter(([, v]) => v).map(([k]) => k).sort(), ['conclusion', 'counter', 'evidence', 'rebuttal', 'thesis']);
  assert.ok(a.connectors.contrast.includes('however'));
  assert.equal(a.stats.paragraphs, 3);
  assert.equal(a.checks.find((c) => c.id === 'length').ok, true);
});

test('length and must-include checks gate completion', () => {
  const a = analyzeWriting('I am Yael.', { minWords: 9, mustInclude: ['is'] });
  assert.equal(a.passedRequired, false);
  const b = analyzeWriting('I am Yael. I am from Tel Aviv. My friend Omer is a student.', { minWords: 9, mustInclude: ['am', 'is'] });
  assert.equal(b.passedRequired, true);
});

// Persona panel P-74: correct academic English that the checks used to flag.
test('no run-on flag after a sentence-initial linker, adverbial or short prepositional phrase', () => {
  const ok = 'However, this does not mean that every city can afford it. In 2022, there were many cities that tried it. Conversely, it is cheaper than traffic jams. According to the city report, it is cheap. For instance, it was free in May. Unfortunately, it was too late.';
  assert.deepEqual(types(ok, { level: 'B2' }), []);
  assert.ok(types('In my city there are many cars, it is noisy.', { level: 'B2' }).includes('punctuation'), 'a real comma splice is still flagged');
});

test('a or an is decided by sound, with initialisms read letter by letter', () => {
  const ok = 'A unanimous vote is rare. A utilitarian view helps. She has an MBA and works for an NGO. It was a UN report. It took an hour. A European study and a one-off payment. An unusual result came from a university.';
  assert.deepEqual(types(ok, { level: 'C1' }), []);
  const bad = analyzeWriting('He has a MBA. She ate a apple. It was an useful idea.', { level: 'B1' }).issues.filter((i) => i.type === 'article').map((i) => `${i.match} (${i.title})`);
  assert.deepEqual(bad, ['a MBA (an before a vowel sound)', 'a apple (an before a vowel sound)', 'an useful (a before a consonant sound)']);
  assert.deepEqual(types('Buy a SIM card. She had an SAT score. It was a FAQ page.', { level: 'B1' }), [], 'three capitals that may be read as a word are not checked');
});

test('if + will in an indirect question is not flagged; low-precision rules are off above B2', () => {
  assert.deepEqual(types('It is unclear if hybrid work will preserve demand. I wonder if she will come.', { level: 'B1' }), []);
  assert.ok(types('If it will rain, we will stay home.', { level: 'B1' }).includes('conditional-form'));
  assert.ok(!types('If it will rain, we will stay home.', { level: 'C2' }).includes('conditional-form'), 'not run at C2');
  assert.ok(!types('I like the city, it is very beautiful.', { level: 'C1' }).includes('punctuation'), 'run-on rule not run at C1');
});

test('a title line is not merged into the first sentence or counted as a paragraph', () => {
  const body = Array.from({ length: 6 }, () => 'This sentence has exactly eight words in it.').join(' ');
  const a = analyzeWriting(`Remote work and the future of cities\n\n${body}\n\n${body}`, { level: 'C2' });
  assert.equal(a.stats.paragraphs, 2);
  assert.equal(a.stats.longest_sentence, 8);
  assert.ok(!a.issues.some((i) => i.title === 'Very long sentence'));
  assert.equal(a.checks.find((c) => c.id === 'caps').ok, true);
});

test('a closing reference list is not counted toward the word range or checked', () => {
  const body = Array.from({ length: 30 }, () => 'Remote work changes how cities use their office space.').join(' ');
  const text = `${body}\n\nReferences\nVarga, E. (2024). a study , of cities. Journal, 1(2), 3-4.\nHolm, J. (2023). another title. Press.`;
  const a = analyzeWriting(text, { level: 'C2', minWords: 250, maxWords: 300 });
  assert.equal(a.stats.words, 270);
  assert.ok(a.stats.reference_words > 10);
  assert.match(a.checks.find((c) => c.id === 'length').en, /reference list \(\d+ words\) is not counted/);
  assert.ok(!a.issues.some((i) => i.type === 'punctuation' || i.type === 'capitalization'), 'reference entries are not checked');
  assert.equal(analyzeWriting('References are useful. I like them.', {}).stats.reference_words, 0, 'a word, not a heading');
});

// Persona round 2 (T5): phrase linkers and fronted time phrases take a comma before a full clause.
test('no run-on flag after phrase linkers such as "To sum up," or "Last year,"', () => {
  const ok = 'To sum up, I believe it works. To conclude, it is good. All in all, this is fine. First of all, it is cheap. Last year, there were many buses. Put simply, it is fast. Two years ago, I was there. On the whole, it is worth it. That said, it is not cheap.';
  assert.deepEqual(types(ok, { level: 'B2' }), []);
  assert.ok(types('The plan is simple, it is cheap.', { level: 'B2' }).includes('punctuation'), 'a real comma splice is still flagged');
});

// Persona round 2 (Y6): an email is not an argumentative essay.
test('an email gets no argument signals, no formal-register warnings, and its sign-off is not checked', () => {
  const email = 'Hi Tom,\nI am writing about the meeting next week. I haven\'t finished the report yet, but it\'s nearly done.\n\nBest,\nYael Cohen';
  const a = analyzeWriting(email, { level: 'B2', kind: 'email', formal: true });
  assert.deepEqual(a.structure, {}, 'no thesis or counterargument checklist');
  assert.equal(a.checks.find((c) => c.id === 'end').ok, true, 'the sign-off does not fail the punctuation check');
  assert.ok(!a.issues.some((i) => i.type === 'register' || i.type === 'punctuation'), JSON.stringify(a.issues));
  assert.equal(a.stats.words, countWords(email));
  assert.ok(!a.connectors.contrast?.includes('yet') && !a.connectors.sequence?.includes('next'), '"yet" and "next" in "not ... yet" and "next week" are not linkers');
  const b = analyzeWriting('It is cheap, yet it is slow. Next, we test it.', { level: 'B1' });
  assert.ok(b.connectors.contrast.includes('yet') && b.connectors.sequence.includes('next'), 'linking "yet" and "Next," still count');
  assert.equal(analyzeWriting(email, { level: 'B2' }).structure.thesis, false, 'an essay still gets the argument signals');
});

// ---------- RW-2: errors typical of Hebrew speakers, each with false-positive cases ----------
// Sentences come from the round-3 panels (teacher-bagrut, teacher-academic, student-27, student-58).
const issuesOf = (text, opts = { level: 'B1' }) => analyzeWriting(text, opts).issues;
const flags = (text, opts) => issuesOf(text, opts).map((i) => i.match);
const flagged = (text, want, opts) => { const got = flags(text, opts); assert.ok(got.some((m) => m.toLowerCase().includes(want.toLowerCase())), `"${want}" not flagged in "${text}": ${JSON.stringify(got)}`); };
// Many short test sentences in a row start the same way: the repeated-opening note is not what is tested here.
const clean = (text, opts = { level: 'B1' }) => assert.deepEqual(issuesOf(text, opts).filter((i) => i.type !== 'cohesion').map((i) => `${i.type}: ${i.match}`), [], text);

test('RW-2: a singular subject or every / each with a base verb', () => {
  flagged('I think every school need a volunteering program.', 'every school need');
  flagged('Each student want a break.', 'each student want');
  flagged('He work in a bank.', 'he work');
  flagged('It need more time.', 'it need');
  flagged('Everyone know the answer.', 'everyone know');
  flagged('In my class a student write two essays a week.', 'student write');
  flagged('The study show that it works.', 'study show');
  flagged('Volunteering give young people a chance.', 'volunteering give');
  assert.equal(issuesOf('Every school need money.')[0].ex, 'Every school needs');
  clean('Does she need help? Let it go. Make it work. He and she need rest. Did it happen? We saw it happen. She needs it.');
  clean('I suggest that he go home. It is essential that she take the test. It cost me ten dollars yesterday. He read the book last week.');
  clean('The student work is on the wall. My family live in Haifa. Every day students need water. Can it work? Why does he need it?');
  clean('During work hours we stay inside. Being honest helps. Having a plan is good.');
});

test('RW-2: people was', () => {
  flagged('The old people was very kind.', 'people was');
  flagged('People is friendly here.', 'people is');
  assert.match(issuesOf('The old people was kind.').find((i) => i.type === 'agreement').en, /people were/);
  clean('The old people were very kind. Many people\'s homes are small. People have time.');
});

test('RW-2: alot, dont, doesnt, didnt and cant', () => {
  for (const [w, fix] of [['alot', 'a lot'], ['dont', "don't"], ['doesnt', "doesn't"], ['didnt', "didn't"], ['cant', "can't"]]) {
    const i = issuesOf(`I ${w} know.`).find((x) => x.type === 'spelling');
    assert.ok(i && i.ex === fix, `${w}: ${JSON.stringify(i)}`);
  }
  clean("I learned a lot. I don't know. She doesn't care. We didn't go. I can't swim. Dontae is my friend.");
});

test('RW-2: their / there before a noun, and "their is"', () => {
  flagged('Volunteering can improve there CV.', 'there CV');
  flagged('They did it on there own.', 'there own');
  flagged('Their is a problem.', 'their is');
  clean('Is there homework today? There is a problem. Are there friends here? Their CV is good. I went there yesterday. Was there money left?');
});

test('RW-2: for + base verb for a purpose', () => {
  flagged('They need the time for find a job.', 'for find');
  flagged('I came here for learn English.', 'for learn');
  clean('Thanks for your help. I asked for help. It is for you. We waited for hours. For example, it is free. It was just for show. This is good for practice.');
});

test('RW-2: Although / Though ... but', () => {
  flagged('Although the scheme is costly, but the savings outweigh it.', 'although');
  flagged('Even though I was tired, but I went out.', 'even though');
  clean('Although it rained, we went out. It is cheap, but it is slow. It was good, though, and we stayed.');
  clean('Although the scheme is costly, the savings outweigh it.', { level: 'C2' });
});

test('RW-2: until with a deadline (use by)', () => {
  flagged('Could you fix the bug until Thursday?', 'until Thursday');
  flagged('I will send you the first part until Wednesday.', 'until Wednesday');
  flagged('Please submit it until 5 pm.', 'until 5 pm');
  assert.equal(issuesOf('Could you fix the bug until Thursday?')[0].ex, 'by Thursday');
  clean("The shop is closed until Monday. I will stay in London until Friday. We waited until 5 pm. I will finish it by Thursday. It won't be ready until Friday. I can't finish the report until Thursday.");
});

test('RW-2: "I will be happy if" and "I am writing you" in requests', () => {
  flagged('I will be happy if we can move the deadline.', 'I will be happy if we');
  flagged("I'll be glad if you could call me.", "I'll be glad if you");
  flagged('I am writing you about the invoice.', 'I am writing you');
  clean("I will be happy if it is sunny. I'd be grateful if you could help. I am writing to you about the invoice. I am writing a letter.");
});

test('RW-2: a finished past time with the present perfect', () => {
  flagged('Okafor has found in 2021 that green roofs help.', 'has found');
  flagged('I have visited Rome two years ago.', 'have visited');
  flagged('In 2021, Okafor has found that green roofs help.', 'In 2021');
  clean('I have lived here for two years. Prices have risen in the last year. She has worked here since 2021. I found it in 2021. It has been raining since yesterday. I have been to Paris twice.');
});

test('RW-2: a negative opener without inversion', () => {
  flagged('Rarely we see such a clear result.', 'Rarely we');
  flagged('Never I have seen this before.', 'Never I');
  assert.equal(issuesOf('Rarely we see such a clear result.')[0].ex, 'Rarely do we see …');
  assert.equal(issuesOf('Never I have seen this before.')[0].ex, 'Never have I …');
  clean('Rarely do we see such a clear result. Never have I seen this. Never mind. Only then did we understand.');
  assert.ok(!flags('Rarely we see such a clear result.', { level: 'A2' }).length, 'not run below B1');
});

test('RW-2: a question in statement order', () => {
  flagged('Why we should pay for this?', 'Why we should');
  flagged('Where you went yesterday?', 'Where you went');
  assert.equal(issuesOf('Why we should pay for this?')[0].ex, 'Why should we …?');
  assert.equal(issuesOf('Where you went yesterday?')[0].ex, 'Where did you …?');
  assert.equal(issuesOf('Okafor has found in 2021 that it helps.')[0].ex, 'found in 2021');
  clean('Why should we pay for this? I asked why we should pay. Why we should pay is clear. How do you know?');
});

test('RW-2: a missing a / an before an adjective and a singular noun, a job or a request', () => {
  flagged('It is very important thing for teenagers.', 'very important thing');
  flagged('This paper offers new reading of the evidence.', 'new reading');
  flagged('Last year I was volunteer in a hospital.', 'I was volunteer');
  flagged('I am student.', 'I am student');
  flagged('I have reservation.', 'I have reservation');
  flagged('I want room, please.', 'I want room');
  assert.equal(issuesOf('It is very important thing.')[0].ex, 'a very important thing');
  assert.equal(issuesOf('It is important thing.')[0].ex, 'an important thing');
  clean('It is an important thing. This is important information. He is a student. We have room for two more people. It is good news. It makes a big difference. We have good reason to believe it. That is clear evidence. It was great fun.');
});

test('RW-2: this / these with the wrong number', () => {
  flagged('This tools are useful.', 'This tools');
  flagged('I like this shoes.', 'this shoes');
  flagged('These kind of problems are common.', 'These kind');
  clean('This shows that it works. This means students learn. This helps us. This process is long. This analysis is clear. This series is good. This works. This bus is late. This boosts sales. These student loans are high. In those days we walked.');
});

test('RW-2: a name in lower case after "my name is" or "I live in"', () => {
  const got = flags('my name is yosef cohen. Y-O-S-E-F, C-O-H-E-N. i live in holon.', { level: 'PreA1' });
  assert.ok(got.includes('yosef cohen') && got.includes('holon'), JSON.stringify(got));
  assert.match(issuesOf('i live in holon.', { level: 'PreA1' }).find((i) => i.match === 'holon').ex, /^Holon$/);
  clean('My name is Yosef. My name is not important. I live in a small flat. I live in peace. I am from here. I come from far away. I live in Holon.', { level: 'A1' });
});

test('RW-2: from stage 8, sweeping claims are highlighted as notes, not errors', () => {
  const a = analyzeWriting('The study proves that green roofs reduce heat in all buildings. Everyone agrees that this is the best solution.', { level: 'C1', stage: 8 });
  const notes = a.issues.filter((i) => i.soft).map((i) => i.match.toLowerCase());
  assert.ok(['proves', 'all', 'everyone'].every((w) => notes.includes(w)), JSON.stringify(notes));
  assert.ok(!analyzeWriting('Everyone agrees.', { level: 'C1', stage: 7 }).issues.some((i) => i.soft), 'no highlighter before stage 8');
  assert.ok(!analyzeWriting('Not all buildings benefit. All in all, it helps. It does not help at all.', { level: 'C1', stage: 9 }).issues.some((i) => i.soft), 'hedged or idiomatic words are not highlighted');
});

test('RW-2: the lesson\'s own "by the time" sentence is not a run-on; a leading coordinator is skipped', () => {
  clean('But by the time the meeting started, I had written down every step.', { level: 'B2' });
  clean('By the time we arrived, it was late. And when it rained, we stayed in.', { level: 'B2' });
  assert.ok(types('The plan is simple, it is cheap.', { level: 'B2' }).includes('punctuation'), 'a real comma splice is still flagged');
});

test('RW-2: the we-06 sample text (B1) flags at least 10 of its 14 errors, and nothing else', () => {
  const text = 'Volunteering give young people a chance to grow. I think every school need a volunteering program for teenagers. Last year I was volunteer in a old people\'s home near my house. The old people was very kind to me, and I learned alot from them about life and about patience. It is very important thing for teenagers, because they dont know much about the real world. Volunteering is also more better than sitting at home with a phone all day. In the other hand, some students say that they need the time for find a job and earn money. I am agree that money is important, but volunteering can improve there CV and help them later. I worked there one hour in week, and it was enough for me. I hope that more schools will try it next year.';
  const errors = ['volunteering give', 'every school need', 'I was volunteer', 'a old', 'people was', 'alot', 'very important thing', 'dont', 'more better', 'In the other hand', 'for find', 'I am agree', 'there CV', 'one hour in week'];
  const same = (m, e) => m.includes(e.toLowerCase()) || e.toLowerCase().includes(m);
  const got = issuesOf(text, { level: 'B1' }).map((i) => i.match.toLowerCase());
  const found = errors.filter((e) => got.some((m) => same(m, e)));
  assert.ok(found.length >= 10, `only ${found.length} of 14: ${found}`);
  assert.deepEqual(got.filter((m) => !errors.some((e) => same(m, e))), [], 'flags that are not errors');
});

test('RW-2: the summary counts failed checks with the issues and never says "no problems"', () => {
  const a = analyzeWriting('This is short.', { level: 'C1', minWords: 300, maxWords: 400 });
  const s = checkSummary(a, { minWords: 300, maxWords: 400 });
  assert.equal(s.n, 1);
  assert.match(s.he, /חסרות 297 מילים/);
  assert.match(s.en, /297 words short/);
  assert.match(s.head_he, /^מצאנו דבר אחד מהדברים שאנחנו בודקים/);
  assert.ok(!/בעיות/.test(`${s.he} ${s.head_he}`), 'says "problems"');
  const ok = checkSummary(analyzeWriting('I study at a university. It took an hour.', { level: 'B1' }));
  assert.equal(ok.n, 0);
  assert.match(ok.head_he, /לא מצאנו אף אחד מהדברים שאנחנו בודקים/);
  const many = checkSummary(analyzeWriting('i dont know alot. He work here', { level: 'B1', minWords: 10 }), { minWords: 10 });
  assert.ok(many.n >= 5 && /ועוד \d+/.test(many.he), many.he);
});

test('RW-2: l1Issues runs only the Hebrew-speaker rules on a short reply', () => {
  const got = l1Issues('Hi, I am Miri. I am agree to work with you. Nice to know you.', { level: 'A2' }).map((i) => i.match);
  assert.ok(got.some((m) => /am agree/i.test(m)), JSON.stringify(got));
  assert.deepEqual(l1Issues('Sure, I will send it by Thursday', { level: 'B2' }), [], 'no punctuation or capital checks on a reply');
});

// ---------- RW-6: source-based tasks ----------
const wa05 = JSON.parse(readFileSync(new URL('../../content/writing/assignments.json', import.meta.url), 'utf8')).assignments.find((a) => a.id === 'wa-05').source_pack;

test('RW-6: each source is known by its label, author, year and the words that identify it', () => {
  assert.deepEqual(parseSources(wa05).map((s) => [s.label, s.name, s.keys.join('/')]), [
    ['Source A', 'Halvarden City Planning Office (2025)', 'City/Planning/Office'],
    ['Source B', 'Dana Merrow (2025)', 'Merrow'],
    ['Source C', "Halvarden Residents' Panel (2025)", 'Residents/Panel'],
  ]);
});

test('RW-6: copied sentences name their source; citations are listed against the pack; citations count as evidence', () => {
  const draft = "Halvarden's population has grown faster than its housing supply for ten years, and average rents have risen faster than average incomes over the same period. The office estimates that it could provide about 900 homes, 40% of them at rents below the market rate.\n\nI think the city should build on the northern edge. Merrow (2025) argues that the park will disappear. The survey shows that 58% opposed building (Halvarden Residents' Panel, 2025).";
  const a = analyzeWriting(draft, { level: 'C1', stage: 8, sources: wa05 });
  const copied = a.issues.filter((i) => i.type === 'source');
  assert.equal(copied.length, 2);
  assert.ok(copied.every((i) => /למקור A: צטטו וציינו מקור, או נסחו מחדש/.test(i.he) && i.source === 'Source A'), JSON.stringify(copied));
  assert.deepEqual(a.sources.cited.map((c) => c.name), ['Dana Merrow (2025)', "Halvarden Residents' Panel (2025)"]);
  assert.deepEqual(a.sources.uncited.map((c) => c.name), ['Halvarden City Planning Office (2025)']);
  assert.equal(a.structureMatch.evidence, 'Merrow (2025)');
  assert.equal(a.structureMatch.counter, 'Merrow (2025) argues', 'an attributed position counts as a counterargument');
  assert.equal(a.structureMatch.thesis, 'I think');
  assert.ok(checkSummary(a).n >= 2, 'copied passages count in the summary');
});

test('RW-6: a quoted and cited passage is not flagged; a paraphrase is not flagged', () => {
  const quoted = 'The city report says that "the rest of the park, including the lake, the woodland and the sports pitches, would be protected" (Halvarden City Planning Office, 2025).';
  const a = analyzeWriting(quoted, { level: 'C1', sources: wa05 });
  assert.deepEqual(a.issues.filter((i) => i.type === 'source'), []);
  assert.deepEqual(a.sources.cited.map((c) => c.label), ['Source A']);
  const para = 'For ten years the number of people in Halvarden grew more quickly than the number of homes (Halvarden City Planning Office, 2025).';
  assert.deepEqual(analyzeWriting(para, { level: 'C1', sources: wa05 }).issues.filter((i) => i.type === 'source'), []);
  assert.equal(analyzeWriting('Ferrant and Oyelaran (2024) suggest that roofs help.', { level: 'C1' }).structure.evidence, true, 'author-year citation is evidence');
  assert.equal(analyzeWriting('A plain text with no sources.', { level: 'C1' }).sources, null);
});

// ---------- RW-8: email mode ----------
test('RW-8: an email is checked for a greeting, one clear request and a sign-off, with no length or connector demands', () => {
  const ok = 'Hi Tom,\nCould you send me the sales figures by Friday? I need them for the report.\n\nThanks,\nYael';
  const a = analyzeWriting(ok, { level: 'B1', kind: 'email' });
  assert.deepEqual(a.checks.filter((c) => !c.ok).map((c) => c.id), [], JSON.stringify(a.checks));
  assert.ok(['greeting', 'request', 'signoff'].every((id) => a.checks.some((c) => c.id === id)));
  assert.ok(countWords(ok) < 30 && !a.checks.some((c) => c.id === 'length'), 'no word floor without minWords');
  const noSign = analyzeWriting('Hi Tom,\nCould you send me the sales figures by Friday? I need them for the report.', { level: 'B1', kind: 'email' });
  assert.equal(noSign.checks.find((c) => c.id === 'signoff').ok, false);
  const noAsk = analyzeWriting('Dear Ms Levi,\nThe report is attached.\n\nBest,\nYael', { level: 'B1', kind: 'email' });
  assert.equal(noAsk.checks.find((c) => c.id === 'request').ok, false);
  assert.equal(noAsk.checks.find((c) => c.id === 'greeting').ok, true);
  assert.ok(!analyzeWriting(ok, { level: 'B1', kind: 'message' }).checks.some((c) => c.id === 'signoff'), 'a message has no email structure checks');
  assert.ok(analyzeWriting('Hi James,\nI will be happy if we can move the deadline. I will send the first part until Wednesday.\n\nBest,\nYael', { level: 'B1', kind: 'email' }).issues.filter((i) => i.l1).length >= 2, 'the email rules from RW-2 run');
});
