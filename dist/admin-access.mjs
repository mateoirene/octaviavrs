export function applyAdminPermissions(user){
 const owner=user.role==='owner',perms=user.permissions||[];
 const tabScopes={content:'content',gallery:'gallery',news:'news',members:'members',events:'events',collaborators:'collaborators',social:'social',statistics:'statistics',market:'market',bricos:'bricos',suggestions:'suggestions'};
 for(const el of document.querySelectorAll('[data-tab],[data-open-tab]')){const tab=el.dataset.tab||el.dataset.openTab;el.hidden=!owner&&(['security','advanced','appearance','seo','communications','access'].includes(tab)||(tabScopes[tab]&&!perms.includes(tabScopes[tab])));}
 document.querySelector('[data-owner-label]').textContent=owner?'Raúl · propietario':user.alias+' · administrador';
}
export async function loadAdminAccess(user){
 if(user.role!=='owner')return;
 const root=document.querySelector('[data-admin-access]');root.replaceChildren();
 const msg=document.createElement('p');msg.setAttribute('role','status');root.append(msg);
 const api=async(body)=>{const r=await fetch('/api/admin/delegates',{method:body?'POST':'GET',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error||'No se pudo completar la operación.');return data;};
 try{
 const data=await api(),form=document.createElement('form');form.className='control-card control-form';
 const heading=document.createElement('h2');heading.textContent='Administradores y permisos';form.append(heading);
 const intro=document.createElement('p');intro.textContent='Solo tú puedes conceder, cambiar o retirar accesos. Cada persona tiene su propia contraseña y sus acciones quedan identificadas. Tu acceso de propietario permanece separado.';form.append(intro);
 const label=document.createElement('label');label.textContent='Miembro del club';const select=document.createElement('select');select.required=true;const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Selecciona el miembro';select.append(placeholder);
 for(const member of data.members){const o=document.createElement('option');o.value=member.id;o.textContent=member.pilot;select.append(o);}
 const cuesta=data.members.filter(m=>m.pilot.toLocaleLowerCase('es').includes('cuesta'));if(cuesta.length===1)select.value=cuesta[0].id;
 label.append(select);form.append(label);
 const state=document.createElement('p');form.append(state);const fields=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='Apartados que puede gestionar';fields.append(legend);
 for(const [key,title]of Object.entries(data.scopeLabels)){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=key;input.name='permission';label.append(input,document.createTextNode(' '+title));fields.append(label);}form.append(fields);
 const linkBox=document.createElement('div');linkBox.hidden=true;const linkLabel=document.createElement('label');linkLabel.textContent='Enlace privado de activación (caduca en 24 horas y funciona una sola vez)';const link=document.createElement('input');link.readOnly=true;link.type='text';link.autocomplete='off';linkLabel.append(link);const copy=document.createElement('button');copy.type='button';copy.textContent='Copiar enlace privado';copy.onclick=async()=>{try{await navigator.clipboard.writeText(link.value);msg.textContent='Enlace copiado. Entrégalo en privado al miembro seleccionado.';}catch{link.focus();link.select();msg.textContent='Selecciona y copia el enlace.';}};linkBox.append(linkLabel,copy);
 const controls=document.createElement('div');controls.className='row-actions';
 const buttons={};
 for(const [action,title]of [['invite','Crear o renovar invitación'],['permissions','Guardar permisos'],['disable','Desactivar acceso y cerrar sesiones'],['enable','Reactivar acceso']]){const button=document.createElement('button');button.type='button';button.textContent=title;buttons[action]=button;button.onclick=async()=>{if(action==='invite'&&!confirm('¿Preparar una contraseña nueva para este miembro? Si ya tenía acceso, sus sesiones se cerrarán y el enlace anterior dejará de servir.'))return;if(action==='disable'&&!confirm('¿Desactivar su acceso y cerrar todas sus sesiones?'))return;Object.values(buttons).forEach(b=>b.disabled=true);linkBox.hidden=true;try{const result=await api({action,memberId:select.value,permissions:[...fields.querySelectorAll('input:checked')].map(i=>i.value)});const updated=await api();data.accounts=updated.accounts;render();if(result.activationPath){link.value=new URL(result.activationPath,location.href).href;linkBox.hidden=false;msg.textContent='Invitación preparada. El administrador no tendrá acceso hasta que configure su contraseña.';}else msg.textContent=action==='disable'?'Acceso desactivado y sesiones cerradas.':'Cambios guardados.';}catch(error){msg.textContent=error.message;render();}};controls.append(button);}
 form.append(controls,linkBox);root.append(form);
 function render(){const account=data.accounts.find(a=>a.memberId===select.value);state.textContent=account?(account.enabled?'Acceso activo':account.configured?'Acceso desactivado':account.invitationPending?'Invitación pendiente de activar':'Sin contraseña configurada'):'Este miembro todavía no tiene acceso administrativo.';for(const input of fields.querySelectorAll('input'))input.checked=account?account.permissions.includes(input.value):true;buttons.invite.disabled=!select.value;buttons.permissions.disabled=!account;buttons.disable.disabled=!account||(!account.enabled&&!account.invitationPending);buttons.enable.disabled=!account||account.enabled||!account.configured;}
 select.onchange=()=>{linkBox.hidden=true;link.value='';render();};form.onsubmit=e=>e.preventDefault();render();
 }catch(error){msg.textContent=error.message;}
}
