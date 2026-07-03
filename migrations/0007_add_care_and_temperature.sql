ALTER TABLE products ADD COLUMN is_dishwasher_safe INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN is_microwave_safe INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN temp_min REAL;
ALTER TABLE products ADD COLUMN temp_max REAL;

ALTER TABLE archived_products ADD COLUMN is_dishwasher_safe INTEGER NOT NULL DEFAULT 0;
ALTER TABLE archived_products ADD COLUMN is_microwave_safe INTEGER NOT NULL DEFAULT 0;
ALTER TABLE archived_products ADD COLUMN temp_min REAL;
ALTER TABLE archived_products ADD COLUMN temp_max REAL;

ALTER TABLE deleted_products ADD COLUMN is_dishwasher_safe INTEGER NOT NULL DEFAULT 0;
ALTER TABLE deleted_products ADD COLUMN is_microwave_safe INTEGER NOT NULL DEFAULT 0;
ALTER TABLE deleted_products ADD COLUMN temp_min REAL;
ALTER TABLE deleted_products ADD COLUMN temp_max REAL;
