CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  is_blocked INTEGER NOT NULL DEFAULT 0,
  blocked_reason TEXT,
  blocked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  article_number TEXT,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  advantages TEXT NOT NULL,
  attention_points TEXT NOT NULL,
  website_link TEXT,
  onec_link TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  rating REAL,
  price REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS product_ratings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS view_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_views (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  product_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deleted_products (
  id TEXT PRIMARY KEY,
  original_product_id TEXT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  article_number TEXT,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  advantages TEXT NOT NULL,
  attention_points TEXT NOT NULL,
  website_link TEXT,
  onec_link TEXT,
  category TEXT,
  rating REAL,
  price REAL,
  created_at TEXT NOT NULL,
  deleted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS archived_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  article_number TEXT,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  advantages TEXT NOT NULL,
  attention_points TEXT NOT NULL,
  website_link TEXT,
  onec_link TEXT,
  category TEXT,
  rating REAL,
  price REAL,
  created_at TEXT NOT NULL,
  deleted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  product TEXT NOT NULL,
  article TEXT,
  delivered INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  product_name TEXT NOT NULL,
  article TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_product_id ON bookmarks(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_product_id ON product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_view_history_user_id ON view_history(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_deleted_products_deleted_at ON deleted_products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

DROP VIEW IF EXISTS product_statistics;

CREATE VIEW product_statistics AS
SELECT
  products.id AS id,
  products.name AS name,
  products.brand AS brand,
  COUNT(DISTINCT product_views.id) AS view_count,
  COUNT(DISTINCT bookmarks.id) AS bookmark_count
FROM products
LEFT JOIN product_views ON product_views.product_id = products.id
LEFT JOIN bookmarks ON bookmarks.product_id = products.id
GROUP BY products.id, products.name, products.brand;
