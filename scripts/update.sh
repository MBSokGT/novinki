#!/bin/bash
# Pull the latest code from GitHub and redeploy, without touching the
# database or uploaded files. Run this ON THE SERVER (not on your laptop).
#
# What this does NOT touch: data/novinki.db, uploads/ — both are gitignored,
# never part of the repo, so downloading/extracting the latest code never
# sees them. DB migrations only ever ADD columns/tables, never delete rows.
# Your products/categories/users are untouched by this script.
#
# Usage (as root, or with a user that owns /var/www/novinki-app):
#   cd /var/www/novinki-app
#   bash scripts/update.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/novinki-app}"
REPO_URL="${REPO_URL:-https://github.com/MBSokGT/novinki}"
BRANCH="${BRANCH:-main}"
BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/novinki}"
STORAGE_DRIVER="${NEXT_PUBLIC_STORAGE_DRIVER:-filesystem}"
PM2_NAME="${PM2_NAME:-novinki-app}"

cd "$APP_DIR"

count_products() {
  node -e "
    try {
      const Database = require('better-sqlite3');
      const db = new Database('data/novinki.db');
      console.log(db.prepare('SELECT COUNT(*) c FROM products').get().c);
    } catch (e) { console.log('?'); }
  " 2>/dev/null
}

echo "==> Бэкап базы и файлов перед обновлением..."
if [ -x ./scripts/backup.sh ]; then
  APP_DIR="$APP_DIR" ./scripts/backup.sh
  echo "    (бэкап лежит в /root/backups/novinki по умолчанию)"
else
  echo "    scripts/backup.sh не найден — пропускаю (не критично, данные и так не трогаем)"
fi

BEFORE_COUNT="$(count_products)"
echo "==> Товаров в базе ДО обновления: $BEFORE_COUNT"

echo "==> Скачивание последней версии кода с GitHub ($BRANCH)..."
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
curl -sL "$REPO_URL/archive/refs/heads/$BRANCH.tar.gz" -o "$TMP_DIR/src.tar.gz"
tar -xzf "$TMP_DIR/src.tar.gz" -C "$TMP_DIR"
SRC_DIR="$(find "$TMP_DIR" -maxdepth 1 -type d -name 'novinki-*')"

if [ -z "$SRC_DIR" ]; then
  echo "!! Не удалось скачать/распаковать архив с GitHub. Проверьте интернет и REPO_URL."
  exit 1
fi

echo "==> Обновление файлов кода (данные и загрузки не трогаем)..."
rsync -a --delete \
  --exclude 'data' \
  --exclude 'uploads' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env' \
  --exclude '.env.local' \
  "$SRC_DIR/" "$APP_DIR/"

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
