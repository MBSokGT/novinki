ALTER TABLE products ADD COLUMN bumped_at TEXT;
ALTER TABLE deleted_products ADD COLUMN bumped_at TEXT;
ALTER TABLE archived_products ADD COLUMN bumped_at TEXT;
