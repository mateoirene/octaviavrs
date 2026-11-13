import { setVrsText } from './branding.mjs';
const $ = selector => document.querySelector(selector);
const status = $('[data-garage-status]'), saveStatus = $('[data-garage-save-status]');
const birthParts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
const folderForm = $('[data-folder-form]'), memberForm = $('[data-member-form]');
let admin = false, folders = [], selected = new URLSearchParams(location.search).get('carpeta') || '', previewUrls = [];
function element(tag, text, className) { const node = document.createElement(tag); if (text) setVrsText(node,text); if (className) node.className = className; return node; }
async function api(path, method = 'GET', body) {
  const response = await fetch('/api/' + path, { method, cache: 'no-store', ...(body instanceof FormData ? { body } : body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se ha podido completar la operación.'); return data;
}
function showPhoto(url, title, id) { const dialog = $('[data-garage-lightbox]'); dialog.querySelector('img').src = url; dialog.querySelector('img').alt = title; dialog.showModal();window.clubAnalytics?.track('member_car_view',{section:'garaje',resource_id:id}); }
$('[data-close-garage-photo]').addEventListener('click', () => $('[data-garage-lightbox]').close());
$('[data-garage-lightbox]').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
function resetForm() {
  memberForm.elements.birthDate.max=birthParts.format(new Date());memberForm.reset(); memberForm.elements.id.value = ''; memberForm.elements.photos.required = true;
  if (selected) memberForm.elements.folderId.value = selected;
  $('[data-member-form-title]').textContent = admin?'Añadir ficha de un miembro':'Envía tu ficha al club'; $('[data-cancel-edit]').hidden = true;
  $('[data-profile-preview]').replaceChildren();
  $('[data-photo-help]').textContent = 'Se reducirán automáticamente para que carguen rápido.';
  previewUrls.forEach(URL.revokeObjectURL); previewUrls = []; $('[data-garage-previews]').replaceChildren();
}
function editMember(member) {
  resetForm(); for (const field of ['id','folderId','pilot','instagram','phone','birthDate','model','engine','power','year','gearbox','notes']) memberForm.elements[field].value = member[field] || '';
  if(member.profileImage){const avatar=element('img');avatar.src=member.profileImage;avatar.alt='Foto actual de '+member.pilot;$('[data-profile-preview]').append(avatar);}
  memberForm.elements.photos.required = false; $('[data-member-form-title]').textContent = 'Editar la ficha de ' + member.pilot; $('[data-cancel-edit]').hidden = false;
  $('[data-photo-help]').textContent = 'Conserva las fotos actuales o selecciona fotos nuevas para sustituirlas.';
  for (const src of member.images) { const image = element('img'); image.src = src; image.alt = 'Foto actual del coche'; $('[data-garage-previews]').append(image); }
  memberForm.scrollIntoView({ block: 'start', behavior: 'instant' }); memberForm.elements.pilot.focus({ preventScroll: true });
}
function card(member) {
  const article=element('article','','garage-member');
  const top=element('div','','garage-member-card-head');
  top.append(element('span','CLUB OCTAVIA VRS CATALUNYA','garage-member-card-brand'),element('span','CARNET DE SOCIO','garage-member-card-title'));
  const band=element('div','','garage-member-number-band');
  const badge=element('span','MIEMBRO DEL CLUB','garage-membership-label');
  const rawNumber=String(member.membershipNumber??'');
  const digits=rawNumber.match(/\d+/g)?.at(-1);
  const numeric=digits===undefined?NaN:Number(digits);
  const assigned=Number.isInteger(numeric)&&numeric>=0&&numeric<=900;
  const number=element('strong',assigned?'N.º '+String(numeric).padStart(4,'0'):'Pendiente','garage-member-number-value');
  band.append(badge,number);
  const photos=element('div','','garage-member-photos');
  member.images.forEach((src,index)=>{
    const button=element('button');button.type='button';
    button.setAttribute('aria-label',`Ver foto ${index+1} del ${member.model} de ${member.pilot}`);
    const backdrop=element('img','','garage-member-photo-backdrop');backdrop.src=src;backdrop.alt='';backdrop.setAttribute('aria-hidden','true');backdrop.loading='lazy';
    const image=element('img','','garage-member-photo-main');image.src=src;image.alt=`${member.model} de ${member.pilot}`;image.loading='lazy';
    button.append(backdrop,image);button.addEventListener('click',()=>showPhoto(src,image.alt,member.id));photos.append(button);
  });
  article.append(top,band,photos);
  const body=element('div','','garage-member-body');
  const membership=element('section','','garage-membership');
  membership.setAttribute('aria-label','Carnet de socio de '+member.pilot);
  const identity=element('div','','garage-membership-identity');
  if(member.profileImage){
    const avatar=element('img','','garage-pilot-avatar');avatar.src=member.profileImage;avatar.alt='Foto de perfil de '+member.pilot;avatar.loading='lazy';identity.append(avatar);
  }else{
    const initials=member.pilot.trim().split(' ').map(word=>word.match(/[\p{L}\p{N}]/u)?.[0]||'').filter(Boolean).slice(0,2).join('').toLocaleUpperCase('es');
    const avatar=element('span',initials,'garage-pilot-avatar garage-pilot-initials');avatar.setAttribute('aria-label','Iniciales de '+member.pilot);identity.append(avatar);
  }
  const details=element('div','','garage-membership-details');
  details.append(element('p','PILOTO','garage-pilot-eyebrow'),element('h3',member.pilot),element('p',member.model,'garage-model'));
  if(member.instagramUrl){const link=element('a','@'+member.instagram+' ↗','garage-instagram');link.dataset.analyticsResourceId=member.id;link.href=member.instagramUrl;link.target='_blank';link.rel='noopener noreferrer';details.append(link);}
  if(member.birthDay){const day=(admin&&member.birthDate?member.birthDate:member.birthDay).split('-').reverse().join('/');details.append(element('p',(admin?'Nacimiento: ':'Cumpleaños: ')+day,'garage-birthday'));}
  identity.append(details);membership.append(identity);
  if(admin&&member.whatsappUrl){const contact=element('a','↗  CONTACTAR POR WHATSAPP','garage-whatsapp');contact.href=member.whatsappUrl;contact.target='_blank';contact.rel='noopener noreferrer';contact.setAttribute('aria-label','Contactar por WhatsApp con '+member.pilot);membership.append(contact);}
  body.append(membership,element('h4','ESPECIFICACIONES DEL VEHÍCULO','garage-specs-heading'));
  const specs=element('dl','','garage-specs');
  for(const [label,value] of [['Motor',member.engine],['Potencia',member.power],['Año',member.year],['Cambio',member.gearbox]])if(value){
    const row=element('div'),dt=element('dt');dt.dataset.spec=label.toLocaleLowerCase('es');dt.append(element('span',label));row.append(dt,element('dd',value));specs.append(row);
  }
  body.append(specs);if(member.notes)body.append(element('p',member.notes,'garage-member-notes'));
  if(admin){const actions=element('div','','garage-page-actions'),edit=element('button','Editar ficha'),remove=element('button','Eliminar ficha');edit.type=remove.type='button';edit.addEventListener('click',()=>editMember(member));remove.addEventListener('click',async()=>{if(!confirm(`¿Eliminar la ficha de ${member.pilot} y sus fotos?`))return;remove.disabled=true;try{await api('garage/members/'+member.id,'DELETE');await loadFolders();status.textContent='Ficha eliminada.';}catch(error){status.textContent=error.message;remove.disabled=false;}});actions.append(edit,remove);body.append(actions);}
  article.append(body);return article;
}
async function openFolder(id, updateUrl = true) {
  selected = id; const folder = folders.find(item => item.id === id); if (!folder) { selected = ''; $('[data-folder-content]').hidden = true; return; }
  if (updateUrl) history.replaceState(null,'','garaje.html?carpeta='+encodeURIComponent(id));
  $('[data-folder-content]').hidden = false; $('[data-folder-title]').textContent = folder.name; status.textContent = 'Cargando fichas…';
  try { const members = await api('garage/members?folder='+encodeURIComponent(id)); $('[data-members]').replaceChildren(...members.map(card)); status.textContent = members.length ? `${members.length} fichas en ${folder.name}.` : 'Esta carpeta aún no tiene fichas.'; memberForm.elements.folderId.value = id; }
  catch (error) { status.textContent = error.message; }
}
async function loadFolders() {
  folders = await api('garage/folders'); const grid = $('[data-folders]'); grid.replaceChildren();
  const oldFolder = memberForm.elements.folderId.value; memberForm.elements.folderId.replaceChildren();if(!admin){const option=element('option','Que el club elija la carpeta');option.value='';memberForm.elements.folderId.append(option);}
  for (const folder of folders) {
    const option = element('option',folder.name); option.value = folder.id; memberForm.elements.folderId.append(option);
    const tile = element('article','','garage-folder'), button = element('button'); button.type = 'button';
    const image = element('img'); image.src = 'assets/bandera-club-octavia-transparente.png'; image.alt = 'Bandera del Club Octavia VRS Catalunya'; image.loading = 'lazy'; button.append(image);
    button.append(element('strong',folder.name),element('span',`${folder.members} ${folder.members === 1 ? 'ficha' : 'fichas'} →`)); button.addEventListener('click', () => { void openFolder(folder.id); $('[data-folder-content]').scrollIntoView({ block: 'start', behavior: 'instant' }); }); tile.append(button);
    if (admin) { const actions = element('div','','garage-folder-tools'), rename = element('button','Renombrar'), remove = element('button','Eliminar carpeta'); rename.type = remove.type = 'button'; remove.disabled = folder.members > 0; remove.title = folder.members > 0 ? 'Solo se pueden eliminar carpetas vacías.' : 'Eliminar carpeta vacía';
      rename.addEventListener('click', async () => { const name = prompt('Nombre de la carpeta:',folder.name); if (name === null) return; try { await api('garage/folders/'+folder.id,'POST',{name}); await loadFolders(); } catch (error) { status.textContent = error.message; } });
      remove.addEventListener('click', async () => { if (!confirm('¿Eliminar la carpeta vacía «'+folder.name+'»?')) return; try { await api('garage/folders/'+folder.id,'DELETE'); if (selected === folder.id) selected = ''; await loadFolders(); } catch (error) { status.textContent = error.message; } }); actions.append(rename,remove); tile.append(actions); }
    grid.append(tile);
  }
  if (folders.some(folder => folder.id === oldFolder)) memberForm.elements.folderId.value = oldFolder;
  status.textContent = folders.length ? 'Elige una carpeta para ver las fichas de los miembros.' : admin ? 'Todavía no hay carpetas. Crea la primera en Gestión privada.' : 'Los administradores están preparando las fichas del garaje.';
  if (selected) await openFolder(selected,false); else $('[data-folder-content]').hidden = true;
}
$('[data-back-folders]').addEventListener('click', () => { selected = ''; history.replaceState(null,'','garaje.html'); $('[data-folder-content]').hidden = true; $('[data-folders]').scrollIntoView({block:'start'}); });
folderForm.addEventListener('submit', async event => { event.preventDefault(); const button = folderForm.querySelector('button'); button.disabled = true; try { const folder = await api('garage/folders','POST',{name:folderForm.elements.name.value}); selected = folder.id; folderForm.reset(); await loadFolders(); status.textContent = 'Carpeta creada. Ya puedes añadir sus fichas.'; } catch (error) { status.textContent = error.message; } finally { button.disabled = false; } });
async function compress(file,dimension=1400,maximum=1048576) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 20*1024*1024) throw new Error('Utiliza fotos JPG, PNG o WebP de menos de 20 MB.');
  const image = await createImageBitmap(file), ratio = Math.min(1,dimension/Math.max(image.width,image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1,Math.round(image.width*ratio)); canvas.height = Math.max(1,Math.round(image.height*ratio)); canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height); image.close();
  for (const quality of [.85,.7,.5,.3]) { const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',quality)); if (blob && blob.size <= maximum) return blob; } throw new Error('Una foto ocupa demasiado. Elige una más pequeña.');
}
memberForm.elements.photos.addEventListener('change', () => { previewUrls.forEach(URL.revokeObjectURL); previewUrls = []; $('[data-garage-previews]').replaceChildren(); for (const file of [...memberForm.elements.photos.files].slice(0,3)) { const image = element('img'); image.src = URL.createObjectURL(file); image.alt = 'Vista previa'; previewUrls.push(image.src); $('[data-garage-previews]').append(image); } });
memberForm.addEventListener('submit', async event => { event.preventDefault(); const button = memberForm.querySelector('button[type=submit]'); button.disabled = true; saveStatus.textContent = 'Preparando la ficha…';
  try { if (memberForm.elements.photos.files.length > 3) throw new Error('Añade como máximo tres fotos.'); const data = new FormData(memberForm); data.delete('photos');data.delete('profilePhoto');const profile=memberForm.elements.profilePhoto.files[0];if(profile)data.append('profilePhoto',await compress(profile,600,262144),'perfil.jpg'); for (const file of memberForm.elements.photos.files) data.append('photos',await compress(file),'coche.jpg'); const id = memberForm.elements.id.value; const saved=await api(admin?'garage/members'+(id?'/'+id:''):'garage/submit','POST',data); selected = data.get('folderId'); resetForm(); await loadFolders(); saveStatus.textContent = saved.status==='approved'?'Ficha guardada y publicada en el garaje.':'Ficha enviada. Queda pendiente de revisión; todavía no se ha publicado.';if(admin)void loadReviews();window.dispatchEvent(new Event('club-session-change')); }
  catch (error) { saveStatus.textContent = error.message; } finally { button.disabled = false; }
});
function addVisibilityControls(article,member,state,note){if(state!=='approved'&&state!=='blocked')return;const controls=element('div','','garage-page-actions'),reason=element('textarea');let button;if(state==='approved'){reason.maxLength=500;reason.placeholder='Motivo privado (opcional)';button=element('button','Ocultar perfil temporalmente');}else button=element('button','Restaurar perfil');button.type='button';button.addEventListener('click',async()=>{const action=state==='approved'?'block':'unblock',label=state==='approved'?'¿Ocultar esta ficha del garaje y de las novedades públicas?':'¿Restaurar su visibilidad en el garaje?';if(!window.confirm(label))return;button.disabled=true;try{await api('garage/members/'+member.id+'/'+action,'POST',action==='block'?{reason:reason.value}:{});await loadFolders();await loadReviews();window.dispatchEvent(new Event('club-session-change'));}catch(error){note.textContent=error.message;button.disabled=false;}});controls.append(button);if(state==='approved')controls.prepend(reason);article.append(controls);}
async function loadReviews(){if(!admin)return;const target=$('[data-garage-review-list]'),note=$('[data-garage-review-status]');note.textContent='Cargando fichas para revisar…';try{const state=$('[data-garage-review-filter]').value,items=await api('garage/members?review='+state);target.replaceChildren();for(const member of items){const article=card(member);if(state==='pending'){const controls=element('div','','garage-page-actions'),folder=element('select'),reviewNote=element('textarea');folder.setAttribute('aria-label','Carpeta de publicación');for(const item of folders){const option=element('option',item.name);option.value=item.id;folder.append(option);}folder.value=member.folderId;reviewNote.maxLength=500;reviewNote.placeholder='Nota privada de revisión (opcional)';article.append(folder,reviewNote);for(const [action,label]of [['approve','Aprobar y publicar'],['reject','Rechazar ficha']]){const button=element('button',label);button.type='button';button.dataset.garageReviewAction=action;button.addEventListener('click',async()=>{for(const b of controls.querySelectorAll('button'))b.disabled=true;try{await api('garage/reviews/'+member.id,'POST',{action,folderId:folder.value,note:reviewNote.value});await loadFolders();await loadReviews();window.dispatchEvent(new Event('club-session-change'));}catch(error){note.textContent=error.message;for(const b of controls.querySelectorAll('button'))b.disabled=false;}});controls.append(button);}article.append(controls);}else if(member.reviewNote)article.append(element('p','Nota privada: '+member.reviewNote));addVisibilityControls(article,member,state,note);target.append(article);}note.textContent=items.length?items.length+' fichas '+(state==='pending'?'pendientes de revisión.':state==='blocked'?'ocultas temporalmente.':'en este estado.'):'No hay fichas en este estado.';}catch(error){note.textContent=error.message;}}
$('[data-garage-review-filter]').addEventListener('change',()=>void loadReviews());$('[data-garage-review-refresh]').addEventListener('click',()=>void loadReviews());
$('[data-garage-export]').addEventListener('click',async event=>{const button=event.currentTarget,note=$('[data-garage-review-status]');button.disabled=true;try{const response=await fetch('/api/garage/export',{cache:'no-store'});if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||'No se pudo exportar el listado.');}const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='octavia-miembros.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);note.textContent='Listado CSV generado. Incluye solo los campos de gestión necesarios, sin teléfonos ni fechas completas de nacimiento.';}catch(error){note.textContent=error.message;}finally{button.disabled=false;}});
$('[data-cancel-edit]').addEventListener('click',resetForm);
try { const user = await api('admin/session'); admin = !!user.id; } catch { admin = false; }
$('[data-garage-management]').hidden = !admin;$('[data-garage-reviews]').hidden=!admin;memberForm.elements.folderId.required=admin;memberForm.elements.removeProfile.closest('label').hidden=!admin;memberForm.elements.removeProfile.disabled=!admin;$('[data-member-save]').textContent=admin?'Guardar y publicar ficha':'Enviar para revisión';$('[data-member-submission-help]').textContent=admin?'Puedes añadir una ficha directamente o revisar las enviadas por los miembros en Revisiones. Las publicaciones serán públicas.':'Rellena tu ficha completa. Solo se publicará cuando un administrador la apruebe.';
$('[data-garage-login]').href = admin ? '#gestion' : 'admin.html?volver=garaje';
$('[data-garage-login]').textContent = admin ? 'Gestionar carpetas y fichas ↓' : 'Entrar para gestionar el garaje';
try { await loadFolders();if(admin)await loadReviews(); } catch (error) { status.textContent = error.message; }

setInterval(()=>{if(admin&&!document.hidden&&!$('[data-garage-review-list]').contains(document.activeElement))void loadReviews();},60000);

