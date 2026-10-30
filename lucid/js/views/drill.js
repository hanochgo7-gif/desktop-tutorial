// Targeted practice: a short interleaved set for one weak topic or one recurring mistake.
import { html, render } from '../core/util.js';
import { tt, bi, hebrewSupport } from '../core/i18n.js';
import { taxonomyIndex } from '../core/content.js';
import { icon, emptyState } from '../ui/components.js';
import { runSet } from '../ui/player.js';
import { drillSet, meanScore } from '../core/pool.js';
import { model, logEvent } from '../core/learner.js';

export default async function drill(el, ctx) {
  const { topic, error } = ctx.query;
  const tx = await taxonomyIndex();
  const label = error ? tx.error.get(error) : tx.topic.get(topic);
  const name = label ? tt(label.name_he, label.name_en) : tt('תרגול', 'Practice');
  ctx.setTitle(name);
  const m = model();
  const items = await drillSet({ topic, error, level: m.courseLevel, attempts: m.attempts });
  if (!items.length) {
    render(el, html`<div class="view narrow">${emptyState({ title: tt('אין עדיין תרגילים לנושא הזה', 'No exercises for this yet'), body: tt('התרגילים מגיעים מהשיעורים שכבר זמינים. נסו נושא אחר או המשיכו במסלול.', 'Exercises come from the lessons available so far. Try another topic or continue your path.'), action: html`<a class="key enter" href="#/practice">${tt('לתרגול', 'To practice')}</a>` })}</div>`);
    return;
  }
  return runSet(el, items, {
    title: tt(`תרגול ממוקד: ${name}`, `Targeted practice: ${name}`),
    source: 'drill',
    errors: tx.error,
    onDone(results) {
      const score = meanScore(results);
      logEvent({ type: 'drill', topic: topic || null, error: error || null, score });
      const missed = results.filter((x) => !x.correct);
      render(el, html`<div class="view narrow stack-lg">
        <div class="stack-sm"><h1>${tt('סיימתם את התרגול', 'Practice done')}</h1>
          <p class="muted">${tt(`${results.filter((x) => x.correct).length} מתוך ${results.length} נכון.`, `${results.filter((x) => x.correct).length} of ${results.length} correct.`)} ${score >= 0.8 ? tt('זה נראה יציב יותר. Lucid יבדוק שוב בעוד כמה ימים, כדי לוודא שזה נשאר.', 'This looks steadier. Lucid will check again in a few days to make sure it stays.') : tt('עוד לא יציב, וזה בסדר. הנושא יחזור לתוכנית בימים הקרובים.', 'Not steady yet, and that is fine. It will come back in your plan over the next days.')}</p></div>
        ${label?.why_he && hebrewSupport() !== 'off' ? html`<div class="block-tip row" style="align-items:flex-start">${icon('hint', { size: 18 })}<p lang="he" dir="rtl">${label.why_he}</p></div>` : ''}
        ${missed.length ? html`<div class="panel flat stack-sm"><h2 class="small">${tt('לעבור עליהם שוב', 'Worth another look')}</h2>${missed.map((x) => html`<div class="small">${bi(x.item.ex.prompt)}${x.item.ex.explanation ? html`<p class="muted">${bi(x.item.ex.explanation)}</p>` : ''}</div>`)}</div>` : ''}
        <div class="row"><a class="key enter" href="#/today">${tt('חזרה להיום', 'Back to Today')}</a><a class="key" href="#/drill?${topic ? `topic=${topic}` : `error=${error}`}&again=${Date.now()}">${tt('סט נוסף', 'Another set')}</a></div>
      </div>`);
    },
  });
}
