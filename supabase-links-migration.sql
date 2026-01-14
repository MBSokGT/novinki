-- Добавление полей для ссылок в таблицу products
ALTER TABLE products ADD COLUMN IF NOT EXISTS website_link TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS onec_link TEXT;

-- Добавление полей в архив
ALTER TABLE archived_products ADD COLUMN IF NOT EXISTS website_link TEXT;
ALTER TABLE archived_products ADD COLUMN IF NOT EXISTS onec_link TEXT;

-- Обновление функции архивации
CREATE OR REPLACE FUNCTION archive_deleted_product()
RETURNS trigger AS $$
BEGIN
  INSERT INTO archived_products (
    id, name, brand, description, image_url, advantages, 
    attention_points, category_id, website_link, onec_link,
    deleted_by, original_created_at
  ) VALUES (
    OLD.id, OLD.name, OLD.brand, OLD.description, OLD.image_url, 
    OLD.advantages, OLD.attention_points, OLD.category_id, 
    OLD.website_link, OLD.onec_link, auth.uid(), OLD.created_at
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
