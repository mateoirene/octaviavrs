import {createCircuitLayout} from './circuit-layout.mjs?v=20261024-tour1';
// Referencia: https://www.tesla.com/es_es/model3 (consulta 26-10-2026).
// Curva de juego calibrada al 0-100 declarado; no modelo homologado de dinámica.
export const TESLA_PERFORMANCE=Object.freeze({powerCV:460,powerKW:460*.73549875,zeroTo100:3.1,topKmh:262,mass:1850});
export function teslaAcceleration(speed){const v=Math.max(0,speed),launch=(100/3.6)/TESLA_PERFORMANCE.zeroTo100;if(v<100/3.6)return launch;return Math.max(.35,Math.min(launch,TESLA_PERFORMANCE.powerKW*1000/(TESLA_PERFORMANCE.mass*v)-.15-.00032*v*v));}
export function teslaTargetSpeed(state,car){const layout=createCircuitLayout(state.difficulty,state.trackLength,state.circuit),max=TESLA_PERFORMANCE.topKmh/3.6,grip={easy:8,intermediate:9.4,expert:11}[state.difficulty]||9.4;let target=max;for(let d=0;d<=270;d+=15){const curvature=Math.abs(layout.curvature(car.distance+d));const corner=Math.min(max,Math.sqrt(grip/Math.max(.00001,curvature)));target=Math.min(target,Math.sqrt(corner*corner+2*11*d));}return Math.max(18,target);}
export function advanceTesla(state,car,dt){const target=teslaTargetSpeed(state,car);car.nitroBraking=car.speed>target+.5;car.braking=car.nitroBraking;car.speed=car.speed>target?Math.max(target,car.speed-11*dt):Math.min(target,car.speed+teslaAcceleration(car.speed)*dt);}
