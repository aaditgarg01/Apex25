// Actual session packets; standalone codec/deflate benchmark, not game suite.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {deflateRawSync,constants} from 'node:zlib';
import {createHash} from 'node:crypto';
import {makeTracks} from '../shared/tracks.mjs';
import {createSession,stepSession} from '../shared/session.mjs';
import {encodeMotion,encodeState,mergeMotionState} from '../shared/netcode.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('='))),before=args.before?await import(pathToFileURL(args.before)):null;
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url)))),track=tracks.find(t=>t.id==='it-1922');
const session=createSession(track,Array.from({length:8},(_,i)=>({id:createHash('sha256').update('codec-driver-'+i).digest('hex').slice(0,32),name:'Codec driver '+i,ai:i>1})),{mode:'race',laps:3});session.elapsed=1;
const snapshots=[],packets=[];let identical=true;
for(let tick=0;tick<240;tick++){
 stepSession(session,Object.fromEntries(session.cars.slice(0,2).map(c=>[c.id,{throttle:true,steer:0,boost:tick>60&&tick<120}])),track,1/60);
 if(tick%3===0){const saved=structuredClone(session),packet=encodeMotion(saved);snapshots.push(saved);packets.push(packet);if(before){const previous=before.encodeMotion(saved);identical&&=previous===packet;assert.equal(packet,previous,'Motion packet changed');assert.deepEqual(mergeMotionState(saved,JSON.parse(packet)),before.mergeMotionState(saved,JSON.parse(previous)));}}
 if(tick%60===0)packets.push(encodeState(session));
}
if(before){
 const edge=structuredClone(snapshots[0]);Object.assign(edge.cars[0],{inputAck:42,inputAppliedAt:1.123456,inputAppliedSequence:42,contactSequence:4,lastContactAt:1.337,lastContactWith:edge.cars[1].id,lastContactSeverity:2.22});Object.assign(edge.cars[1],{pitState:'service',pitTimer:5.337,pitServiceDuration:2.337,pitMerge:{x:1,y:.2,z:3,start:1,length:20},lastPitServiceStop:1,lastPitTyreService:2.337});Object.assign(edge.cars[2],{finished:true,finishLaps:3,finishTime:72.337,lap:4});Object.assign(edge.cars[3],{pitClearance:Infinity,tyreLife:NaN,impactYaw:undefined});assert.equal(encodeMotion(edge),before.encodeMotion(edge),'Contact/pit/finish edge packet changed');assert.deepEqual(mergeMotionState(edge,JSON.parse(encodeMotion(edge))),before.mergeMotionState(edge,JSON.parse(before.encodeMotion(edge))));
}
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)],compression=[];
for(const level of [1,3,6]){
 const times=[];let bytes=0;for(let trial=0;trial<4;trial++){const started=performance.now();let size=0;for(const packet of packets)size+=deflateRawSync(packet,{level,flush:constants.Z_SYNC_FLUSH,finishFlush:constants.Z_SYNC_FLUSH}).length-4;if(trial)times.push(performance.now()-started);bytes=size;}
 compression.push({level,packets:packets.length,bodyBytes:bytes,medianMilliseconds:median(times),microsecondsPerPacket:median(times)*1000/packets.length});
}
const encodeTimes={before:[],after:[]};if(before){for(let trial=0;trial<6;trial++)for(const [name,fn]of (trial%2?[['after',encodeMotion],['before',before.encodeMotion]]:[['before',before.encodeMotion],['after',encodeMotion]])){const started=performance.now();for(let i=0;i<50;i++)for(const s of snapshots)fn(s);if(trial)encodeTimes[name].push(performance.now()-started);}}
const report={description:'Packets from actual shared eight-car Monza session; fresh deflate context per message, matching current context-takeover policy. Compression body estimates exclude WS/TLS framing. CPU figures are codec-only, not FPS or ping.',identicalMotionPackets:identical,rawBytes:packets.reduce((n,p)=>n+Buffer.byteLength(p),0),compression,encoding:before?{encodesPerRun:snapshots.length*50,beforeMedianMs:median(encodeTimes.before),afterMedianMs:median(encodeTimes.after),runs:encodeTimes}:null};console.log(JSON.stringify(report,null,2));if(args.out)await writeFile(args.out,JSON.stringify(report,null,2)+'\n');
