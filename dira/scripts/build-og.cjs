// Builds the link-preview images (public/og-he.jpg, public/og-en.jpg) from the real demo output and
// the logo, rendered in a browser so Hebrew text shapes correctly. Run after build-demo:
//   node scripts/build-og.cjs
const { chromium } = require("playwright");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const b64 = (p) => readFileSync(path.join(root, p)).toString("base64");
const before = `data:image/jpeg;base64,${b64("public/demo/living-before.jpg")}`;
const after = `data:image/jpeg;base64,${b64("public/demo/living-after.jpg")}`;
const icon = `data:image/svg+xml;base64,${b64("public/icon.svg")}`;

const COPY = {
  he: { dir: "rtl", title: "תמונות לדירה שמביאות טלפונים", line: "חינם · בלי הרשמה · מוכן ליד2 ולוואטסאפ", before: "לפני", after: "אחרי", name: "דירה מוכנה" },
  en: { dir: "ltr", title: "Listing photos that make the phone ring", line: "Free · no sign-up · ready for Yad2 and WhatsApp", before: "Before", after: "After", name: "Dira Ready" },
};

const html = (c) => `<!doctype html><html dir="${c.dir}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@700&family=IBM+Plex+Sans+Hebrew:wght@600;700&display=block" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#1d1f23;font-family:'IBM Plex Sans Hebrew',sans-serif}
.photos{position:absolute;inset:0;display:flex;flex-direction:row}
.photos div{position:relative;flex:1;background-size:cover;background-position:center}
.photos div+div{border-${c.dir === "rtl" ? "right" : "left"}:4px solid #fff}
.tag{position:absolute;top:28px;${c.dir === "rtl" ? "right" : "left"}:28px;padding:8px 16px;border-radius:8px;color:#fff;font-weight:700;font-size:24px}
.b .tag{background:rgba(20,25,34,.8)} .a .tag{background:#093484}
.band{position:absolute;inset:auto 0 0 0;height:250px;background:linear-gradient(to top,rgba(10,14,22,.94) 55%,rgba(10,14,22,0));padding:0 56px 44px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff}
.brand{display:flex;align-items:center;gap:14px;font-size:30px;font-weight:700;margin-bottom:14px}
.brand img{width:52px;height:52px}
h1{font-family:'Frank Ruhl Libre',serif;font-weight:700;font-size:58px;line-height:1.05}
p{margin-top:12px;font-size:26px;color:rgba(255,255,255,.85)}
</style></head><body>
<div class="photos"><div class="b" style="background-image:url(${before})"><span class="tag">${c.before}</span></div><div class="a" style="background-image:url(${after})"><span class="tag">${c.after}</span></div></div>
<div class="band"><div class="brand"><img src="${icon}" alt="">${c.name}</div><h1>${c.title}</h1><p>${c.line}</p></div>
</body></html>`;

(async () => {
  const exe = "/opt/pw-browsers/chromium";
  const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const lang of ["he", "en"]) {
    await page.setContent(html(COPY[lang]), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(root, `public/og-${lang}.jpg`), type: "jpeg", quality: 85 });
  }
  await browser.close();
  console.log("og images written");
})();
