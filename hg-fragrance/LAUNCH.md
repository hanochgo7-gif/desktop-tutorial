# Before launch

Everything below is either unknown or unverified. The site was built so that nothing on it is invented, and each item is a single, obvious edit.

## Product facts — `src/data/catalog.ts`

- [ ] **Concentration** — currently "Eau de Parfum" (assumed). Confirm or change.
- [ ] **Formats** — currently 100 ml and 50 ml (assumed). Add, remove or rename variants.
- [ ] **Prices** — $245 (100 ml) / $175 (50 ml) come from the catalogue and are shown on the site without a caveat (October 2026 redesign). Confirm them. While `commerce.pricesConfirmed` is `false` they stay out of the structured data for search engines; set it to `true` once final.
- [ ] **Olfactive notes** — intentionally empty (`notes: null`). Add verified top/heart/base notes and a "Composition" section appears on the product page automatically.
- [ ] Story copy (`story`, `bottle`) — written from what the film and bottle actually show. Review the tone.

## The Four Seasons — `src/data/catalog.ts`

Three new fragrances were added as concepts: **N°02 Open Window** (Spring), **N°03 Last Light** (Summer), **N°04 Nocturne** (Winter). Since the October 2026 redesign they are **not shown on the site**: only fragrances on sale get a page, and the old collection and concept URLs redirect to Unforgettable (`astro.config.mjs`). Their imagery is kept in `archive/`.

- [ ] **Compositions are creative briefs, not formulas.** The top/heart/base notes were written to define each scent's character. Develop them with a perfumer and update the notes to match the final juices before selling.
- [ ] **Concentrations** (Open Window and Last Light: Eau de Parfum; Nocturne: Extrait de Parfum) — confirm.
- [ ] **Formats and prices** — the three new products have no variants, so they have no page and cannot be bought. To put one on sale: add variants (`{ id, label, price, available: true }`), set `status: 'available'`, remove its redirect from `astro.config.mjs`, and move its images back from `archive/img/`.
- [ ] **Bottle variants** (juice colour and collar finish: silver, rose gold, satin black) exist only as campaign imagery — confirm with packaging suppliers.
- [ ] **Cars in the campaigns** are unbadged classic and modern sports cars; no manufacturer logos appear. Keep it that way unless you have a licence or partnership.

## Business details — `src/config/site.ts`

- [ ] `contact.email` / `contact.phone` / `contact.address` — hidden while `null`.
- [ ] `social.instagram` / `tiktok` / `youtube` — hidden while `null`; also feed Organization `sameAs`.
- [ ] `legalEntity` — the registered company name for the footer copyright.
- [ ] `commerce.currency` (USD) and `commerce.shippingCountries`.

## Integrations — `.env`

- [ ] `SITE_URL` — the production origin (canonicals, sitemap, Stripe redirects).
- [ ] `STRIPE_SECRET_KEY` — start with `sk_test_…`, place a test order end to end (bag → Stripe → `/checkout/success` shows "Order confirmed"), then switch to live.
- [ ] Stripe dashboard: shipping rates, tax settings, receipt emails, brand colours/logo on the Checkout page.
- [ ] Newsletter — the sign-up form was taken off the pages in the October 2026 redesign (it cannot work on the static GitHub Pages copy). `/api/subscribe` and `src/components/Newsletter.astro` remain; to bring it back, set `NEWSLETTER_WEBHOOK_URL` (or `SUBSCRIBERS_FILE`) on a server host, place `<Newsletter />` in the footer, and restore the newsletter paragraphs in `/legal/privacy`.

## Legal

- [ ] `/legal/privacy` and `/legal/terms` are marked **Draft** on the page. Have counsel review them for each selling jurisdiction, then remove the draft notice in `src/components/LegalPage.astro`.
- [ ] Returns window and process — not stated on the site yet (the terms only refer to the customer's statutory rights). Add it to `/legal/terms` and the product page's "Delivery & returns" once decided.
- [ ] Contact sections in the legal pages appear automatically once `contact.email` is set.
- [ ] If analytics are added later, add a consent banner (the site currently sets no cookies and uses no trackers).

## Hosting

- [ ] Serve behind compression (gzip/brotli) and HTTPS.
- [ ] Long cache headers for `/_astro/*`, `/fonts/*`, `/media/*`.
- [ ] Submit `https://<domain>/sitemap-index.xml` in Google Search Console.

## Imagery

- [ ] The site uses the photographs in `src/assets/img/` (19 masters). The campaign page sequence is in `src/pages/campaigns.astro`; the home campaign in `src/pages/index.astro`.
- [ ] Everything else (the earlier Riviera / Night Drive / Rosso / Studio chapters, editorial bottle stills, loops and reels, `campaigns.ts`) is in `archive/`, not deployed.
- [ ] The hero and several campaign images show a vintage car; no badges are visible. Confirm you are happy to publish them as HG brand imagery.

## Restored after the Drive transfer (October 2026)

Part of the project did not finish uploading, so these files were rebuilt. Review them against your local copy if you still have it.

- [ ] `src/assets/img/*.jpg` — recovered from the last production build (`dist/client/_astro`), same images and dimensions.
- [ ] `src/pages/fragrances/index.astro` — rebuilt from the built HTML of the collection page.
- [ ] `src/pages/fragrances/[slug].astro`, `src/pages/legal/*`, `src/pages/checkout/success.astro`, `src/pages/api/*` — rewritten to the behaviour described in README (product page, legal drafts, Stripe confirmation, checkout and newsletter endpoints).
- [ ] `public/media/campaigns/*` — loops, posters and the Riviera / Night Drive reels re-cut from the original Higgsfield clips listed in `_source/hf/manifest.json`. The reels are new edits (≈2.9 s and 3 s per shot, hard cuts), not the original cuts.
- [ ] New stills from Higgsfield added to the campaigns: `unf-portrait`, `unf-lamp`, `riv-coupe`, `rosso-night`, `rosso-hand`, `rosso-passenger`, `rosso-promenade`.
- [ ] Night Drive re-curated (October 2026): new through-the-window stills `drv-window`, `drv-rain-glass`, `drv-reflection`, `drv-sill` (generated in Higgsfield from the campaign's own man, car and bottle). Removed `drv-driver` (a Ferrari-style badge on the steering wheel), `drv-spray` (a copy of `riv-spray`), `drv-coupe` / `drv-parked` (duplicates with rounded black corners baked in), `drv-glance` (lower resolution, same pose as `drv-sill`) and `drv-driveway` (off-story setting). Unforgettable's first campaign still is now `drv-window` instead of `rosso-golden`.
- [ ] Brand-likeness check: some car stills echo real models — the red car in Rosso, the white wedge in `ll-coast`, the black supercar in `nc-village`, the classic coupe in `ow-coupe`. No badges are visible, but have them cleared before paid media.

## Optional next steps

- Hebrew edition (`he` dictionary + translated pages; RTL is already supported by the layout).
- A fragrance finder once there is more than one fragrance to choose between.
- Packshots of the real, manufactured bottle and packaging to replace or join the AI campaign stills.
