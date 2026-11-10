-- CMS aditivo. No altera ni elimina tablas o filas existentes.
CREATE TABLE IF NOT EXISTS cms_content (
 id TEXT PRIMARY KEY, page_key TEXT NOT NULL, label TEXT NOT NULL,
 selector TEXT NOT NULL, content_type TEXT NOT NULL CHECK(content_type IN ('text','link','image','visibility','order')),
 draft_value TEXT NOT NULL DEFAULT '', published_value TEXT NOT NULL DEFAULT '',
 state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','scheduled','published','archived')),
 publish_at INTEGER, visible INTEGER NOT NULL DEFAULT 1 CHECK(visible IN (0,1)),
 version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cms_content_page ON cms_content(page_key,state,updated_at DESC);
CREATE TABLE IF NOT EXISTS cms_versions (
 id TEXT PRIMARY KEY, content_id TEXT NOT NULL, version INTEGER NOT NULL,
 snapshot_json TEXT NOT NULL, action TEXT NOT NULL CHECK(action IN ('draft','publish','schedule','archive','restore')),
 created_at INTEGER NOT NULL, admin_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cms_versions_content ON cms_versions(content_id,version DESC);
CREATE TABLE IF NOT EXISTS cms_custom_pages (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE,
 draft_title TEXT NOT NULL, published_title TEXT NOT NULL DEFAULT '',
 draft_description TEXT NOT NULL DEFAULT '', published_description TEXT NOT NULL DEFAULT '',
 draft_body TEXT NOT NULL DEFAULT '', published_body TEXT NOT NULL DEFAULT '',
 state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','scheduled','published','archived')),
 publish_at INTEGER, updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS cms_custom_page_versions (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL, version INTEGER NOT NULL,
 snapshot_json TEXT NOT NULL, created_at INTEGER NOT NULL, admin_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cms_page_versions_slug ON cms_custom_page_versions(slug,version DESC);
CREATE TABLE IF NOT EXISTS cms_settings (
 setting_key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cms_settings_versions (
 id TEXT PRIMARY KEY, setting_key TEXT NOT NULL, value_json TEXT NOT NULL,
 created_at INTEGER NOT NULL, admin_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cms_settings_versions_key ON cms_settings_versions(setting_key,created_at DESC);
CREATE TABLE IF NOT EXISTS cms_news (
 id TEXT PRIMARY KEY, draft_title TEXT NOT NULL, draft_body TEXT NOT NULL,
 draft_category TEXT NOT NULL, draft_link_url TEXT NOT NULL DEFAULT '',
 draft_media_id TEXT NOT NULL DEFAULT '', draft_media_type TEXT NOT NULL DEFAULT '',
 draft_expires_on TEXT NOT NULL DEFAULT '', draft_featured INTEGER NOT NULL DEFAULT 0 CHECK(draft_featured IN (0,1)),
 published_json TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','scheduled','published','archived')),
 publish_at INTEGER, version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cms_news_publish ON cms_news(state,publish_at,updated_at DESC);
CREATE TABLE IF NOT EXISTS cms_news_versions (
 id TEXT PRIMARY KEY, news_id TEXT NOT NULL, version INTEGER NOT NULL,
 snapshot_json TEXT NOT NULL, action TEXT NOT NULL, created_at INTEGER NOT NULL, admin_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cms_news_versions_item ON cms_news_versions(news_id,version DESC);
