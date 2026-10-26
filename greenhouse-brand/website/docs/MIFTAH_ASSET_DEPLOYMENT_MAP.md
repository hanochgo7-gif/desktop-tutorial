# MIFTAH asset deployment map

Where each asset from MIFTAH_ASSET_REGISTRY.md sits on the website, why, and how it behaves.
The masters are copied into the repo at `website/media-src/` so the site no longer depends on the temporary session folder. Built files are in `website/public/assets/`.

## Rules applied (truth ledger §6, registry §1)

- **Real photos and footage only.** The 22 USE-WITH-LABEL AI assets are not used on the website (Creative direction: both reviewers said labelled illustrations next to project claims undermine trust in the real ones). They remain available for print and social, with their label.
- **DJI_0024, the single drone net house, appears once as video (home hero) and once as a still (Projects).** That is within the registry limit of 1 video + 2 stills, on different pages. The social preview image is a frame of the same clip, but it is never shown on a page.
- **No image repeats within a page.** Checked page by page in the table below.
- **Captions never name a place or crop that isn't confirmed** (truth ledger O2, O8).

## Placement by page

| Page | Asset (built name → master) | What it communicates | Buyer question it answers | Crop / position | Mobile | Label, fallback |
|---|---|---|---|---|---|---|
| **Home: hero** | `video/hero-wide.mp4/.webm` (1600×900), `hero-720.*`, `hero-portrait.*` (720×960) ← DJI_0024 32–44 s | A real MIFTAH net house at real scale, with a truck in frame for reference | "Is this a real company that builds big things?" | Wide: full frame, text on a left scrim (right scrim in Hebrew). Portrait: centre crop on the net house. | Portrait clip and poster under 720 px wide; 720p on screens up to 1100 px | Caption "Drone footage of a net house built by MIFTAH". Poster AVIF/WebP/JPEG is the LCP image. No video with reduced motion. Pause button. H.264 with WebM fallback. Button hides if the video fails to load. |
| Home: drawing | Generated SVG (`build.py: drawing()`) | What the structure is made of: net %, cables, galvanized poles, anchoring, trellising, folding | "What exactly do you build?" | Full width, 1260×520 viewBox | Labels hidden under 760 px; the numbered legend below carries the text | `<title>`/`<desc>` give the full text equivalent. Draws once, not under reduced motion. Caption "Schematic, not to scale". |
| Home: process | `p-site`, `p-marking`, `p-poles`, `p-closed` (640/1024/1600, AVIF/WebP/JPEG) ← `images/process/01, 02, 03, 06` | One real photo per process step | "Do you actually do the work on site, abroad too?" | 4:3, `object-fit: cover` | Two columns down to 320 px; one column below that | Note "Photos from MIFTAH project sites" (no location, because it isn't confirmed) |
| Home: map | Generated SVG (Natural Earth land, Equal Earth projection) | 7 countries abroad, areas where published, all from Kfar Masaryk | "Have you worked far from Israel, at my scale?" | Window lon −122…96, lat −8…62 | m² values hidden under 640 px; names enlarged | `aria-label` plus the table on Projects |
| **Net houses** | `valley` ← `MIFTAH-4K/old-valley-4k.jpg`; `forest` ← `site-forest-net-4k.jpg` | Two different real net houses, neither of them the hero one | "Do you have more than one project?" | 3:2 originals, shown 4:3 | Stacked | Captions without crop names (the crop is not confirmed), so they sit in a separate photo band and are not tied to a crop row |
| Net houses | Drawing (static) + the same 4 process photos | Parts and process | As above | Drawing in the right column | Stacked | As above |
| **Turnkey farms** | `valley` | The structures at the core of a farm are what MIFTAH builds | "Can they deliver the physical farm?" | Right column | Stacked | Caption as above. No AI farm render. |
| **Projects** | Map; `hillside` ← `MIFTAH-4K/drone-hillside-4k.jpg` (the DJI_0024 still); `forest`; `p-closed` | Scale, landscape, a finished structure | "Show me the work" | `hillside` 21:9 band, 4:3 on mobile; the other two 4:3 side by side | Stacked | Captions without place names |
| **About** | `p-poles` | The plant's product in the field (galvanized poles) | "Is the steel what they say?" | Right column | Stacked | Caption "Rows of galvanized steel poles, set to the design" |
| All pages | `miftah-logo` compact SVG (header), full SVG on a white plate (footer), favicon set, `qr-site.svg` (profile) | Brand | | | | Logo colours only `#0E4239` / `#1B6E62` / `#7FC49B` |
| Social | `img/og-miftah.jpg` 1200×630 ← hero frame | Link previews | | | | |

Pages checked for repeats:

| Page | Images on the page | Repeats |
|---|---|---|
| Home | hero, 4 process photos | none |
| Net houses | valley, forest, 4 process photos | none |
| Turnkey farms | valley | none |
| Projects | hillside, forest, p-closed | none |
| About | p-poles | none |

## Considered and not used

| Asset | Registry decision | Why it is not on the site |
|---|---|---|
| `images/process/04-tensioning-cables.jpg` | EXCLUDE | Brown painted steel ladder; possibly a minor in frame |
| `images/process/05-spreading-net.jpg` | EXCLUDE | Rusty-brown poles (verified on a zoomed crop) |
| `MIFTAH-4K/site-winter-orchard-4k.jpg` | EXCLUDE | Black steel stake in the foreground |
| `images/process/process-he-1080p.mp4` | RESERVE | Contains steps 4 and 5 |
| DJI_0001 (all cuts) | EXCLUDE | Dark brown poles |
| Other DJI_0024 stills and clips (~40 files) | RESERVE | Same net house as the hero |
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
