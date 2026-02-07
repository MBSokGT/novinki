-- История просмотров
CREATE TABLE IF NOT EXISTS view_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_view_history_user ON view_history(user_id, viewed_at DESC);

ALTER TABLE view_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи управляют своей историей" ON view_history
  FOR ALL USING (auth.uid() = user_id);

-- Сохраненные поиски
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи управляют своими поисками" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);

-- Сравнение товаров
CREATE TABLE IF NOT EXISTS product_comparisons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE product_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи управляют сравнениями" ON product_comparisons
  FOR ALL USING (auth.uid() = user_id);
