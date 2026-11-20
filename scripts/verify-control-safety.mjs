// Standalone control handoff/focus diagnostic; separate from game test suite.
import assert from 'node:assert/strict';
import {DriverControls} from '../shared/controls.mjs';
const keys=new Set(),pad={id:'Safety pad',index:0,connected:true,axes:[.7],buttons:Array.from({length:8},()=>({pressed:false,value:0}))},controls=new DriverControls();
controls.read(keys,pad);pad.buttons[7]={pressed:true,value:1};
assert.equal(controls.read(keys,pad).source,'gamepad');
keys.add('KeyW');assert.equal(controls.read(keys,pad).steer,0);keys.clear();
let c=controls.read(keys,pad);assert.equal(c.source,'keyboard','Held controller reclaimed keyboard driving');assert.equal(c.throttle,false,'Held trigger accelerated after keyboard release');
pad.buttons[7]={pressed:false,value:0};controls.read(keys,pad);pad.buttons[7]={pressed:true,value:1};assert.equal(controls.read(keys,pad).source,'gamepad');
c=controls.read(keys,pad,false);assert.equal(c.throttle,false,'Unfocused controller keeps accelerating');assert.equal(c.steer,0);assert.equal(c.brake,true);assert.equal(c.park,true);
c=controls.read(keys,pad,true);assert.equal(c.throttle,false,'Refocusing rearmed a held trigger');assert.equal(c.source,'keyboard');
pad.buttons[7]={pressed:false,value:0};controls.read(keys,pad);pad.buttons[0]={pressed:true,value:1};assert.equal(controls.read(keys,pad).boost,true);
controls.read(keys,null);pad.buttons[0]={pressed:false,value:0};pad.buttons[7]={pressed:true,value:1};assert.equal(controls.read(keys,pad).source,'keyboard','Reconnected held controller activated without a press');
assert.equal(controls.read(new Set(['ArrowRight']),pad).steer,-1);
console.log(JSON.stringify({keyboardRelease:true,freshControllerPress:true,focusLossBrakes:true,focusReturnRequiresPress:true,controllerReconnectRequiresPress:true}));
