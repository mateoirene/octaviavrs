import {compressMarketPhoto as compress} from './market-images.mjs?v=20261025-fotos';
const form=document.querySelector('[data-submit-form]');
if(form){
 const status=form.querySelector('[data-submit-status]'),input=form.elements.photos,preview=form.querySelector('[data-previews]'),counter=form.querySelector('[data-photo-count]');let photos=[],busy=false;
 function paint(){
  preview.replaceChildren();if(counter)counter.textContent=photos.length+' / 5 fotos';
  photos.forEach((photo,index)=>{const card=document.createElement('div'),image=document.createElement('img'),remove=document.createElement('button');image.alt='Foto de la pieza '+(index+1);image.src=photo.url;remove.type='button';remove.textContent='Quitar foto '+(index+1);remove.disabled=busy;remove.onclick=()=>{if(busy)return;URL.revokeObjectURL(photo.url);photos=photos.filter(p=>p!==photo);paint();};card.append(image,remove);preview.append(card);});
 }
 input.addEventListener('change',()=>{
  const files=[...input.files];input.value='';if(busy)return;
  if(photos.length+files.length>5){status.textContent='Puedes añadir hasta 5 fotos. Quita alguna antes de añadir más.';return;}
  if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)){status.textContent='Utiliza fotos JPG, PNG o WebP de menos de 20 MB.';return;}
  photos.push(...files.map(file=>({file,url:URL.createObjectURL(file)})));status.textContent='';paint();
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  if(photos.length<1||photos.length>5){status.textContent='Selecciona entre 1 y 5 fotos.';return;}
  const button=form.querySelector('button[type=submit]');busy=true;button.disabled=true;input.disabled=true;paint();status.textContent='Preparando las fotos…';
  try{
   const data=new FormData(form);data.delete('photos');for(const photo of photos)data.append('photos',await compress(photo.file),'pieza.jpg');status.textContent='Enviando tu anuncio…';
   const response=await fetch('/api/market/submissions',{method:'POST',body:data});const result=await response.json();if(!response.ok)throw new Error(result.error||'No se ha podido enviar el anuncio.');
   form.reset();photos.forEach(photo=>URL.revokeObjectURL(photo.url));photos=[];status.textContent='¡Recibido! Tu anuncio está pendiente de revisión. Aparecerá en el mercadillo cuando un administrador lo apruebe.';
  }catch(error){status.textContent=error.message||'No se ha podido enviar. Inténtalo de nuevo.';}finally{busy=false;button.disabled=false;input.disabled=false;paint();}
 });
}
