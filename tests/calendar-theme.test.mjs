import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthCells,shiftMonth,calendarToday,eventsFor,nextUpcoming} from '../dist/calendar.mjs';
test('calendario enero 2027 empieza en viernes y conserva la quedada del sábado 23',()=>{const cells=monthCells(2027,1);assert.equal(cells[4],'2027-01-01');assert.equal(cells[26],'2027-01-23');assert.equal(cells.filter(Boolean).length,31);assert.deepEqual(shiftMonth(2027,1,-1),{year:2026,month:12});assert.deepEqual(shiftMonth(2026,12,1),{year:2027,month:1});const events=[{date:'2027-01-23',id:'calcotada'}];assert.equal(eventsFor(events,2027,1).length,1);assert.equal(eventsFor(events,2027,2).length,0);assert.equal(nextUpcoming(events,'2026-10-24').id,'calcotada');});
test('Hoy sigue la fecha de Madrid incluso si UTC sigue en el día anterior',()=>{assert.equal(calendarToday(new Date('2026-12-31T23:30:00Z')),'2027-01-01');assert.equal(calendarToday(new Date('2026-06-01T22:30:00Z')),'2026-06-02');});
