const node=(tag,text='',cls='')=>{const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;};
export function createSimpleSignupManager({event,api}){
 const root=node('section','','simple-event-signups'),heading=node('h2','Apuntarse al evento'),description=node('p','Socios con ficha aprobada · Puedes apuntarte, cambiar el número de personas o darte de baja.'),status=node('p'),summary=node('p','','signup-summary'),self=node('div'),manage=node('div'),list=node('ol','','signup-list'),refresh=node('button','Actualizar lista');status.setAttribute('role','status');status.setAttribute('aria-live','polite');refresh.type='button';root.append(heading,description,status,summary,self,manage,list,refresh);
 const path='events/'+encodeURIComponent(event.id)+'/signups';let busy=false;
 const peopleField=initial=>{const label=node('label','Personas, incluyéndote '),input=node('input');input.type='number';input.min='1';input.max='20';input.value=String(initial||1);input.required=true;input.inputMode='numeric';label.append(input);return {label,input};};
 async function mutate(method,url,body){if(busy)return;busy=true;status.textContent='Actualizando inscripción…';for(const b of root.querySelectorAll('button'))b.disabled=true;try{await api(url,method,body);await load();status.textContent='Inscripción actualizada.';}catch(error){status.textContent=error.message;}finally{busy=false;for(const b of root.querySelectorAll('button'))b.disabled=false;}}
 function registrationForm(data,isAdmin=false){
  const form=node('form','','club-form signup-form');let select;if(isAdmin){const label=node('label','Socio'),options=node('select');select=options;options.required=true;const empty=node('option','Selecciona un socio');empty.value='';options.append(empty);for(const member of data.members){const o=node('option',member.pilot);o.value=member.id;options.append(o);}label.append(options);form.append(label);}
  const current=!isAdmin&&data.rows.find(r=>r.memberId===data.member.id),field=peopleField(current?.people||1),submit=node('button',isAdmin?'Añadir o actualizar socio':current?'Guardar mi inscripción':'Apuntarme');submit.type='submit';form.append(field.label,submit);form.onsubmit=e=>{e.preventDefault();if(!isAdmin&&!current&&!busy)window.clubAnalytics?.track('event_signup_click',{section:'calendario'});void mutate('POST',path,{memberId:isAdmin?select.value:data.member.id,people:Number(field.input.value)});};
  if(current){const leave=node('button','Darme de baja');leave.type='button';leave.onclick=()=>{if(confirm('¿Quieres darte de baja de este evento?'))void mutate('DELETE',path+'/'+encodeURIComponent(data.member.id));};form.append(leave);}return form;
 }
 async function load(){
  try{const data=await api(path);root.dataset.signupReady='true';self.replaceChildren();manage.replaceChildren();list.replaceChildren();
   if(data.mode!=='simple'){status.textContent='Esta es una calçotada. Su lista solo la gestiona Raúl; recarga para consultarla.';root.dataset.signupReady='';return;}
   summary.textContent=data.rows.length+' socios inscritos · '+data.totalPeople+' personas en total';
   if(data.member){self.append(node('p','Tu ficha: '+data.member.pilot));if(data.open)self.append(registrationForm(data));else self.append(node('p','El evento ha finalizado. La administración puede corregir la lista.'));const logout=node('button','Cerrar mi acceso de socio');logout.type='button';logout.onclick=async()=>{try{await api('member-access/logout','POST',{});await load();}catch(error){status.textContent=error.message;}};self.append(logout);}
   else if(!data.canManage)self.append(node('p','Para apuntarte, pide a Raúl o Cuesta tu enlace personal de socio. Solo hace falta activarlo una vez en este dispositivo.'));
   if(data.canManage){manage.append(node('h3','Gestionar inscripciones'),registrationForm(data,true));}
   for(const row of data.rows){const item=node('li'),name=node('strong',row.pilot),count=node('span',' · '+row.people+(row.people===1?' persona':' personas'));item.append(name,count);
    if(data.canManage){const label=peopleField(row.people),save=node('button','Guardar'),remove=node('button','Eliminar inscripción');save.type=remove.type='button';save.onclick=()=>void mutate('POST',path,{memberId:row.memberId,people:Number(label.input.value)});remove.onclick=()=>{if(confirm('¿Eliminar la inscripción de '+row.pilot+'?'))void mutate('DELETE',path+'/'+encodeURIComponent(row.memberId));};const controls=node('div','','signup-row-controls');controls.append(label.label,save,remove);item.append(controls);}list.append(item);}
   if(!data.rows.length)list.append(node('li','Todavía no hay socios apuntados.'));status.textContent='';
  }catch(error){status.textContent=error.message;}
 }
 refresh.onclick=()=>void load();void load();return root;
}
