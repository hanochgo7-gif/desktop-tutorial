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

Copy `.env.example` to `.env` and fill in what you have. Nothing is required to browse the site; checkout answers honestly when it is not connected.

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
  assets/img/           image masters used by the site (unused ones live in archive/)
  styles/tokens.css     colour, type, spacing, motion tokens
  styles/global.css     base, components (header, menu, drawer, player, forms)
  layouts/Base.astro    <head>, SEO, header/menu/bag/film modal, boot data
  components/           Media, Purchase, StillsGrid, Header, Menu, BagDrawer, FilmPlayer, FilmModal, Footer, Lightbox, LegalPage
  scripts/              main (wiring), motion, bag, overlay (focus trap), ui
  pages/                index, fragrances/[slug], campaigns, film, bag, checkout/, legal/, api/, 404, robots.txt
public/media/           the film, its captions (.vtt) and poster
archive/                image masters, loops, reels and campaign data not used by the current site (not deployed)
_source/                original campaign files and generation outputs (not deployed)
```

## Design system in one paragraph

Night is the material: warm black (`--c-ink`), midnight glass, amber light and a single line of brass (`--c-brass`), used sparingly. Ivory (`.theme-ivory`) is reserved for "morning" moments to break the rhythm. Display type is a light, tightly-tracked Cormorant with italics carrying emphasis; interface type is small, uppercase Instrument Sans with wide tracking. Layouts sit on a 12-column grid with asymmetric placements and generous section spacing (`--section`).

## Motion system

Declarative attributes, handled in `src/scripts/motion.ts`:

- `data-reveal="lines"` words rise from a mask · `"fade"` soft rise · `"mask"` image wipe + settle
- `data-parallax="8"` image drift inside its frame · `data-speed="0.15"` layered depth · `data-drift="-30"` oversized type drift
- The hero headline is static (it is the LCP element); only the hero photograph settles in, in pure CSS

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

### GitHub Pages copy (static)

`/perfume/` at the repo root is a static copy served by GitHub Pages at https://hanochgo7-gif.github.io/desktop-tutorial/perfume/. Pages has no server, so the bag works but checkout cannot (the bag says so, honestly). To refresh it after a change:

```bash
SITE_URL=https://hanochgo7-gif.github.io/desktop-tutorial/perfume npm run build
node scripts/rebase-static.mjs dist/client /desktop-tutorial/perfume https://hanochgo7-gif.github.io
node scripts/static-redirects.mjs dist/client /desktop-tutorial/perfume   # retired URLs → static redirect pages
# then replace ../perfume with dist/client
```

## The site (October 2026 redesign)

- **Home** — the hero (a model through the car window with the bottle; landscape frame on wide screens, portrait frame on tall ones), *the feeling* (he leaves, the lamp stays on, link to the film), *the campaign* (five large portraits of male models), **the four fragrances** shown as before in "One flacon, four lights" (`FourLights.astro`: the pinned bottle re-lit by the season in view), and a closing image, "The room remembers."
- **Product pages** — gallery, name, concentration, sizes and prices with add to bag (Unforgettable), or "Coming soon" with a link to Unforgettable (Open Window, Last Light, Nocturne); the story beside a model image (`portrait` in `catalog.ts`); campaign stills on the purchasable product. A compact purchase bar on mobile.
- **Campaign** — one curated sequence of model photography (pairs of portraits broken by full-width frames; no two neighbours share a model or pose). Every image opens full screen.
- **Imagery rule** — mostly male models; women may appear too (the owner approved the Open Window coupe image and the night film on `/film`). No images of the red-car (Rosso) model.
- **Film** — the 20-second film, one line, one call to action.
- Retired routes redirect (`astro.config.mjs`): `/fragrances` → Unforgettable, `/house` → the campaign.
- Removed: the custom cursor, magnetic buttons, the glass glow, animated grain, the bottle collage, chapter numbers in the interface and "launch pricing to be confirmed".
- `Media` asks for a larger file when a wide image is cropped into a taller frame (`scaleSizes`), so crops stay sharp on phones.
- On a static host (GitHub Pages) the bag works and checkout says "Online payment is not enabled yet… nothing has been charged."

## Quality checks (October 2026 redesign, production build)

- Lighthouse mobile with compression: Performance 95–99 home (LCP 2.3–2.9 s simulated, varies by run) · 100 product · 98 campaign · 98 film. Accessibility, Best Practices and SEO 100 on every page; CLS 0.
- Playwright + Chrome, 20 functional checks: size picker and price, add to bag, drawer, persistence, honest checkout state, film modal, mobile menu, lightbox, mobile purchase bar, skip link, redirects.
- Automated layout pass on 8 pages at 1440×900, 1280×800, 1024×768, 820×1180, 390×844, 360×740 and 844×390: no horizontal overflow, no broken images, no console errors, no clipped text, CLS under 0.05, and every visible image at or above display resolution (up to 2× density).
- `astro check`: 0 errors, 0 warnings.

## Asset provenance

- **Campaign film and frames** — HG's own "Unforgettable" 20-second film (clips, end card, VO and score from the HG campaign files). Captions were timed against the voice-over.
- **Campaign photography** — HG's Higgsfield generation history (October 2026) plus the casting portraits and the through-the-window stills made from the campaign's own model, car and bottle. Originals are kept in `_source/hf/` with a `manifest.json` of prompts and IDs.
- **Campaign stills** (`still-*`) — generated with Higgsfield (Nano Banana 2.1) using frames of the film's bottle as references, so the bottle, palette and lighting stay consistent.
- The footer carries the disclosure "Campaign film and imagery created with AI.", matching the film's end card.
