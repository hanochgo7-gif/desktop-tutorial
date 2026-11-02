// Answer checking for typed and spoken answers.
// Learners are not punished for case, spacing, final punctuation, apostrophe style or
// contractions (don't = do not). A single-letter slip in a longer word counts as correct with a
// spelling note; a different word never does.

const CONTRACTIONS = [
  [/\bcan't\b/g, ['cannot', 'can not']],
  [/\bwon't\b/g, ['will not']],
  [/\bshan't\b/g, ['shall not']],
  [/\blet's\b/g, ['let us']],
  [/\bain't\b/g, ['is not', 'am not', 'are not']],
  [/\b(\w+)n't\b/g, (m, w) => [`${w} not`]],
  [/\b(i)'m\b/g, (m, w) => [`${w} am`]],
  [/\b(\w+)'re\b/g, (m, w) => [`${w} are`]],
  [/\b(\w+)'ve\b/g, (m, w) => [`${w} have`]],
  [/\b(\w+)'ll\b/g, (m, w) => [`${w} will`]],
  [/\b(\w+)'d\b/g, (m, w) => [`${w} would`, `${w} had`]],
  // 's after pronouns and question words is is/has; after nouns it is usually possessive.
  [/\b(he|she|it|that|there|here|what|who|where|when|how|everyone|everything|nobody|someone|something)'s\b/g, (m, w) => [`${w} is`, `${w} has`]],
];

export function normalize(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/^["'\s]+|["'\s.!?,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// US and UK spellings are both right (P1 EX-7): each word is read in one spelling (the US one) before answers
// are compared. Word pairs, -our/-or, -re/-er, -ise/-ize (-yse/-yze) on the stems that have both, and the
// doubled l of travelled/traveled.
const US_UK = new Map([['mum', 'mom'], ['mums', 'moms'], ['grey', 'gray'], ['programme', 'program'], ['programmes', 'programs'],
  ['practise', 'practice'], ['practised', 'practiced'], ['practising', 'practicing'], ['licence', 'license'], ['defence', 'defense'], ['offence', 'offense'],
  ['catalogue', 'catalog'], ['enrol', 'enroll'], ['fulfil', 'fulfill'], ['skilful', 'skillful'], ['jewellery', 'jewelry'], ['mould', 'mold'], ['cheque', 'check']]);
const OUR_KEEP = new Set(['four', 'hour', 'your', 'tour', 'pour', 'flour', 'sour', 'devour', 'detour', 'contour', 'amour', 'dour', 'scour']);
const RE_STEMS = /^(cent|theat|met|lit|fib|kilomet|centimet|millimet|somb|meag|calib|spect|lust)re(s|d)?$/;
const ISE_KEEP = new Set(['advise', 'advertise', 'compromise', 'exercise', 'surprise', 'supervise', 'revise', 'televise', 'improvise', 'despise', 'devise', 'disguise', 'enterprise', 'merchandise', 'premise', 'promise', 'expertise', 'franchise', 'otherwise', 'likewise', 'clockwise', 'noise', 'raise', 'praise', 'poise', 'concise', 'precise', 'paradise', 'rise', 'arise', 'wise', 'demise', 'chastise', 'excise', 'incise', 'treatise', 'mortise', 'reprise', 'comprise', 'apprise', 'circumcise', 'tortoise', 'porpoise', 'turquoise', 'cruise', 'bruise', 'guise', 'anise']);
const LL_STEMS = /^(travel|cancel|model|label|level|signal|fuel|dial|counsel|marvel|quarrel|total|channel|tunnel|jewel|equal|label|panel|pedal|rival|shovel|snorkel|tunnel)l(ed|ing|er|ers)$/;
export function usSpelling(w) {
  if (US_UK.has(w)) return US_UK.get(w);
  let m = /^(\w+?)our(s|ed|ing|ite|ites|able|ably|ful|fully|less|er|ers|hood)?$/.exec(w);
  if (m && w.length >= 5 && !OUR_KEEP.has(`${m[1]}our`)) return `${m[1]}or${m[2] || ''}`;
  m = RE_STEMS.exec(w);
  if (m) return `${m[1]}er${m[2] || ''}`;
  m = /^(\w{3,})(is|ys)(e|es|ed|ing|ation|ations|er|ers)$/.exec(w);
  if (m && !ISE_KEEP.has(`${m[1]}${m[2]}e`)) return `${m[1]}${m[2] === 'is' ? 'iz' : 'yz'}${m[3]}`;
  m = LL_STEMS.exec(w);
  if (m) return `${m[1]}${m[2]}`;
  return w;
}
const usSentence = (s) => s.replace(/[a-z]+/g, usSpelling);

// All full-form readings of a normalised string (bounded, so pathological input stays cheap).
export function variants(s, limit = 16) {
  let out = new Set([usSentence(normalize(s))]);
  for (const [re, rep] of CONTRACTIONS) {
    const options = (m, ...groups) => (typeof rep === 'function' ? rep(m, ...groups) : rep);
    const next = new Set();
    for (const v of out) {
      const first = new RegExp(re.source).exec(v);
      if (!first) { next.add(v); continue; }
      // The i-th reading is applied to every occurrence (bounded, and good enough for one sentence).
      const n = options(...first).length;
      for (let i = 0; i < n; i++) {
        next.add(v.replace(new RegExp(re.source, 'g'), (...args) => {
          const o = options(...args.slice(0, -2));
          return o[Math.min(i, o.length - 1)];
        }));
      }
    }
    out = new Set([...next].slice(0, limit));
  }
  return [...out].map((v) => v.replace(/\s+/g, ' ').trim());
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

const words = (s) => normalize(s).replace(/[,.!?;:"]/g, ' ').split(/\s+/).filter(Boolean);

// One word differs by one edit (insert/delete/substitute/transposition), and that word has 5+ letters; or by
// two edits in a word of 6+ letters.
// A slip inside an inflectional ending (wants/want, swimming/swiming, studied/studyed) is a grammar or
// spelling-rule error that lessons teach, so it is never forgiven as a typo.
const ENDINGS = ['ing', 'ied', 'ies', 'ed', 'es', 's'];
function inInflection(typed, expected) {
  const end = ENDINGS.find((e) => expected.endsWith(e) && expected.length > e.length + 2);
  if (!end) return false;
  let i = 0;
  while (i < typed.length && i < expected.length && typed[i] === expected[i]) i++;
  return i >= expected.length - end.length - 1;
}

function typoOnly(input, target) {
  const a = words(input), b = words(target);
  if (a.length !== b.length) return null;
  let diff = null;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (diff) return null;
    diff = { typed: a[i], expected: b[i] };
  }
  if (!diff || diff.expected.length < 5) return null;
  if (inInflection(diff.typed, diff.expected)) return null;
  const d = levenshtein(diff.typed, diff.expected);
  const transposition = d === 2 && diff.typed.length === diff.expected.length &&
    [...diff.typed].sort().join('') === [...diff.expected].sort().join('');
  // Words of 6+ letters forgive two slips (P1 EX-7: "dubble" for "double", "beutifull", typical phonetic
  // spellings) when the length is about right; two extra letters ("allwayss") are not a slip.
  return d === 1 || transposition || (d === 2 && diff.expected.length >= 6 && Math.abs(diff.typed.length - diff.expected.length) <= 1) ? diff : null;
}

// Returns { correct, almost, matched, typo? }. almost=true means accepted with a spelling note.
// `known` is the exercise's wrong_feedback list: an answer that exactly matches an authored wrong answer
// is wrong even if it is one letter away from a key (so "fourty" cannot pass as a typo of "forty").
export function checkTyped(input, accepted, known = null) {
  const list = (Array.isArray(accepted) ? accepted : [accepted]).filter((x) => x != null);
  if (!normalize(input)) return { correct: false, almost: false, matched: null };
  const inV = variants(input);
  for (const a of list) {
    const aV = variants(a);
    if (inV.some((v) => aV.includes(v))) return { correct: true, almost: false, matched: a };
  }
  if (Array.isArray(known) && known.some((f) => variants(f.match).some((v) => inV.includes(v)))) return { correct: false, almost: false, matched: null };
  for (const a of list) {
    for (const v of inV) for (const t of variants(a)) {
      const typo = typoOnly(v, t);
      if (typo) return { correct: true, almost: true, matched: a, typo };
    }
  }
  return { correct: false, almost: false, matched: null };
}

// Find authored feedback for a known wrong answer: exact (normalised) match first, then a
// single-word match appearing as a word in the answer.
export function findWrongFeedback(input, list) {
  if (!Array.isArray(list)) return null;
  const inV = variants(input);
  for (const f of list) if (variants(f.match).some((v) => inV.includes(v))) return f;
  const inWords = new Set(words(input));
  for (const f of list) {
    const w = words(f.match);
    if (w.length === 1 && inWords.has(w[0])) return f;
  }
  return null;
}

// ---------- open rewrites: could an unlisted answer be right? ----------
// From B1 a rewrite has many right answers, so an answer the key does not list may be counted by the learner
// ("My answer is also correct"). That offer is only made when the answer could be right (P1 EX-5): it is not
// the source left as it was (plus a stray letter), it is not an authored wrong answer, it has no "did/does +
// past form", it keeps the key's main verb form, and at least 60% of its words are the key's words.
const fullWords = (s) => (variants(s)[0] || '').replace(/[,.!?;:"()]/g, ' ').split(/\s+/).filter(Boolean);
const LATIN = /[a-z]/;
const AUX = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must']);
// Simple-past forms that are not also base forms (so "did went" is caught but "did put" is not).
const PAST = new Set(['went', 'saw', 'took', 'got', 'came', 'ate', 'gave', 'knew', 'wrote', 'spoke', 'broke', 'chose', 'drove', 'began', 'drank', 'swam', 'sang', 'ran', 'thought', 'bought', 'brought', 'taught', 'caught', 'found', 'left', 'felt', 'kept', 'slept', 'met', 'sent', 'spent', 'built', 'lost', 'paid', 'said', 'told', 'sold', 'stood', 'heard', 'held', 'meant', 'made', 'had', 'was', 'were', 'did', 'flew', 'grew', 'drew', 'threw', 'wore', 'won', 'forgot', 'understood', 'became']);
const PARTICIPLE = new Set(['been', 'gone', 'seen', 'taken', 'gotten', 'eaten', 'given', 'known', 'written', 'spoken', 'broken', 'chosen', 'driven', 'begun', 'drunk', 'swum', 'sung', 'done', 'flown', 'grown', 'drawn', 'thrown', 'worn', 'forgotten', 'fallen', 'hidden', 'ridden', 'risen', 'shown', 'stolen']);
const PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
const BASE_ED = new Set(['shed', 'bed', 'wed', 'embed', 'red', 'bred', 'fled']);
const pastForm = (w) => PAST.has(w) || (w.length > 3 && w.endsWith('ed') && !w.endsWith('eed') && !BASE_ED.has(w));
const verbish = (w) => AUX.has(w) || PAST.has(w) || PARTICIPLE.has(w) || (w.length > 4 && /(ed|en|ing)$/.test(w));

// Indices of a and b that a longest common subsequence pairs up.
function lcsIndex(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ia = new Set(), ib = new Set();
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { ia.add(i); ib.add(j); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return { ia, ib };
}

// "did lived", "does goes", "Did you saw …": did/does/do (+ not) (+ a pronoun) + a past form.
export function didPlusPast(text) {
  const w = fullWords(text);
  for (let i = 0; i < w.length - 1; i++) {
    if (!['did', 'does', 'do'].includes(w[i])) continue;
    let j = i + 1;
    if (w[j] === 'not') j++;
    if (PRONOUNS.has(w[j])) j++;
    if (w[j] && pastForm(w[j]) && w[j] !== 'did') return true;
  }
  return false;
}

// Words with their punctuation marks as tokens of their own, for fixes that are only punctuation.
const markedWords = (s) => (variants(s)[0] || '').replace(/([,.!?;:])/g, ' $1 ').replace(/["()]/g, ' ').split(/\s+/).filter(Boolean);
// A stray addition: one letter (not "a" or "I"), a run with no vowel ("x", "zzz", "sdf"), or a mark.
const junk = (w) => (w.length === 1 && !['a', 'i'].includes(w)) || !/[aeiouy]/.test(w);

// The answer is the source left as it was: every source word still there, in order, with nothing added but
// stray letters. When a key differs from the source only in punctuation, the marks count as words.
export function sameAsSource(answer, source, keys) {
  if (normalize(answer) === normalize(source)) return true;
  if (!fullWords(source).some((x) => LATIN.test(x))) return false;
  const punctFix = keys.some((k) => fullWords(k).join(' ') === fullWords(source).join(' '));
  const tok = punctFix ? markedWords : fullWords;
  const src = tok(source), ans = tok(answer);
  const { ia, ib } = lcsIndex(src, ans);
  return ia.size === src.length && ans.every((x, j) => ib.has(j) || junk(x));
}

// The verb forms a key brings in: the verb-like words it adds to the source (every verb-like word of the key
// when the source is Hebrew), e.g. "have" and "lived" in "I have lived …" for "I live …".
export function keyVerbForms(source, key) {
  const src = fullWords(source || '');
  const kw = fullWords(key);
  const { ib } = src.some((x) => LATIN.test(x)) ? lcsIndex(src, kw) : { ib: new Set() };
  return kw.filter((x, j) => !ib.has(j) && verbish(x));
}
// The answer keeps the key's verb form: it has a verb form one of the keys brings in, or its verb forms are not
// the source's any more (changed, added or removed: "was held" for "took place", one hedge instead of three).
// A key that brings in no verb asks for nothing here, and neither does a translation from Hebrew.
export function keepsVerbForm(answer, source, keys) {
  const srcWords = fullWords(source || '');
  if (!srcWords.some((x) => LATIN.test(x))) return true;
  const forms = keys.map((k) => keyVerbForms(source, k));
  if (forms.some((f) => !f.length)) return true;
  const ans = fullWords(answer);
  if (forms.some((f) => f.some((v) => ans.includes(v)))) return true;
  return ans.filter(verbish).join(' ') !== srcWords.filter(verbish).join(' ');
}

// { ok, reason, feedback }: reason is 'unchanged', 'known' (an authored wrong answer: feedback is its entry),
// 'did-past', 'verb' or 'overlap'.
export function couldBeRight(answer, { source = '', answers = [], wrong_feedback = null } = {}) {
  const keys = (Array.isArray(answers) ? answers : [answers]).filter(Boolean);
  if (!normalize(answer) || !keys.length) return { ok: false, reason: 'unchanged' };
  if (sameAsSource(answer, source, keys)) return { ok: false, reason: 'unchanged' };
  const known = findWrongFeedback(answer, wrong_feedback);
  if (known) return { ok: false, reason: 'known', feedback: known };
  if (didPlusPast(answer)) return { ok: false, reason: 'did-past' };
  const ans = fullWords(answer);
  if (!keepsVerbForm(answer, source, keys)) return { ok: false, reason: 'verb' };
  const overlap = Math.max(...keys.map((k) => { const kw = new Set(fullWords(k)); return ans.filter((x) => kw.has(x)).length / ans.length; }));
  if (overlap < 0.6) return { ok: false, reason: 'overlap' };
  return { ok: true, reason: null };
}

// Word-level alignment for dictation and speech: which target words were produced, in order.
// Returns { accuracy (0-1 of target words matched), words: [{word, ok}] }.
export function wordAccuracy(input, target) {
  const norm = (s) => variants(s)[0].replace(/[,.!?;:"]/g, ' ').split(/\s+/).filter(Boolean);
  const a = norm(input), b = norm(target);
  if (!b.length) return { accuracy: 0, words: [] };
  // LCS table
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  const same = (x, y) => x === y || (y.length >= 5 && levenshtein(x, y) === 1);
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
    dp[i][j] = same(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const ok = new Array(b.length).fill(false);
  const near = new Array(b.length).fill(null); // what was typed for a word found with a slip
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (same(a[i], b[j])) { ok[j] = true; if (a[i] !== b[j]) near[j] = a[i]; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  // Report the target's original words (keeps capitals and apostrophes for display). A contraction on
  // screen ("I'm") stands for its full form ("i am") and counts as found when every part of it was. A word
  // found with a slip also carries what was typed (`typed`), so the slip can be shown letter by letter.
  const accuracy = ok.filter(Boolean).length / b.length;
  const display = String(target).trim().split(/\s+/);
  const parts = display.map((w) => norm(w).length);
  const withTyped = (o, t) => (t ? { ...o, typed: t } : o);
  if (parts.reduce((x, y) => x + y, 0) !== b.length) return { accuracy, words: b.map((w, k) => withTyped({ word: w, ok: ok[k] }, near[k])) };
  let k = 0;
  return { accuracy, words: display.map((w, d) => { const part = ok.slice(k, k + parts[d]); const t = parts[d] === 1 ? near[k] : null; k += parts[d]; return withTyped({ word: w, ok: part.every(Boolean) }, t); }) };
}

// A dictation sentence with one slip of one letter in one word (P1 EX-7: "tenn" for "ten"): every other word
// as in an accepted answer. Returns { typed, expected } or null.
export function oneSlip(input, accepted) {
  const a = (variants(input)[0] || '').replace(/[,.!?;:"]/g, ' ').split(/\s+/).filter(Boolean);
  for (const key of (Array.isArray(accepted) ? accepted : [accepted])) {
    const b = (variants(key)[0] || '').replace(/[,.!?;:"]/g, ' ').split(/\s+/).filter(Boolean);
    if (a.length !== b.length) continue;
    const diffs = a.map((x, k) => [x, b[k]]).filter(([x, y]) => x !== y);
    if (diffs.length === 1 && levenshtein(diffs[0][0], diffs[0][1]) === 1) return { typed: diffs[0][0], expected: diffs[0][1] };
  }
  return null;
}

// A spoken letter code ("B, V, J, E"), compared letter by letter whatever the spacing (P1 EX-7: "BVGE" marks
// only the J). Returns null when the key is not a letter code, else { accuracy, words: [{word, ok, typed}],
// misses: [{typed, expected}] }.
export function letterCode(input, key) {
  if (!/^[A-Za-z](?:[\s,.\-–]+[A-Za-z])+[.!]?$/.test(String(key || '').trim())) return null;
  const want = String(key).replace(/[^A-Za-z]/g, '').split('');
  const got = String(input || '').replace(/[^A-Za-z]/g, '').split('');
  const words = want.map((w, k) => ({ word: w, ok: got[k]?.toUpperCase() === w.toUpperCase(), typed: got[k] ?? null }));
  if (got.length !== want.length) {
    // Letters missing or extra: line them up, so one missing letter does not mark every later one.
    const dp = Array.from({ length: got.length + 1 }, () => new Array(want.length + 1).fill(0));
    for (let i = got.length - 1; i >= 0; i--) for (let j = want.length - 1; j >= 0; j--) dp[i][j] = got[i].toUpperCase() === want[j].toUpperCase() ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    words.forEach((w) => { w.ok = false; w.typed = null; });
    let i = 0, j = 0;
    while (i < got.length && j < want.length) {
      if (got[i].toUpperCase() === want[j].toUpperCase()) { words[j].ok = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
    }
  }
  const misses = words.filter((w) => !w.ok).map((w) => ({ typed: w.typed ? w.typed.toUpperCase() : null, expected: w.word.toUpperCase() }));
  return { accuracy: words.filter((w) => w.ok).length / want.length, words: words.map((w) => ({ ...w, word: w.word.toUpperCase() })), misses };
}

export function countWords(text) {
  const m = String(text ?? '').match(/[A-Za-zÀ-ɏ0-9]+(?:['’-][A-Za-zÀ-ɏ0-9]+)*/g);
  return m ? m.length : 0;
}

// Order exercise: tokens in order, or any accepted sentence.
export function checkOrder(chosen, tokens, answers = []) {
  const sentence = chosen.join(' ');
  if (normalize(sentence) === normalize(tokens.join(' '))) return { correct: true };
  const r = checkTyped(sentence, answers);
  return { correct: r.correct && !r.almost };
}
