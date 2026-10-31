// Placement test: adaptive, about 10 minutes, "I don't know" always allowed, no right/wrong shown
// during the test (it measures, it does not teach). Answers are saved as the learner goes, so leaving
// keeps the place (Today offers to continue or start again). Results are provisional and per skill.
import { html, render, on, $, shuffle } from '../core/util.js';
import { tt, t, uiLang } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, LEVEL_LABEL, brandMark, toast } from '../ui/components.js';
import { mountExercise } from '../ui/exercise.js';
import { createPlacement, START_FOR, zeroResult } from '../core/placement.js';
import { LEVELS } from '../core/adaptive.js';
import { applyPlacement, moveToLevel, recordAttempt, settings, profile, placementDraft, savePlacementDraft, clearPlacementDraft } from '../core/learner.js';
import { checkTyped } from '../core/grading.js';

export default async function placementView(el, ctx) {
  ctx.setTitle(tt('מבחן מיקום', 'Placement'));
  const bank = await content.placement();
  if (!bank?.items?.length) {
    render(el, html`<div class="onboard"><div class="empty"><h3>${tt('מבחן המיקום לא זמין כרגע', 'The placement test is not available right now')}</h3><p>${tt('אפשר להתחיל מהבסיס ולהתקדם מהר; תמיד אפשר לשנות רמה במסלול.', 'You can start from the basics and move quickly; you can always change level on your path.')}</p><a class="key enter" href="#/today" data-zero>${tt('להתחיל מהבסיס', 'Start from the basics')}</a></div></div>`);
    on(el, 'click', '[data-zero]', async (e) => { e.preventDefault(); await applyPlacement(zeroResult()); ctx.navigate('today'); });
    return;
  }
  // "Start again" clears the saved answers once; the address loses the flag so a reload keeps new answers.
  if (ctx.query.restart) { clearPlacementDraft(); history.replaceState(null, '', '#/placement'); }
  const draft = placementDraft();
  const start = START_FOR[ctx.query.start] || draft?.start || START_FOR[profile()?.start_choice] || 'A1';
  const test = createPlacement(bank.items, { start, shuffle: (a) => shuffle(a, 0.37), answers: draft?.start === start ? draft.answers || [] : [] });
  let item = null; let ctl = null;
  const arrow = () => icon(uiLang() === 'he' ? 'arrow-back' : 'arrow-next');

  function intro() {
    const done = test.progress.asked;
    render(el, html`<div class="onboard stack-lg">
      <a class="brand" href="#/today">${brandMark()}<span>Lucid</span></a>
      ${done ? html`<div class="stack-sm"><h1>${tt('להמשיך את מבחן המיקום', 'Continue your placement test')}</h1>
        <p class="muted">${tt(`ענית על ${done} שאלות, והתשובות נשמרו. אפשר להמשיך מאותה נקודה או להתחיל מחדש.`, `You've answered ${done} questions, and your answers are saved. Continue from there or start again.`)}</p></div>
      <div class="row"><button type="button" class="key enter" data-begin>${tt('להמשיך', 'Continue')} ${arrow()}</button><a class="key ghost" href="#/placement?restart=1">${tt('להתחיל מחדש', 'Start again')}</a></div>`
      : html`<div class="stack-sm"><h1>${tt('מבחן מיקום קצר', 'A short placement test')}</h1>
        <p class="muted">${tt('כ-10 דקות. השאלות נעשות קלות או קשות לפי התשובות שלך, כדי למצוא את נקודת ההתחלה הנכונה.', 'About 10 minutes. Questions get easier or harder based on your answers, to find the right starting point.')}</p></div>
      <ul class="stack-sm small" style="padding-inline-start:1.2rem;margin:0">
        <li>${tt('אין ציון ואין ״נכשל״. זו רק נקודת פתיחה.', 'There is no score and no failing. It is only a starting point.')}</li>
        <li>${tt('לא בטוחים? ״לא יודע/ת״ עדיף על ניחוש: כך המיקום מדויק יותר.', 'Not sure? "I don\'t know" beats guessing: it makes the placement more accurate.')}</li>
        <li>${tt('יש שאלות האזנה. כדאי להגביר את הקול.', 'Some questions use audio, so turn your sound on.')}</li>
        <li>${tt('אפשר לעצור באמצע: התשובות נשמרות, וממשיכים מהמסך ״היום״.', 'You can stop at any point: your answers are saved, and you continue from Today.')}</li>
      </ul>
      <div class="row"><button type="button" class="key enter" data-begin>${tt('להתחיל', 'Begin')} ${arrow()}</button></div>`}
      <div class="row"><button type="button" class="key ghost small" data-zero>${tt('אני מעדיף/ה להתחיל מהבסיס', 'I\'d rather start from the basics')}</button></div>
    </div>`);
  }

  function nextItem() {
    ctl?.destroy?.();
    item = test.next();
    if (!item) return results();
    const asked = test.progress.asked + 1;
    render(el, html`<div class="player">
      <div class="player-top"><a class="key ghost small icon-only" href="#/today" aria-label="${tt('שמירה ויציאה', 'Save and leave')}">${icon('x')}</a>
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
    if (!test.done) savePlacementDraft({ start, answers: test.answers });
    recordAttempt({ source: 'placement', exercise: item.id, topic: item.topic, skill: item.skill, level: item.level, correct, response });
    nextItem();
  }

  async function results() {
    item = null;
    const r = test.result();
    await applyPlacement(r);
    const L = (l) => LEVEL_LABEL[l];
    // One level lower than the start: the level shown (or, at the top, the one below it).
    const lower = !r.demonstrated ? null : r.demonstrated !== r.start_level ? r.demonstrated : LEVELS[LEVELS.indexOf(r.start_level) - 1];
    const skillRow = (s, v) => html`<div class="row between small"><span>${t(`skill.${s}`)}</span><span class="faint">${v?.level
      ? html`<bdi dir="ltr">${L(v.level)}${v.capped ? '+' : ''}</bdi> <span class="xsmall">(${tt(`${v.items_at_level} שאלות ברמה הזו`, `${v.items_at_level} items at this level`)})</span>`
      : v?.items ? tt('אין מספיק תשובות', 'not enough answers') : tt('לא נבדק במבחן הזה', 'not measured by this test')}</span></div>`;
    render(el, html`<div class="onboard stack-lg">
      <div class="stack-sm"><h1>${tt('נקודת ההתחלה שלך', 'Your starting point')}</h1>
        <p class="muted">${!r.demonstrated
          ? tt('נתחיל מהבסיס, בקצב שלך. שיעורים שתדעו כבר יעברו מהר.', 'We\'ll start from the basics, at your pace. Lessons you already know will go quickly.')
          : r.top_band
            ? tt(`התשובות שלך בשאלות דקדוק, אוצר מילים, קריאה והאזנה מתאימות לרמה גבוהה (C1-C2). שאלות כאלה לבד לא קובעות רמה כזו, וכתיבה ודיבור לא נבדקו: משימת הכתיבה של הרמה היא הדרך להראות אותם. נתחיל ב-${L(r.start_level)}.`, `Your answers to grammar, vocabulary, reading and listening questions are consistent with C1-C2. Questions like these cannot establish that level on their own, and writing and speaking were not measured: the level's writing task is how to show them. We'll start at ${L(r.start_level)}.`)
            : tt(`הראית שליטה עד רמה ${L(r.demonstrated)}, בשתי סדרות של שאלות. נתחיל ב-${L(r.start_level)}, כדי לבנות מכאן הלאה.`, `You showed control up to ${L(r.demonstrated)}, over two sets of questions. We'll start at ${L(r.start_level)} and build from there.`)}</p></div>
      <div class="panel stack">
        <div class="row between"><span>${tt('מתחילים ב-', 'Starting at')}</span><span class="tag level" style="font-size:var(--t-md)">${L(r.start_level)}</span></div>
        ${r.items ? html`<div class="stack-sm">${['grammar', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'].map((s) => skillRow(s, r.skills[s]))}</div>` : ''}
        <p class="xsmall faint">${t('level.estimate')}. ${tt('זו הערכה ראשונית: רמה לכל מיומנות מופיעה רק אחרי שתי שאלות לפחות ברמה. מבחן כזה לבד לא קובע C1 או C2, ולכן הן מוצגות כ-', 'This is a first estimate: a skill gets a level only from at least two questions at that level, and a test like this never sets C1 or C2 on its own, so they show as ')}<bdi dir="ltr">B2+</bdi>. ${tt('ההערכה תתעדכן לפי מה שתעשו, ותמיד אפשר לשנות רמה במסלול.', 'It updates from what you do, and you can always change level on your path.')}</p>
      </div>
      <div class="row"><a class="key enter" href="#/today">${tt('לתוכנית של היום', 'To today\'s plan')} ${arrow()}</a><a class="key ghost" href="#/path">${tt('לראות את המסלול', 'See the path')}</a></div>
      ${lower ? html`<div class="panel flat stack-sm"><p class="small muted">${tt(`לא בטוחים? אפשר להתחיל ברמה ${L(lower)} במקום, או לבדוק אותה בבדיקת רמה קצרה.`, `Not sure? You can start at ${L(lower)} instead, or check it with a short level check.`)}</p>
        <div class="row"><button type="button" class="key small" data-lower="${lower}">${tt(`להתחיל ב-${L(lower)}`, `Start at ${L(lower)}`)}</button><a class="key ghost small" href="#/checkpoint/${lower}">${tt(`בדיקת רמה ${L(lower)}`, `${L(lower)} level check`)}</a></div></div>` : ''}
    </div>`);
  }

  if (ctx.query.resume && test.progress.asked && !test.done) nextItem(); else intro();
  const offs = [
    on(el, 'click', '[data-begin]', () => nextItem()),
    on(el, 'click', '[data-zero]', async () => { await applyPlacement(zeroResult()); ctx.navigate('lesson/pa1-01'); }),
    on(el, 'click', '[data-lower]', async (e, b) => { await moveToLevel(b.dataset.lower); toast(tt(`המסלול מתחיל עכשיו ב-${LEVEL_LABEL[b.dataset.lower]}`, `Your path now starts at ${LEVEL_LABEL[b.dataset.lower]}`)); ctx.navigate('today'); }),
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
