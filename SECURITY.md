# Безопасность приложения

## Текущие меры

### 1) Аутентификация и доступ
- Аутентификация через PocketBase (`users`)
- Защита `/admin*` через `proxy.ts` и cookie `pb_auth`
- Проверка админ-прав через `rpc('check_admin_status')` на клиентских admin-страницах

### 2) Сетевая защита
HTTP headers из `next.config.ts`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`

### 3) Защита API
- Валидация входных данных (`sanitizeInput`)
- Rate limiting на `POST /api/auth/validate`

### 4) Рекомендации для продакшена
- Включить HTTPS на домене
- Ограничить CORS в PocketBase
- Настроить правила доступа коллекций в PocketBase (list/view/create/update/delete)
- Хранить `ENCRYPTION_KEY` только в переменных окружения
- Ротировать секреты и токены доступа

## Что важно проверить после деплоя
- Не открыты публично admin-коллекции на запись
- У неавторизованных пользователей нет доступа к `/admin*`
- У не-админов нет прав управления товарами/пользователями
