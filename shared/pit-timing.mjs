import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {targetSpeed} from './tracks.mjs';
export const PIT_TRANSIT_LOSS=18;
const cache=new WeakMap();
// Calibrate the arcade pit assist against a dry, fresh-tyre racing reference.
// Tyre work, penalties and queues are excluded. Actual driver pace can differ.
export function pitTransitPlan(track){
 if(cache.has(track))return cache.get(track);const plan=pitLayout(track),rates=[];let racingSeconds=0;
 for(let d=0;d<=plan.length;d+=3){const end=Math.min(plan.length,d+3),a=pitRoadPose(track,d),b=pitRoadPose(track,end);rates.push(Math.max(.4,Math.hypot(b.x-a.x,b.z-a.z)/Math.max(.001,end-d)));if(end>d)racingSeconds+=(end-d)/Math.max(15,targetSpeed(track,plan.entry+(d+end)/2));}
 const target=racingSeconds+PIT_TRANSIT_LOSS;
 function transitSeconds(limit){let d=0,v=limit,time=0,stopping=true;for(let ticks=0;ticks<20000&&d<plan.length;ticks++){const remaining=(stopping?plan.box:plan.length)-d,dt=1/60;v=Math.min(limit,v+dt*8,stopping?Math.sqrt(Math.max(0,36*remaining)):limit);const rate=rates[Math.min(rates.length-1,Math.floor(d/3))],move=Math.min(v*dt/rate,remaining);d+=move;time+=dt;if(remaining-move<.03){if(stopping){d=plan.box;v=0;stopping=false;}else d=plan.length;}}return time;}
 let low=4,high=55;for(let i=0;i<16;i++){const middle=(low+high)/2;if(transitSeconds(middle)>target)low=middle;else high=middle;}
 const speed=(low+high)/2,result={speed,racingSeconds,transitSeconds:transitSeconds(speed),loss:transitSeconds(speed)-racingSeconds,targetLoss:PIT_TRANSIT_LOSS};cache.set(track,result);return result;
}
