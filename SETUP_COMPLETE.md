# Статус настройки (PocketBase)

## Выполнено
- Приложение переведено с Supabase на PocketBase-клиент
- Добавлен совместимый data layer в `lib/supabase.ts`
- Обновлены auth-методы (login/signup/reset/update user)
- Переведены API-запросы и middleware-логика на PocketBase
- Проверена production-сборка (`npm run build`)

## Обновленная инфраструктура
- `proxy.ts` защищает `/admin*`
- Admin-страницы дополнительно проверяют права через `check_admin_status`
- `/api/request` сохраняет заявки в коллекцию `requests`

## Что нужно заполнить в окружении
```bash
NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
REQUEST_WEBHOOK_URL=
ENCRYPTION_KEY=
```

## Чеклист перед релизом
1. Проверить права коллекций в PocketBase.
2. Назначить первого администратора (`user_profiles.is_admin = true`).
3. Проверить вход, админку, CRUD товаров, закладки и восстановление пароля.
4. Выполнить `npm run build`.
