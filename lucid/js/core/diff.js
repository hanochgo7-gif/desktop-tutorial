// Draft comparison and span tracking.
// wordDiff: lines and paragraph breaks are kept; sentences are aligned first (LCS over sentences), then each
// run of changed sentences is compared word by word with the run of new sentences that replaced it, so edits
// to neighbouring sentences stay aligned and long essays stay cheap to compare. Added and removed paragraph
// breaks are marked; diffParagraphs splits the result into the newer text's paragraphs, so a long draft can be
// compared paragraph by paragraph.
// trackSpan / fixStatus / locateSpan: follow a quote from an assessed draft into the current text by the
// sentence it was in, so "looks fixed" is judged where the mistake was, not anywhere in the essay.
const BREAK = '\n';
const MAX_CELLS = 250_000; // word-level LCS limit per changed run; above it the run is shown as removed + added

// Units: sentences, plus one '\n' per line break (a blank line between paragraphs gives two).
function units(t) {
  const out = [];
  String(t || '').replace(/\r\n?/g, '\n').split('\n').forEach((line, i) => {
    if (i && out.length && !(out.at(-1) === BREAK && out.at(-2) === BREAK)) out.push(BREAK);
    const s = line.replace(/\s+/g, ' ').trim();
    if (s) out.push(...s.split(/(?<=[.!?]["'”’)]?)\s+/).filter(Boolean));
  });
  while (out.at(-1) === BREAK) out.pop();
  return out;
}
const wordsOf = (run) => run.flatMap((u) => (u === BREAK ? [BREAK] : u.split(' ')));

function lcs(a, b, eq = (x, y) => x === y) {
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (eq(a[i], b[j])) { ops.push(['same', a[i], b[j]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push(['del', a[i++], null]);
    else ops.push(['add', null, b[j++]]);
  }
  while (i < a.length) ops.push(['del', a[i++], null]);
  while (j < b.length) ops.push(['add', null, b[j++]]);
  return ops;
}

// Returns [{type: 'same' | 'add' | 'del' | 'break', text, para?}], adjacent parts of the same type merged.
// 'break' parts hold the new text's line breaks ('\n' or '\n\n'). A paragraph break that was added is a 'break'
// part with para: 'add'; one that was removed is a 'del' part '¶' with para: 'del', so a split or a joined
// paragraph shows as a change (persona panel R2-40).
export function wordDiff(before, after) {
  const out = [];
  const push = (type, text) => {
    let para = null;
    if (text === BREAK) {
      if (type === 'same') type = 'break';
      else { para = type; type = type === 'add' ? 'break' : 'del'; text = type === 'del' ? '¶' : BREAK; }
    }
    const last = out.at(-1);
    if (para === 'del' && last?.para === 'del') return; // a removed blank line is one mark
    if (last && last.type === type && !last.para && !para) last.text += type === 'break' ? BREAK : ` ${text}`;
    else if (last && type === 'break' && last.type === 'break' && last.para === para) last.text += BREAK;
    else out.push(para ? { type, text, para } : { type, text });
  };
  const ops = lcs(units(before), units(after));
  for (let k = 0; k < ops.length;) {
    if (ops[k][0] === 'same') { push('same', ops[k][1]); k++; continue; }
    // A run of changes: every removed sentence against every added one, word by word.
    const dels = [], adds = [];
    for (; k < ops.length && ops[k][0] !== 'same'; k++) (ops[k][0] === 'del' ? dels.push(ops[k][1]) : adds.push(ops[k][2]));
    const a = wordsOf(dels), b = wordsOf(adds);
    if (!a.length || !b.length || a.length * b.length > MAX_CELLS) { a.forEach((w) => push('del', w)); b.forEach((w) => push('add', w)); continue; }
    for (const [op, x, y] of lcs(a, b)) push(op, op === 'add' ? y : x);
  }
  return out;
}

// The diff in paragraphs of the newer text, for long drafts (persona panel R2-40): [{ n, parts, changed }], where
// n is the paragraph's number in the newer text and parts are its wordDiff parts. A paragraph that was split
// off, or that holds removed text or a removed paragraph break, counts as changed.
export function diffParagraphs(parts) {
  const blocks = [];
  let cur = { n: 1, parts: [], changed: false };
  const close = () => { if (cur.parts.length) blocks.push(cur); };
  for (const p of parts) {
    if (p.type === 'break' && (p.text.length > 1 || p.para === 'add')) {
      if (p.para === 'add') cur.changed = true; // both halves of a split paragraph
      close();
      cur = { n: (blocks.at(-1)?.n ?? 0) + 1, parts: [], changed: p.para === 'add' };
      if (p.para === 'add') cur.parts.push({ type: 'break', text: '', para: 'add' });
      continue;
    }
    cur.parts.push(p);
    if (p.type === 'add' || p.type === 'del') cur.changed = true;
  }
  close();
  return blocks;
}

// ---------- span tracking ----------
// Loose form used for matching, as on the server: case, curly quotes and runs of white space are ignored.
// map[i] is the index in the original string of normalised character i.
function loose(s) {
  let text = '';
  const map = [];
  let space = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (/\s/.test(c)) { if (!space && text) { text += ' '; map.push(i); } space = true; continue; }
    space = false;
    text += c.replace(/[‘’]/, "'").replace(/[“”]/, '"').toLowerCase()[0];
    map.push(i);
  }
  return { text, map };
}
// [start, end) of the first loose match of needle in hay at or after `from`, in hay's own indices.
export function findLoose(hay, needle, from = 0) {
  const h = loose(String(hay || ''));
  const n = loose(String(needle || '')).text.trim();
  if (!n) return null;
  const fromN = h.map.findIndex((m) => m >= from);
  if (fromN < 0) return null;
  const at = h.text.indexOf(n, fromN);
  return at < 0 ? null : [h.map[at], h.map[at + n.length - 1] + 1];
}
const looseEq = (a, b) => loose(a).text.trim() === loose(b).text.trim();

// Sentence bounds around [s, e): a sentence starts after a line break or after ". " and ends at the next
// ". " or line break.
const startsAt = (t, i) => i <= 0 || t[i - 1] === '\n' || (/\s/.test(t[i - 1]) && /[.!?]["'”’)]?$/.test(t.slice(Math.max(0, i - 3), i - 1)));
const endsAt = (t, i) => i >= t.length || t[i] === '\n' || (/\s/.test(t[i]) && /[.!?]["'”’)]?$/.test(t.slice(Math.max(0, i - 2), i)));
function sentenceAround(t, s, e) {
  let a = s;
  while (!startsAt(t, a)) a--;
  let b = Math.max(e, a);
  while (!endsAt(t, b)) b++;
  return [a, b];
}

// Where unchanged context from the old text reappears in the new one: tries 40, 24 and 12 characters and
// takes the occurrence nearest the expected position. Returns the index just after (side 'before') or at
// the start of (side 'after') the context, or null.
function anchor(ctx, newText, expected, side) {
  for (const n of [40, 24, 12]) {
    const c = side === 'before' ? ctx.slice(-n) : ctx.slice(0, n);
    if (c.trim().length < 4) continue;
    let best = null;
    for (let i = newText.indexOf(c); i >= 0; i = newText.indexOf(c, i + 1)) if (best == null || Math.abs(i - expected) < Math.abs(best - expected)) best = i;
    if (best != null) return side === 'before' ? best + c.length : best;
  }
  return null;
}

// Follows the sentence that contained `quote` in oldText into newText.
// Returns { start, end } (the sentence's place in newText), plus the old sentence and the quote's offsets
// in it, or null when the quote is not in oldText or the sentence cannot be found.
export function trackSpan(oldText, newText, quote) {
  const q = findLoose(oldText, quote);
  if (!q) return null;
  const [a, b] = sentenceAround(oldText, q[0], q[1]);
  const scale = newText.length / Math.max(1, oldText.length);
  const before = oldText.slice(Math.max(0, a - 40), a);
  const after = oldText.slice(b, b + 40);
  const start = a === 0 || !before.trim() ? 0 : anchor(before, newText, Math.round(a * scale), 'before');
  if (start == null) return null;
  let end = newText.length;
  if (b < oldText.length && after.trim()) {
    const rel = anchor(after, newText.slice(start), Math.round(b * scale) - start, 'after');
    if (rel == null) return null;
    end = start + rel;
  }
  return { start, end, sentence: oldText.slice(a, b), qs: q[0] - a, qe: q[1] - a };
}

// null: the quoted mistake is still there; 'fixed': the sentence now has the correction in place of the
// quote; 'changed': the learner edited it some other way (or the sentence cannot be found any more).
export function fixStatus(oldText, newText, quote, correction) {
  const t = trackSpan(oldText, newText, quote);
  if (!t) return findLoose(newText, quote) ? null : 'changed';
  const region = newText.slice(t.start, t.end);
  if (findLoose(region, quote)) return null;
  if (!correction) return 'changed';
  const lead = t.sentence.slice(0, t.qs), tail = t.sentence.slice(t.qe);
  if (looseEq(region, lead + correction + tail)) return 'fixed';
  // The words right around the mistake, with the correction in between.
  const near = `${lead.split(/(?=\s)/).slice(-3).join('')}${correction}${tail.split(/(?<=\S)(?=\s)/).slice(0, 3).join('')}`;
  return findLoose(region, near) ? 'fixed' : 'changed';
}

// [start, end) to select in newText for a quote from oldText: the quote itself if it is still in its
// sentence, else the sentence it was in, else the first match anywhere, else null.
export function locateSpan(oldText, newText, quote) {
  const t = trackSpan(oldText, newText, quote);
  if (t) {
    const q = findLoose(newText.slice(t.start, t.end), quote);
    if (q) return [t.start + q[0], t.start + q[1]];
    let s = t.start, e = t.end;
    while (s < e && /\s/.test(newText[s])) s++;
    while (e > s && /\s/.test(newText[e - 1])) e--;
    return e > s ? [s, e] : null;
  }
  return findLoose(newText, quote);
}
