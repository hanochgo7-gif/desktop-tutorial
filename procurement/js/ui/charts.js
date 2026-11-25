// Charts with almost no chrome: one hue on the data, faint gridlines, values on hover and in a visually hidden table.
import { h } from './dom.js';
import { moneyShort } from '../core/format.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

// Vertical bars over time. data: [{label, value, title?}] in time order (rendered right-to-left: newest on the left in RTL reading order).
export function barChart(data, { height = 180, format = moneyShort, label = 'תרשים', highlight = data.length - 1 } = {}) {
  const W = 640, H = height, pad = { t: 10, b: 26, s: 8 };
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': label, preserveAspectRatio: 'none' });
  for (let v = 0; v <= top; v += step) {
    const y = pad.t + (H - pad.t - pad.b) * (1 - v / top);
    svg.append(s('line', { x1: 0, x2: W, y1: y, y2: y, class: 'chart__grid' }));
  }
  const bw = (W - pad.s * 2) / data.length;
  data.forEach((d, i) => {
    const x = W - pad.s - bw * (i + 1) + bw * 0.18;             // RTL: first month at the right
    const hgt = (H - pad.t - pad.b) * ((d.value || 0) / top);
    const r = s('rect', { x, y: H - pad.b - hgt, width: bw * 0.64, height: Math.max(hgt, d.value ? 1 : 0), rx: 2, class: i === highlight ? 'chart__bar is-hi' : 'chart__bar' });
    const t = s('title'); t.textContent = `${d.title || d.label}: ${format(d.value)}`; r.append(t);
    svg.append(r);
    const tx = s('text', { x: x + bw * 0.32, y: H - 8, class: 'chart__x', 'text-anchor': 'middle' }); tx.textContent = d.label; svg.append(tx);
  });
  const ticks = h('div.chart__ticks', Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => h('span', { style: { bottom: `${((i * step) / top) * ((H - pad.t - pad.b) / H) * 100 + (pad.b / H) * 100}%` } }, format(i * step))));
  const table = h('table.sr', h('caption', label), h('tbody', data.map((d) => h('tr', h('th', d.title || d.label), h('td', format(d.value))))));
  return h('figure.chartbox', h('div.chart__area', svg, ticks), table);
}
function niceStep(max) {
  const raw = max / 4; const p = 10 ** Math.floor(Math.log10(raw)); const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

// Ranked horizontal bars: [{label, value, href?, sub?}]. The first (largest) carries the hue.
export function rankBars(list, { format = moneyShort, max = 6, label = 'דירוג' } = {}) {
  const top = list.slice(0, max);
  const big = Math.max(1, ...top.map((x) => x.value || 0));
  const rest = list.slice(max).reduce((a, x) => a + (x.value || 0), 0);
  return h('ol.rank', { 'aria-label': label },
    top.map((x, i) => h('li.rank__row',
      h('span.rank__label', x.href ? h('a', { href: x.href }, x.label) : x.label, x.sub ? h('span.rank__sub', x.sub) : null),
      h('span.rank__bar', h('span', { class: i === 0 ? 'is-hi' : '', style: { width: `${Math.max(2, (x.value / big) * 100)}%` } })),
      h('span.rank__value', format(x.value)))),
    rest > 0 ? h('li.rank__row.rank__rest', h('span.rank__label', `${list.length - max} נוספים`), h('span.rank__bar'), h('span.rank__value', format(rest))) : null);
}

// Budget meter: used vs amount, with committed and actual as two tones and an overrun marked.
export function meter({ amount, actual, committed }) {
  const used = (actual || 0) + (committed || 0);
  const scale = Math.max(amount || 0, used, 1);
  const a = ((actual || 0) / scale) * 100, c = ((committed || 0) / scale) * 100, cap = ((amount || 0) / scale) * 100;
  return h('div.meter', { role: 'img', 'aria-label': `נוצל ${Math.round((used / Math.max(amount || 1, 1)) * 100)}%` },
    h('span.meter__actual', { style: { width: a + '%' } }), h('span.meter__committed', { style: { width: c + '%' } }),
    used > amount ? h('span.meter__cap', { style: { insetInlineStart: cap + '%' } }) : null);
}
