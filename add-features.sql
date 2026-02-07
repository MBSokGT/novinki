-- Добавление новых полей в таблицу products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0;

-- Таблица рейтингов
CREATE TABLE IF NOT EXISTS product_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи могут управлять своими рейтингами" ON product_ratings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Все могут читать рейтинги" ON product_ratings
  FOR SELECT USING (true);

-- Функция для обновления среднего рейтинга
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM product_ratings
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON product_ratings
FOR EACH ROW EXECUTE FUNCTION update_product_rating();
