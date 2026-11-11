const $=(selector,root=document)=>root.querySelector(selector);
const page=location.pathname.split('/').pop().replace(/\.html?$/i,'')||'index';
const preview=new URLSearchParams(location.search).get('cms-preview')==='1';
const safeUrl=value=>{try{const url=new URL(value,location.origin);return url.protocol==='https:'||url.origin===location.origin?url.href:null;}catch{return null;}};
async function json(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw Error('Configuración no disponible');return response.json();}
function meta(selector,value){if(!value)return;let element=$(selector);if(!element){const attr=selector.match(/^meta\[(name|property)="([^"]+)"\]$/);if(!attr)return;element=document.createElement('meta');element.setAttribute(attr[1],attr[2]);document.head.append(element);}element.setAttribute('content',value);}
function applySettings(settings){
 const root=document.documentElement,appearance=settings.appearance||{},seo=settings.seo||{},general=settings.general||{};
 if(/^#[\da-f]{6}$/i.test(appearance.background||''))root.style.setProperty('--bg',appearance.background);
 if(/^#[\da-f]{6}$/i.test(appearance.accent||''))root.style.setProperty('--red',appearance.accent);
 if(/^#[\da-f]{6}$/i.test(appearance.surface||''))root.style.setProperty('--cms-surface',appearance.surface);
 if(appearance.bannerImage){const url=safeUrl(appearance.bannerImage),hero=$('.hero-img');if(url&&hero)hero.src=url;}
 if(appearance.backgroundImage){const url=safeUrl(appearance.backgroundImage);if(url)root.style.setProperty('--page-background','linear-gradient(#080c1080,#080c1080),url('+JSON.stringify(url)+') center/cover fixed no-repeat');}
 const pageSeo=seo.pages?.[page]||{};if(pageSeo.title||seo.title)document.title=pageSeo.title||seo.title;
 meta('meta[name="description"]',pageSeo.description||seo.description||'');meta('meta[name="robots"]',pageSeo.robots||seo.robots||'index,follow');
 meta('meta[property="og:title"]',pageSeo.title||seo.title||'');meta('meta[property="og:description"]',pageSeo.description||seo.description||'');
 const share=safeUrl(pageSeo.shareImage||seo.shareImage||'');if(share)meta('meta[property="og:image"]',share);
 const flags=settings.features||{},features={news:'#noticias',events:'#calendario',garage:'#garaje',gallery:'#galeria',collaborators:'#colaboradores',social:'#redes-sociales',market:'#mercadillo',bricos:'a[href="bricos.html"]'};
 for(const [key,selector] of Object.entries(features))if(flags[key]===false)for(const element of document.querySelectorAll(selector))element.hidden=true;
 if(general.maintenanceBanner){const banner=document.createElement('aside');banner.className='cms-maintenance-banner';banner.setAttribute('role','status');banner.textContent=general.maintenanceBanner;document.body.prepend(banner);}
 const announcement=settings.communications||{};if(announcement.announcementBody){const banner=document.createElement('aside');banner.className='cms-announcement';const title=document.createElement('strong'),body=document.createElement('span');title.textContent=announcement.announcementTitle||'Aviso del club';body.textContent=announcement.announcementBody;banner.append(title,body);const href=safeUrl(announcement.announcementHref||'');if(href){const link=document.createElement('a');link.href=href;link.textContent='Más información ↗';link.rel='noopener noreferrer';banner.append(link);}document.body.prepend(banner);}
}
function applyItems(items){const ordered=new Set();for(const item of items){let elements;try{elements=document.querySelectorAll(item.selector);}catch{continue;}for(const element of elements){if(item.content_type==='text')element.textContent=item.value;else if(item.content_type==='link'&&element instanceof HTMLAnchorElement){const url=safeUrl(item.value);if(url)element.href=url;}else if(item.content_type==='image'&&(element instanceof HTMLImageElement||element instanceof HTMLVideoElement)){const url=safeUrl(item.value);if(url){if(element instanceof HTMLImageElement)element.src=url;else{element.src=url;element.load();}}}else if(item.content_type==='visibility')element.hidden=item.value==='hidden';else if(item.content_type==='order'&&element.parentElement){element.dataset.cmsOrder=String(Math.min(100,Math.max(0,Number(item.value)||0)));ordered.add(element.parentElement);}}}for(const parent of ordered){const children=[...parent.children],decorated=children.map((element,index)=>({element,index,order:element.dataset.cmsOrder===undefined?index:Number(element.dataset.cmsOrder)})).sort((a,b)=>a.order-b.order||a.index-b.index);for(const child of decorated)parent.append(child.element);}
 if(preview&&window.parent!==window)window.parent.postMessage({type:'cms-preview-updated'},location.origin);
}
try{const settings=await json('/api/cms/settings');applySettings(settings);if(page!=='pagina'){const data=await json(`/api/cms/content?page=${encodeURIComponent(page)}${preview?'&preview=1':''}`);applyItems(data.items||[]);}}catch{}
