// Full oriented footprint, including wings and tyres. Local +Z is the nose.
const HALF_WIDTH=1.24,HALF_LENGTH=2.6,CENTER_OFFSET=.3;
const dot=(a,b)=>a.x*b.x+a.z*b.z;
function body(c){const forward={x:Math.sin(c.heading),z:Math.cos(c.heading)},right={x:forward.z,z:-forward.x};return {forward,right,x:c.x+forward.x*CENTER_OFFSET,z:c.z+forward.z*CENTER_OFFSET};}
export function carContact(a,b){
 if(a.finished||b.finished||a.retired||b.retired)return null;
 if(Math.abs(a.y-b.y)>1.5||Math.abs(a.x-b.x)>7||Math.abs(a.z-b.z)>7)return null;
 const A=body(a),B=body(b),delta={x:B.x-A.x,z:B.z-A.z};if(Math.hypot(delta.x,delta.z)>6)return null;
 let depth=Infinity,normal;
 for(const axis of [A.forward,A.right,B.forward,B.right]){
  const radius=p=>Math.abs(dot(axis,p.forward))*HALF_LENGTH+Math.abs(dot(axis,p.right))*HALF_WIDTH,separation=dot(delta,axis),overlap=radius(A)+radius(B)-Math.abs(separation);
  if(overlap<=0)return null;
  if(overlap<depth){depth=overlap;const sign=separation<0?-1:1;normal={x:axis.x*sign,z:axis.z*sign};}
 }
 return {depth,normal};
}
function nearbyPairs(cars,movingId){
 const grid=new Map(),pairs=[];
 for(let i=0;i<cars.length;i++){const c=cars[i];if(c.retired||c.finished)continue;const x=Math.floor(c.x/8),z=Math.floor(c.z/8);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const j of grid.get(`${x+dx},${z+dz}`)||[])if(movingId===null||c.id===movingId||cars[j].id===movingId)pairs.push([j,i]);const key=`${x},${z}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);}
 return pairs;
}
export function resolveCarContacts(cars,movingId=null,{impulses=true,maxCorrection=.8}={}){
 let contacts=0;const pairs=nearbyPairs(cars,movingId);
 for(let pass=0;pass<4;pass++){
  let touched=false;
  for(const [i,j] of pairs){
   const a=cars[i],b=cars[j],hit=carContact(a,b);if(!hit)continue;
   const wa=a.finished?0:1,wb=b.finished?0:1,total=wa+wb;if(!total)continue;
   const {normal:n,depth}=hit,push=Math.min(depth+.001,maxCorrection);touched=true;
   a.x-=n.x*push*wa/total;a.z-=n.z*push*wa/total;b.x+=n.x*push*wb/total;b.z+=n.z*push*wb/total;
   if(impulses){
    const ah=a.motionHeading??a.heading,bh=b.motionHeading??b.heading,af={x:Math.sin(ah),z:Math.cos(ah)},bf={x:Math.sin(bh),z:Math.cos(bh)},an=dot(af,n),bn=dot(bf,n),closing=(wa?a.v:0)*an-(wb?b.v:0)*bn;
    // Effective mass depends on impact angle. A glancing touch removes closing
    // speed rather than braking both drivers as if it were a head-on impact.
    if(closing>0){const mass=wa*an*an+wb*bn*bn;if(mass>.001){const impulse=Math.min(30,closing/mass);a.v=Math.max(-12,Math.min(115,a.v-impulse*an*wa));b.v=Math.max(-12,Math.min(115,b.v+impulse*bn*wb));}}
   }
   contacts++;
  }
  if(!touched)break;
 }
 return contacts;
}
