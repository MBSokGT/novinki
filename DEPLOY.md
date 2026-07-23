# Новинки ассортимента — инструкция по выпуску и обслуживанию

Внутренний каталог новинок для сотрудников «Комплекс-Бар». Next.js 16 (App Router) +
better-sqlite3, без внешних сервисов (Supabase/Cloudflare только в именах — по факту
всё локально на одном VPS).

## Стек и топология

- **Приложение**: Next.js, `output: 'standalone'`, собирается в `.next/standalone`
- **БД**: `better-sqlite3`, файл `data/novinki.db` (WAL-режим), путь задаётся `SQLITE_DB_PATH`
- **Файлы** (фото/PDF): локальная файловая система, каталог `uploads/`
- **Процесс-менеджер**: PM2, имя процесса `novinki-app`, режим fork
- **Путь на сервере**: `/var/www/novinki-app/`
- **Порт приложения**: слушает на **3001** (не 3000 — см. `pm2 env 0 | grep PORT` при сомнении)
- **Base path**: `/novinki` — сайт живёт под `https://<домен>/novinki/...`, обязательно
  прокинуто через nginx/обратный прокси на порт 3001

## Переменные окружения (обязательны при сборке!)

```bash
NEXT_PUBLIC_BASE_PATH=/novinki
NEXT_PUBLIC_STORAGE_DRIVER=filesystem
```

Эти переменные **вшиваются в билд** (Next.js инлайнит `NEXT_PUBLIC_*` в клиентский
бандл), поэтому их нельзя просто прописать в `.env` на сервере и не пересобирать —
если поменяли базовый путь, нужен полный `npm run build` заново.

## Обновление до последней версии (для IT)

Один готовый скрипт вместо ручных шагов ниже:

- Если приложение запущено напрямую через PM2 (без Docker):
  ```bash
  cd /путь/к/novinki-app   # та же папка, куда делали git clone
  bash scripts/update.sh
  ```
- Если приложение запущено через Docker Compose:
  ```bash
  cd /путь/к/novinki-app
  bash scripts/update-docker.sh
  ```

Оба скрипта: делают бэкап → тянут код из GitHub → пересобирают → перезапускают →
сверяют число товаров в базе до/после. **Данные (`data/novinki.db`, `uploads/`,
Docker-тома `novinki-data`/`novinki-uploads`) не трогают** — сборка кода и хранение
данных физически разделены.

`scripts/update.sh` протестирован end-to-end на боевом окружении (в т.ч. дважды
подряд, чтобы поймать проблемы с "грязным" git-деревом после сборки).
`scripts/update-docker.sh` проверен по чтению `Dockerfile`/`docker-compose.yml` и
стандартной семантике Docker (именованные тома переживают `up --build`, их удаляет
только `down -v`, которого скрипт не делает), но не прогонялся живьём на реальном
Docker-хосте — если что-то пойдёт не так, сначала проверьте `docker compose ps` и
`docker compose logs novinki-app`.

## Деплой (стандартный цикл, вручную — если скрипт не подошёл)

Локально, из корня репозитория:

```bash
# 1. Собрать и проверить локально
NEXT_PUBLIC_BASE_PATH=/novinki NEXT_PUBLIC_STORAGE_DRIVER=filesystem npm run build

# 2. Залить исходники на сервер (БЕЗ node_modules/.next/data/uploads — это на сервере своё)
rsync -az --exclude 'node_modules' --exclude '.next' --exclude 'data' --exclude 'uploads' --exclude '.git' \
  -e "ssh -o StrictHostKeyChecking=no" . root@<IP_СЕРВЕРА>:/var/www/novinki-app/

# 3. На сервере: пересобрать и перезапустить
ssh root@<IP_СЕРВЕРА>
cd /var/www/novinki-app
export PATH=$PATH:/root/.nvm/versions/node/$(ls /root/.nvm/versions/node/ | tail -1)/bin
NEXT_PUBLIC_BASE_PATH=/novinki NEXT_PUBLIC_STORAGE_DRIVER=filesystem npm run build
pm2 restart novinki-app
pm2 status novinki-app
```

**Важно**: `data/`, `uploads/` на сервере — это боевые данные, их исключаем из rsync,
чтобы не затереть. Миграции БД (см. ниже) применяются автоматически при первом
обращении приложения к базе после рестарта — **не** при простом `curl` HTML-страницы
(она рендерится на клиенте), а при реальном API-запросе. Так что после деплоя стоит
either открыть сайт в браузере и полистать, либо явно дёрнуть:

```bash
curl -s -X POST http://localhost:3001/novinki/api/internal/data \
  -H 'Content-Type: application/json' \
  -d '{"collection":"categories","operation":"select","selectColumns":"*"}'
```
— если вернулся `data: [...]` без ошибок, миграции применились и БД в порядке.

## Проверка после каждого деплоя (чек-лист)

```bash
# Процесс жив
pm2 status novinki-app        # status: online

# Свежих ошибок в логе не прибавилось
wc -l /root/.pm2/logs/novinki-app-error.log   # сравнить с числом ДО деплоя

# Ключевые страницы отвечают 200
curl -sL -o /dev/null -w '%{http_code}\n' http://localhost:3001/novinki/
curl -sL -o /dev/null -w '%{http_code}\n' http://localhost:3001/novinki/admin
curl -sL -o /dev/null -w '%{http_code}\n' http://localhost:3001/novinki/login

# Данные не потерялись (сверить count до/после)
node -e "
const Database = require('better-sqlite3');
const db = new Database('data/novinki.db');
console.log('products:', db.prepare('SELECT COUNT(*) c FROM products').get().c);
"
```

## Миграции БД

Файлы в `migrations/*.sql`, применяются по порядку имени файла (`0001_...`,
`0002_...`, ...), однократно — уже применённые трекаются в служебной таблице
`_migrations`. **Никогда не редактируйте уже задеплоенную миграцию** — добавляйте
новый файл с следующим номером. Миграции запускаются автоматически кодом
приложения (`lib/sqlite.ts`), вручную ничего катить не нужно.

При добавлении новой колонки в `products` — не забудьте также добавить её:
1. В `migrations/00XX_....sql` (`ALTER TABLE products ADD COLUMN ...`) — и в
   `deleted_products`/`archived_products`, если поле должно переживать
   удаление/архивацию.
2. В белый список `PRODUCT_COLUMNS` в `lib/db.ts` — **это отдельный список**, не
   выводится автоматически из схемы БД. Если забыть этот шаг, колонка будет тихо
   игнорироваться при `select('*')`, `insert()` и `update()` без единой ошибки в
   логах — ровно так дважды ловили баг в этом релизе (`price_list_url`, `bumped_at`).
3. В `types/product.ts` (TypeScript-тип `Product`).

## Учётные записи

- Первый админ создаётся вручную через прямой SQL-инсерт (см. `lib/db.ts` функцию
  `updateUserPassword`/`confirmPasswordReset` для формата хеша — `scrypt`, соль:хеш
  через `:`, минимум 8 символов).
- Дальше новых сотрудников заводит существующий админ через `/admin/users` —
  «Добавить сотрудника» сразу создаёт аккаунт с паролем, дополнительного
  подтверждения не требует.
- Сброс пароля **не самообслуживаемый** — на `/login` кнопка «Забыли пароль?»
  ведёт на статичный экран с просьбой написать администратору. Реальный
  сброс — через `/admin/users` → «Сменить пароль» у нужного пользователя.
- Страница `/reset-password` используется только по прямой ссылке с токеном,
  которую генерирует администратор — это не публичная точка входа.

## Известные особенности (не баги)

- Порт приложения — **3001**, не 3000 (легко перепутать при живой отладке через SSH).
- PM2 `exec cwd` — это `.next/standalone`, а не корень репозитория; при ручной
  отладке через `node -e` открывайте БД из корня репо (`/var/www/novinki-app`),
  где реально лежит `data/novinki.db` (путь абсолютный, задан `SQLITE_DB_PATH`).
- Импортированные через Excel товары всегда попадают в статус «Архив» (черновик) —
  это осознанно, чтобы админ проверил данные перед публикацией.

## Если что-то пошло не так

1. `pm2 logs novinki-app --lines 50` — смотреть на свежие ошибки (не старые, лог не
   чистится между рестартами).
2. Откатить код: `git log --oneline -10` локально → `git checkout <commit>` →
   повторить цикл деплоя выше.
3. БД физически не трогается при откате кода — миграции необратимы (нет
   down-миграций), так что откат кода на более раннюю версию с более новой схемой
   БД может привести к ошибкам "unsupported sort field/column" — в таком случае
   откатывать код нужно вместе с восстановлением БД из бэкапа (если он есть) или
   аккуратно вручную выпилить лишние колонки.
