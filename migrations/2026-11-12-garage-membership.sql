-- Rerunnable migration: remap old numbers once into random unique values 0..900.
CREATE TABLE IF NOT EXISTS garage_memberships (
  member_id TEXT PRIMARY KEY REFERENCES garage_members(id) ON DELETE CASCADE,
  number INTEGER NOT NULL UNIQUE,
  issued_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS garage_memberships_v2 (
  member_id TEXT PRIMARY KEY REFERENCES garage_members(id) ON DELETE CASCADE,
  number INTEGER NOT NULL UNIQUE CHECK(number BETWEEN 0 AND 900),
  issued_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO garage_memberships_v2(member_id,number,issued_at)
WITH RECURSIVE pool(number) AS (
  SELECT 0 UNION ALL SELECT number+1 FROM pool WHERE number<900
), old_members AS (
  SELECT member_id,issued_at,row_number() OVER(ORDER BY random()) AS rank FROM garage_memberships
), random_pool AS (
  SELECT number,row_number() OVER(ORDER BY random()) AS rank FROM pool
)
SELECT old_members.member_id,random_pool.number,old_members.issued_at
FROM old_members JOIN random_pool USING(rank);
INSERT OR IGNORE INTO garage_memberships_v2(member_id,number,issued_at)
WITH RECURSIVE pool(number) AS (
  SELECT 0 UNION ALL SELECT number+1 FROM pool WHERE number<900
), missing_members AS (
  SELECT id, row_number() OVER(ORDER BY random()) AS rank FROM garage_members
  WHERE NOT EXISTS(SELECT 1 FROM garage_memberships_v2 WHERE member_id=garage_members.id)
), free_pool AS (
  SELECT number,row_number() OVER(ORDER BY random()) AS rank FROM pool
  WHERE NOT EXISTS(SELECT 1 FROM garage_memberships_v2 WHERE number=pool.number)
)
SELECT missing_members.id,free_pool.number,unixepoch()
FROM missing_members JOIN free_pool USING(rank);
DROP TRIGGER IF EXISTS garage_membership_created;
DROP TRIGGER IF EXISTS garage_membership_missing;
DROP TABLE garage_memberships;
ALTER TABLE garage_memberships_v2 RENAME TO garage_memberships;
CREATE TRIGGER garage_membership_created AFTER INSERT ON garage_members
BEGIN
 INSERT INTO garage_memberships(member_id,number,issued_at)
 SELECT NEW.id,(SELECT number FROM (
   WITH RECURSIVE pool(n) AS (SELECT 0 UNION ALL SELECT n+1 FROM pool WHERE n<900)
   SELECT n AS number FROM pool WHERE NOT EXISTS(SELECT 1 FROM garage_memberships m WHERE m.number=pool.n) ORDER BY random() LIMIT 1
 )),unixepoch();
END;
CREATE TRIGGER garage_membership_missing AFTER UPDATE ON garage_members
WHEN NOT EXISTS(SELECT 1 FROM garage_memberships WHERE member_id=NEW.id)
BEGIN
 INSERT INTO garage_memberships(member_id,number,issued_at)
 SELECT NEW.id,(SELECT number FROM (
   WITH RECURSIVE pool(n) AS (SELECT 0 UNION ALL SELECT n+1 FROM pool WHERE n<900)
   SELECT n AS number FROM pool WHERE NOT EXISTS(SELECT 1 FROM garage_memberships m WHERE m.number=pool.n) ORDER BY random() LIMIT 1
 )),unixepoch();
END;
UPDATE garage_members SET id=id
WHERE NOT EXISTS(SELECT 1 FROM garage_memberships WHERE member_id=garage_members.id);

