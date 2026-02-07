-- Проверка текущих политик
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Удаление старых политик
DROP POLICY IF EXISTS "Пользователи могут читать свой профиль" ON user_profiles;
DROP POLICY IF EXISTS "Админы могут читать все профили" ON user_profiles;

-- Новая политика: все авторизованные могут читать все профили
CREATE POLICY "Все авторизованные могут читать профили" ON user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Политика для обновления (только админы)
CREATE POLICY "Админы могут обновлять профили" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Проверка: посмотреть свой профиль
SELECT id, email, is_admin FROM user_profiles WHERE id = auth.uid();
