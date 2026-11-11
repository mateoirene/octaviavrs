export function graphicsProfile({width=1024,height=768,coarsePointer=false,cores=8,memory=8,low=false}={}){
 const mobile=width<=700||(coarsePointer&&Math.min(width,height)<=1100)||cores<=4||memory<=2,limited=mobile||low;
 return {mobile,limited,targetFps:limited?30:60,pixelRatio:limited?1:1.6,minPixelRatio:limited?.7:.85,maxPixels:limited?650000:2200000,antialias:!limited,shadows:!limited,hdr:!limited,terrainStep:limited?36:12};
}
export function currentGraphicsProfile(){
 const n=globalThis.navigator||{},query=globalThis.matchMedia?.bind(globalThis);
 return graphicsProfile({width:globalThis.innerWidth||1024,height:globalThis.innerHeight||768,coarsePointer:!!query?.('(pointer:coarse)').matches||!!query?.('(any-pointer:coarse)').matches,cores:n.hardwareConcurrency||4,memory:n.deviceMemory||8,low:new URLSearchParams(globalThis.location?.search||'').get('quality')==='low'});
}
export function bufferPixelRatio(profile,width,height,quality=profile.pixelRatio,dpr=1){return Math.max(.1,Math.min(dpr,quality,Math.sqrt(profile.maxPixels/Math.max(1,width*height))));}
export function createPaintGate(fps=60){
 const interval=1000/fps;let previous=null;
 return {reset(){previous=null;},due(timestamp,force=false){if(force||previous===null||timestamp<previous||timestamp-previous>=interval-.5){previous=timestamp;return true;}return false;}};
}
// A slow frame can lower resolution, but never permanently remove the renderer.
export function createResolutionBudget(profile){
 let quality=profile.pixelRatio,last=null,samples=0,total=0,slow=0,stable=0;
 function reset(){last=null;samples=total=slow=stable=0;}
 return {reset,get quality(){return quality;},sample(now,active){
  if(!active){reset();return null;}if(last===null||now<last||now-last>5000){last=now;return null;}
  const dt=now-last;last=now;samples++;total+=dt;if(dt>1000/profile.targetFps*1.6)slow++;
  if(samples<45)return null;const mean=total/samples,previous=quality;
  if(slow>samples*.55){quality=Math.max(profile.minPixelRatio,Math.round((quality-.15)*100)/100);stable=0;}
  else if(mean<=1000/profile.targetFps*1.12&&slow<samples*.05){if(++stable>=6){quality=Math.min(profile.pixelRatio,Math.round((quality+.05)*100)/100);stable=0;}}
  else stable=0;
  samples=total=slow=0;
  return {mean,quality,changed:previous!==quality};
 }};
}
