# MIFTAH design system

Direction: "Engineering dossier, shot on site." See MIFTAH_CREATIVE_DIRECTION.md for the reasoning.
The tokens live in `src/assets/site.css` under `:root`. This file explains them.

## Colour

| Token | Hex | Source | Use | Contrast (measured, WCAG 2.1) |
|---|---|---|---|---|
| `--forest` | #0E4239 | Logo dark green | Headings, dark sections, footer | 10.3:1 on paper; white on it 11.3:1 |
| `--canopy` | #1B6E62 | Logo mid green | Links, primary buttons on light, line work | 5.54:1 on paper; white on it 6.08:1 |
| `--mint` | #7FC49B | Logo light green | The net in the drawing; primary button on dark (forest text 5.53:1); accents on dark | Mint on forest 5.53:1 |
| `--paper` | #F2F5F3 | Cool off-white chosen to sit with the net's white; deliberately not a warm cream | Page background | |
| `--white` | #FFFFFF | | Raised surfaces: facts row, drawing, form, alternating sections | |
| `--ink` | #102722 | | Body text | 14.33:1 on paper |
| `--ink-2` | #4B605B | | Secondary text | 6.12:1 on paper, 6.72:1 on white |
| `--steel` | #C7D0D1 | Galvanized steel | Decorative rules only (1.43:1, never carries meaning) | |
| `--line` | #D8E0DD | | Dividers | |
| `--field` | #718580 | | Form control borders | 3.56:1 on paper (≥ 3:1 for UI components) |
| `--error` | #B42318 | | Error text and borders | 6.57:1 on white |

No other hues. There is no yellow, no gradient decoration, and no tinted-black backgrounds. The only gradient is the scrim that makes hero text readable over video.

## Typography

One family across both scripts: **IBM Plex Sans** for Latin and **IBM Plex Sans Hebrew** for Hebrew, under the single family name `Plex` with `unicode-range`. **IBM Plex Mono** is used only where content is data: numbers on the drawing, step numbers, m² figures on the map, table figures.

- **Why:** IBM designed Plex as an engineering family, and its Hebrew was drawn to match the Latin. A bilingual page reads as one voice, which fits a steel manufacturer. It is not the default Inter or Heebo.
- **Hosting:** self-hosted WOFF2, 152 KB in total; Latin is one variable file. Licence: SIL Open Font License 1.1.
- **Fallback:** for Hebrew, `Plex Fallback` (local Arial or Liberation Sans) with `size-adjust` 90% (regular) and 85% (bold), measured against Plex. This took Hebrew mobile CLS from 0.171 to 0.02.

| Role | Size | Weight | Line height |
|---|---|---|---|
| Hero H1 | clamp(2.25rem, 5.4vw, 4.375rem) | 700 | 1.12 (1.2 in Hebrew) |
| Page H1 | clamp(2.125rem, 5vw, 4rem) | 700 | 1.12 |
| Section H2 | clamp(1.75rem, 3.2vw, 2.625rem) | 700 | 1.12 |
| H3 | clamp(1.1875rem, 1.6vw, 1.375rem) | 700 | 1.3 |
| Lead | clamp(1.125rem, 1.6vw, 1.3125rem) | 400 | 1.55 |
| Body | 1.0625rem (17 px) | 400 | 1.6 |
| Small, captions | 0.875rem | 400 | |
| Statement (the client's own words) | clamp(1.375rem, 2.6vw, 2rem) | 500 | 1.35 |
| Buttons, navigation | 1rem | 600 / 500 | |
| Data | Plex Mono 0.875rem | 500 | tabular figures |

Text is limited to about 66 characters per line (`.measure`, `.lead`). Headlines use `text-wrap: balance`.

Deliberately avoided:
- all-caps labels
- tracked eyebrows above sections
- a single accented word in a headline
- mono text used as decoration
- `→` appended to links

## Layout and spacing

| Token | Value |
|---|---|
| `--max` (content width) | 1240 px |
| `--gutter` | clamp(16px, 3.2vw, 40px) (16 px at 360–500 px wide; safe-area aware) |
| `--section` (vertical rhythm) | clamp(56px, 8vw, 112px); `.tight` uses 66% |
| `.split` | 5/12 + 7/12 columns, single column under 900 px |
| `--radius` | 3 px on buttons and inputs only (the precision of a fabricated part). Images and sections are square. There are no cards. |
| Buttons | Minimum height 48 px (44 px in the header) |
| Choice tiles | Whole tile is clickable, about 60 px tall |

Breakpoints are content-led:

| Width | Change |
|---|---|
| 1020 px | Navigation collapses to the menu button |
| 960 / 900 / 860 px | Grids drop to 2 columns, then 1 |
| 760 px | Drawing labels give way to the legend |
| 720 px | Hero switches to the portrait video and poster |
| 480 px | Header tightens |

Tested at 360, 390, 430, 768, 1024, 1440 and 1920 px.

## Structure as information (no decorative devices)

- **Numbered markers appear only on real sequences:** the four process steps (01–04), the 11 farm stages, and the drawing callouts (1–6), which match the legend.
- **Thick rules mark beginnings:** a 4 px forest rule tops each route, each person and each step group.
- **Hairlines are used only in tables, the facts row and the footer title block.**
- **The footer title block** (document, revision, office, scale) is the one deliberate nod to engineering drawings. It is marked `aria-hidden` because it repeats information found elsewhere.

## Signature elements

1. **The net-house section drawing** (SVG, generated in `build.py`).
   - Six numbered callouts, each backed by a verified fact.
   - It draws itself once (ground, poles, cables, net, crop, labels) the first time it is seen, over about 2.5 s.
   - It is static under reduced motion.
   - It appears on Home and on Net houses, and nowhere else, so it stays meaningful.
2. **The flat projects map.** Natural Earth land in an Equal Earth projection, with dashed arcs from Kfar Masaryk and markers sized by √m² where an area is published. It appears on Home and on Projects.

## Motion

| What | When | Reduced motion |
|---|---|---|
| Hero video loop | Starts after the page `load` event | Never starts; the poster is shown and a play button is offered |
| Drawing build | Once, at 35% visibility | Shown complete, no animation |
| Hover and focus | Colour changes only (0.15 s) | Same |

There are no scroll-triggered fades on sections, no parallax, no counters and no scroll hijacking.

## Components

The table lists the class names in `site.css`.

| Component | Class |
|---|---|
| Header with menu | `.site-head`, `.nav`, `.menu-btn` |
| Hero | `.hero`, `.hero-media`, `.vid-btn` |
| Facts row (used once) | `.facts` |
| Routes | `.routes`, `.route` |
| Drawing and legend | `.drawing`, `.legend` |
| Steps | `.steps` |
| Photo series | `.series` |
| Map | `.map` |
| Tables | `.tbl` |
| Structure types | `.type` |
| Farm stages | `.phases`, `.phase` |
| Notice | `.notice` |
| People and values | `.people`, `.values` |
| Statement | `.statement` |
| CTA band | `.cta-band` |
| Form | `.form`, `.field`, `.choice`, `.check`, `.form-status` |
| Aside | `.aside` |
| Prose | `.prose` |
| Footer | `.site-foot`, `.titleblock` |
| Print profile | `.sheet` |

## Right-to-left

- **Direction and layout:** `dir="rtl"` is set on `<html>`, and spacing uses logical properties throughout (`inset-inline`, `padding-inline`, `border-inline-start`).
- **Mirroring:** the hero scrim mirrors for Hebrew. The drawing and the map keep their geography, with the label anchors adjusted.
- **Numbers inside Hebrew:** number ranges are wrapped in Unicode isolates (LRI/PDI) automatically at build time, so "10%–30%" keeps its order. Phone numbers sit in `<bdi>` and don't break across lines.

## Logo

- The measured SVG of the original logo, generated by `greenhouse-brand/tools/build.py`, is used in the original colours only.
- On the dark footer it sits on a white plate (`.plate`), never as a recoloured version.
