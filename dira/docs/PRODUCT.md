# Dira Ready — product record (November 2026)

## 1. Audit of the existing product (haskara-lp.vercel.app)

- A single static Hebrew page selling a **manual** service: one person in Jerusalem cleans, touches up,
  furnishes and photographs rental apartments (₪590 / ₪1,490 / ₪2,900–3,900). Contact only via WhatsApp.
- No product, accounts, uploads, processing or payments. Source is not in any repository reachable from
  this workspace and not in the connected Vercel team; the page was rebuilt from its live HTML and images.
- Its before/after examples are AI renders (the page says so). They **change the view through the window**
  (night street → daytime trees) and remove furniture — exactly what the new editing policy forbids. The new
  site shows only real engine output on sample photos, labelled as such.
- Kept: the honest tone ("no invented testimonials or statistics"), the house mark with one lit and one dark
  window, the WhatsApp number, Hebrew-first.

## 2. Market and positioning (research 2026-11-01; sources in the research notes)

- AI virtual staging has collapsed to about **$0.11–0.32 per image** at volume (Collov, REimagineHome, Pedra, GenRoom);
  human services charge $16–30 (BoxBrownie, Styldod). AI enhancement runs $0.14–0.75 per image.
- Subscriptions cluster at $14–29 / $39–49 / $79–127 per month; trials are 5–7 credits or one free image.
- **Gaps we take:** nobody offers Hebrew/RTL, ILS pricing or Israeli payment methods; almost every tool is a
  subscription for agents (landlords want one listing, once); upload-before-signup is rare; only three tools
  offer any disclosure labelling.
- **Regulation is moving our way:** California AB 723 (since 2026-01-01) requires labelling edited listing
  photos and access to the original; US MLSs require "virtually staged" marks; Israel's Real Estate Brokers
  Regulations (since 2025-03-09) require the licence number on every ad. The studio builds all three in.
- Stripe does not onboard Israeli businesses. Payments: **Grow** (ILS, cards/Bit/Apple Pay — the owner already
  integrates it elsewhere); **Paddle** as merchant of record is the path for international sales later.

Positioning: *the honest listing-photo studio.* Free, instant, private photo correction that invents nothing,
plus AI tools that are always labelled — in Hebrew, priced in shekels, with no subscription required.

## 3. Pricing and unit economics

| Plan | Price (VAT incl.) | Credits | Per credit | Our AI cost per credit |
|---|---|---|---|---|
| Studio | ₪0 | 3 on sign-up | — | — |
| Listing pack | ₪39 one-off | 10 | ₪3.90 | ≈ ₪0.19 (one 2K edit at $0.05) |
| Pro, 30 days, no auto-renew | ₪89 | 60 + 4K output + batch AI | ₪1.48 | ≈ ₪0.42 at 4K ($0.11) |
| Agencies, 30 days | ₪349 | 300 | ₪1.16 | ≈ ₪0.19–0.42 |

Photo correction is free and unlimited because it runs on the visitor's device: marginal cost is zero, and
it is the acquisition engine. Credits never expire; failed edits refund automatically. Gross margin on
credits stays above 70% even at 4K with a retry. Grow fees (~1.5–3%) are absorbed.

## 4. AI model registry (verified against Replicate schemas, 2026-11)

| Tool | Model | Input | Cost |
|---|---|---|---|
| Staging, declutter, refresh, sky | `google/nano-banana-2.1` | `image_input` [url], `resolution` 2K/4K, `aspect_ratio: match_input_image`, search off | $0.05 (2K) |
| Large-object removal | `bria/eraser` | `image`, `mask` (white = remove) | $0.04 |
| AI upscale | `prunaai/p-image-upscale` | `upscale_mode: factor`, `factor: 2`, enhance flags off | $0.005–0.02 |

Every instruction is fixed (no free-text prompt) and ends with the same lock: keep camera, walls, windows,
doors, floor and fixtures; never change the view, room size, or hide damage; no invented amenities.
Fallbacks noted for a later A/B: `black-forest-labs/flux-3-image` (grounding off), `flux-kontext-pro`,
`flux-fill-pro`, `topazlabs/image-upscale`.

## 5. Final review — scored by each discipline

Scores are for what runs today, not what the code could do once keys are added.

| # | Question | Score | Why not higher | Plan to reach 9+ |
|---|---|---|---|---|
| 1 | Premium international SaaS look? | 8 | Restrained and consistent, but no customer photography, no dark mode, little motion polish in the studio | Commission 3 real shoots for the demo (with consent); dark theme; refine studio micro-interactions (slider spring, tab transitions) |
| 2 | Intuitive journey? | 8 | Drop → auto-fix → download is three steps; the inspector shows many controls at once; no first-run guidance | Collapse step toggles behind "Advanced"; a 3-tip first-run overlay; "Download all for Yad2" one-tap button on the stage |
| 3 | Real value? | 8 | Exposure, shadows and verticals are strong; white balance is deliberately partial; classic removal handles small objects only | Per-photo white-balance picker (click a neutral wall); window "pull" by blending a darker exposure when users upload brackets |
| 4 | AI integration real? | 5 | Fully coded and contract-tested against Replicate's documented API with a mock, but **not activated** (no API token here) and never run on real outputs | Add `REPLICATE_API_TOKEN`; run the 6 tools on 50 owner photos; automated geometry check (window/door masks before vs after) before publishing a result |
| 5 | Image quality excellent? | 7 | Good tonal recovery and true perspective correction; no multi-exposure HDR; blown windows can't be recovered; denoise is basic | Bracketed-exposure merge (iPhone/Android burst); learned denoise via WebGPU when available |
| 6 | Mobile exceptional? | 8 | Works from 320 px, camera capture, touch/pinch compare, share sheet; inspector is long on phones | Bottom-sheet inspector on phones; installable PWA with offline studio |
| 7 | Maintainable architecture? | 8 | Typed, tested (15 unit, 15 end-to-end), credentials gated; rate limits are per instance; dev store is a JSON file | Move rate limits to Upstash/Vercel KV; add Sentry; CI running unit + e2e on every push |
| 8 | Secure? | 8 | RLS with no client access, atomic idempotent ledger, signed webhooks, byte-sniffed uploads, IDOR tests, dev stand-ins hard-off on Vercel production; CSP still needs `unsafe-inline`; no bot protection on sign-in | Nonce-based CSP; Turnstile on sign-in and checkout; independent penetration test before payments go live |
| 9 | Sustainable revenue? | 7 | High margins and a free tier that costs nothing, but willingness to pay is unproven and payments are not live | Turn on Grow; measure studio→sign-up→purchase; test a ₪19 single-listing staging bundle; agency pilots via WhatsApp |
| 10 | What stops a customer paying today? | — | AI tools and online purchase are not switched on; projects live on one device; no real customer results to show | The checklist in README "Going live" (≈ 1 day of owner setup), then cloud sync of projects for account holders |

## 6. Roadmap

1. **Week 1:** activate Supabase (with SMTP), Replicate and Grow; run the AI acceptance set; deploy to the owner's domain.
2. **Weeks 2–4:** cloud sync for account holders; "best 5 for Yad2" picker with cover choice; per-photo white-balance picker.
3. **Month 2:** bracket merge (HDR) on device; team seats and consolidated invoices for agencies; Paddle for international buyers.
4. **Month 3:** automated geometry QA on every AI result; listing text drafting (Hebrew/English) from the photos.
