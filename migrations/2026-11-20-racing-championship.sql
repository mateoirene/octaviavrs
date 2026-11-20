WITH ranked AS (
 SELECT r.level,e.racer_id,e.circuit,r.id,r.pilot,e.car,r.position,r.total_ms,r.created_at,
        ROW_NUMBER() OVER (
          PARTITION BY r.level,e.racer_id,e.circuit
          ORDER BY r.position,r.total_ms,r.created_at,r.id
        ) AS choice
 FROM racing_results r JOIN racing_entries e ON e.result_id=r.id
 WHERE e.mode='championship'
)
INSERT INTO racing_championship_best
SELECT level,racer_id,circuit,id,pilot,car,position,total_ms,created_at
FROM ranked WHERE choice=1
ON CONFLICT(level,racer_id,circuit) DO UPDATE SET
 result_id=excluded.result_id,pilot=excluded.pilot,car=excluded.car,
 position=excluded.position,total_ms=excluded.total_ms,created_at=excluded.created_at
WHERE (excluded.position,excluded.total_ms,excluded.created_at,excluded.result_id)
    < (racing_championship_best.position,racing_championship_best.total_ms,
       racing_championship_best.created_at,racing_championship_best.result_id);

INSERT OR IGNORE INTO racing_championship_initialized(id) VALUES(1);
