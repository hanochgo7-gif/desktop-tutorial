# MIFTAH release checklist

Status as of 26 Oct 2026, after review cycle 2. ✅ = done and verified. ⛔ = blocks launch. ⬜ = needed before or soon after launch.

## Blockers (owner decisions)

| | Item | Who | Notes |
|---|---|---|---|
| ⛔ | **Enquiry destination (truth ledger O1):** a business email or lead inbox, then set `FORM_ENDPOINT` | Merav + agency | Until then the form validates and says honestly that sending isn't connected; the phone is the only live route |
| ⛔ | **Content sign-off by Merav and Yiftach** (Q q19). Read `docs/MIFTAH_CONTENT_MASTER.md` (every string, EN and HE). | Merav, Yiftach | |
| ⛔ | **Native-speaker check of the English** (Q q37) | Merav's family member | |
| ⛔ | **Approve the "Selected projects" table** (kiwi at Bar'am region, bananas in the Western Galilee, apples in the Golan, cherries, avocado in Portugal). It shows crop, structure and region only, no client names, but the ledger (3.1, q13) asks for Yiftach's and the clients' approval before publishing. If it isn't approved, remove `FEATURED` from `content.py`. | Yiftach | |
| ⛔ | **Rights and consent:** drone footage from the Drive owner; 2015 archive photos are MIFTAH's; identifiable workers in `p-site` and `p-marking` | Merav | Asset registry, open rights |

## Content approvals that would strengthen the site (not blocking)

| | Item | Effect |
|---|---|---|
| ⬜ | O2: photos, area and year for each of the five selected projects | Project cards with real proof |
| ⬜ | O3: list Bar'am, Elrom, Yehiam, Metzuba, Hanita as references | Named Israeli references |
| ⬜ | O4: one or two quotes in English (Israel and Portugal) | Testimonials |
| ⬜ | O5: name Green Arava as the turnkey partner and link to it; split the 11 stages between MIFTAH and the partner | Answers "who grows my crop?" |
| ⬜ | O7: legal English company name | Footer and structured data |
| ⬜ | O8: location of the DJI_0024 net house | Caption |
| ⬜ | O9: vector logo file from the designer | Sharper logo |
| ⬜ | O10: company WhatsApp or business mobile | Second contact route |
| ⬜ | A photo of the plant, and portraits of Merav and Yiftach | The "own plant" claim gets a picture; About gets faces |
| ⬜ | Year of each project abroad, and current totals in m² | Dated proof |

## Technical (verified)

| | Item | How it was verified |
|---|---|---|
| ✅ | 18 pages + 2 × 404 build from source (`python3 src/build.py`) | Rebuilt after every change |
| ✅ | No horizontal scroll, clipped text or small tap targets at 360/390/430/768/1024/1440/1920, EN and HE | `qa/widths.mjs`: 126 page/width/language combinations |
| ✅ | Accessibility | axe-core 4, WCAG 2.1 A/AA + best practice, 40 runs (20 pages × desktop and phone): 0 violations |
| ✅ | HTML validity | html-validate, 20 files: 0 errors |
| ✅ | Links | linkinator from both home pages, 92 local links: 0 broken (links to www.miftah.co.il are skipped until the site is live) |
| ✅ | Lighthouse | Mobile performance 98–100, desktop 100; accessibility, best practices and SEO 100; CLS 0 (10 pages × 2 profiles) |
| ✅ | Form | 19 automated tests (validation, focus in page order, minimum-size note, unconnected state, 2xx success, 500 error, timeout, double click, too-fast held and sent once, honeypot, no hidden direction marks in the Hebrew summary, Hebrew errors) |
| ✅ | Keyboard and controls | 16 tests (skip link, focus, menu with Enter/Escape, video pause, reduced motion, language switch, no-JS form) |
| ✅ | Print | Company profile prints on 1 A4 page in EN and HE (PDF rendered and checked) |
| ✅ | No third-party requests; fonts self-hosted | Network log during tests |
| ⬜ | Real-device check on iOS Safari and Android Chrome (video autoplay, sticky header, the phone drawing and map panels) | Not available in this environment |
| ⬜ | Test the hero video in Safari and Firefox | Tested only in Chromium; H.264 MP4 should play in both |

## Deployment

Live on Vercel since 27 Oct 2026 at https://miftah-site-hanoch.vercel.app (owner's instruction to publish without waiting for sign-off). `noindex` until the domain is connected. Checked live: 44 page loads with 0 console errors, 105 links with 0 broken, security headers, 404, `/he` → `/he/`.

For the final domain:

| | Step |
|---|---|
| ⬜ | Upload `public/` to Nethost (contact: Oved). The domain is with Interspace (Q q18). |
| ⬜ | HTTPS, and redirect `miftah.co.il` → `https://www.miftah.co.il` |
| ⬜ | Check that `.htaccess` is honoured (404 pages, cache, compression, security headers). Then uncomment the HTTPS/www redirect, and after it works, HSTS |
| ⬜ | If analytics or a form service on another domain is added, add its origin to the Content-Security-Policy in `build.py` (the form endpoint's origin is added automatically) |
| ⬜ | 301 redirects from the old WordPress URLs (mapping in `MIFTAH_SEO_AND_ANALYTICS.md`) |
| ⬜ | Google Search Console: verify the domain and submit `sitemap.xml` |
| ⬜ | Optional: cookieless analytics (update the privacy page first) |
| ⬜ | Create a Google Business Profile (Q q46) |
| ⬜ | Take the Fruit Logistica lines down after 5 Feb 2027 (`content.py`: `CTA_BAND["fair"]`, contact `aside_fair_*`, form `berlin`) |

## Roll back

`git revert` the website commits on `claude/greenhouse-brand-concepts-6zklru`, or redeploy the previous `public/` folder. The old WordPress site stays at the host until DNS is switched.
