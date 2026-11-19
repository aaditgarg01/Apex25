// Focused pit-path/service diagnostic; does not invoke or alter the game suite.
import {readFile,writeFile} from 'node:fs/promises';
import {makeTracks} from '../shared/tracks.mjs';
import {pitLayout,pitGaragePlans,pitDrivingOffset} from '../shared/pit-layout.mjs';
import {pitPose,stepPit} from '../shared/pits.mjs';
import {pitTransitPlan} from '../shared/pit-timing.mjs';
import {createCar} from '../shared/physics.mjs';
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url))));
const rows=[];
for(const track of tracks){
 const plan=pitLayout(track),timing=pitTransitPlan(track);if(plan.boxes.length!==8||new Set(plan.boxes).size!==8)throw Error(track.id+': nonunique boxes');
 let maxFrameMove=0,maxTransit=0,minTransit=Infinity;
 for(let index=0;index<8;index++){
  const car=createCar(track,'pit'+index,'Driver '+index,index);Object.assign(car,{pitState:'lane',pitTravel:0,pitEntryProgress:0,pitEntryOffset:plan.entryOffset,v:timing.speed,penalty:index===0?4:0,tyreRaceLaps:3,pitServiceSeed:1234+index});Object.assign(car,pitPose(car,track));
  let seconds=0,wait=0,frames=0;
  for(;frames<18000&&car.pitState!=='none';frames++){
   const before={x:car.x,z:car.z},servicing=car.pitState==='service';car.physicsTime=seconds+1/60;stepPit(car,track,1/60);seconds+=1/60;if(servicing)wait+=1/60;
   maxFrameMove=Math.max(maxFrameMove,Math.hypot(car.x-before.x,car.z-before.z));
   if(![car.x,car.y,car.z,car.v,car.pitTimer].every(Number.isFinite))throw Error(track.id+': non-finite pit pose');
   if(Math.abs(pitDrivingOffset(plan,car,car.pitTravel))>plan.width/2-1)throw Error(track.id+': car outside corridor');
  }
  if(frames>=18000||car.pitStops!==1||car.penalty!==0||!(car.lastPitTyreService>=1.8&&car.lastPitTyreService<=5)||Math.abs(car.lastPitService-car.lastPitTyreService-(index===0?4:0))>.00001)throw Error(track.id+': failed service/penalty/exit');
  maxTransit=Math.max(maxTransit,seconds-wait);minTransit=Math.min(minTransit,seconds-wait);
 }
 rows.push({track:track.id,uniqueBays:8,optionalGarageSites:pitGaragePlans(track).length,maxFrameMove,minimumTransitSeconds:minTransit,maximumTransitSeconds:maxTransit,referenceRacingSeconds:timing.racingSeconds,displayedLimitKmh:timing.speed*3.6,penaltyAndTyreService:'passed'});
}
const report={description:'All 42 existing circuits; eight real assisted pit stops per circuit, shared path, numbered bays, tyre service, four-second penalty on first driver and automatic exit. Does not claim two-device play or every mapped access-road clearance.',circuits:rows};console.log(JSON.stringify({circuits:rows.length,stops:rows.length*8,maxFrameMove:Math.max(...rows.map(r=>r.maxFrameMove)),minPitLimit:Math.min(...rows.map(r=>r.displayedLimitKmh))}));if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
