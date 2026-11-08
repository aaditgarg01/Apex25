import {TYRES,tyreProfile,tyreGrip,tyreSpeedFactor,expectedTyreWearPerLap,surfaceWetness,defaultTyre,tyreAvailable,estimatedTyreLaps} from './tyres.mjs';
import {tyreCircuitProfile} from './tyre-circuits.mjs';
import {PIT_TRANSIT_LOSS} from './pit-timing.mjs';
import {PIT_EXPECTED_SERVICE_SECONDS} from './pits.mjs';
const ids=Object.keys(TYRES),dry=['soft','medium','hard'],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function estimatedPitLoss(){return PIT_TRANSIT_LOSS+PIT_EXPECTED_SERVICE_SECONDS;}
function stintCost(track,distance,raceLaps,id,wetness,life=100,practice=false){
 const car={tyreTrackId:track.id,tyreCompound:id,trackWetness:wetness,tyreLife:life,v:55},profile=tyreCircuitProfile(track);
 const wearPerLap=expectedTyreWearPerLap(raceLaps,id,track,car,practice),lapTime=track.length/(36+profile.power*22);
 let cost=0;
 for(let k=0;k<8;k++){
  car.tyreLife=Math.max(0,life-wearPerLap*distance*(k+.5)/8);
  // Layout-specific corner/straight shares, compound grip, drag and degradation.
  const pace=(1-profile.power)*Math.sqrt(tyreGrip(car))+profile.power*tyreSpeedFactor(car);
  cost+=lapTime*distance/8/Math.max(.34,pace);
 }
 return cost;
}
const planCache=new Map(),adviceCache=new Map(),encode=counts=>counts[0]+3*counts[1]+9*counts[2];
function planStints(track,distance,raceLaps,wetness,{first='best',counts=[0,0,0],continueLife=null,limit=true,maxNodes=60}={}){
 const n=Math.max(1,Math.min(maxNodes,Math.ceil(distance))),nodes=[0,...Array.from({length:n},(_,i)=>distance-Math.round(distance*(n-1-i)/n))],pitLoss=estimatedPitLoss(track),costs=Array.from({length:n+1},()=>Array(27).fill(Infinity)),routes=Array.from({length:n+1},()=>Array(27)),stintCache=new Map();costs[0][encode(counts)]=0;
 for(let begin=0;begin<n;begin++)for(let stock=0;stock<27;stock++){
  if(!Number.isFinite(costs[begin][stock]))continue;
  const used=[stock%3,Math.floor(stock/3)%3,Math.floor(stock/9)%3];
  for(const compound of ids){
   if(begin===0&&first!=='best'&&compound!==first)continue;
   const continuing=begin===0&&continueLife!==null,index=dry.indexOf(compound);
   if(limit&&!continuing&&index>=0&&used[index]>=2)continue;
   const next=used.slice();if(limit&&!continuing&&index>=0)next[index]++;const nextStock=encode(next);
   for(let end=begin+1;end<=n;end++){
    const stintDistance=nodes[end]-nodes[begin];if(stintDistance<=0)continue;
    const life=continuing?continueLife:100,stintKey=[compound,stintDistance,life].join(':');
    if(!stintCache.has(stintKey))stintCache.set(stintKey,stintCost(track,stintDistance,raceLaps,compound,wetness,life));
    const candidate=costs[begin][stock]+stintCache.get(stintKey)+(begin?pitLoss:0);
    if(candidate<costs[end][nextStock]){costs[end][nextStock]=candidate;routes[end][nextStock]={begin,stock,compound};}
   }
  }
 }
 let finalStock=costs[n].indexOf(Math.min(...costs[n]));const seconds=costs[n][finalStock],stints=[];
 for(let end=n;end>0;){const choice=routes[end][finalStock];if(!choice)return {stints:[],seconds:Infinity,pitLoss,wetness};stints.unshift({compound:choice.compound,from:nodes[choice.begin],to:nodes[end],life:estimatedTyreLaps(raceLaps,choice.compound,track,{trackWetness:wetness})});end=choice.begin;finalStock=choice.stock;}
 return {stints,seconds,pitLoss,wetness};
}
// Estimate from the observable surface, without reading future weather fronts.
// 27 stock states enforce two fitted sets per slick; stops lie on whole laps.
export function raceStrategy(track,laps,weather='normal',starting='auto'){
 laps=Math.max(3,Math.floor(Number(laps)||3));const wetness=typeof weather==='object'?surfaceWetness({trackWetness:weather.wetness}):surfaceWetness({conditions:weather}),first=starting==='auto'?defaultTyre(wetness):starting,key=[track.id,laps,wetness,first].join(':');if(planCache.has(key))return planCache.get(key);
 const plan=planStints(track,laps,laps,wetness,{first});if(planCache.size>100)planCache.clear();planCache.set(key,plan);return plan;
}
export function strategyLabel(plan){return plan.stints.map((stint,i)=>(i?'lap '+stint.from+' → ':'')+tyreProfile(stint.compound).name+' ('+stint.life+' laps est.)').join(' · ');}
export function liveTyreAdvice(track,session,car){
 const remaining=session.phase==='race'?clamp(session.laps-car.progress/track.length,0,session.laps):2;
 const wetness=surfaceWetness(car),raceLaps=Number.isFinite(car.tyreRaceLaps)?car.tyreRaceLaps:Infinity;
 const ranked=ids.filter(compound=>tyreAvailable(car,compound)).map(compound=>({compound,cost:stintCost(track,Math.max(.1,remaining),raceLaps,compound,wetness,100,car.practice)})).sort((a,b)=>a.cost-b.cost),best=ranked[0];
 const stay=stintCost(track,Math.max(.1,remaining),raceLaps,car.tyreCompound,wetness,car.tyreLife,car.practice);
 let gain=stay-best.cost-estimatedPitLoss(track),box=remaining>.35&&gain>2;
 if(session.phase==='race'&&remaining>.05){
  const counts=dry.map(id=>Math.min(2,car.tyreSetsUsed?.[id]||0)),key=[track.id,session.laps,Math.round(remaining*10),Math.round(wetness*20),car.tyreCompound,Math.ceil(car.tyreLife),...counts].join(':');
  let decision=adviceCache.get(key);
  if(!decision){
   const keep=planStints(track,remaining,raceLaps,wetness,{first:car.tyreCompound,counts,continueLife:car.tyreLife,maxNodes:30}),change=planStints(track,remaining,raceLaps,wetness,{counts,maxNodes:30});
   const improvement=keep.seconds-change.seconds-change.pitLoss;
   decision={gain:improvement,box:remaining>.35&&improvement>2,compound:change.stints[0]?.compound||best.compound};
   if(adviceCache.size>150)adviceCache.clear();adviceCache.set(key,decision);
  }
  gain=decision.gain;box=decision.box;best.compound=decision.compound;
 }
 const mismatch=tyreGrip({...car,tyreLife:100})<.75,life=estimatedTyreLaps(raceLaps,best.compound,track,car,car.practice);
 return {compound:best.compound,box,gain,remaining,text:(box?'BOX · ':'BEST SET · ')+tyreProfile(best.compound).name.toUpperCase()+' ('+life+' LAPS)',reason:box?'A change is estimated to recover more time than the pit stop costs.':mismatch?'Your current compound has poor grip for this surface. A stop may still cost more than it saves over the remaining distance.':'Staying out is currently estimated to be faster than stopping.',wetness};
}
