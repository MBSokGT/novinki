-- Таблица категорий
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Все могут читать категории" ON categories FOR SELECT USING (true);
CREATE POLICY "Админы могут управлять категориями" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Таблица тегов
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Все могут читать теги" ON tags FOR SELECT USING (true);
CREATE POLICY "Админы могут управлять тегами" ON tags FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Добавление категории к products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Связь многие-ко-многим для тегов
CREATE TABLE IF NOT EXISTS product_tags (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Все могут читать теги продуктов" ON product_tags FOR SELECT USING (true);
CREATE POLICY "Админы могут управлять тегами продуктов" ON product_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Таблица просмотров
CREATE TABLE IF NOT EXISTS product_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_views_product ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_views_user ON product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_views_date ON product_views(viewed_at);

ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Все могут добавлять просмотры" ON product_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Админы могут читать просмотры" ON product_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Таблица архива удаленных новинок
CREATE TABLE IF NOT EXISTS archived_products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  advantages TEXT NOT NULL,
  attention_points TEXT NOT NULL,
  category_id UUID,
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  original_created_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE archived_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Админы могут управлять архивом" ON archived_products FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Таблица настроек сайта
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO site_settings (key, value) VALUES 
  ('site_name', 'Новинки ассортимента'),
  ('primary_color', '#991b1b'),
  ('logo_url', '/logo.png')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Все могут читать настройки" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Админы могут изменять настройки" ON site_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Добавление полей для блокировки пользователей
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;

-- Функция для архивации при удалении
CREATE OR REPLACE FUNCTION archive_deleted_product()
RETURNS trigger AS $$
BEGIN
  INSERT INTO archived_products (
    id, name, brand, description, image_url, advantages, 
    attention_points, category_id, deleted_by, original_created_at
  ) VALUES (
    OLD.id, OLD.name, OLD.brand, OLD.description, OLD.image_url, 
    OLD.advantages, OLD.attention_points, OLD.category_id, auth.uid(), OLD.created_at
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_archive_product
  BEFORE DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION archive_deleted_product();

-- Представление для статистики
CREATE OR REPLACE VIEW product_statistics AS
SELECT 
  p.id,
  p.name,
  p.brand,
  COUNT(DISTINCT pv.id) as view_count,
  COUNT(DISTINCT b.id) as bookmark_count,
  MAX(pv.viewed_at) as last_viewed
FROM products p
LEFT JOIN product_views pv ON p.id = pv.product_id
LEFT JOIN bookmarks b ON p.id = b.product_id
GROUP BY p.id, p.name, p.brand;

-- Представление для активности пользователей
CREATE OR REPLACE VIEW user_activity AS
SELECT 
  DATE(viewed_at) as date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_views
FROM product_views
WHERE viewed_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(viewed_at)
ORDER BY date DESC;
