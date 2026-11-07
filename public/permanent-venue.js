import * as THREE from '/vendor/three.module.js';
import {sample} from '/shared/tracks.mjs';
import {trackBarriers} from '/shared/barriers.mjs';
import {gridSlot} from '/shared/physics.mjs';
import {pitLayout, pitRoadPose} from '/shared/pit-layout.mjs';

export function addPermanentVenue(scene, track, {
  prefix, plan, ground, roads, roadClear, runoff, sectors, detection, title, crowdColors, crowdLimit,
  paintFlag, drawRoof, drawLandmark, wallTitle = title, tropical = false
}) {
  const root = scene.group;
  const crowd = [], trees = [], palms = [], grass = [], flags = [], tents = [], vehicles = [], panels = [], flareAnchors = [];
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  function group(site) {
    const g = new THREE.Group();
    g.position.set(site.x, site.y, site.z);
    g.rotation.y = site.heading;
    g.userData[prefix + 'Site'] = site.id;
    g.userData.pitKeep = true;
    root.add(g);
    return g;
  }
  function local(site, x, y, z, tint) {
    const c = Math.cos(site.heading), s = Math.sin(site.heading);
    return {x: site.x + c * x + s * z, y: site.y + y, z: site.z - s * x + c * z,
      heading: site.heading, owner: site.id, tint};
  }
  function batch(geometry, mat, records, transform) {
    const cells = new Map(), batches = [];
    for (const record of records) {
      const key = Math.floor(record.x / 560) + ':' + Math.floor(record.z / 560);
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(record);
    }
    if (!cells.size) geometry.dispose();
    for (const chunk of cells.values()) {
      const mesh = new THREE.InstancedMesh(geometry, mat, chunk.length);
      chunk.forEach((p, index) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.heading || 0, 0);
        dummy.scale.setScalar(1);
        transform?.(p, dummy);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        if (p.tint) mesh.setColorAt(index, color.set(p.tint));
      });
      mesh.userData.pitKeep = true;
      mesh.userData[prefix + 'Owners'] = chunk.map(p => p.owner || p.id);
      mesh.computeBoundingSphere();
      mesh.receiveShadow = true;
      root.add(mesh);
      batches.push(mesh);
    }
    return batches;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ink = canvas.getContext('2d'), labelCache = new Map(), atlas = new THREE.CanvasTexture(canvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 8;
  const labelMaterial = new THREE.MeshBasicMaterial({map: atlas, alphaTest: .35, side: THREE.FrontSide});
  function label(parent, text, w, h, x, y, z, angle = 0, background = '#223d43') {
    const key = text + background;
    if (!labelCache.has(key)) {
      const slot = labelCache.size, u = slot % 4 * 512, v = Math.floor(slot / 4) * 64;
      if (background) {ink.fillStyle = background; ink.fillRect(u, v, 512, 64);}
      ink.fillStyle = '#fff2d6';
      ink.textAlign = 'center';
      ink.textBaseline = 'middle';
      ink.font = 'bold 46px Arial';
      ink.fillText(text, u + 256, v + 34, 480);
      labelCache.set(key, {u, v});
    }
    const cell = labelCache.get(key), geometry = new THREE.PlaneGeometry(w, h), uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cell.u + uv.getX(i) * 512) / 2048, 1 - (cell.v + (1 - uv.getY(i)) * 64) / 2048);
    const mesh = new THREE.Mesh(geometry, labelMaterial);
    mesh.position.set(x, y, z);
    mesh.rotation.y = angle;
    mesh.userData.mappedStatic = true;
    mesh.userData.pitKeep = true;
    parent.add(mesh);
    return mesh;
  }

  const fieldPositions = [], fieldColors = [];
  const fieldPalette = ['#9a8a4c', '#928351', '#b4a35b', '#887644'];
  for (const site of plan.sites) {
    if (site.kind === 'tree') {trees.push(site); continue;}
    if (site.kind === 'palm') {palms.push(site); continue;}
    if (site.kind === 'scrub') {grass.push(site); continue;}
    if (site.kind === 'field') {
      for (let i = 0; i < 17; i++) {
        const a = (i / 17 - .5) * site.w, b = ((i + .83) / 17 - .5) * site.w;
        color.set(fieldPalette[(i + site.variant) % 4]);
        for (const [x, z] of [[a,-site.d/2],[b,-site.d/2],[a,site.d/2],[a,site.d/2],[b,-site.d/2],[b,site.d/2]]) {
          const p = local(site, x, 0, z);
          fieldPositions.push(p.x, ground(track, p.x, p.z) + .14, p.z);
          fieldColors.push(color.r, color.g, color.b);
        }
      }
      continue;
    }
    const g = group(site), box = (w, h, d, tint, x, y, z) => scene.box(w, h, d, tint, x, y, z, g);
    const front = -(site.side || 1);
    if (drawLandmark?.(scene, site, g)) continue;
    if (site.kind === 'pit') {
      const w = site.w - 3, d = site.d - 2;
      box(w, 5.4, d, '#c6baa5', 0, 2.2, 0);
      box(w - 1.4, 4.9, d - 1, '#c4b4a0', .4, 7.3, 0);
      box(.22, 2.6, d * .95, '#52747a', front * (w / 2 - .3), 7.9, 0);
      box(w + 1.1, .42, d + 1, '#e1d5bd', 0, 10.25, 0);
      for (const [i, tint] of (tropical ? ['#356f78','#e4e5db','#7e9993'] : ['#da803a', '#e5dbc3', '#4d825f']).entries()) {
        box(.28, .17, d * .96, tint, front * (w / 2 + .10), 9.57 - i * .19, 0);
      }
      for (let i = 0; i < 34; i++) {
        const z = (i + .5 - 17) * d / 34;
        box(.23, 3.6, d / 34 * .73, '#364145', front * w / 2, 1.9, z);
        box(.30, .24, d / 34 * .68, crowdColors[i % crowdColors.length], front * w / 2, 4.1, z);
        box(.18, 2.9, .11, '#a6947c', front * (w / 2 - .12), 7.65, z);
      }
      for (let i = -4; i <= 4; i++) {
        const grille = box(.25, .27, 3.8, '#786c56', front * (w / 2 + .15), 6.25, i * 5);
        grille.rotation.x = i % 2 ? .14 : -.14;
      }
      label(g, 'PIT AND PADDOCK', 34, 1.1, front * (w / 2 + .18), 4.8, 0, front * Math.PI / 2);
      label(g, 'PODIUM', 14, 1.25, front * (w / 2 + .21), 6.3, d * .31, front * Math.PI / 2);
    } else if (site.kind === 'stand') {
      const d = site.d - 2, tierWidth = (site.w - 3) / site.rows;
      const mainStand = site.id === 'main-stand';
      const spacing = mainStand ? 1.9 : tropical ? 2.02 : 1.28;
      const cols = Math.floor(d / spacing);
      for (let row = 0; row < site.rows; row++) {
        const x = front * ((site.w - 3) / 2 - (row + .5) * tierWidth), y = 1.3 + row * .50 + (mainStand && row >= 12 ? 2.6 : 0);
        box(tierWidth + .08, .4, d, row % 5 === 0 ? '#b59d74' : '#a69a83', x, y, 0);
        box(tierWidth * .74, .15, d * .98, ['#c78055','#d5d0b3','#557957'][row % 3], x, y + .25, 0);
        for (let col = 0; col < cols && crowd.length < crowdLimit; col++) {
          if (col % 20 === 0 || (row * 13 + col * 5) % 7 === 0) continue;
          const z = (col + .5) * spacing - d / 2;
          crowd.push(local(site, x, y + .34, z, crowdColors[(row * 13 + col * 7 + Math.floor(col / 8)) % crowdColors.length]));
        }
        if (row % 5 === 0) for (let z = -d / 2 + 5; z < d / 2; z += 14) box(.24, y + 2.4, .27, '#9a8d75', x, (y - 2.4) / 2, z);
      }
      if (mainStand) {
        const edge = front * ((site.w - 3) / 2 - 12 * tierWidth);
        box(.34, 2.26, d * .992, '#5b716e', edge, 8.18, 0);
        for (let z = -d / 2 + 5; z < d / 2; z += 8) box(.48, 2.37, .18, '#bfb7a5', edge, 8.18, z);
        const positions = [], indices = [];
        const span = 64, roofHeight = site.rows * .50 + 6.65;
        for (let i = 0; i <= span; i++) {
          const z = (i / span - .5) * d;
          const wave = Math.cos(i / span * Math.PI * 7);
          for (const side of [-1, 1]) {
            const leading = side === front;
            positions.push(side * (site.w / 2 - 1.05 - (leading ? .55 - wave * .5 : 0)),
              roofHeight + (leading ? -.75 + wave * .75 : .15), z);
          }
          if (i < span) {const a = i * 2; indices.push(a,a+2,a+1,a+1,a+2,a+3);}
        }
        const canopy = new THREE.BufferGeometry();
        canopy.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        canopy.setIndex(indices);
        canopy.computeVertexNormals();
        const roofMesh = new THREE.Mesh(canopy, new THREE.MeshStandardMaterial({
          color: '#d6d0c1', side: THREE.DoubleSide, roughness: .82
        }));
        roofMesh.receiveShadow = true;
        g.add(roofMesh);
        for (let z = -d / 2 + 7; z < d / 2; z += 15) {
          const x = -front * (site.w / 2 - 1.3);
          box(.43, roofHeight + 1.2, .53, '#afa698', x, (roofHeight - 1.2) / 2, z);
        }
      } else if (site.roof === 'tensile') {
        drawRoof(scene, site, g, front);
      } else if (site.id !== 'south-bank' && site.roof !== 'open') {
        const roof = site.rows * .50 + 4, modules = Math.max(2, Math.round(d / 14));
        for (let i = 0; i < modules; i++) {
          const z = (i + .5 - modules / 2) * d / modules;
          box(.35, roof, .37, '#867e71', -front * (site.w / 2 - .8), roof / 2, z);
          const canopy = box(site.w - .9, .34, d / modules - .26, i % 2 ? '#ddd0b5' : '#ede2cb', 0, roof + .16 * (i % 2), z);
          canopy.rotation.z = front * .074;
        }
      }
      for (let z = -d / 2 + 4; z < d / 2 - 3; z += 19) {
        const x = -front * (site.w / 2 - 2.1), h = site.rows * .50 + (mainStand ? 3.8 : 1.3);
        box(.06, 2.25, .06, '#d4cab6', x, h, z);
        flags.push(local(site, x, h + .78, z));
      }
      if (site.label) label(g, site.label, Math.min(30, d - 1), .9, front * (site.w / 2 - .9), 1.05, 0, front * Math.PI / 2);
    } else if (site.kind === 'fan') {
      box(site.w - 1, .17, site.d - 1, '#9c886a', 0, 0, 0);
      for (const z of [-11, 0, 11]) {
        tents.push(local(site, -4, 2.9, z, z ? '#e7d6ae' : '#d9844b'));
        box(6.3, 1.8, 6, '#a79576', -4, 1, z);
        vehicles.push(local(site, 7.1, .55, z, z ? '#d3b991' : '#738180'));
      }
      for (const x of [-7, 7]) {
        box(.32, 5.4, .35, '#77695d', x, 2.65, 16);
        flags.push(local(site, x, 5.4, 15.5));
      }
      box(14.5, .7, .45, '#d68434', 0, 5.15, 16);
      for (let i = -6; i <= 6; i++) box(.55, .23, .48, i % 2 ? '#e7a23b' : '#af6126', i, 4.68, 16);
      label(g, 'FAN WALK', 8, .54, 0, 5.16, 16.25, 0, '#43665a');
      flareAnchors.push(local(site, 4.5, 1.5, -3.5));
    } else if (site.kind === 'board' || site.kind === 'brake') {
      box(.14, 1.75, .14, '#9a9182', 0, .84, 0);
      label(g, site.label, 1.8, .75, 0, 1.45, -.1, Math.PI, site.kind === 'board' ? '#3b5961' : '#354044');
    } else if (site.kind === 'marshal') {
      const z = site.crane ? -2.8 : 0;
      box(3.1, 2.22, 2.3, '#c6b397', 0, 1, z + .4);
      box(3.35, .19, 2.52, '#ac5e32', 0, 2.16, z + .4);
      box(.14, 2.8, .14, '#6d776d', 1.5, 1.35, z);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(.58, .38, .12), new THREE.MeshBasicMaterial({color: '#33cf82'}));
      lamp.position.set(1.5, 2.68, z);
      g.add(lamp);
      panels.push({lamp, site});
      for (const x of [-.7, .7]) {
        box(.34, .77, .28, '#e88134', x, .43, z - 1.55);
        box(.32, .49, .25, '#f28b36', x, 1.04, z - 1.55);
        box(.24, .24, .23, '#eee4d2', x, 1.39, z - 1.55);
      }
      box(.16, .55, .16, '#bf4938', -1.28, .63, z - 1.45);
      label(g, 'FIRE', .72, .39, -1.24, 1.31, z - 1.48, Math.PI, '#a3432c');
      box(.14, .05, 2.65, '#3e3c36', -1.8, .04, z);
      if (site.crane) {
        box(3.2, 1.4, 4.7, '#ba8a3e', 2.6, .75, 2.5);
        box(.31, 7.5, .31, '#a77c35', 2.3, 4.05, 2.6);
        const boom = box(.29, .24, 5.3, '#d0994a', 2.3, 7.8, .6);
        boom.rotation.x = -.2;
        box(.55, .51, .55, '#464e50', 2.3, 8.15, -1.85);
        if (tropical) {
          for (let i = 0; i < 3; i++) box(1.1, .22, 1.13, '#323b39', -2.9, .18 + i * .24, 2.4);
          box(.43, .06, 4, '#939383', -3.3, -.015, -2.3);
          box(.53, .19, .63, '#6a7a73', -3.3, .06, -.5);
          label(g, 'SERVICE ACCESS', 2.8, .44, 2.2, 1.56, -3.95, Math.PI, '#485c54');
        }
      }
    } else if (site.kind === 'mast' || site.kind === 'timing' || site.kind === 'pylon') {
      const h = site.kind === 'pylon' ? 21 : site.kind === 'mast' ? 12 : 8;
      box(.28, h, .28, '#91928b', 0, h / 2, 0);
      box(site.kind === 'pylon' ? 10.5 : 2.2, .26, .35, '#969a92', 0, h, 0);
      if (site.kind === 'pylon') {
        box(6.8, .19, .29, '#929b90', 0, h - 4, 0);
      } else for (const x of [-.72, 0, .72]) box(.36, .2, .40, '#e4dfc8', x, h - .16, 0);
    } else {
      const h = site.height || (site.kind === 'control' ? 12 : 6.5), w = site.w - 1.5, d = site.d - 1.7;
      box(w, h + .7, d, site.kind === 'skyline' ? ['#b0a297','#9f8a7b','#aa9d8b'][site.variant] : '#c3ad90', 0, (h - .7) / 2, 0);
      box(w + .5, .33, d + .5, '#9b8b78', 0, h + .13, 0);
      for (let y = 3.3; y < h - 1; y += 3) box(w * .82, .88, .12, '#748186', 0, y, d / 2 + .08);
      if (site.kind !== 'skyline') {
        label(g, site.label, Math.min(w - .8, 16), .9, 0, 2.55, d / 2 + .12);
        if (site.kind === 'medical') vehicles.push(local(site, 3, .65, d / 2 - 4.3, '#e0dccb'));
      } else if (site.variant === 1) box(w * .36, 2.5, d * .32, '#918275', 0, h + 1.25, 0);
    }
  }

  const standard = tint => new THREE.MeshStandardMaterial({color: tint, roughness: .87});
  batch(new THREE.CapsuleGeometry(.155, .30, 2, 4), standard('#ffffff'), crowd, (p, o) => {o.position.y += .32;});
  batch(new THREE.SphereGeometry(.113, 5, 4), standard('#bd987b'), crowd.map(({tint, ...p}) => p), (p, o) => {o.position.y += .65;});
  if (palms.length) {
    batch(new THREE.CylinderGeometry(.19, .32, 1, 6), standard('#7d7053'), palms, (p, o) => {
      const h = 5 + p.variant * .38;
      o.position.y += h / 2 - .1;
      o.scale.y = h;
      o.rotation.z = (p.variant % 3 - 1) * .045;
    });
    const leafPositions = [];
    for (let j = 0; j < 8; j++) {
      const a = j / 8, b = (j + 1) / 8;
      const point = (t, k) => [k * (.28 * Math.sin(t * Math.PI) + .014), .75 * Math.sin(t * Math.PI) - .62 * t * t, t * 3.75];
      for (const [t, k] of [[a,-1],[b,-1],[a,1],[a,1],[b,-1],[b,1]]) leafPositions.push(...point(t,k));
      for (const k of [-1, 1]) {
        const tip = point(b, k), base = point(a, 0), rib = point(b, 0);
        tip[0] += k * .24 * Math.sin(a * Math.PI);
        tip[2] += .18;
        leafPositions.push(...base,...rib,...tip);
      }
    }
    const leaf = new THREE.BufferGeometry();
    leaf.setAttribute('position', new THREE.Float32BufferAttribute(leafPositions, 3));
    leaf.computeVertexNormals();
    const frond = new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .91, side: THREE.DoubleSide});
    batch(leaf, frond, palms.flatMap(p => Array.from({length: 7}, (_, i) => ({
      ...p, i, tint: ['#57783b','#42652c','#6c833a','#557343'][i % 4]
    }))), (p, o) => {
      o.rotation.y += p.i * Math.PI * 2 / 7;
      o.position.y += 4.9 + p.variant * .38;
    });
  }
  batch(new THREE.CylinderGeometry(.15, .26, 6, 6), standard('#75624d'), trees, (p, o) => {o.position.y += 2.75;});
  batch(new THREE.IcosahedronGeometry(1, 2), standard('#ffffff'), trees.flatMap(p => [-1, 0, 1].map(index => ({
    ...p, index, tint: ['#5e7544', '#718450', '#7e8250', '#646e41'][p.variant % 4]
  }))), (p, o) => {
    o.position.y += 5.6 + p.variant * .55 + (p.index === 0 ? .7 : 0);
    o.position.x += p.index * .92;
    o.scale.set(p.variant === 2 ? 1.38 : 2.25, p.variant === 2 ? 3.3 : 1.49, 2.06);
  });
  batch(new THREE.ConeGeometry(.72, .74, 5), standard('#ffffff'), grass.map(p => ({
    ...p, tint: (tropical ? ['#648b40','#527e3d','#7d9947','#607d3e'] : ['#998853','#ad985b','#7d834d','#a18153'])[p.variant % 4]
  })), (p, o) => {o.position.y += .28;});
  batch(new THREE.ConeGeometry(4, 1.65, 4), standard('#ffffff'), tents, (p, o) => {o.rotation.y += Math.PI / 4;});
  batch(new THREE.BoxGeometry(2.2, 1.45, 4.9), standard('#ffffff'), vehicles);
  const stones = [];
  for (const [i, band] of runoff(track).bands.entries()) {
    if (band.kind !== 'gravel' || i % 4 !== 0) continue;
    const [a, b, c, d] = band.polygon;
    const blend = .25 + (i % 7) * .065;
    const x = (a.x + b.x) * (1 - blend) / 2 + (c.x + d.x) * blend / 2;
    const y = (a.y + b.y) * (1 - blend) / 2 + (c.y + d.y) * blend / 2;
    const z = (a.z + b.z) * (1 - blend) / 2 + (c.z + d.z) * blend / 2;
    if (Math.hypot(a.x - d.x, a.z - d.z) > 1.2) {
      stones.push({x, y: y + .014, z, tint: i % 2 ? '#ab9d83' : '#d0c2a5'});
    }
  }
  batch(new THREE.IcosahedronGeometry(.085, 0), standard('#ffffff'), stones, (p, o) => {o.scale.y = .44;});

  const smokeCanvas = document.createElement('canvas');
  smokeCanvas.width = smokeCanvas.height = 64;
  const smokeInk = smokeCanvas.getContext('2d'), puff = smokeInk.createRadialGradient(32, 32, 1, 32, 32, 32);
  puff.addColorStop(0, 'rgba(255,255,255,.76)');
  puff.addColorStop(.54, 'rgba(255,255,255,.26)');
  puff.addColorStop(1, 'rgba(255,255,255,0)');
  smokeInk.fillStyle = puff;
  smokeInk.fillRect(0, 0, 64, 64);
  const smokeMap = new THREE.CanvasTexture(smokeCanvas);
  const flares = flareAnchors.map((p, i) => {
    const material = new THREE.SpriteMaterial({map: smokeMap, color: i % 2 ? '#5d9760' : '#d98b48',
      transparent: true, depthWrite: false, opacity: 0});
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    root.add(sprite);
    return {p, sprite};
  });
  const flag = document.createElement('canvas');
  flag.width = 192;
  flag.height = 120;
  paintFlag(flag.getContext('2d'));
  const flagMap = new THREE.CanvasTexture(flag);
  flagMap.colorSpace = THREE.SRGBColorSpace;
  const flagMaterial = new THREE.MeshStandardMaterial({map: flagMap, side: THREE.DoubleSide});
  const wind = {value: 0};
  flagMaterial.onBeforeCompile = shader => {
    shader.uniforms.buddhWind = wind;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float buddhWind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += .13 * sin(position.x * 5. + buddhWind);');
  };
  flagMaterial.customProgramCacheKey = () => 'permanent-venue-flag';
  batch(new THREE.PlaneGeometry(1.6, 1, 7, 2), flagMaterial, flags);

  function landMesh(positions, mat, colors = null) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  const fieldMat = new THREE.MeshStandardMaterial({vertexColors: true, side: THREE.DoubleSide, roughness: .95});
  landMesh(fieldPositions, fieldMat, fieldColors);
  const access = {paved: [], dirt: []};
  const elevatedWays = new Set(trackBarriers(track).bridges?.map(({way}) => way));
  for (const road of roads(track).entries) {
    if (road.kind !== 'access' || elevatedWays.has(road.way) || !roadClear(track, road.polygon, other => other.kind !== 'access')) continue;
    const positions = access[road.type === 'track' ? 'dirt' : 'paved'];
    for (const i of [0, 1, 3, 3, 1, 2]) {
      const p = road.polygon[i];
      positions.push(p.x, ground(track, p.x, p.z) + (road.bridge ? .23 : .12), p.z);
    }
  }
  for (const [kind, positions] of Object.entries(access)) {
    landMesh(positions, new THREE.MeshStandardMaterial({color: kind === 'paved' ? '#7d776e' : '#9c896b',
      side: THREE.DoubleSide, roughness: .9}));
  }

  const wallBoards = trackBarriers(track).walls.filter(w => w.kind === 'track' && w.inward);
  for (const [index, wall] of wallBoards.entries()) {
    if (index % 14 !== 0 || wall.length < 1.4) continue;
    const nearPit = wall.style === 'concrete';
    const {inward} = wall, offset = wall.width / 2 + .016;
    label(root, nearPit ? wallTitle : 'TRACKSIDE', Math.min(2.85, wall.length - .12), .47,
      wall.x + inward.x * offset, (wall.a.y + wall.b.y) / 2 + .53, wall.z + inward.z * offset,
      Math.atan2(inward.x, inward.z), nearPit ? '#405e52' : '#5e5c47');
  }

  if (plan.gantry) {
    const {a, b, station, width} = plan.gantry, p = sample(track, station);
    const gantry = group({...p, id: 'gantry-sign', y: a.y});
    for (const side of [-1, 1]) label(gantry, title, Math.min(track.width + 3, Math.hypot(b.x-a.x, b.z-a.z) - 1),
      1.08, 0, .63, side * (width / 2 + .016), side < 0 ? Math.PI : 0, '#546a54');
    for (let i = -2; i <= 2; i++) scene.box(.28, .21, .08, '#bf5639', i * .56, .08, -.68, gantry);
  }
  function groundText(text, p, w, h) {
    const mark = label(root, text, w, h, p.x, p.y + .115, p.z, 0, null);
    mark.rotation.set(-Math.PI / 2 - p.pitch, p.heading + Math.PI, 0, 'YXZ');
  }
  const pit = pitLayout(track);
  for (const [i, s] of [...sectors, ...detection, pit.entry + 8, pit.entry + pit.length - 8].entries()) {
    const p = sample(track, s);
    const mark = scene.box(track.width - 1.7, .018, .18, i > 3 ? '#5b8e91' : '#e6dfcd', p.x, p.y + .093, p.z);
    mark.rotation.set(-p.pitch, p.heading, 0, 'YXZ');
    groundText(['S1', 'S2', 'DETECT', 'DETECT', 'SC1', 'SC2'][i], sample(track, s - 3), 2.9, .7);
  }
  for (let i = 0; i < 20; i++) {
    const slot = gridSlot(i), p = sample(track, slot.s, slot.offset);
    groundText(String(i + 1), sample(track, slot.s - 3.5, slot.offset), 1.15, .64);
    if (i < 8) continue;
    const box = scene.box(2.8, .02, .12, '#e9dfcf', p.x, p.y + .11, p.z);
    box.rotation.set(-p.pitch, p.heading, 0, 'YXZ');
  }
  for (let i = 0; i < 6; i++) groundText('BOX ' + (i + 1), pitRoadPose(track, pit.box - 21 + i * 8, pit.side * 1.5), 1.25, .55);
  atlas.needsUpdate = true;
  let lastFrame = -Infinity, wetness = 0;
  scene.environmentFx = {
    setConditions(wet) {
      wetness = wet;
      fieldMat.color.set('#ffffff').lerp(color.set('#82765f'), wet * .58);
    },
    frame(time, cars) {
      if (time - lastFrame < 110) return;
      lastFrame = time;
      wind.value = time * .002;
      for (const [i, {p, sprite}] of flares.entries()) {
        const phase = ((time + i * 3400) % 17500) / 17500, active = phase < .23 && wetness < .28;
        sprite.visible = active;
        if (!active) continue;
        const age = phase / .23;
        sprite.position.set(p.x + age * 1.4, p.y + age * 3.2, p.z - age * .75);
        sprite.scale.set(1.3 + age * 2.8, 1.7 + age * 2.7, 1);
        sprite.material.opacity = Math.sin(age * Math.PI) * .27;
      }
      for (const {lamp, site} of panels) {
        const caution = cars.some(c => !c.finished && !c.retired && (c.offtrack || c.sliding) && Math.hypot(c.x - site.x, c.z - site.z) < 135);
        lamp.material.color.set(caution ? '#ffd048' : '#33cf82');
      }
    },
    dispose() {}
  };
  root.userData[prefix + 'Plan'] = plan;
  root.userData[prefix + 'Budget'] = {spectators: crowd.length, trees: trees.length, scrub: grass.length, flags: flags.length,
    tents: tents.length, vehicles: vehicles.length, marshals: panels.length, stones: stones.length, flares: flares.length};
  if (tropical) root.userData[prefix + 'Budget'].palms = palms.length;
  return {crowd, batch};
}
