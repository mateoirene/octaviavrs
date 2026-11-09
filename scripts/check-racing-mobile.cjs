const {chromium}=require('playwright');
const {mkdir,writeFile}=require('node:fs/promises');
const assert=require('node:assert/strict');
(async()=>{
 const base=process.env.RACE_TEST_URL||'https://octaviaap.pages.dev/simulador',verify=process.env.ASSERT_MOBILE_REPAIR==='1';
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 await mkdir('artifacts',{recursive:true});const reports=[];
 try{for(const [label,viewport]of [['portrait',{width:390,height:844}],['landscape',{width:844,height:390}]]){
  const context=await browser.newContext({viewport,deviceScaleFactor:3,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'});
  await context.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>4});});
  const page=await context.newPage(),errors=[],requests=[],warnings=[],failures=[];page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')warnings.push(m.text());});page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/sky\.hdr/.test(r.url()))requests.push(r.url());});
  await page.goto(base+(base.includes('?')?'&':'?')+'mobilecheck='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>['webgl2','2d-fallback'].includes(document.querySelector('[data-racing-stage]')?.dataset.renderer),{timeout:90000});
  await page.locator('[data-racing-stage]').scrollIntoViewIfNeeded();
  const snapshot=()=>page.evaluate(()=>{const s=document.querySelector('[data-racing-stage]'),c=s.querySelector('.race-world3d'),gl=c?.getContext('webgl2');return {data:{...s.dataset},width:s.clientWidth,height:s.clientHeight,hidden:c?.hidden,buffer:gl?[gl.drawingBufferWidth,gl.drawingBufferHeight]:null,antialias:gl?.getContextAttributes()?.antialias,coarse:matchMedia('(pointer:coarse)').matches,cores:navigator.hardwareConcurrency};});
  const initial=await snapshot();initial.resources=await page.evaluate(async()=>{const out=[];for(const path of ['assets/track3d/asphalt-color.jpg','assets/track3d/asphalt-normal.jpg','assets/track3d/asphalt-rough.jpg','assets/cesped-circuito.jpg']){const r=await fetch(path+'?diagnose='+Date.now(),{cache:'no-store'}),b=new Uint8Array(await r.arrayBuffer());out.push({path,status:r.status,type:r.headers.get('content-type'),bytes:b.length,header:[...b.slice(0,8)]});}return out;});initial.supportsWebgl2=await page.evaluate(()=>!!document.createElement('canvas').getContext('webgl2'));
  await page.locator('[data-pilot-name]').fill('Prueba móvil');await page.locator('[data-race-start]').evaluate(b=>b.click());
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp'})));
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await page.waitForTimeout(8000);await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  await page.evaluate(()=>{window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp'}));window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyP'}));});
  const driving=await snapshot();await page.locator('[data-racing-stage]').screenshot({path:'artifacts/mobile-'+label+'-driving.png'});
  const lossSupported=await page.evaluate(()=>{const c=document.querySelector('.race-world3d'),gl=c?.getContext('webgl2'),ext=gl?.getExtension('WEBGL_lose_context');if(!ext)return false;window.__testRestore=()=>ext.restoreContext();ext.loseContext();return true;});
  let lost=null,restored=null;
  if(lossSupported){await page.waitForTimeout(600);lost=await snapshot();await page.evaluate(()=>window.__testRestore());await page.waitForTimeout(2500);restored=await snapshot();await page.locator('[data-racing-stage]').screenshot({path:'artifacts/mobile-'+label+'-restored.png'});}
  const report={label,initial,driving,lossSupported,lost,restored,hdrRequests:requests.length,errors,warnings,failures};reports.push(report);console.log('MOBILE_DIAGNOSTIC '+JSON.stringify(report));
  if(verify){assert.equal(initial.data.mobileGraphics,'true',label+' uses mobile budget even in landscape');assert.equal(initial.antialias,false);assert.equal(requests.length,0,'mobile must not allocate HDR/PMREM');assert.equal(driving.data.renderer,'webgl2');assert.equal(driving.hidden,false);assert.ok(lossSupported);assert.equal(lost.data.renderer,'2d-fallback');assert.equal(restored.data.renderer,'webgl2');assert.equal(restored.hidden,false);assert.ok(Number(restored.data.contextRestores)>=1);assert.deepEqual(errors,[]);}
  await context.close();
 }}finally{await writeFile('artifacts/mobile-diagnostics.json',JSON.stringify(reports,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
