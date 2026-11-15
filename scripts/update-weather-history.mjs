// Offline research importer. Never imported by the game or run during a build.
// node scripts/update-weather-history.mjs [cache directory]
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {makeTracks} from '../shared/tracks.mjs';
const root=new URL('../',import.meta.url),cache=resolve(process.argv[2]||'.weather-research-cache');
await mkdir(cache,{recursive:true});
async function load(endpoint,query,name){
 const file=resolve(cache,name+'.json');try{return JSON.parse(await readFile(file,'utf8'));}catch{}
 const response=await fetch('https://api.openf1.org/v1/'+endpoint+'?'+query,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('OpenF1 '+response.status+' for '+name);
 const data=await response.json();await writeFile(file,JSON.stringify(data));await new Promise(r=>setTimeout(r,2100));return data;
}
const sessions=(await load('sessions','year=2023&year=2024&year=2025&session_name=Race','sessions')).filter(s=>!s.is_cancelled);
const records={};for(const endpoint of ['weather','stints']){records[endpoint]=[];for(let i=0;i<sessions.length;i+=12)records[endpoint].push(...await load(endpoint,sessions.slice(i,i+12).map(s=>'session_key='+s.session_key).join('&'),endpoint+'-'+i/12));}
const ids={'Melbourne':'au-1953','Shanghai':'cn-2004','Suzuka':'jp-1962','Sakhir':'bh-2002','Jeddah':'sa-2021','Miami':'us-2022','Imola':'it-1953','Monte Carlo':'mc-1929','Catalunya':'es-1991','Montreal':'ca-1978','Spielberg':'at-1969','Silverstone':'gb-1948','Spa-Francorchamps':'be-1925','Hungaroring':'hu-1986','Zandvoort':'nl-1948','Monza':'it-1922','Baku':'az-2016','Singapore':'sg-2008','Austin':'us-2012','Mexico City':'mx-1962','Interlagos':'br-1940','Las Vegas':'us-2023','Lusail':'qa-2004','Yas Marina Circuit':'ae-2009'};
const group=rows=>{const result=new Map();for(const row of rows){const list=result.get(row.session_key)||[];list.push(row);result.set(row.session_key,list);}return result;},stints=group(records.stints),weather=group(records.weather);
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length?sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2:null;};
const races=[];
for(const session of sessions){
 const rows=(stints.get(session.session_key)||[]).filter(r=>Number.isInteger(r.lap_start)&&Number.isInteger(r.lap_end)),laps=Math.max(0,...rows.map(r=>r.lap_end)),samples=(weather.get(session.session_key)||[]).filter(r=>r.date>=session.date_start&&r.date<=session.date_end),phases=[];
 if(!laps||!samples.length)throw Error('Missing historical coverage for session '+session.session_key);
 for(let lap=1;lap<=laps;lap++){
  // One compound per driver; tiny one-car experiments cannot change the regime.
  const active=new Map();for(const row of rows)if(row.lap_start<=lap&&row.lap_end>=lap&&['SOFT','MEDIUM','HARD','INTERMEDIATE','WET'].includes(row.compound))active.set(row.driver_number,row.compound);
  const compounds=[...active.values()],heavy=compounds.filter(id=>id==='WET').length,wet=compounds.filter(id=>id==='WET'||id==='INTERMEDIATE').length;
  const condition=compounds.length&&heavy/compounds.length>=.35?'wet':compounds.length&&wet/compounds.length>=.35?'intermediate':'normal';
  const previous=phases.at(-1);if(previous?.condition===condition)previous.laps++;else phases.push({condition,from:lap,laps:1});
 }
 const id=ids[session.circuit_short_name];if(!id)throw Error('Map missing for '+session.circuit_short_name);
 races.push({trackId:id,year:session.year,sessionKey:session.session_key,date:session.date_start.slice(0,10),laps,rainSamples:samples.filter(r=>r.rainfall>0).length,weatherSamples:samples.length,phases});
}
const legacy=JSON.parse(await readFile(new URL('public/data/weather-legacy-references.json',root),'utf8'));
const tracks=makeTracks(JSON.parse(await readFile(new URL('public/data/circuits.geojson',root),'utf8')),JSON.parse(await readFile(new URL('public/data/elevations.json',root),'utf8'))),profiles={};
for(const track of tracks){
 const history=races.filter(r=>r.trackId===track.id),wet=history.filter(r=>r.phases.some(p=>p.condition!=='normal')),persistent=wet.flatMap(r=>r.phases.filter(p=>p.condition!=='normal'&&p.laps>=3).map(p=>p.laps));
 const previous=legacy[track.id],referenceLaps=median(history.map(r=>r.laps))||previous?.referenceLaps||Math.max(40,Math.round(305000/track.officialLength));
 const minStableLaps=history.length?Math.max(10,Math.min(20,Math.round(persistent.length?median(persistent)*.65:referenceLaps*.25))):previous?.minStableLaps||16;
 profiles[track.id]={name:track.city,evidence:history.length?'recorded-2023-2025':previous?.evidence||'conservative-fallback',raceCount:history.length,wetTyreRaces:wet.length,rainRecordedRaces:history.filter(r=>r.rainSamples>0).length,referenceLaps,minStableLaps,rainChance:history.length?Number(((wet.length+.1)/(history.length+2)).toFixed(4)):previous?.rainChance??.10,heavyChance:previous?.heavyChance??.12,clearChance:previous?.clearChance??.10,sessionKeys:history.map(r=>r.sessionKey),...(previous?{notes:previous.notes,sources:previous.sources}:history.length?{}:{notes:'No usable race-weather series verified. Conservative game tuning; not an observed rain frequency.',sources:[]})};
}
const data={source:'OpenF1 historical Race sessions, rainfall flags and tyre stints',sourceUrl:'https://openf1.org/docs/',retrieved:process.env.WEATHER_RETRIEVED_ON||new Date().toISOString().slice(0,10),window:'2023–2025 completed seasons',license:'CC BY-NC-SA 4.0 for the OpenF1-derived data',method:'35% of active drivers on wet-weather tyres defines a tyre regime. Runs shorter than three laps are excluded from persistence estimates, not from wet-race counts. Tyre regimes are proxies for surface conditions, not measured rainfall intensity. Game probabilities are shrunk towards a conservative dry prior; minimum stable periods and change caps are gameplay choices, not measured climatology.',profiles,races};
await writeFile(new URL('public/data/weather-history.json',root),JSON.stringify(data,null,2)+'\n');
await writeFile(new URL('shared/weather-history-data.mjs',root),'// Generated by scripts/update-weather-history.mjs. See public/data/weather-history.json for evidence and licensing.\nexport const WEATHER_HISTORY='+JSON.stringify(profiles,null,1)+';\n');
console.log(JSON.stringify({races:races.length,recordedCircuits:Object.values(profiles).filter(p=>p.raceCount).length,totalCircuits:tracks.length,reportBased:Object.values(profiles).filter(p=>p.evidence==='historic-report').length,fallback:Object.values(profiles).filter(p=>p.evidence==='conservative-fallback').length}));
