// Writing lab: a ten-stage path from the first correct sentence to independent argumentation,
// with exercises and assignments for each stage, and the learner's drafts.
import { html, render, on } from '../core/util.js';
import { tt, t, legend } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, levelTag, emptyState } from '../ui/components.js';
import { model } from '../core/learner.js';
import { store } from '../core/store.js';
import { levelIndex } from '../core/adaptive.js';

export const STAGES = [
  [1, 'Sentence construction', 'בניית משפטים', 'Correct, complete sentences: subject, verb, word order, punctuation.', 'משפטים שלמים ונכונים: נושא, פועל, סדר מילים ופיסוק.'],
  [2, 'Paragraph development', 'בניית פסקה', 'Topic sentence, supporting sentences, transitions.', 'משפט נושא, משפטים תומכים ומעברים.'],
  [3, 'Expressing opinions', 'הבעת דעה', 'State an opinion clearly and say why.', 'להציג דעה בבירור ולהסביר למה.'],
  [4, 'Building arguments', 'בניית טיעונים', 'Claims, reasons, evidence and examples.', 'טענות, נימוקים, ראיות ודוגמאות.'],
  [5, 'Counterarguments', 'טיעונים נגדיים', 'Present the other side fairly.', 'להציג את הצד השני בהגינות.'],
  [6, 'Rebuttals', 'הפרכה', 'Answer an opposing argument with logic.', 'להשיב לטיעון נגדי בהיגיון.'],
  [7, 'Essay structure', 'מבנה חיבור', 'Introductions, body paragraphs, conclusions.', 'פתיחה, פסקאות גוף וסיכום.'],
  [8, 'Critical thinking', 'חשיבה ביקורתית', 'Assumptions, bias and logical fallacies.', 'הנחות סמויות, הטיה וכשלים לוגיים.'],
  [9, 'Academic writing', 'כתיבה אקדמית', 'Formal register, hedging, citing and evaluating sources.', 'משלב רשמי, הסתייגות, ציטוט והערכת מקורות.'],
  [10, 'Independent argumentation', 'טיעון עצמאי', 'Complex essays with minimal help.', 'חיבורים מורכבים כמעט בלי עזרה.'],
];
// Where a learner at each course level should be working.
export const STAGE_FOR_LEVEL = { PreA1: 1, A1: 1, A2: 2, B1: 3, B2: 5, C1: 8, C2: 10 };

export default async function writing(el, ctx) {
  ctx.setTitle(t('nav.writing'));
  const [ex, as] = await Promise.all([content.writingExercises(), content.assignments()]);
  const exercises = ex?.exercises || [];
  const assignments = as?.assignments || [];
  const m = model();
  const rec = STAGE_FOR_LEVEL[m.courseLevel] || 1;
  const summaries = store.all('writing').filter((w) => w.kind === 'essay-summary').sort((a, b) => (a.updated < b.updated ? 1 : -1));
  const all = [...exercises.map((x) => ({ ...x, _type: 'exercise' })), ...assignments.map((x) => ({ ...x, _type: 'assignment' }))];
  let open = Number(ctx.query.stage) || rec;

  function itemRow(x) {
    const s = summaries.find((w) => w.exercise === x.id);
    const tooHard = levelIndex(x.level) > levelIndex(m.courseLevel) + 1;
    return html`<li><a class="lesson-row" href="#/writing/${x.id}" style="grid-template-columns:auto 1fr auto">
      <span class="glyph" style="color:var(--ink-2)">${icon(x._type === 'assignment' ? 'flag' : x.items ? 'list' : 'writing')}</span>
      <span class="grow">${legend(x.title_en, x.title_he)}<span class="meta" style="display:block">${x._type === 'assignment' ? tt(`מטלה · ${x.word_range[0]}-${x.word_range[1]} מילים`, `Assignment · ${x.word_range[0]}-${x.word_range[1]} words`) : x.items ? tt(`${x.items.length} תרגילים`, `${x.items.length} exercises`) : x.min_words ? tt(`לפחות ${x.min_words} מילים`, `At least ${x.min_words} words`) : ''}${x.time_limit_min ? tt(` · ${x.time_limit_min} דקות`, ` · ${x.time_limit_min} min`) : ''}${tooHard ? tt(' · מעל הרמה הנוכחית', ' · above your current level') : ''}</span></span>
      <span class="row">${s ? html`<span class="tag ${s.status === 'evaluated' ? 'ok' : ''}">${s.status === 'evaluated' ? tt(`טיוטה ${s.versions}`, `Draft ${s.versions}`) : tt('בכתיבה', 'In progress')}</span>` : ''}${levelTag(x.level)}</span></a></li>`;
  }

  function draw() {
    render(el, html`
      <div class="page-head"><div><h1>${t('nav.writing')}</h1><p>${tt('עשרה שלבים מהמשפט הראשון ועד חיבור טיעוני עצמאי. המשוב מסמן טעויות ונותן רמזים, ואתם מתקנים בעצמכם.', 'Ten stages from the first sentence to an independent argumentative essay. Feedback marks mistakes and gives hints; you fix them yourself.')}</p></div>
        <a class="key" href="#/writing/free">${icon('writing', { size: 18 })} ${tt('כתיבה חופשית', 'Free writing')}</a></div>
      ${summaries.length ? html`<section class="stack-sm" style="margin-block-end:var(--s6)"><h2 class="small" style="font-size:var(--t-md)">${tt('הטיוטות שלי', 'My drafts')}</h2>
        <ul class="lesson-list" style="list-style:none;padding:0;margin:0">${summaries.slice(0, 6).map((s) => html`<li><a class="lesson-row" href="#/writing/${s.exercise}" style="grid-template-columns:1fr auto auto"><span lang="en" dir="ltr">${s.title}</span><span class="small faint">${new Date(s.updated).toLocaleDateString(document.documentElement.lang === 'he' ? 'he-IL' : 'en-GB')}</span>${s.last_estimate ? html`<span class="tag level">${s.last_estimate}</span>` : html`<span class="tag">${tt(`${s.versions || 0} טיוטות`, `${s.versions || 0} drafts`)}</span>`}</a></li>`)}</ul></section>` : ''}
      ${!all.length ? emptyState({ title: tt('התרגילים של מעבדת הכתיבה עוד לא זמינים', 'Writing lab exercises are not available yet'), body: tt('בינתיים אפשר לכתוב חופשי ולקבל בדיקות אוטומטיות.', 'Meanwhile you can write freely and get automatic checks.'), action: html`<a class="key enter" href="#/writing/free">${tt('כתיבה חופשית', 'Free writing')}</a>` }) : html`
      <ol class="stack-sm" style="list-style:none;padding:0;margin:0">${STAGES.map(([n, en, he, den, dhe]) => {
        const items = all.filter((x) => x.stage === n);
        const isOpen = open === n;
        return html`<li class="panel ${isOpen ? '' : 'flat'}" style="padding:var(--s4) var(--s5)">
          <button type="button" class="row" data-stage="${n}" aria-expanded="${isOpen}" style="width:100%;background:none;border:0;padding:0;text-align:start">
            <span class="tag level num">${n}</span><span class="grow">${legend(en, he)}<span class="small muted" style="display:block">${tt(dhe, den)}</span></span>
            ${n === rec ? html`<span class="tag cobalt">${tt('השלב שלך', 'Your stage')}</span>` : ''}<span class="small faint">${items.length}</span></button>
          ${isOpen ? html`<ul class="lesson-list" style="list-style:none;padding:0;margin:var(--s4) 0 0">${items.length ? items.map(itemRow) : html`<li class="small faint">${tt('אין עדיין תרגילים בשלב הזה.', 'No exercises in this stage yet.')}</li>`}</ul>` : ''}
        </li>`;
      })}</ol>`}`);
  }
  draw();
  return on(el, 'click', '[data-stage]', (e, b) => { const n = Number(b.dataset.stage); open = open === n ? 0 : n; draw(); });
}
