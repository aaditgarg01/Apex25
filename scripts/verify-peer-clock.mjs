// Focused nearby-car clock check; separate from game test suite.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {projectMotion} from '../shared/motion.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('=')));
const {MultiplayerTracking}=await import(args.module?pathToFileURL(args.module):new URL('../shared/multiplayer-tracking.mjs',import.meta.url));
const points=Array.from({length:1000},(_,i)=>({x:0,z:i*4,y:0,heading:0,pitch:0,grade:0})),track={id:'peer-clock',points,length:4000,step:4,width:30};
const rows=[];
for(const horizon of [.08,.3,.4,.5]){
 const source={id:'own',x:0,y:0,z:400,s:400,heading:0,motionHeading:0,v:50,physicsTime:10,pitState:'none'},local={...source,z:400+50*horizon,s:400+50*horizon,physicsTime:10+horizon},other={...source,id:'other',z:425,s:425};
 const tracking=new MultiplayerTracking(track,'own',{liveInput:true});tracking.session={phase:'race',elapsed:10};tracking.reference=local;tracking.local=local;tracking.snapshotAt=1000;tracking.rtt=80;
 const shown=tracking.contactPose(other,1000,local,true),gap=shown.z-local.z;
 const state={phase:'race',conditions:'normal',elapsed:10,cars:[source,other]};tracking.record(state,1000);tracking.session=state;tracking.localAt=1000;tracking.lastAt=1000;tracking.snapshotAt=1000;
 const actual=tracking.frame(1000,0,{}),frameGap=actual.find(c=>c.id==='other').z-actual.find(c=>c.id==='own').z;rows.push({predictionMilliseconds:horizon*1000,gatewayRttMs:80,expectedGap:25,shownGap:gap,frameGap,error:Math.max(Math.abs(gap-25),Math.abs(frameGap-25))});
 const distant=tracking.contactPose(other,1000,local,false);assert(Math.abs(distant.z-425)<.001,'Distant contact acquired local prediction lead');
}
const cornerTrack={...track,id:'peer-corner',width:200},turning=new MultiplayerTracking(cornerTrack,'own'),base={id:'other',x:0,y:0,z:425,s:425,progress:425,heading:.2,motionHeading:.2,motionYawRate:0,v:50,steer:.3,pitState:'none',inputEpoch:0,physicsTime:10};
turning.record({phase:'race',elapsed:9.95,cars:[{...base,heading:.1,motionHeading:.1}]},950);turning.record({phase:'race',elapsed:10,cars:[base]},1000);turning.session={phase:'race',elapsed:10};const projected={...base},expected={...base,motionYawRate:2};turning.project(projected,.3);projectMotion(expected,.3);const cornerProjectionError=Math.hypot(projected.x-expected.x,projected.z-expected.z);
const report={description:'Equal-speed cars separated by 25 m; local predicted physics clock leads the snapshot by 80–500 ms while gateway ping stays at 80 ms. Also checks compact-snapshot corner extrapolation against the observed turn rate. Deterministic presentation diagnostics.',runs:rows,cornerProjectionError};console.log(JSON.stringify(report,null,2));if(args.out)await writeFile(args.out,JSON.stringify(report,null,2)+'\n');if(!args.module){for(const row of rows)assert(row.error<.001,'Nearby opponent uses a different simulation clock');assert(cornerProjectionError<.001,'Projection retains stale full-state corner rate');}
