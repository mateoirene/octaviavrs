-- Control reversible de visibilidad de fichas; no cambia estados ni datos de miembros.
CREATE TABLE IF NOT EXISTS garage_member_blocks (
 member_id TEXT PRIMARY KEY REFERENCES garage_members(id) ON DELETE CASCADE,
 is_blocked INTEGER NOT NULL DEFAULT 1 CHECK(is_blocked IN (0,1)),
 reason TEXT NOT NULL DEFAULT '', blocked_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL
);
