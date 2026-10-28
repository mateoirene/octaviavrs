import {createCircuitLayout} from './circuit-layout.mjs?v=20261024-tour1';
// Referencia: https://www.tesla.com/es_es/model3 (consulta 26-10-2026).
// Curva de juego calibrada al 0-100 declarado; no modelo homologado de dinámica.
export const TESLA_PERFORMANCE=Object.freeze({powerCV:460,powerKW:460*.73549875,zeroTo100:3.1,topKmh:250,mass:1850});
export const TESLA_RACE_GAP=Object.freeze({target:18,maximum:90,minimum:-55});
export function teslaAcceleration(speed){const v=Math.max(0,speed),launch=(100/3.6)/TESLA_PERFORMANCE.zeroTo100;if(v<100/3.6)return launch;return Math.max(.35,Math.min(launch,TESLA_PERFORMANCE.powerKW*1000/(TESLA_PERFORMANCE.mass*v)-.15-.00032*v*v));}
export function teslaTargetSpeed(state,car){const layout=createCircuitLayout(state.difficulty,state.trackLength,state.circuit),max=Math.min(TESLA_PERFORMANCE.topKmh/3.6,car.cruiseSpeed??TESLA_PERFORMANCE.topKmh/3.6),grip={easy:8,intermediate:9.4,expert:11}[state.difficulty]||9.4;let cornerTarget=max;for(let d=0;d<=270;d+=15){const curvature=Math.abs(layout.curvature(car.distance+d));const corner=Math.min(max,Math.sqrt(grip/Math.max(.00001,curvature)));cornerTarget=Math.min(cornerTarget,Math.sqrt(corner*corner+2*11*d));}
 // El Model 3 corre como un rival real, pero regula su ritmo para mantenerse en
 // la misma batalla que el piloto. Sigue pudiendo cruzar primero si conserva
 // esta pequeña ventaja y usa toda su punta cuando se queda por detrás.
 const gap=car.distance-state.distance,playerPace=Math.max(18,state.speed),correction=Math.max(-16,Math.min(22,(TESLA_RACE_GAP.target-gap)*.34)),racePace=Math.max(18,Math.min(max,playerPace+correction));
 // Cuando queda detrás, el Tesla toma la trazada de carrera con más eficacia
 // para recuperar el grupo. Cuando va por delante sí respeta la frenada de la
 // curva y evita desaparecer a cientos de metros del jugador.
 car.raceGap=gap;const target=gap<TESLA_RACE_GAP.target?Math.max(cornerTarget,racePace):Math.min(cornerTarget,racePace);return Math.max(18,target);}
export function advanceTesla(state,car,dt){const maximum=TESLA_PERFORMANCE.topKmh/3.6,target=Math.min(maximum,teslaTargetSpeed(state,car));car.speed=Math.min(maximum,Math.max(0,car.speed));car.nitroBraking=car.speed>target+.5;car.braking=car.nitroBraking;car.speed=car.speed>target?Math.max(target,car.speed-11*dt):Math.min(target,car.speed+teslaAcceleration(car.speed)*dt);}
