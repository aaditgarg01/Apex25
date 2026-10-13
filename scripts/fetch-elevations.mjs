import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {makeTracks,sample} from '../shared/tracks.mjs';
const file=new URL('../public/data/elevations.json',import.meta.url),geo=JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url)));let result={};try{result=JSON.parse(await readFile(file));}catch{}
for(const track of makeTracks(geo)){
 if(track.id==='be-1925'||result[track.id])continue;
 const locations=Array.from({length:96},(_,i)=>{const p=sample(track,i/96*track.length);return `${(track.origin.lat-p.z/111320).toFixed(6)},${(track.origin.lon+p.x/(111320*Math.cos(track.origin.lat*Math.PI/180))).toFixed(6)}`;}).join('|');
 try{const raw=execFileSync('curl',['-fsS','--max-time','25','--get','--data-urlencode','locations='+locations,'https://api.opentopodata.org/v1/srtm90m'],{maxBuffer:2000000});const data=JSON.parse(raw);if(data.status!=='OK'||data.results.some(r=>!Number.isFinite(r.elevation)))throw new Error('missing elevation');let ys=data.results.map(r=>r.elevation);for(let k=0;k<2;k++)ys=ys.map((y,i)=>(ys[(i+95)%96]+y*6+ys[(i+1)%96])/8);result[track.id]={source:'SRTM 90m via Open Topo Data · smoothed',retrieved:'2026-10-09',anchors:[...ys.map((y,i)=>[i/96,Math.round(y*100)/100]),[1,Math.round(ys[0]*100)/100]]};await writeFile(file,JSON.stringify(result));console.log(track.city,Math.round(Math.max(...ys)-Math.min(...ys))+'m range');}catch(e){console.log(track.city,'unavailable:',e.message.slice(0,70));}await new Promise(r=>setTimeout(r,1100));
}
