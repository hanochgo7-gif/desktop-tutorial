// Collects public, dated, rated app-store reviews for the competitor set.
// Sources: Apple's customer-review RSS feed (500 most recent per storefront) and
// Google Play (via google-play-scraper: newest, plus newest 1-, 2- and 3-star so
// negative reviews are represented). Writes raw JSONL to the path given as argv[2].
// The raw text is research input only and is not committed; see docs/research.
import gplay from 'google-play-scraper';
import { writeFileSync, appendFileSync } from 'node:fs';

const OUT = process.argv[2] || 'reviews.jsonl';
const APPS = [
  { key: 'duolingo', ios: 570060128, play: 'com.duolingo' },
  { key: 'babbel', ios: 829587759, play: 'com.babbel.mobile.android.en' },
  { key: 'busuu', ios: 379968583, play: 'com.busuu.android.enc' },
  { key: 'memrise', ios: 635966718, play: 'com.memrise.android.memrisecompanion' },
  { key: 'elsa', ios: 1083804886, play: 'us.nobarriers.elsa' },
  { key: 'rosetta', ios: 435588892, play: 'air.com.rosettastone.mobile.CoursePlayer' },
  { key: 'lingq', ios: 379385811, play: 'com.linguist' },
  { key: 'speak', ios: 1286609883, play: 'com.selabs.speak' },
  { key: 'praktika', ios: 1624701477, play: 'ai.praktika.android' },
  { key: 'quizlet', ios: 546473125, play: 'com.quizlet.quizletandroid' },
  { key: 'bc-grammar', ios: 488099900, play: 'bc.leg' },
  { key: 'bc-english', ios: 1601249801, play: 'org.britishcouncil.englishonline' },
  { key: 'cambly', ios: 564024107, play: 'com.cambly.cambly' },
  { key: 'loora', ios: null, play: 'com.loora.app' },
];
const COUNTRIES = ['us', 'gb', 'il', 'in'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
writeFileSync(OUT, '');
const seen = new Set();
const emit = (row) => {
  const k = `${row.store}:${row.id}`;
  if (seen.has(k)) return;
  seen.add(k);
  appendFileSync(OUT, JSON.stringify(row) + '\n');
};

async function ios(app, cc) {
  let n = 0;
  for (let page = 1; page <= 10; page++) {
    const url = `https://itunes.apple.com/${cc}/rss/customerreviews/page=${page}/id=${app.ios}/sortBy=mostRecent/json`;
    let data;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url);
        if (res.status === 200) { data = await res.json(); break; }
      } catch {}
      await sleep(3000 * (attempt + 1));
    }
    const entries = data?.feed?.entry;
    if (!entries) break;
    for (const e of [].concat(entries)) {
      if (!e['im:rating']) continue;
      emit({
        app: app.key, store: 'appstore', country: cc, id: e.id.label,
        rating: Number(e['im:rating'].label), date: e.updated.label.slice(0, 10),
        version: e['im:version']?.label || null, title: e.title?.label || '',
        text: e.content?.label || '', source: url,
      });
      n++;
    }
    await sleep(900);
  }
  return n;
}

async function play(app, opts, tag) {
  try {
    const r = await gplay.reviews({ appId: app.play, sort: gplay.sort.NEWEST, num: opts.num, lang: opts.lang, country: opts.country, filterScoreWith: opts.score });
    for (const v of r.data) {
      emit({
        app: app.key, store: 'play', country: opts.country, lang: opts.lang, sample: tag, id: v.id,
        rating: v.score, date: new Date(v.date).toISOString().slice(0, 10), version: v.version || null,
        title: '', text: v.text || '', thumbsUp: v.thumbsUp,
        source: `https://play.google.com/store/apps/details?id=${app.play}&hl=${opts.lang}&gl=${opts.country}`,
      });
    }
    return r.data.length;
  } catch (e) { console.error('play', app.key, tag, e.message); return 0; }
}

for (const app of APPS) {
  const counts = {};
  if (app.ios) for (const cc of COUNTRIES) counts[`ios-${cc}`] = await ios(app, cc);
  counts['play-newest'] = await play(app, { num: 200, lang: 'en', country: 'us' }, 'newest');
  for (const s of [1, 2, 3]) counts[`play-${s}star`] = await play(app, { num: 60, lang: 'en', country: 'us', score: s }, `newest-${s}star`);
  counts['play-he'] = await play(app, { num: 100, lang: 'iw', country: 'il' }, 'newest-he');
  console.log(app.key, JSON.stringify(counts));
}
console.log('total unique', seen.size);
