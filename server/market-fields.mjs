const fail=message=>{throw Object.assign(new Error(message),{status:400});};
function text(form,key,min,max){const value=String(form.get(key)||'').trim();if(value.length<min||value.length>max)fail('Revisa el campo '+key+'.');return value;}
export function marketFields(form){
 const title=text(form,'title',4,100),category=text(form,'category',2,50),description=text(form,'description',20,2500),condition=text(form,'condition',2,50),compatibility=text(form,'compatibility',2,150),location=text(form,'location',2,100),seller=text(form,'seller',2,80);
 if(!['Motor','Llantas y neumáticos','Interior','Exterior','Otros'].includes(category))fail('Selecciona una categoría válida.');
 const price=Number(text(form,'price',1,12).replace(',','.'));if(!Number.isFinite(price)||price<0||price>100000)fail('Revisa el precio.');
 const type=text(form,'contact_type',3,20),value=text(form,'contact_value',3,150);let contact;
 if(type==='email'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))contact='mailto:'+value;
 if(type==='phone'&&/^\+?[\d\s()-]{7,25}$/.test(value))contact='tel:'+value.replace(/[^\d+]/g,'');
 if(type==='instagram'&&/^@?[a-zA-Z0-9_.]{1,30}$/.test(value))contact='https://www.instagram.com/'+value.replace(/^@/,'')+'/';
 if(!contact)fail('Revisa el contacto del vendedor.');return {title,category,description,price,condition,compatibility,location,seller,type,value,contact};
}
export async function marketPhoto(file){
 if(!file?.arrayBuffer||file.size>1048576||file.size<12)fail('Cada foto debe ocupar como máximo 1 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const mime=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'?'image/webp':null;
 if(!mime)fail('Solo se admiten fotos JPG, PNG o WebP.');return {mime,data:bytes.buffer};
}
