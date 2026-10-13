import {spawn} from 'node:child_process';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),port=Number(process.env.PORT)||3333,url=`http://localhost:${port}`,internet=process.argv.includes('--internet');
process.chdir(root);
let server,tunnel,shuttingDown=false;
async function health(){try{const r=await fetch(url+'/health',{signal:AbortSignal.timeout(1000)});return r.ok&&(await r.json()).game==='apex-25';}catch{return false;}}
function stop(){if(shuttingDown)return;shuttingDown=true;tunnel?.kill('SIGTERM');server?.kill('SIGTERM');setTimeout(()=>process.exit(0),500);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);process.on('SIGHUP',stop);
if(!await health()){
 server=spawn(process.execPath,['server.mjs'],{cwd:root,stdio:'inherit',env:{...process.env,PORT:String(port)}});
 server.on('exit',code=>{if(!shuttingDown){console.error('The game server stopped. If port 3333 is occupied, close the other application or set PORT.');process.exit(code||1);}});
 for(let i=0;i<60&&!await health();i++)await new Promise(r=>setTimeout(r,250));
 if(!await health()){console.error('The server did not become ready.');stop();}
}
if(!shuttingDown){
 if(!internet){console.log(`\nPlay APEX 25: ${url}\nKeep this window open. Press Control-C to stop.\n`);spawn('open',[url],{stdio:'ignore'});}
 else{
 const executable=path.join(root,'bin','cloudflared');try{await access(executable);}catch{console.error('Missing bin/cloudflared. Download the official macOS utility from https://github.com/cloudflare/cloudflared/releases');stop();}
 if(!shuttingDown){await mkdir('.runtime',{recursive:true});tunnel=spawn(executable,['tunnel','--no-autoupdate','--url',url,'--protocol','http2'],{cwd:root,stdio:['ignore','pipe','pipe']});let seen=false;const handle=async data=>{const text=data.toString();process.stdout.write(text);const match=text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);if(match&&!seen){seen=true;await writeFile('INTERNET-LINK.txt',`APEX 25 internet host\n\n${match[0]}\n\nOpen this address, choose Race with Friends, create a room, and copy its invite link.\nThis temporary address works only while Start Internet.command stays open.\nA new address is created each time internet hosting restarts.\n`);console.log(`\nYOUR INTERNET GAME: ${match[0]}\nCreate a private room there and share its invite link.\nKeep this window and Mac awake. Control-C stops internet hosting.\n`);spawn('open',[match[0]],{stdio:'ignore'});}};tunnel.stdout.on('data',handle);tunnel.stderr.on('data',handle);tunnel.on('exit',code=>{if(!shuttingDown){console.error('Internet hosting stopped. Restart Start Internet.command to reconnect.');stop();}});}
 }
}
// Keep the launcher alive even when reusing a server started in another window.
setInterval(()=>{},1000);
