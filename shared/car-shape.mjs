// Ground-plane dimensions of the rendered car in scene.makeCar(). Local +Z is
// forward. Empty space beside the nose/wings is deliberately not solid.
export const CAR_SHAPE=[
 {x:0,z:.05,halfWidth:.9,halfLength:2.2},
 {x:0,z:-.4,halfWidth:.98,halfLength:.94},
 {x:0,z:2.4,halfWidth:1.025,halfLength:.275},
 {x:0,z:-1.8,halfWidth:.925,halfLength:.315},
 ...[-1.05,1.05].flatMap(x=>[-1.2,1.45].map(z=>({x,z,halfWidth:.18,halfLength:.385,steered:z>0})))
];
export const CONTACT_SLOP=.002;
export function carShapes(car){
 const h=car.heading,forward={x:Math.sin(h),z:Math.cos(h)},right={x:forward.z,z:-forward.x};
 return CAR_SHAPE.map(part=>{const angle=h+(part.steered?(car.steer||0)*.6:0),f={x:Math.sin(angle),z:Math.cos(angle)};return {x:car.x+right.x*part.x+forward.x*part.z,z:car.z+right.z*part.x+forward.z*part.z,forward:f,right:{x:f.z,z:-f.x},halfWidth:part.halfWidth,halfLength:part.halfLength};});
}
