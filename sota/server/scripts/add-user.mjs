// Creates the first admin (or any user) directly in the database.
//   npm run user:add -- --email you@example.com --name "Your Name" --role admin [--remote]
// The password is asked for in the terminal and never stored in plain text.
import { webcrypto as crypto } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
  return acc;
}, []));
const email = String(args.email || "").toLowerCase().trim();
const name = String(args.name || "").trim();
const role = args.role === "staff" ? "staff" : "admin";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2) {
  console.error('Usage: npm run user:add -- --email you@example.com --name "Your Name" [--role admin|staff] [--remote]');
  process.exit(1);
}

async function ask(q) {
  if (process.env.SOTA_PASSWORD) return process.env.SOTA_PASSWORD;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a); }));
}
const b64url = (buf) => Buffer.from(buf).toString("base64url");

const password = await ask("Password (12+ characters): ");
if (password.length < 12) { console.error("Password must be at least 12 characters."); process.exit(1); }
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
const q = (s) => `'${s.replace(/'/g, "''")}'`;
const sql = `INSERT INTO users (email, name, role, pass_hash, pass_salt, pass_iter, created_at) VALUES (${q(email)}, ${q(name)}, '${role}', '${b64url(bits)}', '${b64url(salt)}', 100000, '${new Date().toISOString()}')
ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role, pass_hash = excluded.pass_hash, pass_salt = excluded.pass_salt, pass_iter = excluded.pass_iter, active = 1;`;
execFileSync("npx", ["wrangler", "d1", "execute", "sota", args.remote ? "--remote" : "--local", "--command", sql], { stdio: "inherit" });
console.log(`\nUser ${email} (${role}) is ready. Sign in at /admin/`);
