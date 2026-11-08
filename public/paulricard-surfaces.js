import * as THREE from '/vendor/three.module.js';
import {paulRicardRunoff} from '/shared/paulricard.mjs';

const stripeColors = {blue:[20,154,213], red:[181,39,54], white:[231,226,207]};
const stripePeriod = {blue:3.15, red:3.4, white:2.45};

function abrasiveTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ink = canvas.getContext('2d'), pixels = ink.createImageData(128, 128);
  let seed = 473;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const random = seed / 4294967296, grit = (random - .5) * 32;
    const position = x / 128, paint = position < .57;
    const color = paint ? stripeColors[kind] : [47,49,53];
    const wear = Math.cos(y / 128 * Math.PI * 8 + x * .17) * 2.6;
    const index = (y * 128 + x) * 4;
    for (let channel = 0; channel < 3; channel++) pixels.data[index + channel] = color[channel] + grit + wear;
    pixels.data[index + 3] = 255;
  }
  ink.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

export function buildPaulRicardSurfaces(surfaces) {
  const {track, scene} = surfaces;
  const {bands} = paulRicardRunoff(track);
  const tint = new THREE.Color();
  for (const kind of ['edge','blue','red','white','tarmac','kerb','grass','verge']) {
    const positions = [], uv = [], colors = [];
    for (const row of bands) {
      if (row.kind !== kind) continue;
      if (kind === 'grass') tint.set(row.i % 17 < 7 ? '#a4a16c' : '#b3a684');
      else if (kind === 'verge') tint.set('#d6c6ae');
      else if (kind === 'kerb') tint.set(row.i % 2 ? '#eee5d8' : '#b93140');
      else tint.set('#ffffff');
      for (const index of row.side > 0 ? [0,1,3,3,1,2] : [0,3,1,3,2,1]) {
        const point = row.polygon[index];
        positions.push(point.x, point.y, point.z);
        colors.push(tint.r, tint.g, tint.b);
        if (stripePeriod[kind]) uv.push(row.offsets[index] / stripePeriod[kind],
          (row.i + Number(index === 1 || index === 2)) * track.step / 8);
        else uv.push(point.x / 8, point.z / 8);
      }
    }
    if (!positions.length) continue;
    let material;
    if (stripePeriod[kind]) {
      const key = 'ricard-' + kind, texture = abrasiveTexture(kind);
      material = new THREE.MeshPhysicalMaterial({map:texture, roughness:.96, side:THREE.DoubleSide});
      material.userData.surfaceKind = 'ricard-abrasive';
      surfaces.textures.set(key, texture);
      surfaces.materials.set(key, material);
    } else {
      material = surfaces.material(kind === 'grass' ? 'grass' : kind === 'tarmac' ? 'asphalt' : kind === 'verge' ? 'gravel' : 'paint',
        kind === 'edge' ? '#eeeae0' : '#ffffff', true);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.userData.ricardBand = kind;
    scene.group.add(mesh);
  }
}
