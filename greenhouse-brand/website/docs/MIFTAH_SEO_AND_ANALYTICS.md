# MIFTAH SEO and analytics

## Search intent: what each page targets

Keyword research came from the market research file and from the earlier Hebrew SEO study in `greenhouse-brand/seo-articles/research/strategy.md`.

| Page | Main intent (EN) | Main intent (HE) | Title |
|---|---|---|---|
| Home | agricultural net houses, anti-hail net structures for orchards | בתי רשת למטעים | Net houses for orchards and bananas \| MIFTAH Projects |
| Net houses | banana net house, orchard net house, net house construction, loading shed | בית רשת לבננות, בית רשת למטע, סככת העמסה | Net houses for bananas and orchards \| MIFTAH Projects |
| Turnkey farms | turnkey farm abroad, agricultural investment Portugal | חווה בשיטת Turnkey בחו״ל | Turnkey farms abroad for investors \| MIFTAH Projects |
| Projects | net house projects Mexico, India, Spain… | פרויקטים של בתי רשת | Projects in Israel, Europe and the Americas \| MIFTAH Projects |
| About | MIFTAH Projects, Kfar Masaryk | מיפתח פרויקטים | About MIFTAH Projects: a family company in Israel |
| Contact | (brand and navigation) | | Discuss your project \| MIFTAH Projects |

There are no thin location pages and no per-country pages. Per-crop pages can follow once there is approved material per crop, such as photos and specifications per project.

## Technical SEO (implemented and checked)

- **Titles:** one per page, 25–61 characters.
- **Descriptions:** 145–160 characters (EN), checked by script.
- **Headings:** one `<h1>` per page (checked on all 20 HTML files), with h2 and h3 nested beneath it.
- **Canonical:** absolute (`https://www.miftah.co.il/...`) on every page except 404.
- **hreflang:** en, he and x-default (→ en) on every page and in the sitemap, reciprocal.
- **Sitemap:** `sitemap.xml` lists 16 URLs (8 pages × 2 languages; the profile is excluded) with `xhtml:link` alternates.
- **robots.txt:** allows all and points to the sitemap. The profile page is kept out of search by `noindex` alone; blocking it in robots.txt would stop crawlers from ever seeing that tag.
- **Structured data:** a JSON-LD `@graph` built only from ledger facts.
  - Organization: name, Hebrew name, phone, Kfar Masaryk, the 8 countries worked in, founders as co-CEOs, slogan.
  - WebSite (en, he), WebPage, BreadcrumbList on inner pages, and Service on Net houses and Turnkey farms.
  - Not included: a legal name (O7), reviews or ratings (none exist), founding date (unknown).
- **Social previews:** Open Graph and Twitter cards with a 1200×630 image (a frame from the real drone footage) and `og:locale` plus its alternate.
- **Alt text:** describes what is in each photo, without inventing places.
- **Language and direction:** `lang` and `dir` are set per page. The Hebrew URLs are under `/he/`.
- **Internal links:** every page links to the others through the header, the footer and the CTA. The routes on Home lead to the two service pages. Turnkey links to Net houses.
- **404 page:** served for unknown paths, with links to every page. Its links and assets are root-absolute, so it works at any depth (tested with a simulated deep URL). There is a 404 per language, chosen by `.htaccess`.
- **Redirects:** the old WordPress URLs from miftah.co.il (2015) should be 301-redirected when the new site goes live. The proposed mapping is below. The exact old paths must be confirmed against the live old site before setting them up on Nethost.

| Old (WordPress, from the saved pages) | New |
|---|---|
| `/` | `/he/` (Hebrew audience) |
| `/אודות` and the management page | `/he/about.html` |
| Agricultural covering solutions page | `/he/net-houses.html` |
| Consulting and planning page | `/he/net-houses.html` |
| Civil shading page | `/he/net-houses.html` (the service ended; no dedicated page) |
| Portfolio / project pages | `/he/projects.html` |
| Contact page | `/he/contact.html` |

**Lighthouse results** (October 2026, local server, mobile throttled / desktop):
- Performance 91–100.
- Accessibility, Best Practices and SEO: 100 on every page tested.
- See MIFTAH_QA_AND_STRESS_TEST_REPORT.md for the per-page figures.

## Not done yet (next phase)

- **Knowledge hub:** five Hebrew articles already exist in `greenhouse-brand/seo-articles/`. They need the owners' professional approval first (Q q40: Yiftach and/or Barak approve, Merav handles marketing). Then restyle them to this design system and add them under `/he/knowledge/`.
- **Google Business Profile:** none exists yet (Q q46). Create one for MIFTAH Projects in Kfar Masaryk, with the same name, phone and website as the JSON-LD.
- **Search Console:** verify both language versions after launch and submit the sitemap.

## Analytics

**Status: not connected.** No analytics ID was provided, and the site makes no third-party requests.

The tracking calls are already in the code (`window.miftahTrack` in `site.js`). They send nothing until a provider is added through `ANALYTICS` in `build.py`. Recommended: Plausible or another cookieless tool, because it needs no cookie banner. If one is added, update the privacy page first; it already says so.

| Event | Fires when | Properties |
|---|---|---|
| `cta_click` | Any "Discuss your project" button | `label` (header, nav, hero, band-…) |
| `phone_click` | Any `tel:` link | `where` (footer, band-…, contact, about) |
| `form_start` | First input in the form | |
| `form_invalid` | A submit is blocked by validation | `fields` (count) |
| `form_submit_success` | The endpoint returned 2xx | `need`, `size`, `country` (codes, not personal data) |
| `form_submit_error` | The endpoint failed | |
| `form_submit_unconnected` | Submitted while no endpoint is set | `need` |
| `video_play` / `video_pause` | Hero video button | |
| `lang_switch` | Language link | |
| `profile_print` | Print button on the profile | |

**Measurement plan.** These are the monthly report items that answer Q q47:
1. Qualified enquiries by country and by need. Use the form codes, and count only sizes that meet the minimum.
2. Phone clicks by page.
3. The path to the form (which page the visitor came from before Contact).
4. The share of Hebrew vs English visitors.
5. Profile prints, as a proxy for fair and quote usage.

Personal details never go to analytics, only codes.
