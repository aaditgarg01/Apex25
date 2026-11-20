// Focused transport-outage diagnostic, independent of the game test suite.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {makeTracks,angleDiff} from '../shared/tracks.mjs';
import {createCar,stepCar} from '../shared/physics.mjs';
import {MultiplayerTracking} from '../shared/multiplayer-tracking.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('=')));
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url))));
const track=tracks.find(t=>t.id==='it-1922'),server=createCar(track,'p','Keyboard',0),tracking=new MultiplayerTracking(track,'p',{liveInput:true});
server.practice=true;server.v=20;tracking.rtt=0;
const state=elapsed=>({phase:'practice',conditions:'normal',elapsed,cars:[structuredClone(server)]});
tracking.receive(state(0),0,true);
let recoveryError=0,recoveryHeading=0,maximumReplay=0,frozenAt=null,frozenMovement=0,frames=0;
for(let frame=1;frame<=480;frame++){
 const now=frame*1000/60,elapsed=frame/60,control={steer:0,throttle:elapsed<2||elapsed>3,brake:elapsed>=2&&elapsed<=3,boost:elapsed>4};
 tracking.remember(control,now);stepCar(server,control,track,1/60,elapsed,Infinity);
 // Inputs still arrive, but snapshots are interrupted for two seconds.
 if(frame%3===0){tracking.sent(frame,now);server.inputAck=frame;server.inputAppliedSequence=frame;server.inputAppliedAt=elapsed;server.inputTime=elapsed;if(elapsed<2||elapsed>=4)tracking.receive(state(elapsed),now,false,now);}
 tracking.frame(now,1/60,control);maximumReplay=Math.max(maximumReplay,tracking.reconciliation?.replayMilliseconds||0);
 if(elapsed>=3&&elapsed<4){frozenAt??={x:tracking.local.x,z:tracking.local.z};frozenMovement=Math.max(frozenMovement,Math.hypot(tracking.local.x-frozenAt.x,tracking.local.z-frozenAt.z));}
 if(elapsed>=5){frames++;recoveryError=Math.max(recoveryError,Math.hypot(tracking.local.x-server.x,tracking.local.z-server.z));recoveryHeading=Math.max(recoveryHeading,Math.abs(angleDiff(tracking.local.heading,server.heading)));}
}
const report={description:'Monza shared physics, zero steering, acceleration/braking/boost; snapshots stop for two seconds then resume. Single-machine deterministic diagnostic.',frozenMovement,maximumReplay,recoveredFrames:frames,maximumRecoveredPhysicsError:recoveryError,maximumRecoveredHeadingErrorDegrees:recoveryHeading*180/Math.PI};
assert(frozenMovement<.001,'Prediction continued beyond its outage cap');assert(maximumReplay<=500.001,'Unbounded catch-up after outage');assert(recoveryError<.15,'Physics did not return to the server course');assert(recoveryHeading<.001,'Outage changed neutral steering');
console.log(JSON.stringify(report,null,2));if(args.out)await writeFile(args.out,JSON.stringify(report,null,2)+'\n');
