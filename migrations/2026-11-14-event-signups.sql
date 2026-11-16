-- Inscripciones sencillas y acceso personal; conserva todas las listas de calçotada.
CREATE TABLE IF NOT EXISTS club_calcotada_events(event_id TEXT PRIMARY KEY REFERENCES club_events(id) ON DELETE CASCADE);
INSERT OR IGNORE INTO club_calcotada_events(event_id)
SELECT e.id FROM club_events e LEFT JOIN club_event_details d ON d.event_id=e.id
WHERE d.event_type='calcotada' OR lower(e.title) LIKE '%calçot%' OR lower(e.title) LIKE '%calcot%';
CREATE TABLE IF NOT EXISTS club_member_event_access(
 member_id TEXT PRIMARY KEY REFERENCES garage_members(id) ON DELETE CASCADE,
 invite_hash TEXT NOT NULL DEFAULT '',invite_expires INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS club_member_event_sessions(
 token_hash TEXT PRIMARY KEY,member_id TEXT NOT NULL REFERENCES garage_members(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS club_member_event_sessions_member ON club_member_event_sessions(member_id);
CREATE TABLE IF NOT EXISTS club_event_signups(
 event_id TEXT NOT NULL REFERENCES club_events(id) ON DELETE CASCADE,
 member_id TEXT NOT NULL REFERENCES garage_members(id) ON DELETE CASCADE,
 pilot_name TEXT NOT NULL,people_count INTEGER NOT NULL DEFAULT 1 CHECK(people_count BETWEEN 1 AND 20),
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,updated_by TEXT NOT NULL,
 PRIMARY KEY(event_id,member_id)
);


-- Autoría permanente de los eventos creados por socios. No reasigna eventos previos.
CREATE TABLE IF NOT EXISTS club_event_creators(
 event_id TEXT PRIMARY KEY REFERENCES club_events(id) ON DELETE CASCADE,
 member_id TEXT NOT NULL REFERENCES garage_members(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS club_event_creators_member ON club_event_creators(member_id);
