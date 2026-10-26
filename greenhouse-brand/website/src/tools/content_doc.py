"""Writes docs/MIFTAH_CONTENT_MASTER.md from content.py, so the document can't drift from the live copy."""
import sys
from pathlib import Path

H = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(H))
import content as C  # noqa: E402

OUT = H.parent / "docs/MIFTAH_CONTENT_MASTER.md"


def row(k, v):
    if isinstance(v, tuple) and len(v) == 2 and all(isinstance(x, str) for x in v):
        return f"| `{k}` | {v[0]} | {v[1]} |"
    return None


def main():
    L = ["# MIFTAH content master", "",
         "All website copy in English and Hebrew. Generated from `src/content.py` by `src/tools/content_doc.py`, so this document always matches the live site.",
         "To change the copy, edit `content.py`, then run `python3 src/build.py` and this script.",
         "", "## Rules", "",
         "- Every claim traces to `MIFTAH_TRUTH_LEDGER.md`. The ledger numbers are in comments in `content.py`.",
         "- Voice: entrepreneurial, family and personal (Q q34). Plain verbs (design, make, build, maintain). No superlatives, no yield or ROI promises, no unapproved client names or testimonials.",
         "- Terminology: see the glossary in `MIFTAH_POSITIONING.md` (Q q35).",
         "- English is reviewed by a native speaker before launch (Q q37: a family member who is an English teacher).", ""]
    L += ["## Site-wide", "", "| Key | English | Hebrew |", "|---|---|---|"]
    L += [r for k, v in C.SITE.items() if (r := row(k, v))]
    L += ["", "## Navigation", "", "| Slug | English | Hebrew |", "|---|---|---|"] + [f"| {s} | {e} | {h} |" for s, e, h in C.NAV]
    for slug, P in C.PAGES.items():
        L += ["", f"## Page: {slug}", "", "| Key | English | Hebrew |", "|---|---|---|"]
        L += [r for k, v in P.items() if (r := row(k, v))]
    L += ["", "## Key facts row (home)", "", "| Figure | English | Hebrew |", "|---|---|---|"] + [f"| {a[0]} / {a[1]} | {b[0]} | {b[1]} |" for a, b in C.FACTS]
    L += ["", "## Process steps", "", "| Step | English | Hebrew | Photo caption (EN) |", "|---|---|---|---|"] + [f"| {h[0]} / {h[1]} | {p[0]} | {p[1]} | {c[0]} |" for _, h, p, c in C.STEPS]
    L += ["", "## Section drawing", "", "| Part | English | Hebrew |", "|---|---|---|"] + [f"| {a[0]} / {a[1]} | {b[0]} | {b[1]} |" for a, b in C.DRAWING["items"]]
    L += ["", "## Structure types (Net houses page)", ""]
    for ty in C.TYPES:
        L += [f"### {ty['h'][0]} / {ty['h'][1]}", "", f"Crops: {ty['crops'][0]} / {ty['crops'][1]}", "", "| | English | Hebrew |", "|---|---|---|"] + [f"| {a[0]} | {b[0]} | {b[1]} |" for a, b in ty["rows"]] + [""]
    L += ["## Turnkey stages", "", "| # | Phase | Stage | What you receive (EN) | What you receive (HE) |", "|---|---|---|---|---|"]
    n = 0
    for ph, items in C.STAGES:
        for title, rec in items:
            n += 1
            L.append(f"| {n} | {ph[0]} | {title[0]} / {title[1]} | {rec[0]} | {rec[1]} |")
    L += ["", "## Projects", "", "| Country | Work | m² |", "|---|---|---|"] + [f"| {e} / {h} | {w[0]} | {a or '–'} |" for e, h, w, a in C.PROJECT_ROWS]
    L += ["", "Featured (Q q14):", "", "| Crop | Region | Structure |", "|---|---|---|"] + [f"| {c[0]} | {r[0]} | {w[0]} |" for c, r, w in C.FEATURED]
    L += ["", "## Values (Q q23)", "", "| English | Hebrew |", "|---|---|"] + [f"| **{a[0]}**: {b[0]} | **{a[1]}**: {b[1]} |" for a, b in C.VALUES]
    L += ["", "## CTA band", "", "| Key | English | Hebrew |", "|---|---|---|"] + [r for k, v in C.CTA_BAND.items() if (r := row(k, v))]
    L += ["", "## Form", "", "| Key | English | Hebrew |", "|---|---|---|"] + [r for k, v in C.FORM.items() if (r := row(k, v))]
    for k in ("roles", "needs"):
        L += [f"| `{k}.{v}` | {a[0]} ({b[0]}) | {a[1]} ({b[1]}) |" for v, a, b in C.FORM[k]]
    for k in ("countries", "sizes", "statuses", "timelines"):
        L += [f"| `{k}.{v or 'empty'}` | {a[0]} | {a[1]} |" for v, a in C.FORM[k]]
    for name, data in (("Privacy", C.PRIVACY), ("Accessibility statement", C.A11Y)):
        L += ["", f"## {name}", ""]
        for (he_h, he_p), (en_h, en_p) in zip(data["he"], data["en"]):
            L += [f"**{en_h}** / **{he_h}**", "", en_p, "", he_p, ""]
    OUT.write_text("\n".join(L).replace(" ", " ").replace("‑", "-") + "\n", encoding="utf-8")
    print("wrote", OUT, len(L), "lines")


if __name__ == "__main__":
    main()
