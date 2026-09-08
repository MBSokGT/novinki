ALTER TABLE products ADD COLUMN variants TEXT NOT NULL DEFAULT '[]';
ALTER TABLE deleted_products ADD COLUMN variants TEXT NOT NULL DEFAULT '[]';
ALTER TABLE archived_products ADD COLUMN variants TEXT NOT NULL DEFAULT '[]';
