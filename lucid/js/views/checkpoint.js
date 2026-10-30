// Level check: a short unassisted test across a level's topics (no hints, no explanations until the
// end, no AI). Passing at 75% is part of demonstrating a level; it never comes from time spent.
import { html, render, on } from '../core/util.js';
import { tt, bi } from '../core/i18n.js';
import { taxonomyIndex, content } from '../core/content.js';
import { icon, emptyState, LEVEL_LABEL } from '../ui/components.js';
import { runSet } from '../ui/player.js';
import { checkpointSet, meanScore } from '../core/pool.js';
import { logEvent } from '../core/learner.js';
import { store } from '../core/store.js';
import { LEVELS } from '../core/adaptive.js';

export default async function checkpoint(el, ctx) {
  const level = ctx.params.level;
  if (!LEVELS.includes(level)) { ctx.navigate('path'); return; }
  ctx.setTitle(tt(`בדיקת רמה ${LEVEL_LABEL[level]}`, `${LEVEL_LABEL[level]} level check`));
  const [tx, curriculum] = await Promise.all([taxonomyIndex(), content.curriculum()]);
  const items = await checkpointSet(level);
  const lvl = curriculum.levels.find((l) => l.id === level);
  if (items.length < 6) {
    render(el, html`<div class="view narrow">${emptyState({ title: tt('הבדיקה לרמה הזו עוד לא זמינה', 'This level check is not available yet'), body: tt('צריך עוד שיעורים זמינים ברמה הזו כדי לבנות בדיקה הוגנת.', 'More lessons at this level need to be available to build a fair check.'), action: html`<a class="key enter" href="#/path/${level}">${tt('למסלול', 'To the path')}</a>` })}</div>`);
    return;
  }
  render(el, html`<div class="onboard stack-lg">
    <div class="stack-sm"><h1>${tt(`בדיקת רמה ${LEVEL_LABEL[level]}`, `${LEVEL_LABEL[level]} level check`)}</h1>
      <p class="muted">${tt(`${items.length} שאלות מכל נושאי הרמה, בלי רמזים ובלי הסברים עד הסוף. כך רואים מה באמת יושב.`, `${items.length} questions across the level's topics, with no hints and no explanations until the end. This shows what you really know.`)}</p></div>
    <ul class="check-rows small">
      <li>${icon('check', { size: 16 })}<span>${tt('75% ומעלה מסמן את הרמה כ״הוכחה״ בפרופיל שלך.', '75% or more marks the level as demonstrated in your profile.')}</span></li>
      <li>${icon('check', { size: 16 })}<span>${tt('משימת הכתיבה של הרמה (בשיעור האחרון) היא חלק נפרד מההוכחה:', 'The level\'s writing task (in its last lesson) is a separate part of the evidence:')} <span lang="en" dir="ltr">${lvl.final_assessment.task}</span></span></li>
      <li>${icon('check', { size: 16 })}<span>${tt('אפשר לנסות שוב מתי שרוצים. אין עונש.', 'You can try again whenever you like. There is no penalty.')}</span></li>
    </ul>
    <div class="row"><button type="button" class="key enter" data-begin>${tt('להתחיל', 'Begin')}</button><a class="key ghost" href="#/path/${level}">${tt('לא עכשיו', 'Not now')}</a></div></div>`);

  let cleanup = null;
  const off = on(el, 'click', '[data-begin]', () => {
    cleanup = runSet(el, items, {
      title: tt(`בדיקת רמה ${LEVEL_LABEL[level]}`, `${LEVEL_LABEL[level]} level check`),
      source: 'checkpoint', unassisted: true, exitHref: `#/path/${level}`, errors: tx.error,
      onDone(results) {
        const score = meanScore(results);
        const passed = score >= 0.75;
        const prev = store.get('progress', `check:${level}`);
        store.put('progress', { id: `check:${level}`, level, kind: 'checkpoint', status: passed || prev?.status === 'completed' ? 'completed' : 'started', best_score: Math.max(prev?.best_score || 0, score), last_score: score, attempts: (prev?.attempts || 0) + 1, completed_at: passed ? new Date().toISOString() : prev?.completed_at || null });
        logEvent({ type: 'checkpoint', level, score, passed });
        const missed = results.filter((x) => !x.correct);
        render(el, html`<div class="view narrow stack-lg">
          <div class="stack-sm"><h1>${passed ? tt(`רמה ${LEVEL_LABEL[level]}: הוכחה`, `${LEVEL_LABEL[level]}: demonstrated`) : tt('עוד לא, אבל קרוב', 'Not yet, but close')}</h1>
            <p class="muted">${tt(`${Math.round(score * 100)}% בלי עזרה.`, `${Math.round(score * 100)}% with no help.`)} ${passed ? tt('זה נרשם בפרופיל המיומנויות שלך.', 'This is recorded in your skill profile.') : tt('הנה מה שכדאי לחזק לפני ניסיון נוסף:', 'Here is what to strengthen before another try:')}</p></div>
          ${missed.length ? html`<div class="stack-sm">${missed.map((x) => html`<div class="panel flat stack-sm small">${bi(x.item.ex.prompt)}${x.r.answer ? html`<p>${tt('התשובה:', 'Answer:')} <strong lang="en" dir="ltr">${x.r.answer}</strong></p>` : ''}${x.item.ex.explanation ? html`<p class="muted">${bi(x.item.ex.explanation)}</p>` : ''}<a class="xsmall" href="#/drill?topic=${x.item.topic}">${tt('תרגול ממוקד לנושא', 'Targeted practice for this topic')}</a></div>`)}</div>` : ''}
          <div class="row"><a class="key enter" href="#/path/${level}">${tt('למסלול', 'To the path')}</a></div></div>`);
      },
    });
  });
  return () => { off(); cleanup?.(); };
}
