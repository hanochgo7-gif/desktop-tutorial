# SEO and brand audit

28 October 2026. Run with the new marketing skills (`seo-audit`, `brand-review`) on https://miftah-site.vercel.app and `src/content.py`.

## Method and limits

- No SEO tool (Ahrefs or Semrush) is connected, so **no search volumes or rankings were measured**. The keyword picture comes from web searches and from the earlier SERP research in `greenhouse-brand/seo-articles/research/strategy.md`.
- Before relying on any keyword priority, check it by hand in Google.co.il, or connect Ahrefs.
- The old site's URL list was read from its own Yoast sitemaps at http://www.miftah.co.il (39 URLs).

## Executive summary

The technical base is strong:
- hreflang on every page and an image sitemap
- Organization, Breadcrumb, Service, FAQ and Video structured data
- canonical tags, fast pages and a clean HTML validator run

The biggest risk was that the old site's 39 indexed URLs would turn into 404s when the domain moves, losing whatever standing they have in Google. That is now covered.

The biggest opportunity is content. In Hebrew, the agricultural meaning of "בית רשת" competes with computer-network results and retail net shops, and no Israeli builder has a real guide on the topic. The five articles already written in `seo-articles/` were never added to the site.

## Done in this round

| Item | Change |
|---|---|
| Old URLs | 301 map for all 39 old WordPress URLs (Hebrew slugs, `?lang=en` pages, portfolio, testimonials, categories), in `.htaccess` (Nethost) and `vercel.json`. On Vercel, 37 of 39 return 308 to the right page; the other 2 are the home page, which correctly opens without a redirect. The Apache rules were checked with a simulator, not on a real Apache server; test once on Nethost. |
| Titles | The Net houses page title now names what growers search for: EN "Banana and orchard net houses, anti-hail nets", HE "בתי רשת חקלאיים למטעים ולבננות, רשת נגד ברד". |
| H1 | Projects: "Net house projects in Israel and abroad" / "פרויקטים של בתי רשת בישראל ובחו״ל". |
| FAQ | Six questions about net houses on the Net houses page, with ledger answers and FAQPage data: what a net house is, the net for bananas, the net against hail, who makes the parts, what happens before a quote, sheds and windbreaks. |
| Brand review | 20 copy fixes, listed below. |

### Brand-review fixes

- **Timeline and place claims:**
  - Belarus was described as coming after 2015. It doesn't; it's from the 2015 site (ledger 3.3).
  - "All run from Kfar Masaryk" was removed. The office used to be in Yehiam (D1).
  - The Projects description no longer folds Portugal and Belarus into the 410,000 m².
- **Over-claims:**
  - "certified for work at height" → "trained" (ledger 1.9 is Medium; 3.8 lists no certifications).
  - "structural engineers" → "practical engineers in construction" (2.8, 5.1).
  - "typical project size" → "minimum" (4.2).
  - "very airy" → "airy".
  - "reuse" of structures → "prepare the material for a new structure" (2.6).
- **Hebrew:**
  - Merav is "אשת הקשר הראשונה" (previously masculine).
  - The menu reads "יצירת קשר".
  - Kiwi: "סוכה לצמחי הקיווי" (previously "גפנים", which means grapevines).
  - "כוויות שמש" is used everywhere.
  - "עוד לא ברור"; "שכולם יוכלו".
  - The consent line is a full sentence.
- **English:**
  - Tense: "For more than 20 years we have designed…".
  - US spelling: catalog, inquiries.
  - "A word is a word" (the client's own phrase, ledger 4.5).
  - "each can be ordered on its own".
- **Legal wording:**
  - The accessibility statement says the site was *designed and built to meet* IS 5568 / WCAG AA, and that checks continue. The WCAG version is not stated.
  - The privacy policy now also mentions server logs (IP addresses), the form draft kept in the browser tab, and the globe's language setting.
- **Glossary** (`MIFTAH_POSITIONING.md`): "loading shed / סככת העמסה" and "turnkey farm / חוות מפתח" now match the site.

## Keyword opportunities

Relative estimates only; not measured.

| Keyword | Intent | Opportunity | Page today | Next step |
|---|---|---|---|---|
| בית רשת חקלאי / בתי רשת | Commercial | High: SERP mixed with computer networks, no strong agricultural page | Net houses | Pillar article (ready in `seo-articles/`) |
| רשת נגד ברד למטעים | Commercial | High: SERP is retail nets | Net houses (title + FAQ) | Article ready |
| בית רשת לבננות | Commercial | High: knowledge only in PDFs | Net houses (bananas) | Article ready |
| בית רשת לאבוקדו | Commercial | Medium | Crop selector | Article ready |
| השקעה בחקלאות בחו״ל | Investor | Medium: SERP is land speculation | Turnkey | Article ready |
| מחיר בית רשת לדונם | Price research | High demand, no answer anywhere | FAQ (how the price is set) | Owners' decision on a price range |
| anti-hail net structure, hail netting system | Commercial (EN) | Medium | Net houses (title) | EN versions of the articles |
| banana net house | Commercial (EN) | Medium | Net houses | — |
| turnkey farm development abroad | Investor (EN) | Medium | Turnkey | — |

## Next steps

**Owners or Hanoch:**
1. **Google Business Profile** for MIFTAH Projects, Kfar Masaryk. There isn't one (ledger 4.12). It's free and the biggest local-search win.
2. **Domain move:** point www.miftah.co.il to the new site with HTTPS (the old site has no working certificate), set `DOMAIN` in `build.py`, and test 3 old URLs.
3. **Google Search Console:** verify the domain, submit `sitemap.xml`, watch the 301s.
4. **Accessibility coordinator:** the statement needs a named contact with a phone and email (Israeli regulations).
5. **Legal company name** for the privacy policy (O7).

**Content:**

6. **Add the 5 ready articles as a "Knowledge" section.** First fact-check them against the ledger. They were written before the client rules: check the excluded winter-orchard photo, galvanized-only steel, the client names, and the Bar'am trial wording.
7. **Case studies** with photos, dunam and year once O2 is approved. This is the strongest content for "who builds net houses in Israel".
8. **Fresher numbers:** every figure abroad is from 2015.

## Checks

- Locally, after the changes:
  - Form: 23/23. Keyboard: 16/16. Farmer-panel checks: 22/22.
  - Widths: 240 loads, no issues.
  - Slogan: 162/162.
  - axe: no violations.
  - Console: 44 loads, no errors.
  - html-validate: clean.
- Live redirects: 37/39 return 308. The other 2 are home pages and return 200, as intended.
