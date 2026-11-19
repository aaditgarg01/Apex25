// Focused contact replication/presentation diagnostic, separate from game suite.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createCar} from '../shared/physics.mjs';
import {sample} from '../shared/tracks.mjs';
import {resolveCarContacts,carContact} from '../shared/collisions.mjs';
import {NetworkMotion,encodeMotion,mergeMotionState} from '../shared/netcode.mjs';
const points=[];for(let edge=0;edge<4;edge++)for(let d=0;d<2000;d+=4){const p=edge===0?{x:0,z:d,heading:0}:edge===1?{x:d,z:2000,heading:Math.PI/2}:edge===2?{x:2000,z:2000-d,heading:Math.PI}:{x:2000-d,z:0,heading:-Math.PI/2};points.push({...p,y:0,pitch:0,grade:0,groundY:0});}
const track={id:'contact-diagnostic',points,length:8000,step:4,width:30,urban:false,arid:false};
const make=(id,s,fields={})=>Object.assign(createCar(track,id,id,0),sample(track,s),{s,progress:s,motionHeading:sample(track,s).heading,v:20,inputEpoch:0,inputTime:1,physicsTime:1,pitState:'none'},fields);
const state=cars=>({phase:'race',conditions:'normal',elapsed:1,cars});
const cases=[['rear contact',make('a',300,{v:30}),make('b',304,{v:20})],['head on',make('a',300),make('b',304,{heading:Math.PI,motionHeading:Math.PI})],['side contact',make('a',300,{x:-.9,impactVX:3}),make('b',300,{x:.9,impactVX:-3})]];
const rows=[];
for(const [name,a,b]of cases){
 const before=structuredClone(state([a,b]));assert(carContact(a,b),name+' initial contact');
 const count=resolveCarContacts([a,b],null,{time:1});assert(count>0);assert(a.contactSequence>0&&b.contactSequence>0,name+' both marked');assert.equal(a.lastContactWith,'b');assert.equal(b.lastContactWith,'a');
 const server={...state([a,b]),elapsed:1.05},wire=JSON.parse(encodeMotion(server)),decoded=mergeMotionState(before,wire),saved=JSON.stringify(decoded);
 assert.equal(decoded.cars[0].contactSequence,a.contactSequence);assert.equal(decoded.cars[1].lastContactWith,'a');
 const peers=['a','b'].map(id=>{const net=new NetworkMotion(track,id,{liveInput:true});net.tracking.rtt=0;net.receive(before,0);net.receive(decoded,50);return net;});
 const poses=peers.map(net=>net.frame(50,1/60,{park:true}));
 let maxPeerDifference=0;for(const car of decoded.cars){const p=poses[0].find(c=>c.id===car.id),q=poses[1].find(c=>c.id===car.id);maxPeerDifference=Math.max(maxPeerDifference,Math.hypot(p.x-q.x,p.z-q.z));}
 assert(maxPeerDifference<.001,name+' same server contact shown by both peers');assert.equal(JSON.stringify(decoded),saved,'render does not mutate server state');
 for(const net of peers){assert(net.tracking.contactLocks.get('a')>50&&net.tracking.contactLocks.get('b')>50);const original=net.tracking.local.contactSequence;net.receive(decoded,55);assert.equal(net.tracking.local.contactSequence,original,'duplicate marker does not apply another impact');}
 rows.push({scenario:name,solverContacts:count,pairedMarkers:true,compactPacketRoundTrip:true,peerPresentationDifferenceMetres:maxPeerDifference});
}
const ghostA=make('a',300,{pitState:'lane'}),ghostB=make('b',302);assert.equal(resolveCarContacts([ghostA,ghostB]),0);assert.equal(ghostA.contactSequence,undefined);
const delayed=[];for(const delay of [90,180]){const [a,b]=[make('a',300,{v:30}),make('b',304)],before=structuredClone(state([a,b]));resolveCarContacts([a,b],null,{time:1});const next={...state([a,b]),elapsed:1.05};for(const id of ['a','b']){const net=new NetworkMotion(track,id,{liveInput:true});net.tracking.rtt=delay*2;net.receive(before,0);net.frame(40,1/60,{throttle:true});net.receive(next,50+delay);const cars=net.frame(50+delay,1/60,{throttle:true});assert(cars.every(c=>[c.x,c.z,c.v].every(Number.isFinite)));assert(net.tracking.contactLocks.get('a')>50+delay&&net.tracking.contactLocks.get('b')>50+delay);delayed.push({oneWayDelayMs:delay,driver:id,receivedContactSequence:net.tracking.local.contactSequence,pairedFreshTimeline:true});}}
const report={delayed,description:'Actual shared collision solver + compact motion replication + two client presentation views at the same receipt clock. Does not measure two-device internet collision latency.',cases:rows,pitGhostExcluded:true,snapshotImmutability:true};console.log(JSON.stringify(report,null,2));if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
