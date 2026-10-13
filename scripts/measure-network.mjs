import WebSocket from 'ws';
const url=process.env.TEST_URL||'https://apex-25-production.up.railway.app';
const ws=new WebSocket(url.replace(/^http/,'ws')),samples=[];let bytes=0,states=0,started=0;
const timeout=setTimeout(()=>{console.error('Network measurement timed out');ws.terminate();process.exitCode=1;},45000);
ws.on('error',e=>{clearTimeout(timeout);console.error(e.message);process.exitCode=1;});
ws.on('message',data=>{const m=JSON.parse(data);if(m.type==='welcome')ws.send(JSON.stringify({type:'create',name:'Latency check',trackId:'it-1922',mode:'race',aiCount:7,laps:3}));
if(m.type==='lobby')ws.send(JSON.stringify({type:'start'}));
if(m.type==='start'){started=performance.now();ws.send(JSON.stringify({type:'ping',time:performance.now()}));}
if(m.type==='state'){bytes+=data.length;states++;}
if(m.type==='pong'){samples.push(performance.now()-m.time);if(samples.length<7)setTimeout(()=>ws.send(JSON.stringify({type:'ping',time:performance.now()})),100);else{const seconds=(performance.now()-started)/1000;samples.sort((a,b)=>a-b);console.log(JSON.stringify({url,pingMedianMs:Math.round(samples[3]),pingP95Ms:Math.round(samples[6]),updatesPerSecond:Math.round(states/seconds),kilobytesPerSecond:Math.round(bytes/seconds/1024),averagePacketBytes:Math.round(bytes/states)}));clearTimeout(timeout);ws.close();}}});
