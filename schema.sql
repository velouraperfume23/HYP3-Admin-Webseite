-- HYP3 Dashboard — D1 database schema
-- Run this once against your D1 database (see setup steps) to create
-- the two tables the dashboard needs.

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,        -- ISO timestamp
  page TEXT,               -- e.g. "/shop.html"
  referrer TEXT            -- where the visitor came from, if known
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,        -- ISO timestamp
  items TEXT NOT NULL,     -- human-readable summary, e.g. "HYP3 Rose (30 ML) x2, Billionaire (50 ML) x1"
  items_json TEXT,         -- structured line items: [{"name":"HYP3 Rose (30 ML)","size":"30 ML","qty":2,"price":96.03}, ...]
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  promo_code TEXT,
  shipping REAL NOT NULL,
  total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,        -- ISO timestamp
  category TEXT NOT NULL,  -- e.g. "Packaging", "Marketing", "Rent", "Supplies"
  amount REAL NOT NULL,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_expenses_ts ON expenses (ts);

CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits (ts);
CREATE INDEX IF NOT EXISTS idx_orders_ts ON orders (ts);
