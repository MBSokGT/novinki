-- ПОЛНЫЙ СБРОС ПОЛИТИК user_profiles

-- Отключаем RLS временно
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Удаляем ВСЕ политики
DROP POLICY IF EXISTS "Пользователи могут читать свой профиль" ON user_profiles;
DROP POLICY IF EXISTS "Админы могут читать все профили" ON user_profiles;
DROP POLICY IF EXISTS "Админы могут обновлять профили" ON user_profiles;
DROP POLICY IF EXISTS "Все авторизованные могут читать профили" ON user_profiles;

-- Включаем RLS обратно
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Создаем ОДНУ простую политику - все авторизованные могут читать ВСЕ профили
CREATE POLICY "allow_read_all" ON user_profiles
  FOR SELECT 
  TO authenticated
  USING (true);

-- Политика для обновления - только админы
CREATE POLICY "allow_admin_update" ON user_profiles
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.is_admin = true
    )
  );

-- Проверка: посмотреть свой профиль (должно работать)
SELECT id, email, is_admin FROM user_profiles WHERE id = auth.uid();

-- Проверка: посмотреть все профили (должно работать для всех авторизованных)
SELECT id, email, is_admin FROM user_profiles LIMIT 5;
