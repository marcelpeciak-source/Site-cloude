// Fixed full-screen WebGL background: one particle cloud that morphs between shapes
// as the visitor moves through the page. Morph weights, position and brightness are
// tweened with GSAP; everything else happens in the vertex shader.
import * as THREE from 'three';
import { SHAPES, LOGO_WIDTH, buildShapes, sampleText } from './shapes.js';
import { createPostFX } from './postfx.js';

const noise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uRot;
uniform float uW[7];
uniform vec2 uMouse;
uniform float uMouseForce;
uniform float uSize;
uniform float uScatter;
uniform float uAgitation;
uniform float uDim;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

attribute vec3 aKnot;
attribute vec3 aWave;
attribute vec3 aHelix;
attribute vec3 aGalaxy;
attribute vec3 aCube;
attribute vec3 aLogo;
attribute vec4 aRnd;
attribute vec3 aDir;

varying vec3 vColor;
varying float vAlpha;

${noise}

vec3 rotX(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }
vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }

void main() {
  float t = uTime;

  vec3 sphere = rotY(position, uRot);
  vec3 knot = rotX(rotY(aKnot, uRot * 0.8), 0.35 + sin(t * 0.15) * 0.2);

  vec3 wave = aWave;
  wave.y += sin(wave.x * 1.3 + t * 1.1) * 0.24 + cos(wave.z * 1.9 + t * 0.8) * 0.16
          + sin((wave.x + wave.z) * 0.7 - t * 0.6) * 0.12;
  wave = rotX(wave, 0.9);

  vec3 helix = rotX(aHelix, t * 0.45);
  helix = rotY(helix, -0.28);

  vec3 galaxy = rotX(rotY(aGalaxy, uRot * 1.4), 1.05);

  vec3 cube = rotX(rotY(aCube, uRot * 0.9), 0.55 + sin(t * 0.2) * 0.25);

  // The logo faces the camera and ripples gently.
  vec3 logo = aLogo;
  logo.z += sin(logo.x * 1.4 + t * 1.3) * 0.08;

  vec3 p = sphere * uW[0] + knot * uW[1] + wave * uW[2] + helix * uW[3] + galaxy * uW[4]
         + cube * uW[5] + logo * uW[6];

  // Organic drift; stronger while scrolling fast or mid-transition, calmer on the logo
  // so the letters stay legible.
  vec3 q = p * 0.55 + vec3(0.0, 0.0, t * 0.12);
  vec3 drift = vec3(snoise(q), snoise(q + 11.3), snoise(q + 27.1));
  p += drift * ((0.06 - uW[6] * 0.035) + uAgitation * 0.45);

  // Intro: particles start blown out and collapse into the first shape.
  p += aDir * uScatter * (2.5 + aRnd.w * 7.0);

  vec4 world = modelMatrix * vec4(p, 1.0);

  // Pointer pushes particles away in screen-aligned space.
  vec2 dm = world.xy - uMouse;
  float md = length(dm);
  float influence = smoothstep(1.35, 0.0, md) * uMouseForce;
  world.xy += normalize(dm + 1e-4) * influence * 0.6;
  world.z += influence * 0.5;

  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;

  float size = uSize * (0.35 + aRnd.x * aRnd.x * 1.5);
  gl_PointSize = size / -mv.z;

  float h = clamp(aRnd.y * 0.7 + (p.x * 0.08 + p.y * 0.12) + 0.15, 0.0, 1.0);
  vec3 col = mix(uColorA, uColorB, smoothstep(0.1, 0.6, h));
  col = mix(col, uColorC, smoothstep(0.7, 1.0, h));
  vColor = col + influence * 0.45;

  float twinkle = 0.72 + 0.28 * sin(t * 1.7 + aRnd.w * 6.2831);
  vAlpha = (0.22 + 0.78 * aRnd.z) * twinkle * uDim;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = pow(1.0 - d * 2.0, 1.7);
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`;

const BG = 0x07070b;

export function createScene(canvas, { motion }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    return null;
  }
  if (!renderer.getContext()) return null;

  const isSmall = () => window.innerWidth < 820;
  const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  let pixelRatio = maxPixelRatio;
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(BG, 1);

  // Quality ladder, stepped down while the measured frame rate stays low:
  // 0 = everything (post-fx, DPR ≤ 2) → 1 = no post-fx → 2 = DPR 1 → 3 = 60% of the particles.
  // Phones start at 1 (battery, high-DPR fill rate). ?quality=max pins level 0 (screenshots,
  // strong GPUs), ?quality=low starts at level 3.
  const forcedQuality = new URLSearchParams(window.location.search).get('quality');
  let quality = { max: 0, low: 3 }[forcedQuality] ?? (isSmall() ? 1 : 0);

  let post = null;
  if (quality === 0) {
    try {
      post = createPostFX(renderer, { bloom: 0.9 });
    } catch (err) {
      console.warn('Post-processing niedostępny:', err);
    }
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

  const count = isSmall() ? 10000 : 22000;
  const data = buildShapes(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.sphere, 3));
  geometry.setAttribute('aKnot', new THREE.BufferAttribute(data.knot, 3));
  geometry.setAttribute('aWave', new THREE.BufferAttribute(data.wave, 3));
  geometry.setAttribute('aHelix', new THREE.BufferAttribute(data.helix, 3));
  geometry.setAttribute('aGalaxy', new THREE.BufferAttribute(data.galaxy, 3));
  geometry.setAttribute('aCube', new THREE.BufferAttribute(data.cube, 3));
  geometry.setAttribute('aLogo', new THREE.BufferAttribute(data.logo, 3));
  geometry.setAttribute('aRnd', new THREE.BufferAttribute(data.rnd, 4));
  geometry.setAttribute('aDir', new THREE.BufferAttribute(data.dir, 3));
  // Morphs move points far outside the sphere's bounds; skip frustum culling.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);

  const uniforms = {
    uTime: { value: 0 },
    uRot: { value: 0 },
    uW: { value: [1, 0, 0, 0, 0, 0, 0] },
    uMouse: { value: new THREE.Vector2(99, 99) },
    uMouseForce: { value: 0 },
    uSize: { value: 30 },
    uScatter: { value: motion ? 1 : 0 },
    uAgitation: { value: 0 },
    uDim: { value: 1 },
    uColorA: { value: new THREE.Color('#8b6cff') },
    uColorB: { value: new THREE.Color('#3de3d0') },
    uColorC: { value: new THREE.Color('#ffb36b') },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // Tweened state (GSAP writes here, the render loop reads it).
  const state = {
    w0: 1, w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, w6: 0,
    x: 0, y: 0, scale: 1, dim: 1,
    agitation: 0,
    anchorMix: 0,
  };

  // Optional DOM anchor: the cloud follows an element on screen (e.g. the footer wordmark),
  // matching its centre and text width. `anchorMix` blends between free and anchored.
  let anchorEl = null;
  let anchorWidth = 0;

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false, force: 0 };
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  let velocity = 0;
  let rot = 0;
  let time = 0;
  let current = null;
  const bufferSize = new THREE.Vector2();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (post) {
      renderer.getDrawingBufferSize(bufferSize);
      post.setSize(bufferSize.x, bufferSize.y);
    }
    camera.aspect = w / h;
    // Pull the camera back on portrait screens so shapes still fit.
    camera.position.z = camera.aspect < 1 ? 7 + (1 - camera.aspect) * 8.5 : 7;
    camera.updateProjectionMatrix();
    uniforms.uSize.value = 30 * pixelRatio * (camera.position.z / 7) * (isSmall() ? 0.85 : 1);
    measureAnchor();
    if (current) go(current, true);
    requestRender();
  }

  function go(cfg, immediate = false) {
    current = cfg;
    const idx = Math.max(0, SHAPES.indexOf(cfg.shape));
    const small = isSmall();
    const target = {
      x: small ? 0 : cfg.x ?? 0,
      y: small ? cfg.mobileY ?? cfg.y ?? 0 : cfg.y ?? 0,
      scale: (cfg.scale ?? 1) * (small ? 0.92 : 1),
      dim: cfg.dim ?? 1,
      anchorMix: cfg.anchor ? 1 : 0,
    };
    SHAPES.forEach((_, i) => { target[`w${i}`] = i === idx ? 1 : 0; });
    if (cfg.anchor && cfg.anchor !== anchorEl) {
      anchorEl = cfg.anchor;
      measureAnchor();
    }

    const gsap = window.gsap;
    if (immediate || !motion || !gsap) {
      Object.assign(state, target);
      requestRender();
      return;
    }
    gsap.to(state, { ...target, duration: 2.1, ease: 'expo.inOut', overwrite: 'auto' });
    // A little swirl while the cloud reorganises itself.
    gsap.timeline({ overwrite: false })
      .to(state, { agitation: 0.9, duration: 0.9, ease: 'power2.out' })
      .to(state, { agitation: 0, duration: 1.4, ease: 'power2.inOut' });
  }

  function measureAnchor() {
    if (!anchorEl) return;
    // Width of the rendered text (not the block), so the particle logo matches the glyphs.
    const range = document.createRange();
    range.selectNodeContents(anchorEl);
    anchorWidth = range.getBoundingClientRect().width || anchorEl.getBoundingClientRect().width;
  }

  function worldPerPixel() {
    const halfH = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return (2 * halfH) / window.innerHeight;
  }

  // Replaces the logo target with `text` sampled from the (loaded) display font.
  function setLogo(text) {
    const pts = sampleText(text, count);
    if (!pts) return false;
    const attr = geometry.getAttribute('aLogo');
    attr.array.set(pts);
    attr.needsUpdate = true;
    requestRender();
    return true;
  }

  // Temporarily show another configuration (e.g. behind the open menu), then restore.
  let beforePeek = null;
  function peek(cfg) {
    if (!beforePeek) beforePeek = current;
    go(cfg);
  }
  function unpeek() {
    if (!beforePeek) return;
    const cfg = beforePeek;
    beforePeek = null;
    go(cfg);
  }

  // Short swirl of the whole cloud, e.g. to celebrate a sent form.
  function burst() {
    const gsap = window.gsap;
    if (!motion || !gsap) return;
    gsap.timeline()
      .to(state, { agitation: 1.4, duration: 0.35, ease: 'power3.out' })
      .to(state, { agitation: 0, duration: 1.8, ease: 'power2.inOut' });
  }

  function intro() {
    const gsap = window.gsap;
    if (!motion || !gsap) { uniforms.uScatter.value = 0; requestRender(); return; }
    gsap.to(uniforms.uScatter, { value: 0, duration: 3.2, ease: 'expo.out' });
    measuring = forcedQuality !== 'max';
  }

  function onPointerMove(e) {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    pointer.active = true;
  }
  function onPointerLeave() { pointer.active = false; }

  if (motion) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
  }
  window.addEventListener('resize', resize);

  // --- Render loop -------------------------------------------------------
  let last = performance.now();
  let needsRender = true;
  let frames = 0;
  let sampleTime = 0;
  let measuring = false; // starts after the intro, so preloader work doesn't skew it
  let lastFps = 0; // fps measured before the last step down

  function requestRender() { needsRender = true; }

  function setQuality(level) {
    quality = level;
    pixelRatio = level >= 2 ? 1 : maxPixelRatio;
    renderer.setPixelRatio(pixelRatio);
    geometry.setDrawRange(0, level >= 3 ? Math.floor(count * 0.6) : Infinity);
    resize();
  }

  function render() {
    if (post && quality < 1) {
      post.uniforms.uAberration.value = 0.0025 + Math.min(Math.abs(velocity) * 0.0008, 0.025);
      post.render(scene, camera);
    } else {
      renderer.render(scene, camera);
    }
  }

  function applyState() {
    const w = uniforms.uW.value;
    w[0] = state.w0; w[1] = state.w1; w[2] = state.w2; w[3] = state.w3;
    w[4] = state.w4; w[5] = state.w5; w[6] = state.w6;

    let { x, y, scale } = state;
    const m = state.anchorMix;
    if (anchorEl && m > 0.001) {
      const r = anchorEl.getBoundingClientRect();
      const k = worldPerPixel();
      const ax = (r.left + r.width / 2 - window.innerWidth / 2) * k;
      const ay = -(r.top + r.height / 2 - window.innerHeight / 2) * k;
      const as = (anchorWidth * k) / LOGO_WIDTH;
      x += (ax - x) * m;
      y += (ay - y) * m;
      scale += (as - scale) * m;
    }
    group.position.set(x, y, 0);
    group.scale.setScalar(scale);
    uniforms.uDim.value = state.dim;
    uniforms.uAgitation.value = Math.min(1.2, state.agitation + Math.min(Math.abs(velocity) * 0.012, 0.5));
    uniforms.uRot.value = rot;
    uniforms.uTime.value = time;
  }

  function tick() {
    requestAnimationFrame(tick);
    const now = performance.now();
    const rawDt = (now - last) / 1000;
    const dt = Math.min(rawDt, 0.05);
    last = now;

    if (!motion) {
      if (!needsRender) return;
      applyState();
      render();
      needsRender = false;
      return;
    }

    time += dt;
    velocity *= 0.92;
    rot += dt * (0.1 + Math.min(Math.abs(velocity) * 0.004, 0.6));

    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    pointer.force += ((pointer.active ? 1 : 0) - pointer.force) * 0.05;

    ndc.set(pointer.x, pointer.y);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.set(hit.x, hit.y);
    uniforms.uMouseForce.value = pointer.force;

    // Subtle parallax tilt towards the pointer.
    group.rotation.x += (-pointer.y * 0.12 - group.rotation.x) * 0.04;
    group.rotation.y += (pointer.x * 0.2 - group.rotation.y) * 0.04;

    applyState();
    render();

    // Adaptive quality: measure in 2.5 s windows and step down the ladder while it's slow.
    // A step that doesn't raise the frame rate means the device is capped (30 Hz screen,
    // low-power mode), not overloaded — undo it and stop. Long gaps (background tab) are ignored.
    if (measuring && rawDt < 0.5) {
      frames++;
      sampleTime += rawDt;
      if (sampleTime > 2.5) {
        const fps = frames / sampleTime;
        frames = 0;
        sampleTime = 0;
        if (lastFps && fps < lastFps * 1.15) {
          setQuality(quality - 1);
          measuring = false;
        } else if (fps < 40 && quality < 3) {
          lastFps = fps;
          setQuality(quality + 1);
        } else {
          measuring = false;
        }
      }
    }
  }

  setQuality(quality);
  tick();

  return {
    go,
    peek,
    unpeek,
    burst,
    intro,
    setLogo,
    setVelocity(v) { velocity = v; },
    resize,
    get quality() { return quality; },
  };
}
