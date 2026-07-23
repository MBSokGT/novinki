#!/bin/bash
# Pull the latest code from GitHub (via git) and redeploy, without touching
# the database or uploaded files. Run this ON THE SERVER, from inside the
# git checkout (the same directory you originally ran `git clone` into).
#
# What this does NOT touch: data/novinki.db, uploads/ — both are gitignored,
# never part of the repo, so `git pull` never sees them. DB migrations only
# ever ADD columns/tables, never delete rows. Your products/categories/users
# are untouched by this script.
#
# Usage (as root, or with a user that owns the app directory):
#   cd /path/to/novinki-app
#   bash scripts/update.sh
set -euo pipefail

BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/novinki}"
STORAGE_DRIVER="${NEXT_PUBLIC_STORAGE_DRIVER:-filesystem}"
PM2_NAME="${PM2_NAME:-novinki-app}"
BRANCH="${BRANCH:-main}"

if [ ! -d .git ]; then
  echo "!! Эта папка — не git-репозиторий (.git не найден)."
  echo "!! Запускайте скрипт из той же папки, куда делали 'git clone', на сервере."
  exit 1
fi

count_products() {
  node -e "
    try {
      const Database = require('better-sqlite3');
      const db = new Database(process.env.SQLITE_DB_PATH || 'data/novinki.db');
      console.log(db.prepare('SELECT COUNT(*) c FROM products').get().c);
    } catch (e) { console.log('?'); }
  " 2>/dev/null
}

echo "==> Проверка на незакоммиченные локальные изменения в коде..."
# --untracked-files=no: новые файлы вроде .env (серверный конфиг, не в git)
# это нормально и не должно останавливать обновление — важны только изменения
# в уже отслеживаемых файлах кода.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "!! На сервере есть незакоммиченные изменения в отслеживаемых файлах кода."
  echo "!! Прерываю, чтобы не потерять их молча. Посмотрите 'git status' и разберитесь"
  echo "!! (закоммитьте, застэшьте или сбросьте — 'git stash'), потом запустите скрипт снова."
  git status --short --untracked-files=no
  exit 1
fi

echo "==> Бэкап базы и файлов перед обновлением..."
if [ -x ./scripts/backup.sh ]; then
  ./scripts/backup.sh
  echo "    (бэкап лежит в /root/backups/novinki по умолчанию, см. scripts/backup.sh)"
else
  echo "    scripts/backup.sh не найден — пропускаю (не критично, данные и так не трогаем)"
fi

BEFORE_COUNT="$(count_products)"
echo "==> Товаров в базе ДО обновления: $BEFORE_COUNT"

echo "==> git fetch + переключение на актуальный $BRANCH..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> npm install (на случай новых зависимостей)..."
npm install

echo "==> Сборка (NEXT_PUBLIC_BASE_PATH=$BASE_PATH, NEXT_PUBLIC_STORAGE_DRIVER=$STORAGE_DRIVER)..."
NEXT_PUBLIC_BASE_PATH="$BASE_PATH" NEXT_PUBLIC_STORAGE_DRIVER="$STORAGE_DRIVER" npm run build

echo "==> Перезапуск PM2..."
pm2 restart "$PM2_NAME"
sleep 2

echo "==> Статус процесса:"
pm2 status "$PM2_NAME"

AFTER_COUNT="$(count_products)"
echo "==> Товаров в базе ПОСЛЕ обновления: $AFTER_COUNT"

if [ "$BEFORE_COUNT" != "?" ] && [ "$BEFORE_COUNT" != "$AFTER_COUNT" ]; then
  echo "!! ВНИМАНИЕ: количество товаров изменилось ($BEFORE_COUNT -> $AFTER_COUNT)."
  echo "!! Это не обязательно ошибка (кто-то мог добавить/удалить товар прямо сейчас),"
  echo "!! но стоит открыть сайт и проверить руками."
else
  echo "==> Готово. Данные на месте ($AFTER_COUNT товаров)."
fi
