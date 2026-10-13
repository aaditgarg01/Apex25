// With the car facing +Z, screen right points toward -X in Three.js.
// Physics yaw stays in world coordinates; convert all driver inputs here.
export function steeringInput(keys,axis=0){
 if(Number.isFinite(axis)&&Math.abs(axis)>.12)return -Math.max(-1,Math.min(1,axis));
 return (keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
}
