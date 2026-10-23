async function compress(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('Utiliza fotos JPG, PNG o WebP de menos de 20 MB.');
 const bitmap=await createImageBitmap(file);const ratio=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 let blob;for(const quality of [.85,.7,.5,.3]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size<=1048576)return blob;}throw new Error('Una foto ocupa demasiado. Prueba con una más pequeña.');
}
const form=document.querySelector('[data-submit-form]');
if(form){const status=form.querySelector('[data-submit-status]'),input=form.elements.photos,preview=form.querySelector('[data-previews]');let urls=[];
input.addEventListener('change',()=>{urls.forEach(URL.revokeObjectURL);urls=[];preview.replaceChildren();for(const file of [...input.files].slice(0,3)){const image=document.createElement('img');image.alt='Vista previa de la pieza';image.src=URL.createObjectURL(file);urls.push(image.src);preview.append(image);}});
form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Preparando las fotos…';try{
 if(input.files.length<1||input.files.length>3)throw new Error('Selecciona entre una y tres fotos.');const data=new FormData(form);data.delete('photos');for(const file of input.files)data.append('photos',await compress(file),'pieza.jpg');status.textContent='Enviando tu anuncio…';
 const response=await fetch('/api/market/submissions',{method:'POST',body:data});const result=await response.json();if(!response.ok)throw new Error(result.error||'No se ha podido enviar el anuncio.');
 form.reset();urls.forEach(URL.revokeObjectURL);urls=[];preview.replaceChildren();status.textContent='¡Recibido! Tu anuncio está pendiente de revisión. Aparecerá en el mercadillo cuando Alberto o Raúl lo aprueben.';
}catch(error){status.textContent=error.message||'No se ha podido enviar. Inténtalo de nuevo.';}finally{button.disabled=false;}});}
