import {readPilotSelection,savePilotSelection} from './racing-profile-selection.mjs';
import {normalizeGaragePilot,profileForName,profilesForName,applyRaceProfiles} from './racing-pilot-profiles.mjs';
export function createRaceProfileControls(root,input,{onChange=()=>{}}={}){
 const player=root.querySelector('[data-garage-pilot]'),rivalSelects=[...root.querySelectorAll('[data-garage-rival]')],message=root.querySelector('[data-garage-pilot-status]'),card=root.querySelector('[data-race-profile-card]'),fields=root.querySelector('[data-race-profile-fields]'),view=root.querySelector('[data-profile-participant]');
 const selects=[player,...rivalSelects];let profiles=[],locked=false,refreshing=null,available=false,ambiguous=false;
 let storage;try{storage=window.localStorage;}catch{}const restored=readPilotSelection(storage);for(const [i,select]of selects.entries()){const id=i?restored.rivals[i-1]:restored.player;if(id){select.add(new Option('Verificando ficha guardada…',id));select.value=id;}}
 const remember=()=>savePilotSelection(storage,{player:player.value,rivals:rivalSelects.map(s=>s.value)});
 const get=id=>profiles.find(p=>p.id===id)||null;
 const selected=()=>({player:get(player.value),rivals:rivalSelects.map(s=>get(s.value))});
 function tell(text){message.textContent=text;}
 function drawCard(){
  const chosen=view.value==='player'?get(player.value):get(rivalSelects[Number(view.value)]?.value),fallback=view.value==='player'?'Piloto invitado':'Rival del juego';
  root.querySelector('[data-profile-card-title]').textContent=chosen?chosen.pilot+' · '+(chosen.membershipNumber||'Sin dorsal asignado'):fallback+' · sin ficha vinculada';fields.replaceChildren();
  const rows=chosen?[['Piloto',chosen.pilot],['Dorsal',chosen.membershipNumber],['Marca',chosen.brand],['Modelo / versión',chosen.model],['Color en ficha',chosen.color],['Motor',chosen.engine],['Potencia',chosen.power],['Año',chosen.year],['Cambio',chosen.gearbox],['Modelo 3D',chosen.visualModel?'Recreación propia de la generación indicada':'No disponible para este modelo']]:[['Ficha','Selecciona un piloto del garaje para consultar sus datos.']];
  for(const [label,value]of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value||'No disponible';fields.append(dt,dd);}
  root.querySelector('[data-profile-color-note]').textContent=chosen&&!chosen.color?'La ficha no indica color: se usa un color de representación, no un dato real del vehículo.': 'Los datos técnicos son informativos: no modifican velocidades, aceleración ni colisiones.';
 }
 function populate(){for(const select of selects){const previous=select.value,defaultText=select===player?'Invitado / alias, sin ficha':'Rival del juego, sin ficha';select.replaceChildren(new Option(defaultText,''));for(const profile of profiles)select.add(new Option(`${profile.pilot} · ${profile.membershipNumber||'sin dorsal'} · ${profile.model}`,profile.id));if(previous&&!get(previous))select.add(new Option('Ficha ya no disponible',previous));select.value=previous;}drawCard();}
 async function refresh({notify=true}={}){
  if(locked)return available;if(refreshing)return refreshing;
  refreshing=(async()=>{try{const response=await fetch('/api/racing/pilots',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error();const data=await response.json();if(!Array.isArray(data.pilots))throw Error();profiles=data.pilots.map(normalizeGaragePilot);available=true;populate();const current=get(player.value);if(current){input.maxLength=80;input.value=current.pilot;}tell(profiles.length+' fichas aprobadas disponibles. Se consultan de nuevo antes de cada carrera vinculada.');if(notify)onChange(selected());return true;}catch{available=false;tell('No se pueden verificar las fichas ahora. El modo invitado sigue disponible.');return false;}finally{refreshing=null;}})();return refreshing;
 }
 function change(){if(locked)return;remember();ambiguous=false;const profile=get(player.value);input.maxLength=profile?80:32;if(profile)input.value=profile.pilot;drawCard();onChange(selected());}
 for(const select of selects)select.addEventListener('change',change);
 input.addEventListener('input',()=>{if(locked)return;const matches=profilesForName(profiles,input.value);const match=profileForName(profiles,input.value);ambiguous=matches.length>1;player.value=match?.id||'';remember();input.maxLength=match?80:32;if(ambiguous)tell('Hay varios pilotos con ese nombre. Selecciona su ficha por dorsal en la lista.');drawCard();onChange(selected());});
 root.querySelector('[data-garage-pilots-refresh]').addEventListener('click',()=>void refresh());
 root.querySelector('[data-garage-rivals-fill]').addEventListener('click',()=>{const taken=new Set([player.value]);for(const select of rivalSelects){const profile=profiles.find(p=>p.visualModel&&!taken.has(p.id));select.value=profile?.id||'';if(profile)taken.add(profile.id);}change();});
 view.addEventListener('change',drawCard);root.querySelector('[data-profile-close]').addEventListener('click',()=>card.open=false);
 root.querySelector('[data-race-profile-toggle]').addEventListener('click',()=>{card.open=!card.open;if(card.open)card.scrollIntoView({block:'nearest'});});
 window.addEventListener('focus',()=>{if(!locked)void refresh();});
 void refresh();
 return {get selectedPlayer(){return get(player.value);},configure(race){applyRaceProfiles(race,selected());},
  async prepare(){if(ambiguous){tell('Selecciona una ficha concreta: el nombre está repetido.');return false;}if(refreshing)await refreshing;if(!player.value){const matches=profilesForName(profiles,input.value);if(matches.length>1){tell('Selecciona una ficha concreta: el nombre está repetido.');return false;}if(matches.length===1){player.value=matches[0].id;change();}}const linked=selects.some(s=>s.value);if(!linked)return true;if(!await refresh({notify:false}))return false;const ids=selects.map(s=>s.value).filter(Boolean);if(new Set(ids).size!==ids.length){tell('Un piloto no puede ocupar dos coches: revisa los dorsales seleccionados.');return false;}for(const id of ids){const profile=get(id);if(!profile){tell('Una ficha ya no está publicada. Selecciona otro participante.');return false;}if(!profile.visualModel){tell('Falta un recurso 3D para '+profile.model+'. Su ficha se puede consultar, pero no se sustituirá por otro coche.');return false;}}return true;},
  lock(value){locked=value;for(const select of selects)select.disabled=value;root.querySelector('[data-garage-pilots-refresh]').disabled=value;root.querySelector('[data-garage-rivals-fill]').disabled=value;},
  card:drawCard
 };
}
