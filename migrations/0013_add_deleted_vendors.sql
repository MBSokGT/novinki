CREATE TABLE IF NOT EXISTS deleted_vendors (
  id TEXT PRIMARY KEY,
  original_vendor_id TEXT,
  name TEXT NOT NULL,
  image_url TEXT,
  product TEXT,
  website_link TEXT,
  max_discount TEXT,
  delivery_time TEXT,
  onec_products TEXT,
  files TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT,
  deleted_at TEXT NOT NULL
);
