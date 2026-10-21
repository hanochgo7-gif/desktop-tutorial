# MIFTAH (מיפתח פרויקטים): SEO strategy for 5 flagship articles

Prepared: 21 Oct 2026 · For: the MIFTAH article team · Follows the hard rules in `brief.md`. No company numbers are invented, every statistic below has a URL, and the brief's terminology is used throughout.

---

## 0. How this research was done (read first)

- **SERP method and its limits.** I could not scrape live Google.co.il results from this environment: Google returns a JS redirect, Bing returns "no results" to bots, and DuckDuckGo, Brave and Mojeek block automated requests. I rebuilt the competitive picture three ways. First, many Hebrew and English search-API queries (standard and extended). Second, direct inspection of the pages that rank and of competitor sites. Third, primary sources (Ministry of Agriculture, Volcani/ARO, Northern R&D, peer-reviewed papers).
- **Before writing, someone must check by hand** each primary keyword in Google.co.il (incognito, Hebrew UI). Record the top 10 and the People Also Ask box, and pull volumes from Google Keyword Planner (Israel / Hebrew) or Ahrefs/Semrush. **Volumes in this document are relative estimates, not measured numbers.**
- **The PAA questions** below are modelled on real query patterns from the research, because live PAA boxes were not available. Validate them in the manual SERP check.

### State of miftah.co.il today (checked 21 Oct 2026)
- The site loads only over **http**. `https://www.miftah.co.il` fails with an SSL certificate name mismatch. This is a ranking and trust problem, so fix it before publishing.
- It is an old WordPress theme (dt-the7, 2015 uploads). URLs are percent-encoded Hebrew slugs, there is no blog or knowledge section, the homepage has thin copy, and an English toggle exists (`?lang=en`).
- The site still lists "פתרונות קירוי והצללה אזרחיים". Per the brief that service is discontinued, so remove it from the new site and never link to it.
- **Implication:** the 5 articles will be the site's first real topical content. They need a clean hub (`/net-houses`), English slugs, `hreflang` he/en, Article + Organization schema, and an author box (Yiftach Hasfel, Technion construction practical engineer) for E-E-A-T.

---

## 1. SERP findings (evidence)

### 1.1 The three most important insights

1. **No one in Hebrew owns the "agricultural net-house project" topic. The SERPs are polluted and thin.**
   - "בית רשת", "הקמת בתי רשת" and "בית רשת מה זה" pull in computer-network and home-network results ("רשת ביתית", "הקמת רשת מחשבים"). Examples: complit.co.il, vipsystems.co.il, shirin.co.il, midrag.co.il/content/tip/6341.
   - Net-related agricultural queries ("רשת נגד ברד", "אחוזי הצללה", "רשת נגד חרקים 50 מש") are dominated by **retail product pages and home/garden content**:
     - midrag.co.il (window, mosquito and pigeon nets)
     - amazon.com/-/he (garden hail cloth)
     - arm.co.il, home360.co.il, gardensheds.co.il, mygan.co.il, zurmarket.co.il
     - eyouagro.com (Chinese net seller, Hebrew pages)
   - The only Israeli structure-builder page found, Hamashbir's "בתי צמיחה", is about 350–400 words. It has no specs, no FAQ, no projects and no data (https://www.hamashbir.co.il/departments/growth-houses/).
   - The big net makers publish product pages, not project know-how:
     - Ginegar has a Hebrew blog but no net-house structure content (https://www.ginegar.com/he/).
     - polysack.com is now a packaging-film site with no agri-net content (https://www.polysack.com/).
     - Green Nets' banana article is about 200 words with unsourced numbers and no subheadings (https://www.greennetsagro.com/growing-bananas-in-net-houses/).
     - Meteor appears only as a directory listing (https://www.israel.agrisupportonline.com/directory/csv/csvread.pl?show=352&mytemplate=tp102).
   - **So one deep, sourced, engineer-written article per topic can realistically reach the top 3.** It must use unambiguous wording ("בית רשת חקלאי", "בית רשת למטע"), because Google has to disambiguate the term from computer networks.

2. **The best authority content sits in Ministry and R&D PDFs that farmers cannot easily use. Bringing it into readable articles is our edge.** Each source below is real, citable and in Hebrew, but buried in a PDF:
   - **Ministry Investment Administration, "תכנית הפיתוח עפ"י נושאים 2023" (dated 07.08.2023).** It gives official **recognized costs per dunam** for net houses. High banana net houses: ₪10,400 up to 40 dunam, ₪9,500 up to 100 dunam, ₪8,000 above 100 dunam. Low net house: ₪8,000. Net house with trellis (kiwi, apple, pear, late deciduous): ₪14,000. Hail drape net (רשת תשליך): ₪1,300. Vegetable net house: ₪11,000 (vs. multi-span greenhouse ₪47,000). It also says that for bananas, grants for irrigation and trellis are approved **only if planting is under an existing or new net house**. https://www.gov.il/BlobFolder/reports/developmentplan2023/ar/development_2023.pdf (see also https://www.gov.il/BlobFolder/reports/developmentplan2023/he/planning%20principles%2023.pdf)
   - **Northern R&D / Zemach trial on banana water use**, net house vs. open field, Jordan Valley, 4-year averages: https://zemachtech.co.il/docs/מחקרי-בננות/דר-יאיר-ישראלי-בננות/השקית-בננות-בבית-רשת-ובשטח-פתוח-בעמק-הי/
   - **שה"מ (Extension Service), February 2025:** nets above 50% shading protect avocado well against frost, and 30% nets protect less. https://www.gov.il/BlobFolder/reports/defending-against-the-cold-subtropical/he/Professional_information_defending-against-the-cold-subtropical-2025.pdf
   - **Volcani colour-net trial in Bar'am apple orchards.** Bar'am is a MIFTAH client region, but do **not** claim MIFTAH built the trial structure. https://israelagri.com/colored-shade-nets-for-improved-apple-quality-and-yield/
   - **Price queries** ("מחיר בית רשת לדונם") return only midrag window-net price lists (https://www.midrag.co.il/Content/Price/3556, https://www.midrag.co.il/Content/SubSectorPriceList/792). No agricultural price page exists. The official recognized-cost table lets us **answer the cost question credibly without publishing MIFTAH prices**, framed so that it qualifies the reader: scale, structure type, crop.

3. **The Hebrew investor SERP is about land speculation, not operating farms. The turnkey abroad space is empty in Hebrew.**
   - "השקעה בחקלאות" queries return land-rezoning sellers that promise uplift from "הפשרה". Examples: karkatova.co.il ("עד 20% תשואה שנתית"), dkarka.co.il, karkaotisrael.co.il, nadlanmaster.co.il, climaxgrp.co.il, globes.co.il/news/article.aspx?did=1001484081.
   - "השקעה בפורטוגל" returns only real estate and Golden-Visa content (calcalist.co.il/real-estate/article/hkgl6r00yg, maariv.co.il/business/consumerism/article-1027497, bshcpa.co.il).
   - "הקמת חווה חקלאית בחו"ל" returns generic results: Wise on opening a company abroad (https://wise.com/il/blog/establishing-a-company-abroad), a 2018 TheMarker feature on Israeli farmers moving abroad (https://www.themarker.com/news/2018-04-18/ty-article-magazine-ext/0000017f-e17f-d75c-a7ff-fdffb6480000), and Wikipedia history.
   - In English, the turnkey space is held by:
     - livestock and poultry specialists (Agrotop, https://agrotop.co.il/)
     - multi-sector Israeli EPCs (Dagan, https://www.dagan.co.il/Page.aspx?id=24&name=Turnkey+Projects; Green 2000, https://green-2000.com/)
     - NZ orchard developers (Seeka, https://seeka.co.nz/power-up-your-orchard-development; Southern Cross Horticulture)
   - Almost none of them explain the *orchard + structure + operation* package.
   - **MIFTAH's real differentiator is that it builds the structures in its own factory and also runs the farm afterwards.** That is the message to own. A Hebrew article that clearly separates "operating farm" from "land speculation" fills a gap and filters for serious investors.

### 1.2 Supporting observations by query

| Query (Hebrew) | What ranks / what we saw | Gap we can beat |
|---|---|---|
| בית רשת / בתי רשת לחקלאות | Mixed intent (computer networks), Hamashbir thin page, gov planning PDF (https://apps.land.gov.il/IturTabotData/nispachim/jerus/1051421/100/נספח מס 4-הוראות בינוי.pdf), garden blog avivhegia.co.il. No Hebrew Wikipedia entry for בית רשת. | Definitive pillar: definition, types, anatomy, process, official costs, grants, maintenance. |
| רשת נגד ברד למטעים | Amazon garden hail cloth, pigeon/mosquito nets (midrag, solarlight, yonyonim), 2004 apple shade-net study PDF (https://www.mop-zafon.org.il/sites/default/files/uploads/pdf-files/articles/0298.pdf), Green Nets product page. | Decision guide for growers: system types, folding, snow and wind, nets vs. insurance, grants. |
| אחוזי הצללה / רשת הצללה | Home-shade retail (midrag tip 14838, mygan, brz, tranquilo), Ministry of Education ag curriculum PDF. **Mostly B2C, so poor lead fit.** | Not a standalone article; becomes a section inside the pillar and crop articles. |
| רשת נגד חרקים 50 מש | Product pages (eyouagro, arm.co.il Ginegar 50 mesh, gardensheds, home360). | Covered as a section of the pillar (vegetable net houses). |
| בית רשת לבננות | Generic SERP noise. Authority content exists only as PDFs: Plants Council (https://www.plants.org.il/uploadimages/mop16ba.pdf), Northern R&D (mop-zafon), Zemach, mopdarom 2026 Negev study. TheMarker sponsored article (https://www.themarker.com/labels/israelisuccess/2023-09-19/ty-article-labels/0000018a-ac7a-df78-adca-ee7aa8e00000). | First readable Hebrew guide that combines the research, the grant rules and the structure engineering. |
| בית רשת לאבוקדו | Home-growing pages (organi-co, aruganit, zurmarket), Kibbutz Nirim trial page (https://www.nirim.co.il/viewStaticPage.aspx?pageID=38: net-house trial, hail brought the net down). | Expert page on frost, hail, wind and sunburn protection with structure design that holds up to hail. |
| חממה או בית רשת | No relevant agricultural result. | Comparison table in the pillar (featured-snippet target). |
| מחיר בית רשת | Only midrag window-net prices. | Cost-drivers section plus the Ministry recognized-cost table inside the pillar (no standalone price page). |
| השקעה בחקלאות בחו"ל / הקמת חווה חקלאית | Land speculation, Portugal real estate, Wise, a 2018 news feature. | Investor guide to turnkey operating farms. |
| הקמת מטע | Search returned construction-cost and urban-planning noise. No orchard-establishment guide surfaced. | Partially covered inside the turnkey article (planting and establishment phases). Possible 6th article later. |

---

## 2. Topic selection (why these 5)

| # | Article | Audience | Search demand (relative est.) | Commercial intent | Fit with MIFTAH | Expertise we can show |
|---|---|---|---|---|---|---|
| 1 | **Pillar: בית רשת חקלאי** | Israeli farmers with 50+ dunam, agri companies | High (head term, ambiguous) | High | Core | Own factory, engineering, 20+ years, crews certified for work at height |
| 2 | **בית רשת לבננות** | Banana growers (≈32,000 dunam sector) | Medium | Very high | Core (Western Galilee, 11% net) | Strongest research base plus the grant rule |
| 3 | **רשת נגד ברד למטעים** (apple, cherry, kiwi) | Deciduous and kiwi growers in the Golan and Galilee | Medium | High | Core (Golan apples with net that folds in winter, cherry, Bar'am kiwi with סוכה trellis) | Folding systems, snow and wind loads, trellis integration |
| 4 | **בית רשת לאבוקדו** | Avocado growers in Israel; investors in Iberia | Low to medium, rising | High | Bridge (Portugal avocado net house) | Frost/hail/wind design, abroad execution |
| 5 | **חווה חקלאית בחו"ל בשיטת Turnkey** | Private investors, agri companies (30+ ha) | Low volume, very high value | Very high | Growth line (with Barak, Green Arava) | Belarus project, Portugal, full scope list |

**Rejected or merged (to avoid cannibalization and bad-fit traffic):**
- *מחיר בית רשת* as a standalone page: it attracts price shoppers, which the brief lists as bad-fit. It becomes the pillar's H2 "כמה עולה בית רשת", built on official recognized costs and the scale effect.
- *אחוזי הצללה* and *רשת נגד חרקים* standalone: mostly B2C SERPs. They become sections.
- *חממה או בית רשת*: MIFTAH does not sell greenhouses as a line, so this becomes a pillar section with a comparison table.
- *הקמת מטע* in Israel: MIFTAH's planting and agronomy scope is the turnkey line (mainly abroad), so a standalone Israeli orchard-establishment page would over-promise. Keep it for later.

**Keyword ownership map (one owner per keyword; others link to it):**
- Pillar owns: בית רשת, בתי רשת, בית רשת חקלאי, הקמת בית רשת, עלות/מחיר בית רשת, חממה או בית רשת, סוגי רשתות, אחוז הצללה (general), רשת נגד חרקים (general), סככת העמסה and שובר רוח (mentions only).
- Banana owns: anything with בננות / בננה.
- Hail owns: רשת נגד ברד, רשת ברד, רשת תשליך, רשת מתקפלת, תפוחים, דובדבן, קיווי, הדליה בצורת סוכה.
- Avocado owns: anything with אבוקדו, הגנה מקרה במטע.
- Turnkey owns: Turnkey, פרויקט מפתח, חווה בחו"ל, השקעה בחקלאות בחו"ל, הקמת חווה חקלאית.

---

## 3. The 5 article briefs

> Global writing rules for all five:
> - Premium, calm and specific tone, in native Hebrew. Short sentences.
> - Every number gets a source link in the text and a "מקורות" list at the end.
> - Projects appear only as crop + region + structure (as listed in the brief).
> - Testimonials are verbatim.
> - The CTA qualifies the reader: "פרויקטים מ-50 דונם בישראל ומ-30 הקטר בחו"ל", phone 04-9856969 and WhatsApp.
> - Never claim permits/licensing or ongoing owner reporting. Where permits are relevant, say "ההיתר באחריות היזם; כדאי להתחיל בו מוקדם".
> - Author box: יפתח הספל, מנכ"ל משותף, הנדסאי בניין (הטכניון).
> - Each article gets "עודכן לאחרונה" and a "מקורות" section.

---

### Article 1: Pillar: בית רשת חקלאי

- **Primary keyword:** בית רשת (with the unambiguous variants בית רשת חקלאי and בתי רשת לחקלאות in H1/H2)
- **Secondary / LSI:** בתי רשת לחקלאות, הקמת בית רשת, תכנון בית רשת, עלות בית רשת לדונם, בית רשת למטע, בית רשת לירקות, חממה או בית רשת, סוגי רשתות חקלאיות, אחוז הצללה, רשת נגד חרקים 50 מש, מבנה בית רשת עמודים וכבלים
- **Search intent:** Informational with commercial investigation. The reader is planning a project and comparing options and suppliers.
- **H1 options:**
  1. ⭐ **בית רשת חקלאי: כל מה שצריך לדעת לפני שמקימים, מהתכנון ההנדסי ועד המסירה בשטח** (best: covers the whole lifecycle, signals engineering depth, and matches the "planning a project" intent)
  2. בית רשת שעומד בזמן: המדריך המקצועי לתכנון, הקמה ותחזוקה של בתי רשת לחקלאות
  3. בתי רשת לחקלאות: איך מתכננים מבנה שמחזיק עשרות עונות
- **Title tag (51 chars):** `בית רשת חקלאי: תכנון, הקמה ועלויות – המדריך | מיפתח`
- **Meta description (≤155):** `מה זה בית רשת, אילו סוגים יש, איך בוחרים רשת ואחוז הצללה וכמה זה עולה לדונם לפי משרד החקלאות. מדריך הנדסי ממי שמקים בתי רשת יותר מ-20 שנה.`
- **URL slug:** `/guides/beit-reshet`
- **Outline:**
  - **Intro (≈120 words):** Define a בית רשת in the first 40–50 words (featured-snippet paragraph). Then add a one-line promise: "המדריך נכתב על ידי צוות שמתכנן, מייצר ומקים בתי רשת יותר מ-20 שנה".
  - **H2 מה זה בית רשת חקלאי, ובמה הוא שונה מחממה**
    - H3 הגדרה: a structure of poles, cables and anchors carrying a net (shade, hail or insect) over a crop, ventilated and not climate-controlled. Cite the Ministry planning guideline wording "מבנה קל... להשבחת הגידול" (apps.land.gov.il).
    - H3 **טבלת השוואה: חממה / בית רשת / שטח פתוח** (snippet target). Rows: cover, ventilation, climate control, typical crops, permit, official recognized investment per dunam (vegetables: greenhouse ₪47,000 vs. net house ₪11,000, Ministry 2023).
  - **H2 סוגי בתי רשת**
    - H3 בית רשת גבוה שטוח (bananas, orchards)
    - H3 בית רשת נמוך (cherry, grapes, figs, lychee, per the Ministry list)
    - H3 בית רשת עם הדליה, including הדליה בצורת סוכה (kiwi)
    - H3 רשת מתקפלת for winter. One line, then link to the hail article.
    - H3 סככת העמסה ושובר רוח: related structures, a short paragraph each
  - **H2 האנטומיה של בית רשת** (diagram): poles, anchors/עוגנים, perimeter and roof cables, net, edge closures, doors and access paths. Explain *why* each part fails if under-designed: wind uplift, hail accumulation, snow, corrosion. **This section shows expertise that competitors lack.**
  - **H2 איך בוחרים רשת**
    - H3 רשת הצללה ואחוז הצללה. Explain that nominal and measured shading differ; the Zemach trial measured ~25–26% under both a 10% and a 20% net because of dust.
    - H3 רשת נגד ברד
    - H3 רשת נגד חרקים: 17/25/50 mesh, ventilation trade-off (Tanny, Cohen & Israeli 2012: ~50% lower crop water use and 50–70% lower ventilation under high-mesh screens on pepper)
    - H3 רשתות צבעוניות (Volcani/Polysack research)
    - Decision table by crop goal. Link out to the banana, hail and avocado articles.
  - **H2 מים, אקלים ויבול: מה המחקר הישראלי אומר.** 3–4 sourced findings: water savings in bananas, sunburn reduction in apples, frost protection in avocado. Each one links to its crop article.
  - **H2 כמה עולה בית רשת**
    - H3 מה קובע את המחיר: span and height, wind and snow zone, net type, single vs. double net, trellis, terrain, project scale
    - H3 **טבלת "עלות מוכרת" של מנהלת ההשקעות** (Ministry 2023), with a bold note: "זו עלות מוכרת לצורך חישוב מענק, לא הצעת מחיר". Show the scale effect: banana ₪10,400 → ₪9,500 → ₪8,000 per dunam as plot size grows.
    - H3 why a quote requires a site visit. Naturally qualify with "אנו מתמחים בפרויקטים מ-50 דונם".
  - **H2 מענקים ותמיכות.** Investment Administration rules: net houses for apples, lychee, figs and kiwi; hail drape net for citrus, avocado, mango, stone fruit, pomegranate and table grapes; the banana rule. Add the **2026–2027 northern track**: ₪170M, 50% grant, up to ₪3M per farmer, communities 0–9 km from the Lebanon border (https://www.davar1.co.il/694671/, https://www.yeshuvnik.net/…802169). Tell readers to check the current procedure on gov.il.
  - **H2 שלבי פרויקט בית רשת אצלנו** (timeline graphic, no durations invented): מיפוי צרכים → תכנון הנדסי → ייצור ובדיקה במפעל (poles, nets, cables and accessories tested before going to the field) → הובלה → הקמה על ידי צוותים מבוטחים ומוסמכים לעבודה בגובה → מסירה → תחזוקה לאורך שנים.
  - **H2 הטעות הנפוצה ביותר.** The owners' insight: "לנסות לעשות לבד כדי לחסוך". List what goes wrong (anchoring, cable tension, seasonal load) without fear-mongering.
  - **H2 תחזוקה לאורך שנים:** inspection checklist (cables, anchors, tears, UV aging, after storms). Include Eyal Ovadia's testimonial about storm-day response.
  - **H2 פרויקטים נבחרים** (crop + region + structure only): banana Western Galilee (11% net), apple Golan (net folds in winter), kiwi Bar'am (סוכה trellis), cherry, avocado Portugal. Link to /projects.
  - **H2 שאלות נפוצות**
  - **CTA block** plus the Golan Argaman (Hanita) testimonial
- **Featured-snippet targets:**
  1. Definition paragraph "מה זה בית רשת" (40–50 words)
  2. Table "חממה או בית רשת"
  3. Table "עלות מוכרת לדונם לפי סוג מבנה"
- **FAQ (PAA style):**
  1. מה ההבדל בין בית רשת לחממה?
  2. כמה עולה להקים בית רשת לדונם?
  3. האם צריך היתר בנייה לבית רשת? (Answer from the Ministry table: high structures require a permit; low ones up to 4 m generally do not, per the table; verify with the local planning committee. The permit is the developer's responsibility.)
  4. כמה זמן מחזיקה רשת חקלאית?
  5. איזה אחוז הצללה מתאים לגידול שלי?
  6. האם יש מענק ממשרד החקלאות להקמת בית רשת?
  7. מה גודל הפרויקט המינימלי שאתם מבצעים?
- **Length:** 3,000–3,800 words
- **Visuals (specific):**
  1. Labeled anatomy illustration of a high flat net house (poles, anchors, cable grid, net, edges)
  2. Comparison table greenhouse / net house / open field (Ministry costs)
  3. Bar chart: Ministry recognized cost ₪/dunam by structure type (drape net 1,300; low net house 8,000; banana >100 dunam 8,000; banana ≤40 dunam 10,400; vegetable net house 11,000; net house with trellis 14,000; vegetable trellis net house 16,000; greenhouse 47,000)
  4. 7-step process timeline from our factory to handover
  5. Net-selection decision table (goal → net type → typical shading/mesh, with sources)
  6. Real project photos with alt text (crop + region)
- **Internal links:** → Art. 2, 3, 4 (from the net-selection and research sections), → Art. 5 (from "פרויקטים בחו"ל"), → /net-houses (main service CTA), → /projects, → /contact. Anchor examples: "בית רשת לבננות", "רשת נגד ברד למטעים", "הגנה על אבוקדו מקרה", "פרויקט Turnkey בחו"ל".

---

### Article 2: בית רשת לבננות

- **Primary keyword:** בית רשת לבננות
- **Secondary / LSI:** בתי רשת לבננות, גידול בננות בבית רשת, רשת לבננות, רשת קריסטל לבננות, רשת פנינה, השקיית בננות בבית רשת, יבול בננות לדונם, גובה בית רשת לבננות, מענק בתי רשת בננות
- **Search intent:** Commercial investigation by growers planning new planting or replacing an old structure, plus informational (water, yield).
- **H1 options:**
  1. ⭐ **בית רשת לבננות: איך מתכננים מבנה שמחזיק רוח, חוסך מים ומעלה יבול** (best: names the three outcomes growers care about, all backed by sources)
  2. בננות בבית רשת: מה המחקר הישראלי מלמד, ומה זה אומר על התכנון שלכם
  3. בית רשת לבננות: המדריך המקצועי למגדל שמתכנן את העשור הבא
- **Title tag (44 chars):** `בית רשת לבננות: מבנה, רשת, מים ויבול | מיפתח`
- **Meta description:** `מה מלמדים מחקרי בית הרשת בבננות: חיסכון במים, יבול לדונם, בחירת רשת, גובה ומבנה, ומה צריך לדעת על מענקי משרד החקלאות. מדריך למגדלים מ-50 דונם.`
- **URL slug:** `/guides/beit-reshet-bananot`
- **Outline:**
  - **Intro:** Bananas moved under nets. "כמעט כל מטעי הבננות בישראל כיום מוגנים בבתי רשת" (TheMarker, 2023; labelled sponsored content from the Plants Council's banana branch, so cite it as such or replace it with a primary Plants Council source). Then the question the article answers.
  - **H2 למה בננות עברו לבית רשת**
    - H3 רוח וברד: torn leaves and fruit scarring. Fruit cleanliness and less waste (Israeli et al., Jordan Valley shading screens: https://www.researchgate.net/publication/285635664).
    - H3 מים: 20–30% water savings in the Jordan Valley with equal or better yields (Tanny, Cohen & Israeli, Acta Hort. 927, 2012: https://ishs.org/ishs-article/927_63/)
    - H3 יבול: historic per-dunam yields as presented by the industry (TheMarker; flag the source)
    - H3 טביעת רגל מים: net-house banana had the lowest water footprint of the Jordan Valley plantation crops studied (182 m³/ton). Blue+green footprint was about 34% lower than open-field banana. About half the banana area in the study region is under net houses (Shtull-Trauring et al., Frontiers in Plant Science 2016: https://pmc.ncbi.nlm.nih.gov/articles/PMC5155503/)
  - **H2 מה מראים הנתונים מעמק הירדן** (chart): 4-year average annual water use, open field 2,255 mm vs. 10% net 1,727 mm vs. 20% net 1,673 mm under the standard schedule (Zemach / Northern R&D trial, Grand Nain, planted 2015). Add the caveat on salinity leaching (~40% of water). Mention that the newer Negev study (mopdarom 2026) found existing irrigation coefficients are not calibrated to that region, so local agronomy matters.
  - **H2 איזו רשת לבננות**
    - H3 קריסטל 10% vs. פנינה 20–30%: trials and trade-offs (mop-zafon 2022 pearl-net report: https://www.mop-zafon.org.il/sites/default/files/uploads/pdf-files/articles/דוח שנתי לתמיכות 2022- רשתות פנינה בבננה - נבות.pdf)
    - H3 woven vs. knitted: Israeli et al. 2014 found the woven 10% screen had lower reference ET (cite via the paper)
    - H3 our Western Galilee project used an 11% net (project fact, no numbers beyond that)
  - **H2 ההנדסה של בית רשת לבננות**
    - H3 גובה: plants grew taller under nets, which raised structure costs; research on lowering plants (mop-zafon height report)
    - H3 wind load, anchoring, cable spans, access for harvest machinery
    - H3 replacing an old structure on an existing plantation without stopping production (process only, no numbers)
  - **H2 עלות ומענקים**
    - H3 Ministry recognized cost for high banana net houses: ₪10,400 / ₪9,500 / ₪8,000 per dunam by size (≤40 / ≤100 / >100 dunam). "נדרש היתר בניה" per the table, with the permit as the developer's responsibility.
    - H3 the grant rule: irrigation and trellis grants for banana planting only under a net house (Ministry 2023)
    - H3 northern track 2026–2027 for border communities
  - **H2 מסלול הפרויקט:** survey → engineering → factory → installation → handover → maintenance
  - **H2 שאלות נפוצות**
  - **CTA** plus the Rafi Hillel testimonial (rainy winters, schedules)
- **Featured-snippet targets:**
  1. List "יתרונות בית רשת לבננות" (4–5 bullets with numbers)
  2. Table of water use: open field / 10% net / 20% net
- **FAQ:**
  1. כמה מים חוסך בית רשת בבננות?
  2. איזו רשת הכי מתאימה לבננות, קריסטל או פנינה?
  3. מה הגובה המקובל לבית רשת לבננות?
  4. האם יש מענק לבית רשת לבננות?
  5. האם צריך היתר בנייה לבית רשת לבננות?
  6. אפשר להחליף רשת בלי לעקור את המטע?
  7. כמה זמן לוקח להקים בית רשת לבננות? (answer with "תלוי בהיקף ובעונה" and no invented durations)
- **Length:** 2,200–2,800 words
- **Visuals:**
  1. Grouped bar chart of annual water use (mm) for the 3 environments × 2 irrigation methods (Zemach 4-year averages: open 2,255; 10% net 1,727/1,479; 20% net 1,673/1,344)
  2. Horizontal bar chart of water footprint (m³/ton) for Jordan Valley crops, from net-house banana 182 to dates 765 (Frontiers 2016)
  3. Map of Israeli banana regions with dunam per region (Carmel coast ~12,000, Jordan Valley ~9,000, Western Galilee ~6,000, South ~2,500, Beit She'an–Harod ~2,500, from TheMarker; verify with the Plants Council)
  4. Step chart of the Ministry recognized cost per dunam by plot size (shows the scale effect and qualifies 50+ dunam leads)
  5. Cross-section drawing of a banana net house (height, cable grid, anchoring)
- **Internal links:** → Art. 1 (anchor "מה זה בית רשת חקלאי"), → Art. 3 (in the wind/hail section, anchor "רשת נגד ברד"), → Art. 4 (one line: "גם באבוקדו…"), → /net-houses, /projects (banana Western Galilee), /contact.

---

### Article 3: רשת נגד ברד למטעים

- **Primary keyword:** רשת נגד ברד
- **Secondary / LSI:** רשת נגד ברד למטעים, רשת ברד למטע תפוחים, בית רשת לתפוחים, רשת נגד ברד לדובדבן, רשת מתקפלת, רשת תשליך, בית רשת לקיווי, הדליה בצורת סוכה, ביטוח ברד או רשת, רשת לנו (Leno)
- **Search intent:** Commercial investigation by orchard growers in hail-prone areas (Golan, Upper Galilee), plus informational.
- **H1 options:**
  1. ⭐ **רשת נגד ברד למטעים: איך בוחרים מערכת שמגינה על היבול גם בחורף הקשה ביותר** (best: speaks to the Golan/Galilee reality and implies engineering for snow and wind)
  2. ברד, שמש ורוח: המדריך לבחירת מערכת רשת למטע תפוחים, דובדבן וקיווי
  3. רשת נגד ברד או ביטוח? מה כדאי למטע שלכם, ואיך מתכננים נכון
- **Title tag (50 chars):** `רשת נגד ברד למטעים: איך בוחרים מערכת נכונה | מיפתח`
- **Meta description:** `רשת תשליך, בית רשת שטוח או רשת מתקפלת? איך בוחרים מערכת נגד ברד לתפוחים, דובדבן וקיווי, מה אומר המחקר ומה כדאי יותר: רשת או ביטוח.`
- **URL slug:** `/guides/reshet-neged-barad`
- **Outline:**
  - **Intro:** hail as a recurring risk to orchard income. Researchers in Portugal report increasing hail damage in the Iberian Peninsula over the last 15 years (IPB repository: https://bibliotecadigital.ipb.pt/entities/publication/a396a72b-3881-4361-bc3a-cf90e6c326cc). Keep the Israel angle qualitative.
  - **H2 מה רשת נגד ברד עושה, ומה לא**
    - H3 hail, sunburn and heat waves. Bar'am trial: all 30% nets protected well against sunburn (Shahak et al. 2009, https://israelagri.com/colored-shade-nets-for-improved-apple-quality-and-yield/). Apple shade-net study (Tanai, Naor, Cohen et al., 2004): significant drop in sunburn; nets raised night air temperature and lowered day temperature; a gable net weakened wind turbulence (https://www.mop-zafon.org.il/sites/default/files/uploads/pdf-files/articles/0298.pdf).
    - H3 side benefits: birds, insects. Codling moth infestation reduced under nets in Alto Adige; cite only with the paper link (agris.fao.org record).
    - H3 limits: vigour increase in some varieties (Bar'am trial), light reduction, colour
  - **H2 שלושה סוגי מערכות** (comparison table)
    - H3 רשת תשליך: lowest investment (Ministry recognized ₪1,300/dunam), crops listed by the Ministry
    - H3 בית רשת שטוח / דו-שיפועי: permanent
    - H3 בית רשת עם הדליה, including **הדליה בצורת סוכה** for kiwi (Bar'am project): ₪14,000/dunam recognized
    - H3 **רשת מתקפלת לחורף** (Golan apple project): why fold (snow load, light in dormancy), how the folding cycle works operationally
  - **H2 צבע הרשת ואחוז ההצללה.** Bar'am 5-season trial: Pearl gave ~+20 t/ha/yr on Golden Delicious vs. uncovered control; black and grey did worst (Shahak et al.; Volcani + Polysack collaboration, review: https://www.researchgate.net/publication/237786951).
  - **H2 רשת או ביטוח ברד: החשבון הכלכלי.** TUM study (Gandorfer, Hartwich & Bitsch, Acta Hort. 1132, 2016: https://portal.fis.tum.de/en/publications/hail-risk-management-in-fruit-production-anti-hail-net-versus-hai/): nets win at high-hail-risk sites, insurance suits highly risk-averse, highly leveraged farms at medium risk. Turn this into a 2×2 decision grid.
  - **H2 הנדסה לאזורי צפון:** wind, snow, slopes, basalt soils in the Golan (no numbers), anchoring, cable tension, crew safety at height
  - **H2 מענקים:** the Ministry list (net houses for apples, lychee, figs, kiwi; drape net for stone fruit, etc.) plus the northern track
  - **H2 פרויקטים:** apple Golan (folding), cherry, kiwi Bar'am (סוכה). Link to /projects.
  - **H2 שאלות נפוצות**
  - **CTA** plus Rafi Hillel (Bar'am, a decade of joint work)
- **Featured-snippet targets:**
  1. Table "רשת תשליך / בית רשת / רשת מתקפלת": cost key, protection, permanence, best crops
  2. Short answer "רשת נגד ברד או ביטוח?" (40–60 words)
- **FAQ:**
  1. כמה עולה רשת נגד ברד לדונם?
  2. האם רשת נגד ברד פוגעת בצבע הפרי?
  3. מתי פורסים ומתי מקפלים רשת נגד ברד?
  4. איזה צבע רשת הכי מתאים לתפוחים?
  5. האם רשת נגד ברד עומדת בשלג?
  6. מה עדיף, רשת נגד ברד או ביטוח ברד?
  7. האם יש מענק לרשת נגד ברד?
- **Length:** 2,200–2,800 words
- **Visuals:**
  1. Comparison table of the 3 systems with Ministry recognized costs (1,300 / 8,000 / 14,000)
  2. Bar chart of Bar'am net-colour results (yield effect by colour, qualitative ranking plus the +20 t/ha Pearl figure only)
  3. 2×2 decision grid: hail risk (medium/high) × farm risk profile, from Gandorfer et al.
  4. Annual calendar graphic: net open/closed months for a folding system (process, no invented dates; "לפי אזור וזן")
  5. Diagram of a סוכה trellis net house for kiwi
- **Internal links:** → Art. 1 (anchor "סוגי בתי רשת"), → Art. 4 (anchor "רשת נגד ברד באבוקדו"), → Art. 2 (one line on wind and hail in bananas), → /net-houses, /projects, /contact.

---

### Article 4: בית רשת לאבוקדו

- **Primary keyword:** בית רשת לאבוקדו
- **Secondary / LSI:** רשת לאבוקדו, הגנה מקרה באבוקדו, רשת הצללה לאבוקדו, רשת נגד ברד לאבוקדו, נזקי קרה במטע אבוקדו, מכות שמש באבוקדו, מטע אבוקדו צעיר, אבוקדו בפורטוגל
- **Search intent:** Informational with commercial intent, from growers facing climate extremes and investors planning Iberian avocado.
- **H1 options:**
  1. ⭐ **בית רשת לאבוקדו: איך מגינים על מטע צעיר מקרה, ברד ורוח, בישראל ובחו"ל** (best: names the specific threats and bridges both audiences)
  2. אבוקדו תחת רשת: מתי זה משתלם, ואיך מתכננים מבנה שלא יקרוס בברד
  3. מטע אבוקדו בעידן האקלים הקיצוני: מה בית רשת נותן, ומה חשוב לדעת לפני
- **Title tag (44 chars):** `בית רשת לאבוקדו: הגנה מקרה, ברד ורוח | מיפתח`
- **Meta description:** `מתי כדאי בית רשת למטע אבוקדו, איזה אחוז הצללה מגן מקרה לפי שה"מ, ואיך מתכננים מבנה שעומד בברד וברוח. כולל ניסיון מפרויקט אבוקדו בפורטוגל.`
- **URL slug:** `/guides/beit-reshet-avocado`
- **Outline:**
  - **Intro:** avocado is Israel's leading orchard crop: ~160,000 dunam, about 10,000 dunam added per year (Plants Council avocado chair, Calcalist, 25.12.2025: https://www.calcalist.co.il/magazine/article/zhs2d5j0y), and 43% of Israeli fruit exports per the Ministry's 2024 summary (same source). Extreme weather makes protection a business decision.
  - **H2 האיומים: קרה, צינה, מכות שמש, ברד, רוח וסופות חול** (matrix). Nirim notes on sandstorms and hot dry spells in flowering and fruit set in the western Negev (https://www.nirim.co.il/viewStaticPage.aspx?pageID=38).
  - **H2 מה שה"מ אומר על רשתות והגנה מקרה** (Feb 2025): high efficacy with nets above 50% shading, lower with 30%. The effect comes mainly from shading the morning sun after a radiative frost. Nets also help against chilling. Options are a permanent net house or a drape (תשליך) over rows or single trees in young orchards; spread at the start of winter and fold at the end, or deploy around a single frost event (gov.il PDF). Photo caption: young orchard in Maayan Baruch covered with a net house.
  - **H2 בית רשת קבוע או רשת תשליך:** comparison. The Ministry supports a hail drape net for avocado (2023 list).
  - **H2 שיעור מניסוי: למה מבנה חייב להיות מתוכנן לברד.** Nirim's dense-planting trial under a net house reports that heavy hail brought the net down. Turn this into an engineering lesson (load paths, net type, drainage of hail accumulation) without blaming anyone.
  - **H2 מים וגודל פרי:** Nirim lists water saving and fruit size as goals. Present this qualitatively and attribute it as the kibbutz's stated rationale.
  - **H2 אבוקדו בחו"ל: מה שונה בפורטוגל ובחצי האי האיברי.**
    - Portugal avocado area estimated at 2,600–2,800 ha in early 2023, concentrated in the Algarve (Hass Avocado Board country profile: https://hassavocadoboard.com/wp-content/uploads/hass-avocado-board-country-profile-2023-portugal.pdf).
    - European import demand grew strongly in 2023–2024, ~16% annual volume growth estimate, and Israel's exports to Europe were worth nearly €400M (CBI, updated 30.12.2025: https://www.cbi.eu/market-information/fresh-fruit-vegetables/avocados/market-entry).
    - Our Portugal avocado net house (crop + country + structure only). Testimonial or recommendation from the Portugal client if approved.
  - **H2 שאלות נפוצות**
  - **CTA** (two buttons: Israeli grower / investor abroad, the latter to /turnkey)
- **Featured-snippet targets:**
  1. Short answer "איזה אחוז הצללה מגן על אבוקדו מקרה?", citing שה"מ: >50% high efficacy, 30% lower
  2. Threat → solution table
- **FAQ:**
  1. האם רשת מגינה על אבוקדו מקרה?
  2. איזה אחוז הצללה מתאים לאבוקדו?
  3. בית רשת או רשת תשליך למטע אבוקדו צעיר?
  4. האם בית רשת לאבוקדו עומד בברד כבד?
  5. האם יש מענק לרשת נגד ברד באבוקדו?
  6. אפשר להקים בית רשת לאבוקדו בפורטוגל?
- **Length:** 1,800–2,400 words
- **Visuals:**
  1. Threat matrix (rows: frost, chilling, sunburn, hail, wind, sandstorm; columns: net house, drape net, sprinklers over canopy (Ministry conditions: frost-sensitive area, water allocation, extension recommendation, up to 30 dunam per applicant)), sourced
  2. Simple annotated graphic "≥50% vs. 30% shading: frost-protection efficacy" (qualitative, quoting שה"מ, no invented percentages)
  3. Line or column chart of European avocado import value by supplier 2024 (Peru €1.3B, Colombia €396M, Israel ~€400M, South Africa €300M, from CBI)
  4. Map: Algarve/Alentejo avocado zones plus a pin for our Portugal project (region-level only)
- **Internal links:** → Art. 1 (anchor "סוגי רשתות ואחוז הצללה"), → Art. 3 (anchor "רשת נגד ברד"), → Art. 5 (anchor "הקמת מטע אבוקדו בחו"ל בשיטת Turnkey"), → /turnkey, /net-houses, /projects, /contact.

---

### Article 5: חווה חקלאית בחו"ל בשיטת Turnkey (investor article)

- **Primary keyword:** השקעה בחקלאות בחו"ל
- **Secondary / LSI:** פרויקט Turnkey חקלאי, פרויקט מפתח חקלאי, הקמת חווה חקלאית, הקמת חווה חקלאית בחו"ל, הקמת מטע בחו"ל, ניהול חווה חקלאית, השקעה במטע, חקלאות בפורטוגל, תוכנית עסקית לחווה חקלאית, בדיקת קרקע לחקלאות
- **Search intent:** Commercial investigation by high-net-worth investors and agri companies. The reader needs to understand the model, the risks and who can deliver.
- **H1 options:**
  1. ⭐ **חווה חקלאית בחו"ל בשיטת Turnkey: מה משקיע צריך לדעת לפני שהוא מתחיל, ואיך מקימים חווה שעובדת** (best: frames it as an operating business rather than land speculation, and promises a decision framework)
  2. השקעה בחקלאות בחו"ל: מהקרקע ועד הקטיף הראשון, עם צוות אחד שאחראי על הכול
  3. פרויקט מפתח חקלאי: איך הופכים קרקע ריקה לחווה מניבה, בלי לנהל עשרה ספקים
- **Title tag (53 chars):** `חווה חקלאית בחו"ל בשיטת Turnkey: מדריך למשקיע | מיפתח`
- **Meta description:** `מה כולל פרויקט Turnkey חקלאי: בדיקת קרקע, תוכנית עסקית, מבנים, השקיה, נטיעה, ניהול גידול ושיווק. ההבדל בין חווה פעילה להשקעה בקרקע, ומה לבדוק.`
- **URL slug:** `/guides/chava-haklait-turnkey`
- **Outline:**
  - **Intro:** two kinds of "agricultural investment". Most Hebrew results talk about land waiting for rezoning. This article is about an **operating farm** whose return comes from the crop. One sentence on why the demand side matters, sourced: FAO projects a large rise in food demand to 2050 (FAO 2017, "The future of food and agriculture: Trends and challenges", https://www.fao.org/3/i6583e/i6583e.pdf; writer must verify the exact figure before quoting).
  - **H2 קרקע להשקעה או חווה פעילה? ההבדל שחשוב להבין** (comparison table: source of return, timeline, risk drivers, what you own, what you need from partners). Neutral tone; do not attack competitors.
  - **H2 מה זה פרויקט Turnkey חקלאי.** Definition (snippet). Who is responsible for what.
  - **H2 12 השלבים, מהקרקע ועד שיווק היבול.** One H3 each, using MIFTAH's real scope:
    1. soil testing and crop fit
    2. business plan and budget for the investor
    3. farm planning (structures, irrigation, roads)
    4. building structures and net houses (own factory)
    5. irrigation systems
    6. procurement and logistics
    7. planting and orchard establishment
    8. recruiting and managing local workers
    9. ongoing growing management and agronomy
    10. maintenance
    11. harvest
    12. marketing
  - **H2 מה נשאר באחריות המשקיע** (transparency builds trust): local licensing and permits, plus corporate, legal and tax structure in the target country. Mention the Israeli reporting duty on foreign assets (Wise: https://wise.com/il/blog/establishing-a-company-abroad) and say a CPA should be consulted. **Do not imply MIFTAH provides ongoing reporting.**
  - **H2 בדיקת נאותות: 10 שאלות לשאול לפני שחותמים.** Built on FAO/CCSI 2024 screening guidance (https://ccsi.columbia.edu/sites/ccsi.columbia.edu/files/content/docs/publications/ccsi-screening-responsbile-investment-agriculture-food-sytems-guidance-tools-government-officials-2024.pdf) and OECD-FAO guidance (https://www.oecd.org/en/topics/sub-issues/due-diligence-guidance-for-responsible-business-conduct/responsible-agriculture-supply-chains.html). Topics: water rights, land title and tenure, labour, logistics to market, climate risk, track record of the operator, independent verification.
  - **H2 איך בוחרים שוק:** Portugal and Europe (avocado demand data from CBI, linked to Art. 4), Africa, other markets. Qualitative criteria table. No promises of returns.
  - **H2 מניסיון השטח:** Belarus (local production, local crews, on time), Portugal avocado net house. Explain the "one accountable team" model and the cooperation with Barak of Green Arava (state it accurately).
  - **H2 הטעות הנפוצה:** "לנסות לעשות לבד כדי לחסוך". The owners' line: "שקט וזמן להתמקד בפיתוח העסק".
  - **H2 שאלות נפוצות**
  - **CTA:** "פרויקטים מ-30 הקטר", a short qualifying form (country, land status, crop interest, budget range optional), phone and WhatsApp. Mention a Fruit Logistica meeting option once the fair is confirmed.
- **Featured-snippet targets:**
  1. Definition "מה זה פרויקט Turnkey חקלאי" (40–50 words)
  2. Numbered list "שלבי הקמת חווה חקלאית" (12 steps)
  3. Comparison table "קרקע להשקעה vs. חווה פעילה"
- **FAQ:**
  1. מה כולל פרויקט Turnkey בחקלאות?
  2. מה גודל השטח המינימלי לפרויקט חווה בחו"ל?
  3. באילו מדינות כדאי להשקיע בחקלאות?
  4. כמה זמן עובר מהקמת מטע ועד יבול מסחרי? (answer per crop qualitatively; avoid numbers unless sourced)
  5. מי מנהל את החווה אחרי ההקמה?
  6. מה ההבדל בין השקעה בקרקע חקלאית להשקעה בחווה פעילה?
  7. האם אתם מטפלים ברישוי ובהיתרים במדינת היעד? (honest answer: no, the investor handles them with local advisors; we plan with those constraints in mind)
- **Length:** 2,800–3,500 words
- **Visuals:**
  1. **Scope matrix**: 12 MIFTAH deliverables vs. 2–3 investor responsibilities (permits, legal/tax), the strongest trust visual
  2. Phase diagram (sequence only, no durations)
  3. Comparison table: land speculation vs. operating farm
  4. Due-diligence checklist graphic (printable, a lead magnet for PDF download behind the contact form)
  5. Markets map: Israel, Portugal, Europe, Africa (no client names abroad beyond "the client in Portugal")
- **Internal links:** → Art. 4 (anchor "בית רשת לאבוקדו"), → Art. 1 (anchor "תכנון והקמת בתי רשת"), → Art. 3 (anchor "הגנה מברד במטע"), → /turnkey (primary CTA), /projects (Belarus, Portugal), /contact, → English version (/en/guides/turnkey-farm-project).

---

## 4. Internal-linking architecture (proposed)

```
/net-houses (service hub) ──┬── Art.1 /guides/beit-reshet  (pillar)
                            │        ├── Art.2 /guides/beit-reshet-bananot
                            │        ├── Art.3 /guides/reshet-neged-barad
                            │        └── Art.4 /guides/beit-reshet-avocado ──┐
/turnkey (service hub) ─────┴── Art.5 /guides/chava-haklait-turnkey ◄────────┘
/projects (case cards: crop + region + structure) ◄── linked from all 5
/contact (phone, WhatsApp, qualifying form) ◄── CTA in all 5
```
- **Rules:**
  - Every cluster article links up to the pillar in its first 200 words.
  - The pillar links down to each cluster from the relevant section.
  - Each article links to exactly one service hub as the main CTA: Art. 1–3 to /net-houses, Art. 4 to both, Art. 5 to /turnkey.
  - Use descriptive anchors, never "לחצו כאן".
- **Proposed new site pages:**
  - /projects/{crop-region} case cards (e.g., /projects/banana-western-galilee, /projects/apple-golan, /projects/kiwi-baram, /projects/cherry, /projects/avocado-portugal)
  - /about with the founders' story
  - /recommendations with the 3 approved testimonials and the list of recommending clients (Bar'am, Elrom, Yehiam, Metzuba, Hanita, Portugal client), plus /en mirrors
- **Navigation:** add a "מדריכים" (Guides) section.

---

## 5. English versions (international / investor audience)

**Translate first (adapt, do not translate literally):**
1. **Art. 5, Turnkey farm abroad.** Slug `/en/guides/turnkey-farm-project`
   - Primary keyword: **turnkey farm project**
   - Secondary: turnkey agricultural project, farm development company, orchard development for investors, agricultural investment abroad, farm establishment and management, Israeli agricultural expertise
   - Rationale: this is the growth line, the audience at the February trade fair (likely Fruit Logistica), and there is a clear SERP gap. English results show livestock/poultry turnkey firms (Agrotop), multi-sector EPCs (Dagan, Green 2000) and NZ kiwifruit developers (Seeka, Southern Cross), but no one offering a structures-plus-operations package for orchards.
   - Suggested H1: *"Turnkey Farm Projects: From Bare Land to First Harvest, With One Accountable Team"*
2. **Art. 4, Avocado net house (Israel + Portugal).** Slug `/en/guides/avocado-net-house`
   - Primary keyword: **avocado net house** (secondary: avocado frost protection net, anti-hail net avocado, avocado orchard Portugal, screenhouse avocado)
   - Rationale: the Iberian avocado buildout and European demand (CBI data) match investor intent and the Portugal reference project.
   - Suggested H1: *"Avocado Net Houses: Protecting Young Orchards From Frost, Hail and Wind, From Israel to Portugal"*

**Next wave:** the pillar as "net house construction for orchards" (primary **net house**, secondary: screenhouse, anti-hail net structure, banana net house, shade net house for orchards). Use `hreflang="he"`/`"en"` pairs, convert all costs to € only where a sourced figure exists, and drop Israel-only grant sections from the English versions (replace them with a "local incentives vary by country" note).

---

## 6. Sources consulted (all URLs)

**Ministry / extension / planning**
- Ministry of Agriculture, Investment Administration, development plan by topic 2023 (recognized costs): https://www.gov.il/BlobFolder/reports/developmentplan2023/ar/development_2023.pdf
- Investment Administration planning principles 2023: https://www.gov.il/BlobFolder/reports/developmentplan2023/he/planning%20principles%2023.pdf
- שה"מ, frost protection in subtropical orchards (Feb 2025): https://www.gov.il/BlobFolder/reports/defending-against-the-cold-subtropical/he/Professional_information_defending-against-the-cold-subtropical-2025.pdf
- Ministry guidelines for agricultural structures (planning appendix): https://apps.land.gov.il/IturTabotData/nispachim/jerus/1051421/100/נספח מס 4-הוראות בינוי.pdf
- Northern support track 2026–27 procedure: https://www.gov.il/BlobFolder/rfp/support_route_for_the_rehabilitation_and_expansion_of_agricultural_farms_in_communities_within_0_9_km_of_the_lebanese_border_26_27/he/procedure_support_rehabilitation_and_expansion_of_agricultural_farms_in_communities_2026_2027.pdf
- Davar on the ₪170M northern track: https://www.davar1.co.il/694671/ · Yeshuvnik: https://www.yeshuvnik.net/חקלאות/170-מיליון-ש-ח-להשקעה-בחקלאות-בחבל-תנופה-עד-3-מיליון-ש-ח-לחקלאי-802169
- שה"מ kiwi guidelines 2022: https://www.gov.il/BlobFolder/reports/kiwi-growth2022/ar/Professional_information_kiwi2022.pdf

**Research**
- Tanai, Naor, Cohen et al., shade nets in apple orchards (2004): https://www.mop-zafon.org.il/sites/default/files/uploads/pdf-files/articles/0298.pdf
- Shahak et al., coloured nets in Bar'am apples: https://israelagri.com/colored-shade-nets-for-improved-apple-quality-and-yield/
- Shahak, photo-selective netting review: https://www.researchgate.net/publication/237786951_PHOTO-SELECTIVE_NETTING_FOR_IMPROVED_PERFORMANCE_OF_HORTICULTURAL_CROPS_A_REVIEW_OF_ORNAMENTAL_AND_VEGETABLE_STUDIES_CARRIED_OUT_IN_ISRAEL
- Tanny, Cohen & Israeli, Screen constructions: microclimate and water use in Israel, Acta Hort. 927 (2012): https://ishs.org/ishs-article/927_63/
- Zemach / Northern R&D, banana irrigation in net house vs. open field, Jordan Valley: https://zemachtech.co.il/docs/מחקרי-בננות/דר-יאיר-ישראלי-בננות/השקית-בננות-בבית-רשת-ובשטח-פתוח-בעמק-הי/
- Shtull-Trauring et al., water footprint of Jordan Valley plantation crops, Frontiers in Plant Science (2016): https://pmc.ncbi.nlm.nih.gov/articles/PMC5155503/
- Israeli et al., saving irrigation water in bananas with shading screens: https://www.researchgate.net/publication/285635664_Saving_irrigation_water_in_a_banana_plantation_in_the_Jordan_Valley_using_shading_screens
- Banana screenhouse ET (MDPI Water 2022): https://doi.org/10.3390/w14071130
- Plants Council banana R&D: https://www.plants.org.il/uploadimages/mop16ba.pdf
- Northern R&D pearl-net banana report 2022: https://www.mop-zafon.org.il/sites/default/files/uploads/pdf-files/articles/דוח שנתי לתמיכות 2022- רשתות פנינה בבננה - נבות.pdf
- Negev banana irrigation and fertilization (mopdarom 2026): https://mopdarom.org.il/wp-content/uploads/2026/07/התאמת-השקיה-והדשיה-של-בננות-לגידול-על-סף-המדבר-25-1.pdf
- Coloured nets in pepper (mopdarom): https://mopdarom.org.il/wp-content/uploads/2025/05/צבעוניות-משפרות-יבול-בפלפל.pdf
- Gandorfer, Hartwich & Bitsch, anti-hail net vs. hail insurance, Acta Hort. 1132 (2016): https://portal.fis.tum.de/en/publications/hail-risk-management-in-fruit-production-anti-hail-net-versus-hai/
- IPB Portugal hail-net trial: https://bibliotecadigital.ipb.pt/entities/publication/a396a72b-3881-4361-bc3a-cf90e6c326cc
- UC ANR, netting in orchards: https://ucanr.edu/blog/topics-subtropics/article/netting-your-orchards-future

**Industry / market**
- TheMarker on the banana sector (sponsored, Plants Council): https://www.themarker.com/labels/israelisuccess/2023-09-19/ty-article-labels/0000018a-ac7a-df78-adca-ee7aa8e00000
- Calcalist on avocado (25.12.2025): https://www.calcalist.co.il/magazine/article/zhs2d5j0y
- Kibbutz Nirim avocado net-house trial: https://www.nirim.co.il/viewStaticPage.aspx?pageID=38
- CBI, European avocado market (updated 30.12.2025): https://www.cbi.eu/market-information/fresh-fruit-vegetables/avocados/market-entry
- Hass Avocado Board, Portugal profile 2023: https://hassavocadoboard.com/wp-content/uploads/hass-avocado-board-country-profile-2023-portugal.pdf
- FAO 2017 future of food and agriculture: https://www.fao.org/3/i6583e/i6583e.pdf
- FAO/CCSI screening guidance 2024: https://ccsi.columbia.edu/sites/ccsi.columbia.edu/files/content/docs/publications/ccsi-screening-responsbile-investment-agriculture-food-sytems-guidance-tools-government-officials-2024.pdf
- OECD-FAO responsible agricultural supply chains: https://www.oecd.org/en/topics/sub-issues/due-diligence-guidance-for-responsible-business-conduct/responsible-agriculture-supply-chains.html

**Competitor / SERP pages inspected**
- Hamashbir growth houses: https://www.hamashbir.co.il/departments/growth-houses/
- Ginegar: https://www.ginegar.com/he/ · Polysack: https://www.polysack.com/
- Green Nets: https://www.greennetsagro.com/growing-bananas-in-net-houses/ · https://www.greennetsagro.com/horticultural-greenhouse-nets/
- Meteor (directory): https://www.israel.agrisupportonline.com/directory/csv/csvread.pl?show=352&mytemplate=tp102
- Retail net pages: https://www.arm.co.il/items/2893385 · https://eyouagro.com/product/50-mesh-insect-netting/ · https://www.midrag.co.il/Content/Tip/14838 · https://www.midrag.co.il/Content/Price/3556
- Land-investment SERP: https://www.karkatova.co.il/ · https://climaxgrp.co.il/agricultural-vs-approved-land-investment/ · https://www.globes.co.il/news/article.aspx?did=1001484081
- Turnkey competitors: https://agrotop.co.il/ · https://www.dagan.co.il/Page.aspx?id=24&name=Turnkey+Projects · https://green-2000.com/ · https://seeka.co.nz/power-up-your-orchard-development
- Old MIFTAH site: http://www.miftah.co.il/

**Data caveats for writers**
1. Ministry costs are 2023 *recognized costs for grants*, not market prices. Check whether a newer annual plan has been published before going live.
2. TheMarker banana figures come from sponsored content. Prefer a Plants Council primary source if one can be obtained.
3. The Portugal avocado area varies widely by source (2,600–2,800 ha per HAB 2023; 4,500+ ha claims are unverified). Use HAB.
4. Confirm the FAO demand figure in the PDF before quoting it.
