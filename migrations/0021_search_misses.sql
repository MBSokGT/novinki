-- Что искали в каталоге и не нашли: запрос (в нормальном виде), сколько раз и когда.
-- Личных данных нет — только текст запроса.
CREATE TABLE IF NOT EXISTS search_misses (
  query TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  first_at TEXT NOT NULL,
  last_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_misses_last_at ON search_misses(last_at);
