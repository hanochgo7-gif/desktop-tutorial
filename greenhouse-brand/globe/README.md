# MIFTAH project globe (3D, WebGL)

Interactive globe of MIFTAH projects for the future site. Three.js r128 (cdnjs), no other dependencies.

- `index.html`: the built page (land data inlined). Open next to `space.jpg`, `fly.mp4`, `fly.jpg`. `#compact` shows the globe only (for embedding).
- `script.src.js`: readable source of the globe script (placeholders `{{LANDBITS}}`, `{{ILBITS}}` are filled at build).

## Data
- Land: Natural Earth land-50m (world-atlas). 11,196 dots on a Fibonacci sphere; a dense layer (0.06°) around Israel appears only in the zoom.
- Projects: only facts from the old site and the owners' questionnaire. m² abroad: Mexico 150,000 · India 80,000 · Honduras 70,000 · Spain 60,000 · Georgia 50,000 (total 410,000). Beam height follows area.
- Yellow point = country/region level; green = exact village (Bar'am). Cherries have no location yet, so no point.

## Media
- `space.jpg`: background generated with Higgsfield (illustration).
- `fly.mp4` (9.1 s, 1080p): 0–4.6 s illustrated dive (Higgsfield Kling, start frame = this globe, end frame = real drone still), crossfade into real DJI_0024 footage from 55.0 s. The player shows "הדמיה" / "צילום רחפן אמיתי" according to the time (switch at 4.8 s).
