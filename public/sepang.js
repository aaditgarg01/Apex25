import * as THREE from '/vendor/three.module.js';
import {sepangGround, sepangRoads, sepangRoadClear, sepangRunoff, sepangRunoffClear} from '/shared/sepang.mjs';
import {SEPANG_CORNERS, SEPANG_SECTORS} from './data/sepang-runoff.js';
import {sample} from '/shared/tracks.mjs';
import {planSepang} from './sepang-placement.js';
import {addPermanentVenue} from './permanent-venue.js';
import {drawSepangRoof, drawSepangLandmark} from './sepang-roofs.js';
import {createSepangWeather} from './sepang-weather.js';

function paintFlag(ctx) {
  for(let i=0;i<14;i++){
    ctx.fillStyle=i%2?'#f4f1e6':'#c93047';
    ctx.fillRect(0,i*120/14,192,120/14+.6);
  }
  ctx.fillStyle='#243f81';
  ctx.fillRect(0,0,105,68);
  ctx.fillStyle='#f3c649';
  ctx.beginPath();ctx.arc(38,34,23,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#243f81';
  ctx.beginPath();ctx.arc(47,31,19,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f3c649';
  ctx.beginPath();
  for(let i=0;i<28;i++){
    const angle=i*Math.PI/14,r=i%2?7:17;
    ctx.lineTo(74+Math.sin(angle)*r,34-Math.cos(angle)*r);
  }
  ctx.closePath();ctx.fill();
}

function addWater(scene, track, plan) {
  const positions = [];
  function put(p) {positions.push(p.x,sepangGround(track,p.x,p.z,18)+.18,p.z);}
  for(const {polygon} of plan.water){
    if(!sepangRoadClear(track,polygon)||!sepangRunoffClear(track,polygon))continue;
    const points=polygon.map(p=>new THREE.Vector2(p.x,p.z));
    for(const tri of THREE.ShapeUtils.triangulateShape(points,[]))for(const index of tri)put(polygon[index]);
  }
  for(const {polygon} of plan.canals)for(const index of [0,1,3,3,1,2])put(polygon[index]);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  const water=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({
    color:'#648281',roughness:.29,metalness:.21,clearcoat:.75,side:THREE.DoubleSide
  }));
  scene.group.add(water);
}

function addSurfaceDressing(root, track, bands) {
  const positions = [], colors = [], color = new THREE.Color();
  function triangle(a, b, c, tint) {
    color.set(tint);
    for (const point of [a, b, c]) {
      positions.push(point.x, point.y + .105, point.z);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (const {turn, station, side, gravel} of SEPANG_CORNERS) {
    for (let i = 0; i < 34; i++) {
      const s = station - 66 + i * 2.83;
      const edge = side * (track.width / 2 - .35 - (i % 9) * .105);
      const grain = i % 3 === 0 && gravel ? '#ad8b71' : '#38332d';
      triangle(sample(track, s, edge), sample(track, s + .21, edge - side * .055),
        sample(track, s + .07, edge + side * .13), grain);
    }
    if (![1, 4, 9, 14, 15].includes(turn)) continue;
    for (const offset of [-1.01, .87, 1.08]) for (let i = 0; i < 13; i++) {
      const s = station - 48 + i * 2.15, across = offset + side * (i / 13) ** 2 * 1.8;
      const a = sample(track, s, across), b = sample(track, s, across + .13);
      const c = sample(track, s + 2.15, across + .07 * side), d = sample(track, s + 2.15, across + .13 + .07 * side);
      const tint = i < 3 ? '#686159' : '#433f39';
      triangle(a, b, c, tint);
      triangle(b, d, c, tint);
    }
  }
  for (const [i, band] of bands.entries()) {
    if (band.kind !== 'tarmac' || !band.turn || i % 23 !== 0) continue;
    const [a, b, c, d] = band.polygon;
    const at = (u, v) => Object.fromEntries(['x', 'y', 'z'].map(axis => [axis,
      (a[axis] * (1 - u) + b[axis] * u) * (1 - v) + (d[axis] * (1 - u) + c[axis] * u) * v - (axis === 'y' ? .08 : 0)]));
    triangle(at(.18, .6), at(.86, .67), at(.72, .73), '#ac8063');
    triangle(at(.18, .45), at(.91, .51), at(.82, .545), '#67635c');
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: .27, depthWrite: false, side: THREE.DoubleSide
  })));
}

function addAircraft(root) {
  const model = new THREE.Group(), material = new THREE.MeshStandardMaterial({color:'#e8e3d4',roughness:.9});
  for(const [w,h,d,x,y,z] of [[3.1,3.3,33,0,0,0],[29,.64,4.9,0,0,-2.1],
    [10,.58,2.8,0,.8,-12.2],[.52,3.8,5,0,2,-13]]){
    const part=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    part.position.set(x,y,z);model.add(part);
  }
  model.rotation.y=-1.4;
  model.position.set(1000,135,-1650);
  root.add(model);
  return model;
}

export function addSepang(scene,track) {
  const root=scene.group,plan=planSepang(track);
  const {crowd,batch}=addPermanentVenue(scene,track,{
    prefix:'sepang',plan,ground:sepangGround,roads:sepangRoads,roadClear:sepangRoadClear,
    runoff:sepangRunoff,sectors:SEPANG_SECTORS,detection:[3621,4910],title:'MALAYSIA',
    crowdColors:['#dc6853','#e4d49e','#306da5','#779254','#e8e6df','#6a526f','#e39040'],
    crowdLimit:9000,paintFlag,drawRoof:drawSepangRoof,drawLandmark:drawSepangLandmark,tropical:true
  });
  addWater(scene,track,plan);
  const {bands} = sepangRunoff(track);
  addSurfaceDressing(root, track, bands);
  const aircraft=addAircraft(root);
  const shelters=crowd.filter((_,i)=>i%11===0).map((p,i)=>({...p,tint:['#4a6981','#9d474e','#637d56','#e2d3a0'][i%4]}));
  const umbrella=new THREE.ConeGeometry(.57,.34,8);
  const umbrellas=batch(umbrella,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.82}),shelters,
    (p,o)=>{o.position.y+=1.04;});
  for(const mesh of umbrellas)mesh.visible=false;
  const venue=scene.environmentFx,weather=createSepangWeather(scene,track,bands,umbrellas);
  scene.environmentFx={
    setConditions(wet){venue.setConditions(wet);weather.setConditions(wet);},
    frame(now,cars){
      venue.frame(now,cars);
      weather.frame(now);
      const progress=(now%85000)/85000;
      aircraft.position.set(1320-progress*2480,170-progress*63,-1540+progress*305);
    },
    dispose(){venue.dispose();weather.dispose();}
  };
  root.userData.sepangBudget.umbrellas=shelters.length;
}
