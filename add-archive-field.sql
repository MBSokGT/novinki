-- Добавляем поле is_archived в таблицу products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Создаем индекс для быстрого поиска по статусу архивации
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON products(is_archived);