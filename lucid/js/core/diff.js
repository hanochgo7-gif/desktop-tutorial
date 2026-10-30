// Word-level diff between two drafts. Sentences are aligned first (LCS over sentences), then
// changed sentence pairs are diffed word by word, which keeps long essays cheap to compare.
const sentences = (t) => String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
const words = (s) => s.split(' ').filter(Boolean);

function lcs(a, b, eq = (x, y) => x === y) {
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
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

// Returns [{type: 'same' | 'add' | 'del', text}], adjacent parts of the same type merged.
export function wordDiff(before, after) {
  const out = [];
  const push = (type, text) => { const last = out[out.length - 1]; if (last && last.type === type) last.text += ` ${text}`; else out.push({ type, text }); };
  const sOps = lcs(sentences(before), sentences(after));
  for (let k = 0; k < sOps.length; k++) {
    const [op, a, b] = sOps[k];
    if (op === 'same') { push('same', a); continue; }
    // Pair a deleted sentence with a following added one and diff them word by word.
    if (op === 'del' && sOps[k + 1]?.[0] === 'add') {
      for (const [wop, wa, wb] of lcs(words(a), words(sOps[k + 1][2]))) push(wop, wop === 'add' ? wb : wa);
      k++;
      continue;
    }
    push(op, op === 'add' ? b : a);
  }
  return out;
}
