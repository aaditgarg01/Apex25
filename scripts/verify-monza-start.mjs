// Actual Monza reproduction/verification, separate from the game's test suite.
import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {makeTracks,sample} from '../shared/tracks.mjs';import {createCar,stepCar,gridSlot,resetCar} from '../shared/physics.mjs';import {createSession,addQualifyingDriver} from '../shared/session.mjs';import {spawnPose} from '../shared/spawn-pose.mjs';
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url)))),track=tracks.find(t=>t.id==='it-1922'),hash=()=>createHash('sha256').update(JSON.stringify(track.points)).digest('hex'),before=hash(),rows=[];
function drive(car,baseline,boost){
 if(baseline){const slot=gridSlot(car.index),p=sample(track,slot.s,slot.offset);car.heading=car.motionHeading=p.heading;}
 const heading=car.heading;let time=0,maximumLateral=0,firstOfftrack=null,minimumSpeedAfterFour=Infinity;
 while(car.progress<480&&time<25){time+=1/60;stepCar(car,{throttle:true,steer:0,boost},track,1/60,time,Infinity);maximumLateral=Math.max(maximumLateral,Math.abs(car.lateral));if(car.offtrack&&firstOfftrack===null)firstOfftrack=time;if(time>=4)minimumSpeedAfterFour=Math.min(minimumSpeedAfterFour,car.v);assert.equal(car.steer,0);assert(Math.abs(car.heading-heading)<1e-9,'Unexpected heading change');}
 return {index:car.index,conditions:car.conditions,boost,baseline,seconds:time,maximumLateralMetres:maximumLateral,firstOfftrackSeconds:firstOfftrack,finalSpeedMetresPerSecond:car.v,minimumSpeedAfterFourSeconds:minimumSpeedAfterFour,completedStraight:car.progress>=480};
}
for(const baseline of [true,false])for(const conditions of baseline?['normal']:['normal','intermediate','wet'])for(const boost of [false,true])for(let index=0;index<8;index++){
 const car=createCar(track,'p'+index,'Keyboard',index,false,null,conditions),row=drive(car,baseline,boost);rows.push(row);
 if(!baseline){assert(row.completedStraight);assert.equal(row.firstOfftrackSeconds,null);assert(row.maximumLateralMetres+1.24<track.width/2,'Car body leaves racing ribbon');}
}
const baselineFailures=rows.filter(r=>r.baseline&&r.firstOfftrackSeconds!==null).length;assert(baselineFailures>0,'Original issue not reproduced');
const starts=[];for(const mode of ['race','weekend','practice']){const session=createSession(track,[{id:'p',name:'Driver'}],{mode}),car=session.cars[0];assert.equal(car.heading,spawnPose(track,car.progress).heading);starts.push({mode,heading:car.heading});}
const qualifying=createSession(track,[{id:'host',name:'Host'}],{mode:'weekend'}),joined=addQualifyingDriver(qualifying,track,{id:'guest',name:'Guest'});assert.equal(joined.car.heading,spawnPose(track,0).heading);
for(const station of [0,100,300,420]){const car=createCar(track,'r','Recovery',0);car.s=station;assert(resetCar(car,track));assert.equal(car.heading,spawnPose(track,station).heading);}
let unchanged=0;for(const other of tracks.filter(t=>t.id!=='it-1922'))for(let index=0;index<8;index++){const {s,offset}=gridSlot(index);assert.deepEqual(spawnPose(other,s,offset),sample(other,s,offset));unchanged++;}
assert.equal(hash(),before,'Centreline modified');
const report={description:'Zero-steer, no-opponent actual Monza simulation from all eight grid slots to station 480m before Turn 1; original tangent orientation compared with fixed straight-axis orientation. Not a whole-lap autopilot test.',baselineFailures,fixedPasses:rows.filter(r=>!r.baseline).length,otherCircuitGridPosesUnchanged:unchanged,centrelineUnchanged:true,centrelineHash:before,starts,recoveryStarts:4,runs:rows};console.log(JSON.stringify({baselineFailures,fixedPasses:report.fixedPasses,otherCircuitGridPosesUnchanged:unchanged,maximumFixedLateral:Math.max(...rows.filter(r=>!r.baseline).map(r=>r.maximumLateralMetres))}));if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
