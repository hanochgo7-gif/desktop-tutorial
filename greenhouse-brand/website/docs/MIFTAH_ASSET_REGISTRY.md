# MIFTAH: Media Asset Registry (website build)

Prepared 2026-10-26. Read-only audit: no media was edited, moved or deleted.

## Path prefixes used in this document

| Prefix | Absolute path |
|---|---|
| `R/` | `/home/user/desktop-tutorial/greenhouse-brand/` (the project repo) |
| `S/` | `/tmp/claude-0/-home-user-desktop-tutorial/b123b69e-b646-5436-91f8-b8abb5efcf73/scratchpad/` (session scratchpad) |

**Warning: the `S/` scratchpad is temporary session storage.** Every master marked USE, USE-WITH-LABEL or RESERVE that lives under `S/` should be copied into the repo (for example `R/website/assets/`) before the website build. Otherwise it can be lost.

## How this audit was done

- **Files found:** 390 media files (jpg/png/svg/pdf/mp4) across all requested folders, plus the frame dumps under `S/drone/` and `S/fly/`.
- **Specs:** dimensions and format came from PIL; duration, codec, frame rate, bitrate and audio came from `ffprobe`. Exact duplicates were found by MD5.
- **Visual check:** every still was viewed on contact sheets. Videos were checked at 4 frames each (5 %, 30 %, 55 % and 85 % of their length). Steel colour was checked on zoomed crops wherever poles were visible. The print PDFs were rendered at 40 dpi.
- **Grouping:** near-duplicates (the same photo at other sizes, crops, upscales or web encodes) are grouped into one entry. The best master is named first, and the variants are listed under "Variants".
- **Quality scale:** 1 = unusable, 3 = fine for supporting or small sizes, 5 = premium hero quality at full width.
- **"AI-upscaled":** the image is a real photo enlarged with AI (Higgsfield upscale, source URLs in `S/best/src/urls.txt`, `S/best/up/urls.txt` and `S/best/up2/urls.txt`). It is still a real photo, but fine texture is partly synthesised. It is not "AI-generated".

---

## 1. Summary

### Counts by decision (one entry = one asset or one group of near-duplicates)

| Decision | Entries | Meaning |
|---|---|---|
| **USE** | 12 | Real, compliant, good enough to publish now (after the listed processing). |
| **USE-WITH-LABEL** | 22 | AI-generated or composite. Publish only with the visible label "Illustration / הדמיה". Never present it as a real project. |
| **RESERVE** | 20 | Compliant or probably compliant, but held back for one of these reasons: repeats the single drone net house, owner check needed, low resolution, unverified provenance, or print/source files. |
| **EXCLUDE** | 29 | Breaks a client rule (black, rusty, brown or painted steel; children; civil shading; superseded logo), or is an internal working file. |
| **Total** | **83** | |

The 29 excluded entries break down as follows:
- 19 for steel colour (black, rusty, brown or painted steel). This includes the two DJI_0001 footage groups and the AI kiwi image.
- 4 for civil shading (pools, school, dog park, painted-steel yard shade)
- 1 for children
- 3 testimonial letters about civil-shading jobs (Hanita pool/courts, Maayanot school, Yehiam kindergartens)
- 1 for the superseded logo
- 1 grouped entry for working files (contact sheets, screenshots, test renders, frame dumps)

Together these 29 entries cover about 160 media files, plus about 500 working frame dumps (`S/drone/` and `S/fly/` frames).

### Critical findings (they contradict earlier curation)

1. **`05-spreading-net.jpg` (installer on a lift) shows rusty-brown poles** in its bottom-left corner. This photo is in the "approved" `R/images/process/`, in `S/best/MIFTAH-4K/old-installer-lift-4k.jpg`, in the SEO article (`real-installer.jpg`) and probably on brochure p.5 and one-pager side 2. Decision: **EXCLUDE**. Cropping it would be an owner decision, because the rule says remove, not retouch.
2. **`site-winter-orchard-4k.jpg` (winter orchard with folded net) shows a black steel stake/anchor** in the left foreground, next to the galvanized pole. It sits in the root of `S/best/MIFTAH-4K/` (the "usable" folder) and is used as `R/seo-articles/site/img/real-winter-orchard.jpg`, `S/invest/site/img/winter.jpg` and `S/miftah-web/img/winter-orchard.jpg`. Decision: **EXCLUDE**.
3. **`04-tensioning-cables.jpg` has a rusty-brown painted steel ladder** as its main prop. The helper at bottom-left also looks very young (age cannot be confirmed). Decision: **EXCLUDE**. Owner exception possible.
4. Because of 1 and 3, **`process-he-1080p.mp4` contains steps 4 and 5**. The step-5 rusty pole is mostly hidden under the caption gradient, but it is faintly visible. Decision: **RESERVE**. Re-cut it without steps 4 and 5, or with replacement shots.
5. **The real drone reel end card says "ISRAEL · PORTUGAL · AFRICA".** Portugal and Africa do not appear in the confirmed project list, which is Mexico, India, Honduras, Spain and Georgia (`R/globe/README.md`, `R/print-fair-2027/README.md`). The claim must be verified before use.
6. **All the "real" aerial assets (about 40 files) show one and the same net house** (DJI_0024). The client rule forbids repeating it. This registry allows **one video and at most two stills**, on different pages. Everything else from DJI_0024 is RESERVE.
7. `R/images/miftah-logo-reverse.svg` is **not** a recoloured reverse logo: it is the original-colour logo on a white plate, so it complies. Consider renaming it `miftah-logo-on-plate.svg` so nobody mistakes it for a forbidden variant.

---

## 2. Top 15 strongest assets for a premium international B2B website

Ranked by impact × quality × compliance. To respect the no-repeat rule, only #1–#3 come from the single drone net house, and each must sit on a different page.

| # | Asset (master path) | Decision | Why it ranks here |
|---|---|---|---|
| 1 | `S/best/MIFTAH-4K/drone-nethouse-orbit-4k.mp4` | USE | The only real 4K motion asset: a 14 s orbit over a large white net house in hill country. Best homepage hero. |
| 2 | `S/best/MIFTAH-4K/drone-hillside-4k.jpg` | USE | Real aerial with terrain context (rocky hillside, orchards, access roads). It shows scale and site engineering. Use on About or Net Houses, not the homepage. |
| 3 | `S/best/MIFTAH-4K/old-valley-4k.jpg` | USE | A **different** real project: a very large net house in a valley with farmland behind. It breaks the one-net-house monotony and reads well as a section banner. |
| 4 | `S/best/MIFTAH-4K/site-forest-net-4k.jpg` | USE | A third real project: a long net house against a pine forest. Strong "built in difficult terrain" image. |
| 5 | `R/images/process/03-galvanized-poles.jpg` | USE | Rows of bare **galvanized** poles before netting. It is direct visual proof of the galvanized-only standard and an engineering-led image. |
| 6 | `R/images/illustrations/factory-quality-check.jpg` | USE-WITH-LABEL | A premium-looking QA scene (caliper on a galvanized pole, stocked steel). It supports the manufacturing and quality claims. Label it. |
| 7 | `R/images/process/02-marking-pole-lines.jpg` | USE | A real crew abroad marking pole lines with local workers. It supports "local crews, Israeli supervision". |
| 8 | `R/images/illustrations/handover-walk.jpg` | USE-WITH-LABEL | A finished banana net house with galvanized poles and a client walk-through: the "turnkey handover" moment. Label it. |
| 9 | `R/images/illustrations/design-scale-model.jpg` | USE-WITH-LABEL | A whole-farm scale model on a meeting table. It explains the turnkey planning service well. Label it. |
| 10 | `R/images/process/06-closed-net-house.jpg` | USE | A completed real net house side wall and door, ready for planting. It closes the process story. |
| 11 | `R/images/illustrations/site-review-meeting.jpg` | USE-WITH-LABEL | An engineer and grower reviewing a site plan beside galvanized poles. Good for the "Site & feasibility" step. Label it. |
| 12 | `R/seo-articles/site/img/ai-pole-net.jpg` | USE-WITH-LABEL | A striking upward detail of a galvanized pole head with net panels. Good for a product/technology section. Label it. Only 1400 px wide. |
| 13 | `R/images/process/01-setting-up-on-site.jpg` | USE | A real site set-up abroad (site store, water reservoir, crew). It conveys international project logistics. |
| 14 | `R/globe/fly.mp4` (with `R/globe/index.html`) | USE-WITH-LABEL | A distinctive globe-to-site dive for the "Projects worldwide" section: an illustrated first 4.6 s, then real DJI_0024 footage. The player must switch the label from "Illustration" to "Real drone footage". |
| 15 | `S/best/MIFTAH-4K/drone-truck-scale-4k.jpg` | USE | Real aerial with a truck for scale. Use it only if #2 is not on the same page. Best for a "Capacity / scale" stat block. |

The brand logo (`R/images/miftah-logo.svg` plus the on-plate version) is mandatory on every page and is outside the ranking.

---

## 3. Brand assets

| ID | Master file(s) | Type / specs | Depicts | Real/AI | Purpose | Q | Compliance | Placement | Processing | Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| B1 | `R/images/miftah-logo.svg`; also `R/images/miftah-logo-compact.svg`, `R/images/miftah-mark.svg`, `R/seo-articles/tools/logo_light.svg` | SVG vector, ~1.2–1.4 KB | MIFTAH logo, full, compact and mark-only | Original artwork | Brand identity | 5 (vector) | Only `#0E4239` / `#1B6E62` / `#7FC49B` (checked in source) | Header, footer, favicon (mark) | Export the favicon from the mark (32/180/512 px). Optimise with SVGO. | **USE** |
| B2 | `R/images/miftah-logo-reverse.svg`; also `R/seo-articles/tools/logo_dark.svg`, `R/seo-articles/tools/logo_dark_full.svg` | SVG, original colours on a `#FFFFFF` rounded plate | Logo on a white plate for dark backgrounds | Original | Dark sections, video end cards | 5 | Complies (original colours on a white plate, not recoloured) | Dark hero overlay, footer on green | Rename to `*-on-plate.svg` to avoid confusion | **USE** |
| B3 | `R/images/miftah-logo-original.png` | PNG 1213×368, 20 KB | Logo plus English slogan "Where agriculture feels at home" | Original | Raster fallback (email, OG) | 4 | Original colours | OG images, email signature | Prefer the SVG on the web | **USE** |
| B4 | `S/miftah-site/img/mplogo.png`, `mplogo-sm.png`, `mplogo-xsm-white.png`, `mpfav1.png` | PNG 60–327 px | Old 2015 logo (grey/black + lime) | Original (superseded) | None | 2 | Wrong colours; superseded brand | None | None | **EXCLUDE**: not the current logo |

---

## 4. Real drone footage: DJI_0024 family (ONE net house; usable steel)

All of these show the same white net house in hill country with orchards, from `S/drone/DJI_0024.MP4`. Steel is not visible from above; the side edges read white/silver. Location details (village/client) need approval before publishing; see §11. The 4K files are AI-upscaled from 1080p.

| ID | Master file | Type / specs | Depicts | Real/AI | Purpose | Q | Compliance | Placement | Processing | Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| D1 | `S/best/MIFTAH-4K/drone-nethouse-orbit-4k.mp4` | MP4 H.264 3840×2160, 24 fps, 14.0 s, 21.1 Mbps, 36.9 MB, no audio | Slow orbit around the net house; a truck appears on the access road | Real (AI-upscaled from 1080p) | Hero motion, credibility | 5 | Galvanized/white only; no people; no children | **Homepage hero (only place)** | Web encodes: 1920 px H.264 ~5 Mbps and AV1/WebM ~3 Mbps, 1280 px mobile ~2 Mbps; `muted playsinline loop`; poster JPG/AVIF from ~3 s; honour `prefers-reduced-motion` | **USE** |
| D2 | `S/best/MIFTAH-4K/drone-nethouse-reveal-4k.mp4` | H.264 3840×2160, 24 fps, 7.0 s, 19.1 Mbps, 16.7 MB | Low pass revealing the long net-house roof | Real (upscaled) | Alternative hero | 4 | OK | Only if D1 is not used | Same as D1 | **RESERVE**: same net house as D1 |
| D3 | `S/best/MIFTAH-4K/drone-nethouse-wide-4k.mp4` | H.264 3840×2160, 24 fps, 7.0 s, 21.3 Mbps, 18.7 MB | Wide pass of the whole net house | Real (upscaled) | Alternative | 4 | OK | Only as a replacement for D1 | Same as D1 | **RESERVE**: same net house |
| D4 | `S/miftah-web/vid/band-1.mp4` … `band-4.mp4` (+ `.jpg` posters, `bands.jpg`) | H.264 1280×720, 24 fps, ~8 s, 1.1–2.3 Mbps, 1.1–2.3 MB | Four short loops of the same net house | Real | Section background loops (design examples) | 3 (720p) | OK | None (repetition) | None | **RESERVE**: repeats D1 |
| D5 | `S/best/MIFTAH-4K/real-reel-1080p-master.mp4` | H.264 1920×1080, 30 fps, 24.1 s, 18.3 Mbps, 55.2 MB, no audio | Reel: reveal + orbit + wide (all DJI_0024), "From bare land to first harvest" overlay, end card with logo on plate, "The ideal partner.", "ISRAEL · PORTUGAL · AFRICA" | Real footage + graphics | Sales reel | 4 | Logo complies. **End-card country list is unverified** (see Critical finding 5). | Possibly the About page or a trade-fair loop | Fix or verify the end-card text; web encode ~3–5 Mbps | **RESERVE**: fact-check the end card; same net house only |
| D6 | `S/drone/DJI_0024.MP4` | H.264 1920×1080, 23.976 fps, 68.4 s, 36.6 Mbps, 312 MB, no audio | Original drone clip | Real | Source master for all D-assets | 4 | OK | None directly | Archive into the repo or Drive; keep as source | **RESERVE** (source) |
| D7 | `S/best/MIFTAH-4K/drone-hillside-4k.jpg` | JPEG 4096×2304, 2.70 MB | Net house from a distance across rocky hillside, orchards and roads | Real (upscaled from a 1920×1080 frame) | Scale + terrain context | 5 | OK | Net Houses or About page banner (not the homepage if D1 is there) | AVIF/WebP at 2560/1600/960 px; ~250 KB at 1600 px | **USE** (still #1 of the max 2) |
| D8 | `S/best/MIFTAH-4K/drone-truck-scale-4k.jpg` | JPEG 4096×2304, 2.34 MB | Net house with a truck on the access road for scale | Real (upscaled) | "Scale / capacity" | 5 | OK. Truck plate not legible at web size (checked a crop). | Stats/capacity block or Turnkey page (a different page from D7) | Same as D7 | **USE** (still #2 of the max 2) |
| D9 | `S/best/MIFTAH-4K/drone-outline-4k.jpg` | JPEG 4096×2304, 2.01 MB | Net-house outline and its cut corner | Real (upscaled) | Alternative | 4 | OK | None (repetition) | None | **RESERVE**: same net house |
| D10 | `S/best/MIFTAH-4K/drone-roof-hills-4k.jpg` | JPEG 4096×2304, 1.96 MB | Close aerial of the roof with hills behind | Real (upscaled) | Alternative | 4 | OK | None (repetition) | None | **RESERVE**: same net house |

**D-family variants** (same frames at other sizes; do not treat these as separate photos):
- **D1:** `S/best/vid/hero-orbit-4k-raw.mp4` (identical), `S/best/vid/hero-orbit-src.mp4` (1080p 43.6 Mbps source), `S/best/vid/real-nethouse-orbit.mp4` = `S/miftah-web/vid/real-nethouse-orbit.mp4` (2560×1440, 7.0 Mbps, 11.9 MB), `S/invest/site/vid/orbit.mp4` (1280×720, 4.8 MB) + `orbit.jpg`, `S/drone/out/real-nethouse-orbit.mp4` (1600×900) + `.jpg`, `S/miftah-web/vid/real-nethouse-orbit.jpg`.
- **D2:** `S/best/up/u24a_4k.mp4` (identical), `S/best/up/u24a.mp4` (1080p pre-upscale), `S/drone/out/real-nethouse-reveal.mp4` + `.jpg`, `S/best/vid/reveal.jpg`.
- **D3:** `S/best/up/u24b_4k.mp4` (identical), `S/best/up/u24b.mp4`, `S/drone/out/real-nethouse-wide.mp4` + `.jpg`.
- **D7:** `S/best/master/drone-hillside-4k.jpg` (identical), `S/best/4k/drone-hillside.png` (12.9 MB PNG), `S/best/src/drone-hillside.png` (1920×1080 source frame), `S/best/web/drone-hillside.jpg`, `S/best/final/real-hillside.jpg` = `S/miftah-web/img/real-hillside.jpg` (2560×1440), `S/drone/out/real-hillside.jpg`, `R/seo-articles/site/img/real-hillside.jpg` (1400), `S/invest/site/img/hillside.jpg` (1800), `S/best/vid/hillside.jpg`.
- **D8:** `S/best/master/…`, `S/best/4k/drone-truck-scale.png`, `S/best/src/drone-truck-scale.png`, `S/best/web/drone-truck-scale.jpg`, `S/best/final/real-truck-scale.jpg` = `S/miftah-web/img/real-truck-scale.jpg`, `S/drone/out/real-truck-scale.jpg`, `R/seo-articles/site/img/real-truck-scale.jpg`, `S/invest/site/img/scale.jpg`.
- **D9:** `S/best/master/…`, `S/best/4k/drone-outline.png`, `S/best/src/drone-outline.png`, `S/best/web/drone-outline.jpg`, `S/best/final/real-edge.jpg` = `S/miftah-web/img/real-edge.jpg`, `S/drone/out/real-edge.jpg`, `S/invest/site/img/outline.jpg`.
- **D10:** `S/best/master/…`, `S/best/4k/drone-roof-hills.png`, `S/best/src/drone-roof-hills.png`, `S/best/web/drone-roof-hills.jpg`, `S/best/final/real-roof-hills.jpg` = `S/miftah-web/img/real-roof-hills.jpg`, `S/drone/out/real-roof-hills.jpg`, `R/seo-articles/site/img/real-galilee-nethouse.jpg`, `S/invest/site/img/roof.jpg`.

---

## 5. Real drone footage: DJI_0001 family (EXCLUDED: dark-brown poles)

| ID | Files | Type / specs | Depicts | Real/AI | Q | Compliance | Decision |
|---|---|---|---|---|---|---|---|
| X1 | `S/drone/DJI_0001.MP4` (H.264 1920×1080, 23.976 fps, 64.8 s, 36.6 Mbps, 296 MB); `S/best/MIFTAH-4K/_לא-לשימוש-ברזל-שחור/drone-orchard-flythrough-4k.mp4` (=`S/best/up/u01a_4k.mp4`, 4K 10 s); `…/drone-orchard-row-4k.mp4` (=`S/best/up/u01b_4k.mp4`, 4K 6 s); `S/best/up/u01a.mp4`, `u01b.mp4`; `S/best/vid/real-orchard-flythrough.mp4` = `S/miftah-web/vid/real-orchard-flythrough.mp4` (+ `.jpg`); `S/drone/out/real-orchard-flythrough.mp4` (+ `.jpg`) | Video | Low walk/fly-through along an apple-orchard row under a white hail net | Real | 4 | **Dark-brown poles clearly visible** in every sampled frame | **EXCLUDE** |
| X2 | `S/best/MIFTAH-4K/_לא-לשימוש-ברזל-שחור/drone-row-symmetry-4k.jpg` (=`S/best/master/drone-row-symmetry-4k.jpg`), `S/best/4k/drone-row-symmetry.png`, `S/best/src/drone-row-symmetry.png`, `S/best/web/drone-row-symmetry.jpg`, `S/best/final/real-row-symmetry.jpg` = `S/miftah-web/img/real-row-symmetry.jpg`, `S/miftah-web/img/real-row-net.jpg`, `S/miftah-web/img/real-row-poles.jpg`, `S/miftah-web/img/real-grass-row.jpg`, `S/drone/out/real-row-net.jpg`, `real-row-poles.jpg`, `real-grass-row.jpg`, `S/best/MIFTAH-4K/_לא-…/site-real-row-net-4k.jpg`, `S/best/up2/real-row-net.png`, `S/best/up2/src_real-row-net.jpg`, `S/best/rows.jpg`, `S/best/vid/row.jpg` | Stills 1920–4096 px | Symmetric orchard-row frames from DJI_0001 | Real | 4 | Dark-brown poles | **EXCLUDE** |

---

## 6. Real process photos (old site, 2015 uploads; AI-upscaled to 2560 px)

The source mapping is in `R/images/process/README.md`. These are the only real "how we build" images.

| ID | Master file | Type / specs | Depicts | Real/AI | Purpose | Q | Compliance | Placement | Processing | Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | `R/images/process/01-setting-up-on-site.jpg` | JPEG 2549×1769, 0.46 MB | Site set-up abroad: red/white site tents, round water reservoir, car, crew; dry hills behind | Real (from 900×553, upscaled) | Process step 1; international logistics | 3 (hazy, small subjects) | Distant poles read light/galvanized on a crop. People are tiny; no identifiable children. | Process timeline, step 1 | Crop to 16:9 on the reservoir/tents; ≤200 KB at 1600 px | **USE** |
| P2 | `R/images/process/02-marking-pole-lines.jpg` | JPEG 2560×1920, 0.75 MB | MIFTAH supervisor in a hat directing a local crew marking pole lines; a galvanized pole behind | Real (from 900×675, date stamp removed, upscaled) | "Local crews, Israeli supervision" | 3 (snapshot light) but high story value | Adults only. Visible pole is galvanized. | Process step 2; About / "How we work" | Crop 4:3 → 3:2; faces identifiable, so get consent (see §11) | **USE** |
| P3 | `R/images/process/03-galvanized-poles.jpg` | JPEG 2560×1600, 0.68 MB | Long rows of bare galvanized poles with cables, workers far away, hills behind | Real (from 900×560) | Proof of the galvanized-only standard | 4 | **Galvanized (verified on a zoomed crop)** | Process step 3; "Materials / galvanized steel" section | AVIF/WebP; can run full-width | **USE** |
| P4 | `R/images/process/04-tensioning-cables.jpg` | JPEG 2560×2921, 0.47 MB | Worker on a ladder tensioning cables at a galvanized pole head; two helpers below | Real (from 675×774) | Process step 4 | 3 | **Rusty-brown painted steel ladder dominates the lower half. The left helper looks very young (age unverifiable).** | None | Only with owner approval (no retouching) | **EXCLUDE** |
| P5 | `R/images/process/05-spreading-net.jpg` | JPEG 2560×1702, 0.47 MB | Installer in a yellow lift spreading net panels | Real (from 1599×1062) | Process step 5 | 4 (attractive) | **Rusty-brown poles visible at bottom-left (verified on a zoomed crop)** | None | Cropping out the poles would be an owner decision (rule: remove, don't retouch) | **EXCLUDE** |
| P6 | `R/images/process/06-closed-net-house.jpg` | JPEG 2560×1920, 0.58 MB | Finished white net-house side wall with an entrance door, blue sky, fresh soil | Real (from 900×675) | Process step 6 "ready for planting" | 3 (camera shadow in foreground) | Frame and door read white/silver | Process step 6 | Crop off the bottom 15 % (photographer's shadow) | **USE** |
| P7 | `R/images/process/process-he-1080p.mp4` | H.264 1920×1080, 30 fps, 30.4 s, 2.36 Mbps, 8.98 MB, no audio | Six-step slideshow with Hebrew captions and an end card with logo and 04-9854404 | Real photos + graphics | Process explainer | 4 | **Contains P4 (rusty ladder) and P5 (brown pole faintly visible under the gradient).** Hebrew only. | Process page, after a re-cut | Re-cut without steps 4–5 (or with compliant replacements); make an English version; add a poster frame | **RESERVE** |

**P-family variants:**
- **P1:** `S/miftah-site/img/pr5-IMG_0263.jpg` (900×675 original with date stamp), `S/media/sel/p1-arrival.jpg`, `S/media/up4k/p1.png` (4096×2524), `S/miftah-web/img/proc-1.jpg` (1600), `S/invest/site/img/p1.jpg` (1400).
- **P2:** `S/miftah-site/img/IMG_0188.jpg` = `pr5-IMG_0188.jpg` (with date stamp "18/02/2011"), `S/miftah-site/img/h1b.jpg` (265 px), `S/best/up2/src_team-field.jpg` = `S/best/final/team-field.jpg` (900×555 crop), `S/best/up2/team-field.png`, `S/best/MIFTAH-4K/site-team-field-4k.jpg` (4096×2536 crop), `S/miftah-web/img/team-field.jpg`, `S/media/sel/p2-marking.jpg`, `S/media/up4k/p2.png`, `S/miftah-web/img/proc-2.jpg`, `S/invest/site/img/p2.jpg`.
- **P3:** `S/miftah-site/img/pr5-2011-02-20-06.33.38.jpg`, `S/media/sel/p3-poles.jpg`, `S/media/up4k/p3.png`, `S/miftah-web/img/proc-3.jpg`, `S/invest/site/img/p3.jpg`.
- **P4 (excluded):** `S/miftah-site/img/pr5-IMG_0211.jpg`, `S/media/sel/p4-cables.jpg`, `S/media/up4k/p4.png`, `S/miftah-web/img/proc-4.jpg`, `S/invest/site/img/p4.jpg`.
- **P5 (excluded):** `S/miftah-site/img/2.jpg` = `S/best/src/old-installer-lift.jpg`, `S/media/sel/p5-net.jpg`, `S/best/4k/old-installer-lift.png`, `S/best/MIFTAH-4K/old-installer-lift-4k.jpg` = `S/best/master/old-installer-lift-4k.jpg`, `S/best/web/old-installer-lift.jpg` = `S/best/final/install-lift.jpg` = `S/miftah-web/img/install-lift.jpg` (MD5-identical to the process master), `R/seo-articles/site/img/real-installer.jpg`, `S/invest/site/img/p5.jpg`.
- **P6:** `S/miftah-site/img/pr6-reshert1.jpg`, `S/miftah-site/img/s4a.jpg` (1220×484 slider crop), `S/miftah-web/img/white-house.jpg`, `S/media/sel/p6-inside.jpg`, `S/media/up4k/p6.png`, `S/miftah-web/img/proc-6.jpg`, `S/invest/site/img/p6.jpg`.

---

## 7. Other real photos (old site 2015, upscaled masters in `S/best/`)

| ID | Master file | Type / specs | Depicts | Real/AI | Purpose | Q | Compliance | Placement | Processing | Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| O1 | `S/best/MIFTAH-4K/old-valley-4k.jpg` | JPEG 4096×2723, 2.16 MB | Very large net house filling a valley floor, olive groves and farmland behind (a different project from DJI_0024) | Real (from 900×598, upscaled 4.5×) | Second real project; scale | 4 (haze; upscale texture on close inspection) | Steel not discernible (too far); no people | Projects / Net Houses section banner | Light dehaze is allowed (not retouching steel); AVIF 2560/1600 | **USE** |
| O2 | `S/best/MIFTAH-4K/site-forest-net-4k.jpg` | JPEG 4096×2723, 2.03 MB | Long white net house in front of a pine forest, dry field in the foreground (third project) | Real (from 900×598) | Third real project; terrain | 4 | Steel not discernible; no people | Projects grid; "challenging terrain" | Crop the dry foreground to 21:9 for a banner | **USE** |
| O3 | `S/best/MIFTAH-4K/site-winter-orchard-4k.jpg` | JPEG 4096×3072, 2.39 MB | Leafless orchard row in winter, net folded along the cables | Real (from 900×675) | Seasonal net story | 3 | **Black steel stake/anchor in the left foreground (verified on a zoomed crop)** | None | None | **EXCLUDE** |
| O4 | `S/best/MIFTAH-4K/_לא-…/old-orchard-net-4k.jpg` | 4096×2723 | Avocado/orchard edge under an angled net | Real | – | 4 | Dark-brown poles | – | – | **EXCLUDE** |
| O5 | `S/best/MIFTAH-4K/_לא-…/old-banana-perspective-4k.jpg` | 4096×2723 | Banana net house perspective down a road | Real | – | 4 | Brown poles | – | – | **EXCLUDE** |
| O6 | `S/best/MIFTAH-4K/_לא-…/site-climber-4k.jpg` | 3072×4096 | Worker climbing a pole | Real | – | 3 | Dark/brown poles; risky work at height | – | – | **EXCLUDE** |
| O7 | `S/miftah-site/img/s6a.jpg` | 1220×484 | Worker hanging from cables over young crop | Real | – | 2 | Brown poles | – | – | **EXCLUDE** |
| O8 | `S/best/MIFTAH-4K/_לא-…/site-install-net-4k.jpg` | 4096×2723 | Net panels being pulled over rows of poles | Real | – | 3 | Rusty-brown poles | – | – | **EXCLUDE** |
| O9 | `S/best/MIFTAH-4K/_לא-…/site-veg-rows-4k.jpg` | 4096×2737 | Vegetable rows under a net with rolled side nets | Real | – | 3 | Black poles | – | – | **EXCLUDE** |
| O10 | `S/best/MIFTAH-4K/_לא-…/site-world-4k.jpg` | 4096×2850 | Women and **children** laying galvanized pipes | Real | – | 3 | **Children on site** | – | – | **EXCLUDE** |
| O11 | `S/miftah-site/img/pr1-mb6.jpg` | 900×598 | Close-up row of rusty poles | Real | – | 3 | Rusty poles | – | – | **EXCLUDE** |
| O12 | `S/miftah-site/img/pr1-mb7.jpg` | 900×675 | Young banana plants, folded net bag, poles | Real | – | 2 | Brown poles | – | – | **EXCLUDE** |
| O13 | `S/miftah-site/img/pr1-3.jpg` | 1024×680 | Net draped between rows during install | Real | – | 3 | Brown poles (checked on a zoomed crop) | – | – | **EXCLUDE** |
| O14 | `S/miftah-site/img/pr1-4.jpg` | 1024×680 | Net install with a tractor between rows | Real | – | 2 | Brown poles | – | – | **EXCLUDE** |
| O15 | `S/miftah-site/img/pr1-mb3.jpg` (= `p-mb3.jpg`) | 900×598 | Young banana rows under a net | Real | – | 3 | Brown poles | – | – | **EXCLUDE** |
| O16 | `S/miftah-site/img/pr4-m1.jpg` | 900×675 | Young orchard under a net, one pole in the foreground | Real | – | 2 | Brown pole | – | – | **EXCLUDE** |
| O17 | `S/miftah-site/img/pr4-m5.jpg` | 900×675 | Orchard rows with a support system | Real | – | 2 | Dark poles (checked on a zoomed crop) | – | – | **EXCLUDE** |
| O18 | `S/miftah-site/img/pr4-m3.jpg` | JPEG 800×1280, 0.36 MB | Hillside orchard plot at an early stage with anchor cables | Real | Site prep | 2 (low-res, cluttered foreground) | Poles/anchors look grey; nothing dark seen | None for now | Would need heavy cropping | **RESERVE**: low value |
| O19 | `S/miftah-site/img/pr6-6.jpg` | JPEG 1024×683, 0.11 MB | Wide vegetable net-house complex on flat land | Real | Shows a vegetable application | 2 (low-res) | Structure reads light/grey; no people | Possibly a small "applications" tile | Upscale + owner check | **RESERVE**: resolution + owner check |
| O20 | `S/miftah-site/img/pr6-reshet2.jpg` (= `p-reshet2.jpg`) | JPEG 900×598, 0.31 MB | Interior of a net house looking along the poles | Real | Interior / structure | 2 | My crop shows grey galvanized poles, **but the earlier review excluded it as "poles look dark when backlit"** | None until resolved | Owner check (Merav/Yiftach) | **RESERVE**: conflicting steel reading |
| O21 | `S/miftah-site/img/fg.jpg`, `pr3-fg.jpg`, `pr3-gg.jpg`, `pr3-sg.jpg`; `S/miftah-web/img/pool.jpg`, `pool2.jpg` | 800×600 | Swimming pools under blue shade nets | Real | – | 2 | **Civil shading (discontinued)** | – | – | **EXCLUDE** |
| O22 | `S/miftah-site/img/pr3-IMG-20150212-WA0011.jpg` (= `p-IMG-…`), `h2b.jpg`, `s7a.jpg`; `S/miftah-web/img/school.jpg` | 265–1220 px | Red/yellow shade sails over a school building | Real | – | 2 | **Civil shading; school**; blue painted steel | – | – | **EXCLUDE** |
| O23 | `S/miftah-site/img/pr2-projects.jpg` (= `pr3-projects.jpg`), `pr3-5.jpg`, `s2a.jpg`; `S/miftah-web/img/dogs.jpg` | 900–1220 px | Dog-training park under green shade nets | Real | – | 3 | **Civil shading** | – | – | **EXCLUDE** |
| O24 | `S/miftah-site/img/pr2-a.jpg` (= `p-a.jpg`, 3456×2304, Canon EOS Kiss X4, 2016-01-10), `S/miftah-web/img/shed2.jpg`; `S/miftah-site/img/pr2-b.jpg` (= `S/best/src/old-blue-shed.jpg`), `S/best/final/shed.jpg` = `S/miftah-web/img/shed.jpg` | 1800–3456 px | Large blue shade net over a paved yard | Real | – | 4 | **Dark-green painted poles with red/white bases** (checked on a zoomed crop); yard/parking shading | – | – | **EXCLUDE** |
| O25 | `S/media/sel/x-aqua.jpg` | JPEG 3264×2448, 2.64 MB, no EXIF | Aquaculture ponds with paddle-wheel aerators inside a steel-truss greenhouse | Unknown (camera-like, metadata stripped) | Possible "aquaculture structures" capability | 4 | Steel trusses read galvanized; no people | Possibly a capabilities tile | **Confirm it is a MIFTAH project and not a stock or partner image** | **RESERVE**: provenance |

**O-family variants:**
- **O1:** `S/miftah-site/img/pr1-mb1.jpg` = `S/best/src/old-valley.jpg` (900×598), `S/best/master/old-valley-4k.jpg`, `S/best/4k/old-valley.png`, `S/best/web/old-valley.jpg` = `S/best/final/valley.jpg` = `S/miftah-web/img/valley.jpg`, `R/seo-articles/site/img/real-valley.jpg`, `S/invest/site/img/valley.jpg`.
- **O2:** `S/miftah-site/img/pr1-mb2.jpg`, `S/miftah-site/img/s8a.jpg` (1220×484), `S/best/up2/src_forest-net.jpg`, `S/best/up2/forest-net.png`, `S/miftah-web/img/forest-net.jpg`, `S/miftah-web/img/valley-wide.jpg` (1220×484 crop), `R/seo-articles/site/img/real-forest-nethouse.jpg`, `S/invest/site/img/forest.jpg`.
- **O3 (excluded):** `S/miftah-site/img/pr4-m4.jpg`, `S/best/up2/src_winter-orchard.jpg`, `S/best/up2/winter-orchard.png`, `S/miftah-web/img/winter-orchard.jpg`, `R/seo-articles/site/img/real-winter-orchard.jpg`, `S/invest/site/img/winter.jpg`. **These are currently live in the SEO article and the investor page; replace them there.**
- **O4 (excluded):** `S/miftah-site/img/pr4-m2.jpg` = `p-m2.jpg` = `S/best/src/old-orchard-net.jpg`, `S/miftah-site/img/s1a.jpg`, `S/best/master/old-orchard-net-4k.jpg`, `S/best/4k/old-orchard-net.png`, `S/best/web/old-orchard-net.jpg` = `S/best/final/orchard-net.jpg` = `S/miftah-web/img/orchard-net.jpg`, `S/miftah-web/img/orchard-wide.jpg`, `S/best/up2/src_orchard-wide.jpg`, `S/best/up2/ow-pad.jpg/.png`, `S/best/MIFTAH-4K/_לא-…/site-orchard-wide-4k.jpg`.
- **O5 (excluded):** `S/miftah-site/img/pr1-mb4.jpg` = `S/best/src/old-banana-perspective.jpg`, `S/miftah-site/img/h3b.jpg`, `S/best/master/…`, `S/best/4k/…png`, `S/best/web/old-banana-perspective.jpg` = `S/best/final/banana-net.jpg` = `S/miftah-web/img/banana-net.jpg`.
- **O6 (excluded):** `S/miftah-site/img/pr1-mb5.jpg`, `s5a.jpg`, `S/best/up2/src_climber.jpg`, `S/best/up2/climber.png`, `S/miftah-web/img/climber.jpg`.
- **O8 (excluded):** `S/miftah-site/img/1.jpg`, `S/best/up2/src_install-net.jpg`, `S/best/up2/install-net.png`, `S/miftah-web/img/install-net.jpg`.
- **O9 (excluded):** `S/miftah-site/img/pr6-7.jpg`, `S/best/up2/src_veg-rows.jpg`, `S/best/up2/veg-rows.png`, `S/miftah-web/img/veg-rows.jpg`.
- **O10 (excluded):** `S/miftah-site/img/p-world.jpg` = `pr5-world.jpg`, `pr5-w1.jpg` (vertical, children), `S/best/up2/src_world.jpg`, `S/best/up2/world.png`, `S/miftah-web/img/world.jpg`.
- **O11 (excluded):** `S/miftah-site/img/s3a.jpg`, `S/miftah-web/img/poles.jpg`.
- **O12 (excluded):** `S/miftah-web/img/banana-young.jpg`.
- **O13 (excluded):** `S/miftah-web/img/net-drape.jpg`.

---

## 8. Scanned testimonial letters (old site)

| ID | File | Specs | Content | Decision |
|---|---|---|---|---|
| T1 | `S/miftah-site/img/saar1.jpg` | JPEG 640×626 | Recommendation letter from the orchard manager of Kibbutz Sa'ar (Yanai Shif). It praises professionalism, precision and Yiftach Haspel. Agricultural. | **RESERVE**: a text source for a testimonial. Do not publish the scan (low-res; it shows a signature). Needs the signer's consent, consent to an English translation, and owner approval. |
| T2 | `S/miftah-site/img/hanita2.jpg` | 685×611 | Thank-you letter from Kibbutz Hanita for shading and covering sports courts and a swimming pool | **EXCLUDE**: civil shading |
| T3 | `S/miftah-site/img/maayanot2.jpg` | 633×513 | Recommendation from Maayanot school for school shading (2015) | **EXCLUDE**: civil shading / school |
| T4 | `S/miftah-site/img/yehiam.jpg` | 600×604 | Letter about shade sails in Yehiam kindergartens | **EXCLUDE**: civil shading / children's facility |

Note: the brochure and investor page name Yehiam as a client (`R/print-fair-2027/README.md`, Q3). This letter is about kindergarten shading, so check that any "Yehiam" reference on the B2B site is an agricultural project.

---

## 9. AI-generated images and video (Higgsfield): every one needs the visible label "Illustration / הדמיה"

All of these were checked visually: steel is drawn silver/galvanized, and there are no children or civil shading. **None may be captioned as a real project, client or location.**

| ID | Master file | Specs | Depicts | Purpose | Q | Compliance | Placement | Processing | Decision |
|---|---|---|---|---|---|---|---|---|---|
| A1 | `R/images/illustrations/site-review-meeting.jpg` | JPEG 2048×1360, 0.62 MB | Engineer and grower with a site plan on a car bonnet; galvanized poles behind | "Site & feasibility" step | 4 | Galvanized | Partnership process step 2 | Label overlay; WebP 1600 | **USE-WITH-LABEL** |
| A2 | `R/images/illustrations/design-scale-model.jpg` | 2048×1360, 0.72 MB | Scale model of a whole farm (net houses, agricultural reservoir, buildings) on a meeting table | "Design & planning" | 4 | OK (agricultural reservoir, not a pool) | Turnkey page | Label | **USE-WITH-LABEL** |
| A3 | `R/images/illustrations/factory-quality-check.jpg` | 2048×1360, 0.70 MB | Worker in hi-vis measuring a galvanized pole with a caliper; stocked steel and wire | QA / manufacturing | 5 | Galvanized | Quality / materials section | Label | **USE-WITH-LABEL** |
| A4 | `R/images/illustrations/handover-walk.jpg` | 2048×1360, 0.76 MB | Two people walking a finished banana net house with galvanized poles | Handover / operate | 4 | Galvanized | Turnkey "handover" step | Label | **USE-WITH-LABEL** |
| A5 | `R/seo-articles/site/img/ai-pole-net.jpg` | 1400×788, 0.25 MB | Upward view of a galvanized pole head with radiating net panels against a blue sky | Product / technology detail | 4 (impactful; 1400 px only) | Galvanized | Technology section, half-width | Label; regenerate at ≥2400 px for full-width use | **USE-WITH-LABEL** |
| A6 | `R/seo-articles/site/img/anatomy-render.jpg` | 1400×792, 0.20 MB | 3D cut-away render of a net house on a soil block (poles, anchors, net) | Explains the structure | 4 | Galvanized | "Anatomy of a net house" explainer | Label; add callouts | **USE-WITH-LABEL** |
| A7 | `R/seo-articles/site/img/hail-macro.jpg` | 1400×792, 0.24 MB | Hailstones caught in a white net above red apples, storm sky | Hail-protection benefit | 4 | No steel issue | Hail-net page | Label | **USE-WITH-LABEL** |
| A8 | `S/miftah-web/img/apple-hail.jpg` | 2400×1361, 0.64 MB | Apple orchard under dark anti-hail net at sunrise with mountains and mist | Hail-net mood image | 4 | Posts silver; black **net** is fine (not steel) | Hail-net page hero (labelled) | Label | **USE-WITH-LABEL** |
| A9 | `R/seo-articles/site/img/apple-row-galv.jpg` | 1400×792, 0.37 MB | Apple row under a net with galvanized poles | Orchard application | 4 | Galvanized | Applications grid | Label | **USE-WITH-LABEL** |
| A10 | `R/seo-articles/site/img/cover-avocado.jpg` | 1600×800, 0.41 MB | Avocado row under a white net, galvanized poles, warm light | Avocado application | 4 | Galvanized | Applications grid | Label | **USE-WITH-LABEL** |
| A11 | `R/seo-articles/site/img/avocado-frost.jpg` | 1400×792, 0.32 MB | Split scene: frosted field outside vs. protected avocado inside a net | Frost-protection benefit | 3 (split composite) | Galvanized | Benefits section | Label | **USE-WITH-LABEL** |
| A12 | `R/seo-articles/site/img/cover-bananot.jpg` | 1600×800, 0.33 MB | Banana net house interior perspective, galvanized poles | Banana application | 4 | Galvanized | Applications grid | Label | **USE-WITH-LABEL** |
| A13 | `R/seo-articles/site/img/ai-banana-nethouse.jpg` | 1400×792, 0.25 MB | Another banana net-house perspective (near-identical concept to A12) | – | 4 | Galvanized | None (repeats A12) | – | **RESERVE**: duplicate concept |
| A14 | `R/seo-articles/site/img/ai-manufacturing.jpg` | 1400×782, 0.22 MB | Warehouse with galvanized profiles, net rolls and cable reels | Supply / logistics | 3 | Galvanized | Procurement & logistics step | Label | **USE-WITH-LABEL** |
| A15 | `R/seo-articles/site/img/loading-shed-galv.jpg` | 1400×792, 0.24 MB | Galvanized truss loading shed; a truck loaded by forklift | Agricultural structures (packing/loading) | 4 | Galvanized | "Agricultural structures" section | Label | **USE-WITH-LABEL** |
| A16 | `R/seo-articles/site/img/turnkey-before.jpg` + `turnkey-after.jpg`; video `R/seo-articles/site/vid/turnkey-transform.mp4` (H.264 1280×724, 24 fps, 6.5 s, 2.0 Mbps, 1.66 MB, no audio) | 1400×792 each | Bare hills at sunset → a complete farm with net houses, agricultural reservoir and buildings | Turnkey transformation story | 4 | OK | Turnkey page (before/after slider or video) | Label on both frames **and** in the video; poster | **USE-WITH-LABEL** |
| A17 | `R/seo-articles/site/img/cover-turnkey.jpg` | 1600×800, 0.39 MB | Aerial of a large net-house farm with reservoir and buildings at sunset | Turnkey hero | 4 | OK | Turnkey page header (labelled) | Label | **USE-WITH-LABEL** |
| A18 | `R/seo-articles/site/img/cover-beit-reshet.jpg`; video `R/seo-articles/site/vid/hub-hero.mp4` (1280×724, 5.0 s, 2.0 Mbps, 1.26 MB) | 1600×800 | **The real DJI_0024 net house re-lit by AI to sunset** | Hub hero | 4 | AI-altered real project, so there is a risk of passing it off as real, and it repeats the one net house | None on the main site | If ever used, label it and do not name the site | **RESERVE** |
| A19 | `S/invest/site/img/ai-estate.jpg` | 1600×679, 0.26 MB | Large farm estate with rows of structures at golden hour | Investor "scale" mood | 3 | No issue visible | Investor page (labelled) | Label | **USE-WITH-LABEL** |
| A20 | `S/invest/site/img/ai-plan.jpg` | 1600×893, 0.13 MB | Engineering drawing on a desk, net house seen through the window | Engineering/design | 3 | Galvanized | Design step | Label | **USE-WITH-LABEL** |
| A21 | `S/miftah-web/img/planting.jpg` | 2400×1340, 0.51 MB | Close-up of hands planting a seedling next to a drip line | Planting/operate step | 4 | No steel | Operate step | Label. **Confirm it is Higgsfield and not stock** (same 2400 px generator size as A8). | **USE-WITH-LABEL** |
| A22 | `S/miftah-web/img/kiwi.jpg` | 2400×1357, 0.89 MB | Kiwi pergola with fruit | – | 4 | **Dark wooden/brown poles** | None | – | **EXCLUDE** |

**A-family variants:**
- **A1–A4:** `S/invest/site/img/w3-sitemeeting.jpg`, `w1-model.jpg`, `w2-factory.jpg`, `w4-handover.jpg` (1400×930 each).
- **A5:** `S/miftah-web/img/g-pole.jpg` (identical), `S/invest/site/img/ai-pole.jpg` (1200×1200 crop).
- **A7:** `R/seo-articles/site/img/cover-barad.jpg` (1600×800), `cover-barad-og.jpg` (1200×630), `cover-barad-thumb.jpg` (800×450).
- **A8:** `R/seo-articles/site/img/ai-apple-hailnet.jpg` (1400), `S/invest/site/img/ai-apple.jpg` (1600).
- **A9:** `S/miftah-web/img/g-orchard.jpg` (identical).
- **A10:** `S/miftah-web/img/g-avocado.jpg` (identical), `R/seo-articles/site/img/cover-avocado-og.jpg`, `cover-avocado-thumb.jpg`.
- **A12:** `S/miftah-web/img/g-banana.jpg` (identical), `cover-bananot-og.jpg`, `cover-bananot-thumb.jpg`.
- **A13:** `S/miftah-web/img/banana2.jpg` (identical), `S/invest/site/img/ai-banana.jpg` (1600).
- **A14:** `S/invest/site/img/ai-factory.jpg` (1600).
- **A15:** `S/miftah-web/img/g-shed.jpg` (identical).
- **A16:** `S/miftah-web/img/farm-after.jpg` (= turnkey-after).
- **A17:** `cover-turnkey-og.jpg`, `cover-turnkey-thumb.jpg`.
- **A18:** `cover-beit-reshet-og.jpg`, `cover-beit-reshet-thumb.jpg`.

---

## 10. Interactive, composite and print assets

| ID | Master file | Specs | Depicts | Real/AI | Purpose | Q | Compliance | Placement | Processing | Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| I1 | `R/globe/index.html` (+ `script.src.js`) with background `R/globe/space.jpg` (JPEG 2688×1520, 0.11 MB) | Three.js r128 WebGL globe | Project globe: area beams for Mexico, India, Honduras, Spain, Georgia and Israel; starfield background | Data real; `space.jpg` AI | "Projects worldwide" | 4 | Background is an illustration (label it in the credit line); country data per the questionnaire | Projects section | Lazy-load; static fallback image for no-WebGL; reduce motion | **USE-WITH-LABEL** |
| I2 | `R/globe/fly.mp4` (H.264 1920×1080, 30 fps, 9.1 s, 6.0 Mbps, 6.79 MB, no audio) + poster `R/globe/fly.jpg` | Video | Globe zoom-in → illustrated cloud dive (0–4.6 s, Kling) → crossfade into real DJI_0024 footage | **Hybrid** AI + real | Transition from the globe to a site | 4 | The label must switch at 4.8 s (player overlay, not burned in). It repeats the DJI_0024 net house, so it cannot appear on the same page as D1, D7 or D8. | Projects page only | Keep the time-based label; 720p mobile encode | **USE-WITH-LABEL** |
| I3 | `R/build-sim/index.html` | Three.js scroll story, 10 chapters | Illustrated net-house build sequence, galvanized steel drawn silver, "Illustration" on screen | AI/3D illustration | "How a net house goes up" | 4 | Complies per its README; **Merav must still confirm the stage order and structure** | Process page (after approval) | Performance pass; mobile test | **USE-WITH-LABEL** (pending Merav) |
| PR1 | `R/print-fair-2027/MIFTAH-brochure-A4-8p.pdf` | PDF, 8 pp, 15.2 MB | Investor brochure (Fruit Logistica 2027) | Mixed | Downloadable brochure | 4 | **p.5 and p.4 use process photos incl. P4/P5. Check them against the new exclusions.** Client names need approval. | "Download brochure" after fixes | Compress to <5 MB for the web | **RESERVE** |
| PR2 | `R/print-fair-2027/MIFTAH-onepager-A4-2sided.pdf` | PDF, 2 pp, 5.97 MB | One-pager | Mixed | Leave-behind download | 4 | Side 2 has a process-photo grid incl. P4/P5; check it | Download after fixes | Compress | **RESERVE** |
| PR3 | `R/print-fair-2027/MIFTAH-rollup-85x200.pdf` | PDF, 1 p, 2.11 MB | Roll-up banner | Mixed | Print only | 4 | Uses a DJI_0024 aerial | Not on the web | – | **RESERVE** (print) |
| PR4 | `R/print-fair-2027/MIFTAH-business-cards-85x55.pdf` | PDF, 4 pp, 61 KB | Business cards (Merav, Yiftach) | – | Print only | – | Contains personal QR vCards | Not on the web | – | **RESERVE** (print) |
| PR5 | `R/print-fair-2027/mockups/mockup-brochure-cards.jpg`, `mockup-rollup-fair.jpg` | JPEG 2048×1360, 0.71 / 0.44 MB | Brochure/cards on a desk; roll-up at a trade fair | AI mock-up scene | Sales/presentation | 4 | The fair hall is illustrated, so it must not imply real attendance | Possibly a "Meet us at Fruit Logistica" block, after the stand is confirmed | Label | **RESERVE** |

---

## 11. Working files (not website media)

**W1: EXCLUDE as non-publishable working files.** These are intermediate or internal and must not ship:
- **Comparison sheets and screenshots:** `S/best/compare.jpg`, `S/best/map.jpg`, `S/best/rows.jpg`, `S/best/rr.jpg`, `rr_3.jpg`, `rr_12.jpg`, `rr_30.jpg`, `S/best/s-v2.jpg`, `s-v3.jpg`, `s-v4.jpg`, `S/best/tf_bottom.jpg`, `S/best/vid/vcmp.jpg`, `S/best/vid/hillside.jpg`, `reveal.jpg`, `row.jpg`, `S/best/up2/cmp2.jpg`, `S/media/up4k/zoom100.jpg`.
- **Test renders:** `S/best/vid/test2s.mp4`, `test2s-4k.mp4` (2 s DJI_0024 tests).
- **Globe build files:** `S/globe3/a-*.png`, `f-*.png`, `s-d-*.png`, `s-m-1.png`, `a-grid.jpg` (page screenshots), `S/globe3/space.png` / `space_prev.jpg` / `il_mask.png`. `S/globe3/fly.*` and `space.jpg` are MD5-identical to `R/globe/`.
- **Fly-through build files:** `S/fly/kling.mp4` (raw Kling clip 1920×1080, 5.0 s, 30.5 Mbps, **has an audio track**), `S/fly/tail.mp4`, `S/fly/start.jpg/.png`, `S/fly/end.jpg`, `S/fly/sheet.jpg`, `S/fly/kf/`, `S/fly/smp/` (138 PNG frames). `S/fly/fly.mp4` and `fly.jpg` are identical to `R/globe/`.
- **Drone frame dumps:** `S/drone/f_DJI_0001/`, `S/drone/f_DJI_0024/`, `S/drone/cand/`, `S/drone/scan/`, `S/drone/*_sheet.jpg`, `S/drone/cand_sheet.jpg` (~367 JPGs).
- **Upscale intermediates:** `S/best/4k/*.png`, `S/best/up2/*.png`, `S/media/up4k/*.png`. The JPEG masters are listed in their groups above.

---

## 12. Rights, approvals and open questions (must be resolved before publishing)

1. **Project names and locations.** Per the questionnaire, **Yiftach and the client must approve before any project details are published**: names, villages, crop, area, photos tied to a named client. This covers Bar'am (the globe's exact point), Alrom, Yehiam, Metzuba, Hanita, and the DJI_0024 site. Until then, caption real photos generically (e.g. "Net house, Northern Israel" or "Project abroad").
2. **Drone footage rights.** DJI_0001/0024 came from a Google Drive folder shared by liorhoresh85. Confirm who shot it, that MIFTAH holds the right to use it commercially and internationally, and whether the operator needs a credit.
3. **Old-site photos (2015).** The photographers are unknown. Confirm the photos belong to MIFTAH, or get a licence for the 4–6 real photos chosen.
4. **People in photos.** P1, P2 and P3 show identifiable workers (P2 shows faces clearly). Ask the owners whether worker consent exists for international marketing use; if unsure, prefer crops without faces.
5. **AI licensing.** Confirm the Higgsfield account plan allows commercial use of the generated images and videos (A1–A21, I1 background, I2 first 4.6 s, PR5).
6. **AI-upscaled "real" photos.** They are real, but upscaled 2–4.5×. Suggestion: add a footnote or alt-text note, e.g. "archive photo, enhanced", for full transparency with technical buyers.
7. **Reel end card (D5): "ISRAEL · PORTUGAL · AFRICA".** This is not consistent with the documented countries. Verify it or replace it.
8. **Testimonial (T1, Kibbutz Sa'ar).** Get consent to quote the letter, and its English translation.
9. **Conflicting steel readings to settle with Merav/Yiftach.** O20 interior (pr6-reshet2) looked galvanized in this audit but was excluded earlier. P5 (lift photo) is attractive and compliant except for its bottom-left corner: a crop is possible only if the owners explicitly allow it.
10. **x-aqua (O25).** Is this an aquaculture project by MIFTAH? If yes, it opens a new capability story; if not, drop it.
11. **Live assets to replace now:** the winter-orchard photo (O3) and the installer-lift photo (P5) are in `R/seo-articles/site/img/` (`real-winter-orchard.jpg`, `real-installer.jpg`), in `S/invest/site/img/` (`winter.jpg`, `p5.jpg`), and probably in brochure p.5 and the one-pager.

---

## 13. Processing standards for the build (applies to all USE / USE-WITH-LABEL)

- **Stills:** export AVIF + WebP + JPEG fallback at 2560 / 1600 / 960 / 480 px widths via `srcset`. Targets: ≤350 KB at 2560 px, ≤200 KB at 1600 px. Strip EXIF/GPS.
- **Hero video (D1):** use 1920×1080 H.264 High (CRF ~22, ~5 Mbps) and AV1/WebM (~3 Mbps), with a 1280×720 mobile version under 3 MB. Settings: `muted autoplay loop playsinline`, `preload="metadata"`, an AVIF/JPEG poster, and a still fallback for `prefers-reduced-motion`. There is no audio track, so no captions are needed. Add `aria-label` and a text description.
- **Process video (P7, after re-cut):** burned-in captions in both English and Hebrew, plus a poster frame.
- **Labels:** every A-asset and I1–I3 carries a visible corner tag "Illustration" (EN) / "הדמיה" (HE), and also says so in the alt text. Real photos may carry "Real project photo" / "צילום אמיתי".
- **Repetition rule:** the DJI_0024 net house appears at most in D1 (homepage), D7 (one page), D8 (another page) and I2 (Projects). Never two of these on the same page.
- **Logo:** only B1–B3. On dark sections use B2 (white plate). Never recolour.

## Change, 30 October 2026 (growth audit, round 3)
An independent design check looked at the two archive photos at full size:
- **P1 / `p-site`** shows a large rust-coloured round steel reservoir at the right. The client's rule allows only galvanized steel in images. The site now uses a 4:3 crop that ends left of the reservoir (`src/tools/images.py`: crop 0–73.75% of the width, from 20.35% of the height).
- **P2 / `p-marking`**: the left-most local worker may be under 18, and the client's rule excludes children. The site now uses a 4:3 crop without the two left-hand workers (from 33.75% of the width). The date-stamp patch near the bottom right is still visible at full size.

The masters in `media-src/` and `images/process/` are unchanged. To be confirmed with Yiftach: the workers' ages, the reservoir's material, and consent for identifiable faces (§11).
