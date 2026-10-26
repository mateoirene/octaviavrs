import {compressMarketPhoto as compress} from './market-images.mjs?v=20261025-fotos';
const form=document.querySelector('[data-submit-form]');
if(form){const status=form.querySelector('[data-submit-status]'),input=form.elements.photos,preview=form.querySelector('[data-previews]');let urls=[];
input.addEventListener('change',()=>{urls.forEach(URL.revokeObjectURL);urls=[];preview.replaceChildren();for(const file of [...input.files].slice(0,10)){const image=document.createElement('img');image.alt='Vista previa de la pieza';image.src=URL.createObjectURL(file);urls.push(image.src);preview.append(image);}});
form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Preparando las fotos…';try{
 if(input.files.length<1||input.files.length>10)throw new Error('Selecciona entre 1 y 10 fotos.');const data=new FormData(form);data.delete('photos');for(const file of input.files)data.append('photos',await compress(file),'pieza.jpg');status.textContent='Enviando tu anuncio…';
 const response=await fetch('/api/market/submissions',{method:'POST',body:data});const result=await response.json();if(!response.ok)throw new Error(result.error||'No se ha podido enviar el anuncio.');
 form.reset();urls.forEach(URL.revokeObjectURL);urls=[];preview.replaceChildren();status.textContent='¡Recibido! Tu anuncio está pendiente de revisión. Aparecerá en el mercadillo cuando Alberto o Raúl lo aprueben.';
}catch(error){status.textContent=error.message||'No se ha podido enviar. Inténtalo de nuevo.';}finally{button.disabled=false;}});}
