// CPU benchmark of synthetic eight-car snapshot presentation, not game suite.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {MultiplayerTracking} from '../shared/multiplayer-tracking.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('='))),{MultiplayerTracking:Before}=await import(pathToFileURL(args.before));
const points=[];for(let edge=0;edge<4;edge++)for(let d=0;d<4000;d+=4){const p=edge===0?{x:0,z:d,heading:0}:edge===1?{x:d,z:4000,heading:Math.PI/2}:edge===2?{x:4000-d,z:4000,heading:Math.PI}: {x:0,z:4000-d,heading:-Math.PI/2};points.push({...p,y:0,pitch:0,grade:0});}
const track={id:'presentation-benchmark',points,length:16000,step:4,width:30};
const snapshot=(elapsed,serial)=>({phase:'race',conditions:'normal',elapsed,cars:Array.from({length:8},(_,i)=>({id:'p'+i,ai:i>1,x:0,y:0,z:400+i*220+20*elapsed,s:400+i*220+20*elapsed,heading:0,motionHeading:0,v:20,pitch:0,pitState:'none',inputEpoch:0,inputTime:i===1?Math.floor(elapsed*5)/5:elapsed,resetTimer:0,finished:false,impactVX:0,impactVZ:0,impactYaw:0,serial}))});
const baseline=new Before(track,'p0'),current=new MultiplayerTracking(track,'p0');let maxDifference=0;
for(let i=0;i<360;i++){
 const state=snapshot(1+i/20,i),now=i*50;baseline.record(state,now);current.record(state,now);
 // Full and motion snapshots can replace the same station in one burst.
 if(i%19===0){const replacement=snapshot(state.elapsed,i+.5);baseline.record(replacement,now);current.record(replacement,now);}
 for(const tracker of [baseline,current]){tracker.session=state;tracker.snapshotAt=now;}
 const a=baseline.frame(now,1/120,{}),b=current.frame(now,1/120,{});
 for(let c=0;c<a.length;c++)for(const key of ['x','y','z','heading','v'])maxDifference=Math.max(maxDifference,Math.abs((a[c][key]||0)-(b[c][key]||0)));
}
assert(maxDifference<1e-9,'Cached histories changed interpolated poses');
function run(Type){const tracker=new Type(track,'p0');let serial=0,checksum=0;const start=performance.now();for(let frame=0;frame<3600;frame++){const now=frame*1000/120;if(frame%6===0){const state=snapshot(1+now/1000,serial++);tracker.record(state,now);tracker.session=state;tracker.snapshotAt=now;}const shown=tracker.frame(now,1/120,{});checksum+=shown[7].z;}return {milliseconds:performance.now()-start,checksum};}
run(Before);run(MultiplayerTracking);const old=[],fresh=[];
for(let i=0;i<5;i++){const first=i%2?MultiplayerTracking:Before,second=i%2?Before:MultiplayerTracking;for(const Type of [first,second]){const r=run(Type);(Type===Before?old:fresh).push(r.milliseconds);}}
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)],report={description:'Five alternating warmed CPU runs, each 3,600 presentation frames at a synthetic 120 Hz with 20 Hz snapshots, eight cars and a 90-snapshot window. Not GPU FPS or internet latency.',poseDifference:maxDifference,beforeMilliseconds:old,afterMilliseconds:fresh,beforeMedian:median(old),afterMedian:median(fresh),medianReductionPercent:100*(1-median(fresh)/median(old))};console.log(JSON.stringify(report,null,2));if(args.out)await writeFile(args.out,JSON.stringify(report,null,2)+'\n');
