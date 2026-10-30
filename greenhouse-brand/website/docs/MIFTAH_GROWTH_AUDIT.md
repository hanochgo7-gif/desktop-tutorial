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
| 37 | Hero video autoplays on phones (1.74 MB, 89% of the page) | G6 | **Fixed** | Phones get the poster and a Play button. |
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

## 4. Verification
(Round 3 results, filled in after the verifiers report.)

## 5. Questions for the owners
(Filled in with the final report.)

## 6. 30-day plan
(Filled in with the final report.)
