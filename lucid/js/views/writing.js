// Writing lab: a ten-stage path from the first correct sentence to independent argumentation,
// with exercises and assignments for each stage, and the learner's drafts.
import { html, render, on } from '../core/util.js';
import { tt, t, legend } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, levelTag, emptyState, LEVEL_LABEL } from '../ui/components.js';
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
// Where a learner at each course level should be working. Each level's final writing task sits in the
// last stage of its span (B2: stages 5-6, final in 6); the lab says so (persona panel P-31).
export const STAGE_FOR_LEVEL = { PreA1: 1, A1: 1, A2: 2, B1: 3, B2: 5, C1: 8, C2: 10 };
// The stage to open: the recommended one, or the nearest stage with tasks when it has none.
export function openStage(rec, counts) {
  if (counts[rec]) return rec;
  for (let d = 1; d < 10; d++) for (const n of [rec + d, rec - d]) if (counts[n]) return n;
  return rec;
}

export default async function writing(el, ctx) {
  ctx.setTitle(t('nav.writing'));
  const [ex, as, cur] = await Promise.all([content.writingExercises(), content.assignments(), content.curriculum()]);
  const finals = (cur?.levels || []).filter((l) => l.final_assessment?.stage).map((l) => ({ id: `final-${l.id}`, _type: 'final', stage: l.final_assessment.stage, level: l.id, word_range: [l.final_assessment.min_words, l.final_assessment.max_words], topics: l.final_assessment.topics?.length || 0, title_en: `${LEVEL_LABEL[l.id]} final writing task`, title_he: `משימת הסיום של ${LEVEL_LABEL[l.id]}` }));
  const exercises = ex?.exercises || [];
  const assignments = as?.assignments || [];
  const m = model();
  const rec = STAGE_FOR_LEVEL[m.courseLevel] || 1;
  const summaries = store.all('writing').filter((w) => w.kind === 'essay-summary').sort((a, b) => (a.updated < b.updated ? 1 : -1));
  const all = [...exercises.map((x) => ({ ...x, _type: 'exercise' })), ...assignments.map((x) => ({ ...x, _type: 'assignment' })), ...finals];
  const counts = all.reduce((c, x) => ({ ...c, [x.stage]: (c[x.stage] || 0) + 1 }), {});
  const myFinal = finals.find((f) => f.level === m.courseLevel);
  const start = openStage(rec, counts);
  let open = Number(ctx.query.stage) || start;
  const L = LEVEL_LABEL[m.courseLevel] || m.courseLevel;
  // Your level, your stage, and where the level's final task is.
  const stageNote = () => html`<p class="small muted">${tt(`הרמה שלכם: ${L}. השלב שלכם: ${rec}${myFinal && myFinal.stage !== rec ? `; משימת הסיום של ${L} נמצאת בשלב ${myFinal.stage}` : ''}.`, `Your level: ${L}. Your stage: ${rec}${myFinal && myFinal.stage !== rec ? `; the ${L} final task is in stage ${myFinal.stage}` : ''}.`)}${start !== rec && !ctx.query.stage ? tt(` בשלב ${rec} עוד אין משימות, אז פתחנו את שלב ${start}.`, ` Stage ${rec} has no tasks yet, so stage ${start} is open.`) : ''}</p>`;

  function itemRow(x) {
    const s = summaries.find((w) => w.exercise === x.id);
    const tooHard = levelIndex(x.level) > levelIndex(m.courseLevel) + 1;
    return html`<li><a class="lesson-row" href="#/writing/${x.id}" style="grid-template-columns:auto 1fr auto">
      <span class="glyph" style="color:var(--ink-2)">${icon(x._type === 'assignment' || x._type === 'final' ? 'flag' : x.items ? 'list' : 'writing')}</span>
      <span class="grow">${legend(x.title_en, x.title_he)}<span class="meta" style="display:block">${x._type === 'final' ? tt(`משימת סיום הרמה · ${x.word_range[0]}-${x.word_range[1]} מילים${x.topics ? ` · ${x.topics} נושאים לבחירה` : ''}`, `Level final task · ${x.word_range[0]}-${x.word_range[1]} words${x.topics ? ` · ${x.topics} topics to choose from` : ''}`) : x._type === 'assignment' ? tt(`מטלה · ${x.word_range[0]}-${x.word_range[1]} מילים`, `Assignment · ${x.word_range[0]}-${x.word_range[1]} words`) : x.items ? tt(`${x.items.length} תרגילים`, `${x.items.length} exercises`) : x.min_words ? tt(`לפחות ${x.min_words} מילים`, `At least ${x.min_words} words`) : ''}${x.time_limit_min ? tt(` · ${x.time_limit_min} דקות`, ` · ${x.time_limit_min} min`) : ''}${tooHard ? tt(' · מעל הרמה הנוכחית', ' · above your current level') : ''}</span></span>
      <span class="row">${s ? html`<span class="tag ${s.status === 'evaluated' || s.status === 'final' || s.status === 'done' ? 'ok' : ''}">${s.status === 'final' ? tt('סופית', 'Final') : s.status === 'done' ? tt('בוצע', 'Done') : s.status === 'evaluated' ? tt(`טיוטה ${s.versions}`, `Draft ${s.versions}`) : tt('בכתיבה', 'In progress')}</span>` : ''}${levelTag(x.level)}</span></a></li>`;
  }

  // Only a final draft shows a level, and as a range; drafts show how many versions there are (persona panel P-71).
  function draftTag(s) {
    if (s.status === 'final' && s.final_range) return html`<span class="tag level" title="${tt('טווח הרמה של הטיוטה הסופית', 'Level range of the final draft')}">${s.final_range}</span>`;
    if (s.status === 'final') return html`<span class="tag ok">${tt('סופית', 'Final')}</span>`;
    return html`<span class="tag">${tt(`${s.versions || 0} טיוטות`, `${s.versions || 0} drafts`)}</span>`;
  }

  function draw() {
    render(el, html`
      <div class="page-head"><div><h1>${t('nav.writing')}</h1><p>${tt('עשרה שלבים מהמשפט הראשון ועד חיבור טיעוני עצמאי. המשוב מסמן טעויות ונותן רמזים, ואתם מתקנים בעצמכם.', 'Ten stages from the first sentence to an independent argumentative essay. Feedback marks mistakes and gives hints; you fix them yourself.')}</p>${stageNote()}</div>
        <a class="key" href="#/writing/free">${icon('writing', { size: 18 })} ${tt('כתיבה חופשית', 'Free writing')}</a></div>
      ${summaries.length ? html`<section class="stack-sm" style="margin-block-end:var(--s6)"><h2 class="small" style="font-size:var(--t-md)">${tt('הטיוטות שלי', 'My drafts')}</h2>
        <ul class="lesson-list" style="list-style:none;padding:0;margin:0">${summaries.slice(0, 6).map((s) => html`<li><a class="lesson-row" href="#/writing/${s.exercise}" style="grid-template-columns:1fr auto auto"><span lang="en" dir="ltr">${s.title}</span><span class="small faint">${new Date(s.updated).toLocaleDateString(document.documentElement.lang === 'he' ? 'he-IL' : 'en-GB')}</span>${draftTag(s)}</a></li>`)}</ul></section>` : ''}
      ${!all.length ? emptyState({ title: tt('התרגילים של מעבדת הכתיבה עוד לא זמינים', 'Writing lab exercises are not available yet'), body: tt('בינתיים אפשר לכתוב חופשי ולקבל בדיקות אוטומטיות.', 'Meanwhile you can write freely and get automatic checks.'), action: html`<a class="key enter" href="#/writing/free">${tt('כתיבה חופשית', 'Free writing')}</a>` }) : html`
      <ol class="stack-sm" style="list-style:none;padding:0;margin:0">${STAGES.map(([n, en, he, den, dhe]) => {
        const items = all.filter((x) => x.stage === n);
        const isOpen = open === n;
        return html`<li class="panel ${isOpen ? '' : 'flat'}" style="padding:var(--s4) var(--s5)">
          <button type="button" class="row" data-stage="${n}" aria-expanded="${isOpen}" style="width:100%;background:none;border:0;padding:0;text-align:start">
            <span class="tag level num">${n}</span><span class="grow">${legend(en, he)}<span class="small muted" style="display:block">${tt(dhe, den)}</span></span>
            ${n === rec ? html`<span class="tag cobalt">${tt('השלב שלך', 'Your stage')}</span>` : ''}${myFinal?.stage === n ? html`<span class="tag">${tt(`סיום ${L}`, `${L} final`)}</span>` : ''}<span class="small faint">${items.length}</span></button>
          ${isOpen ? html`<ul class="lesson-list" style="list-style:none;padding:0;margin:var(--s4) 0 0">${items.length ? items.map(itemRow) : html`<li class="small faint">${tt('אין עדיין תרגילים בשלב הזה.', 'No exercises in this stage yet.')}</li>`}</ul>` : ''}
        </li>`;
      })}</ol>`}`);
  }
  draw();
  return on(el, 'click', '[data-stage]', (e, b) => { const n = Number(b.dataset.stage); open = open === n ? 0 : n; draw(); });
}
