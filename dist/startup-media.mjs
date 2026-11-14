let deferredImages;
export function deferImage(image,url){
 image.loading='lazy';image.decoding='async';
 if(typeof IntersectionObserver==='undefined'){image.src=url;return;}
 image.dataset.deferredImage=url;
 deferredImages||=new IntersectionObserver(entries=>{for(const entry of entries){const img=entry.target;if(!img.isConnected){deferredImages.unobserve(img);continue;}if(entry.isIntersecting){const source=img.dataset.deferredImage;if(source){img.src=source;delete img.dataset.deferredImage;}deferredImages.unobserve(img);}}},{rootMargin:'160px 0px'});
 deferredImages.observe(image);
}
function deferredVideo(video){
 let loaded=false,visible=false,userPaused=false;
 function load(){if(loaded)return;loaded=true;for(const source of video.querySelectorAll('source[data-src]')){source.src=source.dataset.src;delete source.dataset.src;}video.preload='metadata';video.dataset.videoLoaded='true';video.load();}
 function sync(){if(!visible||document.hidden){if(!video.paused)video.pause();return;}load();if(!userPaused)void video.play().catch(()=>{});}
 video.addEventListener('pointerdown',load,{once:true});video.addEventListener('keydown',load,{once:true});
 video.addEventListener('pause',()=>{if(visible&&!document.hidden)userPaused=true;});
 video.addEventListener('play',()=>{userPaused=false;});
 document.addEventListener('visibilitychange',sync);
 if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.1}).observe(video);
}
if(typeof document!=='undefined')for(const video of document.querySelectorAll('video[data-deferred-video]'))deferredVideo(video);
