# MIFTAH asset deployment map

Where each asset from MIFTAH_ASSET_REGISTRY.md sits on the website, why, and how it behaves.
The masters are copied into the repo at `website/media-src/` so the site no longer depends on the temporary session folder. Built files are in `website/public/assets/`.

## Rules applied (truth ledger §6, registry §1)

- **Real photos and footage only.** The 22 USE-WITH-LABEL AI assets are not used on the website (Creative direction: both reviewers said labelled illustrations next to project claims undermine trust in the real ones). They remain available for print and social, with their label.
- **DJI_0024, the single drone net house, appears once as video (home hero) and once as a still (Projects).** That is within the registry limit of 1 video + 2 stills, on different pages. The social preview image is a frame of the same clip, but it is never shown on a page.
- **No image repeats within a page.** Checked page by page in the table below.
- **Captions never name a place or crop that isn't confirmed** (truth ledger O2, O8).

## Placement by page (after review cycle 2)

| Page | Asset (built name → master) | What it communicates | Buyer question it answers | Crop / position | Mobile | Label, fallback |
|---|---|---|---|---|---|---|
| **Home: hero** | `video/hero-wide.mp4/.webm` (1600×900), `hero-720.*`, `hero-portrait.*` (720×960) ← DJI_0024 32–44 s | A real MIFTAH net house at real scale, with a truck for reference | "Is this a real company that builds big things?" | Wide: full frame with a left scrim (right in Hebrew). Portrait: centre crop on the net house, scrim kept off the top 26%. | Portrait clip and poster under 720 px wide; 720p up to 1100 px | Caption "Drone footage of a net house built by MIFTAH". AVIF/WebP/JPEG poster is the LCP image. No video with reduced motion. Pause button. H.264 with WebM fallback. |
| Home: process | `p-site`, `p-marking`, `p-poles`, `p-closed` ← `images/process/01, 02, 03, 06` | One real photo per step, merged with the step text, so it is told once | "Do you actually do the work on site?" | 4:3, `object-fit: cover`, subtle shared grade (`img.archive`) | 2 columns under 960 px, 1 under 560 px | Captions describe only what is visible ("Galvanized poles from our plant, set out on site to the design") |
| Net houses: process | Steps as text only, then one full-width band of `p-poles` (21:9; 4:3 on phones) | The scale of the pole field, once | "Is it really your steel?" | 21:9 | 4:3 | Caption + archive label. Changed in cycle 2 so the four step photos are not repeated from Home. |
| Home and Net houses: drawing | Generated SVG | The parts of the structure, with verified data | "What exactly do you build?" | 1260×570 | A second SVG under 760 px: two bays, numbered callouts, legend below (no scroll) | `<title>` and `<desc>` on both |
| Home and Projects: map | Generated SVG (Natural Earth, Equal Earth) | 7 countries abroad, with published areas | "Have you worked far away, at scale?" | lon −122…112, edges faded | Two stacked panels under 720 px (Americas; Europe to India), no scroll | `aria-label` plus the table |
| **Net houses: page head** | `forest` ← `MIFTAH-4K/site-forest-net-4k.jpg` | A real net house that is not the hero one | | 4:3, right column | Stacked | "…built by MIFTAH. MIFTAH archive." |
| **Turnkey farms: page head** | `valley` ← `MIFTAH-4K/old-valley-4k.jpg` | The scale of structure at the core of a farm | "Can they deliver the physical farm?" | 4:3, right column | Stacked | Same archive label |
| **Projects** | `p-closed`, `p-site` (two-up) | A finished structure and a site at the start | "Show me the work" | 4:3 | Stacked | Archive label. Cycle 2: `valley` and `forest` moved out, since they already head Turnkey and Net houses. |
| **About** | `p-marking` under "How we work" | A MIFTAH crew marking out a site | "Who actually does the work?" | 4:3 | Stacked | Archive label. No portraits available yet (release checklist). |
| All pages | Compact logo SVG (header, and on a white plate in the footer), favicon set, `qr-site.svg` (profile) | Brand | | | | Logo colours only |
| Social | `img/og-miftah.jpg` 1200×630 ← hero frame | Link previews | | | | |

Cap per photo: at most two pages, never twice on one page.

| Photo | Pages |
|---|---|
| `p-site` | Home, Projects |
| `p-marking` | Home, About |
| `p-poles` | Home, Net houses |
| `p-closed` | Home, Projects |
| `forest` | Net houses |
| `valley` | Turnkey farms |
| DJI_0024 net house | Home (video only) |

## Considered and not used

| Asset | Registry decision | Why it is not on the site |
|---|---|---|
| `images/process/04-tensioning-cables.jpg` | EXCLUDE | Brown painted steel ladder; possibly a minor in frame |
| `images/process/05-spreading-net.jpg` | EXCLUDE | Rusty-brown poles (verified on a zoomed crop) |
| `MIFTAH-4K/site-winter-orchard-4k.jpg` | EXCLUDE | Black steel stake in the foreground |
| `images/process/process-he-1080p.mp4` | RESERVE | Contains steps 4 and 5 |
| DJI_0001 (all cuts) | EXCLUDE | Dark brown poles |
| Other DJI_0024 stills and clips (~40 files), including `drone-hillside-4k.jpg` | RESERVE | Same net house as the hero |
| `images/illustrations/*` (4), Higgsfield images, `globe/fly.mp4` | USE-WITH-LABEL | Creative decision: no AI imagery on the website |
| 3D globe, 3D build simulation | (prototypes) | Replaced by the SVG map and the SVG drawing: lighter, accessible, all markets visible |
| Old-site testimonial letters | EXCLUDE / needs approval | Civil-shading jobs or no approval (truth ledger O4) |
| `site-team-field-4k.jpg` | Same photo as `02-marking` | Duplicate |

## Media budget (measured)

| Item | Size |
|---|---|
| Hero video, desktop (`hero-wide.mp4`) | 2.98 MB |
| Hero video, tablet (`hero-720.mp4`) | 2.61 MB |
| Hero video, phone (`hero-portrait.mp4`) | 1.74 MB |
| WebM fallbacks | 4.06 / 2.57 / 1.66 MB |
| Hero poster | 52 KB (960 AVIF) to 126 KB (1600 AVIF) |
| Fonts | 152 KB in total |

The video loads only after the page `load` event, and never with reduced motion. Lighthouse mobile LCP is 2.0 s on Home.

## Before launch (owner actions)

- **Consent:** identifiable workers in `p-site` and `p-marking` need consent (registry, open rights).
- **Drone footage rights:** confirm commercial rights for the DJI_0024 footage from the Drive owner.
- **Old-site photos:** confirm the 2015 photos are MIFTAH's own.
- **Upgrade later:** a professional shoot (plant, crews, finished orchards) would replace the 2015 archive photos.

## Added 27 Oct 2026 (owner's request: "add everything")

| Page | Asset | Notes |
|---|---|---|
| How a net house is built | Generated 3D scene (three.js), `sim-poster.jpg` / `sim-poster-m.jpg` (stills of the same scene) | Labelled "Illustration / הדמיה" on screen; all steel drawn galvanized silver; sizes not a specification |
| Projects, and `/globe/` | The 3D globe, `globe-poster-en/he.jpg`, `globe/space.jpg` (Higgsfield background), `globe/fly.mp4` (0–4.6 s AI dive, then real DJI_0024) | The player labels the AI part "הדמיה" and the real part "צילום רחפן אמיתי". This reverses the earlier "no AI imagery on the website" decision, at the owner's request. |

