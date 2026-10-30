// Placement test: adaptive, about 10 minutes, "I don't know" always allowed, no right/wrong shown
// during the test (it measures, it does not teach). Results are provisional and per skill.
import { html, render, on, $, shuffle } from '../core/util.js';
import { tt, t, uiLang } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, LEVEL_LABEL, brandMark } from '../ui/components.js';
import { mountExercise } from '../ui/exercise.js';
import { createPlacement, START_FOR, zeroResult } from '../core/placement.js';
import { applyPlacement, recordAttempt, settings } from '../core/learner.js';
import { checkTyped } from '../core/grading.js';

export default async function placementView(el, ctx) {
  ctx.setTitle(tt('מבחן מיקום', 'Placement'));
  const bank = await content.placement();
  if (!bank?.items?.length) {
    render(el, html`<div class="onboard"><div class="empty"><h3>${tt('מבחן המיקום לא זמין כרגע', 'The placement test is not available right now')}</h3><p>${tt('אפשר להתחיל מהבסיס ולהתקדם מהר; תמיד אפשר לשנות רמה במסלול.', 'You can start from the basics and move quickly; you can always change level on your path.')}</p><a class="key enter" href="#/today" data-zero>${tt('להתחיל מהבסיס', 'Start from the basics')}</a></div></div>`);
    on(el, 'click', '[data-zero]', async (e) => { e.preventDefault(); await applyPlacement(zeroResult()); ctx.navigate('today'); });
    return;
  }
  const start = START_FOR[ctx.query.start] || 'A1';
  const test = createPlacement(bank.items, { start, shuffle: (a) => shuffle(a, 0.37) });
  let item = null; let ctl = null; let asked = 0;

  function intro() {
    render(el, html`<div class="onboard stack-lg">
      <a class="brand" href="#/welcome">${brandMark()}<span>Lucid</span></a>
      <div class="stack-sm"><h1>${tt('מבחן מיקום קצר', 'A short placement test')}</h1>
        <p class="muted">${tt('כ-10 דקות. השאלות נעשות קלות או קשות לפי התשובות שלך, כדי למצוא את נקודת ההתחלה הנכונה.', 'About 10 minutes. Questions get easier or harder based on your answers, to find the right starting point.')}</p></div>
      <ul class="stack-sm small" style="padding-inline-start:1.2rem;margin:0">
        <li>${tt('אין ציון ואין ״נכשל״. זו רק נקודת פתיחה.', 'There is no score and no failing. It is only a starting point.')}</li>
        <li>${tt('לא בטוחים? ״לא יודע/ת״ עדיף על ניחוש: כך המיקום מדויק יותר.', 'Not sure? "I don\'t know" beats guessing: it makes the placement more accurate.')}</li>
        <li>${tt('יש שאלות האזנה. כדאי להגביר את הקול.', 'Some questions use audio, so turn your sound on.')}</li>
      </ul>
      <div class="row"><button type="button" class="key enter" data-begin>${tt('להתחיל', 'Begin')} ${icon(uiLang() === 'he' ? 'arrow-back' : 'arrow-next')}</button><button type="button" class="key ghost" data-zero>${tt('אני מעדיף/ה להתחיל מהבסיס', 'I\'d rather start from the basics')}</button></div>
    </div>`);
  }

  function nextItem() {
    ctl?.destroy?.();
    item = test.next();
    if (!item) return results();
    asked++;
    render(el, html`<div class="player">
      <div class="player-top"><a class="key ghost small icon-only" href="#/welcome" aria-label="${tt('יציאה', 'Exit')}">${icon('x')}</a>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="18" aria-valuenow="${asked}" aria-label="${tt('התקדמות במבחן', 'Test progress')}"><span style="width:${Math.min(95, (asked / 18) * 100)}%"></span></div>
        <span class="small faint num">${asked}</span></div>
      <div class="player-body"><div id="exroot"></div></div>
      <div class="player-foot"><div class="inner"><button type="button" class="key ghost" data-idk>${tt('לא יודע/ת', 'I don\'t know')}</button><span class="grow"></span><button type="button" class="key enter" data-answer disabled>${tt('הבא', 'Next')} <span class="kbd">Enter</span></button></div></div>
    </div>`);
    const ex = { ...item, prompt: item.prompt || { en: 'Choose the best answer.', he: 'בחרו את התשובה הנכונה.' } };
    ctl = mountExercise($('#exroot', el), ex, { onChange: (r) => { $('[data-answer]', el).disabled = !r; }, variant: settings().english_variant });
  }

  function answer(dontKnow) {
    let correct = false; let response = '(I don\'t know)';
    if (!dontKnow) {
      // Read the choice without revealing the answer.
      if (item.type === 'gap') { const vals = [...el.querySelectorAll('.gap-input')].map((i) => i.value); response = vals.join(' | '); correct = vals.every((v, i) => checkTyped(v, item.answers[i]).correct); }
      else { const picked = el.querySelector('.option[aria-pressed="true"]'); const i = Number(picked?.dataset.opt); response = item.options[i]; correct = i === item.answer; }
    }
    test.answer(item, { correct, dontKnow });
    recordAttempt({ source: 'placement', exercise: item.id, topic: item.topic, skill: item.skill, level: item.level, correct, response });
    nextItem();
  }

  async function results() {
    const r = test.result();
    await applyPlacement(r);
    const skills = Object.entries(r.skills).filter(([, v]) => v.items);
    render(el, html`<div class="onboard stack-lg">
      <div class="stack-sm"><h1>${tt('נקודת ההתחלה שלך', 'Your starting point')}</h1>
        <p class="muted">${r.demonstrated
          ? tt(`הראית שליטה עד רמה ${LEVEL_LABEL[r.demonstrated]}. נתחיל ברמה ${LEVEL_LABEL[r.start_level]}, כדי לבנות מכאן הלאה.`, `You showed control up to ${LEVEL_LABEL[r.demonstrated]}. We'll start at ${LEVEL_LABEL[r.start_level]} and build from there.`)
          : tt('נתחיל מהבסיס, בקצב שלך. שיעורים שתדעו כבר יעברו מהר.', 'We\'ll start from the basics, at your pace. Lessons you already know will go quickly.')}</p></div>
      <div class="panel stack">
        <div class="row between"><span>${tt('מתחילים ב-', 'Starting at')}</span><span class="tag level" style="font-size:var(--t-md)">${LEVEL_LABEL[r.start_level]}</span></div>
        ${skills.length ? html`<div class="stack-sm">${skills.map(([s, v]) => html`<div class="row between small"><span>${t(`skill.${s}`)}</span><span class="faint">${v.level ? LEVEL_LABEL[v.level] : '—'} <span class="xsmall">(${v.items} ${tt('שאלות', 'items')})</span></span></div>`)}</div>` : ''}
        <p class="xsmall faint">${t('level.estimate')}. ${tt('זו הערכה ראשונית: היא תתעדכן לפי מה שתעשו בשבועות הקרובים, ותמיד אפשר לשנות רמה במסלול.', 'This is a first estimate: it updates from what you do over the next weeks, and you can always change level on your path.')}</p>
      </div>
      <div class="row"><a class="key enter" href="#/today">${tt('לתוכנית של היום', 'To today\'s plan')} ${icon(uiLang() === 'he' ? 'arrow-back' : 'arrow-next')}</a><a class="key ghost" href="#/path">${tt('לראות את המסלול', 'See the path')}</a></div>
    </div>`);
  }

  intro();
  const offs = [
    on(el, 'click', '[data-begin]', () => nextItem()),
    on(el, 'click', '[data-zero]', async () => { await applyPlacement(zeroResult()); ctx.navigate('lesson/pa1-01'); }),
    on(el, 'click', '[data-answer]', (e, b) => { if (!b.disabled) answer(false); }),
    on(el, 'click', '[data-idk]', () => answer(true)),
  ];
  const onKey = (e) => {
    if (!item || !ctl) return;
    if (ctl.onKey(e)) { e.preventDefault(); return; }
    if (e.key === 'Enter' && !e.isComposing) { const b = $('[data-answer]', el); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
  };
  document.addEventListener('keydown', onKey);
  return () => { offs.forEach((o) => o()); document.removeEventListener('keydown', onKey); ctl?.destroy?.(); };
}
