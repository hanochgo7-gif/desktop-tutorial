// Level check: a short unassisted test across a level's topics (no hints, no explanations until the
// end, no AI). Passing at 75% is part of demonstrating a level; it never comes from time spent.
import { html, render, on } from '../core/util.js';
import { tt, bi, isolateLatin } from '../core/i18n.js';
import { taxonomyIndex, content } from '../core/content.js';
import { icon, emptyState, LEVEL_LABEL } from '../ui/components.js';
import { runSet, exitTarget } from '../ui/player.js';
import { checkpointSet, meanScore, mistakeNote } from '../core/pool.js';
import { wordAccuracy } from '../core/grading.js';
import { logEvent } from '../core/learner.js';
import { store } from '../core/store.js';
import { LEVELS } from '../core/adaptive.js';

// What the learner gave, word by word, with the words that are not in the answer marked (LF-12).
export function answerDiff(said, right) {
  return wordAccuracy(right, said).words.map((w) => ({ word: w.word, ok: w.ok }));
}

// The question itself, under its instruction (r4 LF-11): an option item's question, the sentence to fix or to
// rewrite, or a gap text with the learner's words in its gaps. null when there is none (a dictation).
export function questionOf(ex, response = '') {
  if (['mcq', 'listen'].includes(ex.type)) return ex.question || null;
  if (ex.type === 'gap' && ex.text) {
    const got = String(response || '').split(' | ');
    return ex.text.split('___').map((p, i, all) => `${p}${i < all.length - 1 ? (got[i] && got[i] !== '(I don\'t know)' ? got[i] : '___') : ''}`).join('').replace(/\s+/g, ' ').trim();
  }
  if (ex.type === 'correct') return ex.sentence || null;
  if (ex.type === 'transform') return ex.source || null;
  return null;
}

export default async function checkpoint(el, ctx) {
  const level = ctx.params.level;
  if (!LEVELS.includes(level)) { ctx.navigate('path'); return; }
  const L = LEVEL_LABEL[level];
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1] || null;
  ctx.setTitle(tt(`בדיקת רמה ${L}`, `${L} level check`));
  const [tx, curriculum] = await Promise.all([taxonomyIndex(), content.curriculum()]);
  const items = await checkpointSet(level);
  const lvl = curriculum.levels.find((l) => l.id === level);
  // Leaving returns to where the learner came from (the path, Progress), the level's path otherwise (LF-11).
  const exitHref = exitTarget(ctx.from, `#/path/${level}`);
  if (items.length < 6) {
    render(el, html`<div class="onboard">${emptyState({ title: tt('הבדיקה לרמה הזו עוד לא זמינה', 'This level check is not available yet'), body: tt('צריך עוד שיעורים זמינים ברמה הזו כדי לבנות בדיקה הוגנת.', 'More lessons at this level need to be available to build a fair check.'), action: html`<a class="key enter" href="#/path/${level}">${tt('למסלול', 'To the path')}</a>` })}</div>`);
    return;
  }
  render(el, html`<div class="onboard stack-lg">
    <div class="stack-sm"><h1>${isolateLatin(tt(`בדיקת רמה ${L}`, `${L} level check`))}</h1>
      <p class="muted">${tt(`בדיקה קצרה של נושאי הרמה, בלי רמזים: ${items.length} שאלות, וההסברים בסוף.`, `A short check of the level's topics, with no hints: ${items.length} questions, with the explanations at the end.`)}</p></div>
    <ul class="check-rows small">
      <li>${icon('check', { size: 16 })}<span>${tt('75% ומעלה מסמנים את הרמה כ״מוכחת״.', '75% or more marks the level as demonstrated.')}</span></li>
      <li>${icon('check', { size: 16 })}<span>${tt('משימת הכתיבה של הרמה, שנמצאת במסלול אחרי הבדיקה הזו, היא חלק נפרד מההוכחה:', 'The level\'s writing task, on the path after this check, is a separate part of the evidence:')} <a href="#/writing/final-${level}" lang="en" dir="ltr" data-final-task>${lvl.final_assessment.task}</a></span></li>
      <li>${icon('check', { size: 16 })}<span>${tt('אפשר לנסות שוב מתי שרוצים. אין עונש.', 'You can try again whenever you like. There is no penalty.')}</span></li>
    </ul>
    <div class="row"><button type="button" class="key enter" data-begin>${tt('להתחיל', 'Begin')}</button><a class="key ghost" href="${exitHref}">${tt('לא עכשיו', 'Not now')}</a></div></div>`);

  // A missed item: the question, what the learner wrote (the words not in the answer marked), the answer and
  // its explanation.
  const missedItem = (x) => {
    const m = mistakeNote(x.item.ex, x.r.response);
    const typed = m.pair && !['mcq', 'listen'].includes(x.item.ex.type);
    const stem = questionOf(x.item.ex, x.r.response);
    return html`<div class="panel flat stack-sm small check-miss">${bi(x.item.ex.prompt)}
      ${stem ? (/[\u0590-\u05FF]/.test(stem) ? html`<p class="check-q" lang="he" dir="rtl">${stem}</p>` : html`<p class="check-q" lang="en" dir="ltr">${stem}</p>`) : ''}
      ${m.pair ? html`<p class="mine-line">${typed ? tt('כתבתם:', 'You wrote:') : tt('בחרתם:', 'You chose:')} <span class="answer-diff" lang="en" dir="ltr">${typed
        ? answerDiff(m.pair[0], m.pair[1]).map((w, k) => html`${k ? ' ' : ''}<span class="${w.ok ? 'w-ok' : 'w-x'}">${w.word}${w.ok ? '' : html`<span class="sr-only"> (${tt('לא בתשובה', 'not in the answer')})</span>`}</span>`)
        : html`<span class="w-x">${m.pair[0]}</span>`}</span></p>` : ''}
      ${x.r.answer ? html`<p>${tt('התשובה:', 'Answer:')} <strong lang="en" dir="ltr">${x.r.answer}</strong></p>` : ''}
      ${m.note ? html`<div class="muted">${bi(m.note)}</div>` : ''}
      <a class="xsmall" href="#/drill?topic=${x.item.topic}">${tt('תרגול ממוקד לנושא', 'Targeted practice for this topic')}</a></div>`;
  };

  let cleanup = null;
  const off = on(el, 'click', '[data-begin]', () => {
    cleanup = runSet(el, items, {
      title: tt(`בדיקת רמה ${L}`, `${L} level check`),
      source: 'checkpoint', unassisted: true, exitHref, errors: tx.error,
      onDone(results) {
        const score = meanScore(results);
        const passed = score >= 0.75;
        const prev = store.get('progress', `check:${level}`);
        store.put('progress', { id: `check:${level}`, level, kind: 'checkpoint', status: passed || prev?.status === 'completed' ? 'completed' : 'started', best_score: Math.max(prev?.best_score || 0, score), last_score: score, attempts: (prev?.attempts || 0) + 1, completed_at: passed ? new Date().toISOString() : prev?.completed_at || null });
        logEvent({ type: 'checkpoint', level, score, passed });
        const missed = results.filter((x) => !x.correct);
        const N = nextLevel ? LEVEL_LABEL[nextLevel] : null;
        // The result sits in the page frame, with margins and a heading that takes focus (LF-12). The pass text
        // says what was recorded, not a profile change that has not happened yet.
        render(el, html`<div class="onboard stack-lg check-result">
          <div class="stack-sm"><h1 tabindex="-1">${passed ? isolateLatin(tt(`רמה ${L}: מוכחת`, `${L}: demonstrated`)) : score >= 0.6 ? tt('עוד לא, אבל קרוב', 'Not yet, but close') : tt('עוד לא', 'Not yet')}</h1>
            <p class="muted">${tt(`${Math.round(score * 100)}% בלי עזרה.`, `${Math.round(score * 100)}% with no help.`)} ${passed
              ? isolateLatin(tt(`נרשם כראיה לרמה ${L}. הרמה לפי מיומנות תתעדכן אחרי יום תרגול נוסף.`, `Recorded as evidence for ${L}. Your level by skill updates after one more day of practice.`))
              : tt('הנה מה שכדאי לחזק לפני ניסיון נוסף:', 'Here is what to strengthen before another try:')}</p></div>
          ${missed.length ? html`<div class="stack-sm">${missed.map(missedItem)}</div>` : ''}
          <div class="row">${passed && N ? html`<a class="key enter" href="#/path/${nextLevel}" data-next-level>${isolateLatin(tt(`להמשיך ל-${N}`, `Go on to ${N}`))}</a><a class="key ghost" href="#/path/${level}">${tt('למסלול', 'To the path')}</a>` : html`<a class="key enter" href="#/path/${level}">${tt('למסלול', 'To the path')}</a>`}</div></div>`);
        window.scrollTo?.(0, 0);
        el.querySelector('h1[tabindex]')?.focus({ preventScroll: true });
      },
    });
  });
  return () => { off(); cleanup?.(); };
}
