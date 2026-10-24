PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS market_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS market_admins (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 salt TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS market_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES market_admins(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS market_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS market_listings (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
 price REAL NOT NULL CHECK(price >= 0), condition TEXT NOT NULL, compatibility TEXT NOT NULL,
 location TEXT NOT NULL, seller TEXT NOT NULL, contact_type TEXT NOT NULL, contact_value TEXT NOT NULL,
 contact_url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','sold')),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, reviewed_by TEXT, review_note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS market_listings_status ON market_listings(status, created_at DESC);
CREATE TABLE IF NOT EXISTS market_photos (
 id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
 content_type TEXT NOT NULL, data BLOB NOT NULL, position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS market_photos_listing ON market_photos(listing_id, position);
CREATE TABLE IF NOT EXISTS market_reviews (
 id INTEGER PRIMARY KEY AUTOINCREMENT, listing_id TEXT NOT NULL, old_status TEXT NOT NULL,
 new_status TEXT NOT NULL, actor TEXT, note TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS market_review_audit AFTER UPDATE OF status ON market_listings
WHEN OLD.status <> NEW.status
BEGIN
 INSERT INTO market_reviews(listing_id,old_status,new_status,actor,note,created_at)
 VALUES(NEW.id,OLD.status,NEW.status,NEW.reviewed_by,NEW.review_note,NEW.updated_at);
END;

CREATE TABLE IF NOT EXISTS market_review_mail (
 listing_id TEXT PRIMARY KEY REFERENCES market_listings(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed','cancelled')),
 attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, sent_at INTEGER,
 last_error TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS market_review_mail_status ON market_review_mail(status,created_at);


-- El borrado definitivo elimina también las notas del historial del anuncio.
-- Las fotografías y los avisos de correo se eliminan mediante ON DELETE CASCADE.
CREATE TRIGGER IF NOT EXISTS market_listing_cleanup BEFORE DELETE ON market_listings
BEGIN
 DELETE FROM market_reviews WHERE listing_id=OLD.id;
END;

CREATE TABLE IF NOT EXISTS garage_folders (
 id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS garage_members (
 id TEXT PRIMARY KEY, folder_id TEXT NOT NULL REFERENCES garage_folders(id),
 pilot TEXT NOT NULL, instagram TEXT NOT NULL DEFAULT '', model TEXT NOT NULL,
 engine TEXT NOT NULL DEFAULT '', power TEXT NOT NULL DEFAULT '', year TEXT NOT NULL DEFAULT '',
 gearbox TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS garage_members_folder ON garage_members(folder_id,created_at DESC);
CREATE TABLE IF NOT EXISTS garage_photos (
 id TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES garage_members(id) ON DELETE CASCADE,
 content_type TEXT NOT NULL, data BLOB NOT NULL, position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS garage_photos_member ON garage_photos(member_id,position);

CREATE TABLE IF NOT EXISTS gallery_folders (
 id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, category TEXT NOT NULL,
 event_date TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS gallery_photos (
 id TEXT PRIMARY KEY, folder_id TEXT NOT NULL REFERENCES gallery_folders(id) ON DELETE CASCADE,
 caption TEXT NOT NULL DEFAULT '', content_type TEXT NOT NULL, data BLOB NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS gallery_photos_folder ON gallery_photos(folder_id,created_at);

CREATE TABLE IF NOT EXISTS garage_profiles (
 member_id TEXT PRIMARY KEY REFERENCES garage_members(id) ON DELETE CASCADE,
 phone TEXT NOT NULL DEFAULT '', content_type TEXT, data BLOB
);

CREATE TABLE IF NOT EXISTS racing_results (
 id TEXT PRIMARY KEY, pilot TEXT NOT NULL, level TEXT NOT NULL CHECK(level IN ('easy','intermediate','expert')),
 total_ms INTEGER NOT NULL CHECK(total_ms>0), best_ms INTEGER NOT NULL CHECK(best_ms>0),
 laps_json TEXT NOT NULL, position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 4), created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS racing_results_level ON racing_results(level,total_ms,created_at);

-- Metadatos separados: conserva todos los tiempos históricos sin ALTER ni borrados.
CREATE TABLE IF NOT EXISTS racing_entries (
 result_id TEXT PRIMARY KEY REFERENCES racing_results(id) ON DELETE CASCADE,
 racer_id TEXT NOT NULL, circuit TEXT NOT NULL, car TEXT NOT NULL,
 paint TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('free','championship'))
);
CREATE INDEX IF NOT EXISTS racing_entries_circuit ON racing_entries(circuit,result_id);
CREATE INDEX IF NOT EXISTS racing_entries_racer ON racing_entries(racer_id,mode,circuit);
