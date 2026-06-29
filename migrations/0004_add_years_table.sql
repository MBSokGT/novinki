CREATE TABLE IF NOT EXISTS years (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

INSERT INTO years (id, name, created_at)
SELECT lower(hex(randomblob(16))), '2025', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM years WHERE name = '2025');

INSERT INTO years (id, name, created_at)
SELECT lower(hex(randomblob(16))), '2026', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM years WHERE name = '2026');

INSERT INTO years (id, name, created_at)
SELECT lower(hex(randomblob(16))), '2027', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM years WHERE name = '2027');
