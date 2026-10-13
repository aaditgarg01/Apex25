import {normalizeConditions,conditionProfile} from './conditions.mjs';
import {createCar,stepRace,stepCar,standings} from './physics.mjs';
import {sample,wrap} from './tracks.mjs';
export const SESSION_MODES=['weekend','practice','race'];
export const QUALIFYING_LIMIT=420;
export const validLapCount=n=>Number.isSafeInteger(n)&&n>=1;
export const normalizeLapCount=n=>validLapCount(n)?n:3;
export function qualifyingOrder(cars){return [...cars].sort((a,b)=>(a.bestLap||Infinity)-(b.bestLap||Infinity)||a.index-b.index);}
export function createSession(track,drivers,{mode='weekend',laps=3,practiceStart='start',conditions='normal'}={}){
 conditions=normalizeConditions(conditions);
 const s={conditions,mode:SESSION_MODES.includes(mode)?mode:'weekend',laps:normalizeLapCount(laps),elapsed:-4,phase:mode==='practice'?'practice':mode==='race'?'race':'qualifying',cars:drivers.map((d,i)=>createCar(track,d.id,d.name,i,!!d.ai,d.colorId,conditions)),qualifying:[]};
 if(s.phase!=='race')for(const c of s.cars){const start=s.phase==='practice'?(practiceStart==='eau-rouge'&&track.id==='be-1925'?650/7004*track.length:practiceStart==='sector2'?track.length/3:practiceStart==='sector3'?track.length*2/3:0):0;const spawn=s.phase==='practice'?start-c.index*8:start,p=sample(track,spawn);Object.assign(c,{...p,s:wrap(spawn,track.length),progress:spawn,motionHeading:p.heading,motionYawRate:0,v:s.phase==='qualifying'?45*conditionProfile(conditions).pace:0,invalidLap:start>0,outLap:start>0});}
 return s;
}
export function endSession(s){
 if(s.phase==='qualifying'){s.qualifying=qualifyingOrder(s.cars).map(c=>({id:c.id,name:c.name,time:c.bestLap}));s.phase='qualifying-results';}
 else if(s.phase==='practice')s.phase='practice-results';
}
export function advanceToRace(s,track){
 if(s.phase!=='qualifying-results')return false;
 s.cars=qualifyingOrder(s.cars).map((c,i)=>createCar(track,c.id,c.name,i,c.ai,c.colorId,s.conditions));s.phase='race';s.elapsed=-4;return true;
}
export function stepSession(s,inputs,track,dt,stepDriver=stepCar){
 if(!['practice','qualifying','race'].includes(s.phase))return;
 s.elapsed+=dt;if(s.elapsed<0)return;
 if(s.phase==='race'||s.phase==='practice')stepRace(s.cars,inputs,track,dt,s.elapsed,s.phase==='practice'?Infinity:s.laps,stepDriver);
 else for(const c of s.cars)stepDriver(c,inputs[c.id]||{},track,dt,s.elapsed,s.phase==='practice'?Infinity:1);
 if(s.phase==='qualifying'&&(s.elapsed>=QUALIFYING_LIMIT||s.cars.every(c=>c.finished)))endSession(s);
 if(s.phase==='race'&&s.cars.every(c=>c.finished))s.phase='race-results';
}
export function sessionStandings(s){return s.phase.startsWith('qualifying')||s.phase.startsWith('practice')?qualifyingOrder(s.cars):standings(s.cars);}
