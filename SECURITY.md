# Безопасность приложения

## Что реализовано сейчас

### Аутентификация
- логин и сессии работают через таблицы SQLite `users` и `sessions`
- публичной регистрации нет: аккаунты создаются вручную (`npm run seed:admin`) или администратором через `/admin/users`
- вход доступен только через незаметную иконку в шапке (`/login`), без публичных ссылок
- cookie `novinki_session` выставляется как `httpOnly`
- сброс пароля идет через `password_reset_tokens`

### Доступ
- `/admin*` защищен в [middleware.ts](/Users/admin/Desktop/Новинки/novinki-app/middleware.ts)
- серверный data API проверяет права на коллекции и не доверяет клиенту
- admin-действия требуют `user_profiles.is_admin = 1`

### Сеть и API
- базовые security headers настроены в [next.config.ts](/Users/admin/Desktop/Новинки/novinki-app/next.config.ts)
- есть валидация входных данных в [lib/security.ts](/Users/admin/Desktop/Новинки/novinki-app/lib/security.ts)
- `POST /api/auth/validate` ограничен rate limit логикой

## Что важно для продакшена
- включить HTTPS на домене (nginx + сертификат)
- задать `APP_URL` как полный URL вида `https://example.com/reset-password`
- вынести email/webhook интеграции в `REQUEST_WEBHOOK_URL` и `PASSWORD_RESET_WEBHOOK_URL`
- периодически чистить/ротировать сессии
- при росте проекта вынести изображения из SQLite в отдельное файловое хранилище
