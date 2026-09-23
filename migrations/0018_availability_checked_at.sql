ALTER TABLE products ADD COLUMN availability_checked_at TEXT;
ALTER TABLE deleted_products ADD COLUMN availability_checked_at TEXT;
ALTER TABLE archived_products ADD COLUMN availability_checked_at TEXT;
