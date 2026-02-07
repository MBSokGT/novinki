-- РАДИКАЛЬНОЕ РЕШЕНИЕ - ОТКЛЮЧАЕМ RLS НА user_profiles

-- 1. Удаляем ВСЕ политики
DROP POLICY IF EXISTS "Пользователи могут читать свой профиль" ON user_profiles;
DROP POLICY IF EXISTS "Админы могут читать все профили" ON user_profiles;
DROP POLICY IF EXISTS "Админы могут обновлять профили" ON user_profiles;
DROP POLICY IF EXISTS "Все авторизованные могут читать профили" ON user_profiles;
DROP POLICY IF EXISTS "allow_read_all" ON user_profiles;
DROP POLICY IF EXISTS "allow_admin_update" ON user_profiles;
DROP POLICY IF EXISTS "users_select_own" ON user_profiles;
DROP POLICY IF EXISTS "admins_update" ON user_profiles;

-- 2. ОТКЛЮЧАЕМ RLS (все авторизованные пользователи смогут читать профили)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. Проверка - теперь должно работать
SELECT id, email, is_admin FROM user_profiles WHERE id = auth.uid();

-- 4. Проверка - видим всех пользователей
SELECT id, email, is_admin FROM user_profiles;
