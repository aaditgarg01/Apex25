import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{makeTracks,sample}from'../shared/tracks.mjs';import{ribbonOffset,terrainVertexHeight}from'../shared/surface.mjs';
const t=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url)))).find(t=>t.id==='mc-1929');
test('terrain cells around the entire Monaco hairpin stay below both road branches',()=>{
 for(let s=1130;s<=1450;s+=4)for(const offset of [-5.5,0,5.5]){
  const p=sample(t,s,offset),x=Math.floor(p.x/8)*8,z=Math.floor(p.z/8)*8;
  for(const [dx,dz]of[[0,0],[8,0],[0,8],[8,8]])assert(terrainVertexHeight(t,x+dx,z+dz,8)<p.y-.5,`terrain covers road at ${s}m`);
 }
});
test('hairpin shoulders and barriers remain outside the driving width without folding inward',()=>{
 for(let s=1130;s<=1450;s+=2){const i=Math.floor(s/t.step);
  for(const side of [-1,1]){
   assert.equal(ribbonOffset(t,i,side*t.width/2),side*t.width/2,'preserve full asphalt width');
   const widths=[6.5,6.7,7,8,10,14].map(w=>Math.abs(ribbonOffset(t,i,side*w)));
   assert(widths.every((v,i)=>v>=6.5&&v<=7.3&&(!i||v>=widths[i-1])),'ordered compact street-circuit verge');
  }
 }
});
