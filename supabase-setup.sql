-- Создание таблицы products
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  advantages TEXT NOT NULL,
  attention_points TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Политика: все могут читать
CREATE POLICY "Все могут читать products" ON products
  FOR SELECT USING (true);

-- Политика: только авторизованные могут добавлять
CREATE POLICY "Авторизованные могут добавлять products" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Политика: только авторизованные могут обновлять
CREATE POLICY "Авторизованные могут обновлять products" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Политика: только авторизованные могут удалять
CREATE POLICY "Авторизованные могут удалять products" ON products
  FOR DELETE USING (auth.role() = 'authenticated');

-- Создание storage bucket для изображений
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);

-- Политика storage: все могут читать
CREATE POLICY "Все могут читать изображения" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

-- Политика storage: только авторизованные могут загружать
CREATE POLICY "Авторизованные могут загружать изображения" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- Таблица для запросов на добавление товаров
CREATE TABLE requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  product TEXT NOT NULL,
  article TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение Row Level Security
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Политика: все могут добавлять запросы
CREATE POLICY "Все могут добавлять requests" ON requests
  FOR INSERT WITH CHECK (true);

-- Политика: только авторизованные могут читать
CREATE POLICY "Авторизованные могут читать requests" ON requests
  FOR SELECT USING (auth.role() = 'authenticated');
