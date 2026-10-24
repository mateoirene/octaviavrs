import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRace} from '../dist/racing-physics.mjs';
import {finalRaceSummary} from '../dist/racing-summary.mjs';
test('resumen solo tras tres vueltas, con piloto, nivel y mejor vuelta de esa carrera',()=>{const race=createRace(15,'expert');assert.throws(()=>finalRaceSummary(race,'Alberto'));Object.assign(race,{phase:'finished',completedLaps:3,elapsed:246,lapTimes:[83,81,82],position:2});const summary=finalRaceSummary(race,'Alberto');assert.deepEqual(summary,{pilot:'Alberto',level:'Experto',position:2,participants:4,total:246,best:81,laps:[83,81,82]});race.lapTimes[0]=0;assert.deepEqual(summary.laps,[83,81,82]);assert.equal(summary.best,81);});
