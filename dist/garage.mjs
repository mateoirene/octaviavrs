import { setVrsText } from './branding.mjs';
const $ = selector => document.querySelector(selector);
const status = $('[data-garage-status]'), saveStatus = $('[data-garage-save-status]');
const folderForm = $('[data-folder-form]'), memberForm = $('[data-member-form]');
let admin = false, folders = [], selected = new URLSearchParams(location.search).get('carpeta') || '', previewUrls = [];
function element(tag, text, className) { const node = document.createElement(tag); if (text) setVrsText(node,text); if (className) node.className = className; return node; }
async function api(path, method = 'GET', body) {
  const response = await fetch('/api/' + path, { method, cache: 'no-store', ...(body instanceof FormData ? { body } : body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se ha podido completar la operación.'); return data;
}
function showPhoto(url, title) { const dialog = $('[data-garage-lightbox]'); dialog.querySelector('img').src = url; dialog.querySelector('img').alt = title; dialog.showModal(); }
$('[data-close-garage-photo]').addEventListener('click', () => $('[data-garage-lightbox]').close());
$('[data-garage-lightbox]').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
function resetForm() {
  memberForm.reset(); memberForm.elements.id.value = ''; memberForm.elements.photos.required = true;
  if (selected) memberForm.elements.folderId.value = selected;
  $('[data-member-form-title]').textContent = 'Añadir ficha de un miembro'; $('[data-cancel-edit]').hidden = true;
  $('[data-photo-help]').textContent = 'Se reducirán automáticamente para que carguen rápido.';
  previewUrls.forEach(URL.revokeObjectURL); previewUrls = []; $('[data-garage-previews]').replaceChildren();
}
function editMember(member) {
  resetForm(); for (const field of ['id','folderId','pilot','instagram','model','engine','power','year','gearbox','notes']) memberForm.elements[field].value = member[field] || '';
  memberForm.elements.photos.required = false; $('[data-member-form-title]').textContent = 'Editar la ficha de ' + member.pilot; $('[data-cancel-edit]').hidden = false;
  $('[data-photo-help]').textContent = 'Conserva las fotos actuales o selecciona fotos nuevas para sustituirlas.';
  for (const src of member.images) { const image = element('img'); image.src = src; image.alt = 'Foto actual del coche'; $('[data-garage-previews]').append(image); }
  memberForm.scrollIntoView({ block: 'start', behavior: 'instant' }); memberForm.elements.pilot.focus({ preventScroll: true });
}
function card(member) {
  const article = element('article', '', 'garage-member');
  const photos = element('div', '', 'garage-member-photos');
  member.images.forEach((src,index) => { const button = element('button'); button.type = 'button'; button.setAttribute('aria-label', `Ver foto ${index+1} del ${member.model} de ${member.pilot}`); const image = element('img'); image.src = src; image.alt = `${member.model} de ${member.pilot}`; image.loading = 'lazy'; button.append(image); button.addEventListener('click', () => showPhoto(src,image.alt)); photos.append(button); });
  article.append(photos); const body = element('div', '', 'garage-member-body');
  body.append(element('p', 'PILOTO DEL CLUB', 'eyebrow red'), element('h3',member.pilot), element('p',member.model,'garage-model'));
  if (member.instagramUrl) { const link = element('a','@'+member.instagram+' ↗','garage-instagram'); link.href = member.instagramUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; body.append(link); }
  const specs = element('dl','', 'garage-specs');
  for (const [label,value] of [['Motor',member.engine],['Potencia',member.power],['Año',member.year],['Cambio',member.gearbox]]) if (value) { const row = element('div'); row.append(element('dt',label),element('dd',value)); specs.append(row); }
  body.append(specs); if (member.notes) body.append(element('p',member.notes,'garage-member-notes'));
  if (admin) { const actions = element('div','','garage-page-actions'), edit = element('button','Editar ficha'), remove = element('button','Eliminar ficha'); edit.type = remove.type = 'button';
    edit.addEventListener('click', () => editMember(member)); remove.addEventListener('click', async () => { if (!confirm(`¿Eliminar la ficha de ${member.pilot} y sus fotos?`)) return; remove.disabled = true; try { await api('garage/members/'+member.id,'DELETE'); await loadFolders(); status.textContent = 'Ficha eliminada.'; } catch (error) { status.textContent = error.message; remove.disabled = false; } }); actions.append(edit,remove); body.append(actions); }
  article.append(body); return article;
}
async function openFolder(id, updateUrl = true) {
  selected = id; const folder = folders.find(item => item.id === id); if (!folder) { selected = ''; $('[data-folder-content]').hidden = true; return; }
  if (updateUrl) history.replaceState(null,'','garaje.html?carpeta='+encodeURIComponent(id));
  $('[data-folder-content]').hidden = false; $('[data-folder-title]').textContent = folder.name; status.textContent = 'Cargando fichas…';
  try { const members = await api('garage/members?folder='+encodeURIComponent(id)); $('[data-members]').replaceChildren(...members.map(card)); status.textContent = members.length ? `${members.length} fichas en ${folder.name}.` : 'Esta carpeta aún no tiene fichas.'; if (admin) memberForm.elements.folderId.value = id; }
  catch (error) { status.textContent = error.message; }
}
async function loadFolders() {
  folders = await api('garage/folders'); const grid = $('[data-folders]'); grid.replaceChildren();
  const oldFolder = memberForm.elements.folderId.value; memberForm.elements.folderId.replaceChildren();
  for (const folder of folders) {
    const option = element('option',folder.name); option.value = folder.id; memberForm.elements.folderId.append(option);
    const tile = element('article','','garage-folder'), button = element('button'); button.type = 'button';
    if (folder.cover) { const image = element('img'); image.src = folder.cover; image.alt = ''; image.loading = 'lazy'; button.append(image); }
    else button.append(element('span','▰','garage-folder-symbol'));
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
async function compress(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 20*1024*1024) throw new Error('Utiliza fotos JPG, PNG o WebP de menos de 20 MB.');
  const image = await createImageBitmap(file), ratio = Math.min(1,1400/Math.max(image.width,image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1,Math.round(image.width*ratio)); canvas.height = Math.max(1,Math.round(image.height*ratio)); canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height); image.close();
  for (const quality of [.85,.7,.5,.3]) { const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',quality)); if (blob && blob.size <= 1048576) return blob; } throw new Error('Una foto ocupa demasiado. Elige una más pequeña.');
}
memberForm.elements.photos.addEventListener('change', () => { previewUrls.forEach(URL.revokeObjectURL); previewUrls = []; $('[data-garage-previews]').replaceChildren(); for (const file of [...memberForm.elements.photos.files].slice(0,3)) { const image = element('img'); image.src = URL.createObjectURL(file); image.alt = 'Vista previa'; previewUrls.push(image.src); $('[data-garage-previews]').append(image); } });
memberForm.addEventListener('submit', async event => { event.preventDefault(); const button = memberForm.querySelector('button[type=submit]'); button.disabled = true; saveStatus.textContent = 'Preparando la ficha…';
  try { if (memberForm.elements.photos.files.length > 3) throw new Error('Añade como máximo tres fotos.'); const data = new FormData(memberForm); data.delete('photos'); for (const file of memberForm.elements.photos.files) data.append('photos',await compress(file),'coche.jpg'); const id = memberForm.elements.id.value; await api('garage/members'+(id?'/'+id:''),'POST',data); selected = data.get('folderId'); resetForm(); await loadFolders(); saveStatus.textContent = 'Ficha guardada y publicada en el garaje.'; }
  catch (error) { saveStatus.textContent = error.message; } finally { button.disabled = false; }
});
$('[data-cancel-edit]').addEventListener('click',resetForm);
try { const user = await api('admin/session'); admin = !!user.id; } catch { admin = false; }
$('[data-garage-management]').hidden = !admin;
$('[data-garage-login]').href = admin ? '#gestion' : 'admin.html?volver=garaje';
$('[data-garage-login]').textContent = admin ? 'Gestionar carpetas y fichas ↓' : 'Entrar para gestionar el garaje';
try { await loadFolders(); } catch (error) { status.textContent = error.message; }
