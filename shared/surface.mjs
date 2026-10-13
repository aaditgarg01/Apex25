import {angleDiff,terrainHeight,wrap} from './tracks.mjs';

// An offset beyond the inside bend radius folds a strip back across the road.
// Use the tightest nearby radius to keep barriers and runoff ordered at hairpins.
export function ribbonOffset(track,index,offset){
 let limit=Math.min(Math.abs(offset),track.id==='mc-1929'||track.campus?track.width/2+.8:Infinity);
 for(let d=-3;d<=3;d++){
  const i=wrap(index+d,track.points.length),a=track.points[i],b=track.points[(i+1)%track.points.length];
  const curvature=angleDiff(b.heading,a.heading)/track.step;
  if(curvature*offset>0)limit=Math.min(limit,.8/Math.abs(curvature));
 }
 return Math.sign(offset)*limit;
}

// A coarse terrain triangle can bridge across the two different heights of a
// hairpin. Lower its vertices beneath every road sample that triangle can reach.
export function terrainVertexHeight(track,x,z,cellSize){
 let height=terrainHeight(track,x,z)-.9;
 if(track.id!=='mc-1929'&&!track.campus)return height;
 const radius=track.width/2+Math.SQRT2*cellSize+track.step;
 for(const p of track.points)if((p.x-x)**2+(p.z-z)**2<radius*radius)height=Math.min(height,p.y-.9);
 return height;
}
