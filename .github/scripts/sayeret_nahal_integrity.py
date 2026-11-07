#!/usr/bin/env python3
"""Integrity check for the Sayeret Nahal donation page.

Fails (exit 1) when the LIVE page differs from the file in the repository, or when any
payment detail or outbound link is not on the approved list below. Changing a bank
account, a Jgive campaign or a contact therefore needs a reviewed edit to this file too.
Standard library only, so nothing third-party runs in this check.
"""
import hashlib, re, sys, time, urllib.parse, urllib.request

LIVE = "https://hanochgo7-gif.github.io/desktop-tutorial/sayeret-nahal/"
REPO_FILE = "sayeret-nahal/index.html"

JGIVE = re.compile(r"^https://www\.jgive\.com/new/(he|en)/(ils|usd)/collect/donation-targets/163449/amount$")
EXACT_LINKS = {
    "https://aid-coalition.org/donate/nahal",
    "https://www.guidestar.org.il/organization/580218642",
    "https://hanochgo7-gif.github.io/desktop-tutorial/sayeret-nahal/",
    "https://hanochgo7-gif.github.io/desktop-tutorial/sayeret-nahal/assets/og.jpg",
    "mailto:hezki.m@gmail.com",
    "mailto:sayeret.nahal@gmail.com",
    "tel:+972507347952",
}
WHATSAPP = {"https://wa.me/972507347952", "https://wa.me/"}
COPY_VALUES = {"2014601", "050-734-7952", "+972-50-734-7952", "hezki.m@gmail.com", "sayeret.nahal@gmail.com"}
BANK_SNIPPETS = ["<dt>בנק</dt><dd>לאומי (10)</dd><dt>סניף</dt><dd>734</dd>", "<dt>Bank</dt>"]
SCRIPT_HOSTS_ALLOWED = set()  # the page must not load any external script


def fetch(url):
    req = urllib.request.Request(url + "?integrity=" + str(int(time.time())), headers={"User-Agent": "integrity-check", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def problems_in(html):
    out = []
    for attr, url in re.findall(r'\b(href|src|content|action)="((?:https?:|tel:|mailto:|//)[^"]*)"', html):
        if JGIVE.match(url) or url in EXACT_LINKS:
            continue
        base, _, query = url.partition("?")
        if base in WHATSAPP:
            text = urllib.parse.parse_qs(query).get("text", [""])[0]
            for inner in re.findall(r"https?://\S+", text):
                if not JGIVE.match(inner.rstrip(".,")):
                    out.append("WhatsApp text links to an unapproved address: " + inner)
            continue
        out.append("Unapproved link in %s: %s" % (attr, url))
    for src in re.findall(r"<script[^>]*\bsrc=\"([^\"]+)\"", html):
        out.append("External script is not allowed: " + src)
    for frm in re.findall(r"<(form|iframe|object|embed)\b", html):
        out.append("Unexpected <%s> element" % frm)
    copies = set(re.findall(r'data-copy="([^"]*)"', html))
    if copies != COPY_VALUES:
        out.append("Copyable details changed: added %s, missing %s" % (sorted(copies - COPY_VALUES), sorted(COPY_VALUES - copies)))
    if html.count('data-copy="2014601"') != 2:
        out.append("Bank account 2014601 is not shown exactly twice")
    if html.count(">2014601<") != 2:
        out.append("Visible bank account number 2014601 is not shown exactly twice")
    for s in BANK_SNIPPETS:
        if s not in html:
            out.append("Bank details block changed: " + s)
    csp = re.search(r'http-equiv="Content-Security-Policy" content="([^"]*)"', html)
    if not csp:
        out.append("Content-Security-Policy meta tag is missing")
    else:
        for d in ["default-src 'none'", "form-action 'none'", "connect-src 'none'", "base-uri 'none'", "object-src 'none'"]:
            if d not in csp.group(1):
                out.append("Content-Security-Policy lost: " + d)
        if "unsafe-eval" in csp.group(1) or re.search(r"script-src[^;]*'unsafe-inline'", csp.group(1)):
            out.append("Content-Security-Policy allows unsafe scripts")
    return out


def main():
    repo = open(REPO_FILE, "rb").read()
    problems = ["(repository) " + p for p in problems_in(repo.decode("utf-8"))]
    live, attempts = b"", 4
    for i in range(attempts):  # Pages caches HTML for up to 10 minutes after a deploy
        live = fetch(LIVE)
        if hashlib.sha256(live).digest() == hashlib.sha256(repo).digest():
            break
        if i < attempts - 1:
            time.sleep(180)
    else:
        problems.append("Live page differs from %s (live sha256 %s, repository sha256 %s)" % (
            REPO_FILE, hashlib.sha256(live).hexdigest()[:16], hashlib.sha256(repo).hexdigest()[:16]))
    problems += ["(live) " + p for p in problems_in(live.decode("utf-8", "replace"))]
    if problems:
        print("INTEGRITY CHECK FAILED")
        for p in problems:
            print(" -", p)
        return 1
    print("OK: live page matches the repository and every link and payment detail is approved")
    return 0


if __name__ == "__main__":
    sys.exit(main())
