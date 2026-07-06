#!/bin/bash
# Daily backup of the SQLite DB and uploaded media (photos/PDFs).
# These are the only two locations with irreplaceable data — everything
# else (code, .next build) is reproducible from git + `npm run build`.
#
# Usage:
#   Edit APP_DIR/BACKUP_DIR below (or override via env vars), then run
#   manually once to check it works, and schedule daily via cron, e.g.:
#     0 3 * * * APP_DIR=/var/www/novinki-app /path/to/backup.sh >> /var/log/novinki-backup.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/novinki-app}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups/novinki}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

SRC_DB="$APP_DIR/data/novinki.db"
SRC_UPLOADS="$APP_DIR/uploads"
STAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ -f "$SRC_DB" ]; then
  cp "$SRC_DB" "$BACKUP_DIR/novinki_${STAMP}.db"
fi

if [ -d "$SRC_UPLOADS" ]; then
  tar -czf "$BACKUP_DIR/uploads_${STAMP}.tar.gz" -C "$(dirname "$SRC_UPLOADS")" "$(basename "$SRC_UPLOADS")"
fi

# Prune anything older than RETENTION_DAYS.
find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -delete
