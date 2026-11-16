import {RaceScene} from '../scene.js';
import {makeTracks} from '/shared/tracks.mjs';
import {networkLabDrive} from '/shared/network-lab-drive.mjs';
import {createCar} from '/shared/physics.mjs';
import {NetworkMotion,mergeMotionState} from '/shared/netcode.mjs';
import {steeringInput} from '/shared/controls.mjs';
import {NetworkLabMetrics} from '/shared/network-lab-metrics.mjs';
import {PHOTON_LAB_APP_ID,PHOTON_LAB_TRACK,validLabCode} from '/shared/photon-lab.mjs';
const $=elementId=>document.getElementById(elementId),keys=new Set(),metrics=new NetworkLabMetrics();
let worker,scene,track,session,motion,queued,id,code,host,role='server-client',actualRegion='Singapore',last=performance.now(),lastUI=0,lastPing=0,connecting=false,selectedTransport='current',lastReport=null,savedRuns=[],history=new Map(),connectionGeneration=0,preview;
try{savedRuns=JSON.parse(localStorage.getItem('apex-network-lab-runs')||'[]');if(!Array.isArray(savedRuns))savedRuns=[];else savedRuns=savedRuns.filter(r=>r&&['current','photon'].includes(r.transport)).slice(-12);}catch{}
$('app-id').value=PHOTON_LAB_APP_ID;
const invite=new URLSearchParams(location.hash.slice(1));if(['current','photon'].includes(invite.get('transport')))$('transport').value=invite.get('transport');if(['asia','in','eu','us'].includes(invite.get('region')))$('region').value=invite.get('region');if(validLabCode(invite.get('room')||''))$('room-code').value=invite.get('room');
function configure(){
 const photon=$('transport').value==='photon';$('photon-settings').hidden=!photon;
 $('architecture').textContent=photon?'Development prototype: the creator’s browser hosts race simulation. Compare guest results; keep the host connected.':'Race simulation runs on the current APEX server. On Vercel, this is Singapore.';
}
configure();$('transport').onchange=configure;
function controls(){
 if(!session||document.hidden)return {park:true,brake:true,steer:0};
 if($('repeat-drive').checked&&session.elapsed>=0){
  const car=motion?.visual||session.cars.find(c=>c.id===id);if(!car||car.finished)return {park:true,brake:true};
  return networkLabDrive(track,car,session.elapsed);
 }
 if(['INPUT','SELECT'].includes(document.activeElement?.tagName))return {park:true,brake:true,steer:0};
 return {steer:steeringInput(keys),throttle:keys.has('KeyW')||keys.has('ArrowUp'),brake:keys.has('KeyS')||keys.has('ArrowDown'),boost:keys.has('Space')||keys.has('ShiftLeft')||keys.has('ShiftRight')};
}
function send(message){worker?.postMessage({type:'send',message});}
function pump(){if(!motion||!session)return;const now=performance.now();motion.updateControl(controls(),now);const packet=motion.takeCommands(now);if(packet){metrics.sent(packet.commands.at(-1)[0],now);send(packet);}}
setInterval(pump,1000/60);
function fail(message){$('status').textContent=message;}
function lock(locked){for(const element of $('setup').querySelectorAll('input,select,button'))element.disabled=locked;}
function stop(){
 ++connectionGeneration;const old=worker;worker=null;if(old){old.postMessage({type:'close'});setTimeout(()=>old.terminate(),250);}
 if(lastReport&&lastReport.durationSeconds>0)$('status').textContent='Test ended. Save the run before starting the other option.';
 session=null;motion=null;queued=null;history.clear();keys.clear();connecting=false;$('room').hidden=true;$('drive').hidden=true;lock(false);
}
function roster(packet){
 code=packet.code;host=packet.host;$('code').textContent=code;$('players').textContent=packet.players.length+' / 8 drivers';$('room').hidden=false;
 $('start').hidden=host!==id;$('start').disabled=packet.players.length<2||packet.state!=='lobby';
 if(packet.state==='lobby')$('status').textContent=packet.players.length<2?'Invite a second driver, then start.':'Both drivers are ready. The creator can start.';
 $('role').textContent=selectedTransport==='photon'?(role==='browser-host'?'You host this Photon test. Your local results are not comparable to a remote server.':'Photon guest · '+actualRegion+' · another browser runs the race.'):'Current APEX server client · server simulation · '+actualRegion+'.';
}
function packet(message,at,bytes){
 if(message.type==='welcome'){id=message.id;return;}
 if(message.type==='error'){fail(message.message);return;}
 if(message.type==='lobby'){connecting=false;roster(message);return;}
 if(message.type==='pong'){const rtt=performance.now()-message.time;if(selectedTransport==='current')metrics.ping(rtt);motion?.setPing(rtt);return;}
 if(message.type==='start'){
  session=message;history.clear();motion=new NetworkMotion(track,id,{liveInput:true});motion.receive(session,performance.now(),at);metrics.reset();queued=null;
  $('drive').hidden=false;$('start').disabled=true;$('status').textContent='Drive the same way in each option, or enable the repeatable drive.';scene.cameraReady=false;keys.clear();document.activeElement?.blur();return;
 }
 if(!session||!['state','motion'].includes(message.type))return;
 const counted=metrics.start!==null;if(counted)metrics.received(bytes);
 const base=queued?.state||session;
 if(message.elapsed<base.elapsed)return;
 let next;
 if(message.type==='state'){
  for(const car of message.cars){const h=history.get(car.id)||{lapHistory:[],lapValidHistory:[]};if(car.lapHistory)h.lapHistory=car.lapHistory;if(car.lapValidHistory)h.lapValidHistory=car.lapValidHistory;history.set(car.id,h);Object.assign(car,h);}
  next=message;
 }else next=mergeMotionState(base,message);
 if(!next||next===base)return;
 motion.record(next,at);queued={state:next,at};metrics.packet(next,next.cars.find(c=>c.id===id),at,counted?0:bytes);
}
function open(action){
 if(!scene||worker||connecting)return;
 const chosen=$('transport').value,requested=$('room-code').value.trim().toUpperCase();if(action==='join'&&!validLabCode(requested)){fail('Enter the six-character test room code.');return;}
 if(chosen==='photon'&&!/^[a-f0-9-]{36}$/i.test($('app-id').value.trim())){fail('Enter the Photon Realtime App ID.');return;}
 connecting=true;id=null;code=null;host=null;selectedTransport=chosen;role='server-client';actualRegion=$('region').selectedOptions[0].textContent;lock(true);lastReport=null;$('save').disabled=true;metrics.reset();$('status').textContent='Connecting to '+(chosen==='photon'?'Photon…':'the current APEX server…');
 const generation=++connectionGeneration;
 worker=new Worker('/network-lab/'+(chosen==='photon'?'photon':'socket')+'-worker.js',{type:'module'});
 worker.onerror=()=>{if(generation!==connectionGeneration)return;stop();fail('The comparison worker stopped. You can retry.');};
 worker.onmessage=({data})=>{
  if(generation!==connectionGeneration)return;
  const at=data.at-performance.timeOrigin;
  if(data.type==='packet')packet(data.packet,at,data.bytes||0);
  if(data.type==='role'){role=data.role;actualRegion=data.region;}
  if(data.type==='stats')metrics.ping(data.ping);
  if(data.type==='resumed')metrics.resumes++;
  if(data.type==='status')fail(data.message);
  if(data.type==='error'){if(!code)stop();fail(data.message);connecting=false;}
  if(data.type==='closed'){stop();fail(data.message);}
 };
 const generated=Array.from(crypto.getRandomValues(new Uint8Array(3)),n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
 worker.postMessage({type:'open',action,code:action==='join'?requested:generated,appId:$('app-id').value.trim(),region:$('region').value,name:'Lab driver'});
}
$('create').onclick=()=>open('create');$('join').onclick=()=>open('join');$('setup').onsubmit=e=>{e.preventDefault();open('join');};$('stop').onclick=stop;$('start').onclick=()=>send({type:'start'});
$('copy').onclick=async()=>{const url=new URL('/network-lab.html',location.href);url.hash=new URLSearchParams({transport:selectedTransport,room:code,region:$('region').value}).toString();try{await navigator.clipboard.writeText(url.href);fail('Invite copied. Open it on the other device.');}catch{fail('Test room '+code+' · choose '+selectedTransport+' on the other device.');}};
$('reset-metrics').onclick=()=>{metrics.reset();lastReport=null;$('save').disabled=true;};
function updateSaved(){
 $('saved').textContent=savedRuns.length?savedRuns.length+' saved run(s). Compare guest runs of similar length.':'No saved runs on this device.';$('export').disabled=!savedRuns.length;
 const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent='Saved test runs';table.append(caption);
 const header=document.createElement('tr');for(const title of ['Option / role','Input p95','Gap p95','Seconds']){const cell=document.createElement('th');cell.textContent=title;header.append(cell);}table.append(header);
 for(const run of savedRuns.slice(-6)){
  const row=document.createElement('tr'),label=(run.transport==='photon'?'Photon':'Current')+' · '+(run.role==='browser-host'?'local host':run.role==='guest'?'guest':'server client'),ms=value=>Number.isFinite(value)?Math.round(value)+' ms':'—';
  for(const value of [label,ms(run.latestInputAckMs?.p95),ms(run.updateGapMs?.p95),String(Math.round(run.durationSeconds||0))]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}table.append(row);
 }
 $('saved-table').replaceChildren(...(savedRuns.length?[table]:[]));
}
$('save').onclick=()=>{if(!lastReport||lastReport.durationSeconds<5)return;savedRuns.push(structuredClone(lastReport));savedRuns=savedRuns.slice(-12);try{localStorage.setItem('apex-network-lab-runs',JSON.stringify(savedRuns));}catch{}updateSaved();fail('Run saved on this device. Try the other multiplayer option next.');};
$('export').onclick=()=>{const report={schema:'apex25-network-lab-v1',conclusion:'No automatic winner: compare guest runs from both options on the same two devices and connection.',runs:savedRuns};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='apex25-network-comparison.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};updateSaved();
for(const event of ['keydown','keyup'])window.addEventListener(event,e=>{
 if(['INPUT','SELECT'].includes(document.activeElement?.tagName))return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 if(event==='keydown'){keys.add(e.code);if(e.code==='KeyR'&&!e.repeat)send({type:'reset'});}else keys.delete(e.code);pump();
});window.addEventListener('blur',()=>{keys.clear();pump();});window.addEventListener('pagehide',stop);
function frame(now){
 requestAnimationFrame(frame);const realDt=Math.max(0,(now-last)/1000),dt=Math.min(.1,realDt);last=now;if(!scene)return;
 let rendered=[preview],own=preview;
 if(session&&motion){
  if(queued){session=queued.state;motion.receive(session,now,queued.at);queued=null;}
  rendered=motion.frame(now,dt,controls());own=rendered.find(c=>c.id===id)||rendered[0];pump();metrics.rendered(own,now,realDt);
  if(now-lastPing>1000){lastPing=now;send({type:'ping',time:now});}
 }
 scene.sessionElapsed=session?.elapsed||0;scene.sessionPhase=session?.phase||'preview';scene.frame(rendered,own,dt,!!session,!!session&&session.elapsed>=0);
 if(now-lastUI<200)return;lastUI=now;
 if(session){$('speed').textContent=Math.round(Math.abs(own.v)*3.6);$('clock').textContent=session.elapsed<0?Math.ceil(-session.elapsed):Math.floor(session.elapsed)+'s';}
 const report=(!session&&lastReport)||metrics.report(now,{transport:selectedTransport,role,region:actualRegion,authority:selectedTransport==='photon'?'browser-worker':'APEX server',track:PHOTON_LAB_TRACK,cars:session?.cars.length||0,repeatableDrive:$('repeat-drive').checked,snapshotTargetHz:20,pageVisibility:document.visibilityState});
 if(report.durationSeconds>0){lastReport=report;$('save').disabled=report.durationSeconds<5;}
 const ms=value=>value===null?'—':Math.round(value)+' ms';
 $('ping').textContent=ms(report.connectionPingMs.p50);$('input-delay').textContent=ms(report.latestInputAckMs.p95);$('update-gap').textContent=ms(report.updateGapMs.p95);$('update-hz').textContent=report.updates?report.updatesPerSecond.toFixed(1):'—';$('data-rate').textContent=report.durationSeconds?report.decodedKBps.toFixed(1)+' KB/s':'—';$('frame-time').textContent=ms(report.frameMs.p95);
 if(report.durationSeconds)$('sample').textContent=report.durationSeconds.toFixed(0)+' seconds measured · '+report.updates+' updates'+(role==='browser-host'?' · local host, excluded from a fair guest comparison':'');
}
try{
 const [geo,elev]=await Promise.all([fetch('/data/circuits.geojson').then(r=>r.json()),fetch('/data/elevations.json').then(r=>r.json())]);track=makeTracks(geo,elev).find(t=>t.id===PHOTON_LAB_TRACK);scene=new RaceScene($('world'));scene.load(track);scene.showLine=true;preview=createCar(track,'preview','Preview',0);$('loading').hidden=true;fail('Ready. Choose an option and invite a second driver.');requestAnimationFrame(frame);
}catch(error){$('loading').textContent='Could not prepare the comparison: '+error.message;}
