import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import{makeTracks}from'../shared/tracks.mjs';import{VENUES,venuePlan,roadClearance,safeSite}from'../shared/venues.mjs';
const tracks=makeTracks(JSON.parse(await readFile(new URL('../public/data/circuits.geojson',import.meta.url))),JSON.parse(await readFile(new URL('../public/data/elevations.json',import.meta.url))));
test('every playable venue has a named landmark with its full footprint clear of every road branch',()=>{
 assert.equal(Object.keys(VENUES).length,tracks.length);
 for(const t of tracks){const p=venuePlan(t);assert(p.name&&p.kind&&p.theme,t.id);assert([p.x,p.y,p.z,p.heading,p.radius].every(Number.isFinite),t.id);assert(roadClearance(t,p.x,p.z)>=p.radius+45-.001,t.id);}
});
test('scenery placement keeps pit buildings and stands away from adjacent hairpins',()=>{
 for(const t of tracks)for(const [at,radius,side]of [[1-120/t.length,83,1],[120/t.length,40,-1],[.26,40,-1],[.58,40,-1],[.82,40,-1]]){const p=safeSite(t,at,radius,side);assert(roadClearance(t,p.x,p.z)>=radius+12-.001,t.id);}
});
