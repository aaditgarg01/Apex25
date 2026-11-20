// Arrival-order and ordered timeline equivalence; outside the game test suite.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {MultiplayerTracking} from '../shared/multiplayer-tracking.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('='))),Before=(await import(pathToFileURL(args.before))).MultiplayerTracking;
const track={id:'lookup-diagnostic',length:4000,step:4,width:30,points:Array.from({length:1000},(_,i)=>({x:0,z:4*i,y:0,heading:0,pitch:0,grade:0}))};
const rows=[];
for(const mode of ['ordered','held-input','clock-reset','duplicate-frame','phase-reset','epoch-pit-finish','trimmed-reset','nonfinite-clock']){
 const a=new Before(track,'own'),b=new MultiplayerTracking(track,'own');
 for(let i=0;i<120;i++){
  let inputTime=1+i*.05;if(mode==='held-input')inputTime=1+Math.floor(i/4)*.2;if(mode==='clock-reset'&&i>80)inputTime-=1;if(mode==='trimmed-reset'&&i<10)inputTime=2-i*.05;if(mode==='nonfinite-clock'&&i===90)inputTime=NaN;
  const phase=mode==='phase-reset'&&i>=100?'practice':'race',at=1+i*.05,state={phase,elapsed:at,conditions:'normal',cars:[{id:'own',ai:false,x:0,z:100,y:0,v:0,heading:0,pitState:'none',inputTime:at},{id:'rival',ai:false,x:0,z:500+i*2,y:0,v:40,heading:.01*i,motionHeading:.01*i,pitState:mode==='epoch-pit-finish'&&i>110?'lane':'none',pitTravel:0,inputTime,inputEpoch:mode==='epoch-pit-finish'&&i>105?1:0,finished:mode==='epoch-pit-finish'&&i>115,resetTimer:0}]};
  for(const t of [a,b]){t.record(state,at*1000);t.session=state;t.snapshotAt=at*1000;}
  if(mode==='duplicate-frame'&&i%7===0){const replacement=structuredClone(state);replacement.cars[1].z+=.2;for(const t of [a,b]){t.record(replacement,at*1000);t.session=replacement;}}
 }
 let compared=0;
 // Targets below/at/between/beyond samples, including exact boundaries.
 for(let target=-100;target<=7500;target+=25){for(const t of [a,b]){t.clockOffset=0;t.delay=0;t.remoteAt=target;}const old=a.frame(target,0,{}),fresh=b.frame(target,0,{});assert.deepEqual(fresh,old,mode+' at '+target);compared++;}
 // Phase change must also clear the ordering fallback, with no retained cars.
 b.record({phase:'race-results',elapsed:8,cars:[]},8000);assert.equal(b.unorderedTimelines.size,0);assert.equal(b.timelines.size,0);
 rows.push({mode,identicalPoses:true,comparedTargets:compared});
}
const report={description:'Full frame output equivalence versus previous tracker for ordered, held, reset, duplicate, phase, epoch/pit/finish and trimmed timelines. Targets include exact sample boundaries; no network or GPU measurement.',runs:rows};console.log(JSON.stringify(report,null,2));if(args.out)await writeFile(args.out,JSON.stringify(report,null,2)+'\n');
