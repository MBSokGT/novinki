-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ ИЗБЕЖАНИЯ РЕКУРСИИ

-- Удаляем проблемные политики если они есть
DROP POLICY IF EXISTS "Admins can manage deleted products" ON deleted_products;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

-- Создаем простые политики без рекурсии
CREATE POLICY "Enable all for authenticated users" ON user_profiles
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable all for authenticated users" ON deleted_products  
FOR ALL USING (auth.uid() IS NOT NULL);

-- Обновляем функцию check_admin_status для избежания RLS
CREATE OR REPLACE FUNCTION check_admin_status(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM user_profiles 
  WHERE id = user_id;
$$;