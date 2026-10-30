// The path: all 75 lessons by level. The current level is shown in full; other levels are one
// tap away (never squeezed into an unreadable overview). Status is a mark in a fixed cell.
import { html, render, on } from '../core/util.js';
import { tt, legend, t } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, mark, LEVEL_LABEL, confirmDialog, toast } from '../ui/components.js';
import { model, moveToLevel } from '../core/learner.js';
import { store } from '../core/store.js';

export default async function path(el, ctx) {
  ctx.setTitle(t('nav.path'));
  const [curriculum, tx, available] = await Promise.all([content.curriculum(), content.taxonomy(), content.availableLessons()]);
  const levelMeta = new Map(tx.levels.map((l) => [l.id, l]));

  function draw() {
    const m = model();
    const current = ctx.params.level || m.courseLevel;
    const lvl = curriculum.levels.find((l) => l.id === current) || curriculum.levels[0];
    const meta = levelMeta.get(lvl.id);
    const doneIn = (l) => l.lessons.filter((x) => ['completed', 'placed_out'].includes(m.progress.get(x.id)?.status)).length;
    const checkpoint = store.get('progress', `check:${lvl.id}`);
    const finalDraft = store.get('writing', `ess:final-${lvl.id}`);
    render(el, html`
      <div class="page-head"><div><h1>${t('nav.path')}</h1><p>${tt('75 שיעורים מ-Pre-A1 ועד C2. אפשר לפתוח כל שיעור; ההמלצה מסומנת.', '75 lessons from Pre-A1 to C2. Any lesson can be opened; the recommended one is marked.')}</p></div></div>
      <div class="level-tabs" role="tablist" aria-label="${tt('רמות', 'Levels')}">${curriculum.levels.map((l) => html`<a class="level-tab" role="tab" href="#/path/${l.id}" aria-current="${l.id === lvl.id}" aria-selected="${l.id === lvl.id}">
        <span class="lt-name">${LEVEL_LABEL[l.id]}</span><span class="lt-count num">${doneIn(l)}/${l.lessons.length}</span></a>`)}</div>
      <section class="stack">
        <div class="row between">
          <div><h2>${LEVEL_LABEL[lvl.id]} · ${legend(meta.name_en, meta.name_he)}</h2><p class="small muted" style="margin-top:var(--s1)">${tt(lvl.unit_he, lvl.unit_en)}</p></div>
          ${lvl.id === m.courseLevel ? html`<span class="tag cobalt">${tt('הרמה הנוכחית שלך', 'Your current level')}</span>` : ''}
        </div>
        <ol class="lesson-list" style="list-style:none;padding:0;margin:0">${lvl.lessons.map((l) => {
          const p = m.progress.get(l.id);
          const isNext = m.next?.id === l.id;
          const has = available.has(l.id);
          return html`<li><a class="lesson-row ${isNext ? 'next' : ''} ${has ? '' : 'unwritten'}" href="#/lesson/${l.id}" ${isNext ? html`aria-current="step"` : ''}>
            ${mark(p?.status)}<span class="ord">${l.order}</span>
            <span class="grow">${legend(l.title_en, l.title_he)}<span class="meta" style="display:block" lang="en" dir="ltr">${l.can_do}</span></span>
            <span class="row small">${p?.best_score != null ? html`<span class="tag ${p.best_score >= 0.7 ? 'ok' : 'warn'} num">${Math.round(p.best_score * 100)}%</span>` : ''}${isNext ? html`<span class="tag cobalt">${tt('הבא', 'Next')}</span>` : ''}</span></a></li>`;
        })}
          <li><a class="lesson-row" href="#/checkpoint/${lvl.id}">${mark(checkpoint?.status)}<span class="ord">${icon('flag', { size: 16 })}</span>
            <span class="grow"><span style="font-weight:500">${tt(`בדיקת רמה ${LEVEL_LABEL[lvl.id]}`, `${LEVEL_LABEL[lvl.id]} level check`)}</span><span class="meta" style="display:block">${tt('מבחן קצר בלי רמזים ובלי AI, מכל נושאי הרמה. כך מראים שהרמה באמת יושבת.', 'A short test with no hints and no AI, across the level\'s topics. This is how a level is demonstrated.')}</span></span>
            ${checkpoint?.best_score != null ? html`<span class="tag ${checkpoint.status === 'completed' ? 'ok' : 'warn'} num">${Math.round(checkpoint.best_score * 100)}%</span>` : ''}</a></li>
          <li><a class="lesson-row" href="#/writing/final-${lvl.id}">${mark(finalDraft ? (finalDraft.status === 'final' ? 'completed' : 'started') : null)}<span class="ord">${icon('writing', { size: 16 })}</span>
            <span class="grow"><span style="font-weight:500">${tt(`משימת הכתיבה של ${LEVEL_LABEL[lvl.id]}`, `${LEVEL_LABEL[lvl.id]} writing task`)}</span><span class="meta" style="display:block" lang="en" dir="ltr">${lvl.final_assessment.task}</span></span></a></li>
        </ol>
        <div class="panel flat row between">
          <p class="small muted grow">${tt('מרגישים שהרמה לא מתאימה? מיקום הוא הערכה התחלתית, ואתם מחליטים.', 'Does this level feel wrong? Placement is a first estimate, and you decide.')}</p>
          <div class="row">
            ${lvl.id !== 'PreA1' ? html`<button type="button" class="key small" data-move="${lvl.id}">${tt(`להתחיל מ-${LEVEL_LABEL[lvl.id]}`, `Start from ${LEVEL_LABEL[lvl.id]}`)}</button>` : ''}
            <a class="key small" href="#/checkpoint/${lvl.id}">${tt('לבחון את עצמי', 'Test myself')}</a>
          </div>
        </div>
      </section>`);
  }
  draw();
  ctx.watch(['progress', 'writing'], draw);
  return on(el, 'click', '[data-move]', async (e, b) => {
    const level = b.dataset.move;
    const ok = await confirmDialog({ title: tt(`להתחיל מרמה ${LEVEL_LABEL[level]}?`, `Start from ${LEVEL_LABEL[level]}?`), body: tt('שיעורים מתחת לרמה הזו יסומנו כ״דולגו״ ויישארו פתוחים לחזרה. שיעורים שכבר השלמתם לא ישתנו.', 'Lessons below this level are marked as placed out and stay open for review. Lessons you completed stay completed.'), confirm: tt('כן, להתחיל כאן', 'Yes, start here') });
    if (!ok) return;
    await moveToLevel(level);
    toast(tt('המסלול עודכן', 'Your path was updated'));
  });
}
