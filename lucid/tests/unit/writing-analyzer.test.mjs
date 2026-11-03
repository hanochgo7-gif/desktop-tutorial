import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWriting, checkSummary, l1Issues, parseSources, fullForm } from '../../js/core/writing-analyzer.js';
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
  const essay = 'This essay argues that cities should invest in public transport.\n\nFor example, research shows that buses reduce traffic. However, critics argue that it\'s too expensive. This view overlooks the cost of traffic.\n\nIn conclusion, the benefits are greater.';
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

test('RW-2: a family or people noun with a base verb, and people + verb with -s', () => {
  flagged('My brother live in Haifa.', 'my brother live');
  flagged('My sister work in a bank.', 'my sister work');
  flagged('My cousin live in Canada.', 'my cousin live');
  flagged('My friend think it is good.', 'my friend think');
  flagged('Some people says that it is bad.', 'people says');
  assert.equal(issuesOf('My cousin live in Canada.')[0].ex, 'My cousin lives');
  assert.equal(issuesOf('Some people says that it is bad.')[0].ex, 'people say');
  clean('My brother lives in Haifa. Does my sister need it? Let my sister go. I saw my dad leave. My brother and I live here. Dana and my cousin live here. My family live in Haifa. People say it is fine.');
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
  assert.match(s.head_he, /^יש דבר אחד לבדוק/);
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
  // The evidence words count at the start of a sentence too, where they have a capital.
  assert.equal(analyzeWriting('I think phones help. For example, my cousin calls me every day.', { level: 'B1' }).structureMatch.evidence, 'For example');
  assert.equal(analyzeWriting('Research shows that phones help.', { level: 'B1' }).structure.evidence, true, 'Research at the start of a sentence');
  assert.equal(analyzeWriting('Studies show that phones help.', { level: 'B1' }).structure.evidence, true, 'Studies at the start of a sentence');
  assert.equal(analyzeWriting('Phones help people. They are useful.', { level: 'B1' }).structure.evidence, false, 'no evidence words, no citation');
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

// RW-12: a contraction in formal writing gets its own full form ("cannot", not a general example).
test('RW-12: the full form for each flagged contraction', () => {
  assert.equal(fullForm("can't"), 'cannot');
  assert.equal(fullForm("Won't"), 'Will not');
  assert.equal(fullForm("I'm"), 'I am');
  const i = analyzeWriting("This essay argues that we can't wait.", { level: 'C1' }).issues.find((x) => x.type === 'register' && /can't/.test(x.match));
  assert.equal(i.ex, 'cannot');
});

// ---------- r4 RW-1: the errors Lucid's own lessons teach ----------
// teacher-bagrut's a2-05 e15 text (irregular verbs) and teacher-academic's probe sentences.
const A205 = 'Last weekend I goed to Haifa with my family. We eated falafel in the market and we see a big ship. My brother buyed a new shoes. In the evening we was very tired, so we sleeped early. It was a amazing day.';
const ACADEMIC = 'Many universities use this tools in the classroom. The results was clear. Researches show that phones distract students. The number of students increase every year. It is depend on the teacher. Since the course is online, so students can study at home.';

test('RW-1: the a2-05 panel text flags goed, eated, buyed, sleeped, "we was" and "a new shoes"', () => {
  const got = flags(A205, { level: 'A2' }).map((m) => m.toLowerCase());
  for (const want of ['goed', 'eated', 'buyed', 'sleeped', 'we was', 'a new shoes']) assert.ok(got.includes(want), `${want}: ${JSON.stringify(got)}`);
  const ex = Object.fromEntries(issuesOf(A205, { level: 'A2' }).map((i) => [i.match.toLowerCase(), i.ex]));
  assert.equal(ex.goed, 'went');
  assert.equal(ex.sleeped, 'slept');
  assert.equal(ex['we was'], 'we were');
  assert.equal(ex['a new shoes'], 'new shoes');
});

test('RW-1: the academic fixture flags this tools, results was, Researches, the number of … increase, It is depend and Since … , so', () => {
  const got = flags(ACADEMIC, { level: 'B2' }).map((m) => m.toLowerCase());
  for (const want of ['this tools', 'results was', 'researches', 'the number of students increase', 'it is depend', 'since …, so']) assert.ok(got.includes(want), `${want}: ${JSON.stringify(got)}`);
  const ex = Object.fromEntries(issuesOf(ACADEMIC, { level: 'B2' }).map((i) => [i.match.toLowerCase(), i.ex]));
  assert.equal(ex['the number of students increase'], 'The number of students increases');
  assert.equal(ex['it is depend'], 'It depends');
  assert.equal(ex['results was'], 'results were');
});

test('RW-1: the new rules leave correct English alone', () => {
  clean('I needed help. We visited Rome and opened a shop. The seed grew. A four-leaved clover. He singed his hair. The site was sited well.', { level: 'A2' });
  clean('Thank you was all she said. One of my friends was late. Each of the students was ready. What surprised the researchers was the speed. The paragraph about the protesters was long. The news was good. The bus was late. My boss was kind. The Olympics was great.', { level: 'B1' });
  clean('It was a great success. She runs a small business. We had a good time. It was a short limitations section. A big crisis came. It is a new series. They wore a new pair of shoes.', { level: 'B1' });
  clean('The number of students has increased. A number of students are here. The number of students is growing. The number of cars on the road rises every year.', { level: 'B2' });
  clean('She researches the topic every day. Research shows that it works. Studies show that it works.', { level: 'B2' });
  clean('This results in higher costs. This refers to the past. This sits on the table. This relies on data. This consists of three parts. This works in practice.', { level: 'B2' });
  clean('It is dependent on the weather. That is mean. It is like a dream. It is work, not fun. It is need-based.', { level: 'B1' });
  clean('Because it was late, we left. It was late, so we left. Since 2020, so many people have moved. I stayed because it rained, so I missed the bus.', { level: 'B1' });
  clean('Although the flat is small, it is the best we have seen. However strong the objection may be, it does not apply.', { level: 'C1' });
});

test('RW-1: a soft comma-splice note from B2, and the lesson topic orders the summary', () => {
  const sp = 'This is a serious concern, a student who copies does not practise.';
  assert.ok(issuesOf(sp, { level: 'B2' }).some((i) => i.type === 'punctuation' && i.soft), 'a note at B2');
  assert.ok(issuesOf(sp, { level: 'C1' }).some((i) => i.type === 'punctuation' && i.soft), 'a note, not an error, at C1');
  assert.ok(!issuesOf(sp, { level: 'B1' }).some((i) => i.soft), 'not below B2');
  const plain = analyzeWriting('It was a amazing day. We goed home.', { level: 'A2' });
  assert.equal(plain.issues[0].match, 'a amazing');
  const topic = analyzeWriting('It was a amazing day. We goed home.', { level: 'A2', topic: ['past-simple-irregular'] });
  assert.equal(topic.issues[0].match, 'goed');
  assert.equal(topic.issues[0].topic, true);
  assert.ok(checkSummary(topic).he.split(':')[1].trim().startsWith('עבר של פועל חריג'), checkSummary(topic).he);
});

// ---------- r4 RW-3: argument signals and fewer false alarms ----------
test('RW-3: from stage 8 a bare "research" is a soft note, not evidence; a citation or a figure is evidence', () => {
  const bare = analyzeWriting('Everyone agrees that teenagers are harmed. The research proves it.', { level: 'C1', stage: 8 });
  assert.equal(bare.structure.evidence, false);
  assert.equal(bare.issues.filter((i) => i.he_title === 'מוזכר מחקר, בלי מקור').length, 1);
  assert.equal(analyzeWriting('The survey shows that people agree.', { level: 'C1', stage: 8 }).structure.evidence, false, 'a bare survey');
  const cited = analyzeWriting('Merrow (2025) found that 40% of residents agree.', { level: 'C1', stage: 8 });
  assert.equal(cited.structure.evidence, true);
  assert.ok(!cited.issues.some((i) => i.type === 'evidence'));
  assert.equal(analyzeWriting('According to the City Office, rents rose.', { level: 'C1', stage: 8 }).structure.evidence, true, 'an attributed source');
  assert.equal(analyzeWriting('Rents rose by 12% in a year.', { level: 'C1', stage: 8 }).structure.evidence, true, 'a figure');
  assert.equal(analyzeWriting('Research shows that phones help.', { level: 'B1' }).structure.evidence, true, 'before stage 8 nothing changes');
});

test('RW-3: "However" alone is not a rebuttal; a counter-move after it is', () => {
  assert.equal(analyzeWriting("However, Merrow's strongest point is the loss of green space.", { level: 'C1', stage: 8 }).structure.rebuttal, false);
  assert.equal(analyzeWriting('However, this view overlooks the housing shortage.', { level: 'C1', stage: 8 }).structure.rebuttal, true);
  assert.equal(analyzeWriting("However, the park is not lost: only a corner is built on.", { level: 'C1' }).structure.rebuttal, true);
  assert.equal(analyzeWriting('Nevertheless, the plan protects the lake.', { level: 'C1' }).structure.rebuttal, true);
});

test('RW-3: time phrases, "nothing" as an object and methods sentences are not sweeping claims', () => {
  const claims = (t) => analyzeWriting(t, { level: 'C1', stage: 8 }).issues.filter((i) => i.type === 'claim').map((i) => i.match);
  assert.deepEqual(claims('The number of students rises every year. Every year more students apply. He learns nothing. All participants completed every task. We met all day.'), []);
  assert.deepEqual(claims('Everyone agrees. Nothing works. All buildings benefit.'), ['Everyone', 'Nothing', 'All']);
});

test('RW-3: a place name from the source is not flagged as copying', () => {
  const draft = 'I think the city should build on the northern edge of Orrin Fields.';
  assert.deepEqual(analyzeWriting(draft, { level: 'C1', stage: 8, sources: wa05 }).issues.filter((i) => i.type === 'source'), []);
  assert.equal(analyzeWriting('The office estimates that it could provide about 900 homes.', { level: 'C1', sources: wa05 }).issues.filter((i) => i.type === 'source').length, 1, 'a copied sentence still is');
});

// ---------- r4 RW-4: email and own-words checks ----------
test('RW-4: until for a deadline anywhere in the clause; a negative in an email gets a soft note; Please advise', () => {
  const email = 'Hi James,\nI will send you the first part, with the competitors analysis, until Wednesday. I can\'t finish the report until Thursday. Please advise.\n\nBest,\nYael';
  const a = analyzeWriting(email, { level: 'B1', kind: 'email' });
  assert.ok(a.issues.some((i) => i.match === 'until Wednesday' && !i.soft), JSON.stringify(a.issues.map((i) => i.match)));
  const thu = a.issues.filter((i) => i.match === 'until Thursday');
  assert.equal(thu.length, 1);
  assert.ok(thu[0].soft && /אם הכוונה למועד אחרון, כותבים by/.test(thu[0].he));
  assert.ok(a.issues.some((i) => i.match === 'Please advise' && i.soft));
  assert.ok(!analyzeWriting("I can't finish the report until Thursday.", { level: 'B1' }).issues.length, 'not outside an email');
  clean('I sent it and waited until Friday. We will stay until the evening. The shop is open until today.');
  flagged('Please fix the bug until the evening.', 'until the evening');
});

test('RW-4: a job after modifiers, suggest to, a past time with a present verb, and the app + bare verb', () => {
  flagged('I am QA engineer.', 'I am QA engineer');
  flagged("I'm senior software developer.", "I'm senior software developer");
  assert.equal(issuesOf('I am QA engineer.')[0].ex, 'I am a QA engineer');
  flagged('I suggest to wait.', 'suggest to wait');
  assert.match(issuesOf('I suggest to wait.')[0].ex, /^suggest waiting/);
  flagged('Yesterday I finish the report.', 'I finish');
  assert.equal(issuesOf('Yesterday I finish the report.')[0].ex, 'I finished');
  flagged('Last week she go to Eilat.', 'she go');
  flagged('Yesterday the app crash.', 'the app crash');
  assert.equal(issuesOf('Yesterday the app crash.').find((i) => /app/.test(i.match)).ex, 'the app crashed');
  assert.equal(issuesOf('The app crash every day.')[0].ex, 'The app crashes');
  clean('I am a QA engineer. I am not a student. I am also proud. He is a senior developer. I suggest waiting. I suggested to him that we wait. Yesterday I learned that they live in Haifa. Last week, at work, she started early. Yesterday I finished it. The app crashes a lot. Did the app crash? I saw the app crash. The app crash report is long.');
});

test('RW-4: the cards name countable nouns without the word "ספיר"', () => {
  const all = [...issuesOf('I have reservation. I need informations. It is important thing.'), ...issuesOf('I am student.')];
  assert.ok(all.length >= 3);
  assert.ok(all.every((i) => !/ספיר/.test(`${i.he} ${i.he_title}`)), JSON.stringify(all.map((i) => i.he)));
  assert.ok(all.some((i) => /שם עצם שאפשר לספור \(a car, a job\)/.test(i.he)));
});

// ---------- r4 RW-2: the summary adds up and reads well in Hebrew ----------
test('RW-2: n is the number of listed items, and "ועוד" counts from the same list', () => {
  const t = 'I am agree. I need informations. This is more better. It depends in the weather. We discussed about it. He work here. I dont know. You should to go. I goed home. We was tired. I am student.';
  const s = checkSummary(analyzeWriting(t, { level: 'B1', minWords: 300 }), { minWords: 300 });
  assert.equal(s.items.length, 12);
  assert.equal(s.n, 12);
  assert.match(s.head_he, /^יש 12/);
  assert.match(s.he, /ועוד 9\./);
  assert.match(s.en, /and 9 more/);
  const one = checkSummary(analyzeWriting('I study at a university. It took an hour.', { level: 'B1', minWords: 20 }), { minWords: 20 });
  assert.equal(one.head_he, 'יש דבר אחד לבדוק');
});

test('RW-2: sweeping words, research notes and uncited sources are counted as items', () => {
  const a = analyzeWriting('Everyone agrees that it is bad. The research proves it.', { level: 'C1', stage: 8, sources: wa05 });
  const s = checkSummary(a);
  const he = s.items.map((i) => i.he);
  assert.ok(he.includes('2 מילים גורפות'), JSON.stringify(he));
  assert.ok(he.includes('מוזכר מחקר, בלי מקור'), JSON.stringify(he));
  assert.ok(he.includes('3 מקורות שלא צוטטו'), JSON.stringify(he));
  assert.equal(s.n, s.items.length);
});

test('RW-2: one paragraph is "פסקה אחת", and the repeated opening uses Hebrew quotes', () => {
  const long = Array.from({ length: 20 }, () => 'Phones help people learn new words every day.').join(' ');
  const p = analyzeWriting(long, { level: 'B1' }).checks.find((c) => c.id === 'paragraphs');
  assert.match(p.he, /^פסקה אחת \(כדאי 3 לפחות\)/);
  assert.match(p.en, /^1 paragraph \(/);
  const rep = analyzeWriting('Research shows it. Research says it. Research proves it. Research finds it.', { level: 'B1' }).issues.find((i) => i.type === 'cohesion');
  assert.match(rep.he, /4 משפטים מתחילים ב-״research״/);
});
