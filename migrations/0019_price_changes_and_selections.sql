-- Что подешевело: прошлая цена и время изменения хранятся прямо в карточке
-- (для значка «подешевело на 12%»), а каждое изменение — ещё и в журнале
-- price_changes (для списка в админке).
ALTER TABLE products ADD COLUMN price_prev REAL;
ALTER TABLE products ADD COLUMN price_changed_at TEXT;
ALTER TABLE deleted_products ADD COLUMN price_prev REAL;
ALTER TABLE deleted_products ADD COLUMN price_changed_at TEXT;
ALTER TABLE archived_products ADD COLUMN price_prev REAL;
ALTER TABLE archived_products ADD COLUMN price_changed_at TEXT;

CREATE TABLE IF NOT EXISTS price_changes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  article TEXT,
  old_price REAL NOT NULL,
  new_price REAL NOT NULL,
  currency TEXT,
  changed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_price_changes_changed_at ON price_changes(changed_at);

-- Подборка для клиента: менеджер собирает товары и отправляет ссылку.
-- По ссылке (token) подборка открывается без входа, но только с фото,
-- названиями и артикулами — внутренних данных там нет.
CREATE TABLE IF NOT EXISTS selections (
  token TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  product_ids TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
