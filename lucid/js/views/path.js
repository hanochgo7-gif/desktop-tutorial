// The path: all the lessons by level. The current level is shown in full; other levels are one
// tap away (never squeezed into an unreadable overview). Status is a mark in a fixed cell. Lessons that
// are still being written are labelled in words and are not links; placed-out lessons are counted apart
// from completed ones.
import { html, render, on } from '../core/util.js';
import { tt, legend, t, isolateLatin } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, mark, LEVEL_LABEL, confirmDialog, toast } from '../ui/components.js';
import { model, moveToLevel, canImportVocab, importPlacedOutVocab, settings, placementDraft } from '../core/learner.js';
import { store } from '../core/store.js';
import { placementCard, bindPlacementCard, canDo, passedCheck, passedCheckLine, nextLevelKey } from './today.js';

export default async function path(el, ctx) {
  ctx.setTitle(t('nav.path'));
  const [curriculum, tx, available] = await Promise.all([content.curriculum(), content.taxonomy(), content.availableLessons()]);
  const levelMeta = new Map(tx.levels.map((l) => [l.id, l]));
  // Counted from the curriculum, never written in (launch FR-09); "in preparation" is mentioned only while a lesson
  // of the curriculum has no file yet (FR-05), the same test each row uses.
  const allLessons = curriculum.levels.flatMap((l) => l.lessons);
  const unwritten = available.size ? allLessons.filter((l) => !available.has(l.id)).length : 0;
  const first = LEVEL_LABEL[curriculum.levels[0]?.id] || ''; const last = LEVEL_LABEL[curriculum.levels.at(-1)?.id] || '';
  const intro = () => isolateLatin(tt(`${allLessons.length} שיעורים מ-${first} ועד ${last}. אפשר לפתוח כל שיעור מוכן; ההמלצה מסומנת.${unwritten ? ' שיעורים שמסומנים ״בהכנה״ עוד נכתבים.' : ''}`,
    `${allLessons.length} lessons from ${first} to ${last}. Any lesson that is ready can be opened; the recommended one is marked.${unwritten ? ' Lessons marked "In preparation" are still being written.' : ''}`));
  // What adding a skipped level's words did, shown where its button was (TF-12).
  let importNote = null;

  // The level's tab comes into view on a phone, where the tab row scrolls sideways (persona finding R2-23).
  // Physical coordinates, so it works the same in right-to-left and left-to-right layouts.
  function revealTab() {
    const tab = el.querySelector('.level-tab[aria-current="true"]');
    const row = tab?.parentElement;
    if (!tab || !row || row.scrollWidth <= row.clientWidth) return;
    const rt = tab.getBoundingClientRect(); const rr = row.getBoundingClientRect();
    row.scrollLeft += (rt.left + rt.width / 2) - (rr.left + rr.width / 2);
  }

  function draw() {
    const m = model();
    // While the placement test is unfinished there is no course level yet: no "current level" and no "Next"
    // marks, and the test itself comes first (persona findings R2-15, R1-D2).
    const pending = m.placementPending;
    const draft = placementDraft();
    const current = ctx.params.level || m.courseLevel;
    const lvl = curriculum.levels.find((l) => l.id === current) || curriculum.levels[0];
    const meta = levelMeta.get(lvl.id);
    const countIn = (l, status) => l.lessons.filter((x) => m.progress.get(x.id)?.status === status).length;
    const checkpoint = store.get('progress', `check:${lvl.id}`);
    const finalDraft = store.get('writing', `ess:final-${lvl.id}`);
    // Placed-out lessons revised without passing: a sign the level may be too high (the learner decides).
    const missed = lvl.lessons.filter((l) => { const p = m.progress.get(l.id); return p?.status === 'placed_out' && p.last_score != null && p.last_score < 0.7; });
    const L = LEVEL_LABEL[lvl.id];
    // A passed level check replaces "this is your current level" and the check key with what it showed, and the
    // way on to the next level (TP-6).
    const passed = pending ? null : passedCheck(curriculum, lvl.id);
    render(el, html`
      <div class="page-head"><div><h1>${t('nav.path')}</h1><p data-path-intro>${intro()}</p></div></div>
      ${pending ? html`<div style="margin-block-end:var(--s5)">${placementCard()}</div>` : ''}
      <div class="level-tabs" role="tablist" aria-label="${tt('רמות', 'Levels')}">${curriculum.levels.map((l) => {
        const out = countIn(l, 'placed_out');
        return html`<a class="level-tab" role="tab" href="#/path/${l.id}" aria-current="${l.id === lvl.id}" aria-selected="${l.id === lvl.id}">
        <span class="lt-name">${LEVEL_LABEL[l.id]}</span><span class="lt-count num" aria-label="${tt(`${countIn(l, 'completed')} מתוך ${l.lessons.length} הושלמו`, `${countIn(l, 'completed')} of ${l.lessons.length} completed`)}">${countIn(l, 'completed')}/${l.lessons.length}</span>${out ? html`<span class="lt-out">${tt(`דילגתם על ${out}`, `${out} placed out`)}</span>` : ''}</a>`;
      })}</div>
      <section class="stack">
        <div class="row between">
          <div><h2 class="path-level-h">${legend(`${L} · ${meta.name_en}`, meta.name_he)}</h2><p class="small muted" style="margin-top:var(--s1)">${tt(lvl.unit_he, lvl.unit_en)}</p></div>
          ${lvl.id === m.courseLevel && !pending ? html`<span class="tag cobalt">${tt('הרמה הנוכחית שלכם', 'Your current level')}</span>` : ''}
        </div>
        <ol class="lesson-list" style="list-style:none;padding:0;margin:0">${lvl.lessons.map((l) => {
          const p = m.progress.get(l.id);
          const isNext = !pending && m.next?.id === l.id;
          const body = html`${mark(p?.status)}<span class="ord">${l.order}</span>
            <span class="grow">${legend(l.title_en, l.title_he)}${canDo(l.can_do, l.can_do_he, 'meta can-do')}</span>`;
          if (available.size && !available.has(l.id)) {
            return html`<li><div class="lesson-row unwritten">${body}<span class="row small"><span class="tag">${icon('clock', { size: 14 })} ${tt('בהכנה', 'In preparation')}</span></span></div></li>`;
          }
          // A lesson with a saved place opens there, as Today's "Continue" does (TF-11; student-19 F2).
          const saved = p?.resume && p.resume.qi < (p.resume.queue?.length || 0) && p.status !== 'completed';
          return html`<li><a class="lesson-row ${isNext ? 'next' : ''}" href="#/lesson/${l.id}${saved ? '?resume=1' : ''}" ${isNext ? html`aria-current="step"` : ''}>${body}
            <span class="row small">${p?.status === 'started' && p.best_score != null ? html`<span class="tag">${tt('בתהליך', 'In progress')}</span>` : p?.best_score != null ? html`<span class="tag ${p.best_score >= 0.7 ? 'ok' : 'warn'} num">${Math.round(p.best_score * 100)}%</span>` : ''}${isNext ? html`<span class="tag cobalt">${tt('הבא', 'Next')}</span>` : ''}</span></a></li>`;
        })}
          <li><a class="lesson-row" href="#/checkpoint/${lvl.id}">${mark(checkpoint?.status)}<span class="ord">${icon('flag', { size: 16 })}</span>
            <span class="grow"><span style="font-weight:500">${tt(`בדיקת רמה ${L}`, `${L} level check`)}</span><span class="meta" style="display:block">${isolateLatin(tt('מבחן קצר בלי רמזים ובלי AI, מכל נושאי הרמה. 75% ומעלה מסמנים את הרמה כמוכחת.', 'A short test with no hints and no AI, across the level\'s topics. 75% or more marks the level as demonstrated.'))}</span></span>
            ${checkpoint?.best_score != null ? html`<span class="tag ${checkpoint.status === 'completed' ? 'ok' : 'warn'} num">${Math.round(checkpoint.best_score * 100)}%</span>` : ''}</a></li>
          <li><a class="lesson-row" href="#/writing/final-${lvl.id}">${mark(finalDraft ? (finalDraft.status === 'final' ? 'completed' : 'started') : null)}<span class="ord">${icon('writing', { size: 16 })}</span>
            <span class="grow"><span style="font-weight:500">${tt(`משימת הכתיבה של ${L}`, `${L} writing task`)}</span><span class="meta" style="display:block" lang="en" dir="ltr">${lvl.final_assessment.task}</span></span></a></li>
        </ol>
        ${importNote?.level === lvl.id ? html`<p class="panel flat small import-status" role="status" tabindex="-1" data-import-status>${icon('check', { size: 16 })}<span>${importNote.text}</span></p>`
          : canImportVocab(lvl.id) ? html`<div class="panel flat stack-sm"><p class="small">${isolateLatin(tt(`דילגתם על שיעורי ${L}, ולכן המילים שלהם עוד לא בחזרה המרווחת. אפשר להוסיף אותן: הן ייכנסו בהדרגה, עד ${settings().new_per_day} מילים חדשות ביום.`, `You skipped ${L}, so its words are not in your reviews yet. Add them? They come in gradually, up to ${settings().new_per_day} new a day.`))}</p>
          <div class="row"><button type="button" class="key small" data-import="${lvl.id}"><span>${isolateLatin(tt(`להוסיף את המילים של ${L}`, `Add the ${L} words`))}</span></button></div></div>` : ''}
        <div class="panel flat stack-sm">
          ${missed.length ? html`<p class="small">${tt(`בשיעורים של ${L} שדילגתם עליהם וחזרתם אליהם, הציון היה מתחת ל-70% (${missed.length}). אולי כדאי להתחיל מהרמה הזו.`, `You scored under 70% on ${missed.length} ${L} lesson(s) you placed out of and went back to. Starting from this level may suit you better.`)}</p>` : ''}
          <div class="row between">
            <p class="small muted grow">${passed
              ? isolateLatin(tt(`שיעורי ${L} נשארים פתוחים, ואפשר לתרגל אותם שוב בכל זמן.`, `The ${L} lessons stay open to practise again at any time.`))
              : tt('מרגישים שהרמה לא מתאימה? מיקום הוא הערכה התחלתית, ואתם מחליטים.', 'Does this level feel wrong? Placement is a first estimate, and you decide.')}</p>
            <div class="row">
              ${passed ? html`<span class="small path-current" data-check-passed>${icon('check', { size: 16 })}<span>${passedCheckLine(passed)}</span></span>${nextLevelKey(passed)}`
                : lvl.id === m.courseLevel && !pending
                  ? html`<span class="small path-current">${icon('check', { size: 16 })}<span>${tt('זו הרמה הנוכחית שלכם', 'This is your current level')}</span></span>`
                  : lvl.id !== 'PreA1' ? html`<button type="button" class="key small" data-move="${lvl.id}"><span>${isolateLatin(tt(`להתחיל מ-${L}`, `Start from ${L}`))}</span></button>` : ''}
              ${passed ? '' : html`<a class="key small" href="#/checkpoint/${lvl.id}"><span>${isolateLatin(tt(`לבדיקת רמה ${L}`, `To the ${L} level check`))}</span></a>`}
              ${pending && draft?.answers?.length
                ? html`<a class="key ghost small" href="#/placement?resume=1">${tt('להמשיך את מבחן המיקום', 'Continue the placement test')}</a>`
                : pending ? html`<a class="key ghost small" href="#/placement">${tt('מבחן המיקום', 'Take the placement test')}</a>`
                  : html`<a class="key ghost small" href="#/placement?restart=1">${tt('מבחן מיקום מחדש', 'Retake the placement test')}</a>`}
            </div>
          </div>
        </div>
      </section>`);
    revealTab();
  }
  draw();
  ctx.watch(['progress', 'writing', 'cards', 'placement'], draw);
  const offs = [
    ...bindPlacementCard(el, ctx),
    on(el, 'click', '[data-move]', async (e, b) => {
      const level = b.dataset.move;
      const ok = await confirmDialog({ title: tt(`להתחיל מרמה ${LEVEL_LABEL[level]}?`, `Start from ${LEVEL_LABEL[level]}?`), body: tt('שיעורים מתחת לרמה הזו יסומנו כשיעורים שדילגתם עליהם ויישארו פתוחים לחזרה. שיעורים שכבר השלמתם לא ישתנו.', 'Lessons below this level are marked as placed out and stay open for review. Lessons you completed stay completed.'), confirm: tt('כן, להתחיל כאן', 'Yes, start here') });
      if (!ok) return;
      await moveToLevel(level);
      toast(tt('המסלול עודכן', 'Your path was updated'));
    }),
    // The result stays where the button was and takes the focus (TF-12).
    on(el, 'click', '[data-import]', async (e, b) => {
      b.disabled = true;
      const level = b.dataset.import;
      const n = await importPlacedOutVocab(level);
      const per = settings().new_per_day;
      importNote = { level, text: n ? tt(`נוספו ${n} מילים לחזרה. עד ${per} חדשות ביום.`, `${n} words added to your reviews. Up to ${per} new a day.`) : tt('המילים האלה כבר בחזרה.', 'These words are already in your reviews.') };
      draw();
      el.querySelector('[data-import-status]')?.focus();
    }),
  ];
  return () => offs.forEach((o) => o());
}
