// Compress large snapshots, not tiny control packets. Level 1 and a small
// concurrency cap keep compression from competing with the simulation.
export const socketCompression={
 threshold:512,serverNoContextTakeover:true,clientNoContextTakeover:true,
 concurrencyLimit:4,zlibDeflateOptions:{level:1},
};

// Do not silently lose a start/lobby/result message behind a blocked socket.
// Resume supplies fresh authority state. Obsolete motion can simply be dropped.
export function sendRoomPacket(ws,data,{snapshot=false}={}){
 if(ws.readyState!==1)return false;
 if(snapshot&&ws.bufferedAmount!==0)return false;
 if(ws.bufferedAmount>=250000){ws.close(1012,'Room connection congested');return false;}
 ws.send(data);return true;
}
