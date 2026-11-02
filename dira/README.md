# דירה מוכנה · Dira Ready

A listing-photo studio for people renting or selling a home. Upload phone photos, get bright, straight,
clean listing photos in seconds, and download them sized for Yad2, Madlan, Instagram and WhatsApp.
Hebrew (RTL) and English.

Two kinds of work, two clear rules:

| | Photo correction | AI tools |
|---|---|---|
| What | Exposure, white balance, shadow recovery, vertical (perspective) correction, noise reduction, sharpening, small-object removal, classic ×2 enlargement | Virtual staging (6 styles), declutter, room refresh, sky, large-object removal, AI upscale |
| Where it runs | In the visitor's browser (Web Worker). Photos never leave the device | On the server, through Replicate |
| Cost | Free, unlimited — costs nothing to run | Credits (1 credit = 1 edit; failed edits refund) |
| Invents pixels? | No. Every filled pixel comes from the same photo | Yes — so results are separate, labelled versions; staging carries a burned-in label |

## Live

**https://hanochgo7-gif.github.io/desktop-tutorial/dira/** — the static build (studio and all public pages),
published by `.github/workflows/pages.yml` on every push to `main` (`npm run build:static`). It has no
server, so accounts, AI tools and online payments show that they're off there. For those, deploy the
full app on Vercel (below).

## Status: what is live and what needs credentials

| Feature | Works with no configuration | Needs |
|---|---|---|
| Landing, pricing, editing policy, legal pages (he/en) | ✓ | — |
| Studio: upload (drag/drop, multi, camera), analysis, auto-correction, compare slider (drag, touch, keys, zoom, pinch, full screen), adjust, apply to all, classic removal, batch export, ZIP, portal/social presets, broker licence overlay, change log | ✓ | — |
| Projects saved on the device (IndexedDB) | ✓ | — |
| Accounts (email one-time code), credit balance and history | dev stand-in only | Supabase project + `supabase/schema.sql` + custom SMTP for auth emails |
| AI tools | dev mock only (labelled "TEST") | `REPLICATE_API_TOKEN` |
| Purchases (credit pack, 30-day Pro) | dev mock only | Grow account: `GROW_USER_ID`, `GROW_PAGE_CODE` (+ `GROW_API_KEY`) |

Nothing pretends to work: without credentials, the AI panel, account page and buy buttons say plainly
that the feature isn't switched on (purchases fall back to WhatsApp, which works today).

## Brand assets

- **Logo** — designed in Canva (design `DAHZvssYAkE`): a house with one lit and one dark window, the same room
  before and after. The full lockup is `public/brand/dira-ready-logo.png`; the mark is rebuilt as a vector from
  the Canva geometry in `src/lib/brand.ts` (header, favicon, app icons — regenerate with `npx tsx scripts/build-icons.ts`).
  Colours: blue `#093484`, daylight yellow `#F9C23A`.
- **Home-page backgrounds** — `public/bg/hero-*.webp` (sunlit apartment) and `public/bg/dusk-*.webp` (stone
  building at blue hour), generated with Higgsfield (GPT Image 2.5). They are decorative illustrations and the
  footer says so; they are never presented as customer results.

## Run

```bash
npm install
npm run dev          # http://localhost:3000 — dev stand-ins for accounts, AI and payments are on
npm test             # unit tests (engine, ZIP, credits ledger, webhook signatures)
npm run build && npm run test:e2e   # end-to-end tests (desktop + phone) against a production build
npx tsx scripts/run-engine.ts samples/apt1-before.jpg /tmp/out.jpg   # run the engine on any photo
npx tsx scripts/build-demo.ts       # regenerate the landing-page demo from real engine output
```

## Going live (owner checklist)

1. **Vercel**: import the repository with *Root Directory* `dira`. Set `SITE_URL` / `NEXT_PUBLIC_SITE_URL`.
   The studio works immediately; everything below is optional and can be added one by one.
2. **Accounts** — Supabase: create a project (EU region), run `supabase/schema.sql` in the SQL editor,
   enable Email OTP (Authentication → Providers → Email; set the email template to show `{{ .Token }}`),
   and connect a custom SMTP sender (e.g. Resend) — Supabase's built-in mailer only sends to team members.
   Set `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **AI** — Replicate: create an API token with billing enabled, set `REPLICATE_API_TOKEN`. Webhooks are
   signed and verified automatically. Before launch, run each tool on 30–50 of your own photos and check
   that windows, views and room geometry are untouched (see `src/lib/server/ai/registry.ts`).
4. **Payments** — Grow: set `GROW_USER_ID`, `GROW_PAGE_CODE`, `GROW_API_KEY`; test in the sandbox,
   then set `GROW_API_BASE` to the production address Grow gives you.
5. **Cleanup**: set `CRON_SECRET`; `vercel.json` runs `/api/cron/cleanup` daily to delete AI files older
   than 30 days (the privacy page promises this).

## Architecture

```
src/lib/engine/        on-device image engine (pure TypeScript, runs in a Web Worker and in Node)
  analyze.ts           exposure percentiles, tonal zones, colour temperature (McCamy), noise (Immerkær),
                       sharpness, near-vertical line detection (Hough) and camera roll/pitch fit
  pipeline.ts          deterministic recipe → pixels: removal → vertical homography → chroma denoise →
                       linear-light WB/exposure + base/detail local tone mapping (fast guided filter) →
                       contrast/vibrance → adaptive Wiener/unsharp detail → optional Lanczos ×2
  verticals.ts         Hough lines, H = K·R·K⁻¹ fit, warp and crop to the original aspect
  inpaint.ts           multi-scale PatchMatch with texture-energy matching (copies, never invents)
src/lib/studio/        IndexedDB projects (original + recipe, re-rendered on demand), export, ZIP writer
src/components/        compare slider, zone scale, studio UI, landing, account
src/lib/server/        config gating, auth, rate limits, store (local JSON for dev / Supabase),
                       AI jobs (Replicate), payments (Grow)
src/app/api/           config, me, ai/jobs, ai/webhook, checkout, payments, files (dev), cron
supabase/schema.sql    tables with RLS, atomic credit functions, private storage bucket
```

Money and credits: every balance change goes through one SQL function that locks the account row,
refuses to go below zero and never applies the same idempotency key twice. Prices and credits come
only from `src/lib/plans.ts` on the server. Grow callbacks are trusted only with the stored secret
`processToken` and the exact sum; Replicate webhooks are HMAC-verified and the prediction is re-read
from Replicate's API before anything is credited or stored.
