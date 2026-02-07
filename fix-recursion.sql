-- ИСПРАВЛЕНИЕ БЕСКОНЕЧНОЙ РЕКУРСИИ В ПОЛИТИКАХ

-- Удаляем ВСЕ политики
DROP POLICY IF EXISTS "Пользователи могут читать свой профиль" ON user_profiles;
DROP POLICY IF EXISTS "Админы могут читать все профили" ON user_profiles;
DROP POLICY IF EXISTS "Админы могут обновлять профили" ON user_profiles;
DROP POLICY IF EXISTS "Все авторизованные могут читать профили" ON user_profiles;
DROP POLICY IF EXISTS "allow_read_all" ON user_profiles;
DROP POLICY IF EXISTS "allow_admin_update" ON user_profiles;

-- Простая политика: каждый видит свой профиль
CREATE POLICY "users_select_own" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Админы могут обновлять (БЕЗ проверки через user_profiles - это вызывало рекурсию!)
CREATE POLICY "admins_update" ON user_profiles
  FOR UPDATE
  USING (is_admin = true);

-- Проверка
SELECT id, email, is_admin FROM user_profiles WHERE id = auth.uid();
