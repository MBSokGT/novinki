-- Проверка прав администратора для всех пользователей
SELECT 
  up.id,
  up.email,
  up.is_admin,
  up.created_at
FROM user_profiles up
ORDER BY up.created_at DESC;

-- Если нужно дать права администратора конкретному пользователю, 
-- замените 'your-email@example.com' на ваш email:
-- UPDATE user_profiles 
-- SET is_admin = true 
-- WHERE email = 'your-email@example.com';