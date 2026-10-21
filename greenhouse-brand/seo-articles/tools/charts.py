"""גרפים כ-SVG נגיש: role=img, title/desc, טבלת נתונים מתקפלת ושורת מקור. מימין לשמאל."""
import html

PAL = ["var(--leaf)", "var(--amber)", "var(--sky)", "var(--sprout)"]


def _e(s):
    return html.escape(str(s), quote=True)


def _fmt(v, unit=""):
    s = f"{v:g}"
    return f"{s}{unit}"


def _table(head, rows):
    th = "".join(f"<th>{_e(h)}</th>" for h in head)
    tr = "".join("<tr>" + "".join(f"<td>{_e(c)}</td>" for c in r) + "</tr>" for r in rows)
    return f'<details><summary>הנתונים בטבלה</summary><div class="tbl"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div></details>'


def hbar(cid, title, sub, rows, unit="", vmax=None, source="", note="", series=None):
    """rows: [(label, value)] או, עם series, [(label, [v1, v2])]. פסים אופקיים שגדלים משמאל לימין מתחת לתווית מימין."""
    multi = series is not None
    vals = [v for _, vs in rows for v in (vs if multi else [vs])]
    vmax = vmax or max(vals) * 1.12
    W, label_w, pad = 720, 230, 14
    bar_h = 22 if multi else 26
    group_gap = 18
    n_s = len(series) if multi else 1
    row_h = n_s * bar_h + (n_s - 1) * 4 + group_gap
    top = 34 if multi else 10
    H = top + len(rows) * row_h + 26
    x0, x1 = 20, W - label_w  # אזור הפסים
    scale = (x1 - x0) / vmax
    parts = []
    # קווי רשת
    ticks = _ticks(vmax)
    for t in ticks:
        x = x1 - t * scale
        parts.append(f'<line class="grid" x1="{x:.1f}" x2="{x:.1f}" y1="{top - 4}" y2="{H - 22}" stroke-width="1"/>')
        parts.append(f'<text x="{x:.1f}" y="{H - 6}" text-anchor="middle">{_fmt(t)}</text>')
    if multi:
        lx = W - 10
        for i, s in enumerate(series):
            parts.append(f'<rect x="{lx - 14}" y="6" width="14" height="14" rx="2" fill="{PAL[i]}"/>')
            parts.append(f'<text x="{lx - 22}" y="18" text-anchor="end">{_e(s)}</text>')
            lx -= 34 + 9 * len(s)
    y = top
    for label, v in rows:
        vs = v if multi else [v]
        gh = n_s * bar_h + (n_s - 1) * 4
        parts.append(f'<text x="{W - 4}" y="{y + gh / 2 + 5:.1f}" text-anchor="end" style="font-weight:700">{_e(label)}</text>')
        for i, val in enumerate(vs):
            w = val * scale
            by = y + i * (bar_h + 4)
            parts.append(f'<rect x="{x1 - w:.1f}" y="{by}" width="{w:.1f}" height="{bar_h}" rx="2" fill="{PAL[i]}"/>')
            tx = x1 - w - 6
            parts.append(f'<text class="v" x="{tx:.1f}" y="{by + bar_h / 2 + 5:.1f}" text-anchor="end">{_fmt(val, unit)}</text>')
        y += row_h
    svg = (f'<svg viewBox="0 0 {W} {H}" role="img" aria-labelledby="{cid}-t {cid}-d"><title id="{cid}-t">{_e(title)}</title>'
           f'<desc id="{cid}-d">{_e(sub)}</desc>{"".join(parts)}</svg>')
    if multi:
        table = _table(["", *series], [[l, *[_fmt(x, unit) for x in v]] for l, v in rows])
    else:
        table = _table(["", "ערך"], [[l, _fmt(v, unit)] for l, v in rows])
    src = f'<figcaption>{note + " " if note else ""}מקור: {source}</figcaption>' if source else ""
    return f'<figure class="viz" id="{cid}"><div class="frame"><h4>{_e(title)}</h4><p class="sub">{_e(sub)}</p>{svg}{table}</div>{src}</figure>'


def _ticks(vmax):
    for step in (1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000):
        if vmax / step <= 6:
            break
    t, out = 0, []
    while t <= vmax * 0.999:
        out.append(t)
        t += step
    return out


def line(cid, title, sub, xs, ys_series, series, unit="", source="", note="", vmin=0, vmax=None):
    """גרף קו פשוט; ציר x משמאל לימין (שנים)."""
    W, H, L, R, T, B = 720, 300, 56, 20, 36, 34
    allv = [v for ys in ys_series for v in ys if v is not None]
    vmax = vmax or max(allv) * 1.1
    sx = lambda i: L + i * (W - L - R) / (len(xs) - 1)
    sy = lambda v: H - B - (v - vmin) * (H - T - B) / (vmax - vmin)
    p = []
    for t in _ticks(vmax - vmin):
        v = vmin + t
        p.append(f'<line class="grid" x1="{L}" x2="{W - R}" y1="{sy(v):.1f}" y2="{sy(v):.1f}"/><text x="{L - 8}" y="{sy(v) + 4:.1f}" text-anchor="end">{_fmt(v)}</text>')
    for i, x in enumerate(xs):
        if len(xs) <= 12 or i % 2 == 0 or i == len(xs) - 1:
            p.append(f'<text x="{sx(i):.1f}" y="{H - 10}" text-anchor="middle">{_e(x)}</text>')
    for k, ys in enumerate(ys_series):
        pts = [(sx(i), sy(v)) for i, v in enumerate(ys) if v is not None]
        d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
        if k == 0:
            area = d + f" L{pts[-1][0]:.1f} {H - B} L{pts[0][0]:.1f} {H - B}Z"
            p.append(f'<path d="{area}" fill="{PAL[k]}" opacity=".12"/>')
        p.append(f'<path d="{d}" fill="none" stroke="{PAL[k]}" stroke-width="3" stroke-linejoin="round"/>')
        lx, ly = pts[-1]
        p.append(f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="5" fill="{PAL[k]}"/>')
        p.append(f'<text class="v" x="{lx - 8:.1f}" y="{ly - 10:.1f}" text-anchor="end">{_fmt(ys[-1], unit)}</text>')
        fx, fy = pts[0]
        p.append(f'<text class="v" x="{fx + 6:.1f}" y="{fy - 10:.1f}" text-anchor="start">{_fmt(ys[0], unit)}</text>')
    lx = W - R
    if len(series) > 1:
        for k, s in enumerate(series):
            p.append(f'<rect x="{lx - 14}" y="6" width="14" height="14" rx="2" fill="{PAL[k]}"/><text x="{lx - 22}" y="18" text-anchor="end">{_e(s)}</text>')
            lx -= 40 + 9 * len(s)
    svg = (f'<svg viewBox="0 0 {W} {H}" role="img" aria-labelledby="{cid}-t {cid}-d"><title id="{cid}-t">{_e(title)}</title>'
           f'<desc id="{cid}-d">{_e(sub)}</desc>{"".join(p)}</svg>')
    table = _table(["", *series], [[x, *[("" if ys[i] is None else _fmt(ys[i], unit)) for ys in ys_series]] for i, x in enumerate(xs)])
    src = f'<figcaption>{note + " " if note else ""}מקור: {source}</figcaption>' if source else ""
    return f'<figure class="viz" id="{cid}"><div class="frame"><h4>{_e(title)}</h4><p class="sub">{_e(sub)}</p>{svg}{table}</div>{src}</figure>'
