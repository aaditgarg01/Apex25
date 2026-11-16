import {mkdir, copyFile,readFile,writeFile,cp} from 'node:fs/promises';
await mkdir(new URL('../public/vendor/',import.meta.url),{recursive:true});
for(const f of ['three.module.js','three.core.js']) await copyFile(new URL('../node_modules/three/build/'+f,import.meta.url),new URL('../public/vendor/'+f,import.meta.url));
console.log('APEX 25 is ready. Run npm start.');

await writeFile(new URL('../public/vendor/BufferGeometryUtils.js',import.meta.url),(await readFile(new URL('../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js',import.meta.url),'utf8')).replace("from 'three'","from './three.module.js'"));

await copyFile(new URL('../node_modules/three/LICENSE',import.meta.url),new URL('../public/vendor/THREE-LICENSE.txt',import.meta.url));
// Only the opt-in network lab imports Photon. Keep its JS/WASM and attribution
// together; the normal game never loads the experimental SDK.
await cp(new URL('../node_modules/@photonengine/realtime-core/dist/',import.meta.url),new URL('../public/vendor/photon/',import.meta.url),{recursive:true});
for(const name of ['LICENSE.txt','THIRD_PARTY_NOTICES.txt'])await copyFile(new URL('../node_modules/@photonengine/realtime-core/'+name,import.meta.url),new URL('../public/vendor/photon/'+name,import.meta.url));
await writeFile(new URL('../public/vendor/Reflector.js',import.meta.url),(await readFile(new URL('../node_modules/three/examples/jsm/objects/Reflector.js',import.meta.url),'utf8')).replace("from 'three'","from './three.module.js'"));
