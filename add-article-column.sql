-- Добавляем колонку артикул в таблицу products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS article_number TEXT;

-- Добавляем колонку артикул в таблицу deleted_products
ALTER TABLE deleted_products 
ADD COLUMN IF NOT EXISTS article_number TEXT;

-- Создаем индекс для поиска по артикулу
CREATE INDEX IF NOT EXISTS idx_products_article_number ON products(article_number);