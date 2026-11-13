// Read only from the authoritative garage; never expose contact/private profile data.
export async function racingPilots(db){
 const rows=(await db.prepare(`SELECT m.id,m.pilot,m.model,m.engine,m.power,m.year,m.gearbox,m.updated_at,mc.number membership_number
 FROM garage_members m
 LEFT JOIN garage_memberships mc ON mc.member_id=m.id
 LEFT JOIN garage_moderation g ON g.member_id=m.id
 LEFT JOIN garage_member_blocks b ON b.member_id=m.id
 WHERE COALESCE(g.status,'approved')='approved' AND COALESCE(b.is_blocked,0)=0
 ORDER BY mc.number IS NULL,mc.number,m.id LIMIT 1000`).all()).results;
 return rows.map(row=>({id:row.id,pilot:row.pilot,membershipNumber:row.membership_number===null||row.membership_number===undefined?null:'VRS-'+row.membership_number,model:row.model,engine:row.engine||null,power:row.power||null,year:row.year||null,gearbox:row.gearbox||null,updatedAt:row.updated_at}));
}
