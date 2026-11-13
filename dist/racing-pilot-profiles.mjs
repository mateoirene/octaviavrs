// Read-through view of the existing garage. No copied roster or parallel database.
export function assignedRoofNumber(value){const match=/^VRS-(\d{1,3})$/.exec(String(value||''));return match&&Number(match[1])<=900?String(Number(match[1])):null;}
const fold=value=>String(value||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
export function profilesForName(profiles,name){return profiles.filter(p=>fold(p.pilot)===fold(name));}
export function profileForName(profiles,name){const matches=profilesForName(profiles,name);return matches.length===1?matches[0]:null;}
export function resolveVehicleModel(model){
 const text=String(model||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
 if(/tesla/.test(text)&&/model\s*3/.test(text))return 'tesla-model-3';
 if(!/octavia/.test(text))return null;
 const combi=/combi|estate|familiar/.test(text);
 if(/mk\s*4\s*[,.]\s*5|mk\s*4\s*facelift/.test(text))return combi?'octavia-mk4-fl-combi':'octavia-mk4-fl';
 if(/mk\s*4|\biv\b/.test(text))return combi?'octavia-mk4-combi':'octavia';
 if(/mk\s*3\s*[,.]\s*5|mk\s*3\s*facelift/.test(text))return combi?null:'octavia-mk3-fl';
 if(/mk\s*3|\biii\b/.test(text))return combi?null:'octavia-mk3';
 if(/mk\s*2|\bii\b/.test(text))return combi?null:'octavia-mk2';
 return null;
}
export function normalizeGaragePilot(row){
 const model=String(row.model||'');
 // Only explicit colour labels already present in a saved field are used.
 const explicitColor=typeof row.color==='string'?row.color.trim():/\bBlue Race\b/i.test(model)?'Blue Race':null;
 const colors={negro:'black',black:'black',azul:'blue',blue:'blue','blue race':'blue',rojo:'red',red:'red',blanco:'white',white:'white',gris:'grey',grey:'grey',gray:'grey'};
 const paint=explicitColor?colors[fold(explicitColor)]||null:null;
 const brand=/\b(Škoda|Skoda|Tesla)\b/i.exec(model)?.[1]||null;
 return {id:String(row.id),pilot:String(row.pilot||''),membershipNumber:row.membershipNumber||null,number:assignedRoofNumber(row.membershipNumber),model,brand,color:explicitColor,power:row.power||null,engine:row.engine||null,year:row.year||null,gearbox:row.gearbox||null,updatedAt:row.updatedAt??null,visualModel:resolveVehicleModel(model),paint};
}
export function applyRaceProfiles(race,{player=null,rivals=[]}={}){
 race.pilotProfile=player?structuredClone(player):null;
 if(player){race.pilotName=player.pilot;race.playerCar=player.model;if(player.paint)race.playerPaint=player.paint;}
 race.rivals.forEach((car,i)=>{car.pilotProfile=rivals[i]?structuredClone(rivals[i]):null;});
 return race;
}
export function participantIdentity(race,index=-1){
 const source=index<0?race:race.rivals[index],profile=index<0?race.pilotProfile:source?.pilotProfile;
 return {id:profile?.id||null,name:profile?.pilot||(index<0?race.pilotName||'TÚ':source?.model==='tesla-model-3'?'ALBERTO · TESLA':'OCTAVIA '+(index+1)),number:profile?.number??null,model:profile?.model||(index<0?race.playerCar||'Octavia VRS MK4':source?.model==='tesla-model-3'?'Tesla Model 3':'Octavia VRS'),visualModel:profile?.visualModel||(index<0?'octavia':source?.model||'octavia'),paint:profile?.paint||(index<0?race.playerPaint:null),profile};
}
