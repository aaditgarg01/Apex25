// Focused input-source diagnostic; does not invoke the game's test suite.
import assert from 'node:assert/strict';import {DriverControls} from '../shared/controls.mjs';
const controls=new DriverControls(),pad={connected:true,axes:[.7],buttons:Array.from({length:8},()=>({pressed:false,value:0}))};
assert.equal(controls.read(new Set(),pad).steer,0,'Idle controller injects steering');assert.equal(controls.read(new Set(['KeyW']),pad).steer,0);assert.equal(controls.read(new Set(['KeyA']),pad).steer,1);assert.equal(controls.read(new Set(),pad).source,'keyboard');
pad.buttons[7]={pressed:true,value:1};assert.equal(controls.read(new Set(),pad).source,'gamepad');assert.equal(controls.read(new Set(),pad).steer,-.7);assert.equal(controls.read(new Set(['KeyW']),pad).steer,0);pad.buttons[7]={pressed:false,value:0};assert.equal(controls.read(new Set(),pad).steer,0);console.log('Keyboard priority, idle-pad exclusion and intentional gamepad activation passed');
