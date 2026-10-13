// Full car footprint, including wings and tyres. Local +Z is the nose.
const HALF_WIDTH=1.24,HALF_LENGTH=2.6,CENTER_OFFSET=.3;
const dot=(a,b)=>a.x*b.x+a.z*b.z;
function body(c){const forward={x:Math.sin(c.heading),z:Math.cos(c.heading)},right={x:forward.z,z:-forward.x};return {forward,right,x:c.x+forward.x*CENTER_OFFSET,z:c.z+forward.z*CENTER_OFFSET};}
export function carContact(a,b){
 if(Math.abs(a.y-b.y)>1.5||Math.abs(a.x-b.x)>7||Math.abs(a.z-b.z)>7)return null;
 const A=body(a),B=body(b),delta={x:B.x-A.x,z:B.z-A.z};
 if(Math.hypot(delta.x,delta.z)>6)return null;
 let depth=Infinity,normal;
 for(const axis of [A.forward,A.right,B.forward,B.right]){
  const radius=p=>Math.abs(dot(axis,p.forward))*HALF_LENGTH+Math.abs(dot(axis,p.right))*HALF_WIDTH;
  const separation=dot(delta,axis),overlap=radius(A)+radius(B)-Math.abs(separation);
  if(overlap<=0)return null;
  if(overlap<depth){depth=overlap;const sign=separation<0?-1:1;normal={x:axis.x*sign,z:axis.z*sign};}
 }
 return {depth,normal};
}
export function resolveCarContacts(cars,movingId=null){
 let contacts=0;
 // Revisit adjacent pairs so a three-car pileup is separated as well.
 for(let pass=0;pass<4;pass++)for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){
  const a=cars[i],b=cars[j];if(movingId!==null&&a.id!==movingId&&b.id!==movingId)continue;
  if(a.retired||b.retired)continue;
  const hit=carContact(a,b);if(!hit)continue;
  const wa=a.finished?0:1,wb=b.finished?0:1,total=wa+wb;if(!total)continue;
  const {normal:n,depth}=hit,push=depth+.001;
  a.x-=n.x*push*wa/total;a.z-=n.z*push*wa/total;b.x+=n.x*push*wb/total;b.z+=n.z*push*wb/total;
  // Inelastic impact: remove closing speed rather than letting a faster car
  // drive through the one ahead. Cars keep their heading and manual steering.
  const ah=a.motionHeading??a.heading,bh=b.motionHeading??b.heading,af={x:Math.sin(ah),z:Math.cos(ah)},bf={x:Math.sin(bh),z:Math.cos(bh)};
  const an=dot(af,n),bn=dot(bf,n),closing=a.v*an-b.v*bn;
  if(closing>0){const impulse=closing/total;a.v=Math.max(-12,Math.min(102,a.v-impulse*an*wa));b.v=Math.max(-12,Math.min(102,b.v+impulse*bn*wb));}
  contacts++;
 }
 return contacts;
}
