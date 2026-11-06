// Search nearest positions first. A signed grid scan beginning at the far
// corner can move attractions unnecessarily even when nearby clear land exists.
export function nearestLandmarkOffsets(radius=80,step=8){const choices=[];for(let x=-radius;x<=radius;x+=step)for(let z=-radius;z<=radius;z+=step)if(Math.hypot(x,z)<=radius)choices.push({x,z,distance:Math.hypot(x,z)});return choices.sort((a,b)=>a.distance-b.distance||Math.abs(a.z)-Math.abs(b.z)||a.x-b.x);}
