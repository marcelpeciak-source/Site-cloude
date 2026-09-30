// "Realizacje": every project cover is painted by a fragment shader (no image files).
// Fine pointer + motion: a floating WebGL preview follows the cursor over the list, dissolves
// between covers and smears with pointer velocity. Otherwise the same shader renders static
// thumbnails once (then the context is released) and the list becomes a grid of cards.
import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uFrom;
uniform float uTo;
uniform float uMix;
uniform vec2 uVel;
uniform float uReveal;
uniform float uAspect;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// 01 Aurora — fintech: northern lights over a night sky.
vec3 aurora(vec2 uv, float t) {
  vec3 col = mix(vec3(0.02, 0.02, 0.07), vec3(0.07, 0.03, 0.16), uv.y);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float y = 0.3 + 0.17 * fi + 0.1 * sin(uv.x * 2.4 + t * 0.5 + fi * 1.7) + 0.08 * fbm(vec2(uv.x * 3.0 + t * 0.15, fi * 3.1));
    float band = exp(-pow((uv.y - y) * (6.0 + fi * 2.5), 2.0));
    vec3 c = mix(vec3(0.24, 0.89, 0.82), vec3(0.55, 0.42, 1.0), fi / 2.0);
    col += c * band * (0.7 + 0.3 * sin(uv.x * 11.0 + t * 1.3 + fi));
  }
  vec2 cell = floor(uv * vec2(150.0 * uAspect, 150.0));
  float star = step(0.994, hash(cell)) * (0.5 + 0.5 * sin(t * 3.0 + hash(cell) * 40.0));
  return col + star * 0.7;
}

// 02 Monolit — architecture: a black slab and a low sun mirrored in still water.
vec3 monolit(vec2 uv, float t) {
  vec2 p = uv - 0.5;
  p.x *= uAspect;
  float horizon = -0.16;
  bool water = p.y < horizon;
  vec2 q = p;
  if (water) {
    q.y = 2.0 * horizon - p.y;
    q.x += sin(p.y * 90.0 + t * 2.2) * 0.006 * (horizon - p.y) * 6.0;
  }
  vec3 col = mix(vec3(0.95, 0.52, 0.36), vec3(0.99, 0.88, 0.74), smoothstep(horizon, 0.5, q.y));
  vec2 sun = vec2(0.3 * sin(t * 0.22), 0.06);
  col = mix(col, vec3(1.0, 0.96, 0.88), smoothstep(0.17, 0.165, length(q - sun)));
  float slab = step(abs(q.x), 0.085) * step(q.y, 0.3) * step(horizon, q.y);
  vec3 stone = mix(vec3(0.04, 0.035, 0.04), vec3(0.2, 0.15, 0.14), smoothstep(-0.085, 0.085, q.x * -sign(sun.x)));
  col = mix(col, stone, slab);
  if (water) col = mix(col, vec3(0.09, 0.06, 0.08), 0.55);
  return col;
}

// 03 Halo — cosmetics: glossy pastel metaballs.
vec3 halo(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
  float f = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 c = vec2(0.34 * sin(t * (0.33 + fi * 0.07) + fi * 2.1), 0.2 * cos(t * (0.29 + fi * 0.05) + fi * 1.3));
    f += (0.011 + 0.004 * fi) / max(dot(p - c, p - c), 1e-4);
  }
  vec3 bg = mix(vec3(0.99, 0.87, 0.82), vec3(0.92, 0.83, 0.98), uv.y);
  float m = smoothstep(0.95, 1.05, f);
  vec3 blob = mix(vec3(1.0, 0.6, 0.5), vec3(1.0, 0.97, 0.95), smoothstep(1.3, 4.5, f));
  blob = mix(blob, vec3(0.6, 0.5, 1.0), smoothstep(0.35, -0.35, p.x + p.y) * 0.45);
  vec3 col = mix(bg, blob, m);
  col *= 1.0 - 0.12 * smoothstep(0.45, 0.95, f) * (1.0 - m);
  return col;
}

// 04 Pulse — e-mobility: a neon tunnel rushing forward.
vec3 pulse(vec2 uv, float t) {
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
  float r = length(p) + 1e-3;
  float a = atan(p.y, p.x);
  float z = 0.35 / r + t * 1.2;
  float rings = pow(0.5 + 0.5 * sin(z * 12.0), 18.0);
  float spokes = pow(0.5 + 0.5 * sin(a * 10.0 + z * 0.7), 30.0);
  vec3 hot = mix(vec3(1.0, 0.7, 0.42), vec3(0.24, 0.89, 0.82), 0.5 + 0.5 * sin(z * 0.8));
  vec3 col = vec3(0.01, 0.01, 0.03);
  col += hot * rings * smoothstep(0.0, 0.5, r) * 1.6;
  col += vec3(0.55, 0.42, 1.0) * spokes * smoothstep(0.05, 0.6, r) * 0.6;
  col += vec3(1.0, 0.8, 0.6) * 0.015 / r;
  return col;
}

vec3 cover(float id, vec2 uv) {
  float t = uTime + id * 7.0;
  if (id < 0.5) return aurora(uv, t);
  if (id < 1.5) return monolit(uv, t);
  if (id < 2.5) return halo(uv, t);
  return pulse(uv, t);
}

vec3 frame(vec2 uv, float m) {
  vec3 to = cover(uTo, uv);
  if (m > 0.999) return to;
  return mix(cover(uFrom, uv), to, m);
}

void main() {
  vec2 uv = vUv;
  float speed = length(uVel);

  // Liquid smear in the direction of travel + slight zoom while revealing.
  uv += uVel * 0.08 * sin(uv.yx * 3.14159 + uTime * 2.0);
  uv = (uv - 0.5) * (1.0 - 0.18 * (1.0 - uReveal)) + 0.5;

  // Noise dissolve between the previous and the next cover.
  float n = fbm(vUv * 3.0 + uTime * 0.1);
  float m = smoothstep(n - 0.12, n + 0.12, uMix * 1.24 - 0.12);

  vec3 col;
  if (speed < 0.01) {
    col = frame(uv, m);
  } else {
    vec2 shift = uVel * 0.02;
    col = vec3(frame(uv + shift, m).r, frame(uv, m).g, frame(uv - shift, m).b);
  }

  vec2 c = (vUv - 0.5) * vec2(uAspect, 1.0);
  col *= 1.0 - 0.28 * dot(c, c);
  col += (hash(vUv * 900.0 + fract(uTime)) - 0.5) * 0.045;

  float d = length(c);
  float mask = smoothstep(-0.03, 0.03, uReveal * 0.98 - d * 0.9);
  gl_FragColor = vec4(col * mask, mask);
}
`;

function createCoverRenderer(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  const uniforms = {
    uTime: { value: 0 },
    uFrom: { value: 0 },
    uTo: { value: 0 },
    uMix: { value: 1 },
    uVel: { value: new THREE.Vector2() },
    uReveal: { value: 0 },
    uAspect: { value: 1.5 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthTest: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.Camera();
  return {
    renderer,
    uniforms,
    render: () => renderer.render(scene, camera),
    dispose: () => {
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

export function initWork({ motion, finePointer }) {
  const section = document.querySelector('.work');
  if (!section) return;
  const list = section.querySelector('.work__list');
  const items = [...section.querySelectorAll('.work__item')];

  if (motion && finePointer) {
    if (initPreview(list, items)) return;
  }
  renderThumbnails(items);
}

function renderThumbnails(items) {
  const canvas = document.createElement('canvas');
  const gl = createCoverRenderer(canvas);
  if (!gl) return; // CSS gradients (--c1/--c2) stay as the fallback
  const w = 720;
  const h = 450;
  gl.renderer.setPixelRatio(1);
  gl.renderer.setSize(w, h, false);
  const u = gl.uniforms;
  u.uAspect.value = w / h;
  u.uReveal.value = 1;
  u.uMix.value = 1;
  items.forEach((item, i) => {
    u.uFrom.value = i;
    u.uTo.value = i;
    u.uTime.value = 2.5;
    gl.render();
    const thumb = item.querySelector('.work__thumb');
    if (thumb) thumb.style.backgroundImage = `url(${canvas.toDataURL('image/jpeg', 0.86)})`;
  });
  gl.dispose();
}

function initPreview(list, items) {
  const { gsap } = window;
  const canvas = document.createElement('canvas');
  canvas.className = 'work-preview';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = createCoverRenderer(canvas);
  if (!gl) return false;
  document.body.appendChild(canvas);
  document.documentElement.classList.add('work-has-preview');

  const W = 440;
  const H = 300;
  gl.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  gl.renderer.setSize(W, H, false);
  const u = gl.uniforms;
  u.uAspect.value = W / H;

  // Cursor sits near the preview's left edge, so the hovered project name stays readable.
  gsap.set(canvas, { xPercent: -16, yPercent: -55, x: -W, y: -H });
  const xTo = gsap.quickTo(canvas, 'x', { duration: 0.65, ease: 'power3' });
  const yTo = gsap.quickTo(canvas, 'y', { duration: 0.65, ease: 'power3' });

  let active = -1;
  let visible = false;
  let lastX = null;
  let lastY = null;
  const vel = { x: 0, y: 0 };

  function tick(time, deltaMs) {
    const x = gsap.getProperty(canvas, 'x');
    const y = gsap.getProperty(canvas, 'y');
    if (lastX !== null) {
      const f = 16.7 / Math.max(deltaMs, 1);
      vel.x += ((x - lastX) * f - vel.x) * 0.2;
      vel.y += ((y - lastY) * f - vel.y) * 0.2;
    }
    lastX = x;
    lastY = y;
    const vx = gsap.utils.clamp(-1, 1, vel.x * 0.02);
    const vy = gsap.utils.clamp(-1, 1, -vel.y * 0.02);
    u.uVel.value.set(vx, vy);
    u.uTime.value = time;
    gsap.set(canvas, { rotation: gsap.utils.clamp(-10, 10, vel.x * 0.25) });
    gl.render();
    if (!visible && u.uReveal.value <= 0.001) {
      gsap.ticker.remove(tick);
      lastX = null;
    }
  }

  function show(index) {
    if (index !== active) {
      // Start the dissolve from whatever is currently most visible.
      u.uFrom.value = u.uMix.value > 0.5 ? u.uTo.value : u.uFrom.value;
      u.uTo.value = index;
      u.uMix.value = visible ? 0 : 1;
      gsap.to(u.uMix, { value: 1, duration: 0.9, ease: 'power2.out', overwrite: true });
      active = index;
    }
    if (!visible) {
      visible = true;
      gsap.ticker.add(tick);
      gsap.to(u.uReveal, { value: 1, duration: 0.9, ease: 'expo.out', overwrite: true });
    }
  }

  function hide() {
    visible = false;
    active = -1;
    list.classList.remove('is-hovering');
    items.forEach((it) => it.classList.remove('is-active'));
    gsap.to(u.uReveal, { value: 0, duration: 0.5, ease: 'power2.in', overwrite: true });
  }

  items.forEach((item, i) => {
    item.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      list.classList.add('is-hovering');
      items.forEach((it) => it.classList.toggle('is-active', it === item));
      show(i);
    });
  });
  list.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); });
  list.addEventListener('pointerenter', (e) => {
    // Jump into place on entry instead of flying in from the previous spot.
    if (!visible) {
      xTo(e.clientX, e.clientX);
      yTo(e.clientY, e.clientY);
    }
  });
  list.addEventListener('pointerleave', hide);
  return true;
}
