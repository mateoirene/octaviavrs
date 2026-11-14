-- Accesos delegados separados de la identidad inmutable del propietario.
CREATE TABLE IF NOT EXISTS club_delegated_admins(
 id TEXT PRIMARY KEY, member_id TEXT NOT NULL UNIQUE REFERENCES garage_members(id) ON DELETE CASCADE,
 alias TEXT NOT NULL, permissions_json TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),
 password_hash TEXT NOT NULL DEFAULT '', salt TEXT NOT NULL DEFAULT '',
 invite_hash TEXT NOT NULL DEFAULT '', invite_expires INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS club_delegated_sessions(
 token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES club_delegated_admins(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS club_delegated_sessions_admin ON club_delegated_sessions(admin_id);
