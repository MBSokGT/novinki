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

-- Таблица профилей пользователей с ролями
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут читать свой профиль
CREATE POLICY "Пользователи могут читать свой профиль" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Политика: админы могут читать все профили
CREATE POLICY "Админы могут читать все профили" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Политика: админы могут обновлять профили
CREATE POLICY "Админы могут обновлять профили" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Таблица закладок
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Включение Row Level Security
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут управлять своими закладками
CREATE POLICY "Пользователи могут управлять своими закладками" ON bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- Функция для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_admin)
  VALUES (new.id, new.email, false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Обновление политик products для админов
DROP POLICY IF EXISTS "Авторизованные могут добавлять products" ON products;
DROP POLICY IF EXISTS "Авторизованные могут обновлять products" ON products;
DROP POLICY IF EXISTS "Авторизованные могут удалять products" ON products;

CREATE POLICY "Админы могут добавлять products" ON products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Админы могут обновлять products" ON products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Админы могут удалять products" ON products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
