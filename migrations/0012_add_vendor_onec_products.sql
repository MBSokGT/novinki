-- This file's name sorts alphabetically BEFORE 0012_add_vendors.sql ("_o" < "s"),
-- so on a fresh database migrations/lib/sqlite.ts's applyMigrations() runs this
-- ALTER before the CREATE TABLE that adds "vendors" in the first place, failing
-- with "no such table: vendors". The CREATE TABLE IF NOT EXISTS below (kept in
-- sync with 0012_add_vendors.sql) makes this file self-sufficient regardless of
-- run order; 0012_add_vendors.sql's own CREATE TABLE IF NOT EXISTS then just
-- no-ops if this one already ran first. Do not rename this file — already-applied
-- databases key off the exact filename in _migrations and would try to re-run it.
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  product TEXT,
  website_link TEXT,
  max_discount TEXT,
  delivery_time TEXT,
  files TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
ALTER TABLE vendors ADD COLUMN onec_products TEXT;
