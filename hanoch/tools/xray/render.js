// רנטגן: מצייר את הרילס (MP4, 30 שניות, 30 פריימים בשנייה) ואת שמונת שקפי הקרוסלה (PNG)
// שימוש: node render.js <ep-file> <out-dir> [reel|car|all] [--frames 0,90,300]
// דורש playwright ו-ffmpeg. מגיש את תיקיית hanoch בשרת מקומי כדי שהגופנים ייטענו
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const [ep = 'ep-ac', out = path.join(process.cwd(), 'out'), what = 'all'] = process.argv.slice(2).filter(a => !a.startsWith('--') && !/^[\d,]+$/.test(a));
const fi = process.argv.indexOf('--frames'), only = fi > 0 ? process.argv[fi + 1].split(',').map(Number) : null;
const FPS = 30, DUR = 30;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png' };

function serve() {
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const srv = await serve(), base = `http://127.0.0.1:${srv.address().port}/tools/xray/`;
  const b = await chromium.launch();
  const errs = [];

  if (what === 'reel' || what === 'all') {
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    p.on('pageerror', e => errs.push('reel: ' + e.message));
    await p.goto(base + 'xr-reel.html?ep=' + ep);
    await p.waitForFunction(() => window.READY === true);
    const fr = path.join(out, 'frames'); fs.rmSync(fr, { recursive: true, force: true }); fs.mkdirSync(fr);
    const list = only || Array.from({ length: FPS * DUR }, (_, i) => i);
    for (const i of list) {
      await p.evaluate(t => XR.seek(t), i / FPS);
      await p.screenshot({ path: path.join(fr, String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 94 });
    }
    if (!only) {
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(fr, '%04d.jpg'),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(out, 'reel.mp4')]);
      fs.copyFileSync(path.join(fr, '0000.jpg'), path.join(out, 'reel-cover.jpg'));
    }
    await p.close();
  }

  if (what === 'car' || what === 'all') {
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    p.on('pageerror', e => errs.push('car: ' + e.message));
    const n = await p.goto(base + 'xr-car.html?ep=' + ep + '&s=1').then(() => p.waitForFunction(() => window.READY === true)).then(() => p.evaluate(() => EP.slides.length));
    for (let s = 1; s <= n; s++) {
      await p.goto(base + 'xr-car.html?ep=' + ep + '&s=' + s);
      await p.waitForFunction(() => window.READY === true);
      await p.screenshot({ path: path.join(out, 'slide-' + s + '.png') });
    }
    await p.close();
  }

  await b.close(); srv.close();
  console.log(errs.length ? errs.join('\n') : 'no page errors', '->', out);
})();
