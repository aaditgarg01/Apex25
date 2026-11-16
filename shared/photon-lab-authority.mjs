import {createSession,stepSession} from './session.mjs';
import {LiveInputStream} from './input-stream.mjs';
import {stepCar,resetCar} from './physics.mjs';
import {encodeState,encodeMotion} from './netcode.mjs';
import {requestPit,pitLayout} from './pits.mjs';
import {trackBarriers} from './barriers.mjs';
import {targetSpeed} from './tracks.mjs';
// Development-only browser-hosted authority. It uses the actual shared APEX
// session/physics and input stream, but is not production server authority.
export class PhotonLabAuthority{
 constructor(track,emit){this.track=track;this.emit=emit;this.players=[];this.streams=new Map();this.session=null;this.acc=0;this.last=null;this.lastSnapshot=-Infinity;this.lastFull=-Infinity;this.lastHistory=-Infinity;}
 setPlayers(players){
  this.players=players.filter(p=>!p.isInactive).map(p=>({id:'p'+p.number,name:p.name||'Driver '+p.number,number:p.number}));
  if(this.session)for(const car of this.session.cars)if(!car.ai&&!this.players.some(p=>p.id===car.id)){car.ai=true;this.streams.delete(car.id);}
 }
 start(){
  if(this.session)throw Error('End the current test before starting another.');
  if(this.players.length<2)throw Error('Join with a second driver before starting the comparison.');
  trackBarriers(this.track);pitLayout(this.track);for(let w=0;w<=20;w++)targetSpeed(this.track,0,'normal',w/20);
  const bots=Array.from({length:Math.max(0,8-this.players.length)},(_,i)=>({id:'ai'+i,name:'LAB AI '+(i+1),ai:true}));
  this.session=createSession(this.track,[...this.players,...bots],{mode:'race',laps:3,conditions:'normal'});
  this.streams=new Map(this.session.cars.filter(c=>!c.ai).map(c=>[c.id,new LiveInputStream(c)]));
  this.acc=0;this.last=null;
  this.emit({type:'start',trackId:this.track.id,...this.session},true);
 }
 receive(number,message){
  if(!this.players.some(p=>p.number===number))return;
  if(message?.type==='ping'){this.emit({type:'pong',time:message.time},true,number);return;}
  const s=this.session,car=s?.cars.find(c=>c.id==='p'+number);if(!car)return;
  if(message.type==='commands')this.streams.get(car.id)?.accept(car,message.epoch,message.commands,s.elapsed);
  if(message.type==='pit')requestPit(car,message.compound||'medium');
  if(message.type==='reset'&&s.elapsed>=0&&resetCar(car,this.track,false,s.elapsed))this.streams.get(car.id)?.reset(car,s.elapsed);
 }
 tick(now){
  if(!this.session){this.last=now;return;}
  if(this.last===null){this.last=now;return;}
  this.acc+=Math.min(.15,Math.max(0,(now-this.last)/1000));this.last=now;
  while(this.acc>=1/60){this.acc-=1/60;stepSession(this.session,{},this.track,1/60,(car,input,track,dt,elapsed,laps)=>{
   const stream=this.streams.get(car.id);if(stream&&!car.ai)stream.step(car,input,track,dt,elapsed,laps);else stepCar(car,input,track,dt,elapsed,laps);
  });}
  if(this.session.elapsed-this.lastSnapshot<1/20-1e-6&&this.phase===this.session.phase)return;
  this.lastSnapshot=this.session.elapsed;
  const signature=this.session.cars.map(c=>c.id+':'+c.lapHistory.length).join('|'),history=signature!==this.historySignature||now-this.lastHistory>=2000;
  const full=history||now-this.lastFull>=1000||this.phase!==this.session.phase;
  if(history){this.historySignature=signature;this.lastHistory=now;}
  if(full){this.lastFull=now;this.phase=this.session.phase;this.emit(encodeState(this.session,history),true);}
  else this.emit(encodeMotion(this.session),false);
 }
}
