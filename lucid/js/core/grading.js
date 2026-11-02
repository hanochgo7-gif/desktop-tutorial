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

// All full-form readings of a normalised string (bounded, so pathological input stays cheap).
export function variants(s, limit = 16) {
  let out = new Set([normalize(s)]);
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

// One word differs by one edit (insert/delete/substitute/transposition), and that word has 5+ letters.
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
  return d === 1 || transposition ? diff : null;
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
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (same(a[i], b[j])) { ok[j] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  // Report the target's original words (keeps capitals and apostrophes for display). A contraction on
  // screen ("I'm") stands for its full form ("i am") and counts as found when every part of it was.
  const accuracy = ok.filter(Boolean).length / b.length;
  const display = String(target).trim().split(/\s+/);
  const parts = display.map((w) => norm(w).length);
  if (parts.reduce((x, y) => x + y, 0) !== b.length) return { accuracy, words: b.map((w, k) => ({ word: w, ok: ok[k] })) };
  let k = 0;
  return { accuracy, words: display.map((w, d) => { const part = ok.slice(k, k + parts[d]); k += parts[d]; return { word: w, ok: part.every(Boolean) }; }) };
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
