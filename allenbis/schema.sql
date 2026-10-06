-- Allenbis orders database (Cloudflare D1). Create once:
--   npx wrangler d1 create allenbis
--   npx wrangler d1 execute allenbis --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,                 -- short code the store and the customer see, e.g. K7Q2M
  token TEXT NOT NULL,                 -- secret that lets the customer follow the order
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  name TEXT, phone TEXT, street TEXT, apt TEXT, note TEXT, pay TEXT, lang TEXT,
  items INTEGER, total INTEGER, lines TEXT, summary TEXT,
  benefit TEXT, benefit_amount INTEGER NOT NULL DEFAULT 0,
  ref_code TEXT,                       -- the friend's code this first order came with (if accepted)
  ref_paid INTEGER NOT NULL DEFAULT 0  -- 1 once the friend got their credit for it
);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS orders_phone ON orders(phone);

-- "Bring a friend": every customer gets a code; credit is earned when a friend's first order is delivered
CREATE TABLE IF NOT EXISTS referrers (
  code TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  credit INTEGER NOT NULL DEFAULT 0,
  earned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- What the store changes from the store screen: sold out, or a different price (agorot)
CREATE TABLE IF NOT EXISTS stock (
  id TEXT PRIMARY KEY,
  oos INTEGER NOT NULL DEFAULT 0,
  price INTEGER,
  updated_at INTEGER NOT NULL
);
