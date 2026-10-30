// Grammar lab: every grammar topic by level, with honest mastery (a meter only once there is
// evidence), the lesson that teaches it, and a targeted drill for each. The learner's level is open;
// other levels are one tap away.
import { html, render, on } from '../core/util.js';
import { tt, t, legend } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, LEVEL_LABEL } from '../ui/components.js';
import { model } from '../core/learner.js';
import { LEVELS, levelIndex, lessonOrder } from '../core/adaptive.js';

const STATUS = { learning: ['בלמידה', 'Learning'], practising: ['בתרגול', 'Practising'], mastered: ['נשלט', 'Mastered'] };
const pctText = (x) => `${Math.round(x * 100)}%`;

export default async function grammar(el, ctx) {
  ctx.setTitle(t('nav.grammar'));
  const [ix, curriculum] = await Promise.all([taxonomyIndex(), content.curriculum()]);
  const topics = ix.tx.topics.filter((x) => x.skill === 'grammar');
  const lessons = lessonOrder(curriculum);
  const taughtIn = new Map(topics.map((tp) => [tp.id, lessons.filter((l) => (l.topics || []).includes(tp.id))]));
  const groups = LEVELS.map((level) => ({ level, topics: topics.filter((tp) => tp.level === level) })).filter((g) => g.topics.length);
  const openState = new Map(); // level -> open, as the learner leaves it during this visit
  const nameOf = (tp) => tt(tp.name_he, tp.name_en);

  function primary(m) {
    const weak = m.weak.filter((w) => ix.topic.get(w.topic)?.skill === 'grammar');
    if (weak[0]) { const tp = ix.topic.get(weak[0].topic); return html`<a class="key enter" href="#/drill?topic=${tp.id}">${tt('לתרגל', 'Practise')}: ${nameOf(tp)}</a>`; }
    const ci = levelIndex(m.courseLevel);
    const inProgress = topics.filter((tp) => levelIndex(tp.level) <= ci && m.mastery.get(tp.id)?.evidence && m.mastery.get(tp.id).status !== 'mastered')
      .sort((a, b) => String(m.mastery.get(b.id).last).localeCompare(String(m.mastery.get(a.id).last)))[0];
    if (inProgress) return html`<a class="key enter" href="#/drill?topic=${inProgress.id}">${tt('להמשיך לתרגל', 'Keep practising')}: ${nameOf(inProgress)}</a>`;
    const nextTopic = m.next && (m.next.topics || []).map((id) => ix.topic.get(id)).find((tp) => tp?.skill === 'grammar');
    if (nextTopic) return html`<a class="key enter" href="#/lesson/${m.next.id}">${tt('ללמוד', 'Learn')}: ${nameOf(nextTopic)}</a>`;
    return '';
  }

  function masteryCell(mm) {
    if (!mm?.evidence) return html`<p class="small faint">${tt('עוד לא תרגלתם', 'Not practised yet')}</p>`;
    const [he, en] = STATUS[mm.status] || STATUS.learning;
    return html`<div class="stack-sm">
      <div class="row between small"><span>${tt(he, en)}</span><span class="faint num">${tt(`${mm.evidence} תשובות`, `${mm.evidence} answers`)}</span></div>
      <div class="meter ${mm.status === 'mastered' ? 'ok' : ''}" role="img" aria-label="${tt('שליטה', 'Mastery')} ${pctText(mm.mastery)}"><span style="width:${Math.round(mm.mastery * 100)}%"></span></div>
    </div>`;
  }

  function topicRow(tp, m) {
    const taught = taughtIn.get(tp.id) || [];
    return html`<li class="topic-row">
      <div class="stack-sm">
        <h3 style="font-size:var(--t-md);font-weight:500">${legend(tp.name_en, tp.name_he)}</h3>
        ${taught.length ? html`<p class="xsmall faint">${tt('נלמד בשיעור:', 'Taught in:')} ${taught.map((l, i) => html`${i ? ' · ' : ''}<a href="#/lesson/${l.id}"><span lang="en" dir="ltr">${l.title_en}</span></a>`)}</p>` : ''}
      </div>
      ${masteryCell(m.mastery.get(tp.id))}
      <a class="key small" href="#/drill?topic=${tp.id}" aria-label="${tt('לתרגל', 'Practise')}: ${nameOf(tp)}">${icon('practice', { size: 18 })} ${tt('לתרגל', 'Practise')}</a>
    </li>`;
  }

  function draw() {
    const m = model();
    const ci = levelIndex(m.courseLevel);
    const weak = m.weak.filter((w) => ix.topic.get(w.topic)?.skill === 'grammar');
    // The learner's level is open by default (or the nearest level below it that has grammar).
    const defaultOpen = [...groups].reverse().find((g) => levelIndex(g.level) <= ci)?.level || groups[0]?.level;
    const cta = primary(m);
    render(el, html`
      <div class="page-head">
        <div><h1>${t('nav.grammar')}</h1><p>${tt('כל נושאי הדקדוק לפי רמה: מה כבר יושב, מה עוד צריך תרגול, ואיזה שיעור מלמד כל נושא.', 'Every grammar topic by level: what is secure, what still needs practice, and which lesson teaches it.')}</p></div>
        ${cta ? html`<div>${cta}</div>` : ''}
      </div>
      <div class="stack-lg">
        ${weak.length ? html`<section class="panel flat stack-sm" aria-labelledby="gl-weak">
          <h2 id="gl-weak" style="font-size:var(--t-md)">${tt('צריך עוד עבודה', 'Needs work')}</h2>
          <p class="xsmall faint">${tt('נושאים עם 3 תשובות לפחות ושליטה מתחת ל-70%. תרגול קצר וממוקד עוזר כאן יותר מכל דבר אחר.', 'Topics with at least 3 answers and under 70% mastery. A short, focused drill helps most here.')}</p>
          <div class="row">${weak.map((w) => { const tp = ix.topic.get(w.topic); return html`<a class="key small" href="#/drill?topic=${tp.id}">${nameOf(tp)} <span class="num faint">${pctText(w.mastery)}</span></a>`; })}</div>
        </section>` : ''}
        <section class="stack" aria-label="${tt('נושאים לפי רמה', 'Topics by level')}">
          ${groups.map((g) => {
            const meta = ix.level.get(g.level);
            const practised = g.topics.filter((tp) => m.mastery.get(tp.id)?.evidence).length;
            const mastered = g.topics.filter((tp) => m.mastery.get(tp.id)?.status === 'mastered').length;
            const isOpen = openState.has(g.level) ? openState.get(g.level) : g.level === defaultOpen;
            return html`<details class="panel flat" data-level="${g.level}" ${isOpen ? html`open` : ''}>
              <summary class="disclosure">
                <span class="chev" aria-hidden="true">${icon('chevron', { size: 18 })}</span>
                <h2 class="grow" style="font-size:var(--t-lg)">${LEVEL_LABEL[g.level]}${meta ? html` · ${legend(meta.name_en, meta.name_he)}` : ''}</h2>
                <span class="row small" style="gap:var(--s2)">${g.level === m.courseLevel ? html`<span class="tag cobalt">${tt('הרמה שלך', 'Your level')}</span>` : ''}<span class="faint num">${tt(`${practised}/${g.topics.length} תורגלו`, `${practised}/${g.topics.length} practised`)}${mastered ? tt(` · ${mastered} נשלטו`, ` · ${mastered} mastered`) : ''}</span></span>
              </summary>
              <ol class="topic-list" style="margin-block-start:var(--s4)">${g.topics.map((tp) => topicRow(tp, m))}</ol>
            </details>`;
          })}
        </section>
        <p class="xsmall faint">${tt('השליטה מחושבת מהתשובות שלכם, ותשובות מהזמן האחרון שוקלות יותר. ״נשלט״ דורש 85% לפחות, 6 תשובות ומעלה, ובשני ימים שונים לפחות.', 'Mastery is computed from your answers, with recent answers counting more. Mastered needs at least 85%, 6 or more answers, on at least two different days.')}</p>
      </div>`);
  }

  draw();
  ctx.watch(['attempts', 'progress'], draw);
  return on(el, 'toggle', 'details[data-level]', (e, d) => { if (e.target === d) openState.set(d.dataset.level, d.open); }, true);
}
