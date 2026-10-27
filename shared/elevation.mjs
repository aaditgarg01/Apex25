// Spa anchors transcribed from the circuit's 2026 official access/track map.
// https://www.spa-francorchamps.be/assets/e70cff50-ae5d-4aaa-896b-54c8a953a357/all-plan-acces.pdf
export const SPA_ALTITUDES=[[0,418],[220,424],[310,419],[690,403],[890,391],[1130,415],[1490,446],[2200,463],[2470,470],[2870,455],[3110,438],[3600,402],[4280,377],[4740,375],[5100,373],[5700,388],[6000,398],[6540,408],[7004,418]];
// Periodic, shape-preserving cubic interpolation keeps crests smooth without
// overshooting surveyed anchors or introducing steps at the start/finish.
export function interpolateProfile(anchors,s){
 const length=anchors.at(-1)[0];s=((s%length)+length)%length;let i=0;while(i<anchors.length-2&&anchors[i+1][0]<s)i++;
 const secant=(j)=>{const a=anchors[j],b=anchors[j+1];return(b[1]-a[1])/(b[0]-a[0]);};
 const tangent=j=>{const last=anchors.length-1,prev=j===0?last-1:j-1,next=j===last?0:j,d0=secant(prev),d1=secant(next);if(d0*d1<=0)return 0;const h0=anchors[prev+1][0]-anchors[prev][0],h1=anchors[next+1][0]-anchors[next][0];return(3*(h0+h1))/((2*h1+h0)/d0+(h1+2*h0)/d1);};
 const [x0,y0]=anchors[i],[x1,y1]=anchors[i+1],h=x1-x0,t=(s-x0)/h,t2=t*t,t3=t2*t;
 return (2*t3-3*t2+1)*y0+(t3-2*t2+t)*h*tangent(i)+(-2*t3+3*t2)*y1+(t3-t2)*h*tangent(i+1);
}
export function applyElevation(id,points,length,elevations){
 let profile=elevations?.[id]?.anchors,source=elevations?.[id]?.source||'Flat fallback';
 if(id==='be-1925'){// Two shaping points concentrate the climb between published markers,
 // approximating Raidillon's steep ramp without changing measured endpoints.
 profile=[...SPA_ALTITUDES,[990,396.5],[1080,409.7]].sort((a,b)=>a[0]-b[0]).map(([s,y])=>[s/7004*length,y]);source='Official Spa altitude markers · interpolated';}
 else if(profile){profile=profile.map(([t,y])=>[t*length,y]);}
 if(!profile||profile.length<4)return {source,min:0,max:0,range:0};
 // Coarse 90 m terrain includes buildings/trees. Reduce that relief for Mexico's near-flat racing surface.
 if(id==='mx-1962'){const mean=profile.reduce((sum,p)=>sum+p[1],0)/profile.length;profile=profile.map(([s,y])=>[s,2240+(y-mean)*.16]);source='Near-flat race-surface blockout · reduced coarse terrain relief';}
 const base=Math.min(...profile.map(p=>p[1]));for(let i=0;i<points.length;i++)points[i].y=interpolateProfile(profile,i/points.length*length)-base;
 return {source,min:base,max:Math.max(...profile.map(p=>p[1])),range:Math.max(...profile.map(p=>p[1]))-base};
}
