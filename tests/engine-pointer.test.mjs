import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
test('cursor nativo: no sigue movimientos, ilumina solo controles activos con ratón y limpia el estado',()=>{
 const docEvents=new Map(),winEvents=new Map(),timers=new Map(),classes=new Set();let id=0;
 const root={classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)}};
 const document={documentElement:root,hidden:false,addEventListener:(name,fn)=>docEvents.set(name,fn),createElement(){throw Error('No debe crear un cursor flotante');}};
 runInNewContext(readFileSync(new URL('../dist/engine-pointer.js',import.meta.url),'utf8'),{document,window:{addEventListener:(name,fn)=>winEvents.set(name,fn)},setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:i=>timers.delete(i),requestAnimationFrame(){throw Error('El cursor no debe depender de fotogramas');}});
 assert.equal(docEvents.has('pointermove'),false);
 const control={disabled:false,getAttribute(){return null;},closest(){return null;}};
 const event={pointerType:'mouse',button:0,target:{closest:()=>control}};
 const down=docEvents.get('pointerdown'),lit=()=>classes.has('engine-cursor-lit');
 down(event);assert.equal(lit(),true);assert.equal(timers.size,1);
 down(event);assert.equal(timers.size,1,'No acumula temporizadores');
 [...timers.values()][0]();assert.equal(lit(),false);
 for(const pointerType of ['touch','pen']){down({...event,pointerType});assert.equal(lit(),false);}
 down({...event,button:2});assert.equal(lit(),false);
 down({...event,target:{closest:()=>null}});assert.equal(lit(),false,'Los campos de texto no disparan el brillo');
 control.disabled=true;down(event);assert.equal(lit(),false);control.disabled=false;
 control.getAttribute=()=> 'true';down(event);assert.equal(lit(),false);control.getAttribute=()=>null;
 control.closest=()=>({});down(event);assert.equal(lit(),false);control.closest=()=>null;
 down(event);winEvents.get('blur')();assert.equal(lit(),false);
 down(event);document.hidden=true;docEvents.get('visibilitychange')();assert.equal(lit(),false);assert.equal(timers.size,0);
});
