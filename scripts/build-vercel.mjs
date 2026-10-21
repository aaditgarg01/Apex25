import './build.mjs';
import {cp,mkdir,rm} from 'node:fs/promises';
const output=new URL('../dist/',import.meta.url);
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
await cp(new URL('../public/',import.meta.url),output,{recursive:true});
await cp(new URL('../shared/',import.meta.url),new URL('shared/',output),{recursive:true});
console.log('Vercel static assets ready. Multiplayer uses the configured persistent backend.');
