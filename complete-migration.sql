-- ПОЛНАЯ МИГРАЦИЯ ДЛЯ СИСТЕМЫ АРХИВИРОВАНИЯ И КОРЗИНЫ

-- 1. Добавляем поле is_archived в таблицу products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Добавляем поле article_number в таблицу products  
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS article_number TEXT;

-- 3. Создаем таблицу корзины для удаленных товаров
CREATE TABLE IF NOT EXISTS deleted_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_product_id UUID NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  article_number TEXT,
  description TEXT NOT NULL,
  image_url TEXT,
  advantages TEXT NOT NULL,
  attention_points TEXT NOT NULL,
  website_link TEXT,
  onec_link TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Создаем функцию для автоматической очистки корзины (старше 14 дней)
CREATE OR REPLACE FUNCTION cleanup_deleted_products()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM deleted_products 
  WHERE deleted_at < NOW() - INTERVAL '14 days';
END;
$$;

-- 5. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON products(is_archived);
CREATE INDEX IF NOT EXISTS idx_products_article_number ON products(article_number);
CREATE INDEX IF NOT EXISTS idx_deleted_products_deleted_at ON deleted_products(deleted_at);

-- 6. Настраиваем RLS для deleted_products
ALTER TABLE deleted_products ENABLE ROW LEVEL SECURITY;

-- 7. Политика для админов на deleted_products
CREATE POLICY "Admins can manage deleted products" ON deleted_products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 8. Функция для проверки прав админа (если еще не создана)
CREATE OR REPLACE FUNCTION check_admin_status(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_result BOOLEAN := false;
BEGIN
  SELECT is_admin INTO is_admin_result
  FROM user_profiles
  WHERE id = user_id;
  
  RETURN COALESCE(is_admin_result, false);
END;
$$;

-- 9. Даем права на выполнение функций
GRANT EXECUTE ON FUNCTION check_admin_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_deleted_products() TO authenticated;