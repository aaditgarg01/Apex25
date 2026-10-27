import {initializeWeather,stepWeather,applyWeather} from './weather.mjs';
import {prepareTyres} from './tyres.mjs';
import {preparePitTraffic} from './pits.mjs';
import {normalizeConditions} from './conditions.mjs';
import {QUALIFYING_LIMIT,finishQualifyingCar} from './qualifying.mjs';
import {createCar,stepRace,stepCar,standings} from './physics.mjs';
import {sample,wrap} from './tracks.mjs';
export const SESSION_MODES=['weekend','practice','race'];
export {QUALIFYING_LIMIT};
export const validLapCount=n=>Number.isSafeInteger(n)&&n>=1;
export const normalizeLapCount=n=>validLapCount(n)?n:3;
export function qualifyingOrder(cars){return [...cars].sort((a,b)=>(a.bestLap||Infinity)-(b.bestLap||Infinity)||a.index-b.index);}
export function createSession(track,drivers,{mode='weekend',laps=3,practiceStart='start',conditions='normal'}={}){
 conditions=normalizeConditions(conditions);
 const s={conditions,mode:SESSION_MODES.includes(mode)?mode:'weekend',laps:normalizeLapCount(laps),elapsed:-4,phase:mode==='practice'?'practice':mode==='race'?'race':'qualifying',cars:drivers.map((d,i)=>createCar(track,d.id,d.name,i,!!d.ai,d.colorId,conditions)),qualifying:[]};
 initializeWeather(s,conditions);
 for(const [i,c]of s.cars.entries())prepareTyres(c,s.phase==='race'?s.laps:Infinity,drivers[i].startTyre);
 if(s.phase!=='race')for(const c of s.cars){const start=s.phase==='practice'?(practiceStart==='mexico-stadium'&&track.id==='mx-1962'?track.length*.825:practiceStart==='eau-rouge'&&track.id==='be-1925'?650/7004*track.length:practiceStart==='sector2'?track.length/3:practiceStart==='sector3'?track.length*2/3:0):0;const spawn=s.phase==='practice'?start-c.index*8:start,p=sample(track,spawn);Object.assign(c,{...p,s:wrap(spawn,track.length),progress:spawn,motionHeading:p.heading,motionYawRate:0,v:0,qualifying:s.phase==='qualifying',invalidLap:start>0,outLap:s.phase==='qualifying'||start>0});}
 return s;
}
export function endSession(s){
 if(s.phase==='qualifying'){s.qualifying=qualifyingOrder(s.cars).map(c=>({id:c.id,name:c.name,time:c.bestLap}));s.phase='qualifying-results';}
 else if(s.phase==='practice')s.phase='practice-results';
}
export function advanceToRace(s,track){
 if(s.phase!=='qualifying-results')return false;
 s.cars=qualifyingOrder(s.cars).map((c,i)=>{const next=createCar(track,c.id,c.name,i,c.ai,c.colorId,s.conditions);prepareTyres(next,s.laps,c.startTyre);return next;});s.phase='race';s.elapsed=-4;initializeWeather(s,s.weatherMode||s.conditions,s.weather);return true;
}
export function stepSession(s,inputs,track,dt,stepDriver=stepCar){
 if(!['practice','qualifying','race'].includes(s.phase))return;
 s.elapsed+=dt;if(s.elapsed<0)return;
 stepWeather(s,dt);
 if(s.phase==='race'||s.phase==='practice')stepRace(s.cars,inputs,track,dt,s.elapsed,s.phase==='practice'?Infinity:s.laps,stepDriver);
 else {preparePitTraffic(s.cars,track);for(const c of s.cars){
  if(c.finished)continue;
  stepDriver(c,inputs[c.id]||{},track,dt,s.elapsed,Infinity);
  // Only a flying lap already in progress gets the chequered-flag extension.
  if(s.elapsed-(c.inputLag||0)>=QUALIFYING_LIMIT&&c.outLap&&!c.finished)finishQualifyingCar(c,s.elapsed);
 }
 }
 if(s.phase==='qualifying'&&s.cars.every(c=>c.finished))endSession(s);
 if(s.phase==='race'&&s.cars.every(c=>c.finished))s.phase='race-results';
}
export function sessionStandings(s){return s.phase.startsWith('qualifying')||s.phase.startsWith('practice')?qualifyingOrder(s.cars):standings(s.cars);}

// Joining never restarts the qualifying clock or touches existing lap results.
export function canJoinQualifying(s){return s?.phase==='qualifying'&&s.elapsed<QUALIFYING_LIMIT&&(s.cars.length<8||s.cars.some(c=>c.ai));}
export function addQualifyingDriver(s,track,driver){
 if(!canJoinQualifying(s)||s.cars.some(c=>c.id===driver.id))return null;
 const replace=s.cars.findIndex(c=>c.ai),old=replace>=0?s.cars[replace]:null,index=old?.index??Math.max(-1,...s.cars.map(c=>c.index))+1;
 const car=createCar(track,driver.id,driver.name,index,false,driver.colorId,s.conditions),p=sample(track,0);
 prepareTyres(car,Infinity,driver.startTyre);Object.assign(car,p,{s:0,progress:0,motionHeading:p.heading,motionYawRate:0,v:0,qualifying:true,outLap:true,lapStart:Math.max(0,s.elapsed)});
 if(replace>=0)s.cars.splice(replace,1,car);else s.cars.push(car);
 applyWeather(s);return {car,replacedId:old?.id??null};
}
