import {istanbulGround,istanbulSurfaceAt,istanbulSurfaceY} from './istanbul.mjs';
import {portimaoGround,portimaoSurfaceAt,portimaoSurfaceY} from './portimao.mjs';
import {paulRicardGround,paulRicardSurfaceAt,paulRicardSurfaceY} from './paulricard.mjs';
import {madridGround,madridSurfaceAt,madridSurfaceY} from './madrid-scenery.mjs';
import {sepangSurfaceAt,sepangSurfaceY,sepangGround} from './sepang.mjs';
import {buddhSurfaceAt,buddhSurfaceY,buddhGround} from './buddh.mjs';
import {singaporeSurfaceAt} from './singapore.mjs';
import {lusailSurfaceAt,lusailSurfaceY,lusailTerrainHeight} from './lusail.mjs';
import {yasmarinaSurfaceAt,yasmarinaSurfaceY,yasmarinaTerrainHeight} from './yasmarina.mjs';
import {montrealSurfaceAt,montrealSurfaceY,montrealTerrainHeight} from './montreal.mjs';
import {barcelonaSurfaceAt,barcelonaSurfaceY,barcelonaTerrainHeight} from './barcelona.mjs';
import {hungaroringSurfaceAt,hungaroringSurfaceY,hungaroringTerrainHeight} from './hungaroring.mjs';
import {imolaSurfaceAt,imolaSurfaceY,imolaTerrainHeight} from './imola.mjs';
import {cotaSurfaceAt} from './cota.mjs';
import {monzaSurfaceAt} from './monza.mjs';
import {mexicoSurfaceAt} from './mexico.mjs';
import {redbullringSurfaceAt,redbullringSurfaceY,redbullringTerrainHeight} from './redbullring.mjs';
import {silverstoneSurfaceAt} from './silverstone.mjs';
import {miamiSurfaceAt} from './miami.mjs';
import {zandvoortSurfaceAt} from './zandvoort.mjs';
import {bankSupport,surfaceAttitude} from './banked-road.mjs';
import {prepareTyres,wearTyres,tyreGrip,tyreSpeedFactor,tyreDragFactor,availableTyreChoice} from './tyres.mjs';
import {stepPit,tryPitEntry,pitAhead,preparePitTraffic,pitLayout,pitRoadPose,isOnPitRoad} from './pits.mjs';
import {clearImpact,dampImpact,velocityOf,setVelocity} from './motion.mjs';
import {moveWithBarriers,resolveBarrierContacts} from './barriers.mjs';
import {LIVERIES,normalizeLiveryIndex} from './liveries.mjs';
import {guideBounds,sampleGuide} from './racing-line.mjs';
import {conditionProfile,normalizeConditions,yawRate} from './conditions.mjs';
import {sample,nearest,wrap,clamp,angleDiff,targetSpeed,terrainHeight} from './tracks.mjs';
import {resolveCarContacts} from './collisions.mjs';
import {isInPit} from './race-display.mjs';
import {roadHalfWidth} from './baku.mjs';
import {QUALIFYING_LIMIT,finishQualifyingCar} from './qualifying.mjs';
export const TOP_SPEED=106,BOOST_TOP_SPEED=115;
export const COLORS=LIVERIES.map(livery=>livery.marker);
export const GRID_ROW_SPACING=16,GRID_STAGGER=8,GRID_LATERAL_OFFSET=3.6;
export function gridSlot(index){return {s:-12-Math.floor(index/2)*GRID_ROW_SPACING-(index%2)*GRID_STAGGER,offset:(index%2?1:-1)*GRID_LATERAL_OFFSET};}
export function createCar(track,id,name,index,ai=false,colorId=null,conditions='normal'){const {s,offset}=gridSlot(index),p=sample(track,s,offset),paint=normalizeLiveryIndex(colorId,index);const car={id,name,index,pitBoxIndex:index,ai,tyreTrackId:track.id,airDensity:track.id==='mx-1962'?.78:1,conditions:normalizeConditions(conditions),motionHeading:p.heading,motionYawRate:0,impactVX:0,impactVZ:0,impactYaw:0,inputLag:0,surfaceGrip:1,cornerGrip:1,sliding:false,colorId:paint,color:COLORS[paint],x:p.x,z:p.z,y:p.y,heading:p.heading,pitch:p.pitch,roll:p.roll||0,bankedRoad:track.id==='nl-1948',s:wrap(s,track.length),progress:s,v:0,steer:0,lap:1,lastLap:0,bestLap:0,lapStart:0,finished:false,retired:false,finishTime:0,offtrack:false,offtrackPenalty:false,boost:100,penalty:0,resetTimer:0,invalidLap:false,offtrackTime:0,lastLapValid:true,outLap:false,sector:0,sectors:[],bestSectors:[],lastSectors:[],lapHistory:[],lapValidHistory:[],slipstream:0};prepareTyres(car);return car;}
export function retireCar(c){if(!c||c.finished)return false;c.retired=true;c.finished=true;c.finishTime=null;c.v=0;clearImpact(c);c.boostActive=false;c.sliding=false;return true;}
export function resetCar(c,track,isQualifying=false,elapsed=0){
 if(c.finished||isQualifying||c.qualifying||c.pitState!=='none')return false;
 clearImpact(c);const p=sample(track,c.s);Object.assign(c,p,{v:0,motionHeading:p.heading,motionYawRate:0,surfaceGrip:1,cornerGrip:1,sliding:false,penalty:c.penalty+3,resetTimer:1,invalidLap:true});
 return true;
}
export function stepCar(c,input,track,dt,elapsed,laps=3){
 if(c.finished)return;
 c.physicsTime=elapsed;
 if(stepPit(c,track,dt)){updateLap(c,track,elapsed,laps);return;}
 if(c.qualifying&&c.outLap&&elapsed>=QUALIFYING_LIMIT){finishQualifyingCar(c,elapsed);return;}
 dampImpact(c,dt);
 if(c.ai)c.inputLag=0;
 if(c.resetTimer>0)c.resetTimer-=dt;
 const prev=c.s,previousPose={x:c.x,z:c.z,heading:c.heading},conditions=conditionProfile(c.conditions,c.trackWetness);
 let throttle=input.throttle?1:0,brake=input.brake?1:0,steer=clamp(Number(input.steer)||0,-1,1),aiBoost=false;
 if(c.ai){
  const distance=Math.max(track.width<15?6:12,c.v*(track.width<15?.32:.5)),station=c.s+distance;
  const guide=sampleGuide(track,station),bounds=guideBounds(track,station);
  const lane=clamp(guide.offset+(c.aiLaneOffset??0),bounds.low,bounds.high);
  let look=c.aiLaneOffset?sample(track,station,lane):guide;
  if(c.pitRequested){
   const pit=pitLayout(track),ahead=pitAhead(c,track),past=track.length-ahead;
   if(ahead<170||past<pit.taper-12){
    const toGate=ahead<170?ahead:-past;
    const pitLookAhead=Math.min(distance,Math.max(6,c.v*.42));
    const lookFromGate=pitLookAhead-toGate;
    if(lookFromGate>=0)look=pitRoadPose(track,lookFromGate);
    else{
     const blend=clamp(1+lookFromGate/85,0,1);
     const approach=c.s+pitLookAhead,offset=sampleGuide(track,approach).offset;
     look=sample(track,approach,offset+(pit.entryOffset-offset)*blend);
    }
   }
  }
  const aim=Math.atan2(look.x-c.x,look.z-c.z);
  steer=clamp(angleDiff(aim,c.heading)*3,-1,1);
  const brakingLook=conditions.wetness?Math.max(0,c.v)*(1-conditions.braking)*2:0;
  const pace=Math.min(targetSpeed(track,c.s,c.conditions,c.trackWetness),targetSpeed(track,c.s+brakingLook,c.conditions,c.trackWetness));
  const skill=track.width<15?.65+c.index*.01:.78+c.index*.018;
  const trafficCorner=guide.curvature>.009&&Math.abs(c.aiLaneOffset||0)>1.2;
  const tyrePace=Math.min(1,Math.sqrt(tyreGrip(c)))*tyreSpeedFactor(c);
  const desiredPace=pace*skill*(trafficCorner?.89:1)*tyrePace;
  const trafficLimit=c.aiTrafficSpeed??Infinity;
  const straight=pace>53&&[45,90,135].every(ahead=>targetSpeed(track,c.s+ahead,c.conditions,c.trackWetness)>pace-2);
  const passing=c.aiPassTarget!=null;
  const approach=passing?targetSpeed(track,c.s+Math.max(12,c.v*.55),c.conditions,c.trackWetness):0;
  // Spend energy above the AI's conservative cruise pace while passing,
  // bounded by available grip, the next braking zone and any car ahead.
  const passPace=Math.min(desiredPace+8*tyrePace,Math.min(pace,approach)*tyrePace*(trafficCorner?.95:1),trafficLimit);
  const passReady=passing&&c.v>16&&!c.sliding&&Math.abs(steer)<.94&&c.v+.35<passPace;
  const ready=!c.offtrack&&!c.pitRequested&&!c.outLap&&
   (passing?passReady:straight&&c.aiTrafficSpeed==null&&c.v>28);
  const newPass=passing&&c.aiBoostPassTarget!==c.aiPassTarget;
  if(ready&&(newPass||elapsed>=(c.aiBoostReadyAt??0))&&c.boost>(passing?20:32)){
   if(passing)c.aiBoostPassTarget=c.aiPassTarget;
   c.aiBoostUntil=elapsed+(passing?2.1:1.45);
   c.aiBoostReadyAt=c.aiBoostUntil+(passing?3.5:7+c.index*.4);
  }
  aiBoost=ready&&elapsed<(c.aiBoostUntil??0)&&c.boost>12;
  const desired=Math.min(trafficLimit,aiBoost?(passing?passPace:desiredPace+7*tyrePace):desiredPace);
  const overspeed=c.v-desired;
  throttle=overspeed<0?1:0;
  brake=overspeed>1.5?clamp(overspeed*.12,.16,1):0;
 }
 // Booking a stop never brakes on the racing surface. The limiter starts at the gate.
 if(c.ai&&laps===Infinity&&c.pitState==='none'&&(c.tyreLife<35||tyreGrip(c)<.72)){c.pitCompound=availableTyreChoice(c);c.pitRequested=true;}
 const boost=(c.ai?aiBoost:!!input.boost)&&c.boost>0&&throttle&&!brake&&!c.offtrack;c.boostActive=!!boost;
 c.boost=clamp(c.boost+dt*(boost?-19:brake?12:4),0,100);
 const venueSurfaceAt=track.id==='tr-2005'?istanbulSurfaceAt:track.id==='pt-2008'?portimaoSurfaceAt:track.id==='fr-1969'?paulRicardSurfaceAt:null;
 const roadOffset=conditions.wetness||['tr-2005','pt-2008','fr-1969','es-2026','my-1999','in-2011','sg-2008','qa-2004','ae-2009','ca-1978','es-1991','hu-1986','it-1953','us-2012','nl-1948','us-2022','gb-1948','at-1969','mx-1962','it-1922'].includes(track.id)?nearest(track,c.x,c.z,c.s).offset:0,road=sample(track,c.s,track.id==='nl-1948'?roadOffset:0),duneSurface=venueSurfaceAt&&Math.abs(roadOffset)>track.width/2?venueSurfaceAt(track,c.s,roadOffset,conditions.wetness,c):track.id==='es-2026'&&Math.abs(roadOffset)>track.width/2?madridSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='my-1999'?sepangSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='in-2011'?buddhSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='sg-2008'?singaporeSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='nl-1948'?zandvoortSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='us-2022'?miamiSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='gb-1948'?silverstoneSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='at-1969'?redbullringSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='qa-2004'?lusailSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='ae-2009'?yasmarinaSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='ca-1978'?montrealSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='es-1991'?barcelonaSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='hu-1986'?hungaroringSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='it-1953'?imolaSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='us-2012'?cotaSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='it-1922'?monzaSurfaceAt(track,c.s,roadOffset,conditions.wetness):track.id==='mx-1962'?mexicoSurfaceAt(track,c.s,roadOffset,conditions.wetness):null;
 if(duneSurface&&track.id==='nl-1948'){const bank=duneSurface.bank;c.bankedRoad=true;c.bankRoll=bank.roll;c.bankTurnSign=-bank.outerSide;c.roadCurvature=angleDiff(sample(track,c.s+5).heading,sample(track,c.s-5).heading)/10;c.bankNormalLoad=bankSupport(bank.bank,Math.abs(c.v),1/Math.max(.0001,Math.abs(c.roadCurvature)),conditions.wetness).normalLoad;}
 c.surfaceGrip=conditions.wetness?(c.offtrack?.48:Math.abs(roadOffset)>roadHalfWidth(track,c.s)-.8?conditions.curbGrip:1):1;
 if(duneSurface)c.surfaceGrip=(['tr-2005','pt-2008','fr-1969','es-2026','my-1999','in-2011','qa-2004','sg-2008'].includes(track.id)&&duneSurface.kind!=='asphalt'?1:c.surfaceGrip)*duneSurface.grip;
 c.cornerGrip=(1-conditions.wetness*(brake*.24+throttle*.10))*(track.id==='mx-1962'?.92:1);
 const rubber=tyreGrip(c),speedLimit=(boost?BOOST_TOP_SPEED:TOP_SPEED)*tyreSpeedFactor(c),density=track.id==='mx-1962'?.78:1;
 const traction=conditions.traction*c.surfaceGrip*rubber,braking=33*conditions.braking*c.surfaceGrip*rubber;
 const accel=(boost?19:14)*traction*Math.max(.15,1-c.v/125),slip=c.slipstream||0,drag=(.55+c.v*c.v*.00032*density*tyreDragFactor(c))*(1-slip*0.3)+(duneSurface?Math.abs(c.v)*duneSurface.drag:c.offtrack?c.v*.5:0)+Math.max(0,c.v-speedLimit)*1.25;
 c.slipstream=0;
 const travelPitch=track.id==='nl-1948'?surfaceAttitude(road,c.motionHeading??c.heading).pitch:road.pitch,gravity=-9.81*Math.sin(travelPitch);
 if(input.park){if(c.v>0)c.v=Math.max(0,c.v-(braking+drag)*dt);else if(c.v<0)c.v=Math.min(0,c.v+(braking+drag)*dt);}
 else if(c.v>=0){
  if(c.v<=.2&&brake&&!throttle&&!c.ai){c.v=Math.max(-12,c.v-(7.5*traction-gravity)*dt);}
  else{const newV=c.v+(throttle*accel-brake*braking-drag+gravity)*dt;if(newV<0&&brake&&!throttle&&!c.ai)c.v=Math.max(-12,newV*.25);else c.v=Math.max(0,Math.min(Math.max(c.v,speedLimit),newV));}
 }else{
  if(throttle){const newV=c.v+(braking+drag+gravity)*dt;c.v=newV>0?Math.min(speedLimit,newV):newV;}
  else if(brake){const revDrag=.8+Math.abs(c.v)*.25;c.v=c.v<-12?Math.min(-12,c.v+(revDrag+gravity)*dt):Math.max(-12,c.v-(7.5*traction+revDrag-gravity)*dt);}
  else{const revDrag=2.5+Math.abs(c.v)*.5;c.v=Math.min(0,c.v+(revDrag+gravity)*dt);}
 }
 const speed=Math.abs(c.v);
 c.steer+=(steer-c.steer)*Math.min(1,dt*10);
 const rate=yawRate(c);
 const impactMotion=Math.hypot(c.impactVX,c.impactVZ)>.01||Math.abs(c.impactYaw)>.001?velocityOf(c):null;
 c.heading+=(rate+c.impactYaw)*dt;
 const oldMotion=Number.isFinite(c.motionHeading)?c.motionHeading:c.heading;
 if((conditions.wetness||rubber<.9||duneSurface&&c.surfaceGrip<.9)&&speed>2){
  const alignment=(Number.isFinite(conditions.alignment)?conditions.alignment:22)*Math.max(.35,rubber)*c.surfaceGrip*(brake?.72:1);
  c.motionHeading=oldMotion+angleDiff(c.heading,oldMotion)*(1-Math.exp(-alignment*dt));
 }else c.motionHeading=c.heading;
 c.motionYawRate=angleDiff(c.motionHeading,oldMotion)/dt;
 // Impact rotation turns the chassis, not its world-space momentum. Tyre grip
 // damps the resulting lateral slip on subsequent ticks, without adding energy.
 if(impactMotion)setVelocity(c,impactMotion.x,impactMotion.z);
 c.sliding=(conditions.wetness>0||rubber<.9||duneSurface&&c.surfaceGrip<.9)&&speed>8&&Math.abs(angleDiff(c.heading,c.motionHeading))>.10||Math.hypot(c.impactVX,c.impactVZ)>1.2;
 c.x+=(Math.sin(c.motionHeading)*c.v*Math.cos(travelPitch)+c.impactVX)*dt;c.z+=(Math.cos(c.motionHeading)*c.v*Math.cos(travelPitch)+c.impactVZ)*dt;
 moveWithBarriers(c,track,previousPose);
 const near=nearest(track,c.x,c.z,c.s);c.lateral=near.offset;let delta=near.s-prev;if(delta>track.length/2)delta-=track.length;if(delta<-track.length/2)delta+=track.length;
 const plannedSurface=venueSurfaceAt&&near.distance>track.width/2?venueSurfaceAt(track,near.s,near.offset,conditions.wetness,c):null;
 // No teleports or shortcuts: progress advances only near the expected ribbon.
 if(Math.abs(delta)<40&&near.distance<Math.max(track.width/2+40,plannedSurface?.boundary??0)){c.s=near.s;c.progress+=delta;}
 if(tryPitEntry(c,track,prev)){updateLap(c,track,elapsed,laps);return;}
 const half=roadHalfWidth(track,near.s);
 if(near.distance>(plannedSurface?.trackLimit??(['my-1999','in-2011','qa-2004','sg-2008'].includes(track.id)?duneSurface.trackLimit:half+1.0))&&!isOnPitRoad(c,track)){if(!c.offtrack)c.offtrackTime=0;c.offtrack=true;c.offtrackTime+=dt;if(c.offtrackTime>.4&&!c.offtrackPenalty){const penaltySurface=plannedSurface??(track.id==='es-2026'?madridSurfaceAt(track,near.s,near.offset,conditions.wetness):track.id==='my-1999'?sepangSurfaceAt(track,near.s,near.offset,conditions.wetness):track.id==='in-2011'?buddhSurfaceAt(track,near.s,near.offset,conditions.wetness):track.id==='sg-2008'?singaporeSurfaceAt(track,near.s,near.offset,conditions.wetness):track.id==='qa-2004'?lusailSurfaceAt(track,near.s,near.offset,conditions.wetness):duneSurface);c.penalty+=penaltySurface?.paved||penaltySurface?.kind==='tarmac'?.5:1;c.offtrackPenalty=true;c.invalidLap=true;}}else{c.offtrack=false;c.offtrackPenalty=false;}
 if(near.distance>((plannedSurface??duneSurface)?(plannedSurface??duneSurface).boundary+3:half+24)){c.v*=Math.exp(-dt*4);const p=sample(track,c.s);c.x+=(p.x-c.x)*dt*.6;c.z+=(p.z-c.z)*dt*.6;}
 const surface=sample(track,c.s);
 const fall=clamp(near.distance-(half+6.5),0,1);
 if(plannedSurface){
  const elevation=track.id==='tr-2005'?istanbulSurfaceY:track.id==='pt-2008'?portimaoSurfaceY:paulRicardSurfaceY,ground=track.id==='tr-2005'?istanbulGround:track.id==='pt-2008'?portimaoGround:paulRicardGround;
  const runoffY=elevation(track,near.s,near.offset),blend=clamp((near.distance-plannedSurface.boundary)/22,0,1);
  c.y=runoffY*(1-blend)+(ground(track,c.x,c.z)+.34)*blend;c.pitch=surface.pitch;
 }else if(track.id==='es-2026'&&near.distance>half){
  const runoffY=madridSurfaceY(track,c.s,near.offset),boundary=duneSurface?.boundary??half+8;
  const blend=clamp((near.distance-boundary)/22,0,1);
  c.y=runoffY*(1-blend)+(madridGround(track,c.x,c.z)+.34)*blend;c.pitch=surface.pitch;
 }else if(track.id==='my-1999'||track.id==='in-2011'){const surfaceY=track.id==='my-1999'?sepangSurfaceY:buddhSurfaceY,ground=track.id==='my-1999'?sepangGround:buddhGround,runoffY=surfaceY(track,c.s,near.offset),blend=clamp((near.distance-(duneSurface?.boundary||half))/22,0,1);c.y=runoffY*(1-blend)+(ground(track,c.x,c.z)+.34)*blend;c.pitch=surface.pitch;}else if(track.id==='nl-1948'){const slope=sample(track,c.s,near.offset);const attitude=surfaceAttitude(slope,c.heading);c.y=slope.y;c.pitch=attitude.pitch;c.roll=attitude.roll;}else if(track.id==='qa-2004'){const runoffY=lusailSurfaceY(track,c.s,near.offset),blend=clamp((near.distance-(duneSurface?.boundary||half))/30,0,1);c.y=runoffY*(1-blend)+(lusailTerrainHeight(track,c.x,c.z)+.85)*blend;c.pitch=surface.pitch;}else if(track.id==='ae-2009'){const runoffY=yasmarinaSurfaceY(track,c.s,near.offset),blend=clamp((near.distance-(duneSurface?.boundary||half))/30,0,1);c.y=runoffY*(1-blend)+(yasmarinaTerrainHeight(track,c.x,c.z)+.85)*blend;c.pitch=surface.pitch;}else if(track.id==='ca-1978'){const runoffY=montrealSurfaceY(track,c.s,near.offset),blend=clamp((near.distance-(duneSurface?.boundary||half))/30,0,1);c.y=runoffY*(1-blend)+(montrealTerrainHeight(track,c.x,c.z)+.85)*blend;c.pitch=surface.pitch;}else if(track.id==='es-1991'){const runoffY=barcelonaSurfaceY(track,c.s,near.offset),blend=clamp((near.distance-(duneSurface?.boundary||half))/30,0,1);c.y=runoffY*(1-blend)+(barcelonaTerrainHeight(track,c.x,c.z)+.85)*blend;c.pitch=surface.pitch;}else if(track.id==='hu-1986'){const runoffY=hungaroringSurfaceY(track,c.s,near.offset),blend=clamp((near.distance-(duneSurface?.boundary||half))/30,0,1);c.y=runoffY*(1-blend)+(hungaroringTerrainHeight(track,c.x,c.z)+.85)*blend;c.pitch=surface.pitch;}else if(track.id==='it-1953'){const runoffY=imolaSurfaceY(track,c.s,near.offset),blend=clamp((near.distance-(duneSurface?.boundary||half))/30,0,1);c.y=runoffY*(1-blend)+(imolaTerrainHeight(track,c.x,c.z)+.85)*blend;c.pitch=surface.pitch;}else if(track.id==='at-1969'){const runoffY=redbullringSurfaceY(track,c.s,near.offset),blend=clamp((near.distance-(duneSurface?.boundary||half))/30,0,1);c.y=runoffY*(1-blend)+(redbullringTerrainHeight(track,c.x,c.z)+.85)*blend;c.pitch=surface.pitch;}else{c.y=fall?surface.y*(1-fall)+(terrainHeight(track,c.x,c.z)-.9)*fall:surface.y;c.pitch=surface.pitch;}
 wearTyres(c,track,dt,Math.hypot(c.x-previousPose.x,c.z-previousPose.z),boost);
 updateLap(c,track,elapsed,laps);
}
function updateLap(c,track,elapsed,laps){
 const completed=Math.max(0,Math.floor(c.progress/track.length));
 const lapProgress=c.progress-(c.lap-1)*track.length;
 if(c.sector===0&&lapProgress>track.length/3){c.sectors[0]=elapsed-c.lapStart;c.sector=1;}
 else if(c.sector===1&&lapProgress>track.length*2/3){c.sectors[1]=elapsed-c.lapStart-c.sectors[0];c.sector=2;}
 if(completed>=c.lap){
  c.sectors[2]=elapsed-c.lapStart-(c.sectors[0]||0)-(c.sectors[1]||0);
  const outLap=c.outLap;
  // The single qualifying outlap never enters lap history or the classification.
  if(!c.qualifying||!outLap){
   c.lastLap=elapsed-c.lapStart;c.lastLapValid=!c.invalidLap&&!outLap;
   if(c.lastLapValid){
    c.bestLap=c.bestLap?Math.min(c.bestLap,c.lastLap):c.lastLap;
    for(let i=0;i<3;i++)c.bestSectors[i]=c.bestSectors[i]?Math.min(c.bestSectors[i],c.sectors[i]):c.sectors[i];
   }
   c.lapHistory.push(c.lastLap);if(!c.lapValidHistory)c.lapValidHistory=[];c.lapValidHistory.push(c.lastLapValid);
   c.lastSectors=[...c.sectors];
  }
  c.outLap=false;c.lapStart=elapsed;c.lap=completed+1;c.sector=0;c.sectors=[];
  if(c.qualifying&&elapsed>=QUALIFYING_LIMIT)finishQualifyingCar(c,elapsed);
  else{
   c.invalidLap=false;
   if(c.qualifying){c.penalty=0;c.offtrackPenalty=false;c.offtrackTime=0;}
   if(!c.qualifying&&completed>=laps){c.finished=true;c.finishTime=elapsed+c.penalty;c.v=0;clearImpact(c);c.boostActive=false;c.sliding=false;c.motionYawRate=0;c.inputLag=0;}
  }
 }
}
export function draftStrength(c,cars){
 if(c.finished||c.retired||isInPit(c))return 0;
 let strength=0;
 for(const o of cars){
  if(c.id===o.id||o.retired||o.finished||isInPit(o))continue;
  const delta=o.progress-c.progress,dist=Math.hypot(o.x-c.x,o.z-c.z);
  if(delta>3&&delta<60&&dist<60&&Math.abs(dist-delta)<6)strength=Math.max(strength,1-delta/60);
 }
 return strength;
}
export function stepRace(cars,inputs,track,dt,elapsed,laps,stepDriver=stepCar){
 preparePitTraffic(cars,track);
 for(const c of cars){
  if(c.finished){c.slipstream=0;continue;}
  c.slipstream=draftStrength(c,cars);
  stepDriver(c,inputs[c.id]||{},track,dt,elapsed,laps);
 }
 resolveCarContacts(cars,null,{time:elapsed});
 for(const c of cars)resolveBarrierContacts(c,track);
}
export function standings(cars){return [...cars].sort((a,b)=>!!a.retired!==!!b.retired?(a.retired?1:-1):a.retired?b.progress-a.progress:a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:b.progress-a.progress);}
