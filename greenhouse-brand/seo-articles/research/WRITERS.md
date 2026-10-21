# Writer handbook (read fully before writing)

Shared folder: /tmp/claude-0/-home-user-desktop-tutorial/b123b69e-b646-5436-91f8-b8abb5efcf73/scratchpad/seo
Read: brief.md (hard rules + verified company facts), strategy.md (your article's brief: keywords, H1, outline, FAQ, visuals, sources), social-cro.md (trust architecture, CTA, voice guardrails), data.md (sourced statistics; may appear while you work — check it, it is the data researcher's file).

## Output
Write ONE Python file: articles/aN.py that defines `A = {...}` (N = your article number). It may `import charts as C` (charts.py is on the path when built). Build and preview with:
  cd <shared folder> && python3 build.py   → writes site/<slug>.html
Then screenshot-check is done by the editor; you only need the build to succeed and the HTML to be valid.

## A = {
 "slug": one of beit-reshet | beit-reshet-bananot | reshet-neged-barad | beit-reshet-avocado | chava-haklait-turnkey,
 "cat": short Hebrew category label (e.g. "מדריך יסוד · בתי רשת"),
 "h1": the chosen H1 (Hebrew),
 "dek": 1–2 sentence subtitle that hooks (Hebrew),
 "meta_title": ≤60 chars, "meta_desc": ≤155 chars,
 "kw": primary keyword, "kw2": [secondary keywords],
 "date": "2026-10-21", "date_he": "21 באוקטובר 2026", "read": minutes (int, ~230 words/min),
 "cover": "cover-XXX.jpg", "thumb": "cover-XXX-thumb.jpg", "cover_alt": Hebrew alt, "cover_cap": Hebrew caption (cover is an AI illustration; the template adds the "הדמיה" tag automatically),
 "card": 1-sentence teaser for cards,
 "body": HTML string (see components),
 "faq": [(question, answer_html), ...] 5–7 items,
 "sources": ["<a href=URL>Title</a>, publisher, year", ...]  — numbered; cite in text as <sup><a href="#ref3">3</a></sup>,
 "cta": {"h": heading, "p": text, "ph": size placeholder, "crop": crop placeholder, "where": location placeholder, "btn": button label}
}

## Body components (use these exact classes; no inline styles)
- Opening "בקצרה" box first: <div class="lead-box"><b class="lbl">בקצרה</b><ul><li>…</li></ul></div>
- Headings: <h2>…</h2> (auto-numbered into the table of contents), <h3>…</h3>. No h1 in body.
- Fit box: <div class="box fit"><b class="lbl">למי המדריך הזה</b><div class="cols"><div><h4>מתאים לכם אם</h4><ul>…</ul></div><div><h4>פחות מתאים אם</h4><ul>…</ul></div></div></div>
- Field proof: <div class="box field"><b class="lbl">מהשטח</b><p>…</p></div>
- Honesty: <div class="box honest"><b class="lbl">מה חשוב לדעת מראש</b><p>…</p></div>
- Testimonial (verbatim only, from brief): <blockquote class="testi"><p>„…”</p><footer>רפי הלל · מטע ברעם</footer></blockquote>
- Table: <div class="tbl"><table><thead><tr><th>…</th></tr></thead><tbody><tr><td>…</td><td class="num">₪10,400</td></tr></tbody></table></div>
- Process: <ol class="steps"><li><span><b>כותרת השלב</b>הסבר קצר</span></li>…</ol>  (one <span> child per li)
- Checklist: <ul class="check"><li>…</li></ul>
- Soft CTA mid-article: <p class="soft-cta">… <a href="#contact">…</a></p>
- Photo/illustration: <figure class="photo"><img src="img/NAME.jpg" alt="Hebrew alt" loading="lazy" width="1400" height="788"><figcaption>…</figcaption></figure>
  For AI illustrations start the caption with <span class="tag-ai">הדמיה</span>. For real photos end the caption with "צילום: ארכיון מיפתח" (do NOT claim which specific project a drone photo shows).
- Charts (Python): C.hbar(cid, title, subtitle, rows, unit="", source="<a href=…>…</a>", note="", series=None) and C.line(cid, title, subtitle, xs, [ys...], series=[...], unit="", source=...). rows=[("label", value)] or with series=[("label",[v1,v2])]. Values must be exactly as sourced. Concatenate the returned HTML into body.
- Internal links between articles: href="beit-reshet.html", "beit-reshet-bananot.html", "reshet-neged-barad.html", "beit-reshet-avocado.html", "chava-haklait-turnkey.html". Link to the pillar in the first 200 words (cluster articles).

## Available images (site/img/) — 1400px wide, 16:9 unless noted
AI illustrations: anatomy-render.jpg (isometric cutaway of one net-house bay: concrete footings, galvanized poles, guy cables + ground screw anchors, roof cable grid, white net partly pulled back, trees under), banana-wind.jpg (outside: palms bending in dust storm; inside the net house: banana plants calm), hail-macro.jpg (hailstones resting on white anti-hail net, red apples safe below), avocado-frost.jpg (dawn: frost on open field left, healthy young avocado under dense net right), turnkey-before.jpg (empty plot, Portugal-like hills, cork oaks, dirt track), cover-turnkey.jpg can serve as "after".
Real photos (company archive): real-galilee-nethouse.jpg (aerial: huge net house in Galilee hills), real-hillside.jpg (aerial: net house edge on hillside), real-truck-scale.jpg (aerial: net house with truck for scale), real-orchard-row.jpg (inside: orchard row under net, symmetric), real-banana-avenue.jpg (inside a banana net house, long avenue), real-installer.jpg (installer on lift platform spreading net), real-install-net.jpg (crew spreading net over a banana net house, poles), real-orchard-net.jpg (orchard trees under white net, blue sky), real-valley.jpg (aerial valley with large white net houses), real-winter-orchard.jpg (bare winter apple orchard, net folded along cables), real-climber.jpg (portrait 3:4: worker climbing a pole at height), real-world.jpg (white net house blocks among forest hills).
Use 3–5 images per article, at least 2 real photos.

## Writing rules
- Native, premium Hebrew. Calm authority, specific, short sentences. No hype words (הכי, מהפכני, הטוב ביותר), no clickbait, no emoji, no em-dash-heavy style.
- Every number: a source from strategy.md / data.md with URL, cited <sup>. If you cannot source it, write qualitatively.
- Company facts ONLY from brief.md. Never invent prices, durations, project sizes, client names, years beyond "יותר מעשרים שנה".
- Never claim MIFTAH handles licensing/permits or ongoing owner reporting. Civil shading is discontinued — never mention.
- Testimonials verbatim, ≤2 per article, placed right after the claim they support.
- Include: בקצרה box, fit box, ≥1 table, ≥1 chart (with real sourced data) , process steps, field-proof box, honesty box, soft CTA, FAQ, sources. Target length per strategy.md.
- Price questions: answer with the Ministry "עלות מוכרת" (grant-calculation figure, not a quote) + why a site visit is needed. Never a MIFTAH price.
- Use consistent terms: בית רשת, רשת נגד ברד, רשת הצללה, רשת נגד חרקים, אחוז הצללה, סככת העמסה, שובר רוח, הדליה בצורת סוכה, פרויקט Turnkey.
