// Targeted practice: a short interleaved set for one weak topic or one recurring mistake.
import { html, render } from '../core/util.js';
import { tt, bi, hebrewSupport, isolateLatin } from '../core/i18n.js';
import { taxonomyIndex } from '../core/content.js';
import { icon, emptyState } from '../ui/components.js';
import { runSet, exitTarget } from '../ui/player.js';
import { drillSet, meanScore } from '../core/pool.js';
import { model, logEvent, SCENARIO_TOPICS } from '../core/learner.js';

export default async function drill(el, ctx) {
  const { topic, error } = ctx.query;
  const tx = await taxonomyIndex();
  const label = error ? tx.error.get(error) : tx.topic.get(topic);
  const name = label ? tt(label.name_he, label.name_en) : tt('תרגול', 'Practice');
  ctx.setTitle(name);
  // Leaving returns to where the learner came from (Today, Practice, a lab), Today otherwise (LF-11).
  const exitHref = exitTarget(ctx.from, 'today');
  const m = model();
  const items = await drillSet({ topic, error, level: m.courseLevel, attempts: m.attempts });
  if (!items.length) {
    // Real-life topics are practised in their scenarios, not in drills (persona finding R2-24).
    const scene = topic && SCENARIO_TOPICS.has(topic);
    render(el, html`<div class="onboard">${scene
      ? emptyState({ title: tt('את זה מתרגלים בתרחישים', 'This is practised in scenarios'), body: tt('לנושא הזה אין תרגילים מהשיעורים. בתרחישים של אנגלית לחיים עונים בשיחה ומקבלים הסבר על כל תשובה.', 'This topic has no lesson exercises. In the Real life scenarios you reply in a conversation and get an explanation for each reply.'), action: html`<a class="key enter" href="#/real-life">${tt('לתרחישים באנגלית לחיים', 'To Real life scenarios')}</a>` })
      : emptyState({ title: tt('אין עדיין תרגילים לנושא הזה', 'No exercises for this yet'), body: tt('התרגילים מגיעים מהשיעורים שכבר זמינים. נסו נושא אחר או המשיכו במסלול.', 'Exercises come from the lessons available so far. Try another topic or continue your path.'), action: html`<a class="key enter" href="#/practice">${tt('לתרגול', 'To practice')}</a>` })}</div>`);
    return;
  }
  const title = tt(`תרגול ממוקד: ${name}`, `Targeted practice: ${name}`);
  // The Hebrew-speaker pitfall for this mistake, from the lessons the set's items come from (r4 LF-10).
  const pitfall = error ? items.flatMap((x) => x.pitfalls || []).find((p) => p.error_type === error) || null : null;
  const run = () => runSet(el, items, {
    title,
    source: 'drill',
    errors: tx.error,
    focusError: error || null,
    pitfall,
    exitHref,
    onDone(results) {
      const score = meanScore(results);
      logEvent({ type: 'drill', topic: topic || null, error: error || null, score });
      const missed = results.filter((x) => !x.correct);
      // The result sits in the page frame (margins, a heading that takes focus), as the level check does (LF-12).
      render(el, html`<div class="onboard stack-lg check-result">
        <div class="stack-sm"><h1 tabindex="-1">${tt('סיימתם את התרגול', 'Practice done')}</h1>
          <p class="muted">${tt(`${results.filter((x) => x.correct).length} מתוך ${results.length} נכון.`, `${results.filter((x) => x.correct).length} of ${results.length} correct.`)} ${score >= 0.8 ? tt('זה נראה יציב יותר. Lucid יבדוק שוב בעוד כמה ימים, כדי לוודא שזה נשאר.', 'This looks steadier. Lucid will check again in a few days to make sure it stays.') : tt('עוד לא יציב, וזה בסדר. הנושא יחזור לתוכנית בימים הקרובים.', 'Not steady yet, and that is fine. It will come back in your plan over the next days.')}</p></div>
        ${label?.why_he && hebrewSupport() !== 'off' ? html`<div class="block-tip row" style="align-items:flex-start">${icon('hint', { size: 18 })}<p lang="he" dir="rtl">${label.why_he}</p></div>` : ''}
        ${missed.length ? html`<div class="panel flat stack-sm"><h2 class="small">${tt('לעבור עליהם שוב', 'Worth another look')}</h2>${missed.map((x) => html`<div class="small">${bi(x.item.ex.prompt)}${x.item.ex.explanation ? html`<p class="muted">${bi(x.item.ex.explanation)}</p>` : ''}</div>`)}</div>` : ''}
        <div class="row"><a class="key enter" href="#/today">${tt('להיום', 'To Today')}</a><a class="key" href="#/drill?${topic ? `topic=${topic}` : `error=${error}`}&again=${Date.now()}">${tt('סט נוסף', 'Another set')}</a></div>
      </div>`);
      window.scrollTo?.(0, 0);
      el.querySelector('h1[tabindex]')?.focus({ preventScroll: true });
    },
  });
  // Before item 1, one card with what this practice is about (r4 LF-10): the mistake's name and why it happens,
  // and the Hebrew-speaker pitfall for it, then "Start". The set itself runs as before.
  const why = label?.why_he && hebrewSupport() !== 'off' ? label.why_he : null;
  render(el, html`<div class="onboard stack-lg drill-primer" data-drill-primer>
    <div class="stack-sm"><p class="small faint">${tt(`${items.length} תרגילים, כמו בשיעור: רמז כשיש, וניסיון שני לתשובה כתובה.`, `${items.length} exercises, as in a lesson: a hint where there is one, and a second try for a typed answer.`)}</p>
      <h1 tabindex="-1">${title}</h1>
      ${why ? html`<p lang="he" dir="rtl">${isolateLatin(why)}</p>` : label?.why_en && hebrewSupport() === 'off' ? html`<p lang="en" dir="ltr">${label.why_en}</p>` : ''}</div>
    ${pitfall && hebrewSupport() !== 'off' ? html`<div class="pitfall"><p class="pitfall-head">${icon('flag', { size: 16 })} ${tt('מלכודת לדוברי עברית', 'A trap for Hebrew speakers')}</p><div>${bi(pitfall)}</div></div>` : ''}
    <div class="row"><button type="button" class="key enter" data-drill-start>${tt('להתחיל', 'Start')}</button><a class="key ghost" href="${exitHref}">${tt('לא עכשיו', 'Not now')}</a></div>
  </div>`);
  window.scrollTo?.(0, 0);
  el.querySelector('h1[tabindex]')?.focus({ preventScroll: true });
  let cleanup = null;
  const onStart = (e) => { if (e.target.closest('[data-drill-start]') && !cleanup) cleanup = run(); };
  el.addEventListener('click', onStart);
  return () => { el.removeEventListener('click', onStart); cleanup?.(); };
}
