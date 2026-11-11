const key='octavia-highway-preferences-v1';
export function validatePreferences(value={}){return {camera:['chase','driver','aerial','bonnet'].includes(value?.camera)?value.camera:'chase',quality:['auto','high','medium','low'].includes(value?.quality)?value.quality:'auto',ambience:['day','sunset','night'].includes(value?.ambience)?value.ambience:'day'};}
export function loadPreferences(storage){try{return validatePreferences(JSON.parse((storage||globalThis.localStorage).getItem(key)||'{}'));}catch{return validatePreferences();}}
export function savePreferences(value,storage){try{(storage||globalThis.localStorage).setItem(key,JSON.stringify(validatePreferences(value)));}catch{/* Private mode can deny storage; driving still works. */}}
export function createDriveMeasurement(durationMs=30000){
 let active=false,elapsed=0,previous=null;
 return {get active(){return active;},get elapsedMs(){return elapsed;},start(){active=true;elapsed=0;previous=null;},suspend(){previous=null;},cancel(){active=false;previous=null;},step(now,running){if(!active||!Number.isFinite(now))return false;if(!running){previous=null;return false;}if(previous!==null)elapsed+=Math.max(0,now-previous);previous=now;if(elapsed>=durationMs){active=false;return true;}return false;}};
}
export function makePerformanceReport(stats,details,startSettings,endSettings){
 return {schema:1,application:'Octavia VRS · Autovía',sampleSeconds:details.sampleSeconds,renderer:{gpu:stats.gpu,software:stats.software},result:{fps:stats.fps,frames:stats.frames,p95ms:stats.p95ms,slowFrames:stats.slowFrames,targetFps:stats.targetFps},display:{width:details.width,height:details.height,dpr:details.dpr},device:{browserReportsAndroid:details.browserReportsAndroid===true,physicalAndroidVerifiedByAgent:false},settings:{start:validatePreferences(startSettings),end:validatePreferences(endSettings),changed:JSON.stringify(validatePreferences(startSettings))!==JSON.stringify(validatePreferences(endSettings))},notice:'Medición local de este navegador. No certifica otro dispositivo ni se envía al servidor.'};
}
