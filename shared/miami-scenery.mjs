import {sample,terrainHeight} from './tracks.mjs';
import {pitLayout,pitRoadPose} from './pit-layout.mjs';
import {miamiBoundaries} from './miami.mjs';
import {interlagosPlanner,localInterlagos} from './interlagos-scenery.mjs';
const cache=new WeakMap();
export function miamiTerrainHeight(track,x,z,cell=18){
 // Preserve every cached driving elevation; only surrounding parking-lot terrain changes.
 let y=terrainHeight(track,x,z)-.85;const rows=miamiBoundaries(track),pad=Math.SQRT2*cell+track.step;
 for(let i=0;i<track.points.length;i+=2){const p=track.points[i],dx=x-p.x,dz=z-p.z,along=dx*Math.sin(p.heading)+dz*Math.cos(p.heading),across=dx*Math.cos(p.heading)-dz*Math.sin(p.heading);if(Math.abs(along)<pad&&across>-rows[-1][i].offset-pad&&across<rows[1][i].offset+pad)y=Math.min(y,p.y-.85);}
 return y;
}
export function planMiami(track,data){
 if(cache.has(track))return cache.get(track);const planner=interlagosPlanner(track),stadium={...data.stadium,id:'stadium',kind:'stadium',margin:3};
 let stadiumSite=planner.reserve(stadium);
 // If a new source footprint intersects a road, inset the entire stadium model.
 for(let shrink=.96;!stadiumSite&&shrink>=.76;shrink-=.04)stadiumSite=planner.reserve({...stadium,w:stadium.w*shrink,d:stadium.d*shrink,approximateInset:true});
 const pit=pitLayout(track),box=pitRoadPose(track,pit.box),w=28,d=Math.min(320,pit.length-2*pit.taper-20),nx=Math.cos(pit.frame.heading),nz=-Math.sin(pit.frame.heading);
 for(let extra=0;extra<150;extra+=6){const offset=pit.side*(pit.width/2+w/2+5+extra);if(planner.reserve({id:'pits',kind:'pits',x:box.x+nx*offset,z:box.z+nz*offset,y:box.y-.15,w,d,heading:pit.frame.heading,side:pit.side,margin:4}))break;}
 const marinaOrigin=localInterlagos(track,data.marina.location);let marina=null;
 search:for(const scale of [1,.92,.84,.76,.68])for(const shiftZ of [0,-10,10,-20,20])for(const shiftX of [0,-10,10,-20,20]){marina=planner.reserve({...data.marina,x:marinaOrigin.x+shiftX,z:marinaOrigin.z+shiftZ,id:'marina',kind:'marina',w:data.marina.w*scale,d:data.marina.d*scale,heading:0,margin:5});if(marina)break search;}
 if(!marina)planner.rejected.push('marina');
 for(const stand of data.stands)planner.roadside({...stand,kind:'stand',margin:12});
 for(const [i,s]of [70,760,1700,3080,5070].entries())planner.roadside({id:'hospitality-'+i,kind:'hospitality',s,side:i%2?1:-1,w:24,d:60,margin:15});
 for(let i=0;i<10;i++)planner.roadside({id:'official-'+i,kind:'official',s:150+i*track.length/10,side:i%2?1:-1,w:i%3===0?22:9,d:16,margin:10,crane:i%3===0});
 for(const corner of [290,2980,4760])for(const distance of [150,100,50])planner.roadside({id:'distance-'+corner+'-'+distance,kind:'board',s:corner-distance,side:corner===290?1:-1,w:2,d:1.2,margin:3,label:String(distance)});
 for(let i=0;i<11;i++)planner.roadside({id:'banner-'+i,kind:'banner',s:160+i*track.length/11,side:i%2?1:-1,w:1.2,d:17,margin:7,label:['APEX COAST','PALM RACING','AQUA ENERGY','SUNSHINE CLUB'][i%4]});
 for(const [i,s]of [950,2300,3700].entries())planner.roadside({id:'parking-'+i,kind:'parking',s,side:i%2?1:-1,w:100,d:150,margin:20});
 const palms=[];for(let i=0;i<740;i++){const s=(i*.61803398875%1)*track.length,p=sample(track,s,(i%2?1:-1)*(27+i%29*4)),scale=.82+i%6*.095,site=planner.reserve({id:'palm-'+i,kind:'palm',...p,w:11*scale,d:11*scale,heading:i*1.4,scale,margin:8});if(site){site.y=miamiTerrainHeight(track,site.x,site.z);palms.push(site);}}
 for(let i=0;i<45;i++){const a=i*2.39996,r=1150+i%4*90,x=Math.sin(a)*r,z=Math.cos(a)*r*.7,site=planner.reserve({id:'building-'+i,kind:'building',x,z,w:36+i%4*5,d:30,heading:.2,height:i%17===0?35:6+i%5*2,margin:20});if(site)site.y=miamiTerrainHeight(track,x,z);}
 // Only the high deck spans the circuit. Reserve each complete support footprint
 // against every road branch; keep deck underside well above every covered branch.
 const overpass=data.overpass,road=sample(track,overpass.s),heading=overpass.heading,rx=Math.cos(heading),rz=-Math.sin(heading),fx=Math.sin(heading),fz=Math.cos(heading),supports=[];
 for(const side of [-1,1]){let support=null;for(let offset=75;offset<=190;offset+=8){support=planner.reserve({id:'overpass-pier-'+side,kind:'overpass-pier',x:road.x+rx*side*offset,z:road.z+rz*side*offset,w:6,d:overpass.width+2,heading,margin:8});if(support)break;}if(support)supports.push(support);}
 let bridge=null;if(supports.length===2){const deckY=Math.max(...track.points.filter(p=>Math.abs((p.x-road.x)*fx+(p.z-road.z)*fz)<overpass.width+10&&Math.abs((p.x-road.x)*rx+(p.z-road.z)*rz)<220).map(p=>p.y),road.y)+overpass.clearance;bridge={...road,heading,deckY,width:overpass.width,supports,length:Math.hypot(supports[0].x-supports[1].x,supports[0].z-supports[1].z)};}
 const result={...planner,pit,stadium:stadiumSite,marina,palms,bridge};cache.set(track,result);return result;
}
