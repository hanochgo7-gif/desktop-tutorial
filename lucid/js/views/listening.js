// Listening center: listening items and dictations from the lessons on this device, grouped by level,
// with the learner's level recommended and a speaking-speed control. Without speech synthesis the
// exercise renderer shows transcripts instead of audio, and this screen says so up front.
import { html, render, on } from '../core/util.js';
import { tt, t, legend, uiLang, isolateLatin } from '../core/i18n.js';
import { taxonomyIndex } from '../core/content.js';
import { mark, emptyState, icon, LEVEL_LABEL } from '../ui/components.js';
import { model, settings, saveSettings } from '../core/learner.js';
import { countWords } from '../core/grading.js';
import { say, canSpeak, stopSpeaking } from '../core/speech.js';
import { levelIndex } from '../core/adaptive.js';
import { gatherExercises, groupByLevel, recommendedLevel, nextSuggestion, orderedGroups, attemptsOn, bestScore, itemHref, findItem, runPlayer, missingPlayer } from '../ui/center.js';

const RATES = [[0.8, 'איטי', 'Slower'], [0.95, 'רגיל', 'Normal'], [1.1, 'מהיר', 'Faster']];
const SAMPLE = 'This is how fast the speaker will talk.';

export default async function listening(el, ctx) {
  ctx.setTitle(t('nav.listening'));
  const [items, ix] = await Promise.all([gatherExercises(['listen', 'dictation']), taxonomyIndex()]);
  const backLabel = tt('לרשימת תרגילי ההאזנה', 'Back to the listening list');

  if (ctx.query.l && ctx.query.e) {
    const item = findItem(items, ctx.query);
    if (!item) {
      return missingPlayer(el, { back: 'listening', backLabel, title: tt('התרגיל לא נמצא', 'Item not found'), body: tt('תרגיל ההאזנה הזה לא זמין במכשיר. אולי השיעור שלו עוד לא נטען; נסו לרענן או לבחור תרגיל אחר.', 'This listening item is not available on this device. Its lesson may not have loaded yet; try reloading or choose another item.'), cta: tt('לרשימת התרגילים', 'To the listening list') });
    }
    ctx.setTitle(t('nav.listening'));
    return runPlayer(el, ctx, { item, back: 'listening', backLabel, source: 'listening', skill: 'listening', errors: ix.error });
  }

  const intro = tt('הבנת הנשמע ותכתיב מהשיעורים. כדאי להתחיל ברמה שלכם או מתחתיה, ובכל תרגיל יש גם השמעה איטית.', 'Listening and dictation from your lessons. Start at your level or below; every item also has a slow replay.');
  const noSpeech = () => (canSpeak() ? '' : html`<p class="banner warn">${icon('alert', { size: 18 })}<span>${tt('הדפדפן הזה לא יכול להקריא טקסט, ולכן בכל תרגיל יוצג התמליל במקום השמעה. לתרגול האזנה אמיתי נסו את Chrome, Edge או Safari.', 'This browser cannot synthesise speech, so each item shows its transcript instead of audio. For real listening practice, try Chrome, Edge or Safari.')}</span></p>`);

  // A row is named by its lesson, in the interface language (PH-6); the English question is the item itself.
  function row(item, attempts) {
    const { ex, lesson } = item;
    const done = attemptsOn(attempts, item);
    const best = bestScore(done);
    const words = countWords(ex.audio_text);
    const isDictation = ex.type === 'dictation';
    const title = uiLang() === 'he' && lesson.title_he ? html`<span>${isolateLatin(lesson.title_he)}</span>` : html`<span lang="en" dir="ltr">${lesson.title_en}</span>`;
    return html`<li><a class="lesson-row ls-row" style="--row: listening" href="${itemHref('listening', item)}">
      ${mark(done.length ? 'completed' : '')}
      <span class="grow"><span style="display:block;font-weight:500">${title}</span>
        <span class="meta" style="display:block">${isDictation ? tt('תכתיב', 'Dictation') : tt('בחירה ממה ששמעתם', 'Choose what you hear')} · ${tt(`${words} מילים`, `${words} ${words === 1 ? 'word' : 'words'}`)}</span></span>
      ${best != null ? html`<span class="tag ${best >= 0.7 ? 'ok' : 'warn'} num" title="${tt('התוצאה הטובה ביותר', 'Best result')}">${Math.round(best * 100)}%</span>` : html`<span class="xsmall faint">${done.length ? tt('לא נספר', 'Not counted') : tt('חדש', 'New')}</span>`}
    </a></li>`;
  }

  function rateControl() {
    const rate = settings().speech_rate || 0.95;
    return html`<div class="panel flat row between">
      <div class="stack-sm"><h2 id="ls-rate" style="font-size:var(--t-md)">${tt('מהירות הדיבור', 'Speaking speed')}</h2><p class="xsmall faint">${tt('חל על כל ההשמעות באפליקציה. כפתור ״לאט״ בכל תרגיל מאט עוד יותר.', 'Applies to all audio in the app. The Slowly button in each item slows it down further.')}</p></div>
      <div class="row">
        <div class="seg" role="group" aria-labelledby="ls-rate">${RATES.map(([r, he, en]) => html`<button type="button" data-rate="${r}" aria-pressed="${String(Math.abs(rate - r) < 0.01)}">${tt(he, en)} <span class="num" dir="ltr">${r}×</span></button>`)}</div>
        ${canSpeak() ? html`<button type="button" class="key ghost small" data-sample>${icon('volume', { size: 18 })} ${tt('לשמוע דוגמה', 'Hear a sample')}</button>` : ''}
      </div>
    </div>`;
  }

  function draw() {
    const m = model();
    const groups = groupByLevel(items);
    if (!groups.length) {
      render(el, html`<div class="page-head"><div><h1>${t('nav.listening')}</h1><p>${intro}</p></div></div>
        ${noSpeech()}
        ${emptyState({
          title: tt('עוד אין תרגילי האזנה', 'No listening practice yet'),
          body: tt('תרגילי האזנה ותכתיב מגיעים עם השיעורים. כשיהיו במכשיר שיעורים עם תרגילים כאלה, הם יופיעו כאן לפי רמה.', 'Listening items and dictations come with the lessons. When lessons with them are on this device, they appear here by level.'),
          action: html`<a class="key enter" href="#/path">${tt('למסלול השיעורים', 'Go to your lessons')}</a>`,
        })}`);
      return;
    }
    const ci = levelIndex(m.courseLevel);
    const rec = recommendedLevel(groups, m.courseLevel);
    const next = nextSuggestion(items, m.attempts, m.courseLevel, m.progress);
    const doneCount = items.filter((x) => attemptsOn(m.attempts, x).length).length;
    // PH-6: the learner's level first and open, then the levels above, then the easier ones, each folded (as in the
    // Grammar lab), so the list starts where the learner is instead of at the alphabet.
    const ordered = orderedGroups(groups, rec);
    const firstEasier = ordered.find((g) => rec && levelIndex(g.level) < levelIndex(rec));
    render(el, html`
      <div class="page-head">
        <div><h1>${t('nav.listening')}</h1><p>${intro}</p></div>
        ${next ? html`<a class="key enter" href="${itemHref('listening', next)}">${tt('לתרגיל ההאזנה הבא', 'Next listening item')}</a>` : ''}
      </div>
      <div class="stack-lg">
        ${noSpeech()}
        ${rateControl()}
        <p class="small faint num">${tt(`תרגלתם ${doneCount} מתוך ${items.length} תרגילים`, `${doneCount} of ${items.length} items practised`)}</p>
        <div class="stack-sm">${ordered.map((g) => {
          const meta = ix.level.get(g.level);
          const doneN = g.items.filter((x) => attemptsOn(m.attempts, x).length).length;
          const isOpen = openState.has(g.level) ? openState.get(g.level) : g.level === (rec || ordered[0].level);
          return html`${g === firstEasier ? html`<h2 class="small faint easier-head">${tt('תרגילים קלים יותר, מהקרוב לרמה שלכם', 'Easier items, closest to your level first')}</h2>` : ''}<details class="panel flat" data-level="${g.level}" ${isOpen ? html`open` : ''}>
            <summary class="disclosure">
              <span class="chev" aria-hidden="true">${icon('chevron', { size: 18 })}</span>
              <h2 class="grow" id="ls-${g.level}" style="font-size:var(--t-lg)">${LEVEL_LABEL[g.level]}${meta ? html` · ${tt(meta.name_he, meta.name_en)}` : ''}</h2>
              <span class="row small disclosure-meta" style="gap:var(--s2)">${g.level === rec ? html`<span class="tag cobalt">${tt('מומלץ לרמה שלכם', 'Recommended for your level')}</span>` : levelIndex(g.level) > ci ? html`<span class="faint">${tt('מעל הרמה הנוכחית: אתגר', 'Above your current level: a stretch')}</span>` : ''}<span class="faint num">${tt(`${doneN} מתוך ${g.items.length}`, `${doneN} of ${g.items.length}`)}</span></span>
            </summary>
            <ol class="lesson-list" aria-labelledby="ls-${g.level}" style="list-style:none;padding:0;margin:var(--s4) 0 0">${g.items.map((x) => row(x, m.attempts))}</ol>
          </details>`;
        })}</div>
      </div>`);
  }

  const openState = new Map(); // level -> open, as the learner leaves it during this visit
  draw();
  ctx.watch(['attempts', 'progress'], draw);
  const offs = [
    on(el, 'toggle', 'details[data-level]', (e, d) => { if (e.target === d) openState.set(d.dataset.level, d.open); }, true),
    on(el, 'click', '[data-rate]', (e, b) => {
      saveSettings({ speech_rate: Number(b.dataset.rate) });
      el.querySelectorAll('[data-rate]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }),
    on(el, 'click', '[data-sample]', () => say(SAMPLE)),
  ];
  return () => { offs.forEach((o) => o()); stopSpeaking(); };
}
