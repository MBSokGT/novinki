# Новинки ассортимента

Веб-приложение для каталога новинок и админ-управления. Проект переведен на **PocketBase**.

## Стек
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- PocketBase (Auth + DB)

## Быстрый старт

### 1) Запустите PocketBase
Пример локального запуска:

```bash
./pocketbase serve --http=127.0.0.1:8090
```

### 2) Настройте `.env.local`

```bash
NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
REQUEST_WEBHOOK_URL=
ENCRYPTION_KEY=
```

- `NEXT_PUBLIC_POCKETBASE_URL` - обязательная переменная.
- `REQUEST_WEBHOOK_URL` - опционально, для отправки заявок во внешний webhook.
- `ENCRYPTION_KEY` - рекомендуется для crypto-функций в `lib/security.ts`.

### 3) Создайте коллекции в PocketBase
Минимально используемые коллекции:
- `products`
- `user_profiles`
- `bookmarks`
- `deleted_products`
- `archived_products`
- `categories`
- `tags`
- `site_settings`
- `product_ratings`
- `view_history`
- `product_views`
- `product_statistics`
- `requests`
- `audit_logs`

Также используется встроенная auth-коллекция `users`.

### 4) Выдайте первого администратора
После регистрации пользователя:
- создайте/обновите запись в `user_profiles`
- поставьте `is_admin = true`
- `id` профиля может совпадать с `users.id` или быть связан через поле `user`

### 5) Запустите проект

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Важные заметки
- Файл `lib/supabase.ts` сохранен как совместимый API-слой, но внутри работает через PocketBase.
- Legacy SQL-файлы `supabase-*.sql` оставлены как архив старой интеграции и больше не являются источником истины.
