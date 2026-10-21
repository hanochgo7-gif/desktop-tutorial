# MIFTAH: technical SEO kit for the 5 flagship articles

Owner: technical SEO / web. Status: ready to implement. Last checked against Google Search Central: 21 Oct 2026.
Scope: Hebrew (RTL) article pages now, with English versions later. Everything below uses `{{PLACEHOLDERS}}`.

---

## 0. Read this first: what the live site looks like today (probed 21 Oct 2026)

Before writing the templates I fetched `www.miftah.co.il`. These findings change the plan, because the articles should not go live on the current stack as it is.

| Finding | Evidence | Impact | Fix |
|---|---|---|---|
| **No working HTTPS.** Port 443 serves the host's wildcard certificate `CN=*.nethost.co.il`. That certificate does not match `miftah.co.il` or `www.miftah.co.il`, so any `https://` visit shows a browser security error. | `curl -v https://www.miftah.co.il` | Browsers warn users. It weakens trust with investors and gives up a page-experience signal. Every canonical and `og:url` is currently `http://`. | Ask NetHost to issue a Let's Encrypt or AutoSSL certificate for both `miftah.co.il` and `www.miftah.co.il`, then 301 every `http://` URL to `https://www.` (see §8). **Blocker for launch.** |
| **Very old stack.** WordPress 4.7.17, PHP 5.3.29 (end of life since 2014), IIS 7.5 / ASP.NET (Windows Server 2008 R2 era), WPML 3.6.3, Yoast SEO 4.5 (2017), The7 theme, Visual Composer, Revolution Slider. | Response headers and generator tags | Security exposure. Current Rank Math or Yoast will not install on it, since both need PHP 7.4+ and a recent WordPress. The page is slow: about 25 CSS files and jQuery before content renders. | Migrate to a current Linux plan with PHP 8.2 or 8.3 and WordPress 6.x, or go static. See §8. |
| English versions use a query parameter (`?lang=en`). | `hreflang="en" href="http://www.miftah.co.il/?lang=en"` | Works, but it is fragile and hard to report on. | Use a `/en/` subdirectory (WPML: Languages → Language URL format → "Different languages in directories"). |
| Existing pages use Hebrew slugs, which appear percent-encoded when shared (`/%d7%90%d7%95%d7%93%d7%95%d7%aa/` = `/אודות/`). | page-sitemap.xml | They look ugly in WhatsApp and LinkedIn shares. | New URL plan in §3, with 1:1 301s. |
| Junk pages are indexed: `/sample-page/`, `/8/`, `/project/145/`, and a "Hello world" post `/ללא-קטגוריה/שלום-עולם/`. The civil-shading pages (`/פתרונות-קירוי-והצללה-אזרחיים/`, `/civil-shading-solutions/`, `/project/פרוייקטים-אזרחיים/` and others) still exist, although that service is discontinued. The homepage meta description still says "פתרונות קירוי והצללה אזרחיים". | sitemaps, `<meta name="description">` | Mixed topical signals. It also contradicts the brief. | Return 410 for the junk pages. 301 the civil-shading pages to the closest agricultural page, or 410 them. Rewrite the homepage description. |
| `viewport` blocks zoom (`maximum-scale=1, user-scalable=0`). | homepage `<head>` | An accessibility failure (Israeli standard IS 5568 / WCAG 1.4.4). | Use `width=device-width, initial-scale=1` only. |
| Fonts load from fonts.googleapis.com (Open Sans and Roboto Condensed, neither of which has Hebrew glyphs) and Font Awesome from maxcdn. | `<link>` tags | They are render-blocking. Sending visitors' IPs to Google Fonts is also a GDPR concern for EU visitors (Portugal, Germany). | Self-host one Hebrew variable font (§1.3). |
| No analytics tag detected in the HTML. | grep for gtag/GTM | There is no lead measurement yet. | §7. |

---

## 1. Reusable `<head>` template (article page, Hebrew)

### 1.1 Template

```html
<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- Title: about 50-60 Hebrew characters. Google truncates by pixel width (~600px). Main term first, brand last. -->
  <title>{{TITLE}} | מיפתח פרויקטים</title>
  <!-- Description: about 120-155 characters. Answer the search intent and include one concrete detail. No phone numbers or CAPS. -->
  <meta name="description" content="{{META_DESCRIPTION}}">

  <!-- Canonical: absolute, https, www, trailing slash, self-referencing. Never point it to the EN version. -->
  <link rel="canonical" href="https://www.miftah.co.il/articles/{{SLUG}}/">

  <!-- Robots: allow large image previews (Discover, AI features) and full snippets. -->
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">

  <!-- hreflang: ONLY output this block once the EN page exists and is live (return links must be reciprocal).
       The EN page carries the identical three lines. x-default = EN, because visitors whose language is
       neither Hebrew nor English (Portugal, Germany, Africa) read English. -->
  <link rel="alternate" hreflang="he" href="https://www.miftah.co.il/articles/{{SLUG}}/">
  <link rel="alternate" hreflang="en" href="https://www.miftah.co.il/en/articles/{{SLUG}}/">
  <link rel="alternate" hreflang="x-default" href="https://www.miftah.co.il/en/articles/{{SLUG}}/">

  <!-- Font: self-hosted, one preload only (the Hebrew subset of the body font). See 1.3. -->
  <link rel="preload" href="/assets/fonts/heebo-var-hebrew.woff2" as="font" type="font/woff2" crossorigin>

  <!-- LCP image preload. Use the SAME srcset/sizes as the hero <img>. type= lets browsers without AVIF skip it.
       If the hero is a plain WebP <img> (simplest option), drop type= and point to the .webp files. -->
  <link rel="preload" as="image" type="image/avif" fetchpriority="high"
        href="/media/articles/{{SLUG}}/{{HERO_BASENAME}}-1200.avif"
        imagesrcset="/media/articles/{{SLUG}}/{{HERO_BASENAME}}-480.avif 480w,
                     /media/articles/{{SLUG}}/{{HERO_BASENAME}}-800.avif 800w,
                     /media/articles/{{SLUG}}/{{HERO_BASENAME}}-1200.avif 1200w,
                     /media/articles/{{SLUG}}/{{HERO_BASENAME}}-1600.avif 1600w"
        imagesizes="(max-width: 840px) 100vw, 800px">

  <!-- Critical CSS inline (fonts, header, hero, typography). Defer the rest. -->
  <style>
    @font-face{font-family:"Heebo";src:url(/assets/fonts/heebo-var-hebrew.woff2) format("woff2");
      font-weight:300 800;font-display:swap;
      unicode-range:U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F;}
    @font-face{font-family:"Heebo";src:url(/assets/fonts/heebo-var-latin.woff2) format("woff2");
      font-weight:300 800;font-display:swap;
      unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD;}
    /* Metric-matched fallback to cut CLS during the swap. Compute the values with a tool such as fontaine or capsize. */
    @font-face{font-family:"Heebo Fallback";src:local("Arial");
      size-adjust:{{SIZE_ADJUST}}%;ascent-override:{{ASCENT}}%;descent-override:{{DESCENT}}%;line-gap-override:0%;}
    :root{--brand:#7FC49B;--brand-soft:#A8D8BC;}
    body{font-family:"Heebo","Heebo Fallback",Arial,"Noto Sans Hebrew",sans-serif;}
    h2[id],h3[id]{scroll-margin-top:5rem;} /* TOC anchors land below the sticky header */
  </style>
  <link rel="stylesheet" href="/assets/css/article.{{HASH}}.css" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="/assets/css/article.{{HASH}}.css"></noscript>

  <!-- Open Graph (WhatsApp, LinkedIn and Facebook all read these; WhatsApp is the main sharing channel) -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="מיפתח פרויקטים">
  <meta property="og:locale" content="he_IL">
  <meta property="og:locale:alternate" content="en_US">
  <meta property="og:title" content="{{OG_TITLE}}">            <!-- may differ from <title>, no brand suffix -->
  <meta property="og:description" content="{{OG_DESCRIPTION}}">
  <meta property="og:url" content="https://www.miftah.co.il/articles/{{SLUG}}/">
  <meta property="og:image" content="https://www.miftah.co.il/media/articles/{{SLUG}}/{{HERO_BASENAME}}-og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">       <!-- JPEG for OG: some social crawlers still reject AVIF -->
  <meta property="og:image:alt" content="{{HERO_ALT}}">
  <meta property="article:published_time" content="{{DATE_PUBLISHED_ISO}}">   <!-- e.g. 2026-11-10T09:00:00+02:00 -->
  <meta property="article:modified_time" content="{{DATE_MODIFIED_ISO}}">
  <meta property="article:author" content="https://www.miftah.co.il/about/yiftach-hasfel/">
  <meta property="article:section" content="{{SECTION}}">     <!-- בתי רשת | פרויקטי Turnkey -->

  <!-- X / Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{OG_TITLE}}">
  <meta name="twitter:description" content="{{OG_DESCRIPTION}}">
  <meta name="twitter:image" content="https://www.miftah.co.il/media/articles/{{SLUG}}/{{HERO_BASENAME}}-og.jpg">
  <meta name="twitter:image:alt" content="{{HERO_ALT}}">

  <meta name="author" content="יפתח הספל">
  <meta name="theme-color" content="#7FC49B">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="alternate" type="application/rss+xml" title="מיפתח פרויקטים: מאמרים" href="https://www.miftah.co.il/articles/feed/">

  <!-- Structured data: one @graph (section 2.2). Server-rendered, not injected by JS. -->
  <script type="application/ld+json">{{JSON_LD_GRAPH}}</script>

  <!-- Analytics last: GTM async, behind Consent Mode v2 defaults (section 7) -->
  {{CONSENT_DEFAULTS_SNIPPET}}
  {{GTM_SNIPPET}}
</head>
```

### 1.2 Rules behind the template
- **Title vs H1.** The `<h1>` can be longer and more natural. `<title>` is the search-focused version. Write both by hand, never auto-generated.
- **Dates.** Use ISO 8601 with Israel's offset: `+02:00` in winter (IST), `+03:00` from late March to late October (IDT). Google's Article docs ask for timezone information; without it, Googlebot's own timezone is assumed. Keep `article:*` meta, JSON-LD and the visible dates identical.
- **hreflang.** Values are `he` and `en`. Language codes alone are enough, since the target is speakers of each language rather than a country. Every listed URL must return 200 and be canonical. Never point hreflang at a 301 or a `?lang=` URL. Do not add it until the EN translation is live.
- **No `meta keywords` and no `noodp`.** Both are dead. The current site still outputs `noodp`.
- **AI features.** Keep the defaults: no `nosnippet` or `data-nosnippet` on article text, and `max-snippet:-1`. Google says "There are no additional requirements to appear in AI Overviews or AI Mode", and no special schema or "AI text files" are needed. Its May 2026 AI optimization guide says llms.txt is not used by Google Search. **Do not** switch on the Search Console "Search generative AI control" opt-out, which rolled out globally in Aug 2026. For a lead-generation site, citations in AI Overviews and AI Mode are exposure to investors.

### 1.3 Hebrew font strategy
1. **One family, variable, self-hosted: Heebo** (OFL; the brand logo SVG already uses Heebo). Use two WOFF2 subsets: Hebrew, and basic Latin for English terms, digits and `Turnkey`. `unicode-range` makes the Latin file download only when it is needed.
2. **Preload only the Hebrew subset.** Do not preload Latin or extra weights.
3. **`font-display: swap`** with a metric-matched `local("Arial")` fallback. Arial ships with Hebrew glyphs on Windows, macOS and iOS; Android falls back to Noto Sans Hebrew. This keeps CLS near zero during the swap.
4. **No Google Fonts CDN and no icon fonts.** Replace Font Awesome and Fontello with about five inline SVG icons (WhatsApp, phone, arrow, check, download).
5. For a premium editorial feel you may add **Frank Ruhl Libre** for H1 and H2 only. That costs one extra file; do not preload it, and keep `swap`. Optional.
6. **Typography for Hebrew readability.** Body 18px or more, `line-height` 1.7-1.8, measure about 60-75 characters, `text-align: start` (never `justify` in Hebrew). Wrap mixed-direction strings (`11%`, `Turnkey`, part numbers) in `<bdi>` or `<span dir="ltr">` where the order breaks.

---

## 2. JSON-LD templates

Principles:
- **One `@graph` per page with stable `@id`s.** The Organization and Person are defined once and referenced everywhere else.
- **Markup must match visible text.** No FAQ in JSON-LD unless the Q&A is visible on the page. No `aggregateRating`, because self-serving reviews are not eligible and the testimonials are not ratings.
- **Do not invent facts.** Fields the brief doesn't support (founding year, postal code, coordinates, opening hours, social URLs) stay as `{{PLACEHOLDERS}}`. Delete the property if the owners do not supply it.
- **Validate** every page in Rich Results Test and validator.schema.org before publishing.

### 2.1 Site-wide: Organization/LocalBusiness and WebSite
Output this on every page, or at least on the homepage, with the article pages referencing its `@id`s. If a full graph is impractical (for example, in a WordPress plugin), output it fully on the homepage and `/contact/` and keep only the `@id` references elsewhere.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "LocalBusiness"],
      "@id": "https://www.miftah.co.il/#organization",
      "name": "מיפתח פרויקטים",
      "alternateName": ["MIFTAH Projects", "Miftah", "מיפתח"],
      "url": "https://www.miftah.co.il/",
      "logo": {
        "@type": "ImageObject",
        "@id": "https://www.miftah.co.il/#logo",
        "url": "https://www.miftah.co.il/assets/brand/miftah-logo-512.png",
        "contentUrl": "https://www.miftah.co.il/assets/brand/miftah-logo-512.png",
        "width": 512,
        "height": 512,
        "caption": "מיפתח פרויקטים"
      },
      "image": "https://www.miftah.co.il/assets/brand/miftah-logo-512.png",
      "description": "מיפתח פרויקטים מתכננת, מייצרת ומקימה בתי רשת ומבנים חקלאיים מקצה לקצה – מהתכנון, דרך הייצור במפעל ועד ההקמה בשטח והתחזוקה – ומקימה ומנהלת חוות בפרויקטי Turnkey בישראל ובעולם.",
      "telephone": "+972-4-985-6969",
      "email": "{{EMAIL}}",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "{{STREET_OR_LEAVE_OUT}}",
        "addressLocality": "כפר מסריק",
        "postalCode": "{{POSTAL_CODE}}",
        "addressCountry": "IL"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "{{LAT}}",
        "longitude": "{{LNG}}"
      },
      "hasMap": "{{GOOGLE_MAPS_CID_URL}}",
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
          "opens": "{{OPENS}}",
          "closes": "{{CLOSES}}"
        }
      ],
      "areaServed": [
        { "@type": "Country", "name": "Israel" },
        { "@type": "Country", "name": "Portugal" },
        { "@type": "Place", "name": "Europe" },
        { "@type": "Place", "name": "Africa" }
      ],
      "knowsAbout": [
        "בתי רשת",
        "רשת נגד ברד",
        "רשת הצללה",
        "רשת נגד חרקים",
        "אחוז הצללה",
        "סככת העמסה",
        "שובר רוח",
        "הדליה בצורת סוכה",
        "פרויקט Turnkey חקלאי",
        "net houses",
        "anti-hail nets",
        "turnkey farm development"
      ],
      "founder": [
        { "@id": "https://www.miftah.co.il/#yiftach-hasfel" },
        { "@id": "https://www.miftah.co.il/#merav-hasfel" }
      ],
      "employee": [
        { "@id": "https://www.miftah.co.il/#yiftach-hasfel" },
        { "@id": "https://www.miftah.co.il/#merav-hasfel" }
      ],
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "telephone": "+972-4-985-6969",
          "contactType": "sales",
          "areaServed": ["IL", "PT", "DE", "150", "002"],
          "availableLanguage": ["he", "en"]
        }
      ],
      "sameAs": [
        "{{LINKEDIN_COMPANY_URL}}",
        "{{FACEBOOK_URL}}",
        "{{YOUTUBE_URL}}",
        "{{INSTAGRAM_URL}}",
        "{{GOOGLE_BUSINESS_PROFILE_URL}}",
        "{{WIKIDATA_URL_IF_CREATED}}"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://www.miftah.co.il/#website",
      "url": "https://www.miftah.co.il/",
      "name": "מיפתח פרויקטים",
      "alternateName": "MIFTAH Projects",
      "inLanguage": ["he-IL", "en"],
      "publisher": { "@id": "https://www.miftah.co.il/#organization" }
    },
    {
      "@type": "Person",
      "@id": "https://www.miftah.co.il/#merav-hasfel",
      "name": "מרב הספל",
      "alternateName": "Merav Hasfel",
      "jobTitle": "מנכ\"לית משותפת",
      "worksFor": { "@id": "https://www.miftah.co.il/#organization" }
    }
  ]
}
```
Notes:
- `["Organization","LocalBusiness"]`: LocalBusiness is already a subtype of Organization, so the array is redundant but valid. It is kept explicit because the same node serves as the Article `publisher` and as the local entity that matches the Google Business Profile. Keep NAP (name, address, phone) **character-identical** to GBP.
- `areaServed` codes in `contactPoint`: `150` = Europe and `002` = Africa (UN M49 region codes).
- **Logo.** Use a **square PNG, 512×512** (at least 112×112 per Google), on a white or transparent background. The SVG logos in the repo are fine on the page, but social platforms and some consumers do not accept SVG.
- `founder`: include it only if the owners confirm both are founders. Otherwise remove `founder` and keep `employee`.
- Leave out `foundingDate`. The brief only supports "more than 20 years".
- Remove the old Yoast `SearchAction` (sitelinks search box). Google retired that feature in 2024.

### 2.2 Article page: one `@graph` (WebPage + BlogPosting + Person + BreadcrumbList + ImageObject)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.miftah.co.il/articles/{{SLUG}}/#webpage",
      "url": "https://www.miftah.co.il/articles/{{SLUG}}/",
      "name": "{{TITLE}} | מיפתח פרויקטים",
      "description": "{{META_DESCRIPTION}}",
      "inLanguage": "he-IL",
      "isPartOf": { "@id": "https://www.miftah.co.il/#website" },
      "primaryImageOfPage": { "@id": "https://www.miftah.co.il/articles/{{SLUG}}/#primaryimage" },
      "breadcrumb": { "@id": "https://www.miftah.co.il/articles/{{SLUG}}/#breadcrumb" },
      "datePublished": "{{DATE_PUBLISHED_ISO}}",
      "dateModified": "{{DATE_MODIFIED_ISO}}",
      "lastReviewed": "{{DATE_REVIEWED_ISO}}",
      "reviewedBy": { "@id": "https://www.miftah.co.il/#{{REVIEWER_ID}}" }
    },
    {
      "@type": "BlogPosting",
      "@id": "https://www.miftah.co.il/articles/{{SLUG}}/#article",
      "mainEntityOfPage": { "@id": "https://www.miftah.co.il/articles/{{SLUG}}/#webpage" },
      "headline": "{{H1}}",
      "description": "{{META_DESCRIPTION}}",
      "inLanguage": "he-IL",
      "articleSection": "{{SECTION}}",
      "keywords": ["{{KEYWORD_1}}", "{{KEYWORD_2}}", "{{KEYWORD_3}}"],
      "about": [
        { "@type": "Thing", "name": "בית רשת", "sameAs": "{{WIKIDATA_OR_WIKIPEDIA_URL}}" }
      ],
      "image": [
        "https://www.miftah.co.il/media/articles/{{SLUG}}/{{HERO_BASENAME}}-16x9.jpg",
        "https://www.miftah.co.il/media/articles/{{SLUG}}/{{HERO_BASENAME}}-4x3.jpg",
        "https://www.miftah.co.il/media/articles/{{SLUG}}/{{HERO_BASENAME}}-1x1.jpg"
      ],
      "datePublished": "{{DATE_PUBLISHED_ISO}}",
      "dateModified": "{{DATE_MODIFIED_ISO}}",
      "author": [
        { "@id": "https://www.miftah.co.il/#yiftach-hasfel" }
      ],
      "publisher": { "@id": "https://www.miftah.co.il/#organization" },
      "isPartOf": { "@id": "https://www.miftah.co.il/#website" },
      "wordCount": "{{WORD_COUNT}}",
      "citation": [
        { "@type": "CreativeWork", "name": "{{SOURCE_1_TITLE}}", "url": "{{SOURCE_1_URL}}", "publisher": "{{SOURCE_1_PUBLISHER}}" },
        { "@type": "CreativeWork", "name": "{{SOURCE_2_TITLE}}", "url": "{{SOURCE_2_URL}}", "publisher": "{{SOURCE_2_PUBLISHER}}" }
      ],
      "workTranslation": { "@id": "https://www.miftah.co.il/en/articles/{{SLUG}}/#article" }
    },
    {
      "@type": "Person",
      "@id": "https://www.miftah.co.il/#yiftach-hasfel",
      "name": "יפתח הספל",
      "alternateName": "Yiftach Hasfel",
      "url": "https://www.miftah.co.il/about/yiftach-hasfel/",
      "image": "https://www.miftah.co.il/media/team/yiftach-hasfel-800.jpg",
      "jobTitle": "מנכ\"ל משותף",
      "worksFor": { "@id": "https://www.miftah.co.il/#organization" },
      "hasCredential": {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "הנדסאי בניין",
        "name": "הנדסאי בניין",
        "recognizedBy": {
          "@type": "CollegeOrUniversity",
          "name": "הטכניון – מכון טכנולוגי לישראל",
          "alternateName": "Technion – Israel Institute of Technology",
          "sameAs": "https://www.wikidata.org/wiki/Q333705"
        }
      },
      "alumniOf": {
        "@type": "CollegeOrUniversity",
        "name": "הטכניון – מכון טכנולוגי לישראל",
        "sameAs": "https://www.wikidata.org/wiki/Q333705"
      },
      "knowsAbout": [
        "תכנון הנדסי של בתי רשת",
        "מיפוי צרכים",
        "פיקוח ייצור",
        "ביצוע והקמה בשטח",
        "ניהול פרויקטים חקלאיים בחו\"ל"
      ],
      "sameAs": ["{{YIFTACH_LINKEDIN_URL}}"]
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.miftah.co.il/articles/{{SLUG}}/#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "דף הבית", "item": "https://www.miftah.co.il/" },
        { "@type": "ListItem", "position": 2, "name": "מאמרים", "item": "https://www.miftah.co.il/articles/" },
        { "@type": "ListItem", "position": 3, "name": "{{BREADCRUMB_SHORT_TITLE}}" }
      ]
    },
    {
      "@type": "ImageObject",
      "@id": "https://www.miftah.co.il/articles/{{SLUG}}/#primaryimage",
      "url": "https://www.miftah.co.il/media/articles/{{SLUG}}/{{HERO_BASENAME}}-1600.jpg",
      "contentUrl": "https://www.miftah.co.il/media/articles/{{SLUG}}/{{HERO_BASENAME}}-1600.jpg",
      "width": 1600,
      "height": 900,
      "caption": "{{HERO_CAPTION}}",
      "inLanguage": "he-IL",
      "creator": { "@id": "https://www.miftah.co.il/#organization" },
      "creditText": "מיפתח פרויקטים",
      "copyrightNotice": "© מיפתח פרויקטים",
      "license": "https://www.miftah.co.il/image-use/",
      "acquireLicensePage": "https://www.miftah.co.il/contact/",
      "representativeOfPage": true
    }
  ]
}
```
Notes:
- **Article rich result status (Google docs).** No properties are required. The recommended ones are `author` (with `name` plus `url` or `sameAs`), `datePublished`, `dateModified`, `headline` and `image`. Images should be at least 50K pixels and come in **16:9, 4:3 and 1:1**, all crawlable. `author.name` holds the name only; the job title goes in `jobTitle`, never in the name.
- **`reviewedBy` and `lastReviewed`** apply only if a second expert actually reviews the article. For agronomy or turnkey topics that could be Barak (Green Arava), with his consent, defined as another Person node. Otherwise delete both lines.
- **`citation`.** List the real sources that back each statistic (FAO, the Ministry of Agriculture / Volcani, universities). It mirrors the visible "מקורות" (sources) list and is a good trust signal for people and machines.
- **`workTranslation` / `translationOfWork`.** Add them once the EN page exists (the EN BlogPosting gets `"translationOfWork": {"@id": ".../articles/{{SLUG}}/#article"}`). Until then, delete the line.
- **Breadcrumb.** The last item omits `item`, which is allowed for the current page. Since Jan 2025, Google shows breadcrumbs **only in desktop results**, not on mobile, but the markup still helps Google understand the site structure. Render a visible breadcrumb on the page that matches it.
- **`about.sameAs`** links to an unambiguous Wikidata or Wikipedia entity (for example, "Shade net" or "Hail net"). Check that the entity exists before adding it.
- **`license`/`acquireLicensePage`** apply only to MIFTAH's own photos, and only if the company wants Google Images' "Licensable" badge. Otherwise keep only `creator`, `creditText` and `copyrightNotice`. Google requires `contentUrl` plus at least one of `creator`, `creditText`, `copyrightNotice` or `license`.

### 2.3 FAQPage: optional, keep only for semantics

**Status (verified in the Search Central changelog):** FAQ rich results were restricted to authoritative government and health sites in Sept 2023. They **stopped appearing for all sites on 7 May 2026**, and the documentation was removed on 15 June 2026; the Search Console report and API are being retired. Google says the markup remains valid, it may still use it to understand the page, and leaving it in place causes no errors or ranking effect.

**What still has value:** the **visible** Q&A section. It provides short, quotable answers that AI Overviews, AI Mode, Bing/Copilot and ChatGPT search can extract, and it captures long-tail questions. The JSON-LD itself is now a low-cost hint and may help other consumers, including Bing and AI assistants that parse schema. Keep it only where the questions are real and visible. Never add it for questions that are not on the page, and do not run question-stuffing campaigns: Google's May 2026 AI guide warns that rewriting content for AI by packing in every phrasing of a question risks being treated as scaled content abuse.

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://www.miftah.co.il/articles/{{SLUG}}/#faq",
  "isPartOf": { "@id": "https://www.miftah.co.il/articles/{{SLUG}}/#webpage" },
  "inLanguage": "he-IL",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{{QUESTION_1}}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{{ANSWER_1_SAME_TEXT_AS_ON_PAGE}}"
      }
    },
    {
      "@type": "Question",
      "name": "{{QUESTION_2}}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{{ANSWER_2_SAME_TEXT_AS_ON_PAGE}}"
      }
    }
  ]
}
```
Example of a fitting question, using brief facts only: "מה גודל הפרויקט המינימלי שמיפתח מבצעת?" ("What is the minimum project size MIFTAH takes on?"). Answer: "בישראל – החל מ-50 דונם; בחו"ל – החל מ-30 הקטאר." ("In Israel, from 50 dunam; abroad, from 30 hectares.") This also filters out bad-fit leads.

### 2.4 Standalone ImageObject (in-article photos, charts, AI illustrations)
Add these for the important figures only (hero, real project photos, charts). Put them inside the page `@graph` and reference them from `BlogPosting.image` or `associatedMedia`.

```json
{
  "@type": "ImageObject",
  "@id": "https://www.miftah.co.il/articles/{{SLUG}}/#fig-{{N}}",
  "contentUrl": "https://www.miftah.co.il/media/articles/{{SLUG}}/{{FILE_BASENAME}}-1200.jpg",
  "width": 1200,
  "height": 800,
  "caption": "{{FIGCAPTION_TEXT}}",
  "creditText": "{{CREDIT}}",
  "creator": { "@id": "https://www.miftah.co.il/#organization" },
  "copyrightNotice": "© מיפתח פרויקטים",
  "digitalSourceType": "https://schema.org/{{DIGITAL_SOURCE_TYPE}}"
}
```
`{{DIGITAL_SOURCE_TYPE}}` takes one of these schema.org `IPTCDigitalSourceEnumeration` values:
- `DigitalCaptureDigitalSource` for real camera photos.
- `MinorHumanEditsDigitalSource` for photos that were only lightly edited.
- `TrainedAlgorithmicMediaDigitalSource` for fully AI-generated illustrations.
- `CompositeWithTrainedAlgorithmicMediaDigitalSource` for real photos with AI inpainting or outpainting.
- `DataDrivenMediaDigitalSource` for charts drawn from data.
- `DigitalArtDigitalSource` for hand-made diagrams.

For the AI cases, the figcaption must say so too (§4.6).

### 2.5 Author page: ProfilePage (`/about/yiftach-hasfel/`)
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfilePage",
      "@id": "https://www.miftah.co.il/about/yiftach-hasfel/#profilepage",
      "url": "https://www.miftah.co.il/about/yiftach-hasfel/",
      "name": "יפתח הספל – מנכ\"ל משותף, מיפתח פרויקטים",
      "inLanguage": "he-IL",
      "isPartOf": { "@id": "https://www.miftah.co.il/#website" },
      "dateModified": "{{DATE_MODIFIED_ISO}}",
      "mainEntity": { "@id": "https://www.miftah.co.il/#yiftach-hasfel" }
    },
    {
      "@type": "Person",
      "@id": "https://www.miftah.co.il/#yiftach-hasfel",
      "name": "יפתח הספל",
      "alternateName": "Yiftach Hasfel",
      "url": "https://www.miftah.co.il/about/yiftach-hasfel/",
      "image": "https://www.miftah.co.il/media/team/yiftach-hasfel-800.jpg",
      "jobTitle": "מנכ\"ל משותף",
      "description": "{{BIO_ONE_SENTENCE}}",
      "worksFor": { "@id": "https://www.miftah.co.il/#organization" },
      "sameAs": ["{{YIFTACH_LINKEDIN_URL}}"]
    }
  ]
}
```
On the author page, use the full Person node from §2.2 (credential and `knowsAbout`). It is shortened here only to save space.

---

## 3. URL structure, categories and internal linking

### 3.1 Decisions
| Topic | Recommendation | Why |
|---|---|---|
| Protocol and host | `https://www.miftah.co.il/` only. 301 `http://`, the bare domain and `index.php` variants to it. | Single canonical host. www is already the current preference. |
| Articles folder | **`/articles/`** (nav label "מאמרים", or "מרכז ידע" / knowledge center) | It sounds more authoritative than `/blog/` for investor-facing expert content, and it is just as clean. Either works for Google; pick one and never change it. |
| Language | Hebrew at the root, **English at `/en/`**, mirroring paths: `/articles/x/` ↔ `/en/articles/x/` | A subdirectory consolidates authority on one domain. It is easy for WPML, Polylang or a static site, and easy to segment in Search Console and GA4. |
| Slugs | **Short English ASCII slugs, identical for HE and EN** (e.g. `/articles/net-house-guide/` and `/en/articles/net-house-guide/`) | Google accepts UTF-8 Hebrew slugs, and URL words are a very minor signal. ASCII slugs, however, stay readable when pasted in WhatsApp, email and LinkedIn (no `%D7%91…`). They avoid encoding bugs on IIS and older plugins, keep analytics reports readable, and make hreflang mapping trivial. Keep each slug to 2-5 words, lowercase, hyphens, no dates or stop-words. |
| Trailing slash | Always (WordPress default) | Pick one form and 301 the other. |
| Category archives | **Don't index them at launch.** With 5 articles they are thin. The `/articles/` hub plus the service pages act as the topic hubs. Once 10 or more articles exist, add `/articles/topic/net-houses/` and `/articles/topic/turnkey-farms/` with a written intro. Tags: none, or `noindex`. | Avoids thin or duplicate archives. |
| Service pages (clean slugs, 301 from the old Hebrew ones) | `/net-houses/` (בתי רשת), `/net-houses/bananas/`, `/net-houses/orchards/`, `/net-houses/vegetables/`, `/loading-sheds/` (סככות העמסה), `/windbreaks/` (שוברי רוח), `/turnkey-farms/` (פרויקטי Turnkey), `/projects/` and `/projects/{{slug}}/`, `/about/`, `/about/yiftach-hasfel/`, `/about/merav-hasfel/`, `/recommendations/` (המלצות), `/contact/` | The HTTPS move already forces a 301 for every URL, so restructure **once**, in the same release, with a 1:1 redirect map. |
| Old → new examples | `/פתרונות-קירוי-והצללה-חקלאיים/` → `/net-houses/` · `/project/בתי-רשת-לבננות/` → `/net-houses/bananas/` · `/project/סככות-העמסה/` → `/loading-sheds/` · `/project/פרוייקטים-בעולם/` → `/turnkey-farms/` · `/המלצות/` → `/recommendations/` · `/יצירת-קשר/` → `/contact/` · `/הנהלה/` → `/about/` · `/ייעוץ-תכנון-ניהול-והדרכה/` → `/turnkey-farms/` (verify the content fit) · civil-shading pages → 410, or 301 to `/net-houses/` · `/?lang=en` URLs → `/en/…` equivalents | Keeps whatever link equity exists. Keep the redirects in place permanently. |

### 3.2 Pillar/cluster map for the 5 articles
Use the content lead's final titles. The topic slots below are a working assumption and fit the brief's services.

| ID | Role | Working topic (HE) | Slug | Money page it feeds |
|---|---|---|---|---|
| A1 | **Pillar** | בית רשת: המדריך המלא למשקיע – תכנון, ייצור, הקמה ותחזוקה (net house: the complete investor's guide) | `/articles/net-house-guide/` | `/net-houses/` |
| A2 | Cluster (of A1) | איך בוחרים רשת: נגד ברד, הצללה, נגד חרקים ואחוז הצללה (choosing a net: anti-hail, shade, anti-insect, shade percentage) | `/articles/choosing-net-shade-percentage/` | `/net-houses/` |
| A3 | Cluster (of A1) | בתי רשת לפי גידול: בננות, קיווי (הדליה בצורת סוכה), תפוחים, דובדבן, אבוקדו (net houses by crop) | `/articles/net-houses-by-crop/` | `/net-houses/bananas/`, `/net-houses/orchards/` |
| A4 | **Pillar 2** | פרויקט Turnkey חקלאי בחו"ל: מבדיקת קרקע ועד שיווק היבול (turnkey farm abroad: from soil test to crop marketing) | `/articles/turnkey-farm-abroad/` | `/turnkey-farms/` |
| A5 | Bridge (A1↔A4) | הטעויות היקרות בהקמת פרויקט חקלאי – ולמה "לעשות לבד" עולה יותר (the costly mistakes in setting up a farm project) | `/articles/farm-project-mistakes/` | `/turnkey-farms/` + `/contact/` |

**Linking rules (each article):**
1. **Up.** A cluster links to its pillar within the first 2-3 paragraphs, with descriptive Hebrew anchor text (e.g. "המדריך המלא לתכנון בית רשת", "the complete guide to planning a net house"), never "לחצו כאן" ("click here").
2. **Down.** A pillar links to every one of its clusters from the relevant H2 sections, and lists them again in a "להמשך קריאה" (further reading) block.
3. **Sideways.** One or two contextual links to sibling articles where the topic genuinely continues (A2↔A3, A4↔A5).
4. **To money pages.** At least one contextual link to the matching service page, plus one to `/projects/`, using the project types from the brief (for example "בית רשת לקיווי בברעם עם הדליה בצורת סוכה", a kiwi net house in Bar'am with a pergola trellis).
5. **Author.** Byline links to `/about/yiftach-hasfel/`.
6. **Reverse links (just as important).** Each service page gets a "מדריכים ומאמרים" (guides and articles) block linking to its 1-3 articles. The homepage links to `/articles/` and the two pillars. Add the `/articles/` hub to the main nav and the footer.
7. **CTA.** Every article has a mid-article and an end-of-article CTA (WhatsApp, phone, form) pointing to `/contact/` or `wa.me`. These are measured (§7).
8. Aim for 3-8 internal links in the body per article. No sitewide footer link farms. Use one anchor-text variant per target and keep it consistent.

```
            ┌──────────── /net-houses/ (+ /bananas/ /orchards/ /vegetables/) ◄──┐
            │                    ▲                                               │
  A2 ──► A1 (pillar) ◄── A3      │                                               │
   ▲      │  ▲                   │                                               │
   └──────┘  └──── A5 (bridge) ──┼──► /turnkey-farms/ ◄── A4 (pillar 2) ◄────────┘
                     │           │            ▲              │
                     └───────────┴──► /projects/ ◄───────────┘
   All ──► /about/yiftach-hasfel/ · /contact/ · WhatsApp     /articles/ hub ──► all five
```

---

## 4. Image SEO

### 4.1 File naming
- Lowercase English ASCII with hyphens, in the order **subject, crop/structure, place, detail**: `banana-net-house-western-galilee-interior.avif`, `kiwi-net-house-baram-pergola-trellis.avif`, `apple-net-house-golan-folded-net-winter.avif`, `factory-pole-testing-kfar-masaryk.avif`, `chart-{{topic}}.svg`.
- Add a size suffix to generated variants: `-480`, `-800`, `-1200`, `-1600`, `-og`, `-1x1`, `-4x3`, `-16x9`.
- Store them per article: `/media/articles/{{SLUG}}/…`. Each image keeps one stable URL; never reuse a URL for a different image (Google, May 2025 update).

### 4.2 Alt text pattern (Hebrew)
`[what is shown] + [crop/structure type] + [place or context] + [the one detail that matters for this paragraph]`. Aim for about 80-125 characters, written as a natural sentence. No keyword lists, no "תמונה של…" ("picture of…"), and the alt text must not repeat the caption word for word.
- `בית רשת לבננות בגליל המערבי, מבט מבפנים על שורות הצמחים מתחת לרשת 11%` (banana net house in the Western Galilee, inside view of the plant rows under an 11% net)
- `מטע תפוחים ברמת הגולן, הרשת מקופלת לאורך שורות העמודים לקראת החורף` (apple orchard in the Golan Heights, net folded along the pole rows ahead of winter)
- `צוות מוסמך לעבודה בגובה מותח כבלים בבית רשת לקיווי בברעם` (a crew certified for work at height tensioning cables in a kiwi net house in Bar'am)
- Decorative images get `alt=""`. Charts get a short alt or `aria-label`, with the full data in a table (§5).
- English versions get their own native English alt text. Do not machine-translate it.

### 4.3 Formats, sizes and weight budget
| Use | Aspect | Widths generated | Format | Budget (guide) |
|---|---|---|---|---|
| Hero / LCP | 16:9 | 480, 800, 1200, 1600 | AVIF (q≈50-60) with WebP (q≈75-80) fallback via `<picture>`; JPEG `src` fallback | ≤ 120-180 KB at 1200w |
| In-article photo | 3:2 or 4:3 | 480, 800, 1200 | AVIF + WebP | ≤ 100 KB at 800w |
| Article schema images | 16:9, 4:3, 1:1 | 1200 px wide (1200×675, 1200×900, 1200×1200) | JPEG or WebP (crawlable) | n/a |
| OG / social | 1.91:1 | 1200×630 | JPEG | ≤ 300 KB |
| Charts and diagrams | any | n/a | inline SVG (§5) | < 15 KB |
| Logo for schema | 1:1 | 512×512 | PNG | n/a |

Use real photos from MIFTAH's own projects and factory wherever possible, since original imagery is first-hand evidence for E-E-A-T. Avoid images with baked-in text.

### 4.4 Markup rules
- Always set **`width` and `height`** (intrinsic pixels) on every `<img>`, plus CSS `img{max-width:100%;height:auto}`. This prevents CLS.
- **Hero:** `fetchpriority="high"`, **no** `loading="lazy"`, `decoding="async"` is fine, and it is preloaded in `<head>`.
- **Everything below the first screen:** `loading="lazy" decoding="async"`. Never lazy-load the first image in the content.
- Use a real `<img>` in the HTML, never a CSS background, because Google does not index CSS images. Include a fallback `src`.
- Keep `sizes` accurate (`(max-width: 840px) 100vw, 800px` for a column of about 800px).

### 4.5 `<figure>` pattern
```html
<figure class="fig" id="fig-banana-galilee">
  <picture>
    <source type="image/avif"
            srcset="/media/articles/{{SLUG}}/banana-net-house-western-galilee-interior-480.avif 480w,
                    /media/articles/{{SLUG}}/banana-net-house-western-galilee-interior-800.avif 800w,
                    /media/articles/{{SLUG}}/banana-net-house-western-galilee-interior-1200.avif 1200w"
            sizes="(max-width: 840px) 100vw, 800px">
    <source type="image/webp"
            srcset="/media/articles/{{SLUG}}/banana-net-house-western-galilee-interior-480.webp 480w,
                    /media/articles/{{SLUG}}/banana-net-house-western-galilee-interior-800.webp 800w,
                    /media/articles/{{SLUG}}/banana-net-house-western-galilee-interior-1200.webp 1200w"
            sizes="(max-width: 840px) 100vw, 800px">
    <img src="/media/articles/{{SLUG}}/banana-net-house-western-galilee-interior-800.jpg"
         width="1200" height="800" loading="lazy" decoding="async"
         alt="בית רשת לבננות בגליל המערבי, מבט מבפנים על שורות הצמחים מתחת לרשת 11%">
  </picture>
  <figcaption>
    בית רשת לבננות בגליל המערבי. <span class="credit">צילום: מיפתח פרויקטים</span>
  </figcaption>
</figure>
```

### 4.6 Marking AI-generated illustrations honestly
Use a three-layer approach: visible label, embedded metadata and structured data.
1. **Visible caption (mandatory):**
   `<figcaption>איור להמחשה – נוצר בעזרת בינה מלאכותית. אינו תיעוד של פרויקט של מיפתח.</figcaption>`
   (Illustration for explanation, created with AI. It does not document a MIFTAH project.) Add `data-ai-generated="true"` on the `<figure>` and a small badge "איור AI" ("AI illustration").
2. **Rules.**
   - Never use AI images to represent a real project, a real client, the factory or the crew.
   - Never use them in `/projects/`.
   - Never make one the hero of an article that describes real work. Prefer a real photo for every hero.
   - Alt text describes the illustration as an illustration (e.g. "איור סכמטי של חתך בית רשת: עמודים, כבלים ורשת", a schematic illustration of a net-house cross-section: poles, cables and net).
3. **IPTC metadata in the file** uses Google's documented values. `trainedAlgorithmicMedia` means "created algorithmically using a model derived from sampled content"; `compositeWithTrainedAlgorithmicMedia` means a real image with AI in- or outpainting. Merchant Center *requires* this for AI images; for articles it is best practice.
   ```bash
   exiftool -overwrite_original \
     -XMP-iptcExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia" \
     -XMP-dc:Description="איור להמחשה – נוצר בעזרת בינה מלאכותית" \
     -XMP-photoshop:Credit="מיפתח פרויקטים (איור AI)" \
     illustration-net-house-cross-section-1200.webp
   ```
   Run this **after** the AVIF/WebP conversion. Encoders and WordPress's generated thumbnails usually strip XMP, so check with `exiftool -XMP:all file`. If the generator embeds **C2PA Content Credentials**, keep them by not re-encoding the master. Google can surface C2PA data in "About this image" when it is signed with C2PA 2.1+ by a certificate on the C2PA trust list.
4. **Structured data:** `"digitalSourceType": "https://schema.org/TrainedAlgorithmicMediaDigitalSource"` on that ImageObject (§2.4). Google uses structured data over IPTC when the two conflict, so keep them consistent.
5. Add a one-line **"איך נכתב המאמר"** ("how this article was written") note in the footer of the article: the author, the factual sources, and that some illustrations were created with AI and are marked as such. This follows Google's "Who / How / Why" guidance and its generative-AI content guidance (fact-check everything, explain automation where readers would expect it).

---

## 5. Charts: accessible, indexable, fast inline SVG

Pattern: `<figure>` → inline `<svg role="img">` with `<title>` and `<desc>` → a real HTML `<table>` with the same numbers → `<figcaption>` with the **source link**. The table is the indexable, reliable version for Google, AI systems, screen readers and copy-paste. The SVG is the visual. No JS library, no canvas, no image file. It costs a few KB and causes no layout shift because the `viewBox` fixes the aspect ratio.

```html
<figure class="chart" id="chart-{{ID}}" aria-labelledby="chart-{{ID}}-cap">
  <svg viewBox="0 0 640 260" width="100%" role="img"
       aria-labelledby="chart-{{ID}}-title chart-{{ID}}-desc" focusable="false"
       style="max-width:640px;height:auto;display:block">
    <title id="chart-{{ID}}-title">{{CHART_TITLE}}</title>
    <desc id="chart-{{ID}}-desc">{{ONE_SENTENCE_TAKEAWAY_WITH_THE_KEY_NUMBERS}}. מקור: {{SOURCE_NAME}}.</desc>
    <!-- RTL horizontal bars: category labels on the right, bars grow leftward from x=470.
         DUMMY GEOMETRY BELOW – replace each width/value with SOURCED data. Bar width = value * (440 / MAX). -->
    <g font-family="Heebo, Arial, sans-serif" font-size="15" fill="currentColor">
      <g aria-hidden="true">
        <line x1="470" y1="20" x2="470" y2="230" stroke="currentColor" stroke-opacity=".3"/>
        <!-- row 1 -->
        <text x="630" y="55" text-anchor="end" direction="rtl">{{LABEL_1}}</text>
        <rect x="{{470 - W1}}" y="38" width="{{W1}}" height="26" rx="3" fill="#7FC49B"/>
        <text x="{{470 - W1 - 8}}" y="56" text-anchor="end" direction="ltr">{{VALUE_1}}</text>
        <!-- row 2 -->
        <text x="630" y="115" text-anchor="end" direction="rtl">{{LABEL_2}}</text>
        <rect x="{{470 - W2}}" y="98" width="{{W2}}" height="26" rx="3" fill="#7FC49B"/>
        <text x="{{470 - W2 - 8}}" y="116" text-anchor="end" direction="ltr">{{VALUE_2}}</text>
        <!-- row 3 (highlight the row the article is about) -->
        <text x="630" y="175" text-anchor="end" direction="rtl">{{LABEL_3}}</text>
        <rect x="{{470 - W3}}" y="158" width="{{W3}}" height="26" rx="3" fill="#2F7A55"/>
        <text x="{{470 - W3 - 8}}" y="176" text-anchor="end" direction="ltr">{{VALUE_3}}</text>
      </g>
    </g>
  </svg>

  <!-- Same numbers as text. Leave visible, or wrap in <details> (still in the DOM and indexed). -->
  <details>
    <summary>הנתונים בטבלה</summary>
    <table>
      <caption>{{CHART_TITLE}}</caption>
      <thead><tr><th scope="col">{{COL_1_HEADER}}</th><th scope="col">{{COL_2_HEADER_WITH_UNIT}}</th></tr></thead>
      <tbody>
        <tr><th scope="row">{{LABEL_1}}</th><td>{{VALUE_1}}</td></tr>
        <tr><th scope="row">{{LABEL_2}}</th><td>{{VALUE_2}}</td></tr>
        <tr><th scope="row">{{LABEL_3}}</th><td>{{VALUE_3}}</td></tr>
      </tbody>
    </table>
  </details>

  <figcaption id="chart-{{ID}}-cap">
    {{CHART_TITLE}}. מקור: <a href="{{SOURCE_URL}}" rel="noopener">{{SOURCE_NAME}}, {{YEAR}}</a>.
  </figcaption>
</figure>
```
Rules:
- **Every number must come from a cited source** (brief, rule 2). If no source exists, don't draw the chart; use a qualitative diagram instead.
- Use `currentColor` and CSS variables so the chart follows the text colour and works in dark mode. Keep contrast at 3:1 or better for bars and 4.5:1 for text. Do not rely on colour alone; label every bar directly instead of using a legend.
- Put numbers in `direction="ltr"` (or `<bdi>` in HTML) so `11%` and decimals do not flip in RTL.
- Mark the drawn geometry `aria-hidden` and let `<title>`/`<desc>` speak, so screen readers don't read bar fragments.
- Keep it static, with no hover-only information. Hover tooltips are optional, and everything they show must also be in the table.
- To let charts appear in Google Images, also export a PNG/WebP copy (with `digitalSourceType: DataDrivenMediaDigitalSource`). That is optional; the inline SVG plus table is the priority.

---

## 6. Page quality: CWV, TOC, dates, E-E-A-T

### 6.1 Core Web Vitals checklist (pass at the 75th percentile, on mobile)
Targets: **LCP ≤ 2.5 s · INP ≤ 200 ms · CLS ≤ 0.1**. Supporting targets: TTFB ≤ 0.8 s, total transfer ≤ 1 MB, ≤ 15 requests above the fold.

**Server and network**
- [ ] Valid HTTPS with HTTP/2 or HTTP/3, Brotli or gzip, and a full-page cache (WordPress) or static HTML.
- [ ] `Cache-Control: public, max-age=31536000, immutable` for hashed CSS, JS, fonts and images; short TTL for HTML.
- [ ] Optional: Cloudflare (free plan) in front of NetHost, using **Full (strict)** SSL with an origin certificate (never "Flexible").
- [ ] No redirect chains: http → https → www should be a single hop.

**LCP**
- [ ] The hero is a real `<img>`, preloaded, `fetchpriority="high"`, AVIF or WebP, ≤ 180 KB, with no lazy-loading, slider or fade-in animation.
- [ ] Critical CSS is inline and the rest is deferred. The article template contains no Revolution Slider, no Visual Composer CSS and no Font Awesome.
- [ ] Only one font file is preloaded.

**CLS**
- [ ] `width`/`height` on every image, `aspect-ratio` boxes for embeds, and space reserved for the TOC and CTA blocks.
- [ ] The cookie banner and the sticky WhatsApp button are `position:fixed` overlays and never push content.
- [ ] The metric-matched font fallback is in place.

**INP**
- [ ] No jQuery on article pages (vanilla JS only), and total JS ≤ 50 KB compressed.
- [ ] GTM loads with a minimal container and consent first, with no heatmap or chat widgets on load.
- [ ] YouTube uses a lite facade (thumbnail plus play button), loading the iframe on click.
- [ ] TOC and accordion use native `<details>` or plain anchors, no JS.

**Verify**
- [ ] PageSpeed Insights (mobile) on each article, the Search Console Core Web Vitals report after 28 days, and the Chrome UX Report once traffic exists.

### 6.2 Table of contents with anchor links
```html
<nav class="toc" aria-labelledby="toc-title">
  <h2 id="toc-title">בעמוד זה</h2>
  <ol>
    <li><a href="#planning">תכנון בית רשת: ממה מתחילים</a></li>
    <li><a href="#net-types">סוגי רשתות ואחוז הצללה</a></li>
    <li><a href="#factory">ייצור ובדיקה במפעל לפני השטח</a></li>
    <li><a href="#installation">הקמה בשטח וצוותים מוסמכים לעבודה בגובה</a></li>
    <li><a href="#faq">שאלות נפוצות</a></li>
  </ol>
</nav>
…
<h2 id="net-types">סוגי רשתות ואחוז הצללה</h2>
```
- Use **ASCII `id`s** (short and stable). Hebrew ids work but break when shared as `#%D7…`. Never change an id after publishing, because people and Google link to it. Google's "Read more" deep links (Apr 2026 docs) can send users straight to a section, so clear section headings help.
- Place the TOC after the intro paragraph, before the first H2. It is collapsible (`<details open>`) on mobile, and it holds H2 entries only (H3s at most for the pillar).
- Start each H2 section with a **1-2 sentence direct answer**, then expand with the detail. This works for people, featured snippets and AI Overviews alike. It is not "chunking": write normal, flowing sections.

### 6.3 "Last updated" and reviewed-by pattern
```html
<header class="article-meta">
  <p class="byline">
    מאת <a href="/about/yiftach-hasfel/" rel="author">יפתח הספל</a>, מנכ"ל משותף, הנדסאי בניין (הטכניון)
  </p>
  <p class="dates">
    פורסם: <time datetime="{{DATE_PUBLISHED_ISO}}">{{DATE_PUBLISHED_HE}}</time>
    · עודכן לאחרונה: <time datetime="{{DATE_MODIFIED_ISO}}">{{DATE_MODIFIED_HE}}</time>
  </p>
  <!-- only if a real second expert reviewed it -->
  <p class="review">נבדק מקצועית על ידי <a href="/about/{{REVIEWER_SLUG}}/">{{REVIEWER_NAME}}</a>, {{REVIEWER_ROLE}}</p>
</header>
```
- Change "עודכן לאחרונה" (last updated) and `dateModified` **only on a substantive update** (new data, a new section, corrected facts), never for typo fixes or to look fresh. Keep a short "היסטוריית עדכונים" (update history) note at the bottom of the pillars.
- Show dates in Hebrew format (`10 בנובמבר 2026`) with ISO values in `datetime`. They must equal the JSON-LD and `article:*` values.
- End every article with a **"מקורות"** (sources) list: numbered, linked, with the publisher and year. Link to it from inline statistics (`<sup><a href="#src-3">3</a></sup>`).

### 6.4 Author page requirements (E-E-A-T)
`/about/yiftach-hasfel/` (and `/en/about/yiftach-hasfel/`), with ProfilePage + Person schema (§2.5). It must contain:
- [ ] A real photo (not AI), full name in Hebrew and English, role: מנכ"ל משותף (co-CEO), מיפתח פרויקטים.
- [ ] **Credentials:** הנדסאי בניין (construction practical engineer), Technion. Confirm the exact institution and unit name with Yiftach before publishing; the brief says "from the Technion".
- [ ] **Experience:** more than 20 years building net houses and agricultural structures in the Galilee and abroad. Responsibilities: needs mapping, engineering design, production supervision and execution. The Belarus project (local production, local crews, delivered on time) described qualitatively, with no invented numbers.
- [ ] Areas of expertise, matching `knowsAbout`, and **the list of articles he wrote** (auto-generated).
- [ ] Links to approved projects (crop, region and structure level only) and client testimonials, using only the three approved quotes.
- [ ] A LinkedIn profile with `sameAs`, plus contact: phone, WhatsApp, and a link to `/contact/`.
- [ ] Optional: an equivalent page for Merav Hasfel, and for any external reviewer (with consent).
- Also: a strong `/about/` page (company story, the factory, the certified at-height crews, values in the owners' own words such as "מילה זו מילה", "a word is a word"), plus `/contact/` with full NAP and a map. Google's quality raters look for who is behind the site and how to reach them.

---

## 7. Measurement: Search Console, Google Business Profile, analytics events

### 7.1 Search Console (and Bing)
- [ ] Add a **Domain property** `miftah.co.il` (DNS TXT at NetHost). It covers http, https, www and non-www, so the HTTPS migration shows up in one place.
- [ ] Submit `https://www.miftah.co.il/sitemap_index.xml` (WordPress) or `/sitemap.xml` (static). The sitemap must contain only 200, canonical, indexable URLs (HE and EN). Add `<image:image>` entries if images live on a CDN.
- [ ] After the migration, use URL Inspection on the homepage, `/articles/` and each article, then **Request indexing**. Watch the **Pages** report for "Redirect" and "Not found (404)" counts as the old URLs drop out.
- [ ] Saved Performance views:
  - Page contains `/articles/`, by query, comparing HE and EN with page regex `^https://www\.miftah\.co\.il/en/`.
  - Query regex for brand vs non-brand: `מיפתח|miftah|מפתח פרויקטים`.
  - AI Overviews and AI Mode clicks and impressions are counted inside the normal **Web** search type. The new generative-AI performance report (2026) shows impressions only; use it as a visibility indicator.
- [ ] Links report: check that the service pages receive internal links from the articles.
- [ ] **Do not** enable the generative-AI opt-out control (§1.2).
- [ ] **Bing Webmaster Tools.** Import from Search Console, submit the sitemap and enable **IndexNow** (Rank Math's Instant Indexing module, or the Microsoft IndexNow plugin, or a ping in the static build). Bing's index feeds Copilot and other AI assistants.
- [ ] `robots.txt`: allow Googlebot, Bingbot, `OAI-SearchBot` and `PerplexityBot` so the articles can be cited in AI search. Blocking training-only crawlers (`GPTBot`, `Google-Extended`, `CCBot`) is a business decision for the owners; blocking `Google-Extended` does not affect Google Search.

### 7.2 Google Business Profile
- [ ] Claim or verify the profile for Kfar Masaryk. NAP must be identical to the site footer and schema: "מיפתח פרויקטים", "04-9856969", same address.
- [ ] Primary category: choose the closest agricultural or construction category offered in the GBP picker (check what's available in Hebrew and English UI, e.g. agricultural service or construction-type categories). Add services: בתי רשת, סככות העמסה, שוברי רוח, פרויקטי Turnkey. Do not list civil shading.
- [ ] Website link with UTM: `https://www.miftah.co.il/?utm_source=google&utm_medium=organic&utm_campaign=gbp`, so GBP traffic does not mix with organic search in GA4.
- [ ] If the chat field is available, add the WhatsApp link (`wa.me/972…`). Add phone, business hours, and the area served (Israel, plus international as a description).
- [ ] Upload **real photos**: factory, pole and net testing, crews at height, finished net houses (crop and region). No AI images on GBP.
- [ ] Post each new article as a GBP update (photo, two lines, "Learn more" link with `utm_campaign=gbp-post-{{slug}}`).
- [ ] Reviews: ask the clients who are willing to recommend (Bar'am, Elrom, Yehiam, Metzuba, Hanita, Portugal) to leave a Google review. Reply to every review. **No incentives**: Google's July 2026 guideline addition targets fake or undisclosed incentivized reviews.
- [ ] Link the GBP URL in the Organization `sameAs` and `hasMap`.

### 7.3 Analytics: GA4 via GTM, lead events
**Setup:**
- GA4 property with HE and EN on the same property, data stream `www.miftah.co.il`, and Google Signals off unless needed.
- Content groups: `article`, `service`, `project`, `home`, `about`, `contact`.
- **Consent Mode v2**, with defaults `denied` for EEA visitors at least (Portugal, Germany: GDPR). Israeli visitors are covered by the Privacy Protection Law, whose Amendment 13 is in force since Aug 2025; have counsel confirm the banner policy.
- Register the custom dimensions below (event-scoped). Data retention: 14 months.

**Event plan:**
| Event (GA4) | Trigger | Parameters | Key event? |
|---|---|---|---|
| `whatsapp_click` | click on `a[href^="https://wa.me/"]`, `api.whatsapp.com` | `cta_location` (hero / inline / end / sticky / footer / author), `article_id` (A1…A5 or slug), `page_language` (he/en), `link_url` | **Yes** |
| `phone_click` | click on `a[href^="tel:"]` | same set | **Yes** |
| `form_submit` | **successful** submit only: CF7 `wpcf7mailsent` DOM event, or the static form's success response | same set + `form_id`, `lead_type` (net_house / turnkey / other; from a form select), `project_size_band` (≥50 dunam IL / ≥30 ha abroad / smaller) | **Yes** |
| `email_click` | `a[href^="mailto:"]` | same set | optional |
| `toc_click` | click inside `.toc a` | `section_id` | no (engagement insight) |
| `cta_view` | CTA block ≥50% visible (IntersectionObserver) | `cta_location` | no (lets you compute CTA CTR) |
| built-in `scroll` / `file_download` | Enhanced Measurement | n/a | no |

Optionally map the three key events to the GA4 recommended event `generate_lead` (with `lead_method` = whatsapp / phone / form) for Ads import. Pick **one** naming scheme so leads are not double-counted.

**Markup and JS (works on WordPress or static):**
```html
<a href="https://wa.me/{{WHATSAPP_E164_NO_PLUS}}?text={{URLENCODED_HE_MESSAGE}}"
   class="cta cta--wa" data-cta="whatsapp" data-cta-location="inline" rel="noopener">
  לשיחה בוואטסאפ
</a>
<a href="tel:+97249856969" class="cta cta--tel" data-cta="phone" data-cta-location="inline">04-9856969</a>
```
`{{URLENCODED_HE_MESSAGE}}` is a prefilled message that carries the article code, e.g. `שלום, קראתי את המאמר על בתי רשת לבננות [A3] ואשמח לשוחח על פרויקט`. Every WhatsApp lead then reveals its source article in the chat itself, which is the only reliable attribution for WhatsApp.

```html
<script>
(function () {
  var page = { article_id: document.body.dataset.articleId || location.pathname,
               page_language: document.documentElement.lang.slice(0, 2) };
  function push(evt, el, extra) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: evt,
      cta_location: (el && el.dataset.ctaLocation) || 'unknown',
      link_url: el && el.href }, page, extra || {}));
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href');
    if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(h)) push('whatsapp_click', a);
    else if (h.indexOf('tel:') === 0) push('phone_click', a);
    else if (h.indexOf('mailto:') === 0) push('email_click', a);
  });
  // Contact Form 7: fires only after successful send
  document.addEventListener('wpcf7mailsent', function (e) {
    push('form_submit', e.target, { form_id: String(e.detail.contactFormId) });
  });
})();
</script>
```
In GTM, set up one Custom Event trigger per event name and one GA4 Event tag that passes `{{DLV - cta_location}}`, `article_id`, `page_language` and the other parameters.

**Closing the loop (offline):**
- The form has hidden fields `landing_page`, `first_article` and `utm_*`. They are filled from `sessionStorage` at first page view and arrive in the lead email.
- The owners log every lead monthly in a simple sheet: source (article code, GBP, referral) and fit (size and type). Compare that with GA4 key events, because a phone click is not a completed call.
- **Monthly report:** organic sessions to `/articles/` → key events by `article_id` → qualified leads from the sheet. GA4 Explorations: landing page = `/articles/*` × key events. Keep the Search Console ↔ GA4 link enabled.

---

## 8. Publishing checklist for NetHost

### 8.0 Prerequisites, whichever route
- [ ] Ask NetHost for: a **Linux plan** (Apache or LiteSpeed) with **PHP 8.2 or 8.3**, free **Let's Encrypt/AutoSSL**, HTTP/2, Brotli or gzip, SSH or SFTP, and daily backups. The current account runs IIS 7.5 + PHP 5.3. If NetHost cannot provide this, move to a host that can, or put Cloudflare (Full strict) in front of a static build.
- [ ] Full backup of files and database. Export the URL list from the sitemaps (§0) and build the **301 map** (§3.1).
- [ ] Staging copy with `noindex`, password-protected. Remove the noindex and password at go-live, and check that the live site does not inherit them.

### 8.1 Route A: WordPress (recommended if the owners want to edit content themselves)
- [ ] Fresh WordPress 6.x on PHP 8.2+. Use a lightweight RTL-ready theme (GeneratePress, Kadence or Blocksy) with the block editor, and retire The7, Visual Composer and Revolution Slider. Migrate content page by page; this is a rebuild, not an in-place upgrade from 4.7.
- [ ] Permalinks: Settings → Permalinks → custom `/articles/%postname%/` for posts. Pages keep `/%pagename%/`. Set every slug to English ASCII manually.
- [ ] **Multilingual.** WPML (current version) or Polylang: Hebrew default, English in **`/en/` directories**. hreflang is generated automatically; check that x-default points to EN (WPML: `wpml_hreflangs` filter, if needed). Do not publish EN placeholders: untranslated pages should not exist in `/en/`.
- [ ] **SEO plugin: pick ONE.**
  - **Rank Math:**
    - Titles & Meta → Posts: Schema "Article" → Article Type **BlogPosting**; title `%title% | %sitename%`.
    - Local SEO / Knowledge Graph: Organization, name "מיפתח פרויקטים", logo 512px PNG, social profiles. Add phone and address only if they match GBP.
    - Sitemap: posts and pages only; exclude attachments, tags, author and format archives; add images.
    - Titles & Meta: noindex tags, date archives, empty categories and search results. **Redirect attachment pages** to the parent.
    - Turn on Instant Indexing (IndexNow) and the Redirections module (for the 301 map). Leave the Rank Math FAQ block as visible content (its schema is optional, §2.3).
  - **Yoast SEO:**
    - Settings → Site representation: Organization + logo + profiles.
    - Content types → Posts: Schema "Article" with article type "Blog post", plus the SEO title template.
    - Categories and tags: tags noindex. Date archives off. Media pages off (redirect).
    - Author archives: keep them on only if you turn the author archive into the author page with the full bio; otherwise use the `/about/yiftach-hasfel/` page and link the byline there.
    - Crawl optimisation: remove unneeded feeds, shortlinks, emoji script, oEmbed and RSD links.
    - Redirects: Yoast Premium or the free "Redirection" plugin.
  - Either plugin outputs the base graph (Organization, WebSite, WebPage, Article, Breadcrumb, Person). Add the extras (Person credential and `knowsAbout`, `citation`, `reviewedBy`, ImageObject `digitalSourceType`) through the plugin's custom schema editor (Rank Math) or the `wpseo_schema_*` filters (Yoast). **Do not** paste a second, duplicate Article JSON-LD.
- [ ] **Performance:**
  - Page cache: LiteSpeed Cache on LiteSpeed, otherwise WP Super Cache or WP Rocket.
  - Images: WordPress 6.5+ handles AVIF uploads if the server's Imagick or GD supports it, or use a converter plugin to create WebP/AVIF. Image sizes 480/800/1200/1600.
  - Self-host Heebo (theme setting or `@font-face` in the child theme).
  - Disable jQuery on articles if the theme allows. No page builders.
- [ ] **Forms:** Contact Form 7 (current version) or WPForms. Add the `wpcf7mailsent` listener, hidden attribution fields, and spam protection with Cloudflare Turnstile or honeypot.
- [ ] **Security:** remove unused plugins and themes, block `xmlrpc.php`, automatic minor updates, strong admin passwords and 2FA.
- [ ] Remove `/sample-page/`, `/8/`, `/project/145/` and the "Hello world" post (410). Remove the civil-shading pages (301 or 410). Rewrite the homepage title and description.

### 8.2 Route B: static site (fastest, most secure; edits go through the agency)
- [ ] Use a generator such as Astro or Eleventy, with templates implementing §1, §2, §4, §5 and §6 directly. Build image variants at build time (AVIF/WebP/JPEG + width/height). Generate `sitemap.xml` with hreflang `xhtml:link` entries, plus RSS.
- [ ] Deploy by SFTP or rsync (or a GitHub Action) to NetHost `public_html`.
- [ ] On **Apache/LiteSpeed** (`.htaccess`):
  ```apache
  RewriteEngine On
  RewriteCond %{HTTPS} off [OR]
  RewriteCond %{HTTP_HOST} !^www\. [NC]
  RewriteRule ^ https://www.miftah.co.il%{REQUEST_URI} [L,R=301]
  # one line per old URL (Hebrew paths percent-encoded or as UTF-8, test both)
  Redirect 301 /%D7%99%D7%A6%D7%99%D7%A8%D7%AA-%D7%A7%D7%A9%D7%A8/ /contact/
  Redirect 410 /sample-page/
  <IfModule mod_headers.c>
    <FilesMatch "\.(avif|webp|jpg|png|svg|woff2|css|js)$">
      Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
  </IfModule>
  ErrorDocument 404 /404.html
  ```
- [ ] If NetHost keeps the site on **IIS**, put the same rules in `web.config` (URL Rewrite module): an HTTPS/www canonical rule, `<rewriteMaps>` for the 301 map, and `<clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00"/>` for static assets.
- [ ] `?lang=en` URLs: these are query strings, so they need a `RewriteCond %{QUERY_STRING} ^lang=en$` rule mapping to the matching `/en/…` path (with a trailing `?` to drop the query).
- [ ] The form needs a backend: NetHost PHP mail script, or Formspree, Basin or Web3Forms. Fire `form_submit` on the success response only.

### 8.3 Go-live checklist (each article)
- [ ] The title, description, H1 and slug have been checked by a human. The canonical is self-referencing and https.
- [ ] hreflang appears only if EN is live (reciprocal).
- [ ] JSON-LD passes in **Rich Results Test** and **validator.schema.org** with no errors. Dates match visible dates, and author/publisher `@id`s resolve.
- [ ] Hero preloaded and not lazy. Every `<img>` has width, height and alt. AI illustrations are captioned and carry IPTC metadata.
- [ ] Every statistic has an inline source and an entry in the "מקורות" list. No invented company numbers. Only approved testimonials and client names.
- [ ] Terminology per the brief: בית רשת, רשת נגד ברד, רשת הצללה, רשת נגד חרקים, אחוז הצללה, סככת העמסה, שובר רוח, הדליה בצורת סוכה, פרויקט Turnkey.
- [ ] Internal links per §3.2. The service page links back. The article appears on the `/articles/` hub.
- [ ] WhatsApp, phone and form CTAs fire their GA4 events (GTM Preview + GA4 DebugView).
- [ ] PageSpeed Insights mobile: LCP < 2.5 s and CLS < 0.1 in the lab. No console errors. Works at 320px width. Keyboard and screen-reader smoke test (TOC, details, chart table).
- [ ] Sitemap updated. URL Inspection → Request indexing. IndexNow ping. GBP post with UTM.
- [ ] Re-check after 7 and 28 days: indexing, queries and CWV field data.

---

### Sources consulted (Google Search Central, Oct 2026)
- Search documentation updates / changelog: https://developers.google.com/search/updates (FAQ deprecated 8 May 2026, not shown from 7 May 2026, docs removed 15 Jun 2026; breadcrumbs desktop-only from 22 Jan 2025; AI optimization guide 15 May 2026; preferred image via schema/og:image 2 Mar 2026; incentivized-review guideline 24 Jul 2026).
- Article structured data: https://developers.google.com/search/docs/appearance/structured-data/article
- AI features and your website: https://developers.google.com/search/docs/appearance/ai-features
- Optimizing for generative AI features (May 2026): https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Using generative AI content: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Image SEO best practices: https://developers.google.com/search/docs/appearance/google-images
- Image metadata (IPTC, DigitalSourceType, C2PA): https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata
- schema.org `digitalSourceType` / `IPTCDigitalSourceEnumeration`: https://schema.org/digitalSourceType · https://schema.org/IPTCDigitalSourceEnumeration
- Search Console generative-AI opt-out control and AI impressions report (Aug 2026, global): secondary coverage (relevantaudience.com, pinmeto.com). **Confirm in the Search Console UI.**
- Live-site probe of www.miftah.co.il: headers, HTML head, robots.txt and sitemaps fetched 21 Oct 2026.
