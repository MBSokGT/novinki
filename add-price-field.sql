-- Добавление поля цены
ALTER TABLE products ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- Индекс для быстрого поиска по категории и бренду
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
