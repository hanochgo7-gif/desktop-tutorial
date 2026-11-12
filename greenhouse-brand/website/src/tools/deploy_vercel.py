"""Deploys public/ to Vercel production as files (not from git), so the editor's publish button can make a new
version from the live one with only the changed pages (Hanoch, 12 Nov 2026).

    python3 src/tools/deploy_vercel.py          # uploads the files Vercel does not have yet, then deploys

The token comes from VERCEL_TOKEN or the Vercel CLI login; it is never printed. Before deploying, the texts the owners
published from the editor are pulled into content.py (src/tools/pull_published.py), so a deploy never undoes them."""
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

W = Path(__file__).resolve().parents[2]
PUB = W / "public"
TEAM, PROJECT, NAME = "team_0slNzm8Zky1VVwwHMkQ8rugk", "prj_vzvbQoy7tU3DlZTuH6cc6t9mRcuV", "miftah-site"
API = "https://api.vercel.com"
ROOT = "greenhouse-brand/website/public/"  # the project's Root Directory: files go up under the same path as in the repository


def token():
    t = os.environ.get("VERCEL_TOKEN")
    if t:
        return t
    for p in (Path.home() / ".local/share/com.vercel.cli/auth.json", Path.home() / ".vercel/auth.json"):
        if p.exists():
            return json.loads(p.read_text())["token"]
    sys.exit("No Vercel token: set VERCEL_TOKEN or run `vercel login`.")


def call(method, path, body=None, headers=None, raw=None):
    h = {"Authorization": "Bearer " + token()}
    h.update(headers or {})
    data = raw
    if body is not None:
        data = json.dumps(body).encode(); h["Content-Type"] = "application/json"
    req = urllib.request.Request(API + path + ("&" if "?" in path else "?") + "teamId=" + TEAM, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def files():
    out = []
    for p in sorted(PUB.rglob("*")):
        if p.is_file():
            b = p.read_bytes()
            out.append({"file": ROOT + p.relative_to(PUB).as_posix(), "sha": hashlib.sha1(b).hexdigest(), "size": len(b), "_path": p})
    return out


def deploy():
    fs = files()
    body = {"name": NAME, "project": PROJECT, "target": "production", "files": [{k: f[k] for k in ("file", "sha", "size")} for f in fs]}
    for attempt in range(3):
        st, r = call("POST", "/v13/deployments?skipAutoDetectionConfirmation=1", body)
        if st < 300:
            return r
        missing = (r.get("error") or {}).get("missing") or []
        if not missing:
            sys.exit(f"deploy failed: {st} {json.dumps(r)[:400]}")
        by = {f["sha"]: f for f in fs}
        print(f"uploading {len(missing)} files")
        for sha in missing:
            f = by[sha]
            st2, r2 = call("POST", "/v2/files", raw=f["_path"].read_bytes(), headers={"x-vercel-digest": sha, "Content-Type": "application/octet-stream", "Content-Length": str(f["size"])})
            if st2 >= 300:
                sys.exit(f"upload failed for {f['file']}: {st2} {r2}")
    sys.exit("deploy failed after uploads")


def wait(dep):
    for _ in range(60):
        st, r = call("GET", f"/v13/deployments/{dep['id']}")
        if r.get("readyState") in ("READY", "ERROR", "CANCELED"):
            return r
        time.sleep(5)
    return r


if __name__ == "__main__":
    sys.path.insert(0, str(W / "src/tools"))
    if "--no-pull" not in sys.argv:
        import pull_published  # noqa: E402
        if pull_published.main(write=True):
            sys.exit("Texts published from the editor were merged into content.py: run build.py, check, commit, then deploy again.")
    d = deploy()
    r = wait(d)
    print(r.get("id"), r.get("readyState"), "https://" + (r.get("alias") or [r.get("url")])[0] if r.get("alias") else r.get("url"))
