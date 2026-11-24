# English mirror generator (`en/`)

Builds the English pages under `en/` from the Hebrew pages at the repo root.

## Run

From the repository root:

```sh
pip install beautifulsoup4        # once
python3 tools/en/gen.py           # regenerate every page into en/
```

Options:

- `--out DIR`: write somewhere else instead of `en/`, for example to check the output before replacing anything:
  ```sh
  python3 tools/en/gen.py --out /tmp/en-check && diff -r /tmp/en-check en -x sim -x data-center-360.html
  ```
- `--list-missing`: list every Hebrew string that has no translation yet.
- `PAGE ...`: regenerate only these pages, for example `python3 tools/en/gen.py about.html services/earthworks.html`.

At the end the script prints `untranslated strings: N`. It exits with status 1 when N is not 0. Untranslated strings stay in Hebrew in the output.

## Files

| File | What it holds |
|------|---------------|
| `gen.py` | The generator. |
| `dict.json` | Exact Hebrew → English strings for text nodes and the attributes `alt`, `aria-label`, `title`, `placeholder`, `data-cap`, `data-caption`, `data-sub`, `value`, `label` and `content`. Keys are whitespace-normalised: runs of spaces and newlines become one space, with no space at either end. |
| `ld.json` | `strings`: exact value translations for JSON-LD (`script[type=application/ld+json]`) and the cutaway data (`script[data-cut-data]`). `index_general_contractor`: the hand-written English GeneralContractor block for `index.html`. |
| `legal/*.html` | The English `<main>` for `privacy.html`, `terms.html` and `accessibility.html`. It replaces the Hebrew `<main>` as is, so the leading space and the trailing newline are part of it. Paths in it are written as they would be on the Hebrew page; the generator adjusts them like everything else. |
| `build_dict.py` | Rebuilds `dict.json`, `ld.json` and `legal/*.html` from the current `en/` pages (see below). |

## What the generator does to each Hebrew page

1. Removes HTML comments. For the legal pages, swaps in `legal/<page>`.
2. `<html lang="en" dir="ltr">`. Removes the page's `EN` link and adds an `עב` link (`navpill__lang`, `lang="he"`, `dir="rtl"`, `aria-label="עברית"`) after the navpill logo, pointing back to the Hebrew page.
3. Replaces the Hebrew WhatsApp prefilled text with the English one, and points the Hebrew company profile PDF at `docs/gotovski-capability-statement.pdf` (`download="S-Gotovski-Capability-Statement.pdf"`).
4. Rewrites paths in `href`, `src`, `poster`, `action`, `data-full`, `data-video`, `data-src`, `data-bg-src`, `srcset`, `imagesrcset` and in meta refresh:
   - Pages with an English copy (the generated pages, `services/data-center-360.html`, any other `.html` already under `en/`), plus anything under `sim/` or `tour/`, stay inside `en/`.
   - Everything else (`css/`, `js/`, `images/`, `fonts/`, `vendor/`, `docs/`, `video/` and so on) goes back to the root with an extra `../`.
   - Absolute links to a page of the site (`https://gotovski.co.il/...`) go to its `/en/` URL. JSON-LD URLs follow the same rule.
5. Sets `og:locale` to `en_US`, sets `canonical` and `og:url` to `https://gotovski.co.il/en/<page>` (`index.html` becomes `/en/`), and replaces the hreflang links with `he`, `en` and `x-default`, where `x-default` is the Hebrew URL.
6. Collapses whitespace-only text that contains a newline into a single newline.
7. Translates JSON-LD, the cutaway JSON, every Hebrew text node and the attributes listed above. Leading and trailing whitespace of a text node is kept.
8. Serialises with BeautifulSoup, which sorts attributes and writes void tags as `<br/>`, and then applies these string fixes: `images/sim-datacenter` → `images/sim-datacenter-en`, `<label for="f-phone">phone` → `Phone`, `docs/gotovski-profile-he.pdf` → `docs/gotovski-capability-statement.pdf`, and `PDF · 0.6MB` → `PDF · 0.5MB`.

`en/sim/` and `en/services/data-center-360.html` are maintained by hand. The generator does not write them.

## Changing a translation

- **Hebrew text was changed or added:** run `python3 tools/en/gen.py --out /tmp/en-check --list-missing`, add the missing strings to `dict.json` (or to `ld.json` for JSON-LD and cutaway values), then run `python3 tools/en/gen.py`.
- **English wording should change:** edit the value in `dict.json`, `ld.json` or `legal/`, then run `python3 tools/en/gen.py`.
- **Someone hand-edited `en/` pages:** run `python3 tools/en/build_dict.py` to pull those edits back into the inputs. It walks each prepared Hebrew page and the English page in parallel and pairs their text nodes, attributes and JSON values. It reports any structural mismatches and any Hebrew string that has two different translations. Entries in `KNOWN_CONFLICTS` are expected conflicts.

A new page needs an entry in `PAGES` in `gen.py`.

## Other inputs

- `wa.json`: Hebrew WhatsApp prefilled message → English message. Each Hebrew page has its own message (by topic); add a pair here when a new message is introduced.
- `images/share/map.json` (outside this folder): per-page share images. The generator sets `og:image`, `og:image:alt` and `twitter:image` on each English page from the `en/<page>` entry.
