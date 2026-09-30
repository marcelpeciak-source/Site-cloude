// Point-cloud targets for the particle morph. Every shape has the same point count, so
// point i of one shape morphs into point i of the next. Points are generated in a
// roughly ordered way (along a curve / latitude), which makes morphs read as flows
// rather than random noise.

export const SHAPES = ['sphere', 'knot', 'wave', 'helix', 'galaxy', 'cube', 'logo'];

// World-space width of the particle logo before the scene scales it to its DOM anchor.
export const LOGO_WIDTH = 6;

const TAU = Math.PI * 2;

// Point i is generated as the k-th point of each shape, with k a fixed permutation of i.
// Shapes stay consistently ordered (smooth morphs), yet any prefix of the buffer is an even
// subsample — so drawRange can drop particles on slow devices without cutting shapes in half.
function strideFor(count) {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let stride = 7919;
  while (gcd(stride, count) !== 1) stride += 2;
  return stride;
}

function gaussian() {
  // Box–Muller
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

function sphere(out, i, k, count) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (k / (count - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = golden * k;
  // Mostly a crisp shell, with a faint inner volume.
  const R = 1.5 * (Math.random() < 0.86 ? 1 + (Math.random() - 0.5) * 0.035 : Math.cbrt(Math.random()) * 0.92);
  out[i * 3] = Math.cos(theta) * r * R;
  out[i * 3 + 1] = y * R;
  out[i * 3 + 2] = Math.sin(theta) * r * R;
}

function knotCurve(u, target) {
  // Same parametrisation as THREE.TorusKnotGeometry (p = 2, q = 3).
  const p = 2;
  const q = 3;
  const R = 1.22;
  const quOverP = (q / p) * u;
  const cs = Math.cos(quOverP);
  target[0] = R * (2 + cs) * 0.5 * Math.cos(u);
  target[1] = R * (2 + cs) * 0.5 * Math.sin(u);
  target[2] = R * Math.sin(quOverP) * 0.5;
  return target;
}

const k1 = [0, 0, 0];
const k2 = [0, 0, 0];
function knot(out, i, k, count) {
  const u = (k / count) * TAU * 2;
  knotCurve(u, k1);
  knotCurve(u + 0.01, k2);
  // Frenet-ish frame (as in TorusKnotGeometry)
  let tx = k2[0] - k1[0], ty = k2[1] - k1[1], tz = k2[2] - k1[2];
  let nx = k2[0] + k1[0], ny = k2[1] + k1[1], nz = k2[2] + k1[2];
  let bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
  let l = Math.hypot(bx, by, bz); bx /= l; by /= l; bz /= l;
  nx = by * tz - bz * ty; ny = bz * tx - bx * tz; nz = bx * ty - by * tx;
  l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;

  const a = Math.random() * TAU;
  const tube = 0.3 * (Math.random() < 0.8 ? 0.92 + Math.random() * 0.08 : Math.sqrt(Math.random()));
  const ca = Math.cos(a) * tube;
  const sa = Math.sin(a) * tube;
  out[i * 3] = k1[0] + ca * nx + sa * bx;
  out[i * 3 + 1] = k1[1] + ca * ny + sa * by;
  out[i * 3 + 2] = k1[2] + ca * nz + sa * bz;
}

function wave(out, i, k, count) {
  // Flat grid in the XZ plane; the vertex shader animates and tilts it.
  const cols = Math.ceil(Math.sqrt(count * 1.9));
  const rows = Math.ceil(count / cols);
  const c = k % cols;
  const r = Math.floor(k / cols);
  out[i * 3] = (c / (cols - 1) - 0.5) * 10 + (Math.random() - 0.5) * 0.02;
  out[i * 3 + 1] = 0;
  out[i * 3 + 2] = (r / Math.max(rows - 1, 1) - 0.5) * 5.2 + (Math.random() - 0.5) * 0.02;
}

function helix(out, i, k, count) {
  // Horizontal double helix with rungs; the shader spins it around the X axis.
  const radius = 0.85;
  const length = 10;
  const turns = 1.55;
  if (k % 6 !== 0) {
    const t = k / count;
    const x = (t - 0.5) * length;
    const strand = k % 2;
    const a = x * turns + strand * Math.PI;
    const j = 0.07;
    out[i * 3] = x + gaussian() * j * 0.5;
    out[i * 3 + 1] = Math.cos(a) * radius + gaussian() * j;
    out[i * 3 + 2] = Math.sin(a) * radius + gaussian() * j;
  } else {
    const rungs = 46;
    const k = Math.floor(Math.random() * rungs);
    const x = (k / (rungs - 1) - 0.5) * length;
    const a = x * turns;
    const s = Math.random() * 2 - 1;
    out[i * 3] = x + (Math.random() - 0.5) * 0.03;
    out[i * 3 + 1] = Math.cos(a) * radius * s;
    out[i * 3 + 2] = Math.sin(a) * radius * s;
  }
}

function galaxy(out, i, k) {
  // Spiral disc in the XZ plane; the shader spins it and tilts it towards the camera.
  const arms = 3;
  const maxR = 3.4;
  const r = Math.pow(Math.random(), 1.35) * maxR;
  const arm = (k % arms) / arms;
  const spin = r * 1.15;
  const spread = Math.pow(Math.random(), 2.2) * (0.25 + r * 0.22);
  const a = arm * TAU + spin + (Math.random() - 0.5) * 0.35;
  const off = Math.random() * TAU;
  out[i * 3] = Math.cos(a) * r + Math.cos(off) * spread;
  out[i * 3 + 1] = gaussian() * 0.09 * (1 - r / maxR) + (Math.random() - 0.5) * 0.04;
  out[i * 3 + 2] = Math.sin(a) * r + Math.sin(off) * spread;
}

function cube(out, i, k) {
  // Wireframe-ish cube: most points on the 12 edges, the rest sparsely on the faces.
  const h = 1.15;
  const r = Math.random;
  let x, y, z;
  if (k % 5 !== 0) {
    const edge = k % 12;
    const t = (r() * 2 - 1) * h;
    const a = edge & 1 ? h : -h;
    const b = edge & 2 ? h : -h;
    const axis = Math.floor(edge / 4);
    if (axis === 0) { x = t; y = a; z = b; }
    else if (axis === 1) { x = a; y = t; z = b; }
    else { x = a; y = b; z = t; }
    const j = 0.025;
    x += gaussian() * j; y += gaussian() * j; z += gaussian() * j;
  } else {
    const face = Math.floor(r() * 6);
    const u = (r() * 2 - 1) * h;
    const v = (r() * 2 - 1) * h;
    const s = face & 1 ? h : -h;
    if (face < 2) { x = s; y = u; z = v; }
    else if (face < 4) { x = u; y = s; z = v; }
    else { x = u; y = v; z = s; }
  }
  out[i * 3] = x;
  out[i * 3 + 1] = y;
  out[i * 3 + 2] = z;
}

// Samples filled pixels of `text` rendered on a 2D canvas. Needs the font to be loaded.
// Points come out row by row (top to bottom), matching the sphere's latitude ordering,
// so the sphere → logo morph reads as a vertical flow.
export function sampleText(text, count, { font = '"Syne Variable", sans-serif', weight = 800, tracking = -0.06 } = {}) {
  const W = 1600;
  const H = 420;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let size = 320;
  const setFont = () => {
    ctx.font = `${weight} ${size}px ${font}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${tracking * size}px`;
  };
  setFont();
  size = Math.floor(size * Math.min(1, (W * 0.94) / ctx.measureText(text).width));
  setFont();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, H / 2);

  const { data } = ctx.getImageData(0, 0, W, H);
  const step = 2;
  const px = [];
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      if (data[(y * W + x) * 4 + 3] > 140) {
        px.push(x, y);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const n = px.length / 2;
  if (!n) return null;

  const scale = LOGO_WIDTH / Math.max(1, maxX - minX);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const out = new Float32Array(count * 3);
  const stride = strideFor(count);
  for (let i = 0; i < count; i++) {
    const k = (i * stride) % count;
    const j = Math.min(n - 1, Math.floor((k / count) * n));
    out[i * 3] = (px[j * 2] + (Math.random() - 0.5) * step - cx) * scale;
    out[i * 3 + 1] = -(px[j * 2 + 1] + (Math.random() - 0.5) * step - cy) * scale;
    out[i * 3 + 2] = gaussian() * 0.05;
  }
  return out;
}

export function buildShapes(count) {
  const data = {
    sphere: new Float32Array(count * 3),
    knot: new Float32Array(count * 3),
    wave: new Float32Array(count * 3),
    helix: new Float32Array(count * 3),
    galaxy: new Float32Array(count * 3),
    cube: new Float32Array(count * 3),
    logo: new Float32Array(count * 3),
    rnd: new Float32Array(count * 4),
    dir: new Float32Array(count * 3),
  };

  const stride = strideFor(count);
  for (let i = 0; i < count; i++) {
    const k = (i * stride) % count;
    sphere(data.sphere, i, k, count);
    knot(data.knot, i, k, count);
    wave(data.wave, i, k, count);
    helix(data.helix, i, k, count);
    galaxy(data.galaxy, i, k);
    cube(data.cube, i, k);

    data.rnd[i * 4] = Math.random(); // size
    data.rnd[i * 4 + 1] = Math.random(); // colour
    data.rnd[i * 4 + 2] = Math.random(); // alpha
    data.rnd[i * 4 + 3] = Math.random(); // phase

    // Random unit vector, used for the intro "big bang" and transition bursts.
    const z = Math.random() * 2 - 1;
    const t = Math.random() * TAU;
    const s = Math.sqrt(1 - z * z);
    data.dir[i * 3] = Math.cos(t) * s;
    data.dir[i * 3 + 1] = Math.sin(t) * s;
    data.dir[i * 3 + 2] = z;
  }

  // Until the web font is ready the logo target is just the sphere.
  data.logo.set(data.sphere);
  return data;
}
