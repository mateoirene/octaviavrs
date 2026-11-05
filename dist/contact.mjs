export function initClubContact(doc=document){
 if(doc.querySelector('[data-club-whatsapp]'))return;
 const css=doc.createElement('link');css.rel='stylesheet';css.href='contact.css?v=20261104-miembros';doc.head.append(css);
 const manifest=doc.createElement('link');manifest.rel='manifest';manifest.href='/manifest.webmanifest';if(!doc.querySelector('link[rel=manifest]'))doc.head.append(manifest);
 const widget=doc.createElement('aside');widget.dataset.clubWhatsapp='';widget.className='club-whatsapp';widget.setAttribute('aria-label','Acceso al grupo de WhatsApp del club');
 const button=doc.createElement('button');button.className='club-whatsapp-toggle';button.type='button';button.setAttribute('aria-label','Abrir acceso al grupo de WhatsApp del club');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','club-whatsapp-panel');button.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3a12 12 0 0 0-10.4 18l-2 8 8-2A12 12 0 1 0 16 3Zm0 2a10 10 0 1 1-4 19.2l-.5-.2-5 1.3 1.3-5-.3-.5A10 10 0 0 1 16 5Zm-4 5c-.4 0-1 .3-1.3.8-2 3.1 1.8 8.7 6.3 10.4 1.8.7 3.5-.2 3.9-1.4l.2-1.2-3.5-1.7-1.2 1.5c-1.8-.8-3.2-2-4-3.6l1.3-1.4-1.3-3.1Z"/></svg>';
 const panel=doc.createElement('section');panel.id='club-whatsapp-panel';panel.hidden=true;panel.className='club-whatsapp-panel';
 const heading=doc.createElement('strong');heading.textContent='Grupo de WhatsApp del club';
 const close=doc.createElement('button');close.type='button';close.textContent='Cerrar ×';close.setAttribute('aria-label','Cerrar acceso a WhatsApp');
 const note=doc.createElement('p');note.textContent='Acceso reservado a miembros con una ficha aprobada. Introduce el mismo teléfono/WhatsApp que figura en tu ficha del garaje.';
 const form=doc.createElement('form');form.className='club-whatsapp-form';form.setAttribute('data-clarity-mask','true');
 const label=doc.createElement('label');label.textContent='Teléfono / WhatsApp';
 const input=doc.createElement('input');input.type='tel';input.name='phone';input.required=true;input.maxLength=30;input.autocomplete='tel';input.inputMode='tel';input.placeholder='+34 600 123 456';label.append(input);
 const verify=doc.createElement('button');verify.type='submit';verify.className='club-whatsapp-verify';verify.textContent='Comprobar acceso';
 const status=doc.createElement('p');status.className='club-whatsapp-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const access=doc.createElement('a');access.className='club-whatsapp-send';access.textContent='Entrar al grupo de WhatsApp ↗';access.target='_blank';access.rel='noopener noreferrer';access.hidden=true;
 form.append(label,verify,status,access);
 form.addEventListener('submit',async event=>{event.preventDefault();verify.disabled=true;access.hidden=true;access.removeAttribute('href');status.textContent='Comprobando tu ficha de miembro…';try{const response=await fetch('/api/club/whatsapp-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:input.value}),cache:'no-store'}),data=await response.json();if(!response.ok)throw new Error(data.error||'No se ha podido comprobar el acceso.');const url=new URL(data.inviteUrl);if(url.origin!=='https://chat.whatsapp.com')throw new Error('La configuración del grupo necesita revisión administrativa.');access.href=url.href;access.hidden=false;status.textContent='Teléfono verificado. Ya puedes entrar al grupo.';}catch(error){status.textContent=error.message;}finally{verify.disabled=false;}});
 const setOpen=(open,focus=true)=>{panel.hidden=!open;button.setAttribute('aria-expanded',String(open));try{sessionStorage.setItem('club-whatsapp-open-v2',open?'yes':'no');}catch{}if(open){window.dispatchEvent(new Event('club-contact-open'));if(focus)input.focus({preventScroll:true});}};
 button.addEventListener('click',()=>setOpen(panel.hidden));close.addEventListener('click',()=>{setOpen(false);button.focus({preventScroll:true});});widget.addEventListener('keydown',event=>{if(event.key==='Escape'){setOpen(false);button.focus({preventScroll:true});}});
 panel.append(heading,close,note,form);widget.append(panel,button);doc.body.append(widget);try{if(sessionStorage.getItem('club-whatsapp-open-v2')==='yes')setOpen(true,false);}catch{}
}
