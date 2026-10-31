// Practice hub: what to practise now (recurring mistakes, weak topics, due words), then every lab.
import { html, render } from '../core/util.js';
import { tt, t, legend } from '../core/i18n.js';
import { taxonomyIndex } from '../core/content.js';
import { icon } from '../ui/components.js';
import { model, due, allCards } from '../core/learner.js';
import { configured } from '../core/api.js';
import { CONFIG } from '../../config.js';

const LABS = [
  ['vocab', 'vocab', 'nav.vocab', 'מילים שלמדתם, עם הגייה, דוגמאות ומתי הן חוזרות', 'Words you learned, with pronunciation, examples and when they come back'],
  ['grammar', 'grammar', 'nav.grammar', 'כל נושא דקדוק, כמה הוא יושב, ותרגול ממוקד', 'Every grammar topic, how secure it is, and focused practice'],
  ['reading', 'reading', 'nav.reading', 'טקסטים מדורגים עם שאלות הבנה', 'Graded texts with comprehension questions'],
  ['listening', 'listening', 'nav.listening', 'האזנה, הכתבה ושליטה במהירות', 'Listening, dictation and speed control'],
  ['speaking', 'speaking', 'nav.speaking', 'צלילים שמשנים משמעות, וחזרה אחרי דובר', 'Sounds that change meaning, and shadowing'],
  ['writing', 'writing', 'nav.writing', 'מהמשפט הראשון ועד חיבור טיעוני מלא', 'From the first sentence to a full argumentative essay'],
  ['tutor', 'tutor', 'nav.tutor', 'מורה שמסביר, שואל ומתקן, בשמונה מצבים', 'A tutor who explains, asks and corrects, in eight modes'],
];

export default async function practice(el, ctx) {
  ctx.setTitle(t('nav.practice'));
  const tx = await taxonomyIndex();
  const m = model();
  const dueN = due().length;
  const words = allCards().filter((c) => c.kind === 'meaning').length;
  const aiReady = configured() && CONFIG.aiEnabled;
  // Only topics that can be practised somewhere: a drill, or a scenario for real-life topics (R2-24).
  const weak = m.weak.filter((w) => w.route !== null);
  const counts = { vocab: words ? tt(`${words} מילים · ${dueN} לחזרה`, `${words} words · ${dueN} due`) : '', tutor: aiReady ? '' : tt('דורש הגדרת AI', 'Needs AI setup') };

  render(el, html`
    <div class="page-head"><div><h1>${t('nav.practice')}</h1><p>${tt('מה כדאי לתרגל עכשיו, ומעבדות לכל מיומנות.', 'What to practise now, and a lab for every skill.')}</p></div></div>
    <div class="stack-lg">
      <section class="stack-sm" aria-labelledby="now-h">
        <h2 id="now-h" class="small" style="font-size:var(--t-md)">${tt('מומלץ עכשיו', 'Recommended now')}</h2>
        ${dueN ? html`<a class="panel plan-item" href="#/review"><span class="glyph">${icon('layers')}</span><span class="grow"><span style="font-weight:500">${tt(`חזרה מרווחת · ${dueN} מילים`, `Spaced review · ${dueN} words`)}</span><span class="why" style="display:block">${tt('מילים שבדיוק לפני שכחה.', 'Words that are about to fade.')}</span></span>${icon('chevron')}</a>` : ''}
        ${m.recurring.slice(0, 3).map((e) => { const x = tx.error.get(e.error_type); return html`<a class="panel plan-item" href="#/drill?error=${e.error_type}"><span class="glyph">${icon('practice')}</span><span class="grow"><span style="font-weight:500">${tt(x?.name_he, x?.name_en)}</span><span class="why" style="display:block">${tt(`טעות שחזרה ${e.count} פעמים ב-${e.days} ימים`, `Came up ${e.count} times on ${e.days} days`)}</span></span>${icon('chevron')}</a>`; })}
        ${weak.slice(0, 3).map((w) => { const x = tx.topic.get(w.topic); return html`<a class="panel plan-item" href="#/${w.route || `drill?topic=${w.topic}`}"><span class="glyph">${icon(w.scenario ? 'reallife' : x?.skill === 'vocabulary' ? 'vocab' : 'grammar')}</span><span class="grow"><span style="font-weight:500">${x ? legend(x.name_en, x.name_he) : w.topic}</span><span class="why" style="display:block">${tt(`שליטה ${Math.round(w.mastery * 100)}% לפי ${w.evidence} תשובות`, `${Math.round(w.mastery * 100)}% secure from ${w.evidence} answers`)}</span></span>${icon('chevron')}</a>`; })}
        ${!dueN && !m.recurring.length && !weak.length ? html`<p class="banner small">${icon('info', { size: 18 })}<span>${tt('אחרי כמה שיעורים, כאן יופיעו טעויות שחוזרות ונושאים שכדאי לחזק.', 'After a few lessons, recurring mistakes and topics to strengthen will show up here.')}</span></p>` : ''}
      </section>
      <section class="stack-sm" aria-labelledby="labs-h">
        <h2 id="labs-h" class="small" style="font-size:var(--t-md)">${tt('מעבדות', 'Labs')}</h2>
        <ul class="lesson-list" style="list-style:none;padding:0;margin:0">${LABS.map(([href, ic, key, he, en]) => html`<li><a class="lesson-row" href="#/${href}" style="grid-template-columns:auto 1fr auto">
          <span class="glyph" style="color:var(--ink-2)">${icon(ic)}</span>
          <span class="grow"><span style="font-weight:500;display:block">${t(key)}</span><span class="meta">${tt(he, en)}</span></span>
          <span class="small faint">${counts[href] || ''}</span></a></li>`)}</ul>
      </section>
    </div>`);
}
