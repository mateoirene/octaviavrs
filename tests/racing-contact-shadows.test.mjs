import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawRearContactShadow,drawAerialContactShadow} from '../dist/racing-contact-shadows.mjs';

function context(){const ellipses=[];return {ellipses,save(){},restore(){},set fillStyle(value){this.color=value},beginPath(){},ellipse(...args){ellipses.push({args,color:this.color})},fill(){}};}

test('la vista trasera pega las dos ruedas al suelo con una sombra suave',()=>{const ctx=context();drawRearContactShadow(ctx,100,200,80,50);assert.equal(ctx.ellipses.length,3);const [soft,left,right]=ctx.ellipses;assert.equal(soft.args[1]<200,true);assert.equal(left.args[0]<100,true);assert.equal(right.args[0]>100,true);assert.equal(left.color,'rgba(0,0,0,.42)');});

test('la vista aérea orienta la sombra con la longitud del coche y cuatro apoyos',()=>{const ctx=context();drawAerialContactShadow(ctx,80,180);assert.equal(ctx.ellipses.length,5);assert.ok(ctx.ellipses[0].args[3]>ctx.ellipses[0].args[2]);const contacts=ctx.ellipses.slice(1);assert.deepEqual(new Set(contacts.map(e=>Math.sign(e.args[0]))),new Set([-1,1]));assert.deepEqual(new Set(contacts.map(e=>Math.sign(e.args[1]))),new Set([-1,1]));});
