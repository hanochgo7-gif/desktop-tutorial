/*
 * Builds the pages Google can find: one page per product (p/<id>.html), one per category (c/<slug>.html),
 * plus sitemap.xml and robots.txt. Run after changing products or prices:  node tools/build-seo.js
 * Tobacco, smoking accessories and alcohol get no pages (advertising rules); they stay in the store itself.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://www.allenbis.co.il';
global.window = {};
for (const f of ['catalog.js', 'demo-data.js', 'shelf-cut.js']) require(path.join(ROOT, f));
const { products, currency } = window.ALLENBIS_CATALOG;
const DEMO = window.ALLENBIS_DEMO || {};
const CUT = window.ALLENBIS_CUT || {};
const D = DEMO.delivery || {};
const ETA = D.etaMinutes || 20;
const AREA = D.area || 'מרכז תל אביב';

const SLUGS = { 'שתייה': 'drinks', 'חטיפים': 'snacks', 'ממתקים': 'candy', 'עוגיות': 'cookies', 'גלידות': 'ice-cream', 'מזון': 'food', 'אביזרי סלולר': 'phone-accessories', 'אחר': 'other' };
const deals = DEMO.deals?.items || {};
const oos = new Set(DEMO.outOfStock?.ids || []);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const priced = p => ['verified', 'owner-configured'].includes(p.priceReview?.status) && Number.isFinite(p.price) && p.price > 0;
const regular = p => Math.round(p.price * 100);
const unit = p => deals[p.id] && deals[p.id] < regular(p) ? deals[p.id] : regular(p);
const shekels = m => (m / 100).toFixed(2);
const money = m => `${(m % 100 ? (m / 100).toFixed(2) : String(m / 100))} ₪`;
const imgOf = p => CUT[p.id] ? `images/cut/${p.id}.webp` : p.imageReview?.status === 'verified' && p.img ? p.img : null;
const listed = products.filter(p => p.active !== false && p.buy && SLUGS[p.category] && priced(p));
const inStock = p => p.availability !== 'out_of_stock' && !oos.has(p.id);

function shell({ title, description, canonical, image, body, ld }) {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="אלנביס">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
${image ? `<meta property="og:image" content="${SITE}/${image}">\n` : ''}<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../legal.css">
<link rel="stylesheet" href="../pages.css">
${ld.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body>
<a class="skip" href="#main">דילוג לתוכן</a>
<header><div class="bar"><a class="sign" href="../" aria-label="אלנביס, לחנות"><b>אלנביס</b><small dir="ltr">Allenbis St.</small></a><a class="back" href="../">לחנות ←</a></div></header>
<main id="main">
${body}
</main>
<footer><nav aria-label="קטגוריות">${Object.entries(SLUGS).filter(([c]) => listed.some(p => p.category === c)).map(([c, s]) => `<a href="../c/${s}.html">${esc(c)}</a>`).join('')}</nav>
<nav aria-label="מידע">${[['terms.html', 'תקנון'], ['returns.html', 'ביטולים והחזרות'], ['privacy.html', 'פרטיות'], ['accessibility.html', 'הצהרת נגישות']].map(([f, t]) => `<a href="../${f}">${t}</a>`).join('')}</nav></footer>
</body>
</html>
`;
}
const crumbs = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) });
const card = p => {
  const img = imgOf(p);
  return `<a class="pcard" href="../p/${p.id}.html">${img ? `<img src="../${img}" alt="" loading="lazy">` : '<span class="noimg"></span>'}<span class="pn">${esc(p.name)}</span><span class="pp">${money(unit(p))}${unit(p) < regular(p) ? ` <s>${money(regular(p))}</s>` : ''}</span></a>`;
};

fs.mkdirSync(path.join(ROOT, 'p'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'c'), { recursive: true });
const urls = [`${SITE}/`];

for (const p of listed) {
  const slug = SLUGS[p.category];
  const img = imgOf(p);
  const url = `${SITE}/p/${p.id}.html`;
  const title = `${p.name} במשלוח עד ${ETA} דק׳ | אלנביס ${AREA}`;
  const description = `${p.name} ב-${money(unit(p))}. משלוח עד ${ETA} דקות ב${AREA}, 24/7. מזמינים באתר ומקבלים עד הדלת.`;
  const related = listed.filter(x => x.category === p.category && x.id !== p.id).slice(0, 8);
  const body = `<nav class="crumbs" aria-label="פירורי לחם"><a href="../">אלנביס</a> › <a href="../c/${slug}.html">${esc(p.category)}</a> › <span>${esc(p.name)}</span></nav>
<article class="product">
${img ? `<div class="pimg"><img src="../${img}" alt="${esc(p.name)}"></div>` : ''}
<div class="pinfo">
<h1>${esc(p.name)}</h1>
<p class="price">${money(unit(p))}${unit(p) < regular(p) ? ` <s>${money(regular(p))}</s> <span class="sale">מבצע</span>` : ''}</p>
<p class="stock ${inStock(p) ? 'in' : 'out'}">${inStock(p) ? `במלאי · משלוח עד ${ETA} דקות` : 'אזל כרגע'}</p>
<dl class="facts"><dt>קטגוריה</dt><dd><a href="../c/${slug}.html">${esc(p.category)}</a></dd>${p.sub ? `<dt>סוג</dt><dd>${esc(p.sub)}</dd>` : ''}${p.size ? `<dt>גודל</dt><dd>${esc(p.size)}</dd>` : ''}<dt>אזור משלוח</dt><dd>${esc(AREA)}, 24/7</dd></dl>
<a class="cta" href="../?p=${p.id}">להזמנה באתר</a>
</div>
</article>
${related.length ? `<section><h2>עוד ב${esc(p.category)}</h2><div class="pgrid">${related.map(card).join('')}</div></section>` : ''}`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.id, category: p.category,
    ...(img ? { image: `${SITE}/${img}` } : {}),
    offers: { '@type': 'Offer', url, priceCurrency: currency || 'ILS', price: shekels(unit(p)), availability: `https://schema.org/${inStock(p) ? 'InStock' : 'OutOfStock'}`, seller: { '@type': 'ConvenienceStore', name: 'אלנביס' } }
  }, crumbs([['אלנביס', `${SITE}/`], [p.category, `${SITE}/c/${slug}.html`], [p.name, url]])];
  fs.writeFileSync(path.join(ROOT, 'p', `${p.id}.html`), shell({ title, description, canonical: url, image: img, body, ld }));
  urls.push(url);
}

for (const [cat, slug] of Object.entries(SLUGS)) {
  const list = listed.filter(p => p.category === cat);
  if (!list.length) continue;
  const url = `${SITE}/c/${slug}.html`;
  const title = `${cat} במשלוח עד ${ETA} דקות ב${AREA} | אלנביס 24/7`;
  const description = `${list.length} מוצרים ב${cat}: ${list.slice(0, 5).map(p => p.name).join(', ')} ועוד. משלוח עד ${ETA} דקות ב${AREA}, 24/7.`;
  const body = `<nav class="crumbs" aria-label="פירורי לחם"><a href="../">אלנביס</a> › <span>${esc(cat)}</span></nav>
<h1>${esc(cat)} עד הדלת, תוך ${ETA} דקות</h1>
<p class="lead">${list.length} מוצרים ב${esc(cat)}, במשלוח ב${esc(AREA)} 24 שעות ביממה. <a href="../?c=${encodeURIComponent(cat)}">לקנייה בחנות</a></p>
<div class="pgrid">${list.map(card).join('')}</div>`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: cat, itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/p/${p.id}.html`, name: p.name })) },
    crumbs([['אלנביס', `${SITE}/`], [cat, url]])];
  fs.writeFileSync(path.join(ROOT, 'c', `${slug}.html`), shell({ title, description, canonical: url, image: list.map(imgOf).find(Boolean), body, ld }));
  urls.push(url);
}
for (const f of ['terms.html', 'returns.html', 'privacy.html', 'accessibility.html']) urls.push(`${SITE}/${f}`);

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`built ${listed.length} product pages, ${urls.length - listed.length - 5} category pages, sitemap with ${urls.length} urls`);
