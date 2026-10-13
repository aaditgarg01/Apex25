import test from 'node:test';import assert from 'node:assert/strict';import {readFile}from'node:fs/promises';
import{makeTracks,sample,angleDiff,targetSpeed}from'../shared/tracks.mjs';import{createSession,stepSession}from'../shared/session.mjs';import{stepCar}from'../shared/physics.mjs';import{NetworkMotion,encodeState}from'../shared/netcode.mjs';import{InputStream,INPUT_DT}from'../shared/input-stream.mjs';import{resolveCarContacts}from'../shared/collisions.mjs';
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url))));
function controls(c,t){const p=sample(t,c.s+Math.max(12,c.v*.55)),aim=Math.atan2(p.x-c.x,p.z-c.z),desired=targetSpeed(t,c.s)*.70;return {steer:Math.max(-1,Math.min(1,angleDiff(aim,c.heading)*3)),throttle:c.v<desired,brake:c.v>desired+3};}
for(const rtt of [100,300])test(`two drivers, four AI and turning traffic at ${rtt}ms RTT`,()=>{
 const t=tracks.find(t=>t.id==='at-1969'),s=createSession(t,[{id:'p',name:'P'},{id:'q',name:'Q'},...Array.from({length:4},(_,i)=>({id:'ai'+i,name:'AI',ai:true}))],{mode:'race',laps:3});s.elapsed=0;
 const clients=['p','q'].map(id=>({id,motion:new NetworkMotion(t,id),stream:new InputStream(s.cars.find(c=>c.id===id)),up:[],down:[],lastUp:0,lastDown:0}));
 for(const c of clients)c.motion.receive(structuredClone(s),0);
 let correction=0,pending=0,steerChanges=0;
 for(let tick=1;tick<=1200;tick++){
  const now=tick*INPUT_DT*1000;
  for(const c of clients)while(c.up.length&&c.up[0].at<=now){const p=c.up.shift().packet;assert(c.stream.accept(s.cars.find(x=>x.id===c.id),p.epoch,p.commands,s.elapsed));}
  stepSession(s,{},t,INPUT_DT,(car,input,t,dt,elapsed,laps)=>{const c=clients.find(c=>c.id===car.id);if(c)c.stream.step(car,input,t,dt,elapsed,laps,()=>resolveCarContacts(s.cars,car.id));else stepCar(car,input,t,dt,elapsed,laps);});
  for(const c of clients){
   if(tick%3===0){c.lastDown=Math.max(c.lastDown,now+rtt/2+25*(1+Math.sin(tick)));c.down.push({at:c.lastDown,state:JSON.parse(encodeState(s))});}
   let newest;while(c.down.length&&c.down[0].at<=now)newest=c.down.shift();
   if(newest){const before={...c.motion.local};c.motion.receive(newest.state,now);correction=Math.max(correction,Math.hypot(before.x-c.motion.local.x,before.z-c.motion.local.z));}
   const input=controls(c.motion.local,t),before=c.motion.local.steer;c.motion.frame(now,INPUT_DT,input);if(Math.abs(before-c.motion.local.steer)>.0001)steerChanges++;
   pending=Math.max(pending,c.motion.pending.length);assert(Number.isFinite(c.motion.visual.x));
   if(tick%2===0){const packet=c.motion.takeCommands();if(packet){c.lastUp=Math.max(c.lastUp,now+rtt/2+25*(1+Math.cos(tick)));c.up.push({at:c.lastUp,packet});}}
  }
 }
 console.log(`Traffic RTT ${rtt}: largest correction ${correction.toFixed(3)}m, pending ${pending}, input responses ${steerChanges}`);
 assert(correction<3,`traffic correction ${correction.toFixed(3)}m`);assert(pending<60);assert(steerChanges>100);
});
