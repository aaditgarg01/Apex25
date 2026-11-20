import {INPUT_DT,encodeInput} from './input-stream.mjs';
import {MultiplayerTracking} from './multiplayer-tracking.mjs';
const active=s=>['race','qualifying','practice'].includes(s.phase)&&s.elapsed>=0;
// Tracking is presentation only. Live controls still replace unsent controls;
// contacts, session timing and results remain authoritative on the server.
export class NetworkMotion {
 constructor(track,id,{liveInput=false}={}){this.tracking=new MultiplayerTracking(track,id,{liveInput});this.liveInput=liveInput;this.control=null;this.sentKey=null;this.sentAt=-Infinity;this.id=id;this.session=null;this.visual=null;this.acc=0;this.lastAt=-Infinity;this.pending=[];this.outgoing=[];this.sequence=0;this.epoch=0;}
 record(s,now){this.tracking.record(s,now);}
 setPing(ms){this.tracking.setPing(ms);}
 receive(s,now,receivedAt=now){
  const car=s.cars.find(c=>c.id===this.id);if(!car)return;
  const previous=this.session,old=previous?.cars.find(c=>c.id===this.id);
  const reset=!previous||previous.phase!==s.phase||s.elapsed<previous.elapsed||car.inputEpoch!==old?.inputEpoch||car.finished!==old?.finished||car.restarts!==old?.restarts||car.resetTimer>(old?.resetTimer||0)+.3;
  if(reset){this.pending=[];this.outgoing=[];this.acc=0;this.control=null;this.sentKey=null;this.sentAt=-Infinity;}
  this.epoch=car.inputEpoch||0;this.sequence=Math.max(this.sequence,car.inputAck||0);
  const ack=car.inputAck||0;
  this.pending=this.pending.filter(command=>command[0]>ack);
  this.outgoing=this.outgoing.filter(command=>command[0]>ack);
  this.session=s;this.lastAt=receivedAt;this.visual={...car,smoothMotion:true};
  this.tracking.receive(s,now,reset,receivedAt);
 }
 updateControl(control,now){
  if(!this.liveInput||!this.session)return;
  const s=this.session,car=s.cars.find(c=>c.id===this.id);
  this.control=['race','qualifying','practice'].includes(s.phase)&&car&&!car.finished&&now-this.lastAt<=1000?encodeInput(0,control):null;
  this.tracking.remember(control,now);
 }
 takeCommands(now=0){
  if(this.liveInput){
   if(!this.control)return null;const key=this.control.slice(1).join(':');
   if(now-this.sentAt<12.5||key===this.sentKey&&now-this.sentAt<50)return null;
   this.sentKey=key;this.sentAt=now;const command=[++this.sequence,...this.control.slice(1)];this.tracking.sent(command[0],now);
   return {type:'commands',epoch:this.epoch,commands:[command]};
  }
  if(!this.outgoing.length)return null;return {type:'commands',epoch:this.epoch,commands:this.outgoing.splice(0,8)};
 }
 frame(now,dt,control){
  if(!this.session)return [];
  const s=this.session,car=s.cars.find(c=>c.id===this.id),stale=now-this.lastAt>1000;
  if(this.liveInput){
   this.updateControl(control,now);
  }else if(active(s)&&!car.finished&&!stale&&this.pending.length<120){
   this.acc+=Math.min(Math.max(0,dt),.1);
   while(this.acc+1e-9>=INPUT_DT&&this.pending.length<120){
    this.acc-=INPUT_DT;const command=encodeInput(++this.sequence,control);
    this.pending.push(command);this.outgoing.push(command);
   }
  }else this.acc=0;
  // The restored tracker fills uneven snapshot delivery without changing the
  // controls sent to the server or inventing client-side collision impulses.
  const rendered=this.tracking.frame(now,dt,control);
  this.visual=rendered.find(c=>c.id===this.id);
  return rendered;
 }
}
export const encodeState=(session,history=true)=>JSON.stringify({type:'state',...session},(key,v)=>!history&&(key==='lapHistory'||key==='lapValidHistory')?undefined:typeof v==='number'&&!Number.isInteger(v)?Math.round(v*1000)/1000:v);

// Positions remain exact server samples. Only frequently changing motion/telemetry fields
// travel at 60 Hz; standings and complete lap history travel less frequently.
export const MOTION_FIELDS=['id','x','y','z','heading','pitch','v','steer','motionHeading','impactVX','impactVZ','impactYaw','inputTime','physicsTime','inputAck','inputEpoch','progress','s','lateral','boost','finished','retired','resetTimer'];
export const STRATEGY_FIELDS=['id','tyreLife','tyreCompound','tyreBoostHeat','pitState','pitRequested','pitCompound','pitTimer','pitTravel','pitEntryProgress','pitEntryOffset','pitFitted','pitStops','pitClearance'];
export const PIT_SERVICE_FIELDS=['id','pitServiceDuration','lastPitService','lastPitServiceAt','lastPitServiceStop'];
const wireNumber=value=>typeof value==='number'&&!Number.isInteger(value)?Math.round(value*1000)/1000:value;
// Optional parallel rows keep old motion rows compatible with existing clients.
const motionRow=(car,fields)=>{const row=new Array(fields.length);for(let i=0;i<fields.length;i++)row[i]=wireNumber(car[fields[i]]);return row;};
export const encodeMotion=session=>{
 const packet={type:'motion',inputTiming:[],contacts:[],phase:session.phase,conditions:session.conditions,weatherMode:session.weatherMode,weather:session.weather,pitMerges:[],pitServices:[],raceFinishes:[],pitTyreServices:[],elapsed:Math.round(session.elapsed*1000)/1000,cars:[],strategy:[]};
 for(const car of session.cars){
  if(Number.isFinite(car.inputAppliedAt)&&car.inputAppliedSequence===car.inputAck)packet.inputTiming.push([car.id,car.inputAck,wireNumber(car.inputAppliedAt)]);
  if(car.contactSequence>0)packet.contacts.push([car.id,car.contactSequence,wireNumber(car.lastContactAt),car.lastContactWith,wireNumber(car.lastContactSeverity)]);
  if(car.pitMerge)packet.pitMerges.push([car.id,car.pitMerge]);
  packet.pitServices.push(motionRow(car,PIT_SERVICE_FIELDS));
  if(car.finished&&!car.retired)packet.raceFinishes.push([car.id,car.finishLaps,car.finishTime,car.lap]);
  if(car.lastPitTyreService>0)packet.pitTyreServices.push([car.id,wireNumber(car.lastPitTyreService)]);
  packet.cars.push(motionRow(car,MOTION_FIELDS));packet.strategy.push(motionRow(car,STRATEGY_FIELDS));
 }
 return JSON.stringify(packet);
};
// Index validated rows directly, avoiding temporary filter/map arrays per packet.
const inputAckIndex=MOTION_FIELDS.indexOf('inputAck');
function indexMotionRows(rows,length,valid){
 const index=new Map();
 if(Array.isArray(rows))for(const row of rows)if(Array.isArray(row)&&row.length===length&&(!valid||valid(row)))index.set(row[0],row);
 return index;
}
export function mergeMotionState(base,packet){
 if(!base||base.phase!==packet.phase||!Number.isFinite(packet.elapsed)||packet.elapsed<base.elapsed||!Array.isArray(packet.cars))return base;
 const poses=indexMotionRows(packet.cars,MOTION_FIELDS.length);
 const inputTiming=indexMotionRows(packet.inputTiming,3,row=>Number.isSafeInteger(row[1])&&Number.isFinite(row[2]));
 const contacts=indexMotionRows(packet.contacts,5,row=>Number.isSafeInteger(row[1])&&row[1]>=0&&Number.isFinite(row[2])&&typeof row[3]==='string'&&Number.isFinite(row[4]));
 const merges=Array.isArray(packet.pitMerges)?new Map(packet.pitMerges):null;
 const services=indexMotionRows(packet.pitServices,PIT_SERVICE_FIELDS.length);
 const finishes=indexMotionRows(packet.raceFinishes,4,row=>Number.isFinite(row[1])&&Number.isFinite(row[2])&&Number.isFinite(row[3]));
 const tyreServices=indexMotionRows(packet.pitTyreServices,2,row=>Number.isFinite(row[1]));
 const strategy=indexMotionRows(packet.strategy,STRATEGY_FIELDS.length);
 return {...base,conditions:packet.conditions||base.conditions,weatherMode:packet.weatherMode||base.weatherMode,weather:packet.weather||base.weather,elapsed:packet.elapsed,cars:base.cars.map(c=>{const row=poses.get(c.id);if(!row)return c;const next={...c};const timing=inputTiming.get(c.id);if(timing&&timing[1]===row[inputAckIndex]){next.inputAppliedAt=timing[2];next.inputAppliedSequence=timing[1];}else{delete next.inputAppliedAt;delete next.inputAppliedSequence;}const contact=contacts.get(c.id);if(contact){next.contactSequence=contact[1];next.lastContactAt=contact[2];next.lastContactWith=contact[3];next.lastContactSeverity=contact[4];}const finish=finishes.get(c.id);if(finish){next.finishLaps=finish[1];next.finishTime=finish[2];next.lap=finish[3];}if(tyreServices.has(c.id))next.lastPitTyreService=tyreServices.get(c.id)[1];if(merges)next.pitMerge=merges.get(c.id)||null;if(packet.weather){next.conditions=packet.conditions;next.trackWetness=packet.weather.wetness;next.rainIntensity=packet.weather.rain;}for(let i=1;i<MOTION_FIELDS.length;i++)if(row[i]!==null&&row[i]!==undefined)next[MOTION_FIELDS[i]]=row[i];const tyres=strategy.get(c.id);if(tyres)for(let i=1;i<STRATEGY_FIELDS.length;i++)if(STRATEGY_FIELDS[i]==='pitClearance')next.pitClearance=tyres[i]===null?Infinity:tyres[i];else if(tyres[i]!==null&&tyres[i]!==undefined)next[STRATEGY_FIELDS[i]]=tyres[i];const service=services.get(c.id);if(service)for(let i=1;i<PIT_SERVICE_FIELDS.length;i++)if(Number.isFinite(service[i]))next[PIT_SERVICE_FIELDS[i]]=service[i];return next;})};
}
