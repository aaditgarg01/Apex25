import {LIVERIES,liveryProfile,normalizeLiveryIndex} from '/shared/liveries.mjs';
import {isOnTrack,isRaceFinisher,raceGapLabel} from '/shared/race-display.mjs';
import {CONDITIONS,conditionProfile,normalizeConditions} from '/shared/conditions.mjs';
import {NetworkMotion} from '/shared/netcode.mjs';
import {RaceScene} from './scene.js';
import {steeringInput} from '/shared/controls.mjs';
import {createSession,stepSession,endSession,advanceToRace,sessionStandings,QUALIFYING_LIMIT,validLapCount} from '/shared/session.mjs';
import {makeTracks} from '/shared/tracks.mjs';
import {createCar,stepRace,resetCar,retireCar,QUALIFYING_RESTARTS,standings} from '/shared/physics.mjs';
const $=id=>document.getElementById(id),keys=new Set(),expandedResults=new Set(),netHistories=new Map(),mapLayers=new WeakMap();let tracks,track,scene,cars=[],playerId='local',elapsed=-4,racing=false,paused=false,online=false,ws=null,room=null,clientId=null,sendAt=0,pingAt=0,last=performance.now(),acc=0,resultsShown=false,soundOn=true,volume=0.8,audio,osc,gain,filter,toastTimer,session=null,spectating=false,spectateIndex=0,resultSignature='',networkMotion=null,queuedState=null,hudDetails=false;
const format=s=>{if(!Number.isFinite(s)||s<0)return '00:00.000';return `${String(Math.floor(s/60)).padStart(2,'0')}:${(s%60).toFixed(3).padStart(6,'0')}`;};
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function safeName(){return $('driver').value.trim().slice(0,18)||'Driver 01';}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
function drawMap(canvas,active=false){
 if(!track)return;const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;let layer=mapLayers.get(canvas);
 if(!layer||layer.track!==track||layer.active!==active||layer.w!==w||layer.h!==h){
  const ps=track.points;let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;for(const p of ps){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);}
  const scale=Math.min((w-55)/(maxX-minX),(h-45)/(maxZ-minZ)),ox=(w-(maxX-minX)*scale)/2,oy=(h-(maxZ-minZ)*scale)/2,xy=p=>[ox+(p.x-minX)*scale,oy+(p.z-minZ)*scale],image=document.createElement('canvas');image.width=w;image.height=h;const base=image.getContext('2d');base.beginPath();ps.forEach((p,i)=>{const [x,y]=xy(p);i?base.lineTo(x,y):base.moveTo(x,y);});base.closePath();base.lineJoin='round';base.lineCap='round';base.strokeStyle=active?'#71838d':'#e5e9e7';base.lineWidth=active?4:5;base.stroke();const start=xy(ps[0]);base.fillStyle='#ff5937';base.fillRect(start[0]-4,start[1]-4,8,8);layer={track,active,w,h,image,xy};mapLayers.set(canvas,layer);
 }
 ctx.clearRect(0,0,w,h);ctx.drawImage(layer.image,0,0);if(active)for(const c of cars){if(!isOnTrack(c))continue;const [x,y]=layer.xy(c);ctx.beginPath();ctx.arc(x,y,c.id===playerId?6:4,0,Math.PI*2);ctx.fillStyle=c.id===playerId?'#fff':c.color;ctx.fill();if(c.id===playerId){ctx.strokeStyle='#ff502d';ctx.lineWidth=3;ctx.stroke();}}
}
function setHudDetails(value){hudDetails=!!value;document.body.classList.toggle('hud-detailed',hudDetails);$('hud-details').checked=hudDetails;$('hud-toggle').setAttribute('aria-pressed',String(hudDetails));$('hud-toggle').textContent=hudDetails?'Less':'Details';try{localStorage.setItem('apex-hud-details',String(hudDetails));}catch{}}

function selectTrack(id){track=tracks.find(t=>t.id===id)||tracks[15];$('track').value=track.id;$('country-title').textContent=track.country.toUpperCase();$('venue').textContent=track.name;$('length').textContent=(track.officialLength/1000).toFixed(3);$('turns').textContent=track.turns;$('round').textContent=track.round?`ROUND ${String(track.round).padStart(2,'0')}`:'EXTRA CIRCUIT';$('track-count').textContent=tracks.length;$('circuit-category').textContent=track.category.toUpperCase();$('country-code').textContent=track.code;$('city').textContent=`${track.city}, ${track.country}`.toUpperCase();scene.load(track);scene.setConditions($('conditions').value);$('elevation-detail').textContent=`${Math.round(track.elevation.range)} m elevation change`;cars=[createCar(track,'preview','Driver',0,false,Number($('car-color').value))];drawMap($('preview-map'));try{localStorage.setItem('apex-track',track.id);}catch{}}
function randomiseSetup(kind){
 if(racing||room||!tracks?.length||!scene)return;
 const choices=kind==='track'?tracks.map(t=>t.id).filter(id=>id!==track.id):Object.keys(CONDITIONS).filter(id=>id!==$('conditions').value);
 if(!choices.length)return;const selected=choices[Math.floor(Math.random()*choices.length)];
 if(kind==='track'){selectTrack(selected);setupMode();}else{$('conditions').value=selected;updateConditionsUI();scene.setConditions(selected);}
 toast(`${track.city} · ${conditionProfile($('conditions').value).label}`);
}
function updateLiveryUI(){
 const selected=normalizeLiveryIndex(Number($('car-color').value));$('car-color').value=String(selected);
 const paint=liveryProfile(selected);$('livery-swatches').replaceChildren();
 for(const color of [paint.body,paint.side,paint.accent]){const swatch=document.createElement('i');swatch.style.background=color;$('livery-swatches').append(swatch);}
 $('livery-name').textContent=paint.name+' · 2025';
 try{localStorage.setItem('apex-livery',paint.id);}catch{}
 if(track&&!racing&&!room)cars=[createCar(track,'preview','Driver',0,false,selected)];
}
function saveName(){try{localStorage.setItem('apex-name',safeName());}catch{}}
function leaveRoom(){if(ws?.readyState===1)ws.send(JSON.stringify({type:'leave'}));room=null;online=false;}
function modeLabel(){return session?.phase.startsWith('qualifying')?'QUALIFYING':session?.phase.startsWith('practice')?'FREE PRACTICE':'RACE';}
function chosenLaps(){const el=$('laps');if($('session-mode').value==='practice')return 3;const value=el.valueAsNumber;el.setCustomValidity(validLapCount(value)?'':'Enter a whole number of laps, at least 1.');return el.reportValidity()?value:null;}
function chosenOpponents(){const el=$('ai-count');if($('session-mode').value==='practice')return 0;return el.reportValidity()?el.valueAsNumber:null;}
function startSolo(){
 const laps=chosenLaps(),aiCount=chosenOpponents();if(laps===null||aiCount===null)return;
 if(room)leaveRoom();online=false;playerId='local';
 const mode=$('session-mode').value,aiNames=['NOVA','REEVES','SILVA','KIM','ROSSI','MARTIN','BLAKE'],drivers=[{id:playerId,name:safeName(),colorId:Number($('car-color').value)},...(mode==='practice'?[]:aiNames.slice(0,aiCount).map((name,i)=>({id:'ai'+i,name,ai:true})))];
 session=createSession(track,drivers,{mode,laps,practiceStart:$('practice-start').value,conditions:$('conditions').value});begin();
}
function begin(){
 netHistories.clear();for(const c of session.cars)netHistories.set(c.id,{lapHistory:c.lapHistory||[],lapValidHistory:c.lapValidHistory||[]});
 $('conditions').value=normalizeConditions(session.conditions);scene.setConditions(session.conditions);updateConditionsUI();
 queuedState=null;cars=session.cars;elapsed=session.elapsed;networkMotion=online?new NetworkMotion(track,playerId):null;if(networkMotion)networkMotion.receive(session,performance.now());sendAt=0;expandedResults.clear();resultSignature='';keys.clear();paused=false;racing=true;acc=0;resultsShown=false;spectating=false;spectateIndex=0;closeDialogs();document.body.classList.add('racing');$('hud').hidden=false;$('touch').hidden=!matchMedia('(pointer:coarse)').matches;
 $('conditions-label').textContent=conditionProfile(session.conditions).label;$('conditions-label').className='conditions-label '+normalizeConditions(session.conditions);$('lap-total').textContent=session.phase==='practice'?'∞':session.phase==='qualifying'?'1':session.laps;$('race-track-name').textContent=track.city.toUpperCase();$('mode-label').textContent=(online?'ONLINE · ':'')+modeLabel();$('ping').textContent='';scene.cameraReady=false;saveName();if(soundOn)startAudio();
}
function updateConditionsUI(){const profile=conditionProfile($('conditions').value);$('conditions-description').textContent=profile.description;try{localStorage.setItem('apex-conditions',profile.id);}catch{}}
function setupMode(){const mode=$('session-mode').value;$('practice-start-wrap').hidden=mode!=='practice';$('eau-rouge-option').hidden=track.id!=='be-1925';if(track.id!=='be-1925'&&$('practice-start').value==='eau-rouge')$('practice-start').value='start';for(const id of ['laps','laps-down','laps-up','ai-count','ai-down','ai-up'])$(id).disabled=mode==='practice';$('solo').replaceChildren(document.createTextNode(mode==='practice'?'FREE PRACTICE':mode==='weekend'?'START WEEKEND':'QUICK RACE'));const span=document.createElement('span');span.textContent=mode==='practice'?'UNLIMITED TIMED LAPS':mode==='weekend'?'QUALIFYING + RACE':`+ ${Number($('ai-count').value)||0} AI DRIVERS`;$('solo').append(span);$('session-description').textContent=mode==='practice'?'Drive at your own pace. Best valid lap is saved for this session.':mode==='weekend'?'One ghosted flying lap with up to 3 restarts sets the grid. Then race for the win.':'Jump directly into a standing-start race.';}
function finishMenu(){racing=false;paused=false;session=null;keys.clear();closeDialogs();document.body.classList.remove('racing');$('hud').hidden=true;$('touch').hidden=true;cars=[createCar(track,'preview','Driver',0,false,Number($('car-color').value))];scene.cameraReady=false;}
function input(){let steer=steeringInput(keys),throttle=keys.has('ArrowUp')||keys.has('KeyW'),brake=keys.has('ArrowDown')||keys.has('KeyS'),boost=keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('Space');const gp=navigator.getGamepads?.()[0];if(gp){steer=steeringInput(keys,gp.axes[0]);throttle ||=gp.buttons[7]?.value>.2;brake ||=gp.buttons[6]?.value>.2;boost ||=gp.buttons[0]?.pressed;}if(paused||document.querySelector('dialog[open]'))return{steer:0,brake:true,park:true};return {steer,throttle,brake,boost};}
function send(data){if(ws?.readyState===1)ws.send(JSON.stringify(data));else toast('The race server is disconnected.');}
function recover(){
 if(!racing||elapsed<0)return;
 const c=cars.find(c=>c.id===playerId);if(!c||c.finished||c.resetTimer>0)return;
 const qualifying=session.phase==='qualifying',used=c.restarts||0;
 if(qualifying&&used>=QUALIFYING_RESTARTS){toast('No qualifying restarts left');return;}
 if(online)send({type:'reset'});else resetCar(c,track,qualifying,elapsed);
 toast(qualifying?`Flying lap restarted · ${QUALIFYING_RESTARTS-used-1} restarts left`:session.phase==='race'?'Recovered to track · +3 seconds':'Recovered · current lap invalid');
}
function pause(){if(!racing)return;if($('pause-dialog').open){resume();return;}paused=!online;$('pause-title').textContent=online?'Race in progress.':'Take a breath.';$('pause-note').textContent=online?'The online race keeps running. Your car will brake while this menu is open.':'Your solo race is paused.';$('restart').hidden=online;$('retire').hidden=session?.phase!=='race'||!isOnTrack(cars.find(c=>c.id===playerId));const you=cars.find(c=>c.id===playerId);if(you?.finished){$('pause-title').textContent=you.retired?'You have retired.':'Your race is finished.';$('pause-note').textContent='Your result is saved. You can view results, spectate, or leave the session.';}$('pause-dialog').showModal();keys.clear();}
function resume(){paused=false;keys.clear();$('pause-dialog').close();}
function setVolume(v,preview=false){
 volume=Math.max(0,Math.min(1,Number(v)||0));
 try{localStorage.setItem('apex-volume',volume);}catch{}
 if(volume===0){soundOn=false;}
 else if(!soundOn){soundOn=true;startAudio();}
 updateSoundUI();
 if(preview&&soundOn&&!racing)previewAudio();
 updateAudio(cars.find(c=>c.id===playerId));
}
function updateSoundUI(){
 const active=soundOn&&volume>0;
 if($('sound')){$('sound').textContent=active?'Sound on':'Sound off';$('sound').setAttribute('aria-label',active?'Mute engine sound':'Enable engine sound');$('sound').classList.toggle('muted',!active);}
 const pct=Math.round((active?volume:0)*100);
 for(const id of ['volume','pause-volume']){const el=$(id);if(el){el.value=String(active?volume:0);el.style.setProperty('--val',`${pct}%`);}}
 for(const id of ['volume-val','pause-volume-val']){const el=$(id);if(el)el.textContent=`${pct}%`;}
 $('sound-control')?.classList.toggle('muted',!active);
}
function startAudio(){
 if(!audio){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio=new AC();osc=audio.createOscillator();osc.type='sawtooth';filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=900;gain=audio.createGain();gain.gain.value=0;osc.connect(filter).connect(gain).connect(audio.destination);osc.start();}
 if(audio.state==='suspended')audio.resume().catch(()=>{});
}
function previewAudio(){
 if(!audio)startAudio();if(!audio)return;
 try{
  gain.gain.cancelScheduledValues(audio.currentTime);
  gain.gain.setValueAtTime(.025*volume,audio.currentTime);
  osc.frequency.setValueAtTime(105,audio.currentTime);
  filter.frequency.setValueAtTime(750,audio.currentTime);
  gain.gain.setTargetAtTime(0,audio.currentTime+.08,.05);
 }catch{}
}
function updateAudio(c){if(!audio)return;gain.gain.setTargetAtTime(soundOn && racing && !paused && !c?.finished ? .035 * volume : 0,audio.currentTime,.12);if(c){const spd=Math.abs(c.v);osc.frequency.setTargetAtTime(70+(spd*3.6%44)*3,audio.currentTime,.05);filter.frequency.setTargetAtTime(500+spd*14,audio.currentTime,.1);}}
function showResults(){
 closeDialogs();paused=false;resultsShown=true;keys.clear();const qualifying=session.phase==='qualifying-results',practice=session.phase==='practice-results',p=cars.find(c=>c.id===playerId);
 $('results-eyebrow').textContent=qualifying?'QUALIFYING CLASSIFICATION':practice?'PRACTICE SUMMARY':'CHEQUERED FLAG';
 $('result-title').textContent=qualifying?'Your grid is set.':practice?'Session complete.':!p.retired&&standings(cars)[0].id===playerId?'Top step. Well driven.':'Race complete.';
 $('result-note').textContent=qualifying?'Fastest valid laps determine the starting grid. Invalid or unfinished laps start at the back.':practice?`${track.city} · ${Math.max(0,p.lap-1)} laps · Best ${p.bestLap?format(p.bestLap):'no valid lap'}`:`${track.city} · ${session.laps} laps · Your time ${p.retired?'DNF':format(p.finishTime)}${p.penalty?' (includes '+p.penalty+'s penalties)':''}`;
 $('advance').hidden=!qualifying;$('advance').disabled=online&&room.host!==clientId;$('advance').textContent=online&&room.host!==clientId?'WAITING FOR HOST':'CONTINUE TO RACE';
 $('spectate').hidden=qualifying||practice||session.cars.every(c=>c.finished);
 $('again').hidden=qualifying;$('again').textContent=online?'BACK TO LOBBY':practice?'PRACTICE AGAIN':'NEW SESSION';$('again').disabled=online&&room.host!==clientId;updateResults();$('results-dialog').showModal();
}
function addFinishFlag(element){const flag=document.createElement('span');flag.className='finisher-flag';flag.textContent='🏁';flag.title='Finished race';flag.setAttribute('aria-label','Finished race');element.append(flag);}
function updateRaceResultSummary(ordered){
 const you=cars.find(c=>c.id===playerId),pending=cars.some(isOnTrack);if(!you)return;
 $('result-title').textContent=you.retired?'You have retired.':pending?'You have crossed the line.':ordered[0]?.id===playerId?'Top step. Well driven.':'Race complete.';
 $('result-note').textContent=`${track.city} · ${session.laps} laps · Your time ${you.retired?'DNF':format(you.finishTime)}${you.penalty?' (includes '+you.penalty+'s penalties)':''}${pending?' · Provisional: other drivers are still racing.':''}`;
 $('spectate').hidden=!pending;
}
function updateResults(){const ordered=sessionStandings(session),signature=JSON.stringify([session.phase,session.phase==='race'&&cars.some(isOnTrack)?Math.floor(session.elapsed):null,ordered.map(c=>[c.id,c.name,c.bestLap,c.lap,c.finished,c.retired,c.finishTime,c.lapHistory,c.lapValidHistory])]);if(signature===resultSignature)return;resultSignature=signature;const list=$('results');list.replaceChildren();const timed=session.phase.startsWith('qualifying')||session.phase.startsWith('practice');$('result-gap-key').hidden=timed;if(!timed)updateRaceResultSummary(ordered);for(const c of ordered){const li=document.createElement('li'),name=document.createElement('span'),time=document.createElement('span');name.textContent=c.name+(c.id===playerId?' · YOU':'');if(!timed&&isRaceFinisher(c))addFinishFlag(name);time.className='result-time';if(timed){time.textContent=c.bestLap?format(c.bestLap):'NO VALID LAP';}else{
 const gap=document.createElement('span');gap.className='result-gap';gap.textContent=raceGapLabel(c,ordered[0],track.length,session.elapsed);gap.title=c.id===ordered[0]?.id?'Winner race time':'Gap to the winner';time.append(gap);
 if(isRaceFinisher(c)&&c.id!==ordered[0]?.id){const total=document.createElement('small');total.textContent=format(c.finishTime)+' total';time.append(total);}
 else if(isOnTrack(c)){const lap=document.createElement('small');lap.textContent='Lap '+c.lap;time.append(lap);}
 }if(timed&&!c.bestLap)li.className='invalid';li.append(name,time);if(c.lapHistory&&c.lapHistory.length>0){const hist=document.createElement('div');hist.className='lap-history';hist.hidden=!expandedResults.has(c.id);c.lapHistory.forEach((l,i)=>{const d=document.createElement('div');const isValid=c.lapValidHistory?c.lapValidHistory[i]!==false:true;d.textContent=`Lap ${i+1}: ${format(l)}${isValid?'':' (INVALID)'}`;if(!isValid)d.style.color='#ff704d';hist.append(d);});li.append(hist);li.style.cursor='pointer';li.onclick=()=>{hist.hidden=!hist.hidden;if(hist.hidden)expandedResults.delete(c.id);else expandedResults.add(c.id);};}list.append(li);}}
let hudAt=0;
function hud(now){
 if(now-hudAt<90||!session)return;hudAt=now;const live=cars.filter(isOnTrack),p=spectating?(live[spectateIndex%Math.max(1,live.length)]||cars.find(c=>c.id===playerId)):cars.find(c=>c.id===playerId);if(!p)return;const timed=session.phase.startsWith('qualifying')||session.phase.startsWith('practice'),qualifying=session.phase.startsWith('qualifying'),ordered=sessionStandings(session),rank=ordered.findIndex(c=>c.id===p.id)+1;
 $('timing').classList.toggle('qualifying',timed);$('position-label').textContent=timed?'LAP CLASSIFICATION':session.phase==='race-results'?'FINAL POSITION':cars.some(isRaceFinisher)?'PROVISIONAL ORDER':'RACE POSITION';$('position').textContent=String(rank).padStart(2,'0');$('grid-size').textContent=String(cars.length).padStart(2,'0');$('lap').textContent=session.phase==='practice'?p.lap:Math.min(p.lap,Number($('lap-total').textContent));
 const prevValid=p.lastLapValid!==false;
 $('clock-label').textContent=qualifying?'SESSION LEFT':'SESSION TIME';$('race-time').textContent=format(qualifying?Math.max(0,QUALIFYING_LIMIT-Math.max(0,elapsed)):elapsed);$('current-lap-time').textContent=p.finished?format(p.lastLap):format(Math.max(0,elapsed-p.lapStart));$('prev-time').textContent=p.lapHistory&&p.lapHistory.length?(format(p.lapHistory[p.lapHistory.length-1])+(prevValid?'':' (INVALID)')):'—';$('prev-time').style.color=prevValid?'':'#ff704d';$('best-time').textContent=p.bestLap?format(p.bestLap):'—';$('telemetry').hidden=!isOnTrack(p);$('retire').hidden=session.phase!=='race'||!isOnTrack(cars.find(c=>c.id===playerId));const displayCar=online&&!spectating&&networkMotion?.visual||p;$('speed').textContent=Math.round(Math.abs(displayCar.v)*3.6);$('gear').textContent=displayCar.v<-.5?'R':displayCar.v<1?'N':Math.min(8,Math.max(1,Math.floor(displayCar.v*3.6/43)+1));$('boost-value').textContent=Math.round(p.boost)+'%';$('boost-fill').style.width=p.boost+'%';
 // Compare valid completed sectors across the entire session, including AI
 // and retired drivers. Recompute as rivals finish sectors, before lap completion.
 const sectorTime=t=>Number.isFinite(t)&&t>0;
 const fieldBest=[0,1,2].map(i=>Math.min(...session.cars.flatMap(c=>[
  c.bestSectors[i],
  !c.invalidLap&&!c.outLap?c.sectors[i]:undefined,
  c.lastLapValid!==false?c.lastSectors[i]:undefined
 ]).filter(sectorTime)));
 for(let i=0;i<3;i++){
  const el=$('sec'+(i+1)),current=sectorTime(p.sectors[i]),time=current?p.sectors[i]:p.lastSectors[i];
  if(!sectorTime(time)){el.textContent='—';el.className='';continue;}
  const valid=current?!p.invalidLap&&!p.outLap:p.lastLapValid!==false;
  const best=p.bestSectors[i],milliseconds=Math.round(time*1000);
  el.textContent=time.toFixed(3);
  el.className=!valid?'yellow':milliseconds<=Math.round(fieldBest[i]*1000)?'purple':!sectorTime(best)||milliseconds<=Math.round(best*1000)?'green':'yellow';
 }
 $('track-warning').hidden=!p.offtrack&&(!p.invalidLap||p.outLap)&&!p.penalty;$('track-warning').textContent=p.offtrack?'OFF TRACK · GRIP REDUCED':p.invalidLap&&p.penalty?`PENALTY +${p.penalty}s · LAP INVALID`:p.penalty?`TIME PENALTIES: +${p.penalty}s`:p.invalidLap?'LAP INVALID':'';$('gradient').textContent=`${((p.pitch?Math.tan(p.pitch):0)*100).toFixed(1)}%`;
 $('session-banner').hidden=!timed||(!qualifying&&!p.invalidLap&&!p.outLap);$('session-banner').textContent=qualifying?(p.finished?'QUALIFYING COMPLETE':p.outLap?'OUT LAP · CROSS THE LINE TO START TIMING':p.invalidLap?`LAP INVALID · R TO RESTART (${QUALIFYING_RESTARTS-(p.restarts||0)} LEFT)`:`QUALIFYING · ${QUALIFYING_RESTARTS-(p.restarts||0)} RESTARTS LEFT`):p.outLap?'OUT LAP · CROSS THE LINE TO START TIMING':'LAP INVALID · TIMING RESUMES NEXT LAP';
 $('line-key').hidden=!$('racing-line').checked;$('end-session').hidden=!timed||session.phase.endsWith('results')||(online&&room.host!==clientId);$('end-session').textContent=qualifying?'Finish qualifying':'End practice';
 const control=input();$('throttle-bar').style.width=control.throttle?'100%':'0';$('brake-bar').style.width=control.brake?'100%':'0';[...$('rpm').children].forEach((el,i)=>el.classList.toggle('on',p.v>1&&i<(p.v*3.6%43)/43*12));$('countdown').textContent=elapsed<-3?'● ● ● ● ●':elapsed<0?String(Math.ceil(-elapsed)):elapsed<1?'GO':'';
 const list=$('leaderboard');list.replaceChildren();const first=hudDetails?0:Math.max(0,Math.min(ordered.length-3,rank-2));for(const [j,c]of (hudDetails?ordered:ordered.slice(first,first+3)).entries()){const i=first+j;const li=document.createElement('li');li.className=[c.id===playerId?'you':'',isRaceFinisher(c)?'finished':'',c.retired?'retired':''].filter(Boolean).join(' ');const pos=document.createElement('span'),name=document.createElement('span'),gap=document.createElement('span');pos.textContent=String(i+1).padStart(2,'0');name.className='driver-name';name.title=c.name;const label=document.createElement('span');label.className='driver-name-text';label.textContent=c.id===playerId?'YOU':c.name.slice(0,12);name.append(label);if(!timed&&isRaceFinisher(c))addFinishFlag(name);gap.className='driver-gap';gap.textContent=timed?(c.bestLap?format(c.bestLap):c.finished?'INVALID':'ON LAP'):raceGapLabel(c,ordered[0],track.length,session.elapsed);li.append(pos,name,gap);list.append(li);}
  if(hudDetails)drawMap($('race-map'),true);$('spectate-hint').hidden=!spectating;$('show-results').hidden=!resultsShown;$('pause').hidden=resultsShown&&!spectating;const you=cars.find(c=>c.id===playerId);
  if(session.phase.endsWith('results') && !$('results-dialog').open) {
    spectating=false; showResults();
  } else if(session.phase==='race'&&you?.finished&&!resultsShown&&!spectating) {
    showResults();
  } else if(resultsShown) {
    updateResults();
  }
}
function renderLobby(){closeDialogs();$('lobby-code').textContent=room.code;const t=tracks.find(t=>t.id===room.trackId);$('room-track').textContent=t.city.toUpperCase();$('conditions').value=normalizeConditions(room.conditions);scene.setConditions(room.conditions);updateConditionsUI();$('lobby-rules').textContent=(room.mode==='practice'?'Free practice':(room.mode==='weekend'?'Qualifying + ':'')+room.laps+' lap race')+' · '+conditionProfile(room.conditions).label;$('players').replaceChildren();for(const p of room.players){const li=document.createElement('li'),name=document.createElement('span'),tag=document.createElement('small');name.textContent=p.name;tag.textContent=p.id===room.host?'HOST':p.id===clientId?'YOU':'READY';li.append(name,tag);$('players').append(li);}$('start-room').disabled=room.host!==clientId;$('start-room').textContent=room.host===clientId?'LIGHTS OUT':'WAITING FOR HOST';$('invite-note').textContent=['localhost','127.0.0.1'].includes(location.hostname)?'This is a local address. Use Start Internet.command for a link friends can open from anywhere.':'Share this page’s invite link. Friends can join from anywhere; the game runs on the cloud server.';$('lobby-dialog').showModal();}
function connect(){if(ws?.readyState===WebSocket.OPEN){$('network-status').textContent='Connected · Ready to race';return Promise.resolve();}if(ws?.readyState===WebSocket.CONNECTING)return new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});return new Promise((resolve,reject)=>{ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}`);$('network-status').textContent='Connecting to race server…';ws.onopen=()=>{$('network-status').textContent='Connected · Ready to race';resolve();};ws.onerror=()=>{$('network-status').textContent='Cannot reach the race server.';reject(new Error('Cannot connect to the race server.'));};ws.onclose=()=>{if(online){toast('Connection lost. Rejoin the room from the menu.');finishMenu();}room=null;online=false;$('network-status').textContent='Disconnected. Reopen this panel to reconnect.';};ws.onmessage=event=>{let m;try{m=JSON.parse(event.data);}catch{return;}if(m.type==='welcome')clientId=m.id;if(m.type==='error')toast(m.message);if(m.type==='pong'){const ms=performance.now()-m.time;networkMotion?.setPing(ms);$('ping').textContent=Math.round(ms)+' ms';}if(m.type==='lobby'){room=m;online=true;if(m.state==='lobby'){if(racing)finishMenu();renderLobby();}else if($('results-dialog').open){$('again').disabled=room.host!==clientId;$('advance').disabled=room.host!==clientId;$('advance').textContent=room.host===clientId?'CONTINUE TO RACE':'WAITING FOR HOST';}}if(m.type==='start'){if(track.id!==m.trackId)selectTrack(m.trackId);playerId=clientId;session=m;begin();}if(m.type==='state'&&online&&racing){for(const c of m.cars){const history=netHistories.get(c.id)||{lapHistory:[],lapValidHistory:[]};if(c.lapHistory)history.lapHistory=c.lapHistory;if(c.lapValidHistory)history.lapValidHistory=c.lapValidHistory;netHistories.set(c.id,history);c.lapHistory=history.lapHistory;c.lapValidHistory=history.lapValidHistory;}queuedState={state:m,at:performance.now()};}};});}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copied to clipboard.');}catch{toast('Copy this: '+text);}}
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.1);last=now;if(!scene)return;
 scene.showLine=$('racing-line').checked;const control=input();let rendered=cars;
 if(racing&&session){
  if(!online&&!paused){acc+=dt;while(acc>=1/60){acc-=1/60;stepSession(session,{[playerId]:control},track,1/60);}cars=session.cars;elapsed=session.elapsed;rendered=cars;}
  if(online&&networkMotion){
   // Reconcile once per painted frame; skip obsolete snapshots delivered together.
   if(queuedState){session=queuedState.state;cars=session.cars;elapsed=session.elapsed;networkMotion.receive(session,queuedState.at);queuedState=null;}
   rendered=networkMotion.frame(now,dt,control);
   // Batch fixed simulation steps, including every change of steering direction.
   if(ws?.readyState===1&&ws.bufferedAmount<2048&&now-sendAt>=1000/60){const packet=networkMotion.takeCommands();if(packet){send(packet);sendAt=now;}}
   if(now-pingAt>2000){pingAt=now;send({type:'ping',time:now});}
  }
  hud(now);
 }
 const activeCars=rendered.filter(isOnTrack);const p=spectating?(activeCars[spectateIndex%Math.max(1,activeCars.length)]||rendered[0]):(rendered.find(c=>c.id===playerId)||rendered[0]);
 scene.frame(session?.phase.startsWith('qualifying')?rendered.filter(c=>c.id===p.id):rendered,p,dt,racing,racing&&!paused&&elapsed>=0&&!session?.phase.endsWith('results'));updateAudio(p);
}

try{const res=await fetch('/data/circuits.geojson', {headers:{'Bypass-Tunnel-Reminder':'true'}});if(!res.ok)throw new Error('Circuit data failed to load.');tracks=makeTracks(await res.json(),await (await fetch('/data/elevations.json', {headers:{'Bypass-Tunnel-Reminder':'true'}})).json());scene=new RaceScene($('world'));$('car-color').replaceChildren();LIVERIES.forEach((paint,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=paint.name;$('car-color').append(option);});tracks.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=`${t.round?String(t.round).padStart(2,'0'):'EXTRA'}  ${t.city} — ${t.country}`;$('track').append(o);});let selected='it-1922';try{selected=localStorage.getItem('apex-track')||selected;const savedLivery=LIVERIES.findIndex(paint=>paint.id===localStorage.getItem('apex-livery'));$('car-color').value=String(normalizeLiveryIndex(savedLivery));$('conditions').value=normalizeConditions(localStorage.getItem('apex-conditions'));$('driver').value=localStorage.getItem('apex-name')||'Driver 01';const sv=localStorage.getItem('apex-volume');if(sv!==null&&!isNaN(Number(sv)))volume=Math.max(0,Math.min(1,Number(sv)));}catch{}try{setHudDetails(localStorage.getItem('apex-hud-details')==='true');}catch{setHudDetails(false);}updateSoundUI();updateConditionsUI();updateLiveryUI();selectTrack(selected);setupMode();$('loading').hidden=true;requestAnimationFrame(frame);}catch(e){$('loading-text').textContent='Could not start the game: '+e.message+' Try a browser with WebGL enabled.';console.error(e);}
$('laps').oninput=()=>$('laps').setCustomValidity('');
for(const [id,delta]of [['laps-down',-1],['laps-up',1]])$(id).onclick=()=>{const el=$('laps'),n=el.valueAsNumber;el.value=String(Math.max(1,(validLapCount(n)?n:3)+delta));el.setCustomValidity('');};
$('ai-count').oninput=()=>{ $('ai-count').setCustomValidity(''); setupMode(); };
for(const [id,delta]of [['ai-down',-1],['ai-up',1]])$(id).onclick=()=>{const el=$('ai-count'),n=el.valueAsNumber;el.value=String(Math.min(7,Math.max(0,(isNaN(n)?7:n)+delta)));el.setCustomValidity('');setupMode();};
$('hud-toggle').onclick=()=>setHudDetails(!hudDetails);$('hud-details').onchange=e=>setHudDetails(e.target.checked);$('conditions').onchange=()=>{updateConditionsUI();scene.setConditions($('conditions').value);};$('session-mode').onchange=setupMode;$('end-session').onclick=()=>{if($('pause-dialog').open)resume();if(online)send({type:'end-session'});else endSession(session);};$('advance').onclick=()=>{if(online)send({type:'advance'});else if(advanceToRace(session,track))begin();};
$('car-color').onchange=updateLiveryUI;$('random-track').onclick=()=>randomiseSetup('track');$('random-conditions').onclick=()=>randomiseSetup('conditions');$('track').onchange=()=>{selectTrack($('track').value);setupMode();};$('solo').onclick=startSolo;$('online').onclick=()=>{if(chosenLaps()===null)return;$('online-dialog').showModal();connect().catch(e=>toast(e.message));};$('create-room').onclick=async()=>{const laps=chosenLaps(),aiCount=chosenOpponents();if(laps===null||aiCount===null){$('online-dialog').close();return;}try{await connect();saveName();send({type:'create',inputVersion:2,stateVersion:2,name:safeName(),trackId:track.id,laps,aiCount,mode:$('session-mode').value,practiceStart:$('practice-start').value,conditions:$('conditions').value,colorId:Number($('car-color').value)});}catch(e){toast(e.message);}};$('join-room').onclick=async()=>{try{const code=$('room-code').value.trim().toUpperCase();if(!/^[A-F0-9]{6}$/.test(code))return toast('Enter a six-character room code.');await connect();saveName();send({type:'join',inputVersion:2,stateVersion:2,name:safeName(),code,colorId:Number($('car-color').value)});}catch(e){toast(e.message);}};$('start-room').onclick=()=>send({type:'start'});$('leave-room').onclick=()=>{leaveRoom();finishMenu();};$('copy-code').onclick=()=>copy(room.code);$('copy-link').onclick=()=>copy(`${location.origin}/?room=${room.code}`);$('pause').onclick=pause;$('resume').onclick=resume;$('restart').onclick=startSolo;$('quit').onclick=$('results-exit').onclick=()=>{leaveRoom();finishMenu();};$('reset').onclick=recover;$('camera').onclick=()=>{scene.mode=(scene.mode+1)%3;scene.cameraReady=false;toast(['Chase camera','Cockpit camera','Overhead camera'][scene.mode]);};$('again').onclick=()=>{if(online)send({type:'rematch'});else startSolo();};$('retire').onclick=()=>{const c=cars.find(c=>c.id===playerId);if(session?.phase==='race'&&isOnTrack(c)){if(online)send({type:'retire'});else retireCar(c);}resume();};$('spectate').onclick=()=>{if(!cars.some(isOnTrack))return;$('results-dialog').close();spectating=true;spectateIndex=0;scene.cameraReady=false;};$('show-results').onclick=()=>$('results-dialog').showModal();$('sound').onclick=()=>{soundOn=!soundOn;if(soundOn){if(volume<=.01)volume=.8;startAudio();}updateSoundUI();updateAudio(cars.find(c=>c.id===playerId));};$('volume').oninput=e=>setVolume(e.target.value,true);if($('pause-volume'))$('pause-volume').oninput=e=>setVolume(e.target.value,false);const unlockAudio=()=>{if(soundOn){startAudio();if(audio?.state==='running'){for(const ev of ['pointerdown','keydown','touchstart'])window.removeEventListener(ev,unlockAudio);}}};for(const ev of ['pointerdown','keydown','touchstart'])window.addEventListener(ev,unlockAudio,{passive:true});$('help-button').onclick=()=>{if(racing&&!online)paused=true;$('help-dialog').showModal();keys.clear();};$('about-button').onclick=()=>$('about-dialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());$('help-dialog').addEventListener('close',()=>paused=false);$('pause-dialog').addEventListener('cancel',()=>paused=false);$('lobby-dialog').addEventListener('cancel',e=>e.preventDefault());$('results-dialog').addEventListener('cancel',e=>e.preventDefault());
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)&&!(racing&&!document.querySelector('dialog[open]')&&document.activeElement.type==='range'))return;if(racing&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Escape'&&racing&&!document.querySelector('dialog[open]')){e.preventDefault();pause();}if(racing&&!document.querySelector('dialog[open]')){if(e.code==='KeyH')setHudDetails(!hudDetails);if(e.code==='KeyC')$('camera').click();if(e.code==='KeyR')recover();keys.add(e.code);}if(spectating){const activeCars=cars.filter(isOnTrack),len=Math.max(1,activeCars.length);if(e.code==='ArrowLeft')spectateIndex=(spectateIndex-1+len)%len;if(e.code==='ArrowRight')spectateIndex=(spectateIndex+1)%len;}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(racing&&!online&&!document.querySelector('dialog[open]'))pause();});document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden&&racing&&!online&&!document.querySelector('dialog[open]'))pause();});document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);b.classList.add('pressed');};for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>{keys.delete(b.dataset.key);b.classList.remove('pressed');});});
const invited=new URLSearchParams(location.search).get('room');if(invited){$('room-code').value=invited.toUpperCase();$('online-dialog').showModal();connect().catch(e=>toast(e.message));}
if(document.modelContext?.registerTool){try{document.modelContext.registerTool({name:'list_circuits',description:'List the playable racing circuits.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:async()=>tracks.map(t=>({id:t.id,country:t.country,name:t.name}))});document.modelContext.registerTool({name:'select_circuit',description:'Select a circuit on the race setup screen.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},execute:async({id})=>{if(racing||room)throw new Error('Leave the race or room first.');if(!tracks.some(t=>t.id===id))throw new Error('Unknown circuit');selectTrack(id);return {selected:track.name};}});}catch(e){console.warn('Optional browser tools unavailable:',e.message);}}
