import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {makeTracks,sample,angleDiff} from '../shared/tracks.mjs';import {createCar,stepCar,resetCar} from '../shared/physics.mjs';import {steeringInput} from '../shared/controls.mjs';import {createSession,stepSession,endSession,advanceToRace,qualifyingOrder,normalizeLapCount} from '../shared/session.mjs';import {SPA_ALTITUDES,interpolateProfile} from '../shared/elevation.mjs';
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url))));
test('41 finite closed tracks include elevations and 17 additional venues',()=>{assert.equal(tracks.length,41);assert.equal(tracks.filter(t=>!t.round).length,17);for(const t of tracks){assert(t.length>3000&&t.length<7200);assert.deepEqual(sample(t,0),sample(t,t.length));assert(t.points.every(p=>Number.isFinite(p.y)&&Number.isFinite(p.pitch)));assert(t.elevation.range>0);}});
test('A and left arrow turn screen-left; D, right arrow and positive gamepad axis turn right',()=>{const t=tracks[15];for(const [key,direction]of [['KeyA',-1],['ArrowLeft',-1],['KeyD',1],['ArrowRight',1]]){const c=createCar(t,'test','Driver',0),h=c.heading;c.v=25;for(let i=0;i<12;i++)stepCar(c,{steer:steeringInput(new Set([key]))},t,1/60,i/60);const screenYaw=-(c.heading-h);assert(Math.sign(screenYaw)===direction,key);}assert(steeringInput(new Set(),.8)<0);assert(steeringInput(new Set(),-.8)>0);assert.equal(steeringInput(new Set(['KeyA','KeyD'])),0);});
test('Spa profile matches every official altitude marker and closes smoothly',()=>{const t=tracks.find(t=>t.id==='be-1925');for(const [distance,alt]of SPA_ALTITUDES)assert(Math.abs(sample(t,distance/7004*t.length).y-(alt-373))<.02,`marker ${distance}`);assert.equal(t.elevation.range,97);const peak=Math.max(...t.points.map(p=>p.grade));assert(peak>.16&&peak<.18,'Raidillon peak grade');const bottom=sample(t,890/7004*t.length),climb=sample(t,1060/7004*t.length),crest=sample(t,1490/7004*t.length);assert(crest.y-bottom.y>50);assert(climb.grade>.09);assert(sample(t,720/7004*t.length).grade<0);assert(Math.abs(sample(t,t.length-.1).y-sample(t,0).y)<.02);assert(Math.abs(sample(t,t.length-.1).pitch-sample(t,0).pitch)<.01);});
test('car, recovery and uphill acceleration follow road elevation',()=>{const t=tracks.find(t=>t.id==='be-1925'),p=sample(t,1040/7004*t.length),c=createCar(t,'a','Driver',0);Object.assign(c,p,{s:1040/7004*t.length,progress:1040/7004*t.length,v:30});stepCar(c,{throttle:true},t,1/60,1);assert(Math.abs(c.y-sample(t,c.s).y)<1e-8);assert(c.pitch>.08);resetCar(c,t);assert.equal(c.v,0);assert(c.invalidLap);assert.equal(c.y,sample(t,c.s).y);});
test('AI finishes every circuit with grade-aware physics',()=>{for(const t of tracks){const c=createCar(t,'ai','AI',0,true);for(let i=0;i<30000&&!c.finished;i++)stepCar(c,{},t,1/60,i/60,1);assert(c.finished,`${t.city}: stuck at ${c.progress}`);assert(c.finishTime>40&&c.finishTime<500);}});
test('qualifying times set the race grid; no-time drivers start behind valid laps',()=>{const t=tracks[15],s=createSession(t,[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}],{mode:'weekend',laps:3});assert.equal(s.phase,'qualifying');s.cars[0].bestLap=90;s.cars[1].bestLap=86;endSession(s);assert.equal(s.phase,'qualifying-results');assert(advanceToRace(s,t));assert.deepEqual(s.cars.map(c=>c.id),['b','a','c']);assert.equal(s.phase,'race');assert.equal(s.elapsed,-4);assert(s.cars[0].progress>s.cars[2].progress);assert(s.cars.every(c=>!c.finished&&c.bestLap===0));});
test('free practice remains open after multiple laps and ends only on request',()=>{const t=tracks[15],s=createSession(t,[{id:'ai',name:'AI',ai:true}],{mode:'practice'});for(let i=0;i<20000;i++)stepSession(s,{},t,1/60);assert(s.cars[0].lap>=3);assert(!s.cars[0].finished);assert.equal(s.phase,'practice');assert(s.cars[0].bestLap>0);endSession(s);assert.equal(s.phase,'practice-results');});
test('recovery invalidates a qualifying lap; parking cannot award laps',()=>{const t=tracks[15],c=createCar(t,'ai','AI',0,true);resetCar(c,t);for(let i=0;i<20000&&!c.finished;i++)stepCar(c,{},t,1/60,i/60,1);assert(c.finished);assert.equal(c.bestLap,0);assert(!c.lastLapValid);const p=createCar(t,'p','Parked',0);for(let i=0;i<600;i++)stepCar(p,{brake:true},t,1/60,i/60,1);assert.equal(p.lap,1);});
test('Eau Rouge practice start uses downhill approach and invalidates partial out lap',()=>{const t=tracks.find(t=>t.id==='be-1925'),s=createSession(t,[{id:'p',name:'Driver'}],{mode:'practice',practiceStart:'eau-rouge'});assert(Math.abs(s.cars[0].s-650/7004*t.length)<.1);assert(s.cars[0].pitch<0);assert(s.cars[0].invalidLap);});
test('human steering stays manual even when an old client sends assist',()=>{const t=tracks.find(t=>t.id==='in-2011'),p=sample(t,650),c=createCar(t,'p','Driver',0);Object.assign(c,p,{s:650,progress:650,v:30});const heading=c.heading;for(let i=0;i<45;i++)stepCar(c,{throttle:true,steer:0,assist:true},t,1/60,i/60);assert.equal(c.heading,heading);assert(Math.abs(t.length-5125)<60);assert.equal(t.turns,16);assert.equal(t.country,'India');});

test('arbitrary whole lap counts persist; invalid counts use a safe default',()=>{const t=tracks[15];for(const laps of [2,7,10,78,1000]){assert.equal(normalizeLapCount(laps),laps);assert.equal(createSession(t,[{id:'p',name:'Driver'}],{mode:'race',laps}).laps,laps);}for(const laps of [0,-1,1.5,Infinity,NaN,'7',null])assert.equal(normalizeLapCount(laps),3);const s=createSession(t,[{id:'ai',name:'AI',ai:true}],{mode:'race',laps:2});for(let i=0;i<30000&&s.phase==='race';i++)stepSession(s,{},t,1/60);assert.equal(s.phase,'race-results');assert.equal(s.cars[0].lap,3);});
test('Monaco grid and timing start on Boulevard Albert Ier toward Sainte Devote',()=>{const t=tracks.find(t=>t.id==='mc-1929'),p=sample(t,0),q=sample(t,100),lon=t.origin.lon+p.x/(111320*Math.cos(t.origin.lat*Math.PI/180)),lat=t.origin.lat-p.z/111320;assert(Math.hypot((lon-7.4212652)*80400,(lat-43.7350269)*111320)<12);assert(q.z<p.z,'northbound start straight');assert(Math.abs(p.y-sample(t,t.length-.01).y)<.01);assert.deepEqual(p,sample(t,t.length));const c=createCar(t,'p','Driver',0);assert(c.progress<0);assert(Math.hypot(c.x-p.x,c.z-p.z)<20);});

test('qualifying permits three fresh timed restarts and ends after one lap',()=>{const t=tracks[15],s=createSession(t,[{id:'ai',name:'AI',ai:true}],{mode:'weekend'}),c=s.cars[0];s.elapsed=10;for(let i=1;i<=3;i++){c.sector=2;c.sectors=[3,4];c.invalidLap=true;c.progress=t.length*.8;c.lapStart=0;assert(resetCar(c,t,true,s.elapsed));assert.equal(c.restarts,i);assert.equal(c.lapStart,s.elapsed);assert.equal(c.progress,0);assert.equal(c.lap,1);assert.equal(c.sector,0);assert.deepEqual(c.sectors,[]);assert(!c.invalidLap);s.elapsed+=2;}const before=JSON.stringify(c);assert.equal(resetCar(c,t,true,s.elapsed),false);assert.equal(JSON.stringify(c),before);for(let i=0;i<20000&&s.phase==='qualifying';i++)stepSession(s,{},t,1/60);assert.equal(s.phase,'qualifying-results');assert.equal(c.lapHistory.length,1);assert(c.bestLap>40);assert.equal(c.lastLap,c.bestLap);});
test('leaving the track invalidates a timed lap',()=>{const t=tracks[15],c=createCar(t,'p','P',0);Object.assign(c,sample(t,100,t.width/2+3),{s:100,progress:100,v:0});for(let i=0;i<45;i++)stepCar(c,{brake:true},t,1/60,i/60);assert(c.invalidLap);assert.equal(c.penalty,1);});
test('retirements remain behind finishers and runners after network serialization',async()=>{const {retireCar,standings}=await import('../shared/physics.mjs');const t=tracks[15],retired=createCar(t,'dnf','DNF',0),runner=createCar(t,'runner','Runner',1),winner=createCar(t,'winner','Winner',2);retireCar(retired);Object.assign(winner,{finished:true,finishTime:90});const cars=[retired,runner,winner];for(const input of [cars,JSON.parse(JSON.stringify(cars))])assert.deepEqual(standings(input).map(c=>c.id),['winner','runner','dnf']);});
test('Singapore runs counter-clockwise northward on pit straight into Turn 1',()=>{const t=tracks.find(t=>t.id==='sg-2008'),p=sample(t,0),q=sample(t,60);assert(q.z<p.z,'northbound start straight towards Turn 1');assert(p.heading<0&&p.heading>-Math.PI);});
test('Shanghai start provides a straight 200m approach before Turn 1',()=>{
 const t=tracks.find(t=>t.id==='cn-2004'),p=sample(t,0);
 const lon=t.origin.lon+p.x/(111320*Math.cos(t.origin.lat*Math.PI/180)),lat=t.origin.lat-p.z/111320;
 assert(Math.hypot((lon-121.2201)*95000,(lat-31.3372)*111320)<25);
 // Check the whole approach; testing only the first 50m missed starts too close to T1.
 for(let s=5;s<=200;s+=5){
  const q=sample(t,s);
  assert(Math.abs(angleDiff(q.heading,p.heading))<.08,`straight approach at ${s}m`);
  assert(q.x<p.x,'westbound toward Turn 1');
 }
 let cornerDistance=0;
 for(let s=5;s<=400;s+=5){
  if([0,5,10,15].every(offset=>Math.abs(angleDiff(sample(t,s+offset).heading,p.heading))>.15)){cornerDistance=s;break;}
 }
 assert(cornerDistance>200&&cornerDistance<350,`Turn 1 begins around ${cornerDistance}m`);
});
test('Silverstone starts on Hamilton Straight in front of The Wing facing Abbey',()=>{const t=tracks.find(t=>t.id==='gb-1948'),p=sample(t,0),lon=t.origin.lon+p.x/(111320*Math.cos(t.origin.lat*Math.PI/180)),lat=t.origin.lat-p.z/111320;assert(Math.hypot((lon-(-1.0219))*68000,(lat-52.0695)*111320)<20);assert(p.heading>2.4&&p.heading<2.6,'heading northeast toward Abbey');});
test('invalid lap records lapValidHistory without updating bestLap',()=>{const t=tracks[15],c=createCar(t,'p','Driver',0);c.lapStart=0;c.progress=t.length;c.invalidLap=true;stepCar(c,{},t,1/60,100,3);assert.equal(c.lap,2);assert.equal(c.lastLapValid,false);assert.equal(c.bestLap,0);assert.deepEqual(c.lapValidHistory,[false]);assert.equal(c.lapHistory.length,1);});

test('an invalid faster lap preserves the valid best, then a valid faster lap replaces it',()=>{
 const t=tracks[15],c=createCar(t,'p','Driver',0);
 function finishLap(elapsed,invalid){
  Object.assign(c,sample(t,0),{s:0,progress:c.lap*t.length,v:0,invalidLap:invalid});
  stepCar(c,{},t,1/60,elapsed,4);
 }
 finishLap(90,false);
 assert.equal(c.bestLap,90);
 finishLap(170,true);
 assert.equal(c.lastLap,80);assert.equal(c.bestLap,90);assert.equal(c.lastLapValid,false);
 finishLap(245,false);
 assert.equal(c.lastLap,75);assert.equal(c.bestLap,75);assert.equal(c.lastLapValid,true);
 assert.deepEqual(c.lapHistory,[90,80,75]);assert.deepEqual(c.lapValidHistory,[true,false,true]);
});

test('car can reverse from stationary with brake and transition forward with throttle',()=>{
 const t=tracks[15],c=createCar(t,'p','Driver',0);
 assert.equal(c.v,0);
 const initialZ=c.z;
 // Hold brake for 60 frames (1 second)
 for(let i=0;i<60;i++)stepCar(c,{brake:true},t,1/60,i/60);
 assert(c.v<=-5,'car accelerated into reverse');
 assert(c.v>=-12.5,'reverse speed is capped');
 // Continue reversing for 3 seconds: verify speed cap
 for(let i=60;i<240;i++)stepCar(c,{brake:true},t,1/60,i/60);
 assert(c.v>=-12.1,'reverse capped at ~12 m/s');
 assert.notEqual(c.z,initialZ,'car moved backwards');
 // Now apply throttle: should brake reverse and accelerate forward
 for(let i=0;i<30;i++)stepCar(c,{throttle:true},t,1/60,4+i/60);
 assert(c.v>-2,'forward throttle braked reverse motion');
 for(let i=30;i<90;i++)stepCar(c,{throttle:true},t,1/60,4.5+i/60);
 assert(c.v>5,'car transitioned forward and accelerated');
});

test('Abu Dhabi landmark at s=4630 provides complete road clearance without obstructing track',()=>{
 const t=tracks.find(t=>t.id==='ae-2009');
 const p=sample(t,4630,t.width/2+38);
 const rot=p.heading;
 let minDist=Infinity;
 for(let s=0;s<t.length;s+=2){
  const pt=sample(t,s),dx=pt.x-p.x,dz=pt.z-p.z;
  const lx=dx*Math.cos(rot)-dz*Math.sin(rot),lz=dx*Math.sin(rot)+dz*Math.cos(rot);
  const cx=Math.max(-14,Math.min(14,lx)),cz=Math.max(-40,Math.min(40,lz));
  const d=Math.hypot(lx-cx,lz-cz);
  if(d<minDist)minDist=d;
 }
 assert(minDist>t.width/2+10,`Yas hotel box clearance must be >10m past road edge (got ${minDist-t.width/2}m)`);
});


test('qualifying restores a full battery on all three restarts, recovery does not',()=>{
 const t=tracks[15],c=createCar(t,'p','Driver',0);
 for(let i=0;i<3;i++){c.boost=7+i;assert(resetCar(c,t,true,10+i));assert.equal(c.boost,100);}
 c.boost=12;assert.equal(resetCar(c,t,true,20),false);assert.equal(c.boost,12);
 const race=createCar(t,'r','Driver',0);race.boost=21;resetCar(race,t);assert.equal(race.boost,21);
});
test('Paul Ricard travels clockwise toward the first chicane and retains a closed elevation seam',()=>{
 const t=tracks.find(t=>t.id==='fr-1969'),p=sample(t,0),q=sample(t,100);
 assert(q.x<p.x&&q.z<p.z,'northwest along pit straight toward Turn 1');
 const area=t.points.reduce((s,p,i)=>{const q=t.points[(i+1)%t.points.length];return s+p.x*q.z-q.x*p.z;},0);
 assert(area>0,'clockwise with south-positive z');assert(Math.abs(p.y-sample(t,t.length-.01).y)<.01);
});
test('historic Indianapolis restores both opposing hairpins before the oval',()=>{
 const t=tracks.find(t=>t.id==='us-1909');assert(Math.abs(t.length-4192)<100);
 const points=t.points.filter(p=>{const lon=t.origin.lon+p.x/(111320*Math.cos(t.origin.lat*Math.PI/180)),lat=t.origin.lat-p.z/111320;return lat<39.7924&&lat>39.7915&&lon> -86.2344&&lon< -86.2329;});
 assert(points.some(p=>Math.sin(p.heading)<-.8),'westbound return through double hairpin');
 assert(points.some(p=>Math.sin(p.heading)>.8),'eastbound exit from double hairpin');
});
test('Buenos Aires 6S includes the Senna turns and a smooth mapped Horquilla exit',()=>{
 const t=tracks.find(t=>t.id==='ar-1952');assert(Math.abs(t.length-4259)<60);
 for(const [lon,lat]of[[-58.4614068,-34.696624],[-58.4609672,-34.697052],[-58.464565,-34.697598]]){
  const x=(lon-t.origin.lon)*111320*Math.cos(t.origin.lat*Math.PI/180),z=-(lat-t.origin.lat)*111320;
  assert(Math.min(...t.points.map(p=>Math.hypot(p.x-x,p.z-z)))<20,'mapped route landmark');
 }
});
