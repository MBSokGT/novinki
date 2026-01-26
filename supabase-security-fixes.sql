/* Исправление проблем безопасности */

/* 1. Исправление функций с mutable search_path */
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_admin)
  VALUES (new.id, new.email, false);
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_deleted_product()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.archived_products (
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
$$;

/* 2. Исправление небезопасной политики для product_views */
DROP POLICY IF EXISTS "Все могут добавлять просмотры" ON product_views;

CREATE POLICY "Авторизованные могут добавлять просмотры" ON product_views
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

/* 3. Пересоздание представлений без SECURITY DEFINER */
DROP VIEW IF EXISTS public.product_statistics;
CREATE VIEW public.product_statistics AS
SELECT 
  p.id,
  p.name,
  p.brand,
  COUNT(DISTINCT pv.id) as view_count,
  COUNT(DISTINCT b.id) as bookmark_count,
  MAX(pv.viewed_at) as last_viewed
FROM public.products p
LEFT JOIN public.product_views pv ON p.id = pv.product_id
LEFT JOIN public.bookmarks b ON p.id = b.product_id
GROUP BY p.id, p.name, p.brand;

DROP VIEW IF EXISTS public.user_activity;
CREATE VIEW public.user_activity AS
SELECT 
  DATE(viewed_at) as date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_views
FROM public.product_views
WHERE viewed_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(viewed_at)
ORDER BY date DESC;

/* 4. Обновление политик для user_profiles */
DROP POLICY IF EXISTS "Все могут читать профили" ON user_profiles;

CREATE POLICY "Пользователи видят свой профиль" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Админы видят все профили" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

/* 5. Добавляем индексы для производительности */
CREATE INDEX IF NOT EXISTS idx_product_views_user_time ON product_views(user_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_admin ON user_profiles(is_admin) WHERE is_admin = true;