// The help card shown when the AI flags a safety concern (audit BLK-09 / TS-05): a learner wrote that they may be
// in distress, at risk of harming themselves or someone else, harmed or abused, or in danger. The AI steps out of
// its role and replies briefly; the card below is Lucid's own fixed text, never the model's, so the numbers in it
// cannot be made up. It appears only on an AI response, so it never shows on a site where AI is off (aiEnabled).
//
// Each number was checked on 11 November 2026 (the operator or legal should confirm them before AI is turned on):
// - 101 Magen David Adom (ambulance) and 100 Israel Police: Tel Aviv University, "Emergency Contacts"
//   (https://english.tau.ac.il/node/600) and Nefesh B'Nefesh, "Important Numbers"
//   (https://www.nbn.org.il/next-steps/emergency-information/).
// - 1201 ERAN, emotional first aid by phone, "24/7, 365 days a year": ERAN, "Emotional First Aid"
//   (https://en.eran.org.il/emotional-first-aid/).
// - 105 the National Center for Protecting Children Online (Israel Police and the Ministry of National Security),
//   for harm to children and teens on the internet, at any hour: gov.il, "The 105 hotline"
//   (https://www.gov.il/en/departments/Units/105_call_center). It is not a general child helpline, so the card
//   names what it is for.
import { html } from './util.js';
import { tt, isolateLatin } from './i18n.js';

export const HELP_LINES = [
  { number: '101', he: 'בסכנה מיידית: מד״א (אמבולנס)', en: 'In immediate danger: Magen David Adom (ambulance)' },
  { number: '100', he: 'משטרה', en: 'Police' },
  { number: '1201', he: 'ער״ן, עזרה ראשונה נפשית בטלפון, בכל שעה', en: 'ERAN, emotional first aid by phone, any time' },
  { number: '105', he: 'פגיעה בילדים ובבני נוער ברשת, בכל שעה', en: 'Harm to children and teens online, any time' },
];

// The card. `level` is the heading level that fits where it is shown.
export function supportCard({ level = 2 } = {}) {
  const h = tt('אפשר לקבל עזרה עכשיו', 'Help is available now');
  const head = level === 3 ? html`<h3 class="small" id="support-h">${h}</h3>` : html`<h2 class="small" id="support-h">${h}</h2>`;
  return html`<section class="panel stack-sm support-card" aria-labelledby="support-h" data-help-card>
    ${head}
    <p class="small">${isolateLatin(tt('מה שכתבתם חשוב יותר מהשיעור. Lucid הוא כלי ללימוד אנגלית, והוא לא יכול לעזור בזה בעצמו.', 'What you wrote matters more than the lesson. Lucid is a tool for learning English and cannot help with this itself.'))}</p>
    <p class="small">${tt('כדאי לספר עכשיו למבוגר שאתם סומכים עליו או למישהו קרוב אליכם.', 'Please tell an adult you trust, or someone close to you, now.')}</p>
    <ul class="small stack-sm support-lines">${HELP_LINES.map((l) => html`<li>${tt(l.he, l.en)}: <a class="num" href="tel:${l.number}" dir="ltr">${l.number}</a></li>`)}</ul>
    <p class="xsmall faint">${tt('המספרים הם של ישראל. מחוץ לישראל, התקשרו למספר החירום המקומי.', 'These numbers are for Israel. Outside Israel, call your local emergency number.')}</p>
  </section>`;
}
