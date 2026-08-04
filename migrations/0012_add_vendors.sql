CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  product TEXT,
  website_link TEXT,
  max_discount TEXT,
  delivery_time TEXT,
  files TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
