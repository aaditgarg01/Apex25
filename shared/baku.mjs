// One corridor definition drives Baku's asphalt, paint, fences and driving limits.
// Opposite-direction streets share a narrow boulevard; their verges cannot be
// generated independently at the full default circuit width.
const cache=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function bakuLayout(track){
 if(cache.has(track))return cache.get(track);
 const n=track.points.length,half=new Float64Array(n),nominal=track.width/2;
 for(let i=0;i<n;i++){
  const p=track.points[i],s=i*track.step,castle=smooth((s-2420)/120)*(1-smooth((s-2730)/140));
  let width=nominal+(3.5-nominal)*castle;
  for(let j=0;j<n;j++){
   if(Math.min(Math.abs(j-i),n-Math.abs(j-i))*track.step<100)continue;
   const q=track.points[j],dx=p.x-q.x,dz=p.z-q.z,d2=dx*dx+dz*dz;
   // Reserve a separate wall/fence corridor for both nearby road branches.
   if(d2<2500)width=Math.min(width,Math.sqrt(d2)*.40);
  }
  half[i]=Math.max(3.5,width);
 }
 // Expand narrow transitions upstream/downstream without widening a pinch point.
 for(let pass=0;pass<2;pass++)for(let i=0;i<n;i++){const j=pass?n-1-i:i;half[j]=Math.min(half[j],half[(j+n-1)%n]+track.step*.045,half[(j+1)%n]+track.step*.045);}
 const data={half};cache.set(track,data);return data;
}
export function roadHalfWidth(track,s){
 if(track.id!=='az-2016')return track.width/2;
 const f=((s%track.length)+track.length)%track.length/track.step,i=Math.floor(f),t=f-i,h=bakuLayout(track).half;
 return h[i]*(1-t)+h[(i+1)%h.length]*t;
}
export function bakuRibbonOffset(track,index,offset){
 const n=track.points.length,i=((index%n)+n)%n,half=bakuLayout(track).half[i],nominal=track.width/2;
 const extra=Math.max(0,Math.abs(offset)-nominal),distance=Math.abs(offset)<=nominal?Math.abs(offset)*half/nominal:half+Math.min(extra,.8);
 let scale=1;
 for(let d=-3;d<=3;d++){const j=(i+d+n)%n,k=angle(track.points[(j+1)%n].heading,track.points[j].heading)/track.step;if(k*offset>0)scale=Math.min(scale,.78/(Math.abs(k)*(half+.8)));}
 return Math.sign(offset)*distance*scale;
}
