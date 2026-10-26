# MIFTAH QA and stress test report

What was tested, how, and the real results. Every result below comes from a test that was actually run on 26 Oct 2026, on the built site in `public/`, served locally (`python3 -m http.server`). Nothing listed as "not run" was run.

## 1. Capability inventory (what this environment could and could not do)

| Capability | Available | Used for |
|---|---|---|
| Chromium + Playwright (headless) | Yes | Screenshots, widths, keyboard, form, video, print-to-PDF, axe |
| axe-core 4 | Yes | WCAG 2.1 A/AA + best-practice checks |
| html-validate 8 | Yes | HTML validity (config: recommended, with inline styles, long titles and style-only rules off) |
| linkinator 6 | Yes | Links and assets, recursive from both home pages |
| Lighthouse 12 | Yes | Performance, accessibility, best practices, SEO (mobile throttled and desktop presets) |
| Independent reviewers | Yes, as separate agents that hadn't written the code | Acceptance gates and stress tests B, C, H |
| Safari, Firefox, real iOS/Android devices | **No** | Not tested. Listed in the release checklist. |
| A live form destination (email/CRM) | **No** (no business email exists, truth ledger O1) | The form was tested against mocked endpoints only |
| The production host (Nethost, Apache) | **No** | `.htaccess` rules not tested on the real server |
| Real users / analytics | **No** | No user testing; no analytics connected |

## 2. Cycles

| Cycle | Who reviewed | What came out | Fixed |
|---|---|---|---|
| 1 | Buyer/CEO, creative director, engineer (independent agents) | Ambiguous CTA, hero showed one offer only, 41 ha not stated, drone net house repeated, drawing too simple, facts row without gutter on phones, Hebrew map labels flipped, 404 skip link, self-import, date-based versioning, robots/noindex conflict, `aria-pressed` misuse, no fetch timeout, image sizes, profile printed on 2 pages | All |
| 2 | Acceptance gate: business, design and engineering panels | Score 68.5 (table below). Credibility, conversion, originality and assets were the weak points. 11 engineering defects. | All 11 engineering defects; phone drawing and map without sideways scroll; FAQ on Contact; photo reallocation; facts padding in Hebrew; footer; corrected copy |
| 3 | A new independent reviewer (gate 4) | Score 65.8. A real contrast bug in the open mobile menu (2.6:1), one claim the ledger rules out ("uses less material"), "Already working in Portugal" on the turnkey page, the form's "not connected" message appearing only after submitting, undated 2015 figures, the Spain/Portugal marker overlap, Hebrew mixing singular and plural | All code items |
| 4 | Another new reviewer (gate 5), on the cycle-3 build | Score 72 (section 5). No factual errors, broken layouts or overlaps. Ten small code items | The code items listed in section 5; full regression rerun |

## 3. Stress tests A–J

### A. Five-second test
Run by the gate-4 reviewer on the EN and HE home hero at 390 and 1440 px. **Pass**: the headline says what MIFTAH does ("We design, make and build net houses for orchards and bananas"), and the next step is the "Discuss your project" button, with "For investors: turnkey farms" as the second. Caveat: "for whom" is implied, and on a 900 px tall desktop screen the facts row starts just below the fold.

### B. Skeptical international buyer
Objections raised by the reviewers, and what was done:

| Objection | Result |
|---|---|
| "Can I talk to one of your clients?" | FAQ answer and Home: references from clients in Israel and Portugal after a first conversation (ledger 3.5). Named clients need owner approval (O3). |
| "Have you ever delivered a whole farm?" | Turnkey says plainly it is the newest line, delivered with partners. "Already working in Portugal" was renamed "A client in Portugal" (it was a net house). |
| "Are these numbers current?" | Overseas areas are now marked "by 2015" / "as of 2015". |
| "How do I reach you, and will it work?" | The form now says before any typing that online sending isn't connected, and gives the phone. A tap-to-call button is in the phone header. Real sending needs O1. |
| "What does it cost?" | FAQ: the price is set after a site review and the design. No numbers are published (none were supplied). |
| "Who are you?" | About: named co-CEOs, company details, crew photo. Portraits not available yet. |

### C. Visual originality
Signature elements that a generic template wouldn't have: the section drawing (draws itself once; a separate phone version), the flat map with areas, the engineering title block in the footer. Weak points that remain: the photo stock (six 2015 archive photos), and text-heavy pages. That needs the owners: a shoot of the plant, crews and finished orchards.

### D. Campaign integration
Checked against `MIFTAH_ASSET_REGISTRY.md` and `MIFTAH_ASSET_DEPLOYMENT_MAP.md`. All the photos and video used are real and galvanized-steel only. The three photos that break the steel rule (04, 05, the winter orchard) are excluded. Each photo appears on at most 2 pages and never twice on one page. AI images are not used on the website by decision. No broken image or video in the crawl.

### E. Mobile and width stress
`widths.mjs`: 9 pages × 7 widths (360, 390, 430, 768, 1024, 1440, 1920) × 2 languages = **126 checks: 0 issues** (horizontal scroll, clipped text, tap targets under 44 px, overlapping fixed elements). Visual checks of the phone drawing, map panels, header at 360 px in Hebrew, menu, form.

### F. Conversion
Form tests (`form.mjs`), **19/19 pass**: required-field errors with `aria-invalid`/`aria-describedby`; focus to the first invalid field in page order; email format; minimum-size note by country; unconnected state is honest (no fake "sent"); summary contains the details; 2xx → success; double click → one request; payload has the qualification codes; 500 → error, form kept; hanging endpoint aborted (15 s, shortened in the test) → error, button usable; too-fast submit held and sent once; honeypot → nothing sent, phone shown; Hebrew summary without invisible direction marks; Hebrew errors.

**Classification: integration incomplete.** Submissions do not reach anyone until a destination exists (O1). The site says so, before and after submitting, and routes people to the phone.

### G. Technical failures
| Check | Result |
|---|---|
| Broken links and assets (linkinator, both languages, recursive) | 92 local links, **0 broken**. Links to www.miftah.co.il skipped (site not live). |
| Console errors, 4xx responses and third-party requests (20 pages × 390 and 1440 px, scrolled to the end, after cycle 3) | **0** in 40 page loads |
| HTML validity (20 files) | **0 errors** |
| Accessibility (axe-core, 20 pages × desktop and phone, reduced motion) | **0 violations**. Open mobile menu on 4 pages: **0** (this state missed the contrast bug before cycle 3; now tested) |
| Keyboard (`kb.mjs`) | **16/16**: skip link, visible focus, menu with Enter/Escape and focus return, video pause, reduced motion, language switch keeps the page, 404 links, no-JS form |
| Reduced motion | No video download; the drawing is shown complete |
| Duplicate submissions | One request on double click |
| Build from a clean copy (checked by the cycle-2 engineering reviewer) | Same output byte for byte (except the video, whose source isn't in the repo). Dates now come from git, so this also holds on a fresh clone. |
| 404 at deep paths (`/a/b/c/missing`, `/he/x/y/z`) | CSS and links resolve |
| Print | The company profile prints on 1 A4 page, EN and HE (PDF checked) |
| Security and privacy | No third-party requests, no cookies, no storage. `.htaccess`: CSP, nosniff, referrer policy, compression. The HTTPS redirect and HSTS are ready but commented out until the certificate is live. The honeypot and the minimum fill time cover spam. Lint and type checks: there is no JS build, so none ran. |
| Browser compatibility | **Chromium only.** Safari, Firefox and real devices were not tested. |

### H. Skeptical CEO
The gate reviewers' blunt points: the site is well engineered but proves little beyond MIFTAH's own numbers, and the form has no inbox. Both are owner inputs (O1–O4, photos). Everything a CEO would call a defect in the code was fixed in cycles 1–3.

### I. Performance (Lighthouse 12)
After cycle 2, 10 pages × 2 profiles:

| Page | Mobile perf | Desktop perf | A11y | BP | SEO | Mobile LCP | CLS |
|---|---|---|---|---|---|---|---|
| Home | 97* | 100 | 100 | 100 | 100 | 2.3 s | 0 |
| Home HE | 95 | 100 | 100 | 100 | 100 | 2.6 s | 0 |
| Net houses | 98 | 100 | 100 | 100 | 100 | 2.3 s | 0 |
| Net houses HE | 98 | 100 | 100 | 100 | 100 | 2.4 s | 0 |
| Turnkey | 99 | 100 | 100 | 100 | 100 | 2.1 s | 0 |
| Projects | 97 | 100 | 100 | 100 | 100 | 2.3 s | 0 |
| Projects HE | 96 | 100 | 100 | 100 | 100 | 2.6 s | 0 |
| About | 100 | 100 | 100 | 100 | 100 | 1.7 s | 0 |
| Contact | 99 | 100 | 100 | 100 | 100 | 1.8 s | 0 |
| Contact HE | 99 | 100 | 100 | 100 | 100 | 1.8 s | 0 |

\* The first Home mobile run scored 69 (TBT 1,890 ms). It was the first run after a worker restart; three reruns scored 97, 97 and 97 (TBT 0–20 ms). After cycle 3, the five changed pages were re-measured: mobile 95–99, desktop 100, the rest 100, CLS 0.

All targets met (mobile ≥85, desktop ≥95, others ≥95). The hero video is not downloaded with Save-Data or on 2G/3G.

### J. Regression
After each cycle, all of the above were rerun: widths, axe, keyboard, form, html-validate, linkinator, Lighthouse (all pages after cycle 2, the changed pages after cycle 3), print. Cycle 3 added the open-menu axe check, so the contrast bug can't come back unnoticed.

## 4. Acceptance gate: scores by cycle

Weights from the brief: 15/15/15/15/15/10/5/5/5.

| Dimension | Weight | Gate 2 (cycle 2, before fixes) | Gate 4 (cycle 3, before fixes) | Gate 5 (final) |
|---|---|---|---|---|
| Strategic and brand fit | 15 | 8 | 8 || 8 |
| Business clarity | 15 | 8.5 (EN 9, HE 8) | 8 || 8.5 |
| Visual originality and art direction | 15 | 6 | 6 || 6.5 |
| International credibility and trust | 15 | 6 | 5 || 5.5 |
| Conversion and user journey | 15 | 6 | 4.5 || 6 |
| Campaign asset integration | 10 | 5.5 | 6 || 7 |
| Responsive experience | 5 | 6.5 | 8 || 8.5 |
| Performance, accessibility and SEO | 5 | 9 | 9 || 9.5 |
| Code quality and maintainability | 5 | 7 | 8 || 8 |
| **Weighted total** | | **68.5** | **65.8** | **71.75 ≈ 72** |

Gates 2 and 4 were scored by different reviewers, so the change between them is not a trend. Gate 4 judged conversion more harshly (a dead form path), and responsiveness and code more kindly (after the cycle-2 fixes).

## 5. Final gate (gate 5)

Scored by a reviewer who had not seen the earlier gates, on the cycle-3 build: 116 viewport screenshots at 390 and 1440 px in both languages, the open menu, form submits, the profile PDF.

**Weighted total: 71.75 ≈ 72 / 100. The target of 90 is not met, and four dimensions are below 8:**
- Credibility and trust 5.5
- Conversion 6
- Visual originality 6.5
- Campaign assets 7

The reviewer's verdict: "honest, clear and technically very good. What holds it back is missing proof." The reviewer found **no** factual errors against the ledger, **no** broken layout or overlap at 390 or 1440 in either language, and no dead functionality apart from the form's destination, which the page states openly.

**Fixed after gate 5 (cycle 4), then the full regression suite was rerun** (form 19/19, keyboard 16/16, widths 126/126, axe 0 including the open menu, 0 console errors in 40 page loads, HTML valid, 0 broken links, profile 1 page; Lighthouse mobile on the changed pages 95–100, CLS 0):
- The "not connected" panel is neutral instead of an error red, and leads with the call and copy buttons.
- Structured data: the owners are `employee` with "Co-CEO and owner" rather than `founder`, which the ledger doesn't state.
- Hebrew: the remaining singular address on Turnkey is now plural. "הנדסאי בניין (הטכניון)". "בתי רשת" no longer breaks across lines in the H1.
- Contact names Merav Eyal Hasfel, as on About.
- About: the photo sits beside the text and company table, so no column is left empty.
- Drawing: callout 6 points at a folded net with an arrow, instead of a bare line.
- Map labels on phones are about 20% larger.
- Profile: the stage list reads as one sentence.

Not changed, on purpose:
- The minimum-size fact on Home stays. The owners asked to filter small enquiries (q8, q21).
- Home repeats the steps and values that inner pages expand. That is a summary.
- `drone-hillside` is the same net house as the hero, which the asset rules limit.

A fresh score after cycle 4 was not run, so 72 remains the last measured score.

**Why the gap to 90 can't be closed in code.** The four low dimensions are capped by inputs that don't exist yet:
- an enquiry inbox (O1)
- approved references and quotes (O3, O4)
- per-project photos and approval of the selected-projects table (O2)
- photos of the plant and the owners

Under the brief's own rule, a high visual score cannot override a non-working enquiry path, so the site is **not ready to launch** until O1 is done, even though every technical check passes.

## 6. Remaining limits that only the owners can lift

| Limit | Dimensions held back | Owner action (truth ledger §8) |
|---|---|---|
| No enquiry destination | Conversion, trust | O1: a business email or lead inbox, then set `FORM_ENDPOINT` |
| No third-party proof | Trust | O3, O4: approve reference clients and quotes |
| 2015 archive photos only; no plant, no portraits, no per-project photos | Originality, assets, trust | O2, plus a professional shoot |
| No analytics | Assets (measurement) | Choose a cookieless provider |
| Content sign-off, English review, rights and consent | Launch | Release checklist blockers |

This internal rating is a decision aid, not a market certification.
