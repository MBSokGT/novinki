# Новинки ассортимента

Веб-приложение для каталога новинок и админ-управления. Стек: `Next.js + Node.js + SQLite`, разворачивается как обычное Node-приложение (PM2 или Docker) за nginx.

## Стек
- Next.js 16 (standalone-сборка)
- React 19
- Tailwind CSS
- SQLite (`better-sqlite3`)

## Быстрый старт

### 1. Установите зависимости
```bash
npm install
```

### 2. Настройте переменные
Скопируйте [.env.example](.env.example) в `.env` и заполните значения. Ключевые:
- `SQLITE_DB_PATH` — путь к файлу базы данных
- `APP_URL` — полный URL страницы восстановления пароля
- `NEXT_PUBLIC_BASE_PATH` — если приложение размещено на подпути (например `/novinki`)
- `NEXT_PUBLIC_STORAGE_DRIVER` / `UPLOAD_DIR` — хранить фото/PDF в базе (`base64`, по умолчанию) или на диске (`filesystem`)

Полная инструкция по развёртыванию на новом сервере — в [DEPLOYMENT.md](DEPLOYMENT.md).

### 3. Создайте первый аккаунт
В приложении нет публичной регистрации. Первый (и любой последующий) аккаунт создаётся вручную:
```bash
npm run seed:admin -- admin@example.com 'надёжный-пароль'
```
Дальше через `/admin/users` уже залогиненный администратор может добавлять других сотрудников.

Вход на сайте доступен через незаметную иконку в правом верхнем углу шапки (`/login`), публичных ссылок на неё нет.

### 4. Локальная разработка
```bash
npm run dev
```

### 5. Прод-сборка
```bash
npm run build
npm run start
```
Миграции из папки `migrations/` применяются автоматически при первом обращении к базе.

## Деплой

### Node.js + PM2
1. `npm install && npm run build`
2. Запустить `.next/standalone/server.js` под PM2 (`pm2 start .next/standalone/server.js --name novinki-app`)
3. Прокинуть домен через nginx (см. `PORT`, `NEXT_PUBLIC_BASE_PATH` в `.env`)

### Docker
```bash
docker compose up -d --build
```
См. [Dockerfile](Dockerfile) и [docker-compose.yml](docker-compose.yml). Данные SQLite сохраняются в volume `novinki-data`.

## Схема базы данных
Миграции лежат в [migrations/](migrations). Основные таблицы:
- `users`, `user_profiles`, `sessions`, `password_reset_tokens`
- `products`, `deleted_products`, `archived_products`
- `bookmarks`, `product_ratings`, `view_history`, `product_views`
- `categories`, `tags`, `site_settings`
- `requests`

И view `product_statistics`.
