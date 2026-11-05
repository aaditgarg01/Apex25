// Original arcade balance, not real-world telemetry or Pirelli stint predictions.
// wear, speed/drag trim, straight-line share, soft grip gain, hard grip gain.
const balance={
 'au-1953':[1.03,.963,.43,.012,.004], 'cn-2004':[1.20,.974,.48,.008,.018],
 'jp-1962':[1.32,.951,.32,-.008,.026], 'bh-2002':[1.38,.978,.50,-.004,.023],
 'sa-2021':[.96,.997,.60,.009,.006], 'us-2022':[1.13,.981,.52,.016,.008],
 'it-1953':[1.04,.943,.35,.026,.002], 'mc-1929':[.76,.835,.15,.055,-.018],
 'es-1991':[1.36,.954,.35,-.010,.030], 'ca-1978':[.91,.989,.62,.028,-.005],
 'at-1969':[1.09,.985,.55,.022,.004], 'gb-1948':[1.42,.968,.39,-.018,.036],
 'be-1925':[1.25,1.012,.56,.002,.022], 'hu-1986':[1.14,.912,.20,.041,.007],
 'nl-1948':[1.29,.925,.24,.009,.027], 'it-1922':[.82,1.025,.78,.011,-.009],
 'az-2016':[.87,1.019,.72,.023,-.004], 'sg-2008':[1.16,.892,.23,.049,.011],
 'us-2012':[1.34,.957,.40,-.005,.029], 'mx-1962':[.95,1.008,.65,.026,.002],
 'br-1940':[1.18,.966,.42,.017,.017], 'us-2023':[.79,1.030,.80,.018,-.012],
 'qa-2004':[1.46,.962,.38,-.021,.041], 'ae-2009':[1.07,.982,.53,.019,.012],
 'fr-1969':[1.28,1.002,.63,-.009,.025], 'de-1932':[1.06,.991,.57,.020,.009],
 'ru-2014':[.84,.976,.56,.034,-.006], 'de-1927':[1.17,.934,.28,.030,.015],
 'pt-2008':[1.27,.959,.37,.004,.024], 'it-1914':[1.40,.970,.34,-.015,.034],
 'my-1999':[1.39,.972,.44,-.012,.033], 'tr-2005':[1.37,.964,.40,-.006,.031],
 'fr-1960':[1.15,.938,.30,.025,.016], 'pt-1972':[1.23,.945,.33,.013,.020],
 'br-1977':[1.21,.949,.36,.014,.019], 'es-2026':[1.26,.979,.46,.006,.021],
 'us-1909':[.98,1.006,.69,.024,-.002], 'ar-1952':[1.19,.953,.34,.021,.014],
 'za-1961':[1.24,.961,.38,.010,.022], 'us-1956':[1.31,.973,.41,-.003,.028],
 'in-2011':[1.22,.995,.54,.007,.020], 'in-vit-vellore':[1.10,.874,.18,.045,.013]
};
export const TYRE_CIRCUITS=Object.freeze(Object.fromEntries(Object.entries(balance).map(([id,[wear,speed,power,softGain,hardGain]])=>[id,Object.freeze({wear,speed,power,softGain,hardGain})])));
const fallback=Object.freeze({wear:1,speed:.97,power:.45,softGain:.01,hardGain:.01});
export const tyreCircuitProfile=track=>TYRE_CIRCUITS[typeof track==='string'?track:track?.id]||fallback;
// Low-drag circuits favour firmer compounds on straights; tight layouts favour
// soft traction. All dry compounds keep separate speed trims on every circuit.
export function circuitCompoundSpeed(track,compound){
 const p=tyreCircuitProfile(track),trim=compound==='soft'?1.002-p.power*.014:compound==='hard'?.996+p.power*.018:compound==='intermediate'?.989:compound==='wet'?.976:1;
 return p.speed*trim;
}
