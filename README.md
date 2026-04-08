# Новинки ассортимента

Веб-приложение для каталога новинок и админ-управления. Текущий production-стек: `Next.js + Cloudflare Workers + D1`.

## Стек
- Next.js 16
- React 19
- Tailwind CSS
- Cloudflare D1
- Wrangler
- OpenNext for Cloudflare

## Быстрый старт

### 1. Установите зависимости
```bash
npm install
```

### 2. Создайте D1 базу
```bash
npx wrangler d1 create my-db-name
```

В проекте уже создана база `my-db-name`, а ее `database_id` прописан в [wrangler.jsonc](/Users/admin/Desktop/Новинки/novinki-app/wrangler.jsonc).

### 3. Примените миграции
```bash
npx wrangler d1 migrations apply my-db-name --remote
```

Локально:
```bash
npx wrangler d1 migrations apply my-db-name
```

### 4. Настройте переменные
См. [.env.example](/Users/admin/Desktop/Новинки/novinki-app/.env.example).

Основные значения:
- `APP_URL` - полный URL страницы восстановления, например `https://example.com/reset-password`
- `REQUEST_WEBHOOK_URL` - webhook для заявок
- `PASSWORD_RESET_WEBHOOK_URL` - webhook для отправки reset-ссылок
- `NEXT_PUBLIC_DEMO_MODE=true` - только если нужен demo-режим без D1

### 5. Локальная разработка
```bash
npm run dev
```

Для preview в Cloudflare runtime:
```bash
npm run cf:preview
```

## D1 схема
Начальная схема лежит в [migrations/0001_initial.sql](/Users/admin/Desktop/Новинки/novinki-app/migrations/0001_initial.sql).

Основные таблицы:
- `users`
- `user_profiles`
- `sessions`
- `password_reset_tokens`
- `products`
- `bookmarks`
- `product_ratings`
- `view_history`
- `product_views`
- `categories`
- `tags`
- `site_settings`
- `deleted_products`
- `archived_products`
- `requests`
- `product_requests`
- `audit_logs`

И view:
- `product_statistics`

## Деплой в Cloudflare
```bash
npm run cf:deploy
```

Проект больше не ориентирован на Vercel. Runtime и база теперь Cloudflare-first.
