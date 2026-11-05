import {CONDITIONS} from './conditions.mjs';
import {SESSION_MODES,validLapCount} from './session.mjs';

export function parseRoomCode(value,base='https://apex.invalid'){
 const raw=String(value||'').trim();if(/^[a-f0-9]{6}$/i.test(raw))return raw.toUpperCase();
 try{const code=new URL(raw,base).searchParams.get('room')?.trim();return /^[a-f0-9]{6}$/i.test(code||'')?code.toUpperCase():null;}catch{return null;}
}
export function updatedRoomSettings(room,message,tracks){
 const track=tracks.find(t=>t.id===message.trackId);if(!track)throw Error('Choose a valid circuit.');
 if(!SESSION_MODES.includes(message.mode))throw Error('Choose a valid session type.');
 if(!validLapCount(message.laps))throw Error('Enter a whole number of laps, at least 1.');
 if(!Object.hasOwn(CONDITIONS,message.conditions))throw Error('Choose valid track conditions.');
 if(!Number.isInteger(message.aiCount)||message.aiCount<0||message.aiCount>7)throw Error('Choose between 0 and 7 AI opponents.');
 if(!['start','sector2','sector3','eau-rouge','mexico-stadium','senna-s','tarzan','luyendyk','miami-t1','miami-back','miami-marina','silverstone-copse','silverstone-becketts','silverstone-stowe'].includes(message.practiceStart))throw Error('Choose a valid practice start.');
 return {track,mode:message.mode,laps:message.laps,conditions:message.conditions,aiCount:Math.min(message.aiCount,8-room.players.size),practiceStart:['silverstone-copse','silverstone-becketts','silverstone-stowe'].includes(message.practiceStart)?(track.id==='gb-1948'?message.practiceStart:'start'):['miami-t1','miami-back','miami-marina'].includes(message.practiceStart)?(track.id==='us-2022'?message.practiceStart:'start'):['tarzan','luyendyk'].includes(message.practiceStart)?(track.id==='nl-1948'?message.practiceStart:'start'):message.practiceStart==='senna-s'?(track.id==='br-1940'?'senna-s':'start'):message.practiceStart==='mexico-stadium'?(track.id==='mx-1962'?'mexico-stadium':'start'):track.id==='be-1925'?message.practiceStart:message.practiceStart==='eau-rouge'?'start':message.practiceStart};
}
