const text=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

/**
 * Las novedades del simulador no forman parte del carrusel de la portada.
 * Se comprueba tanto el tipo como el contenido porque las publicaciones
 * manuales del club no tienen un tipo específico de sección.
 */
export function isClubNewsVisible(item){
 if(!item||typeof item!=='object')return false;
 const kind=text(item.kind),href=text(item.href),content=text([item.label,item.title,item.description].join(' '));
 if(['record','racing','simulator','simulador'].includes(kind))return false;
 if(/(^|[\/#?&=_.-])simulador(?:-3d)?(?:\.html)?([\/#?&=_.-]|$)/.test(href))return false;
 return !/(^|\W)simulador(a|es)?(\W|$)|(^|\W)simulator(\W|$)/.test(content);
}

export function shuffleClubNews(items,random=Math.random){
 const result=(Array.isArray(items)?items:[]).filter(isClubNewsVisible).slice();
 for(let i=result.length-1;i>0;i--){
  const value=Number(random());
  const safe=Number.isFinite(value)?Math.min(Math.max(value,0),.9999999999999999):0;
  const j=Math.floor(safe*(i+1));
  [result[i],result[j]]=[result[j],result[i]];
 }
 return result;
}

export function clubNewsSetKey(items){
 return (Array.isArray(items)?items:[]).filter(isClubNewsVisible).map(item=>String(item.id??'')).sort().join('|');
}

/** La última actividad publicada abre el carrusel, aunque otra sea destacada. */
export function newestClubNews(items){
 const timestamp=item=>{
  const value=item.createdAt;
  const numeric=typeof value==='number'||(typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value)))?Number(value):NaN;
  if(Number.isFinite(numeric)&&numeric>0)return numeric<1e12?numeric*1000:numeric;
  const parsed=Date.parse(typeof value==='string'?value:item.published);
  return Number.isFinite(parsed)?parsed:0;
 };
 return (Array.isArray(items)?items:[]).filter(isClubNewsVisible).slice().sort((a,b)=>timestamp(b)-timestamp(a));
}
