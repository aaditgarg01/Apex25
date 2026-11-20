// Focused race strategy diagnostic; separate from game test suite.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeTracks,wrap,sample} from '../shared/tracks.mjs';
import {createCar} from '../shared/physics.mjs';
import {prepareAiRace} from '../shared/ai-race.mjs';
import {pitLayout} from '../shared/pits.mjs';
const track=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url)))).find(t=>t.id==='it-1922');
const plan=pitLayout(track),station=wrap(plan.entry-100,track.length);
function run({flag=true,retired=false,committed=false,queued=false}={}){
 const ai=Object.assign(createCar(track,'ai','AI',1,true),sample(track,station),{s:station,progress:track.length+station,lap:2,v:30,tyreLife:0,tyreRaceLaps:4,pitRequested:queued}),leader=createCar(track,'leader','Leader',0);
 Object.assign(leader,{finished:flag,retired,finishLaps:4,lap:5,progress:track.length*4});
 if(committed){ai.pitState='service';ai.pitTimer=2.4;}
 prepareAiRace({phase:'race',elapsed:500,laps:4,cars:[leader,ai],conditions:'normal'},track,1/60);return ai;
}
assert.equal(run().pitRequested,false,'Lapped AI requests a stop after chequered flag');assert.equal(run({queued:true}).pitRequested,false,'Lapped AI retains queued stop after flag');assert.equal(run({flag:false}).pitRequested,true,'Critical tyre stop suppressed before flag');assert.equal(run({retired:true}).pitRequested,true,'Retirement incorrectly triggers chequered flag');const service=run({committed:true});assert.equal(service.pitState,'service');assert.equal(service.pitTimer,2.4);
console.log(JSON.stringify({lappedFinalLapAvoidsPit:true,queuedCallCancelled:true,criticalTyreStopsBeforeFlag:true,retirementDoesNotTriggerFlag:true,committedServicePreserved:true}));
