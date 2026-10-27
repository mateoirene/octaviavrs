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

CREATE TABLE IF NOT EXISTS garage_moderation (
 member_id TEXT PRIMARY KEY REFERENCES garage_members(id) ON DELETE CASCADE,
 status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
 note TEXT NOT NULL DEFAULT '', submitted_at INTEGER NOT NULL,
 reviewed_by TEXT, reviewed_at INTEGER
);
CREATE INDEX IF NOT EXISTS garage_moderation_pending ON garage_moderation(status,submitted_at);
CREATE TABLE IF NOT EXISTS club_notifications (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL, href TEXT NOT NULL,
 audience TEXT NOT NULL CHECK(audience IN ('public','admin')), kind TEXT NOT NULL DEFAULT 'news', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS push_keys (id TEXT PRIMARY KEY, public_key TEXT NOT NULL, private_jwk TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS push_subscriptions (
 id TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES market_admins(id) ON DELETE CASCADE,
 endpoint TEXT NOT NULL, created_at INTEGER NOT NULL, last_status TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS club_events (
 id TEXT PRIMARY KEY,event_date TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,
 location TEXT NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,
 info_url TEXT NOT NULL,map_url TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,updated_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS club_events_date ON club_events(event_date,start_time);
INSERT INTO club_events SELECT 'calcotada-vrs-2027','2027-01-23','4.ª edición Calçotada VRS','Nos vemos en la próxima quedada del CLUB OCTAVIA VRS CATALUÑA para compartir nuestra pasión por los coches.','Embolic by moon','13:00','17:00','https://www.instagram.com/s/aGlnaGxpZ2h0OjE3OTg5Mzk3OTk0MDQ4NTgx?story_media_id=3991193257735061550_62570715173&dlrf=MXBqcDN2czQwd2R0NQ==','https://maps.app.goo.gl/Eatg8mFQYyJ1DGB56?g_st=aw',0,0,'initial-calendar' WHERE NOT EXISTS(SELECT 1 FROM market_settings WHERE key='calendar-seeded-v1') ON CONFLICT(id) DO NOTHING;
INSERT INTO market_settings(key,value) VALUES('calendar-seeded-v1','yes') ON CONFLICT(key) DO NOTHING;
CREATE TABLE IF NOT EXISTS club_directory_lists (
 id TEXT PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE UNIQUE,kind TEXT NOT NULL CHECK(kind IN ('collaborators','interest')),created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS club_directory_links (
 id TEXT PRIMARY KEY,list_id TEXT NOT NULL REFERENCES club_directory_lists(id) ON DELETE CASCADE,
 name TEXT NOT NULL,url TEXT NOT NULL,description TEXT NOT NULL,platform TEXT NOT NULL,created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS club_directory_links_list ON club_directory_links(list_id,created_at);

CREATE TABLE IF NOT EXISTS club_social_lists (
 id TEXT PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE UNIQUE,kind TEXT NOT NULL CHECK(kind IN ('collaborators','interest')),created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS club_social_links (
 id TEXT PRIMARY KEY,list_id TEXT NOT NULL REFERENCES club_social_lists(id) ON DELETE CASCADE,
 name TEXT NOT NULL,url TEXT NOT NULL,description TEXT NOT NULL,platform TEXT NOT NULL,created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS market_edit_versions (listing_id TEXT PRIMARY KEY REFERENCES market_listings(id) ON DELETE CASCADE,token TEXT NOT NULL,edited_by TEXT NOT NULL,edited_at INTEGER NOT NULL);

-- Fecha completa privada en la ficha; calendario público solo con día y mes.
CREATE TABLE IF NOT EXISTS garage_birthdays (
 member_id TEXT PRIMARY KEY REFERENCES garage_members(id) ON DELETE CASCADE,
 birth_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS web_analytics_events (
 id TEXT PRIMARY KEY,stamp INTEGER NOT NULL,day TEXT NOT NULL,visitor TEXT NOT NULL,session TEXT NOT NULL,
 name TEXT NOT NULL,page TEXT NOT NULL,section TEXT NOT NULL DEFAULT '',params TEXT NOT NULL DEFAULT '{}',
 source TEXT NOT NULL,device TEXT NOT NULL,active_ms INTEGER NOT NULL DEFAULT 0,lap_ms INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS web_analytics_day ON web_analytics_events(day,name);

CREATE TABLE IF NOT EXISTS web_analytics_config(key TEXT PRIMARY KEY,value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS club_news_posts(
 id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,link_url TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL DEFAULT 'Noticia',expires_on TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS club_media_files(id TEXT PRIMARY KEY,content_type TEXT NOT NULL,size INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS club_media_chunks(file_id TEXT NOT NULL REFERENCES club_media_files(id) ON DELETE CASCADE,position INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(file_id,position));
CREATE TABLE IF NOT EXISTS club_bricos(id TEXT PRIMARY KEY,title TEXT NOT NULL,author TEXT NOT NULL,category TEXT NOT NULL,vehicle TEXT NOT NULL,steps TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),edit_hash TEXT NOT NULL,review_note TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS club_brico_media(id TEXT PRIMARY KEY,brico_id TEXT NOT NULL REFERENCES club_bricos(id) ON DELETE CASCADE,content_type TEXT NOT NULL,caption TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS club_brico_comments(id TEXT PRIMARY KEY,brico_id TEXT NOT NULL REFERENCES club_bricos(id) ON DELETE CASCADE,author TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS club_bricos_status ON club_bricos(status,updated_at);
CREATE TRIGGER IF NOT EXISTS gallery_media_capacity BEFORE INSERT ON gallery_photos WHEN (SELECT COUNT(*) FROM gallery_photos WHERE folder_id=NEW.folder_id)>=100 BEGIN SELECT RAISE(ABORT,'Álbum completo: máximo 100 archivos'); END;
CREATE TRIGGER IF NOT EXISTS brico_media_capacity BEFORE INSERT ON club_brico_media WHEN (SELECT COUNT(*) FROM club_brico_media WHERE brico_id=NEW.brico_id)>=10 BEGIN SELECT RAISE(ABORT,'Tutorial completo: máximo 10 archivos'); END;
