ALTER TABLE products ADD COLUMN is_supplier_novelty INTEGER NOT NULL DEFAULT 0;
ALTER TABLE archived_products ADD COLUMN is_supplier_novelty INTEGER NOT NULL DEFAULT 0;
ALTER TABLE deleted_products ADD COLUMN is_supplier_novelty INTEGER NOT NULL DEFAULT 0;
