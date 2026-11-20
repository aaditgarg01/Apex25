// A local, bounded trace. It never sends room credentials or telemetry anywhere.
const fields=['x','y','z','heading','motionHeading','v','steer','s','lateral','progress','impactVX','impactVZ','impactYaw','offtrack','ai','pitState','inputAck','inputEpoch','inputAppliedAt','contactSequence','lastContactAt','lastContactSeverity'];
const motion=car=>car?Object.fromEntries(fields.filter(key=>car[key]!==undefined).map(key=>[key,car[key]])):null;
export class DrivingReport {
 constructor(){this.reset();}
 reset(){this.samples=[];this.lastAt=-Infinity;}
 record(now,track,session,control,authority,shown,tracking){
  if(now-this.lastAt<100||!authority||!tracking)return;this.lastAt=now;
  this.samples.push({at:Math.round(now),track:track.id,phase:session.phase,elapsed:session.elapsed,input:{steer:control.steer,throttle:control.throttle,brake:control.brake,boost:control.boost,park:!!control.park,source:control.source},authority:motion(authority),predicted:motion(tracking.local),shown:motion(shown),reconciliation:tracking.reconciliation?{...tracking.reconciliation}:null,latencyMs:tracking.rtt,bufferMs:tracking.delay});
  if(this.samples.length>450)this.samples.shift();
 }
 download(){
  const blob=new Blob([JSON.stringify({schema:'apex25-driving-report-v1',version:'2.65.4',createdAt:new Date().toISOString(),notes:'Local last-45-second driving trace; no room credentials. Authority and predicted/shown positions use different clocks.',samples:this.samples},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='apex25-driving-report.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
}
