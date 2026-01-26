-- Функция для проверки прав админа (обходит RLS)
CREATE OR REPLACE FUNCTION check_admin_status(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_result BOOLEAN := false;
BEGIN
  SELECT is_admin INTO is_admin_result
  FROM user_profiles
  WHERE id = user_id;
  
  RETURN COALESCE(is_admin_result, false);
END;
$$;

-- Даем права на выполнение функции всем авторизованным пользователям
GRANT EXECUTE ON FUNCTION check_admin_status(UUID) TO authenticated;