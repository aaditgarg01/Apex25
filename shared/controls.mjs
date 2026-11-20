// With the car facing +Z, screen right points toward -X in Three.js.
// Physics yaw stays in world coordinates; convert all driver inputs here.
export function steeringInput(keys,axis=0){
 if(Number.isFinite(axis)&&Math.abs(axis)>.12)return -Math.max(-1,Math.min(1,axis));
 return (keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
}

// An idle/unused controller must not inject stick drift into a keyboard drive.
export class DriverControls {
 constructor(){this.source='keyboard';}
 read(keys,gamepad){
  const keyboard=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].some(key=>keys.has(key));
  if(keyboard||gamepad?.connected===false)this.source='keyboard';
  else if(gamepad?.buttons?.some(button=>button?.pressed))this.source='gamepad';
  const pad=this.source==='gamepad'?gamepad:null;
  return {source:this.source,steer:steeringInput(keys,pad?.axes?.[0]??0),throttle:keys.has('ArrowUp')||keys.has('KeyW')||(pad?.buttons?.[7]?.value??0)>.2,brake:keys.has('ArrowDown')||keys.has('KeyS')||(pad?.buttons?.[6]?.value??0)>.2,boost:keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('Space')||!!pad?.buttons?.[0]?.pressed};
 }
}
