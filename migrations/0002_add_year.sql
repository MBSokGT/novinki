ALTER TABLE products ADD COLUMN year TEXT;
ALTER TABLE deleted_products ADD COLUMN year TEXT;
ALTER TABLE archived_products ADD COLUMN year TEXT;

CREATE INDEX IF NOT EXISTS idx_products_year ON products(year);
