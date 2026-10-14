// בונה עמוד HTML סטטי לכל מוצר בחנות (shop/p/<slug>.html), מוסיף slug לקטלוג,
// מכניס נתונים מובנים (ItemList) לדף החנות ומעדכן את sitemap.xml.
// הרצה: node tools/build-products.mjs   (מתוך clinic/)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(resolve(root, f), "utf8");
const write = (f, s) => writeFileSync(resolve(root, f), s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const DOMAIN = (read("robots.txt").match(/Sitemap:\s*(https?:\/\/[^/\s]+)/) || [, "https://example.com"])[1];
const WA = "https://wa.me/972545779379";

// --- הקטלוג ---
const ctx = { window: {} }; vm.runInNewContext(read("js/products.js"), ctx);
const P = ctx.window.PRODUCTS;
const slugify = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const used = new Set();
P.forEach((p, i) => { let s = slugify(p.en) || "product-" + (i + 1); while (used.has(s)) s += "-" + i; used.add(s); p.slug = s; });

// slug נכתב חזרה לקטלוג (מקור אחד לכתובות המוצר)
let src = read("js/products.js");
P.forEach((p) => {
  const re = new RegExp('("name":\\s*"' + p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '")(,\\s*"slug":\\s*"[^"]*")?');
  if (re.test(src)) src = src.replace(re, `$1, "slug": "${p.slug}"`);
  else { const re2 = new RegExp("(name:\\s*\"" + p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\")(,\\s*slug:\\s*\"[^\"]*\")?"); src = src.replace(re2, `$1, slug: "${p.slug}"`); }
});
write("js/products.js", src);

// --- תבנית מתוך דף החנות ---
const shop = read("shop.html");
const R = "../../";
let head = shop.slice(0, shop.indexOf("<main id=\"main\">"));
let tail = shop.slice(shop.indexOf("</main>") + "</main>".length);
// נתיבים יחסיים + ניקוי דברים שלא שייכים לעמוד מוצר
const rel = (s) => s.replace(/(href|src|poster|data-wide|data-tall|content)="(?!https?:|#|mailto:|tel:|data:)(images|css|js|shop|services|index|accessibility|privacy|shop-info|treatments)/g, `$1="${R}$2`);
head = rel(head).replace(/<!-- ld:shop -->[\s\S]*?<!-- \/ld:shop -->/, "");
tail = rel(tail);
// מודאלים של החנות לא נחוצים בעמוד מוצר, אבל הרשימה והטוסט כן
tail = tail.replace(/<dialog class="drawer quiz"[\s\S]*?<\/dialog>\n/, "");
// קישורי תפריט פנימיים של החנות
head = head.replace(/href="#shop-main"/g, `href="${R}shop.html"`).replace(/href="#" id="nav-quiz"/, `href="${R}shop.html#quiz" id="nav-quiz-link"`).replace(/href="#" id="m-nav-quiz"/, `href="${R}shop.html#quiz"`).replace(/href="#" id="nav-list"/, `href="${R}shop.html#list" id="nav-list-link"`).replace(/href="#" id="m-nav-list"/, `href="${R}shop.html#list"`);
head = head.replace('<body class="page-shop">', '<body class="page-shop page-product" data-root="../../" data-page="product">');

const PRO = (p) => p.category === "ערכות וטיפול מקצועי";
function related(p) {
  const score = (q) => (q === p ? -1 : (q.category === p.category ? 2 : 0) + (q.brand === p.brand ? 1 : 0) + ((q.concerns || []).some((c) => (p.concerns || []).includes(c)) ? 1 : 0));
  return P.map((q) => ({ q, s: score(q) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 4).map((x) => x.q);
}
function card(q) {
  const i = P.indexOf(q);
  return `<li><a href="${q.slug}.html"><figure>${q.image ? `<img src="${R}${q.image}" alt="${esc(q.name)}" loading="lazy" decoding="async">` : '<span class="pp__noimg">תמונה בקרוב</span>'}</figure><b>${esc(q.name)}</b><small>${esc([q.brand, q.size].filter(Boolean).join(" · "))}</small></a></li>`;
}
const waAsk = (p) => `${WA}?text=${encodeURIComponent("היי, יש לי שאלה על " + p.name + (p.size ? " (" + p.size + ")" : "") + (p.brand && !p.name.includes(p.brand) ? " של " + p.brand : ""))}`;
const waOrder = (p) => `${WA}?text=${encodeURIComponent("היי, אשמח להזמין: " + p.name + (p.size ? " (" + p.size + ")" : "") + (p.brand && !p.name.includes(p.brand) ? " של " + p.brand : "") + "\nאפשר לקבל מחיר וזמינות?")}`;

const faq = (p) => [
  ["איך מזמינים?", "לוחצים על \"הוספה לרשימה\", ובחנות שולחים לי את הרשימה בוואטסאפ. אני מאשרת זמינות ומחיר בשעות הפעילות."],
  ["כמה זה עולה?", "המחיר נמסר בוואטסאפ עם אישור ההזמנה. ככה אני יכולה להתאים מחיר לסדרה, לערכה או לטיפול שאת עושה אצלי."],
  ["איך מקבלים?", "איסוף מהקליניקה במושב בניה ללא עלות, או משלוח בכל הארץ. עלות המשלוח וזמן ההגעה נמסרים באישור ההזמנה."],
  ...(PRO(p) ? [["למה המוצר הזה דורש אבחון?", "זה מוצר מקצועי בריכוז או בפרוטוקול שדורשים התאמה אישית. לפני שאני מוכרת אותו אני בודקת את העור ובונה איתך את שגרת השימוש."]] : []),
];

let count = 0; const dir = resolve(root, "shop/p"); mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (f.endsWith(".html")) unlinkSync(resolve(dir, f));
for (const p of P) {
  const i = P.indexOf(p); const rel4 = related(p);
  const title = `${p.name} | ${p.brand} | החנות של רותם`;
  const desc = (p.desc || "").slice(0, 150) + (p.size ? ` ${p.size}.` : "") + " אותו מוצר שאני עובדת איתו בקליניקה. הזמנה בוואטסאפ, איסוף או משלוח.";
  const ld = { "@context": "https://schema.org", "@type": "Product", name: p.name, alternateName: p.en || undefined, description: p.desc || undefined, brand: { "@type": "Brand", name: p.brand }, category: p.category, image: p.image ? `${DOMAIN}/${p.image}` : undefined, url: `${DOMAIN}/shop/p/${p.slug}.html` };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["דף הבית", ""], ["החנות", "shop.html"], [p.brand, `shop.html?brand=${encodeURIComponent(p.brand)}`], [p.name, `shop/p/${p.slug}.html`]].map(([n, u], k) => ({ "@type": "ListItem", position: k + 1, name: n, item: `${DOMAIN}/${u}` })) };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq(p).map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  let h = head.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`).replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(p.name + " | " + p.brand)}">`).replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${R}${p.image || "images/og-image.jpg"}">`).replace('<meta property="og:type" content="website">', '<meta property="og:type" content="product">')
    .replace("</head>", `  <script type="application/ld+json">${JSON.stringify(ld)}</script>\n  <script type="application/ld+json">${JSON.stringify(crumbs)}</script>\n  <script type="application/ld+json">${JSON.stringify(faqLd)}</script>\n</head>`);
  const media = p.image
    ? `<img src="${R}${p.image}" alt="${esc(p.name)}" width="800" height="${p.tall ? 1000 : 800}" fetchpriority="high">${p.model ? `<button type="button" class="qv-3d__open" data-open3d="${R}${p.model}" data-poster="${R}${p.cut || p.image}" data-name="${esc(p.name)}">סיבוב 360°</button>` : ""}`
    : `<div class="product-media-empty"><span>תמונה בקרוב</span></div>`;
  const main = `<main id="main">
  <article class="product-page" itemscope itemtype="https://schema.org/Product">
    <nav class="article__crumbs" aria-label="מיקום"><a href="${R}index.html">דף הבית</a> / <a href="${R}shop.html">החנות</a> / <a href="${R}shop.html?brand=${encodeURIComponent(p.brand)}">${esc(p.brand)}</a> / <span aria-current="page">${esc(p.name)}</span></nav>
    <div class="pp">
      <figure class="pp__media${p.model ? " qv-3d" : ""}">${media}</figure>
      <div class="pp__body">
        <p class="product-meta">${esc([p.brand, p.category, p.size].filter(Boolean).join(" · "))}</p>
        <h1 itemprop="name">${esc(p.name)}</h1>
        ${p.en ? `<p class="pp__en">${esc(p.en)}</p>` : ""}
        <p class="desc" itemprop="description">${esc(p.desc || "")}</p>
        ${(p.concerns || []).length ? `<div class="qv-tags" aria-label="מתאים ל">${p.concerns.map((c) => `<a href="${R}shop.html?goal=${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}</div>` : ""}
        <p class="price-ask pp__price">המחיר נמסר בוואטסאפ עם אישור הזמינות</p>
        <div class="qv-actions">
          <button class="btn btn-gold" type="button" data-save="${i}" data-track="add_to_list_page">הוספה לרשימה</button>
          <a class="btn btn-outline" href="${waAsk(p)}" target="_blank" rel="noopener">שאלה על המוצר</a>
        </div>
        <p class="pp__note">איסוף מהקליניקה ללא עלות · משלוח בכל הארץ · <a href="${R}shop-info.html">תשלום, משלוחים והחזרות</a></p>
        ${PRO(p) ? `<p class="pp__pro">מוצר מקצועי: נמכר אחרי אבחון קצר אצלי, כדי להתאים ריכוז ושגרה. <a href="${R}index.html?goal=ייעוץ ואבחון#contact">קביעת אבחון</a></p>` : ""}
        <div class="pp__faq">${faq(p).map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
      </div>
    </div>
    ${rel4.length ? `<section class="pp__related" aria-labelledby="rel-title"><h2 id="rel-title">משלים את הטיפול</h2><ul>${rel4.map(card).join("")}</ul></section>` : ""}
    <p class="pp__back"><a class="link-line" href="${R}shop.html?brand=${encodeURIComponent(p.brand)}">כל המוצרים של ${esc(p.brand)}</a> · <a class="link-line" href="${R}shop.html?cat=${encodeURIComponent(p.category)}">עוד ${esc(p.category)}</a></p>
  </article>
</main>`;
  write(`shop/p/${p.slug}.html`, h + main + tail); count++;
}

// --- נתונים מובנים לדף החנות ---
const list = { "@context": "https://schema.org", "@type": "ItemList", name: "החנות של רותם", numberOfItems: P.length, itemListElement: P.map((p, k) => ({ "@type": "ListItem", position: k + 1, url: `${DOMAIN}/shop/p/${p.slug}.html`, name: p.name })) };
write("shop.html", shop.replace(/<!-- ld:shop -->[\s\S]*?<!-- \/ld:shop -->/, `<!-- ld:shop --><script type="application/ld+json">${JSON.stringify(list)}</script><!-- /ld:shop -->`));

// --- מפת אתר ---
const today = new Date().toISOString().slice(0, 10);
const urls = [["", "1.0", "weekly"], ["services.html", "0.9", "monthly"], ["shop.html", "0.8", "weekly"], ["treatments/acne.html", "0.8", "monthly"], ["treatments/pigmentation.html", "0.8", "monthly"], ["treatments/laser-hair-removal.html", "0.8", "monthly"], ["treatments/diabetic-pedicure.html", "0.8", "monthly"], ["shop-info.html", "0.5", "yearly"], ["privacy.html", "0.3", "yearly"], ["accessibility.html", "0.3", "yearly"], ...P.map((p) => [`shop/p/${p.slug}.html`, "0.6", "monthly"])];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<!-- נוצר על ידי tools/build-products.mjs. הדומיין נלקח מ-robots.txt; להחלפה: node tools/set-domain.mjs https://הדומיין -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, pr, cf]) => `  <url><loc>${DOMAIN}/${u}</loc><lastmod>${today}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`).join("\n")}\n</urlset>\n`);
console.log(`product pages: ${count}, sitemap urls: ${urls.length}, domain: ${DOMAIN}`);
