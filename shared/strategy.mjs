import {TYRES,tyreProfile,tyreGrip,tyreSpeedFactor,tyreWearFactor,tyreStintLaps,surfaceWetness} from './tyres.mjs';
import {pitLayout} from './pit-layout.mjs';
const ids=Object.keys(TYRES),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function estimatedPitLoss(track){const lane=pitLayout(track);return Math.max(12,lane.length/22.22-lane.length/65+3+5);}
function stintCost(track,distance,raceLaps,id,wetness,life=100){
 const car={tyreCompound:id,trackWetness:wetness,tyreLife:life,v:55};
 const wearPerLap=100/tyreStintLaps(raceLaps,id)*1.12*tyreWearFactor(car),lapTime=track.length/48;
 let cost=0;
 for(let k=0;k<8;k++){
  car.tyreLife=Math.max(0,life-wearPerLap*distance*(k+.5)/8);
  // A lap contains both acceleration/braking/corners and drag-limited straights.
  const pace=.65*Math.sqrt(tyreGrip(car))+.35*tyreSpeedFactor(car);
  cost+=lapTime*distance/8/Math.max(.34,pace);
 }
 return cost;
}
// Estimate only from the currently observable surface. Never read future weather fronts.
export function raceStrategy(track,laps,weather='normal',starting='auto'){
 laps=Math.max(1,Number(laps)||3);const wetness=typeof weather==='object'?weather.wetness:surfaceWetness({conditions:weather});
 const n=Math.min(60,laps),step=laps/n,pitLoss=estimatedPitLoss(track),cost=Array(n+1).fill(Infinity),route=Array(n+1);cost[0]=0;
 for(let end=1;end<=n;end++)for(let begin=0;begin<end;begin++)for(const compound of ids){
  if(begin===0&&starting!=='auto'&&compound!==starting)continue;
  const candidate=cost[begin]+stintCost(track,(end-begin)*step,laps,compound,wetness)+(begin?pitLoss:0);
  if(candidate<cost[end]){cost[end]=candidate;route[end]={begin,compound};}
 }
 const stints=[];for(let end=n;end>0;){const choice=route[end];stints.unshift({compound:choice.compound,from:choice.begin*step,to:end*step});end=choice.begin;}
 return {stints,seconds:cost[n],pitLoss,wetness};
}
export function strategyLabel(plan){return plan.stints.map((stint,i)=>(i?'lap '+Math.round(stint.from)+' → ':'')+tyreProfile(stint.compound).name).join(' · ');}
export function liveTyreAdvice(track,session,car){
 const remaining=session.phase==='race'?clamp(session.laps-car.progress/track.length,0,session.laps):2;
 const wetness=surfaceWetness(car),raceLaps=Number.isFinite(car.tyreRaceLaps)?car.tyreRaceLaps:8;
 const ranked=ids.map(compound=>({compound,cost:stintCost(track,Math.max(.1,remaining),raceLaps,compound,wetness)})).sort((a,b)=>a.cost-b.cost),best=ranked[0];
 const stay=stintCost(track,Math.max(.1,remaining),raceLaps,car.tyreCompound,wetness,car.tyreLife);
 const gain=stay-best.cost-estimatedPitLoss(track),box=remaining>.35&&gain>2;
 const mismatch=tyreGrip({...car,tyreLife:100})<.75;
 return {compound:best.compound,box,gain,remaining,text:(box?'BOX · ':'BEST SET · ')+tyreProfile(best.compound).name.toUpperCase(),reason:box?'A change is estimated to recover more time than the pit stop costs.':mismatch?'Your current compound has poor grip for this surface. A stop may still cost more than it saves over the remaining distance.':'Staying out is currently estimated to be faster than stopping.',wetness};
}
