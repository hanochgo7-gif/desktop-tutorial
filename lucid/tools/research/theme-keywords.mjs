// Keyword cross-check over the WHOLE review corpus (not just the coded sample).
// Counts how many reviews match each theme's patterns, per app and rating band.
// Keyword matching is approximate (no negation handling) and is reported only as a
// cross-check on the manually coded sample, never as the primary finding.
import { readFileSync, writeFileSync } from 'node:fs';
const [IN, OUT] = process.argv.slice(2);
const THEMES = {
  ads: /\b(ads?|adverts?|advertis\w*|commercials?)\b/i,
  price_subscription: /\b(expensive|overpriced|price[ds]?|pricing|subscription|paywall|pay ?wall|too much money|premium|super|max plan|costs? (too )?much)\b/i,
  billing_cancellation: /\b(cancel\w*|refund\w*|charged|charge me|auto-?renew\w*|billing|unsubscrib\w*|free trial)\b/i,
  hearts_energy_limits: /\b(hearts?|energy|lives)\b/i,
  repetitive: /\b(repetitive|repeats?|repeating|same (questions|thing|exercises|words|sentences)|boring|tedious)\b/i,
  poor_explanations: /\b(no explanations?|doesn'?t explain|not explain\w*|without explanation|grammar (is|isn'?t) explained|explanations? (are|is) (poor|bad|lacking|missing))\b/i,
  speech_recognition: /\b(speech recognition|voice recognition|microphone|mic\b|doesn'?t (hear|recogni[sz]e|understand) (me|my)|recogni[sz]e my (voice|accent|speech)|pronunciation (is )?(marked|scored) wrong)\b/i,
  bugs_ui: /\b(bugs?|buggy|glitch\w*|crash\w*|freez\w*|lag\w*|won'?t load|doesn'?t load|not loading)\b/i,
  plateau_advanced: /\b(advanced|beyond (the )?basics|intermediate|plateau|fluent|fluency|too easy|only (the )?basics)\b/i,
  writing_practice: /\b(writing|essay|write (sentences|paragraphs|essays))\b/i,
  conversation_ai: /\b(ai|chatbot|conversation partner|role ?play|video call|lily)\b/i,
  gamification_streak: /\b(streaks?|gamif\w*|leagues?|leaderboard|xp|gems|badges?|owl)\b/i,
  offline: /\b(offline|no internet|without internet|wifi|wi-fi)\b/i,
  personalization: /\b(personali[sz]\w*|my level|adaptive|tailored|custom\w*)\b/i,
  notifications: /\b(notifications?|reminders?|spam\w*)\b/i,
  progress_loss: /\b(lost (my )?(progress|streak|data)|progress (was )?(gone|lost|reset)|reset my)\b/i,
  support: /\b(customer (service|support)|no (reply|response)|support team|contacted support)\b/i,
};
const rows = readFileSync(IN, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => !/[֐-׿]/.test(r.text));
const out = {};
for (const r of rows) {
  const band = r.rating <= 2 ? 'neg' : r.rating === 3 ? 'mid' : 'pos';
  const a = (out[r.app] ||= { n: { neg: 0, mid: 0, pos: 0 }, themes: {} });
  a.n[band]++;
  const t = `${r.title} ${r.text}`;
  for (const [k, re] of Object.entries(THEMES)) if (re.test(t)) { const c = (a.themes[k] ||= { neg: 0, mid: 0, pos: 0 }); c[band]++; }
}
writeFileSync(OUT, JSON.stringify({ generated_from: rows.length + ' English-language reviews', themes: Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v.source])), apps: out }, null, 1));
console.log('reviews', rows.length);
for (const [app, a] of Object.entries(out)) {
  const top = Object.entries(a.themes).map(([k, c]) => [k, c.neg]).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, n]) => `${k}:${n}`).join(' ');
  console.log(app.padEnd(11), `neg=${a.n.neg} mid=${a.n.mid} pos=${a.n.pos} | top neg themes: ${top}`);
}
