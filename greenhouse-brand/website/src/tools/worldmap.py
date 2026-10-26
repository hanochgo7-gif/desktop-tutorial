"""Flat world map for the Projects section: Natural Earth land (world-atlas land-50m, public domain),
Equal Earth projection, cropped to the band where MIFTAH works, simplified to keep the SVG light.
Writes src/data/worldmap.json: {"w","h","d" (path), "proj": params} and is used by build.py for marker positions."""
import json, math
from pathlib import Path

H = Path(__file__).resolve().parents[1]
A1, A2, A3, A4 = 1.340264, -0.081106, 0.000893, 0.003796
M = math.sqrt(3) / 2


def ee(lon, lat):
    p = math.radians(lat); l = math.radians(lon)
    t = math.asin(M * math.sin(p)); t2 = t * t; t6 = t2 * t2 * t2
    x = l * math.cos(t) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)))
    y = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))
    return x, y


# crop window (lon/lat) and output size
LON0, LON1, LAT0, LAT1 = -122, 112, -8, 62
X0, _ = ee(LON0, 0); X1, _ = ee(LON1, 0)
_, Y1 = ee(0, LAT1); _, Y0 = ee(0, LAT0)
W = 1000
S = W / (X1 - X0)
HGT = round((Y1 - Y0) * S)


def px(lon, lat):
    x, y = ee(lon, lat)
    return (x - X0) * S, (Y1 - y) * S


def clip(pts, x0, x1, y0, y1):
    def edge(poly, inside, cut):
        out = []
        for i in range(len(poly)):
            a, b = poly[i - 1], poly[i]
            ia, ib = inside(a), inside(b)
            if ib:
                if not ia: out.append(cut(a, b))
                out.append(b)
            elif ia:
                out.append(cut(a, b))
        return out
    def at_x(x): return lambda a, b: (x, a[1] + (b[1] - a[1]) * (x - a[0]) / ((b[0] - a[0]) or 1e-12))
    def at_y(y): return lambda a, b: (a[0] + (b[0] - a[0]) * (y - a[1]) / ((b[1] - a[1]) or 1e-12), y)
    for inside, cut in ((lambda p: p[0] >= x0, at_x(x0)), (lambda p: p[0] <= x1, at_x(x1)), (lambda p: p[1] >= y0, at_y(y0)), (lambda p: p[1] <= y1, at_y(y1))):
        if not pts: break
        pts = edge(pts, inside, cut)
    return pts


def dp(pts, eps):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; n = math.hypot(dx, dy) or 1e-9
    i, dmax = 0, 0
    for k in range(1, len(pts) - 1):
        d = abs(dy * pts[k][0] - dx * pts[k][1] + x2 * y1 - y2 * x1) / n
        if d > dmax: i, dmax = k, d
    if dmax > eps:
        return dp(pts[:i + 1], eps)[:-1] + dp(pts[i:], eps)
    return [pts[0], pts[-1]]


def main():
    d = json.loads((H / "data/land-50m.json").read_text())
    sx, sy = d["transform"]["scale"]; tx, ty = d["transform"]["translate"]
    arcs = []
    for a in d["arcs"]:
        x = y = 0; pts = []
        for ddx, ddy in a:
            x += ddx; y += ddy; pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(idx):
        out = []
        for i in idx:
            pts = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(pts if not out else pts[1:])
        return out

    parts = []
    for g in d["objects"]["land"]["geometries"]:
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        for poly in polys:
            for r in poly:
                pts = ring(r)
                lons = [p[0] for p in pts]
                if max(lons) - min(lons) > 300:  # Afro-Eurasia crosses the antimeridian (Chukotka): unwrap east
                    pts = [(lo + 360 if lo < -100 else lo, la) for lo, la in pts]
                lons = [p[0] for p in pts]; lats = [p[1] for p in pts]
                if max(lons) < LON0 or min(lons) > LON1 or max(lats) < LAT0 or min(lats) > LAT1: continue
                # clip to the lon/lat window (Sutherland-Hodgman), then project
                pts = clip(pts, LON0 - 1, LON1 + 1, LAT0 - 1, LAT1 + 1)
                if len(pts) < 4: continue
                q = [px(lo, la) for lo, la in pts]
                m = len(q) // 2
                q = dp(q[:m + 1], .55)[:-1] + dp(q[m:], .55)  # a closed ring needs two open halves
                if len(q) < 4: continue
                xs = [p[0] for p in q]; ys = [p[1] for p in q]
                if (max(xs) - min(xs)) * (max(ys) - min(ys)) < 6: continue
                parts.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in q) + "Z")
    out = {"w": W, "h": HGT, "d": "".join(parts),
           "proj": {"lon0": LON0, "lon1": LON1, "lat0": LAT0, "lat1": LAT1}}
    (H / "data/worldmap.json").write_text(json.dumps(out))
    print("map", W, HGT, len(out["d"]) // 1024, "KB path,", len(parts), "rings")


if __name__ == "__main__":
    main()
