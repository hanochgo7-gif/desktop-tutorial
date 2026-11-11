// A local static server that behaves like Vercel does for Lucid (tests only): it serves a directory with the
// response headers of vercel.json, answers an unknown path with 404.html and status 404, and serves index.html for a
// directory. Strict where Vercel is lenient: a path for which two rules set the same header is an error (500), so
// the rules in vercel.json must not overlap and their order never matters.
// Usage: node tools/build/serve.mjs --root <dir> --port <n> [--mount /lucid/] [--config vercel.json] [--host 127.0.0.1]
//   --mount: the URL prefix the directory is served under (the e2e suites use /lucid/); rules match the path below it.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname, dirname, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

// A vercel.json "source" (path-to-regexp: literal text, and "(…)" groups of regular expression) as a RegExp. Only
// what Lucid's vercel.json uses: literals and groups; named parameters are refused. Like path-to-regexp, a group
// may not start with "?" and may hold no capturing group of its own.
export function sourceToRegExp(source) {
  let re = '';
  for (let i = 0; i < source.length;) {
    const c = source[i];
    if (c === ':') throw new Error(`${source}: named parameters are not supported here`);
    if (c !== '(') { re += c.replace(/[.*+?^${}|[\]\\/]/g, '\\$&'); i++; continue; }
    let depth = 1, j = i + 1, body = '';
    if (source[j] === '?') throw new Error(`${source}: a group may not start with "?"`);
    while (j < source.length) {
      if (source[j] === '\\') { body += source[j] + source[j + 1]; j += 2; continue; }
      if (source[j] === ')' && --depth === 0) { j++; break; }
      if (source[j] === '(') { depth++; if (source[j + 1] !== '?') throw new Error(`${source}: capturing group inside a group`); }
      body += source[j++];
    }
    if (depth) throw new Error(`${source}: unbalanced group`);
    re += `(${body})`;
    i = j;
  }
  return new RegExp(`^${re}$`, 'i');
}

// The headers vercel.json gives a request path ("/", "/js/app.js"). Throws when two rules set one header.
export function headersFor(path, config) {
  const out = {};
  const from = {};
  for (const rule of config.headers || []) {
    if (!sourceToRegExp(rule.source).test(path)) continue;
    for (const { key, value } of rule.headers) {
      const k = key.toLowerCase();
      if (k in out) throw new Error(`${path}: ${key} is set by "${from[k]}" and "${rule.source}"`);
      out[k] = value; from[k] = rule.source;
    }
  }
  return out;
}

export function serve({ root, port, host = '127.0.0.1', mount = '/', config = JSON.parse(readFileSync(join(here, '..', '..', 'vercel.json'), 'utf8')) }) {
  const base = resolve(root);
  const server = createServer((req, res) => {
    let url;
    try { url = new URL(req.url, 'http://x'); } catch { res.writeHead(400).end(); return; }
    let path = decodeURIComponent(url.pathname);
    if (`${path}/` === mount) { res.writeHead(301, { location: mount }).end(); return; } // like GitHub Pages and Vercel
    if (!path.startsWith(mount)) { res.writeHead(404, { 'content-type': 'text/plain' }).end('outside the mount'); return; }
    path = `/${path.slice(mount.length)}`;
    let file = normalize(join(base, path));
    if (file !== base && !file.startsWith(base + sep)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    let status = 200;
    if (!existsSync(file) || !statSync(file).isFile()) { status = 404; file = join(base, '404.html'); }
    let headers;
    try { headers = headersFor(path, config); } catch (e) { res.writeHead(500, { 'content-type': 'text/plain' }).end(e.message); return; }
    if (!existsSync(file)) { res.writeHead(404, { ...headers, 'content-type': 'text/plain' }).end('not found'); return; }
    const body = readFileSync(file);
    res.writeHead(status, { ...headers, 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'content-length': body.length });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
  return new Promise((ok) => server.listen(port, host, () => ok(server)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
  const config = JSON.parse(readFileSync(resolve(arg('--config', join(here, '..', '..', 'vercel.json'))), 'utf8'));
  serve({ root: arg('--root', '.'), port: Number(arg('--port', 8080)), host: arg('--host', '127.0.0.1'), mount: arg('--mount', '/'), config })
    .then(() => console.log(`serving ${arg('--root', '.')} at http://${arg('--host', '127.0.0.1')}:${arg('--port', 8080)}${arg('--mount', '/')}`));
}
