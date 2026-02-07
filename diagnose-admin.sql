-- ДИАГНОСТИКА ПРАВ АДМИНА

-- 1. Проверка: есть ли запись в user_profiles для текущего пользователя
SELECT 
  id, 
  email, 
  is_admin,
  created_at
FROM user_profiles 
WHERE id = auth.uid();

-- 2. Проверка: какие политики сейчас активны
SELECT 
  schemaname, 
  tablename, 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 3. Проверка: включен ли RLS
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 4. Проверка: текущий пользователь
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- 5. Посмотреть всех пользователей (если политики позволяют)
SELECT 
  id, 
  email, 
  is_admin 
FROM user_profiles;

-- ЕСЛИ НЕ ВИДИШЬ СВОЮ ЗАПИСЬ В ПЕРВОМ ЗАПРОСЕ:
-- Значит проблема в RLS политиках. Выполни это:

-- Временное решение - отключить RLS (ТОЛЬКО ДЛЯ ТЕСТА!)
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Потом посмотри снова:
-- SELECT id, email, is_admin FROM user_profiles WHERE id = auth.uid();

-- И включи обратно:
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
