// Point-cloud targets for the particle morph. Every shape has the same point count, so
// point i of one shape morphs into point i of the next. Points are generated in a
// roughly ordered way (along a curve / latitude), which makes morphs read as flows
// rather than random noise.

export const SHAPES = ['sphere', 'knot', 'wave', 'helix', 'galaxy'];

const TAU = Math.PI * 2;

function gaussian() {
  // Box–Muller
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

function sphere(out, i, count) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (i / (count - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = golden * i;
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
function knot(out, i, count) {
  const u = (i / count) * TAU * 2;
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

function wave(out, i, count) {
  // Flat grid in the XZ plane; the vertex shader animates and tilts it.
  const cols = Math.ceil(Math.sqrt(count * 1.9));
  const rows = Math.ceil(count / cols);
  const c = i % cols;
  const r = Math.floor(i / cols);
  out[i * 3] = (c / (cols - 1) - 0.5) * 10 + (Math.random() - 0.5) * 0.02;
  out[i * 3 + 1] = 0;
  out[i * 3 + 2] = (r / Math.max(rows - 1, 1) - 0.5) * 5.2 + (Math.random() - 0.5) * 0.02;
}

function helix(out, i, count) {
  // Horizontal double helix with rungs; the shader spins it around the X axis.
  const radius = 0.85;
  const length = 10;
  const turns = 1.55;
  if (i % 6 !== 0) {
    const t = i / count;
    const x = (t - 0.5) * length;
    const strand = i % 2;
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

function galaxy(out, i) {
  // Spiral disc in the XZ plane; the shader spins it and tilts it towards the camera.
  const arms = 3;
  const maxR = 3.4;
  const r = Math.pow(Math.random(), 1.35) * maxR;
  const arm = (i % arms) / arms;
  const spin = r * 1.15;
  const spread = Math.pow(Math.random(), 2.2) * (0.25 + r * 0.22);
  const a = arm * TAU + spin + (Math.random() - 0.5) * 0.35;
  const off = Math.random() * TAU;
  out[i * 3] = Math.cos(a) * r + Math.cos(off) * spread;
  out[i * 3 + 1] = gaussian() * 0.09 * (1 - r / maxR) + (Math.random() - 0.5) * 0.04;
  out[i * 3 + 2] = Math.sin(a) * r + Math.sin(off) * spread;
}

export function buildShapes(count) {
  const data = {
    sphere: new Float32Array(count * 3),
    knot: new Float32Array(count * 3),
    wave: new Float32Array(count * 3),
    helix: new Float32Array(count * 3),
    galaxy: new Float32Array(count * 3),
    rnd: new Float32Array(count * 4),
    dir: new Float32Array(count * 3),
  };

  for (let i = 0; i < count; i++) {
    sphere(data.sphere, i, count);
    knot(data.knot, i, count);
    wave(data.wave, i, count);
    helix(data.helix, i, count);
    galaxy(data.galaxy, i, count);

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

  return data;
}
