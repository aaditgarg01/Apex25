import * as THREE from '/vendor/three.module.js';
import {YASMARINA_LIGHTING} from './data/yasmarina-lighting.js';

export function createYasMarinaSky(generator, scene) {
  const uniforms = {
    zenith: {value: new THREE.Color()},
    horizon: {value: new THREE.Color()},
    ground: {value: new THREE.Color('#161924')},
    sunDirection: {value: new THREE.Vector3()},
    sunStrength: {value: 0},
    starStrength: {value: 0}
  };
  const material = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, depthTest: false, toneMapped: false,
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = position;
        vec4 projected = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
        gl_Position = projected.xyww;
      }`,
    fragmentShader: `
      uniform vec3 zenith, horizon, ground, sunDirection;
      uniform float sunStrength, starStrength;
      varying vec3 direction;
      void main() {
        vec3 ray = normalize(direction);
        vec3 color = mix(horizon, zenith, pow(max(0.0, ray.y), 0.62));
        color = mix(color, ground, smoothstep(0.0, 0.29, -ray.y));
        float sun = max(0.0, dot(ray, sunDirection));
        color += vec3(1.0, .48, .20) * (pow(sun, 115.0) * .49 + pow(sun, 14000.0)) * sunStrength;
        vec2 uv = vec2(atan(ray.z, ray.x), asin(ray.y)) * vec2(105.0, 105.0);
        float seed = fract(sin(dot(floor(uv), vec2(127.1, 311.7))) * 43758.5453);
        float star = (1.0 - smoothstep(.045, .15, length(fract(uv) - .5))) * step(.982, seed);
        color += vec3(.61, .76, .91) * star * starStrength * smoothstep(.08, .35, ray.y);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), material);
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);

  // Bake one neutral reflection probe. Direct lights and the visible sky can
  // then fade every frame without rebuilding a GPU environment map mid-race.
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#324761');
  gradient.addColorStop(.49, '#8f8191');
  gradient.addColorStop(1, '#201d2b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const source = new THREE.CanvasTexture(canvas);
  source.colorSpace = THREE.SRGBColorSpace;
  source.mapping = THREE.EquirectangularReflectionMapping;
  const environment = generator.fromEquirectangular(source);
  source.dispose();
  const frames = YASMARINA_LIGHTING.keyframes.map(frame => ({
    phase: frame.phase, top: new THREE.Color(frame.top), horizon: new THREE.Color(frame.horizon)
  }));
  const rainColor = new THREE.Color('#677286');
  return {
    set(phase, wetness) {
      const index = phase < frames[1].phase ? 0 : 1;
      const a = frames[index], b = frames[index + 1], blend = (phase - a.phase) / (b.phase - a.phase);
      uniforms.zenith.value.copy(a.top).lerp(b.top, blend).lerp(rainColor, wetness * .35);
      uniforms.horizon.value.copy(a.horizon).lerp(b.horizon, blend).lerp(rainColor, wetness * .35);
      uniforms.sunDirection.value.set(-280, Math.max(-26, 60 - phase * 145), -80).normalize();
      uniforms.sunStrength.value = Math.max(0, 1 - phase / .65) * (1 - wetness);
      uniforms.starStrength.value = Math.max(0, phase - .4) * (1 - wetness);
      sky.visible = true;
      scene.background = null;
      scene.environment = environment.texture;
      scene.environmentIntensity = (.57 - phase * .23) * (1 - wetness * .16);
      scene.fog?.color.copy(uniforms.horizon.value);
    },
    hide() {
      sky.visible = false;
    }
  };
}
