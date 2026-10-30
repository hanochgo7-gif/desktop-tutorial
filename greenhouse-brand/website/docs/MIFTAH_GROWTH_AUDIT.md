# MIFTAH growth audit: findings, fixes and verification

29–30 October 2026. Brief: "MIFTAH — Ultimate Digital Growth, Brand & Conversion System" (Hanoch, 29 Oct), redone from scratch at maximum depth.
Site: https://miftah-site.vercel.app (EN at `/`, HE at `/he/`). Source: `website/src/content.py`, `build.py`, `assets/`. Facts: `MIFTAH_TRUTH_LEDGER.md`.

## 1. How the audit ran

| Round | What | Who | Where |
|---|---|---|---|
| 1. Diagnose | 7 independent audits, each with its own evidence folder in the session scratchpad (`qa/r1-team*`) | A strategy · B+C conversion and UX · D creative direction and UI · E copy (EN/HE) · F SEO and migration · G+H performance, accessibility, security · I customer panel (3 personas) | Preview `m9vpboarn` (commit cdcf26b) |
| 2. Fix | Content, journey, form, measurement, accessibility and design fixes; local test suite | Claude (this session) | Commit 7170040, preview `53cb3gp7j` |
| 3. Verify | 3 independent verifiers: journey and truth · technical (performance, accessibility, SEO, headers, events) · visual design | Separate agents, no access to the fixer's conclusions | Preview `53cb3gp7j`, then production |

Tools that ran: Playwright 1.56 with Chromium, Lighthouse 12, axe-core (WCAG 2.0/2.1/2.2 A and AA tags), html-validate 8, pixel-level contrast measurement over the hero video frames, Vercel deployment API.
Not available (needs the owners' sign-in or a decision): Google Search Console, GA4/GTM, Ahrefs, Similarweb, HubSpot or any CRM, a form inbox. No search volumes or competitor traffic figures are given anywhere in this audit, because none were measured.

## 2. Contradictions in the brief (not published)

| Brief says | What the evidence says | What the site does |
|---|---|---|
| "Active since 2003" | Companies Registrar: the current company (514770015) was incorporated on 3 June 2012 (ledger E2). The 2015 site said "two decades" (about 1995). | Keeps "20+ years" (ledger 1.6). No founding year is printed until the owners answer O11. |
| "Management and operation of properties and farms for owners abroad" | Ledger §2: ongoing management or owner reporting is "not us". Abroad, operation is part of a turnkey farm, with agricultural partners (1.4). | Offers net houses and farm structures, and turnkey farms abroad with partners. No management-only service (D11). |

## 3. Findings and their status

Status after round 2: **Fixed** (changed and tested) · **Partly** · **Blocked** (needs an owner decision or material; question in §5) · **Rejected** (with the reason) · **Open** (agreed, not done yet).
IDs refer to the round-1 reports: A, BC, D, E (copy; its own letters in brackets), F, G, I.

### Conversion and journey
| # | Finding (round 1) | IDs | Status | What changed / what is needed |
|---|---|---|---|---|
| 1 | The contact form cannot send: every enquiry ends in "not sent" | A1, BC-1, G1, I-1, D05, F14 | **Blocked** (O1) | An inbox and a form service are needed. Until then: the button says "Show my summary", the page says plainly that nothing is sent, the summary can be copied, and a call button sits on every result. |
| 2 | No email or WhatsApp; phone only | I-2, E(G1) | **Blocked** (O10) | Owners decide on a business email; Merav's WhatsApp stays off the site by their decision. |
| 3 | No investor route on the first screen | BC-4, D10, E(H4) | **Fixed** | Hero link "Investing in a farm abroad? Turnkey farms, delivered with agricultural partners". |
| 4 | Turnkey page: first action 4 screens down, blank form, no profile link | BC-5, I-15 | **Fixed** | Actions after the stages; `contact.html?need=turnkey` preselects the need; profile link. |
| 5 | Turnkey trust: partner unnamed, no delivered farm, a net house shown as turnkey proof | BC-6, I-3, A6, E(T3) | **Partly** | The Portugal example is now titled "A net house in Portugal". Partner name and contract model: **Blocked** (O5, O6). |
| 6 | Proof is text only; figures end in 2015 | A2, BC-7, I-4, D06 | **Blocked** (O2–O4) | Project photos, client names with permission, figures after 2015, one photo day with the owners. |
| 7 | Grants and permits missing | A3 | **Fixed** | FAQ on Investment Administration and Ministry support, worded "in certain tracks and on certain conditions; check the current procedure" (ledger E1). |
| 8 | "Three services, one team" pads the offer and overclaims | A5, BC-16, E(H2) | **Fixed** | "Two ways to work with us": net houses and structures; turnkey farms abroad with partners. |
| 9 | Minimum size shown as a fact and contradicted | A7, BC-12, E(H5, P2) | **Fixed** | Facts row: 7 countries instead; one firm wording of the minimums; Projects band "Planning a project like these?". |
| 10 | Crop pages thin and alike | A8, F6 | **Partly** | Own FAQ, own lead, scope rows, grants. More crop-specific proof needs O2 photos. |
| 11 | Projects: no delivery model abroad; "supervise execution" | A9, E(P1) | **Fixed** | Section "How we work abroad" (design; train and manage local crews; manage the build until handover; reference from Portugal). |
| 12 | The client's own values never shown | A10, E(H3, G2) | **Fixed** | About renders the values; the owners heading is "You deal with the owners, and we keep our word." |
| 13 | Language switch loses the crop and the draft | BC-8, I-9 | **Fixed** | The link carries `?crop=…&need=…#…`; one draft for both languages. |
| 14 | Partners must describe land; turnkey + Israel gives no note | BC-9 | **Fixed** | Partner role hides the land questions; turnkey + Israel says turnkey farms are abroad. |
| 15 | Contact: honesty notice and next steps arrive late | BC-10, D09 | **Fixed** | Call button in the page head; "What happens after you get in touch" leads the side column. |
| 16 | Success and error states: number not tappable, no summary | BC-11, D26 | **Fixed** | Call button and copyable summary on every result. |
| 17 | Globe: no way forward; opens in Hebrew | BC-13 | **Fixed** | A contact link in the globe, in the page's language; opened without `?lang`, it follows the browser's language. |
| 18 | Old draft overrides a new `?crop=` | I-8 | **Fixed** | The link wins over the draft. |
| 19 | Browser Back from step 2 leaves the page; Enter in step 1 does nothing | I-14, G5 | **Fixed** | A history entry per step; Enter means Next. |
| 20 | "We'll call" promised while the form can't send | BC-2, E(G7, F1) | **Fixed** | Interim wording everywhere: "Call us… or prepare your project details here first." |
| 21 | Header button on Contact links to Contact; investor button is a page name | BC-15, BC-17 | **Fixed** | Contact shows "Call 04-9854404"; "How a turnkey farm works". |

### Measurement
| # | Finding | IDs | Status | Notes |
|---|---|---|---|---|
| 22 | No analytics installed | BC-14, F14 | **Blocked** (owner choice A or B, consent) | `MIFTAH_MEASUREMENT_PLAN.md`. Events are ready and go nowhere until a tool is chosen. |
| 23 | Events double-count | BC-18, G12 | **Fixed** | `form_submit_unconnected` once per page view; `crop_select` once per real change. |
| 24 | No "how did you hear about us" | F14 | **Fixed** | Optional field; also `lead_id` to join a CRM row to its visit. |

### Accessibility
| # | Finding | IDs | Status | Notes |
|---|---|---|---|---|
| 25 | Hero slogan contrast over the footage (2.1–2.9:1) | D01, G3, I-17 | **Fixed** | Dark field behind the two lines, thin line one step heavier, darker phone scrim. Measured in round 1 with this CSS: median ≥5.4:1, ≤1% of glyph pixels under 3:1. |
| 26 | Drawer button 2.81:1 | D03, I-10 | **Fixed** | Mint on deep green, 5.53:1. |
| 27 | Hidden phone bar takes focus off screen | D11, G2 | **Fixed** | `inert` and hidden while off screen. |
| 28 | Menu button after the menu in the DOM | G4 | **Fixed** | Button first; Close label, page lock, outside tap closes. |
| 29 | Logo shrinks to 3–43 px on small phones | D02, G17, I-11 | **Fixed** | Icon-only menu button at ≤420 px. |
| 30 | Ticker announces its state twice | G20, E(G10) | **Fixed** | One label; `aria-pressed` carries the state. |
| 31 | Video Play/Pause race | G9 | **Fixed** | A tap always wins over the autoplay timer. |
| 32 | Without JavaScript: unreadable header, hidden crops, empty 405 page | G13, I-19 | **Fixed** | `noscript` styles; the send button is hidden and the message says to call. |
| 33 | Text-only zoom 200%: sideways scroll | I-18 | **Fixed** | Header, crop specs, areas bars and figures reflow (tested on 10 pages at 390 px). |
| 34 | Globe cannot be used by keyboard | G10 | **Partly** | Stated in the accessibility statement; the projects table carries the same data. |
| 35 | Accessibility statement has no named coordinator or email | I-12 | **Blocked** | Owners name a person and an address. |
| 36 | Inner page heads: title 3.3:1, breadcrumbs 2.2:1 | D07 | **Fixed** | Shorter heads, darker gradient, white breadcrumbs. |

### Performance
| # | Finding | IDs | Status | Notes |
|---|---|---|---|---|
| 37 | Hero video autoplays on phones (1.74 MB, 89% of the page) | G6 | **Reversed by the client** | 30 Oct: Hanoch asked for the opening film on phones too. It plays after the page has loaded (the 1.7 MB portrait cut); not with reduced motion, data saver or 2G/3G. |
| 38 | Forced layout at start-up | G8 | **Fixed** | First header update after the first paint. |
| 39 | Globe loads 450 KB as you scroll near it | G10, D12 | **Fixed** | Phones load it only on a tap; the still stays until the globe has loaded. |
| 40 | 3D page dots do nothing before three.js | G11 | **Fixed** | Bound at start. |
| 41 | `fonts.css` blocks rendering | G18 | **Fixed** | Folded into `site.css`. JPEG-only posters (28 KiB): **Open**, minor. |
| 42 | 12% of CSS rules unused | G16 | **Rejected for now** | Removing them safely needs visual-regression tests; no user-visible gain. |
| 43 | three.js r128 is old | G19 | **Rejected** | No advisory applies to r128 (CVE-2020-28496 is before 0.125); an upgrade means rewriting the scene code. |

### SEO and migration
| # | Finding | IDs | Status | Notes |
|---|---|---|---|---|
| 44 | Old Hebrew URLs 404 in Chromium (case) | F1 | **Fixed** | Both %-encodings: 109 redirects. |
| 45 | 11 old URLs land on weaker pages | F2 | **Fixed** | Best-match targets. |
| 46 | QR on the profile leads to the 2015 site | F4 | **Fixed** | QR points to the current domain. |
| 47 | Net houses title competes with the crop pages | F5 | **Fixed** | "Net houses and farm structures for growers". |
| 48 | FAQ marked up on several pages | F7 | **Fixed** | Each question marked up once per site. |
| 49 | Links to `/index.html` | F8 | **Fixed** | `./`; `/index.html` redirects. |
| 50 | Long descriptions and titles | F9 | **Fixed** | All titles ≤65 and descriptions ≤160 characters. |
| 51 | One lastmod for every page | F10 | **Fixed** | Per page, from a hash of its content. |
| 52 | Hebrew 404 on Vercel | F11, D25, G15, I-16, E(G6) | **Fixed** | The shared 404 has a Hebrew block; Apache serves `/he/404.html`. |
| 53 | `/contact` 404, no `favicon.ico` | I-16 | **Fixed** | Slug redirects; favicon.ico. |
| 54 | No Google Business Profile, LinkedIn, `sameAs`; "MIFTAH" ambiguous in search | F12 | **Blocked** | Owners create the profiles; then `sameAs`. |
| 55 | Search standing builds on a temporary domain | F13, I-13 | **Blocked** | DNS move to www.miftah.co.il needs the owners' approval. |

### Security and privacy
| # | Finding | IDs | Status | Notes |
|---|---|---|---|---|
| 56 | No Permissions-Policy or COOP; directory listing on Apache | G14 | **Fixed** | Both hosts. HSTS: **deferred** until HTTPS works on www.miftah.co.il. |
| 57 | JSON-LD not escaped | G20 | **Fixed** | `<` escaped. |
| 58 | Privacy page silent on attribution data and processing abroad | G7 | **Fixed** | Updated 29 Oct. |

### Copy, design and images
| # | Finding | IDs | Status | Notes |
|---|---|---|---|---|
| 59 | Repetition, jargon, calques, inconsistent terms (EN and HE) | E(G3–G10, H8–H10, N1–N2, CP1, S1, T1–T5, P1–P5, A1, F2, PR1, C1–C2) | **Fixed** (round 2 batches) | Round 3 re-checks. |
| 60 | Banana-project photos on Turnkey and Orchard pages | D04 | **Fixed** | Removed. |
| 61 | Service cards hide the product; card 3 repeats card 1 | D08 | **Fixed** | Two cards; the turnkey card shows its four phases. |
| 62 | Project cards vanish on their section | D13 | **Fixed** | White cards, beside the heading. |
| 63 | Slow zoom on upscaled archive photos | D14 | **Fixed** (zoom) / **Blocked** (new photos, O2) | |
| 64 | 3D page step drifts from the card on phones | D15 | **Fixed** | 8% of scroll positions out of sync in round-1 measurement with this change (was 18–23%). |
| 65 | Step photos 02/03 show field work under "design" and "manufacturing" | D16 | **Open** | Needs Yiftach to say which archive photo shows which stage. Numbers aligned; archive label added. |
| 66 | Header repeats the slogan on Home | D19, E(H7) | **Rejected** | Client requirement: the slogan stays in the header. |
| 67 | Stock styling: kickers, sparkles, glows, card zoom, page-head drift | D23 | **Fixed** | Two kickers left; mint pole separator; flat bands; no zoom. |
| 68 | One H2 size for every section | D20, D21 | **Fixed** | Second, smaller H2 size; owners heading at full size. |
| 69 | 11 stages flattened | D22 | **Fixed** | Four phases. |
| 70 | Profile sheet: no photo, doubled heading | D26 | **Partly** | Heading fixed; photo strip **Open**. |

## 4. Round 3: independent verification and the fixes it led to

Three verifiers checked preview `53cb3gp7j` (commit 7170040) without the fixer's notes. 49 findings; fixed in commits 191e4b3, a073505 and the round-3 technical commit.

### Journey and truth (19 findings)
| ID | Finding | Status |
|---|---|---|
| F1 | Globe showed the kiwi client's exact village (coordinates of the kibbutz, "Exact village") | **Fixed**: region only, no exact point anywhere |
| F2 | Investors abroad can only phone, with no hours or languages | **Blocked**: O1, O13 |
| F3 | Hebrew size ranges rendered reversed ("300–50 דונם") | **Fixed**: "50 עד 300 דונם" |
| F4 | Orchard grant answer without its conditions | **Fixed** |
| F5 | "We maintain structures" could mean other suppliers' structures | **Fixed** (our structures; others: call and ask) · O14 open |
| F6 | Projects shown by crop and region before the owners approve | **Blocked**: O2 |
| F7 | Fly-in video launched from each project card (footage location unconfirmed) | **Fixed**: Israel card only |
| F8 | Turnkey: who reports progress to the investor during delivery | **Blocked**: O5, new question Q4 |
| F9 | "Illustration" label until 4.8 s on footage that looks real from 3.3 s | **Rejected**: 0–4.6 s is AI generated (Kling, end frame = a real still; `globe/README.md`), so the label is right |
| F10 | Globe: "on every project abroad" | **Fixed**: "Abroad, we plan…" |
| F11 | "Built by our own team" (local crews abroad; Belarus made locally) | **Fixed** |
| F12 | Partner's summary listed land answers they never saw | **Fixed** |
| F13 | Header and phone-bar buttons dropped the page's context | **Fixed** (turnkey, net houses, bananas; the orchard page presets no single crop) |
| F14 | Partners find their way in late; the form asks the need first | **Fixed**: the form asks who you are first |
| F15 | Hebrew full stop inside the phone number's isolate | **Fixed** |
| F16 | Globe: English eyebrow and dialog name | **Fixed** |
| F17 | "If smaller, send anyway" works against the minimum | **Fixed**: firm minimum (ledger 4.2, 4.3) |
| F18 | Unlabelled AI space backdrop | **Fixed**: "Illustration" chip (also V9) |
| F19 | Profile prints the vercel.app address and QR | **Blocked**: domain move (DNS) |
| – | `availableLanguage` in structured data (O13 open) | **Fixed**: removed |

### Visual and image rules (16 findings)
| ID | Finding | Status |
|---|---|---|
| V1 | Header button off screen at 1500–1728 px (new in round 2) | **Fixed**: measured 1181–2560 px, EN and HE |
| V2 | p-marking: the left-most worker may be under 18 (no children rule) | **Fixed** by a crop; owners to confirm ages |
| V3 | p-site: rust-coloured steel reservoir (galvanized-only rule) | **Fixed** by a crop; owners to confirm; yellow lift (3D scene) and black tensioning tool: owner question Q9 |
| V4 | Breadcrumbs over bright sky 3.0–3.5:1 | **Fixed** (4.6:1 or more) |
| V5 | Phone hero sub-line and lead under 4.5:1 | **Fixed** (see T1) |
| V6 | Consent error became a narrow third column | **Fixed** |
| V7 | Hebrew summary reversed the visitor's phone number | **Fixed** (`<bdi>` on screen; the copied text stays plain) |
| V8 | 3D cards cover the "Illustration" badge on phones | **Fixed**: the label is in each card on phones |
| V9 | Globe still without an AI label | **Fixed** |
| V10 | Mobile menu: no backdrop; odd pill | **Fixed** |
| V11 | Contact header showed the number twice | **Fixed** |
| V12 | Globe button wraps; globe in a monospace font | **Fixed** |
| V13 | Legal pages: centred body under a left-aligned title | **Fixed** |
| V14 | Same-coloured sections stack padding; four buttons in 600 px on Turnkey | **Fixed**: the conversation button moved into the Turnkey page head |
| V15 | Lone last words; four one-word lines in the Hebrew About title at 320 px | **Fixed** |
| V16 | Missing /he/ pages show English first | **Fixed** (Hebrew block first; status stays 404) |

### Technical (14 findings)
| ID | Finding | Status |
|---|---|---|
| T1 | Phone hero sub-line 3.6–3.9:1, lead 5th percentile 4.28 | **Fixed**. Measured after the fix (poster frame, 320/390/768 px, EN and HE): 0% of glyph pixels under 4.5:1 |
| T2 | Thin first line of the slogan: 3–5% of pixels under 3:1 at 1440 px; header slogan line 3.9:1 | **Fixed**. Measured: 0% under 3:1 at every width in both languages; slogan line 5.85:1 or more |
| T3 | `crop_select` wrong after a tap on the shown crop, or away-and-back | **Fixed** |
| T4 | `form_invalid` on Send without `step` | **Fixed** |
| T5 | Keyboard focus lost when the globe loads by scrolling | **Fixed** |
| T6 | Focus rings over photos 2.5–2.8:1 | **Fixed**: white ring with a deep-green edge |
| T7 | Fly-in dialog: Tab escapes; Escape loses focus | **Fixed** |
| T8 | `/%2ehtaccess` served the Apache config (no secrets) | **Fixed**: `.vercelignore`; checked on the next preview |
| T9 | Vercel's preview toolbar blocked by the CSP (Best Practices 93 on previews only) | **Not changed**: a Vercel project setting; production has no toolbar |
| T10 | No cache rule for `/globe/`; no WebM for the fly-in; desktop WebM larger than MP4 | **Partly**: cache rules added; video re-encodes **Open** |
| T11 | `/he/` misses get the English 404 page | **Partly** (see V16) |
| T12 | FAQ marked up twice | **Fixed** |
| T13 | Short descriptions (privacy, accessibility) | **Fixed** |
| T14 | `where` values missing from the measurement plan | **Fixed** |

### Test results (30 October 2026)
Production = https://miftah-site.vercel.app at commit f45fcb7 (deployment `i8jr1q5ze`); preview `hwkmlt3ju` is the same build.

| Check | Where | Result | Status |
|---|---|---|---|
| Slogan in the header, every page, 9 widths, EN+HE | local | 198 / 198 | PASS |
| Layout: overflow, off-screen, clipped text, small targets; 14 widths 320–1920 × 24 pages | local | 336 checks, no issues | PASS |
| Header sweep 1181–2560 px (button on screen, logo ≥100 px, icon 16 px, slogan line shown), EN+HE | local | no failures | PASS |
| Text-only zoom 200% at 390 px, 10 pages | local | no sideways scroll | PASS |
| Key figures on one line, 12 widths × EN+HE | local | all | PASS |
| axe-core (WCAG 2.0/2.1/2.2 A+AA), home and states | local | 0 violations | PASS |
| axe-core, 26 pages × 2 widths + 28 states (round-3 verifier, preview 7170040) | preview | 0 violations in 84 runs | PASS |
| Hero text contrast per glyph pixel, poster frame, 320/390/768/1440, EN+HE | local, after fixes | slogan: 0% of glyph pixels under 3:1 at every width; lead and header slogan line: 0% under 4.5:1; sub-line: 0% under 4.5:1 on phones and tablets, 0% under 3:1 at 1440 px (26 px, so large text) | PASS |
| Hero contrast while the video plays | – | measured by the verifier before the fixes only | NOT TESTED after the fixes |
| Form: validation, two steps, honest "not connected" result, success/500/timeout with a mocked endpoint, double send, honeypot, prefill | local | 24 / 24 | PASS |
| Keyboard: menu, Escape, language switch, 404 links, no-JS form | local | 17 / 17 | PASS |
| Round-2 behaviours (prefill, partner path, history, events once, result boxes, menu, phone bar, globe, video, crop tabs, ticker) | local | 28 / 28 | PASS |
| Round-3 journey fixes | local | 18 / 18 | PASS |
| Round-3 design fixes | local | 10 / 10 | PASS |
| Round-3 technical fixes | local | 11 / 11 | PASS |
| Older regression set (round 4) | local, preview, production | 22 / 22 each | PASS |
| Console errors, page errors, failed requests, third-party requests | local (58 loads incl. globe) | none | PASS |
| Console errors and CSP violations under the real headers, all pages EN+HE at 390/1440, globe loaded, 3D page scrolled | preview `hwkmlt3ju` | 55 loads, no errors (only the intended 404 of a missing page) | PASS |
| Live checks (site, slogan, H1, globe, 3D page, headers, canonical, hreflang, robots, sitemap 22 URLs, structured data, header behaviour, crop selector, form, globe, no JS errors) | production | 27 / 27 | PASS |
| `/%2ehtaccess`, `/.vercelignore` | preview and production | 404 (was 200 with the Apache config) | PASS |
| Redirects from the old site: 54 cases incl. both %-encodings, `/index.html`, `/he`, slugs without `.html` | preview 7170040 (round-3 verifier) | 54 / 54 one hop to 200 | PASS |
| html-validate, every page | local | clean | PASS |
| Lighthouse | production | see below | |
| Screen readers, Safari, Firefox, real phones | – | – | NOT TESTED |
| Sending a real enquiry | – | no endpoint exists (O1) | BLOCKED |
| Analytics, Search Console, CRM | – | not connected | BLOCKED |

Lighthouse on production (median of 3 runs):

| Page | Phone: perf / a11y / best practices / SEO | Phone LCP | Phone TBT | Phone KB | Desktop: perf / a11y / BP / SEO | Desktop LCP | Desktop KB |
|---|---|---|---|---|---|---|---|
| `/` | 100 / 100 / 100 / 100 | 1.43 s | 46 ms | 210 | 100 / 100 / 100 / 100 (2 valid runs) | 0.38 s | 4,214 |
| `/he/` | 100 / 100 / 100 / 100 | 1.37 s | 0 ms | 211 | 100 / 100 / 100 / 100 | 0.38 s | 4,215 |
| `/net-houses.html` | 100 / 100 / 100 / 100 | 1.62 s | 18 ms | 158 | 100 / 100 / 100 / 100 | 0.50 s | 243 |
| `/contact.html` | 100 / 100 / 100 / 100 | 1.33 s | 31 ms | 84 | 100 / 100 / 100 / 100 | 0.34 s | 84 |
| `/how-we-build.html` | 100 / 100 / 100 / 100 | 1.59 s | 4 ms | 176 | 100 / 100 / 100 / 100 | 0.39 s | 220 |

CLS is 0.000 on every run. Lighthouse 12 with simulated throttling, from this sandbox; other jobs were running at the same time.
Before (round 1, preview `m9vpboarn`, phone): home 99 at 1,825 KB (the hero video loaded on phones), net houses 98, contact 100.
The desktop home weighs about 4.2 MB because the hero video plays on desktop; it loads after the page and does not affect the scores (re-encoding: T10, open).

## 5. Questions for the owners
Each answer unlocks a specific change; none of these may be guessed.

| # | Question | Unlocks |
|---|---|---|
| Q1 (O1) | Which inbox receives website enquiries, and which form service may we use? | The form sends; "Send the request" replaces "Show my summary"; leads stop depending on a phone call |
| Q2 (O13) | Office hours, languages the office answers in (English?), usual reply time | Contact page and turnkey page for foreign investors; structured data |
| Q3 (O10) | A business email to publish? (WhatsApp stays off, as decided) | A second channel for buyers abroad |
| Q4 (O5, O6) | Turnkey partner(s): may we name them? Who signs the contract, who does which of the 11 stages, and how does the investor hear about progress during delivery? | The turnkey page's trust gap (the investor's first question) |
| Q5 (O2–O4) | Approval to show each project (photos, crop, region), client names where allowed, figures after 2015; one photo day (owners, the plant, 2–3 projects, galvanized steel only) | Real proof instead of text cards; new page heads instead of upscaled 2011 photos |
| Q6 (O11) | Does the "20+ years" experience predate the 2012 company? Legal name and company number for the footer and privacy page | A founding line that survives due diligence |
| Q7 (O14) | Do you maintain structures built by other suppliers? Warranty terms on the structure and the net? | The "Already have net houses?" answer; a reason for switching growers to call |
| Q8 (O8) | Where was the drone footage (hero video, globe fly-in) filmed? | Captions and the globe card can name the place |
| Q9 | Photos: the ages of the crew in the marking photo; the material of the round reservoir; consent for identifiable faces; the yellow lift in the 3D scene and the black tensioning tool | Whether the uncropped photos may return |
| Q10 | A named accessibility coordinator and an email address | The accessibility statement (required content) |
| Q11 | Analytics: option A (cookieless) or B (GA4 with consent)? | Measuring the funnel in `MIFTAH_MEASUREMENT_PLAN.md` |
| Q12 | When to move to www.miftah.co.il (DNS), and who holds the DNS account? | One search address; HSTS on Apache; the profile's QR |
| Q13 | Google Business Profile and a LinkedIn company page: who creates them? | Local search and `sameAs` links; "MIFTAH" is ambiguous in search today |
| Q14 | Yiftach to review the engineering wording: drawing labels ("edge cables tie the structure to the ground"), 3D chapters ("side nets and an entrance door close the structure") | Engineering claims signed off by the engineer |
| Q15 | Do you help growers with grant applications, or only build? | Whether the grant FAQ can offer help |

## 6. 30-day plan
Costs are only stated where known; "time" means our work, with no outside spend.

| When | Step | Impact | Effort | Cost | Depends on |
|---|---|---|---|---|---|
| Week 1 | Connect the form to the chosen inbox; test with a real enquiry; switch the button text | Highest: online leads at all | Small (hours) | Time; the form service's plan if one is chosen (owner) | Q1 |
| Week 1 | Publish office hours and languages; add them to the contact and turnkey pages and structured data | High for buyers abroad | Small | Time | Q2 |
| Week 1 | Choose analytics A or B; install; check every event in `MIFTAH_MEASUREMENT_PLAN.md` fires once | Lets the next decisions rest on data | Small to medium (B needs a consent banner) | A: vendor subscription or Vercel's plan; B: free tool, consent work | Q11 |
| Week 2 | Google Business Profile, LinkedIn page, Search Console verification and sitemap submission | Brand search and local visibility | Small for us; owners create the accounts | None | Q13, owners' Google account |
| Week 2 | Turnkey: partner and contract model on the page, how progress is reported | Investor trust | Small once answered | Time | Q4 |
| Weeks 2–3 | Photo day; project cards with photos, year and size; replace the upscaled archive heads | Proof for growers and investors | Medium | Photographer (owner's choice) | Q5, Q9 |
| Week 3 | Engineering review of drawing labels and 3D chapters; maintenance and warranty answer | Accuracy | Small | Time | Q7, Q14 |
| Week 4 | Move to www.miftah.co.il: DNS, the 109 redirects already built, HSTS, profile QR | One address for search; ends the temporary domain | Small for us; needs DNS access | Domain renewal (existing) | Q12, owners' approval |
| Week 4 | Profile PDF and QR for Fruit Logistica (3–5 Feb 2027) on the final domain | Leads from the fair | Small | Printing (owner) | Q12 |
| After 4–6 weeks of data | First funnel review: visits → CTA clicks → form starts → sent → qualified | Know where leads are lost | Small | Time | Analytics installed |

Not in this plan, by choice: paid campaigns (no measurement yet), new service pages (no new verified facts), a CSS clean-up (needs visual regression tests first).
