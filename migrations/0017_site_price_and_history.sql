ALTER TABLE products ADD COLUMN site_price REAL;
ALTER TABLE products ADD COLUMN site_currency TEXT;
ALTER TABLE deleted_products ADD COLUMN site_price REAL;
ALTER TABLE deleted_products ADD COLUMN site_currency TEXT;
ALTER TABLE archived_products ADD COLUMN site_price REAL;
ALTER TABLE archived_products ADD COLUMN site_currency TEXT;

CREATE TABLE IF NOT EXISTS product_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  changed_fields TEXT NOT NULL DEFAULT '[]',
  snapshot TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_history_product ON product_history(product_id, changed_at);
