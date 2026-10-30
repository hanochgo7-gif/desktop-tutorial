// Conversation simulations: every scenario as a roleplay with an AI partner, with what is needed
// to use it when AI is not available.
import { html, render } from '../core/util.js';
import { tt, t, legend } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, levelTag, emptyState } from '../ui/components.js';
import { configured, auth } from '../core/api.js';
import { settings } from '../core/learner.js';
import { store } from '../core/store.js';
import { CONFIG } from '../../config.js';
import { MODULES } from './reallife.js';

export default async function simulations(el, ctx) {
  ctx.setTitle(t('nav.simulations'));
  const data = await content.scenarios();
  const list = data?.scenarios || [];
  const aiReady = configured() && CONFIG.aiEnabled && auth.signedIn && settings().ai_consent;
  const past = store.all('chats').filter((c) => c.kind === 'roleplay' && c.report).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 5);
  render(el, html`
    <div class="page-head"><div><h1>${t('nav.simulations')}</h1><p>${tt('שיחות אמיתיות: ה-AI משחק את הצד השני, אתם עונים באנגלית, ובסוף מקבלים ציון, משוב וניסוחים טבעיים יותר.', 'Real conversations: the AI plays the other person, you answer in English, and at the end you get a score, feedback and more natural phrasing.')}</p></div></div>
    ${!aiReady ? html`<p class="banner" style="margin-block-end:var(--s5)">${icon('info', { size: 18 })}<span>${!configured() || !CONFIG.aiEnabled ? tt('שיחה חופשית עם AI עוד לא הוגדרה בשרת הזה. התרגול המובנה בכל תרחיש עובד בלי AI.', 'Free AI conversation is not configured on this server yet. The scripted practice in every scenario works without AI.') : !auth.signedIn ? tt('כדי לדבר עם AI צריך להיכנס לחשבון.', 'Sign in to talk with the AI.') : tt('הפעילו ״משוב AI״ בהגדרות כדי להתחיל.', 'Turn on "AI feedback" in Settings to start.')}</span></p>` : ''}
    ${past.length ? html`<section class="stack-sm" style="margin-block-end:var(--s6)"><h2 class="small" style="font-size:var(--t-md)">${tt('שיחות אחרונות', 'Recent conversations')}</h2>${past.map((c) => { const s = list.find((x) => x.id === c.scenario); return html`<a class="lesson-row" href="#/scenario/${c.scenario}?tab=roleplay" style="grid-template-columns:1fr auto"><span lang="en" dir="ltr">${s?.title_en || c.scenario}</span><span class="tag level num">${c.report.conversation_score}/100</span></a>`; })}</section>` : ''}
    ${!list.length ? emptyState({ title: tt('אין עדיין תרחישים', 'No scenarios yet') }) : html`<div class="stack-lg">${MODULES.map(([id, ic, he, en]) => {
      const items = list.filter((s) => s.module === id);
      return items.length ? html`<section class="stack-sm"><h2 class="row" style="font-size:var(--t-lg)">${icon(ic)} ${tt(he, en)}</h2>
        <ul class="lesson-list" style="list-style:none;padding:0;margin:0">${items.map((s) => html`<li><a class="lesson-row" href="#/scenario/${s.id}?tab=${aiReady ? 'roleplay' : 'practise'}" style="grid-template-columns:1fr auto"><span class="grow">${legend(s.title_en, s.title_he)}<span class="meta" style="display:block" lang="en" dir="ltr">${s.roleplay?.complication || ''}</span></span>${levelTag(s.level)}</a></li>`)}</ul></section>` : '';
    })}</div>`}`);
}
