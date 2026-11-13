// Public garage read only; log aggregated vehicle types, never names/phones/photos.
const origin='https://octaviaap.pages.dev';
async function get(path){const r=await fetch(origin+path,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Garaje HTTP '+r.status);return r.json();}
const folders=await get('/api/garage/folders');
const models=new Map();let approved=0,possiblyTruncated=false;
for(const folder of folders.slice(0,100)){
 const members=await get('/api/garage/members?folder='+encodeURIComponent(folder.id));if(members.length===200)possiblyTruncated=true;
 for(const member of members){approved++;const label=String(member.model||'').trim().slice(0,100);let row=models.get(label);if(!row){row={model:label,count:0,years:[]};models.set(label,row);}row.count++;const year=String(member.year||'');if(/^\d{4}$/.test(year)&&!row.years.includes(year))row.years.push(year);}
}
console.log('MODELOS_PUBLICOS '+JSON.stringify({approved,possiblyTruncated,models:[...models.values()].sort((a,b)=>b.count-a.count)}));
