import {buddhGround, buddhRoads, buddhRoadClear, buddhRunoff} from '/shared/buddh.mjs';
import {BUDDH_SECTORS} from './data/buddh-runoff.js';
import {planBuddh} from './buddh-placement.js';
import {addPermanentVenue} from './permanent-venue.js';

function paintFlag(flagInk) {
  for (const [i, tone] of ['#ed923d', '#f5eee2', '#2f8a4e'].entries()) {
    flagInk.fillStyle = tone;
    flagInk.fillRect(0, i * 40, 192, 40);
  }
  flagInk.strokeStyle = '#294e88';
  flagInk.lineWidth = 2;
  flagInk.beginPath();
  flagInk.arc(96, 60, 15, 0, Math.PI * 2);
  flagInk.stroke();
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12;
    flagInk.beginPath();
    flagInk.moveTo(96, 60);
    flagInk.lineTo(96 + Math.cos(angle) * 14, 60 + Math.sin(angle) * 14);
    flagInk.stroke();
  }
}

export function addBuddh(scene, track) {
  addPermanentVenue(scene, track, {
    prefix: 'buddh', plan: planBuddh(track), ground: buddhGround, roads: buddhRoads,
    roadClear: buddhRoadClear, runoff: buddhRunoff, sectors: BUDDH_SECTORS, detection: [677, 4332],
    title: 'GREATER NOIDA', wallTitle: 'APEX INDIA', crowdColors: ['#e89335', '#efe6ca', '#399367', '#2b64a2', '#ca6747', '#263953', '#d2c9a8'],
    crowdLimit: 10000, paintFlag
  });
}
