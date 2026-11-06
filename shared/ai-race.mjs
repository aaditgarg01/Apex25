import {raceStrategy,liveTyreAdvice} from './strategy.mjs';
import {TYRES,chooseStartingTyres,tyreAvailable} from './tyres.mjs';
import {sampleGuide} from './racing-line.mjs';
import {clearImpact} from './motion.mjs';
export function prepareAiTyres(session,track){
 if(session.phase!=='race'||session.elapsed>=0||!session.cars.some(car=>car.ai))return;
 const plans=Object.keys(TYRES).map(compound=>raceStrategy(track,session.laps,session.weather||session.conditions,compound)).sort((a,b)=>a.seconds-b.seconds),choice=plans[0]?.stints[0]?.compound;
 for(const car of session.cars)if(car.ai&&choice)chooseStartingTyres(session,car,choice);
}
export function prepareAiRace(session,track,dt){
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
  if(session.phase!=='race'||session.elapsed<0||session.elapsed<(car.aiAdviceAt??0))continue;
  car.aiAdviceAt=session.elapsed+2+(car.index%4)*.2;
  const advice=liveTyreAdvice(track,session,car);
  if(tyreAvailable(car,advice.compound)){car.pitCompound=advice.compound;car.pitRequested=advice.box;}
 }
}
