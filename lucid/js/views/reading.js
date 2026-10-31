// Reading center: every reading passage from the lessons on this device, grouped by level. The list opens
// at the learner's level: the recommended level first, then the levels above it, then easier texts, closest
// first (persona panel P-35). A text opens in the focused player (Check, feedback, Continue) and is
// recorded as reading practice.
import { html, render } from '../core/util.js';
import { tt, t } from '../core/i18n.js';
import { taxonomyIndex } from '../core/content.js';
import { mark, emptyState } from '../ui/components.js';
import { model } from '../core/learner.js';
import { countWords } from '../core/grading.js';
import { levelIndex } from '../core/adaptive.js';
import { gatherExercises, groupByLevel, recommendedLevel, nextSuggestion, attemptsOn, bestScore, itemHref, findItem, levelHeading, runPlayer, missingPlayer } from '../ui/center.js';

export function passageTitle(ex) {
  if (ex.title) return ex.title;
  const words = String(ex.passage || '').trim().split(/\s+/);
  return words.length > 8 ? `${words.slice(0, 8).join(' ')}…` : words.join(' ');
}

export default async function reading(el, ctx) {
  ctx.setTitle(t('nav.reading'));
  const [items, ix] = await Promise.all([gatherExercises(['read']), taxonomyIndex()]);
  const backLabel = tt('חזרה לרשימת הטקסטים', 'Back to the reading list');

  if (ctx.query.l && ctx.query.e) {
    const item = findItem(items, ctx.query);
    if (!item) {
      return missingPlayer(el, { back: 'reading', backLabel, title: tt('הטקסט לא נמצא', 'Text not found'), body: tt('הטקסט הזה לא זמין במכשיר. אולי השיעור שלו עוד לא נטען; נסו לרענן או לבחור טקסט אחר.', 'This text is not available on this device. Its lesson may not have loaded yet; try reloading or choose another text.'), cta: tt('לרשימת הטקסטים', 'To the reading list') });
    }
    ctx.setTitle(passageTitle(item.ex));
    return runPlayer(el, ctx, { item, back: 'reading', backLabel, source: 'reading', skill: 'reading', errors: ix.error });
  }

  const intro = tt('טקסטים קצרים מהשיעורים, עם שאלות הבנה. כדאי להתחיל ברמה שלכם או מתחתיה: קריאה קלה ושוטפת בונה אוצר מילים מהר יותר.', 'Short texts from your lessons, with comprehension questions. Start at your level or below: easy, fluent reading builds vocabulary fastest.');

  function row(item, attempts) {
    const done = attemptsOn(attempts, item);
    const best = bestScore(done);
    const q = item.ex.questions?.length || 0;
    const words = countWords(item.ex.passage);
    return html`<li><a class="lesson-row three" href="${itemHref('reading', item)}">
      ${mark(done.length ? 'completed' : '')}
      <span class="grow"><span style="display:block;font-weight:500"><span lang="en" dir="ltr">${passageTitle(item.ex)}</span></span>
        <span class="meta" style="display:block">${tt(`${words} מילים · ${q} שאלות`, `${words} words · ${q} ${q === 1 ? 'question' : 'questions'}`)} · <span lang="en" dir="ltr">${item.lesson.title_en}</span></span></span>
      ${best != null ? html`<span class="tag ${best >= 0.7 ? 'ok' : 'warn'} num" title="${tt('התוצאה הטובה ביותר', 'Best result')}">${Math.round(best * 100)}%</span>` : html`<span class="xsmall faint">${tt('חדש', 'New')}</span>`}
    </a></li>`;
  }

  function draw() {
    const m = model();
    const groups = groupByLevel(items);
    if (!groups.length) {
      render(el, html`<div class="page-head"><div><h1>${t('nav.reading')}</h1><p>${intro}</p></div></div>
        ${emptyState({
          title: tt('עוד אין טקסטים לקריאה', 'No reading texts yet'),
          body: tt('טקסטים לקריאה מגיעים עם השיעורים. כשיהיו במכשיר שיעורים עם קטעי קריאה, הם יופיעו כאן לפי רמה.', 'Reading texts come with the lessons. When lessons with reading passages are on this device, they appear here by level.'),
          action: html`<a class="key enter" href="#/path">${tt('למסלול השיעורים', 'Go to your lessons')}</a>`,
        })}`);
      return;
    }
    const ci = levelIndex(m.courseLevel);
    const rec = recommendedLevel(groups, m.courseLevel);
    const next = nextSuggestion(items, m.attempts, m.courseLevel);
    const doneCount = items.filter((x) => attemptsOn(m.attempts, x).length).length;
    const ri = rec ? levelIndex(rec) : -1;
    const ordered = [...groups.filter((g) => levelIndex(g.level) >= ri), ...groups.filter((g) => levelIndex(g.level) < ri).reverse()];
    const firstEasier = ordered.find((g) => levelIndex(g.level) < ri);
    render(el, html`
      <div class="page-head">
        <div><h1>${t('nav.reading')}</h1><p>${intro}</p></div>
        ${next ? html`<a class="key enter" href="${itemHref('reading', next)}">${tt('לטקסט הבא', 'Read the next text')}</a>` : ''}
      </div>
      <div class="stack-lg">
        <p class="small faint num">${tt(`קראתם ${doneCount} מתוך ${items.length} טקסטים`, `${doneCount} of ${items.length} texts read`)}</p>
        ${ordered.map((g) => html`${g === firstEasier ? html`<h2 class="small faint easier-head">${tt('טקסטים קלים יותר, מהקרוב לרמה שלך', 'Easier texts, closest to your level first')}</h2>` : ''}<section class="stack-sm" aria-labelledby="rd-${g.level}">
          ${levelHeading(g.level, ix.level, { recommended: g.level === rec, above: levelIndex(g.level) > ci, id: `rd-${g.level}` })}
          <ol class="lesson-list" style="list-style:none;padding:0;margin:0">${g.items.map((x) => row(x, m.attempts))}</ol>
        </section>`)}
      </div>`);
  }

  draw();
  ctx.watch(['attempts', 'progress'], draw);
  return null;
}
