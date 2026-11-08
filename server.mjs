import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRaceEngine,raceVersion,raceFeatures} from './backend/race-engine.mjs';

const root=path.resolve(fileURLToPath(new URL('.',import.meta.url)));
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.geojson':'application/json','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,game:'apex-25',rooms:engine.roomCount(),version:raceVersion,features:raceFeatures}));return;}const decoded=decodeURIComponent(url.pathname),shared=decoded.startsWith('/shared/'),base=path.join(root,shared?'shared':'public');const relative=shared?decoded.slice(7):decoded;const filename=path.resolve(base,'.'+(relative==='/'?'/index.html':relative));if(!filename.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}const content=await readFile(filename);res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);}catch{res.writeHead(404);res.end('Not found');}});
const engine=createRaceEngine({server});
const port=Number(process.env.PORT)||3333;
server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`APEX 25 ready at http://localhost:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{
 engine.close();server.close(()=>process.exit(0));
});
