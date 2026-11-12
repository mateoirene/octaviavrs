// Direct links to Autovía do not download the circuit's photos, models or radio.
const picker=document.querySelector('[data-driving-experience]');let loaded=false,pending;
if(new URLSearchParams(location.search).get('experience')==='highway')picker.value='highway';
function ensureCircuit(){if(loaded||pending||picker.value!=='circuit')return;pending=import('./racing.mjs?v=20261112-neumaticos-v2').then(()=>{loaded=true;window.dispatchEvent(new CustomEvent('octavia-experience-change',{detail:{highway:picker.value==='highway'}}));}).catch(()=>{pending=null;const status=document.querySelector('[data-race-status]');if(status)status.textContent='No se pudo cargar el circuito. Vuelve a seleccionarlo para reintentar.';});}
picker.addEventListener('change',ensureCircuit);ensureCircuit();
