import {raceStrategy,liveTyreAdvice} from './strategy.mjs';
import {TYRES,chooseStartingTyres,tyreAvailable,availableTyreChoice} from './tyres.mjs';
import {guideBounds,sampleGuide} from './racing-line.mjs';
import {clamp,sample,wrap} from './tracks.mjs';
import {pitAhead,pitLayout} from './pits.mjs';
import {clearImpact} from './motion.mjs';
const CRITICAL_TYRE_LIFE=5;
export function prepareAiTyres(session,track){
 if(session.phase!=='race'||session.elapsed>=0||!session.cars.some(car=>car.ai))return;
 const plans=Object.keys(TYRES).map(compound=>raceStrategy(track,session.laps,session.weather||session.conditions,compound)).sort((a,b)=>a.seconds-b.seconds),choice=plans[0]?.stints[0]?.compound;
 for(const car of session.cars)if(car.ai&&choice)chooseStartingTyres(session,car,choice);
}
const PASS_CLEARANCE=3.4,PASS_LANE_SPACING=4;
const trafficOffset=(track,car)=>{
 if(Number.isFinite(car.lateral))return car.lateral;
 const center=sample(track,car.s);
 return (car.x-center.x)*Math.cos(center.heading)-(car.z-center.z)*Math.sin(center.heading);
};

function planTraffic(session,track,dt){
 const active=session.cars.filter(car=>!car.finished&&!car.retired&&car.pitState==='none');
 const offsets=active.map(car=>trafficOffset(track,car));
 for(const [index,car] of active.entries()){
  if(!car.ai)continue;
  const speed=Math.max(0,car.v),offset=offsets[index];
  const lookAhead=Math.max(track.width<15?6:12,speed*(track.width<15?.32:.5));
  const station=car.s+lookAhead,look=sampleGuide(track,station),guide=look.offset;
  const tight=look.curvature>.010||sampleGuide(track,station+25).curvature>.013;
  let {low,high}=guideBounds(track,station);
  const exit=guideBounds(track,station+Math.min(22,lookAhead));
  low=Math.max(low,exit.low);
  high=Math.min(high,exit.high);
  const traffic=[];
  for(const [otherIndex,other] of active.entries()){
   if(other===car)continue;
   const gap=wrap(other.s-car.s+track.length/2,track.length)-track.length/2;
   if(gap < -14 || gap > Math.max(28,speed*1.15))continue;
   if(Math.hypot(other.x-car.x,other.z-car.z)>Math.abs(gap)+12)continue;
   traffic.push({car:other,gap,offset:offsets[otherIndex]});
  }

  const nextCar=traffic.filter(other=>other.gap>0).sort((a,b)=>a.gap-b.gap)[0];
  car.aiGapAhead=nextCar?nextCar.gap/Math.max(20,speed):null;
  const front=traffic.filter(other=>other.gap>=0&&Math.abs(other.offset-offset)<PASS_CLEARANCE)
   .sort((a,b)=>a.gap-b.gap)[0];
  const closing=front?speed-front.car.v:0;
  const target=traffic.find(other=>other.car.id===car.aiPassTarget&&other.gap>-10);
  const beside=traffic.some(other=>Math.abs(other.gap)<8&&Math.abs(other.offset-offset)<PASS_CLEARANCE+1);
  let aim=session.elapsed<1.35||beside?offset:guide;
  let pass=null;
  const opponent=target||(front&&(closing>1.4||front.gap<12)&&front.gap<15+Math.max(0,closing)*1.35?front:null);
  if(opponent&&(target||!tight)&&session.elapsed>=.65&&!car.offtrack&&!car.pitRequested){
   const preferred=target?car.aiPassSide:(offset<opponent.offset?-1:offset>opponent.offset?1:guide<opponent.offset?-1:1);
   for(const side of target?[preferred]:[preferred,-preferred]){
    const lane=opponent.offset+side*PASS_LANE_SPACING;
    if(lane<low||lane>high)continue;
    const occupied=traffic.some(other=>{
     if(other===opponent)return false;
     const projected=other.gap+(other.car.v-speed)*.7;
     return projected>-9&&projected<15&&Math.abs(other.offset-lane)<PASS_CLEARANCE;
    });
    if(occupied)continue;
    aim=lane;
    pass={id:opponent.car.id,side};
    break;
   }
  }
  car.aiPassTarget=pass?.id??null;
  car.aiPassSide=pass?.side??0;
  const desiredOffset=clamp(aim,low,high)-guide;
  const previous=car.aiLaneOffset??offset-guide;
  car.aiLaneOffset=previous+clamp(desiredOffset-previous,-dt*3.2,dt*3.2);

  // Follow at a speed that leaves time to move sideways. Once a car is
  // genuinely alongside, both can accelerate without steering into each other.
  car.aiTrafficSpeed=front
   ?Math.max(0,front.car.v+(front.gap-(6+speed*.19))/.9)
   :null;
 }
}

export function prepareAiRace(session,track,dt){
 if((session.phase==='race'||session.phase==='practice')&&session.cars.some(car=>car.ai&&!car.finished))planTraffic(session,track,dt);
 for(const car of session.cars){
  if(!car.ai||car.finished||car.retired)continue;
  if(car.pitState!=='none'){car.aiStuckTime=0;car.aiLastProgress=car.progress;continue;}
  const moved=Math.abs(car.progress-(car.aiLastProgress??car.progress));car.aiLastProgress=car.progress;
  car.aiStuckTime=session.elapsed>4&&Math.abs(car.v)<1.5&&moved<.035?(car.aiStuckTime||0)+dt:0;
  if(car.aiStuckTime>4){
   // Recover at the same station, with the usual invalid lap and time penalty.
   // Never reset a serviced car or place an AI into another active driver.
   const pose=sampleGuide(track,car.s),clear=session.cars.every(other=>other===car||other.finished||other.retired||Math.hypot(other.x-pose.x,other.z-pose.z)>9);
   if(clear){clearImpact(car);Object.assign(car,pose,{s:car.s,progress:car.progress,v:0,motionHeading:pose.heading,motionYawRate:0,resetTimer:.8,invalidLap:true,penalty:(car.penalty||0)+3,aiStuckTime:0,sliding:false});}
  }
  if(session.phase!=='race'||session.elapsed<0)continue;
  const remaining=session.laps*track.length-car.progress;
  // A stop cannot help on the final lap or if the finish lies in the pit
  // corridor. Clear a queued call too if the AI missed its previous entry.
  if(remaining<=track.length||pitAhead(car,track)+pitLayout(track).length>=remaining){
   car.pitRequested=false;
   continue;
  }
  if(Number.isFinite(car.tyreLife)&&car.tyreLife<=CRITICAL_TYRE_LIFE){
   car.pitCompound=availableTyreChoice(car);
   car.pitRequested=true;
   continue;
  }
  if(session.elapsed<(car.aiAdviceAt??0))continue;
  car.aiAdviceAt=session.elapsed+2+(car.index%4)*.2;
  const advice=liveTyreAdvice(track,session,car);
  if(tyreAvailable(car,advice.compound)){car.pitCompound=advice.compound;car.pitRequested=advice.box;}
 }
}
