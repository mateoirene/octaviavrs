-- A number is reserved once per garage identity, never regenerated on edits.
-- Pending/rejected identities are not exposed as members by the API.
CREATE TABLE IF NOT EXISTS garage_memberships (
  member_id TEXT PRIMARY KEY REFERENCES garage_members(id) ON DELETE CASCADE,
  number INTEGER NOT NULL UNIQUE CHECK(number BETWEEN 100000 AND 999999),
  issued_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS garage_membership_created AFTER INSERT ON garage_members
BEGIN
  INSERT INTO garage_memberships(member_id,number,issued_at)
  SELECT NEW.id,(
    WITH RECURSIVE candidates(n,attempt) AS (
      SELECT 100000+abs(random()%900000),0
      UNION ALL
      SELECT 100000+(n-100000+1)%900000,attempt+1 FROM candidates
      WHERE EXISTS(SELECT 1 FROM garage_memberships WHERE number=n) AND attempt<899999
    )
    SELECT n FROM candidates WHERE NOT EXISTS(SELECT 1 FROM garage_memberships WHERE number=n) LIMIT 1
  ),unixepoch();
END;
CREATE TRIGGER IF NOT EXISTS garage_membership_missing AFTER UPDATE ON garage_members
WHEN NOT EXISTS(SELECT 1 FROM garage_memberships WHERE member_id=NEW.id)
BEGIN
  INSERT INTO garage_memberships(member_id,number,issued_at)
  SELECT NEW.id,(
    WITH RECURSIVE candidates(n,attempt) AS (
      SELECT 100000+abs(random()%900000),0
      UNION ALL
      SELECT 100000+(n-100000+1)%900000,attempt+1 FROM candidates
      WHERE EXISTS(SELECT 1 FROM garage_memberships WHERE number=n) AND attempt<899999
    )
    SELECT n FROM candidates WHERE NOT EXISTS(SELECT 1 FROM garage_memberships WHERE number=n) LIMIT 1
  ),unixepoch();
END;
-- Backfill without changing photos, dates, moderation or existing numbers.
UPDATE garage_members SET id=id
WHERE NOT EXISTS(SELECT 1 FROM garage_memberships WHERE member_id=garage_members.id);
