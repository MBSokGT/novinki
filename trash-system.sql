-- Добавляем поле is_archived в таблицу products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Создаем таблицу корзины для удаленных товаров
CREATE TABLE IF NOT EXISTS deleted_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_product_id UUID NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  advantages TEXT NOT NULL,
  attention_points TEXT NOT NULL,
  website_link TEXT,
  onec_link TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем функцию для автоматической очистки корзины (старше 14 дней)
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

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON products(is_archived);
CREATE INDEX IF NOT EXISTS idx_deleted_products_deleted_at ON deleted_products(deleted_at);

-- Настраиваем RLS для deleted_products
ALTER TABLE deleted_products ENABLE ROW LEVEL SECURITY;

-- Политика для админов
CREATE POLICY "Admins can manage deleted products" ON deleted_products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);