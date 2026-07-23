#!/bin/bash
# Pull the latest code from GitHub (via git) and redeploy via Docker Compose,
# without touching the database or uploaded files. Run this ON THE SERVER,
# from inside the git checkout (the same directory with docker-compose.yml).
#
# Use THIS script if the app runs via `docker compose up`. If it runs
# directly under PM2 (no Docker), use scripts/update.sh instead.
#
# Why data is safe: data/novinki.db and uploads/ live in named Docker
# volumes (novinki-data, novinki-uploads — see docker-compose.yml), not
# inside the container's writable layer. `docker compose up -d --build`
# rebuilds the image and recreates the container, but named volumes are
# NOT deleted by this — only `docker compose down -v` or an explicit
# `docker volume rm` would do that, and this script never runs either.
#
# Usage:
#   cd /path/to/novinki-app
#   bash scripts/update-docker.sh
set -euo pipefail

BRANCH="${BRANCH:-main}"
SERVICE="${SERVICE:-novinki-app}"

if [ ! -d .git ]; then
  echo "!! Эта папка — не git-репозиторий (.git не найден)."
  echo "!! Запускайте скрипт из той же папки, куда делали 'git clone', на сервере."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "!! Не найден ни 'docker compose', ни 'docker-compose'. Docker точно тут используется?"
  echo "!! Если нет — используйте scripts/update.sh."
  exit 1
fi

count_products() {
  $DC exec -T "$SERVICE" node -e "
    try {
      const Database = require('better-sqlite3');
      const db = new Database(process.env.SQLITE_DB_PATH || '/app/data/novinki.db');
      console.log(db.prepare('SELECT COUNT(*) c FROM products').get().c);
    } catch (e) { console.log('?'); }
  " 2>/dev/null | tr -d '\r'
}

echo "==> Проверка на незакоммиченные локальные изменения в коде..."
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "!! На сервере есть незакоммиченные изменения в отслеживаемых файлах кода."
  echo "!! Прерываю, чтобы не потерять их молча. Посмотрите 'git status' и разберитесь"
  echo "!! (закоммитьте, застэшьте или сбросьте — 'git stash'), потом запустите скрипт снова."
  git status --short --untracked-files=no
  exit 1
fi

echo "==> Бэкап базы и файлов из работающего контейнера..."
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
if $DC ps --status running 2>/dev/null | grep -q "$SERVICE"; then
  $DC cp "$SERVICE:/app/data/novinki.db" "$BACKUP_DIR/novinki_${STAMP}.db" 2>/dev/null \
    && echo "    БД: $BACKUP_DIR/novinki_${STAMP}.db"
  $DC exec -T "$SERVICE" tar -czf - -C /app uploads > "$BACKUP_DIR/uploads_${STAMP}.tar.gz" 2>/dev/null \
    && echo "    Файлы: $BACKUP_DIR/uploads_${STAMP}.tar.gz"
else
  echo "    Контейнер сейчас не запущен — бэкап через 'docker compose cp' пропущен."
  echo "    Сами данные всё равно в целости в Docker-томах (novinki-data, novinki-uploads)."
fi

BEFORE_COUNT="$(count_products || echo '?')"
echo "==> Товаров в базе ДО обновления: $BEFORE_COUNT"

echo "==> git fetch + переключение на актуальный $BRANCH..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Пересборка образа и перезапуск (данные в volumes не трогаются)..."
$DC up -d --build "$SERVICE"

echo "==> Ждём, пока контейнер поднимется..."
sleep 5

echo "==> Статус контейнера:"
$DC ps "$SERVICE"

AFTER_COUNT="$(count_products || echo '?')"
echo "==> Товаров в базе ПОСЛЕ обновления: $AFTER_COUNT"

if [ "$BEFORE_COUNT" != "?" ] && [ "$BEFORE_COUNT" != "$AFTER_COUNT" ]; then
  echo "!! ВНИМАНИЕ: количество товаров изменилось ($BEFORE_COUNT -> $AFTER_COUNT)."
  echo "!! Это не обязательно ошибка (кто-то мог добавить/удалить товар прямо сейчас),"
  echo "!! но стоит открыть сайт и проверить руками."
else
  echo "==> Готово. Данные на месте ($AFTER_COUNT товаров)."
fi
