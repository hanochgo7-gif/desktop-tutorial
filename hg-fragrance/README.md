# HG — digital flagship

The official website for **HG**, built around its first fragrance, **Unforgettable**, and the 20-second campaign film that introduced it.

> Leave the room. Stay in it.

## Run it

```bash
npm install
npm run dev          # http://localhost:4321
```

Production build (static pages + a small Node server for the API routes):

```bash
npm run build
npm run preview      # node ./dist/server/entry.mjs — set PORT / HOST / SITE_URL as needed
```

Copy `.env.example` to `.env` and fill in what you have. Nothing is required to browse the site; checkout and the newsletter answer honestly when they are not connected.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Astro 5 (static pages, server endpoints via `@astrojs/node`) |
| Motion | GSAP 3 + ScrollTrigger, loaded only when motion is allowed |
| Images | `astro:assets` — responsive WebP + JPEG fallback, generated at build |
| Type | Cormorant Garamond (display) + Instrument Sans (interface), self-hosted |
| Commerce | Bag in `localStorage`, server-priced Stripe Checkout (REST, no SDK) |
| SEO | Canonicals, Open Graph/Twitter cards, JSON-LD (Organization, Product, ItemList), sitemap, robots |

## Structure

```
src/
  config/site.ts        brand, contact, social, commerce settings  ← edit before launch
  data/catalog.ts       products, formats, prices, notes          ← edit before launch
  i18n/ui.ts            every interface string (Hebrew/RTL-ready)
  assets/img/           image masters (film stills + campaign stills)
  styles/tokens.css     colour, type, spacing, motion tokens
  styles/global.css     base, components (header, menu, drawer, player, forms)
  layouts/Base.astro    <head>, SEO, header/menu/bag/film modal, boot data
  components/           Media, Header, Menu, BagDrawer, FilmPlayer, FilmModal, Footer, Newsletter, LegalPage
  scripts/              main (wiring), motion, bag, overlay (focus trap), ui
  pages/                index, fragrances/, film, house, bag, checkout/, legal/, api/, 404, robots.txt
public/media/           web-encoded film loops, the full film, captions (.vtt), posters
_source/                original campaign files and generation outputs (not deployed)
```

## Design system in one paragraph

Night is the material: warm black (`--c-ink`), midnight glass, amber light and a single line of brass (`--c-brass`), used sparingly. Ivory (`.theme-ivory`) is reserved for "morning" moments to break the rhythm. Display type is a light, tightly-tracked Cormorant with italics carrying emphasis; interface type is small, uppercase Instrument Sans with wide tracking. Layouts sit on a 12-column grid with asymmetric placements and generous section spacing (`--section`).

## Motion system

Declarative attributes, handled in `src/scripts/motion.ts`:

- `data-reveal="lines"` words rise from a mask · `"fade"` soft rise · `"mask"` image wipe + settle
- `data-parallax="8"` image drift inside its frame · `data-speed="0.15"` layered depth · `data-drift="-30"` oversized type drift
- The hero headline animates in pure CSS so it paints before any JavaScript (fast LCP)

Reduced motion (OS setting, or `?motion=off`) skips GSAP entirely, never autoplays video, and shows every element in its final state. A 4-second safety net removes hidden states if the motion bundle ever fails to load.

## Commerce

- The bag is stored per device; quantities are capped (`commerce.maxQuantityPerLine`).
- `POST /api/checkout` re-prices every line from `catalog.ts` and creates a **Stripe Checkout** session. Without `STRIPE_SECRET_KEY` it returns `503` and the bag says "Online payment is not enabled yet… nothing has been charged."
- `/checkout/success` asks Stripe whether the session is **paid** before showing a confirmation; otherwise it says it could not confirm the order.
- `POST /api/subscribe` validates, honeypot-filters, then forwards to `NEWSLETTER_WEBHOOK_URL`, or appends to `SUBSCRIBERS_FILE` on a persistent Node host (dev writes to `data/subscribers.jsonl`). With neither, it returns `503` and the form says sign-up is not connected yet.

## Hebrew / RTL

`site.locale` drives `<html lang dir>`. Layout uses logical properties (`inset-inline`, `padding-inline`, `margin-inline`), drawers and arrows mirror under `[dir=rtl]`, and Hebrew fallbacks (`Frank Ruhl Libre`, `Rubik`) are already in the font stacks. A Hebrew edition needs: a `he` dictionary in `src/i18n/ui.ts`, translated page copy (e.g. `src/pages/he/…`), and the Hebrew webfonts.

## Deployment

The Node adapter runs anywhere Node 20+ runs (Render, Fly.io, Railway, a VPS). Put it behind a CDN or proxy that **compresses responses** (gzip/brotli): Lighthouse mobile scores below were measured that way.

On Vercel the build switches to `@astrojs/vercel` automatically (it checks the `VERCEL` environment variable in `astro.config.mjs`); set the project's Root Directory to this folder. Use `NEWSLETTER_WEBHOOK_URL` there (serverless file systems are not persistent).

## Quality checks (October 2026, production build)

- Lighthouse mobile with compression: Performance 85 home · 91 product · 92 film · 97 collection. Accessibility, Best Practices and SEO 100 on every page tested; CLS ≈ 0. Desktop home: Performance 92, LCP 0.5 s.
- Playwright + Chrome: 34 interaction checks pass (menu focus trap and Escape, size selection, bag add/qty/remove/persistence, checkout honest state, newsletter validation/success, film modal playback and captions, lightbox keyboard navigation, skip link, focus outline, reduced motion).
- Viewports checked: 390×844, 412×823, 820×1180, 1280×720, 1440×900 — no horizontal overflow, no hidden content, no broken images, no console errors.
- `astro check`: 0 errors, 0 warnings.

## The Four Seasons collection

`src/data/catalog.ts` holds all four products (season, accent colour, story, notes, packshot, gallery, campaign stills, variants). `SeasonsGrid.astro` renders the collection on the homepage, the collection page and every product page. A product without purchasable variants renders as "Coming soon" with a notify-me form; the bag and `/api/checkout` only ever accept priced, available variants.

| Season | Product | Bottle |
| --- | --- | --- |
| Spring | N°02 Open Window | pale green-gold juice, brushed silver collar |
| Summer | N°03 Last Light | blush rosé-gold juice, rose-gold collar |
| Autumn | N°01 Unforgettable (flagship) | amber juice, gold/brass collar |
| Winter | N°04 Nocturne | garnet-black juice, satin black collar |

Packshots and the nine seasonal campaign images were generated with Higgsfield (Nano Banana 2.1) from the flagship packshot and HG's existing campaign models as references; originals are in `_source/seasons/`.

## Campaign library

`src/data/campaigns.ts` drives `/campaigns`, the homepage "Elsewhere, the same night" section and the filtered gallery on `/film`. Each campaign has a film or reel, a short loop for cards, and its stills (alt text and captions included). Add a still by dropping a JPEG into `src/assets/img/` and adding one line to the campaign.

| Campaign | Film | Stills |
| --- | --- | --- |
| I · Unforgettable | the 20 s film, sound + captions | 10 + 7 film frames |
| II · Riviera | 26 s silent reel cut from 9 Higgsfield clips | 11 |
| III · Night Drive | 24 s silent reel cut from 8 Higgsfield clips | 10 |
| IV · Studio | 4 s product film (black marble) | 3 + 9 editorial stills |

## Asset provenance

- **Campaign film and frames** — HG's own "Unforgettable" 20-second film (clips, end card, VO and score from the HG campaign files). Captions were timed against the voice-over.
- **Riviera, Night Drive, Studio and extra Unforgettable stills/clips** — taken from HG's Higgsfield generation history (October 2026). Originals are kept in `_source/hf/` with a `manifest.json` of prompts and IDs; the reels were edited and re-encoded to H.264 for the web.
- **Campaign stills** (`still-*`) — generated with Higgsfield (Nano Banana 2.1) using frames of the film's bottle as references, so the bottle, palette and lighting stay consistent.
- The footer and film page carry the disclosure "Campaign film and imagery created with AI.", matching the film's end card.
