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

## Real Earth (12 Nov 2026)
The dot continents gave way to a photoreal Earth (the dot data is still built, not drawn):
- `tex/earth-day.jpg`, `tex/earth-night.jpg`, `tex/earth-water.jpg`, `tex/earth-topo.jpg`: NASA Blue Marble / Black Marble / water mask / topography (public domain; via the three-globe example images). Day and night with a sun direction, sun glint on water, relief shading.
- `tex/israel.jpg`: Sentinel-2 cloudless 2016 by EOX (Copernicus data, CC BY 4.0, credit shown in the globe note), lat 27–36.5, lon 30.5–40.5, equirectangular; blended over the Blue Marble when zoomed on Israel.
- `tex/clouds.jpg`: cloud cover generated with Higgsfield (GPT Image 2.5), thinned and made seamless in code; a slowly turning layer that fades when zooming on Israel.
- `space.jpg`: Milky Way background generated with Higgsfield (also the embed background).
