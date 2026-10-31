// Conversation simulations: every scenario as a roleplay with an AI partner, with what is needed to use
// it when AI is not available. Same topics, filters and level guidance as Real life (persona panel P-46).
import { html, render, on } from '../core/util.js';
import { tt, t, legend } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, levelTag, emptyState, confirmDialog, toast } from '../ui/components.js';
import { configured, auth } from '../core/api.js';
import { settings, model } from '../core/learner.js';
import { store } from '../core/store.js';
import { CONFIG } from '../../config.js';
import { MODULES, fitNote, levelGuide, hubFilters, hubSections, hubEvents } from './reallife.js';

export default async function simulations(el, ctx) {
  ctx.setTitle(t('nav.simulations'));
  const data = await content.scenarios();
  const list = data?.scenarios || [];
  const aiReady = configured() && CONFIG.aiEnabled && auth.signedIn && settings().ai_consent;
  const state = { module: MODULES.some(([id]) => id === ctx.query.m) ? ctx.query.m : 'all', scope: 'all', open: new Set() };
  const why = !configured() || !CONFIG.aiEnabled ? tt('שיחה חופשית עם AI עוד לא זמינה באתר הזה. התרגול המובנה בכל תרחיש עובד בלי AI.', 'Free conversation with AI is not available on this site yet. The scripted practice in every scenario works without AI.')
    : !auth.signedIn ? tt('שיחה עם AI דורשת חשבון: ההסכמה שלכם לעיבוד ב-AI נשמרת בחשבון, ולכל חשבון יש מגבלת שימוש יומית ב-AI. התרגול המובנה בכל תרחיש עובד גם בלי חשבון.', 'AI conversations need an account: your consent to AI processing is saved in it, and each account has a daily AI limit. The scripted practice in every scenario works without one.') : tt('הפעילו ״משוב AI״ בהגדרות כדי להתחיל.', 'Turn on "AI feedback" in Settings to start.');
  // No account: both ways in, sign-up first on a device that has never been signed in (persona panel R2-09).
  const accountLinks = () => {
    if (!configured() || auth.signedIn) return '';
    const up = html`<a class="key small" href="#/account?mode=signup&next=conversations">${tt('יצירת חשבון', 'Create an account')}</a>`;
    const inn = html`<a class="key small ${store.owner() ? '' : 'ghost'}" href="#/account?mode=signin&next=conversations">${tt('כניסה לחשבון קיים', 'Sign in')}</a>`;
    return html`<div class="row" style="margin-block-start:var(--s2)">${store.owner() ? html`${inn}${up}` : html`${up}${inn}`}</div>`;
  };

  const row = (s, courseLevel) => html`<a class="lesson-row hub-row two" href="#/scenario/${s.id}?tab=${aiReady ? 'roleplay' : 'practise'}"><span class="grow">${legend(s.title_en, s.title_he)}<span class="meta" style="display:block">${tt(s.goal?.he || '', s.goal?.en || '')}</span></span><span class="hub-level">${levelTag(s.level)}${fitNote(s.level, courseLevel)}</span></a>`;

  function draw() {
    const courseLevel = model().courseLevel;
    // Recent conversations say the outcome in words; the scores are in each report (P-16).
    const past = store.all('chats').filter((c) => c.kind === 'roleplay' && c.report).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 5);
    render(el, html`
      <div class="page-head"><div><p class="small faint"><a href="#/real-life">${t('nav.reallife')}</a></p><h1>${t('nav.simulations')}</h1><p>${tt('ה-AI משחק את הצד השני ואתם עונים באנגלית. בסוף מקבלים משוב: מה עבד, ניסוחים טבעיים יותר ומה לתרגל.', 'The AI plays the other person and you answer in English. At the end you get feedback: what worked, more natural phrasing and what to practise.')}</p></div></div>
      ${!aiReady ? html`<div class="banner" style="margin-block-end:var(--s5)">${icon('info', { size: 18 })}<div><p>${why}</p>${accountLinks()}</div></div>` : ''}
      ${past.length ? html`<section class="stack-sm" style="margin-block-end:var(--s6)"><h2 class="small" style="font-size:var(--t-md)">${tt('שיחות אחרונות', 'Recent conversations')}</h2>${past.map((c) => { const s = list.find((x) => x.id === c.scenario); return html`<div class="row" style="flex-wrap:nowrap"><a class="lesson-row hub-row two grow" href="#/scenario/${c.scenario}?tab=roleplay"><span lang="en" dir="ltr">${s?.title_en || c.scenario}</span>${c.report.task_completed ? html`<span class="tag ok">${tt('המטרה הושגה', 'Goal reached')}</span>` : html`<span class="tag warn">${tt('עוד לא', 'Not yet')}</span>`}</a><button type="button" class="key ghost small" data-del-chat="${c.id}" aria-label="${tt(`מחיקת השיחה: ${s?.title_he || c.scenario}`, `Delete conversation: ${s?.title_en || c.scenario}`)}">${icon('trash', { size: 16 })}</button></div>`; })}</section>` : ''}
      ${!list.length ? emptyState({ title: tt('אין עדיין תרחישים', 'No scenarios yet') }) : html`${levelGuide(courseLevel)}${hubFilters(state)}${hubSections(list, state, courseLevel, (s) => row(s, courseLevel))}`}`);
  }
  draw();
  const offHub = hubEvents(el, state, draw);
  // Deleting removes the transcript and report; sync sends only the id (security review S-18).
  const offDel = on(el, 'click', '[data-del-chat]', async (e, b) => {
    const ok = await confirmDialog({ title: tt('למחוק את השיחה?', 'Delete this conversation?'), body: tt('התמליל והמשוב יימחקו מהמכשיר ומהחשבון.', 'The transcript and feedback are removed from this device and your account.'), confirm: tt('מחיקה', 'Delete') });
    if (!ok) return;
    store.remove('chats', b.dataset.delChat);
    toast(tt('השיחה נמחקה', 'Conversation deleted'));
    draw();
  });
  return () => { offHub?.(); offDel(); };
}
