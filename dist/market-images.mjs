export async function compressMarketPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('Utiliza fotos JPG, PNG o WebP de menos de 20 MB.');
 const bitmap=await createImageBitmap(file);const ratio=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 let blob;for(const quality of [.85,.7,.5,.3]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size<=1048576)return blob;}throw new Error('Una foto ocupa demasiado. Prueba con una más pequeña.');
}
