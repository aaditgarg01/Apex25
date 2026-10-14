import {mkdir, copyFile,readFile,writeFile} from 'node:fs/promises';
await mkdir(new URL('../public/vendor/',import.meta.url),{recursive:true});
for(const f of ['three.module.js','three.core.js']) await copyFile(new URL('../node_modules/three/build/'+f,import.meta.url),new URL('../public/vendor/'+f,import.meta.url));
console.log('APEX 25 is ready. Run npm start.');

await writeFile(new URL('../public/vendor/BufferGeometryUtils.js',import.meta.url),(await readFile(new URL('../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js',import.meta.url),'utf8')).replace("from 'three'","from './three.module.js'"));

await copyFile(new URL('../node_modules/three/LICENSE',import.meta.url),new URL('../public/vendor/THREE-LICENSE.txt',import.meta.url));
await writeFile(new URL('../public/vendor/Reflector.js',import.meta.url),(await readFile(new URL('../node_modules/three/examples/jsm/objects/Reflector.js',import.meta.url),'utf8')).replace("from 'three'","from './three.module.js'"));
