ALTER TABLE products ADD COLUMN created_by TEXT;
ALTER TABLE products ADD COLUMN updated_by TEXT;
ALTER TABLE products ADD COLUMN images TEXT NOT NULL DEFAULT '[]';

ALTER TABLE archived_products ADD COLUMN created_by TEXT;
ALTER TABLE archived_products ADD COLUMN updated_by TEXT;
ALTER TABLE archived_products ADD COLUMN images TEXT NOT NULL DEFAULT '[]';

ALTER TABLE deleted_products ADD COLUMN created_by TEXT;
ALTER TABLE deleted_products ADD COLUMN updated_by TEXT;
ALTER TABLE deleted_products ADD COLUMN images TEXT NOT NULL DEFAULT '[]';
