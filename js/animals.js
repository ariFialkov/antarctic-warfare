// Animal soldiers: smooth lofted bodies skinned to real skeletons, with blended procedural
// animation (idle / move / slide / swim / aim / recoil / flinch / death) and two-handed weapon IK.
import * as THREE from '../vendor/three.module.min.js';
import { G } from './kit.js';
import { FACTIONS, WEAPONS, clamp, lerp, smooth } from './data.js';
import { weaponMesh, animateWeapon } from './models.js';

const MAT = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 26, specular: 0x26323f });
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), IDQ = new THREE.Quaternion();
const paint = { c: new THREE.Color(), t: new THREE.Color(), set(h) { this.c.set(h); return this; }, mix(h, w) { if (w > 0) this.c.lerp(this.t.set(h), Math.min(1, w)); return this; } };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
const noise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v); return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), su), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), su), sv); };
// skin weights that blend between bones along one axis: stops = [[coord, bone], ...]
const along = (ax, stops) => p => { const v = p[ax]; if (v <= stops[0][0]) return [stops[0][1], stops[0][1], 0]; for (let i = 0; i < stops.length - 1; i++) if (v <= stops[i + 1][0]) return [stops[i][1], stops[i + 1][1], smooth((v - stops[i][0]) / (stops[i + 1][0] - stops[i][0]))]; const l = stops[stops.length - 1][1]; return [l, l, 0]; };
const one = b => () => [b, b, 0];

class Rig {
  constructor() { this.defs = []; this.ix = {}; this.P = []; this.Cc = []; this.SI = []; this.SW = []; this.I = []; this.n = 0; }
  bone(name, parent, x, y, z) { this.ix[name] = this.defs.length; this.defs.push({ name, parent, x, y, z }); return this; }
  vert(x, y, z, col, sk) { this.P.push(x, y, z); this.Cc.push(col.r, col.g, col.b); this.SI.push(this.ix[sk[0]], this.ix[sk[1]], 0, 0); this.SW.push(1 - sk[2], sk[2], 0, 0); return this.n++; }
  // tube of elliptical rings [x, y, z, radiusAlongSide, radiusAcross] swept through space, Catmull-Rom smoothed
  loft({ rings, seg = 22, side = [1, 0, 0], skin, color, sub = 3 }) {
    const R = [], n = rings.length, cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    for (let i = 0; i < n - 1; i++) for (let s = 0; s < sub; s++) { const t = s / sub, p0 = rings[Math.max(i - 1, 0)], p1 = rings[i], p2 = rings[i + 1], p3 = rings[Math.min(i + 2, n - 1)]; R.push([0, 1, 2, 3, 4].map(k => cr(p0[k], p1[k], p2[k], p3[k], t))); }
    R.push(rings[n - 1]); const m = R.length, base = this.n, S = _a.set(side[0], side[1], side[2]).normalize().clone(), T = new THREE.Vector3(), U = new THREE.Vector3(), S2 = new THREE.Vector3(), pos = { x: 0, y: 0, z: 0 }, dir = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < m; i++) {
      const a = R[Math.max(i - 1, 0)], b = R[Math.min(i + 1, m - 1)], c = R[i], ra = Math.max(0.003, c[3]), rb = Math.max(0.003, c[4]);
      T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); U.crossVectors(T, S).normalize(); S2.crossVectors(U, T);
      for (let j = 0; j < seg; j++) { const an = j / seg * 6.2832, ca = Math.cos(an), sa = Math.sin(an);
        dir.x = S2.x * ca + U.x * sa; dir.y = S2.y * ca + U.y * sa; dir.z = S2.z * ca + U.z * sa;
        pos.x = c[0] + S2.x * ca * ra + U.x * sa * rb; pos.y = c[1] + S2.y * ca * ra + U.y * sa * rb; pos.z = c[2] + S2.z * ca * ra + U.z * sa * rb;
        paint.set(0); color(paint, dir, pos, i / (m - 1)); this.vert(pos.x, pos.y, pos.z, paint.c, skin(pos)); }
    }
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < seg; j++) { const A = base + i * seg + j, B = base + i * seg + (j + 1) % seg, Cq = A + seg, D = B + seg; this.I.push(A, B, Cq, B, D, Cq); }
    return this;
  }
  prim(shape, color, bone, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
    const g = G[shape], P = g.attributes.position.array, base = this.n, sk = [bone, bone, 0]; paint.set(color);
    _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    for (let i = 0; i < P.length; i += 3) { _v.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(_m); this.vert(_v.x, _v.y, _v.z, paint.c, sk); }
    if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) this.I.push(I[i] + base); } else for (let i = 0; i < P.length / 3; i++) this.I.push(base + i);
    return this;
  }
  build() {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.Cc, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.SW, 4)); g.setIndex(this.I); g.computeVertexNormals();
    return { geo: g, defs: this.defs, ix: this.ix };
  }
}
// flat blade (flipper / fin / fluke): chord along `side`, thin across
function blade(r, from, dirV, len, chords, thick, side, skin, color, seg = 12) {
  const d = _b.set(dirV[0], dirV[1], dirV[2]).normalize().clone(), rings = chords.map((c, i) => { const t = i / (chords.length - 1); return [from[0] + d.x * len * t, from[1] + d.y * len * t, from[2] + d.z * len * t, c, thick * (0.4 + 0.6 * Math.sin(Math.min(1, t * 1.4 + 0.25) * Math.PI))]; });
  r.loft({ rings, seg, side, skin, color, sub: 2 });
}

const BLACK = 0x1b2030, WHITE = 0xf6f8fb, ORANGE = 0xff9a2a, OLIVE = 0x6f8a4a, STEEL = 0x6c7a8c, DARK = 0x2a3040, GOLD = 0xf2c230, RED = 0xd9433b, TAN = 0xcdbf95;
function eye(r, bone, x, y, z, s, iris = 0x101420, nx = 0) { for (const sx of [-1, 1]) r.prim('sph', WHITE, bone, sx * x, y, z, s, s * 1.08, s * 0.7, 0, sx * nx).prim('sph', iris, bone, sx * (x + nx * s * 0.2), y, z + s * 0.22, s * 0.62, s * 0.66, s * 0.4, 0, sx * nx).prim('sphL', WHITE, bone, sx * (x + nx * s * 0.2) + s * 0.12, y + s * 0.16, z + s * 0.4, s * 0.2); }

// ------------------------------------------------------------------ penguin / albatross (upright bipeds)
function buildBiped(faction, cls, ac) {
  const r = new Rig(), bird = faction === 'albatross', fl = bird ? 0.46 : 0.36;
  r.bone('root', null, 0, 0, 0).bone('hips', 'root', 0, 0.36, 0).bone('spine', 'hips', 0, 0.62, 0).bone('chest', 'spine', 0, 0.88, 0).bone('head', 'chest', 0, bird ? 1.2 : 1.14, 0.02).bone('eyes', 'head', 0, bird ? 1.36 : 1.3, 0.2)
    .bone('flLu', 'chest', -0.37, 0.97, 0).bone('flLl', 'flLu', -0.37, 0.97 - fl, 0).bone('flRu', 'chest', 0.37, 0.97, 0).bone('flRl', 'flRu', 0.37, 0.97 - fl, 0)
    .bone('footL', 'hips', -0.16, 0.1, 0.02).bone('footR', 'hips', 0.16, 0.1, 0.02).bone('tail', 'hips', 0, 0.2, -0.26);
  const skin = along('y', [[0.3, 'hips'], [0.5, 'hips'], [0.66, 'spine'], [0.86, 'chest'], [bird ? 1.04 : 1.0, 'chest'], [bird ? 1.2 : 1.13, 'head']]);
  if (bird) {
    r.loft({ seg: 24, skin, rings: [[0, 0.2, -0.04, 0.02, 0.02], [0, 0.25, -0.03, 0.2, 0.22], [0, 0.4, 0, 0.3, 0.33], [0, 0.6, 0.02, 0.32, 0.35], [0, 0.8, 0.03, 0.27, 0.3], [0, 0.95, 0.04, 0.19, 0.2], [0, 1.08, 0.05, 0.14, 0.15], [0, 1.2, 0.06, 0.145, 0.16], [0, 1.32, 0.07, 0.2, 0.21], [0, 1.42, 0.07, 0.19, 0.2], [0, 1.5, 0.06, 0.12, 0.13], [0, 1.53, 0.06, 0.01, 0.01]],
      color: (p, o, q) => { p.set(WHITE).mix(0xe9edf2, smooth((-o.z - 0.2) / 0.5) * 0.8).mix(0x3a3f4f, smooth((-o.z - 0.55) / 0.2) * (1 - smooth((q.y - 0.75) / 0.1)) * smooth((q.y - 0.3) / 0.1)); } });
    r.loft({ seg: 12, skin: one('head'), side: [1, 0, 0], rings: [[0, 1.36, 0.22, 0.085, 0.08], [0, 1.36, 0.4, 0.07, 0.07], [0, 1.35, 0.62, 0.055, 0.06], [0, 1.33, 0.76, 0.05, 0.055], [0, 1.28, 0.84, 0.035, 0.04], [0, 1.22, 0.86, 0.006, 0.006]], color: (p, o, q, t) => p.set(0xf4b8a0).mix(0xf2c230, smooth((t - 0.6) / 0.2)).mix(0x6b4a3a, o.y < -0.6 ? 0.25 : 0) });
    eye(r, 'eyes', 0.15, 1.39, 0.2, 0.085, 0x1a1410, 0.5); for (const sx of [-1, 1]) r.prim('box', 0x3a3f4f, 'head', sx * 0.15, 1.455, 0.2, 0.14, 0.022, 0.1, 0.1, 0, sx * -0.35);
    for (const sx of [-1, 1]) r.prim('cyl8', 0xf4b8a0, sx < 0 ? 'footL' : 'footR', sx * 0.16, 0.16, 0.02, 0.06, 0.26, 0.06).prim('sphL', 0xf4b8a0, sx < 0 ? 'footL' : 'footR', sx * 0.16, 0.035, 0.12, 0.26, 0.06, 0.36).prim('sphL', 0xe89f88, sx < 0 ? 'footL' : 'footR', sx * 0.16, 0.03, 0.26, 0.2, 0.04, 0.16);
    for (let i = -2; i <= 2; i++) r.prim('box', i % 2 ? 0x3a3f4f : 0x2a2f3d, 'tail', i * 0.07, 0.24, -0.42, 0.08, 0.02, 0.34, 0.5, i * 0.12);
    r.prim('dome', 0x7a4f2e, 'head', 0, 1.4, 0.05, 0.46, 0.34, 0.48).prim('sph', 0x7a4f2e, 'head', -0.2, 1.33, 0.02, 0.1, 0.2, 0.14).prim('sph', 0x7a4f2e, 'head', 0.2, 1.33, 0.02, 0.1, 0.2, 0.14).prim('box', 0x2a2f3d, 'head', 0, 1.47, 0.2, 0.36, 0.06, 0.04).prim('sph', 0x8fd0f5, 'head', -0.09, 1.5, 0.21, 0.13, 0.1, 0.06).prim('sph', 0x8fd0f5, 'head', 0.09, 1.5, 0.21, 0.13, 0.1, 0.06);
  } else {
    const sp = { rifleman: 'adelie', autorifle: 'chinstrap', grenadier: 'gentoo', marksman: 'rockhopper', commander: 'emperor' }[cls] || 'adelie';
    r.loft({ seg: 26, skin, rings: [[0, 0.05, 0, 0.02, 0.02], [0, 0.1, 0, 0.27, 0.25], [0, 0.2, 0, 0.36, 0.33], [0, 0.36, 0.01, 0.42, 0.39], [0, 0.55, 0.015, 0.43, 0.4], [0, 0.72, 0.015, 0.4, 0.375], [0, 0.88, 0.01, 0.35, 0.33], [0, 1.0, 0.01, 0.295, 0.285], [0, 1.08, 0.015, 0.262, 0.258], [0, 1.16, 0.02, 0.268, 0.272], [0, 1.26, 0.025, 0.282, 0.29], [0, 1.36, 0.025, 0.262, 0.27], [0, 1.44, 0.02, 0.19, 0.2], [0, 1.49, 0.02, 0.09, 0.1], [0, 1.505, 0.02, 0.008, 0.008]],
      color: (p, o, q) => {
        const belly = smooth((o.z - 0.1) / 0.3) * smooth((q.y - 0.1) / 0.08) * (1 - smooth((q.y - (sp === 'chinstrap' ? 1.3 : 1.0)) / 0.08));
        p.set(BLACK).mix(0x2b3552, smooth((-o.z - 0.3) / 0.6) * 0.6).mix(WHITE, belly);
        if (sp === 'chinstrap') p.mix(WHITE, smooth((o.z + 0.15) / 0.2) * smooth((q.y - 1.05) / 0.06) * (1 - smooth((q.y - 1.36) / 0.05))).mix(BLACK, smooth((o.z - 0.2) / 0.2) * (1 - Math.min(1, Math.abs(q.y - 1.13) / 0.014)));
        if (sp === 'gentoo') p.mix(WHITE, smooth((q.y - 1.385) / 0.03) * (1 - smooth((q.y - 1.455) / 0.03)) * smooth((o.z + 0.35) / 0.2) * smooth((Math.abs(o.x) - 0.15) / 0.2));
        if (sp === 'emperor') p.mix(0xf7c531, smooth((Math.abs(o.x) - 0.45) / 0.25) * smooth((q.y - 1.04) / 0.06) * (1 - smooth((q.y - 1.3) / 0.08)) * smooth((o.z + 0.4) / 0.3)).mix(0xfbe7a0, belly * smooth((q.y - 0.74) / 0.2) * 0.8);
        if (sp === 'adelie') p.mix(WHITE, smooth((o.z - 0.75) / 0.1) * smooth((q.y - 1.0) / 0.05) * (1 - smooth((q.y - 1.1) / 0.04)));
      } });
    const bk = sp === 'gentoo' ? 0xff6a2a : sp === 'emperor' ? 0x2a2f3d : sp === 'rockhopper' ? 0xd9542b : 0x2a2f3d, bk2 = sp === 'emperor' ? 0xf48fb1 : ORANGE;
    r.loft({ seg: 12, skin: one('head'), rings: [[0, 1.24, 0.24, 0.1, 0.085], [0, 1.235, 0.34, 0.075, 0.066], [0, 1.225, 0.44, 0.05, 0.045], [0, 1.21, 0.52, 0.026, 0.024], [0, 1.195, 0.56, 0.004, 0.004]], color: (p, o) => p.set(bk).mix(bk2, smooth((-o.y - 0.1) / 0.3)) });
    eye(r, 'eyes', 0.13, 1.295, 0.232, 0.095, sp === 'rockhopper' ? 0x8a1f1f : 0x101420, 0.35);
    if (sp === 'adelie') for (const sx of [-1, 1]) r.prim('torus', WHITE, 'eyes', sx * 0.135, 1.295, 0.24, 0.135, 0.135, 0.5, 0, sx * 0.35);
    if (sp === 'rockhopper') for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) r.prim('cone6', i % 2 ? 0xf7d331 : 0xf2b230, 'head', sx * (0.17 + i * 0.03), 1.41 + i * 0.012, 0.16 - i * 0.07, 0.03, 0.24 + i * 0.03, 0.03, -1.1 - i * 0.12, 0, sx * -(0.5 + i * 0.12));
    for (const sx of [-1, 1]) { const b = sx < 0 ? 'footL' : 'footR', fc = sp === 'gentoo' ? 0xff8a3a : sp === 'emperor' ? 0x2a2f3d : sp === 'rockhopper' ? 0xf4a0a0 : ORANGE; r.prim('sph', fc, b, sx * 0.16, 0.05, 0.1, 0.24, 0.085, 0.3); for (let i = -1; i <= 1; i++) r.prim('sphL', fc, b, sx * 0.16 + i * 0.075, 0.035, 0.26, 0.085, 0.05, 0.16, 0, i * 0.3).prim('cone6', DARK, b, sx * 0.16 + i * 0.1, 0.03, 0.345, 0.025, 0.06, 0.025, Math.PI / 2, 0, -i * 0.3); }
    r.prim('cone', BLACK, 'tail', 0, 0.16, -0.36, 0.2, 0.36, 0.08, -2.0);
    // class kit
    if (cls === 'rifleman' || cls === 'autorifle') r.prim('dome', OLIVE, 'head', 0, 1.365, 0.01, 0.6, 0.42, 0.62).prim('torus', 0x55703a, 'head', 0, 1.372, 0.01, 0.6, 0.62, 0.5, Math.PI / 2).prim('box', DARK, 'head', 0.285, 1.2, 0.04, 0.02, 0.2, 0.04).prim('box', DARK, 'head', -0.285, 1.2, 0.04, 0.02, 0.2, 0.04);
    if (cls === 'autorifle') r.prim('torus', 0xc9a13a, 'spine', 0, 0.66, 0, 0.86, 0.82, 1.2, Math.PI / 2, 0, 0.7);
    if (cls === 'grenadier') { r.prim('dome', RED, 'head', 0, 1.36, 0.02, 0.54, 0.34, 0.56).prim('torus', 0xb0342e, 'head', 0, 1.37, 0.02, 0.55, 0.57, 0.9, Math.PI / 2).prim('sph', WHITE, 'head', 0, 1.56, 0.02, 0.11).prim('torus', 0x6b4a2c, 'spine', 0, 0.66, 0, 0.86, 0.82, 1.3, Math.PI / 2, 0, -0.7); for (let i = 0; i < 4; i++) r.prim('cyl8', 0x9fb6c9, 'spine', -0.2 + i * 0.13, 0.72 - i * 0.11, 0.37 - Math.abs(i - 1.5) * 0.015, 0.07, 0.12, 0.07, 0.2); }
    if (cls === 'marksman') r.prim('cyl', TAN, 'head', 0, 1.47, 0.02, 0.8, 0.03, 0.8).prim('dome', TAN, 'head', 0, 1.47, 0.02, 0.48, 0.3, 0.5).prim('torus', 0x8a7a4a, 'head', 0, 1.49, 0.02, 0.5, 0.52, 0.6, Math.PI / 2);
    if (cls === 'commander') r.prim('dome', DARK, 'head', 0, 1.33, 0.02, 0.6, 0.44, 0.62).prim('sph', DARK, 'head', -0.27, 1.27, 0.03, 0.1, 0.2, 0.14).prim('sph', DARK, 'head', 0.27, 1.27, 0.03, 0.1, 0.2, 0.14).prim('box', GOLD, 'head', 0, 1.47, 0.27, 0.1, 0.1, 0.03, 0, 0, 0.785).prim('torus', DARK, 'head', 0, 1.42, 0.03, 0.58, 0.6, 0.6, Math.PI / 2).prim('sph', 0x4aa8e8, 'head', -0.1, 1.44, 0.27, 0.14, 0.1, 0.07).prim('sph', 0x4aa8e8, 'head', 0.1, 1.44, 0.27, 0.14, 0.1, 0.07);
    r.prim('box', cls === 'commander' ? DARK : OLIVE, 'chest', 0, 0.76, -0.4, 0.44, 0.46, 0.2).prim('box', cls === 'commander' ? 0x3a4050 : 0x5f7a40, 'chest', 0, 0.98, -0.42, 0.4, 0.1, 0.18).prim('cyl8', 0x9fb6c9, 'chest', 0.27, 0.74, -0.4, 0.1, 0.3, 0.1);
    r.prim('torus', DARK, 'hips', 0, 0.47, 0.012, 0.87, 0.81, 0.7, Math.PI / 2).prim('box', OLIVE, 'hips', 0.24, 0.44, 0.31, 0.14, 0.14, 0.08, 0, 0.6).prim('box', OLIVE, 'hips', -0.26, 0.44, 0.3, 0.14, 0.14, 0.08, 0, -0.65).prim('box', GOLD, 'hips', 0, 0.47, 0.405, 0.08, 0.07, 0.02);
  }
  r.prim('torus', ac, 'chest', 0, bird ? 1.05 : 1.07, bird ? 0.05 : 0.014, bird ? 0.32 : 0.56, bird ? 0.34 : 0.55, 1.4, Math.PI / 2).prim('box', ac, 'chest', 0.12, bird ? 0.93 : 0.95, bird ? 0.2 : 0.3, 0.1, 0.24, 0.035, 0.25, 0, -0.2);
  for (const sx of [-1, 1]) { const u = sx < 0 ? 'flLu' : 'flRu', l = sx < 0 ? 'flLl' : 'flRl';
    blade(r, [sx * 0.37, 1.0, 0], [0, -1, 0], fl * 2 + 0.03, bird ? [0.07, 0.15, 0.17, 0.16, 0.14, 0.1, 0.035] : [0.08, 0.14, 0.165, 0.16, 0.135, 0.095, 0.035], 0.085, [0, 0, 1], along('y', [[0.97 - fl - 0.07, l], [0.97 - fl + 0.07, u]]),
      (p, o) => p.set(bird ? 0x3a3f4f : BLACK).mix(bird ? 0xe9edf2 : WHITE, smooth((-o.x * sx - 0.2) / 0.4) * 0.9)); }
  return { ...r.build(), kind: 'biped', metrics: { h: bird ? 1.5 : 1.5, r: bird ? 0.5 : 0.55, len: 0 },
    cfg: { hipY: 0.36, tilt: 1.36, drop: 0.02, swimTilt: bird ? 0.35 : 1, swimDrop: bird ? 0.2 : 0, bob: bird ? 2 : 1, ik: { par: 'chest', sh: [0.37, 0.09, 0], l: fl, rest: [0, -1, 0] }, gunU: [0.07, -0.07, 0.43], gunP: [0.1, 0.4, 0.27], gunS: 1 } };
}

// ------------------------------------------------------------------ seal / walrus (built in the swimming pose, along +z)
function buildSeal(faction, cls, ac) {
  const r = new Rig(), wal = faction === 'walrus', base = wal ? 0x9a6a4a : 0x8794a6, lite = wal ? 0xc79a78 : 0xd3dae3, dark = wal ? 0x6f4a34 : 0x566070, k = wal ? 1.18 : 1;
  r.bone('root', null, 0, 0, 0).bone('pelvis', 'root', 0, 0.32, -0.35).bone('tail', 'pelvis', 0, 0.32, -0.75).bone('hfL', 'tail', -0.07, 0.31, -0.98).bone('hfR', 'tail', 0.07, 0.31, -0.98)
    .bone('lumbar', 'pelvis', 0, 0.32, -0.05).bone('thorax', 'lumbar', 0, 0.32, 0.3).bone('neck', 'thorax', 0, 0.32, 0.66).bone('head', 'neck', 0, 0.32, 0.86).bone('eyes', 'head', 0, 0.4, 1.02)
    .bone('flLu', 'thorax', -0.3, 0.2, 0.38).bone('flLl', 'flLu', -0.3, 0.2 - 0.152, 0.38 - 0.304).bone('flRu', 'thorax', 0.3, 0.2, 0.38).bone('flRl', 'flRu', 0.3, 0.2 - 0.152, 0.38 - 0.304);
  r.loft({ seg: 26, skin: along('z', [[-0.9, 'tail'], [-0.72, 'tail'], [-0.4, 'pelvis'], [-0.25, 'pelvis'], [0, 'lumbar'], [0.32, 'thorax'], [0.5, 'thorax'], [0.68, 'neck'], [0.88, 'head']]),
    rings: [[0, 0.3, -1.02, 0.01, 0.01], [0, 0.3, -0.95, 0.07, 0.05], [0, 0.31, -0.8, 0.13 * k, 0.1 * k], [0, 0.32, -0.6, 0.22 * k, 0.19 * k], [0, 0.32, -0.35, 0.3 * k, 0.27 * k], [0, 0.32, -0.05, 0.35 * k, 0.31 * k], [0, 0.32, 0.25, 0.36 * k, 0.32 * k], [0, 0.32, 0.5, 0.31 * k, 0.28 * k], [0, 0.32, 0.68, 0.245 * k, 0.235 * k], [0, 0.33, 0.8, 0.22 * k, 0.22 * k], [0, 0.34, 0.92, 0.228 * k, 0.225 * k], [0, 0.33, 1.02, 0.2 * k, 0.19 * k], [0, 0.3, 1.1, 0.145 * k, 0.12 * k], [0, 0.29, 1.17, 0.09 * k, 0.07 * k], [0, 0.29, 1.2, 0.008, 0.008]],
    color: (p, o, q) => { p.set(base).mix(lite, smooth((-o.y - 0.05) / 0.5)).mix(lite, smooth((q.z - 1.02) / 0.1) * 0.7); if (!wal) p.mix(dark, smooth((noise(q.z * 7 + 3, Math.atan2(o.x, o.y) * 2.2) - 0.6) / 0.1) * smooth((o.y + 0.2) / 0.4) * 0.75); else p.mix(dark, smooth((noise(q.z * 14, o.x * 3) - 0.55) / 0.2) * 0.3); } });
  r.prim('sph', 0x15181f, 'head', 0, 0.335, 1.2, 0.07, 0.05, 0.05); eye(r, 'eyes', 0.125 * k, 0.42, 1.03, 0.085, 0x0a0c10, 0.6);
  for (const sx of [-1, 1]) { r.prim('sph', lite, 'head', sx * 0.065, 0.27, 1.15, 0.13 * k, 0.1 * k, 0.11); for (let i = 0; i < 4; i++) r.prim('cone6', WHITE, 'head', sx * (0.13 + i * 0.012), 0.25 + i * 0.02, 1.13, 0.012, 0.26, 0.012, 0.25 - i * 0.12, 0, sx * -(1.25 + i * 0.08)); r.prim('sphL', base, 'head', sx * 0.2 * k, 0.4, 0.88, 0.04, 0.05, 0.05);
    if (wal) r.prim('cone', WHITE, 'head', sx * 0.07, 0.1, 1.12, 0.06, 0.36, 0.06, Math.PI + 0.12, 0, sx * 0.08);
    blade(r, [sx * 0.07, 0.31, -0.96], [sx * 0.35, -0.05, -1], 0.42, [0.05, 0.12, 0.17, 0.2, 0.06], 0.03, [1, 0, 0], one(sx < 0 ? 'hfL' : 'hfR'), p => p.set(dark));
    blade(r, [sx * 0.3 * k, 0.22, 0.4], [0, -0.447, -0.894], 0.7, [0.06, 0.12, 0.14, 0.13, 0.1, 0.03], 0.04, [0, 0.894, -0.447], along('y', [[0.02, sx < 0 ? 'flLl' : 'flRl'], [0.1, sx < 0 ? 'flLu' : 'flRu']]), p => p.set(dark)); }
  // harness + class kit (built around the body axis)
  const strap = (z, rad, col, w = 1.2) => r.prim('torus', col, z > 0.15 ? 'thorax' : 'lumbar', 0, 0.32, z, rad * 2.08 * k, rad * 1.86 * k, w);
  strap(0.42, 0.33, DARK); strap(0.12, 0.36, DARK); r.prim('box', DARK, 'thorax', 0, 0.02, 0.27, 0.34, 0.07, 0.34).prim('box', ac, 'thorax', 0, -0.02, 0.27, 0.16, 0.03, 0.14).prim('box', 0x3a4050, 'thorax', 0.17, 0.05, 0.1, 0.12, 0.1, 0.14).prim('box', 0x3a4050, 'thorax', -0.17, 0.05, 0.1, 0.12, 0.1, 0.14).prim('torus', ac, 'neck', 0, 0.325, 0.74, 0.48 * k, 0.48 * k, 1.3);
  if (wal) r.prim('box', BLACK, 'head', 0, 0.58, 0.9, 0.56, 0.08, 0.3).prim('box', RED, 'head', 0, 0.64, 0.9, 0.36, 0.1, 0.24).prim('box', GOLD, 'head', 0, 0.6, 1.055, 0.12, 0.08, 0.02).prim('sph', lite, 'head', -0.09, 0.25, 1.17, 0.17, 0.13, 0.1).prim('sph', lite, 'head', 0.09, 0.25, 1.17, 0.17, 0.13, 0.1);
  if (cls === 'navigator' || cls === 'breacher') r.prim('sph', ac, 'head', 0.03, 0.555, 0.9, 0.44, 0.1, 0.42, 0.1, 0, -0.12).prim('sphL', ac, 'head', 0.19, 0.57, 0.9, 0.09).prim('box', GOLD, 'head', -0.1, 0.55, 1.03, 0.06, 0.06, 0.02);
  if (cls === 'breacher') r.prim('box', 0x6b4a2c, 'lumbar', 0, 0.62, -0.05, 0.3, 0.14, 0.4).prim('cyl8', RED, 'lumbar', 0.1, 0.72, -0.05, 0.09, 0.3, 0.09, Math.PI / 2).prim('cyl8', RED, 'lumbar', -0.1, 0.72, -0.05, 0.09, 0.3, 0.09, Math.PI / 2);
  if (cls === 'sniper') r.prim('dome', 0x5a7a52, 'head', 0, 0.42, 0.9, 0.5, 0.36, 0.5, -0.2).prim('box', 0x5a7a52, 'neck', 0, 0.56, 0.62, 0.4, 0.04, 0.42, 0.1).prim('box', 0x4a6a44, 'thorax', 0, 0.62, 0.3, 0.5, 0.04, 0.5);
  if (cls === 'medic') r.prim('dome', WHITE, 'head', 0, 0.44, 0.9, 0.48, 0.3, 0.48, -0.2).prim('box', RED, 'head', 0, 0.59, 0.93, 0.16, 0.02, 0.05).prim('box', RED, 'head', 0, 0.59, 0.93, 0.05, 0.02, 0.16).prim('box', WHITE, 'lumbar', 0, 0.63, -0.05, 0.3, 0.16, 0.34).prim('box', RED, 'lumbar', 0, 0.715, -0.05, 0.18, 0.01, 0.06).prim('box', RED, 'lumbar', 0, 0.715, -0.05, 0.06, 0.01, 0.18);
  if (cls === 'heavy') r.prim('torus', RED, 'head', 0, 0.36, 0.9, 0.5, 0.5, 1.5, -0.25).prim('box', RED, 'head', 0.08, 0.4, 0.68, 0.06, 0.04, 0.2, 0.4).prim('torus', 0xc9a13a, 'thorax', 0, 0.32, 0.26, 0.76, 0.68, 1.3, 0, 0.5);
  return { ...r.build(), kind: 'seal', metrics: { h: 1.2, r: 0.5 * k, len: 0.35 },
    cfg: { y0: 0.32, ik: { par: 'thorax', sh: [0.3, -0.12, 0.08], l: 0.34, rest: [0, -0.447, -0.894] }, gunU: [0.07, -0.42, 0.22], gunP: [0.05, -0.2, 0.55], gunS: 1 } };
}

// ------------------------------------------------------------------ orca (horizontal swimmer, weapon on a back mount)
function buildOrca(faction, cls, ac) {
  const r = new Rig(), big = cls === 'armoured';
  r.bone('root', null, 0, 0, 0).bone('body', 'root', 0, 0.1, 0).bone('chest', 'body', 0, 0.1, 0.5).bone('head', 'chest', 0, 0.1, 1.02).bone('eyes', 'head', 0, 0.12, 1.2)
    .bone('lumbar', 'body', 0, 0.1, -0.4).bone('tail1', 'lumbar', 0, 0.1, -0.85).bone('tail2', 'tail1', 0, 0.1, -1.25).bone('fluke', 'tail2', 0, 0.1, -1.5).bone('pecL', 'chest', -0.38, -0.14, 0.6).bone('pecR', 'chest', 0.38, -0.14, 0.6).bone('mount', 'body', 0, 0.66, 0.3);
  r.loft({ seg: 30, skin: along('z', [[-1.5, 'fluke'], [-1.3, 'tail2'], [-1.2, 'tail2'], [-0.9, 'tail1'], [-0.8, 'tail1'], [-0.45, 'lumbar'], [-0.3, 'lumbar'], [0.05, 'body'], [0.25, 'body'], [0.6, 'chest'], [0.85, 'chest'], [1.1, 'head']]),
    rings: [[0, 0.1, -1.62, 0.01, 0.01], [0, 0.1, -1.5, 0.06, 0.07], [0, 0.1, -1.3, 0.1, 0.13], [0, 0.1, -1.0, 0.17, 0.22], [0, 0.1, -0.6, 0.3, 0.36], [0, 0.1, -0.2, 0.4, 0.46], [0, 0.1, 0.2, 0.45, 0.5], [0, 0.1, 0.6, 0.44, 0.49], [0, 0.09, 0.95, 0.39, 0.44], [0, 0.07, 1.2, 0.32, 0.36], [0, 0.05, 1.38, 0.23, 0.25], [0, 0.03, 1.5, 0.13, 0.13], [0, 0.03, 1.56, 0.008, 0.008]],
    color: (p, o, q) => { p.set(0x14171f).mix(0x1f2738, smooth((o.y - 0.2) / 0.6) * 0.5)
      .mix(0x808a9a, smooth((o.y - 0.45) / 0.2) * smooth((q.z + 0.85) / 0.15) * (1 - smooth((q.z + 0.3) / 0.25)) * 0.8)                                    // saddle patch
      .mix(WHITE, smooth((-o.y - 0.38) / 0.12) * smooth((q.z + 1.15) / 0.15) * (1 - smooth((q.z - 1.42) / 0.06)))                                     // belly
      .mix(WHITE, smooth((-o.y - 0.02) / 0.14) * smooth((q.z + 0.95) / 0.12) * (1 - smooth((q.z + 0.35) / 0.2)) * smooth((Math.abs(o.x) - 0.3) / 0.2))  // flank swoosh
      .mix(WHITE, (1 - smooth((Math.hypot((q.z - 1.02) / 0.19, (q.y - 0.27) / 0.075) - 0.75) / 0.25)) * smooth((Math.abs(o.x) - 0.35) / 0.2)); } });   // eye patch
  for (const sx of [-1, 1]) { r.prim('sph', 0x0a0c10, 'eyes', sx * 0.345, 0.14, 1.19, 0.06, 0.06, 0.05).prim('sphL', WHITE, 'eyes', sx * 0.365, 0.155, 1.21, 0.018);
    blade(r, [sx * 0.36, -0.12, 0.62], [sx * 0.75, -0.4, -0.55], 0.66, [0.14, 0.3, 0.34, 0.3, 0.2, 0.06], 0.07, [0, 0, 1], one(sx < 0 ? 'pecL' : 'pecR'), (p, o) => p.set(0x14171f).mix(0x3a4050, o.y < 0 ? 0.3 : 0));
    blade(r, [0, 0.1, -1.5], [sx * 1, 0, -0.5], 0.66, [0.16, 0.36, 0.38, 0.3, 0.18, 0.04], 0.06, [0, 0, 1], one('fluke'), (p, o) => p.set(0x14171f).mix(WHITE, o.y < -0.3 ? 0.7 : 0)); }
  blade(r, [0, 0.54, -0.08], [0, 1, -0.32], big ? 1.2 : 0.82, [0.5, 0.48, 0.4, 0.3, 0.2, 0.06], 0.07, [0, 0, 1], one('body'), p => p.set(0x14171f));
  r.prim('sph', 0x0a0c10, 'head', 0, 0.52, 0.98, 0.1, 0.03, 0.08);
  // harness and back mount
  r.prim('torus', ac, 'body', 0, 0.1, 0.42, 0.91, 1.01, 1.6).prim('torus', DARK, 'body', 0, 0.1, 0.06, 0.92, 1.02, 1.3).prim('box', DARK, 'body', 0, 0.59, 0.26, 0.5, 0.1, 0.56).prim('cyl8', STEEL, 'body', 0, 0.66, 0.3, 0.36, 0.1, 0.36).prim('cyl8', DARK, 'mount', 0, 0.74, 0.3, 0.2, 0.14, 0.2).prim('box', STEEL, 'mount', -0.13, 0.84, 0.3, 0.04, 0.16, 0.2).prim('box', STEEL, 'mount', 0.13, 0.84, 0.3, 0.04, 0.16, 0.2);
  if (big) r.prim('dome', STEEL, 'head', 0, 0.2, 1.12, 0.76, 0.5, 0.8, -0.3).prim('box', 0x8a96a8, 'head', 0, 0.42, 1.36, 0.3, 0.04, 0.2, 0.5).prim('box', STEEL, 'chest', 0.4, 0.25, 0.55, 0.06, 0.4, 0.6, 0, 0, -0.35).prim('box', STEEL, 'chest', -0.4, 0.25, 0.55, 0.06, 0.4, 0.6, 0, 0, 0.35).prim('torus', 0xe0b34a, 'tail2', 0, 0.1, -1.3, 0.3, 0.38, 3).prim('sph', 0xe0b34a, 'fluke', 0, 0.1, -1.72, 1.2, 0.1, 0.34);
  if (cls === 'gunner') r.prim('box', OLIVE, 'body', 0.33, 0.56, 0.2, 0.2, 0.2, 0.34, 0, 0, -0.5).prim('box', OLIVE, 'body', -0.33, 0.56, 0.2, 0.2, 0.2, 0.34, 0, 0, 0.5).prim('torus', 0xc9a13a, 'body', 0.2, 0.62, 0.3, 0.4, 0.4, 1.4, 0.4, 1.2);
  if (cls === 'echo') r.prim('dome', 0x5ce8ff, 'head', 0, 0.42, 0.9, 0.3, 0.26, 0.3).prim('cyl8', STEEL, 'head', 0.14, 0.62, 0.84, 0.02, 0.5, 0.02).prim('sphL', RED, 'head', 0.14, 0.88, 0.84, 0.05).prim('torus', 0x5ce8ff, 'head', 0, 0.1, 1.1, 0.74, 0.8, 0.8);
  if (cls === 'tsunami') r.prim('box', STEEL, 'mount', 0, 0.9, 0.48, 0.46, 0.34, 0.04).prim('cyl8', GOLD, 'body', 0.3, 0.6, -0.1, 0.12, 0.3, 0.12, Math.PI / 2).prim('cyl8', GOLD, 'body', -0.3, 0.6, -0.1, 0.12, 0.3, 0.12, Math.PI / 2);
  if (cls === 'raider') r.prim('box', 0xdfe8f2, 'body', 0, 0.98, -0.16, 0.02, 0.86, 0.1, -0.31).prim('torus', RED, 'head', 0, 0.09, 0.98, 0.8, 0.9, 1.6).prim('box', RED, 'head', 0.1, 0.5, 0.86, 0.08, 0.04, 0.3, -0.3);
  return { ...r.build(), kind: 'orca', metrics: { h: 1.05, r: 0.8, len: 0.8 }, cfg: { gunS: 1.5, gun: [0, 0.2, 0.05] } };
}

// ------------------------------------------------------------------ instances + animation
const cache = {};
export function makeChar(faction, cls) {
  const key = faction + '_' + cls, ac = FACTIONS[faction].color;
  const data = cache[key] || (cache[key] = (faction === 'orcas' ? buildOrca : faction === 'seals' || faction === 'walrus' ? buildSeal : buildBiped)(faction, cls, ac));
  const bones = data.defs.map(d => { const b = new THREE.Bone(); b.name = d.name; return b; }), B = {};
  data.defs.forEach((d, i) => { const p = d.parent ? data.defs[data.ix[d.parent]] : null; bones[i].position.set(d.x - (p ? p.x : 0), d.y - (p ? p.y : 0), d.z - (p ? p.z : 0)); bones[i].userData.rest = bones[i].position.clone(); if (p) bones[data.ix[d.parent]].add(bones[i]); B[d.name] = bones[i]; });
  const mesh = new THREE.SkinnedMesh(data.geo, MAT); mesh.add(bones[0]); bones[0].updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones)); mesh.castShadow = true; mesh.frustumCulled = false;
  const root = new THREE.Group(), gun = new THREE.Group(); root.add(mesh); B[data.kind === 'orca' ? 'mount' : data.cfg.ik.par].add(gun);
  const m = { root, B, gun, kind: data.kind, cfg: data.cfg, metrics: data.metrics, melee: false, seed: Math.random() * 10, phase: Math.random() * 6,
    st: { move: 0, prone: 0, swim: 0, dead: 0, aim: 0, lean: 0, yaw: null, phase: Math.random() * 6, blink: 0, blinkT: 1 + Math.random() * 4, sw: 0 },
    setWeapon(id) { gun.clear(); const w = weaponMesh(id); w.scale.setScalar(data.cfg.gunS); gun.add(w); this.melee = WEAPONS[id].type === 'melee'; this.st.sw = 0; },
    reset() { Object.assign(this.st, { move: 0, prone: 0, swim: 0, dead: 0, lean: 0 }); },
    animate(c, dt, time) { drive(this, c, dt); ANIM[this.kind](this, c, dt, time); if (gun.children[0]) animateWeapon(gun.children[0], c, dt); } };
  return m;
}

function drive(m, c, dt) {
  const s = m.st, sp = c.vehicle ? 0 : Math.hypot(c.vel.x, c.vel.z);
  s.move = damp(s.move, Math.min(1.25, sp / 5), 9, dt); s.prone = damp(s.prone, c.sliding && c.alive ? 1 : 0, 7, dt); s.swim = damp(s.swim, c.swim ? 1 : 0, 5, dt); s.dead = damp(s.dead, c.alive ? 0 : 1, 6, dt);
  s.aim = damp(s.aim, clamp(c.pitch, -0.9, 0.9), 16, dt); s.phase += dt * (2.4 + sp * (m.kind === 'biped' ? 1.15 : 0.7)); s.flinch = c.flash;
  if (s.yaw == null) s.yaw = c.yaw; let dy = (c.yaw - s.yaw) % 6.2832; if (dy > Math.PI) dy -= 6.2832; if (dy < -Math.PI) dy += 6.2832; s.yaw = c.yaw; if (dt > 1e-4) s.lean = damp(s.lean, clamp(dy / dt * 0.14, -1, 1), 5, dt);
  s.blinkT -= dt; if (s.blinkT < 0) { s.blinkT = 2 + Math.random() * 4; s.blink = 0.13; } s.blink -= dt; m.B.eyes.scale.y = s.blink > 0 || !c.alive ? 0.12 : 1;
  s.rl = damp(s.rl || 0, c.reload > 0 && c.alive ? 1 : 0, 9, dt);
  s.sw = c.swing > 0 ? Math.sin((1 - c.swing / 0.28) * Math.PI) : damp(s.sw, 0, 14, dt);
}
// analytic two-bone IK in the parent's space; bones point along `rest` when unrotated
function ik2(up, lo, sx, sy, sz, T, l, pole, rest, relax) {
  const S = _a.set(sx, sy, sz), d = _b.copy(T).sub(S), L = clamp(d.length(), 0.02, l * 2 - 0.004); d.normalize();
  const a = L / 2, hgt = Math.sqrt(Math.max(0, l * l - a * a)), pp = _c.copy(pole).addScaledVector(d, -pole.dot(d)).normalize();
  const E = _d.copy(d).multiplyScalar(a).addScaledVector(pp, hgt), R = _v.set(rest[0], rest[1], rest[2]);
  _q.setFromUnitVectors(R, _s.copy(E).normalize());
  const toT = _s.copy(d).multiplyScalar(L).sub(E).normalize().applyQuaternion(_q2.copy(_q).invert());
  _q2.setFromUnitVectors(R, toT);
  if (relax > 0.001) { up.quaternion.copy(_q).slerp(IDQ, relax); lo.quaternion.copy(_q2).slerp(IDQ, relax); } else { up.quaternion.copy(_q); lo.quaternion.copy(_q2); }
}
const REAR = [0, -0.075, -0.1], FORE = [0, -0.05, 0.2], _t = new THREE.Vector3(), _pole = new THREE.Vector3();
function hands(m, c, relax, sway) { // right hand on the grip, left on the fore-end (or swinging free with a melee weapon)
  const k = m.cfg.ik, g = m.gun, gs = m.cfg.gunS, B = m.B;
  _t.set(REAR[0] * gs, REAR[1] * gs, REAR[2] * gs).applyEuler(g.rotation).add(g.position); ik2(B.flRu, B.flRl, k.sh[0], k.sh[1], k.sh[2], _t, k.l, _pole.set(1, -0.2, -0.7), k.rest, relax);
  if (m.melee) _t.set(-k.sh[0] - 0.1, k.sh[1] + k.rest[1] * k.l * 1.7, k.sh[2] + k.rest[2] * k.l * 1.7 + 0.12 + sway); else _t.set(FORE[0] * gs, FORE[1] * gs, FORE[2] * gs).applyEuler(g.rotation).add(g.position);
  ik2(B.flLu, B.flLl, -k.sh[0], k.sh[1], k.sh[2], _t, k.l, _pole.set(-1, -0.2, -0.7), k.rest, relax);
}
const ANIM = {
  biped(m, c, dt, time) {
    const B = m.B, s = m.st, k = m.cfg, D = s.dead, H = Math.max(s.prone, s.swim * k.swimTilt) * (1 - D), up = 1 - H, mv = s.move, ph = s.phase, sw = Math.sin(ph), pad = Math.max(s.prone, s.swim), seat = c.vehicle ? 1 : 0;
    B.hips.position.y = k.hipY + up * Math.abs(sw) * 0.05 * mv - H * k.drop - s.swim * k.swimDrop + s.swim * Math.sin(time * 2 + m.seed) * 0.03 - D * 0.1;
    B.hips.rotation.set(H * k.tilt + up * mv * 0.1 + s.flinch * 0.1 + seat * 0.25, up * sw * 0.1 * mv, up * sw * 0.15 * mv - s.lean * 0.22 * up + D * 1.45);
    B.hips.scale.setScalar(1 + s.flinch * 0.05);
    B.spine.rotation.set(-s.aim * 0.14 * up + Math.sin(time * 1.7 + m.seed) * 0.015, 0, -up * sw * 0.07 * mv);
    B.chest.rotation.set(-s.aim * 0.2 * up - c.recoil * 0.05, 0, -up * sw * 0.05 * mv);
    const look = (1 - Math.min(1, mv)) * up * (1 - D);
    B.head.rotation.set(-H * k.tilt * 0.78 - s.aim * 0.3 * up + D * 0.4 + Math.sin(ph * 2) * 0.035 * mv * up * k.bob + Math.sin(time * 0.9 + m.seed) * 0.03 * look, Math.sin(time * 0.6 + m.seed * 3) * 0.32 * look, -up * sw * 0.06 * mv + s.lean * 0.15);
    for (const [b, off] of [[B.footL, 0], [B.footR, Math.PI]]) { const f = Math.sin(ph + off), r = b.userData.rest; b.rotation.x = -up * f * 0.5 * mv + pad * (1.05 + Math.sin(ph * 1.6 + off) * 0.5 * Math.max(mv, 0.25)) + D * 0.6; b.position.y = r.y + up * Math.max(0, f) * 0.09 * mv; b.position.z = r.z + up * f * 0.13 * mv; }
    B.tail.rotation.set(Math.sin(time * 3 + m.seed) * 0.08 + up * sw * 0.2 * mv, up * Math.cos(ph) * 0.3 * mv, 0);
    const cp = B.hips.rotation.x + B.spine.rotation.x + B.chest.rotation.x, g = m.gun, gs = k.gunS;
    g.position.set(lerp(k.gunU[0], k.gunP[0], H) + D * 0.2, lerp(k.gunU[1], k.gunP[1], H) - D * 0.3 + (m.melee ? s.sw * 0.25 : 0), lerp(k.gunU[2], k.gunP[2], H) - c.recoil * 0.07);
    g.rotation.set(-s.aim - cp + D * 0.9 + (m.melee ? -0.7 + s.sw * 1.9 : 0), m.melee ? 0 : -0.06 * up, s.rl * 0.5);
    hands(m, c, D * 0.8, sw * 0.14 * mv);
  },
  seal(m, c, dt, time) {
    const B = m.B, s = m.st, k = m.cfg, D = s.dead, S = s.swim, L = (1 - S) * (1 - D * 0.85), mv = s.move, ph = s.phase, gal = Math.sin(ph) * Math.min(1, mv) * L, pm = Math.max(mv, 0.2);
    B.pelvis.position.y = k.y0 + Math.abs(Math.sin(ph)) * 0.07 * mv * L - S * 0.05 + S * Math.sin(time * 2 + m.seed) * 0.02 - D * 0.04;
    B.pelvis.rotation.set(gal * 0.16 + s.flinch * 0.08, S * Math.sin(ph) * 0.1 * mv, -s.lean * 0.2 + D * 1.4); B.pelvis.scale.setScalar(1 + s.flinch * 0.05);
    B.lumbar.rotation.set(-0.5 * L - gal * 0.2 + Math.sin(time * 1.6 + m.seed) * 0.012, -S * Math.sin(ph - 0.8) * 0.14 * mv, 0);
    B.thorax.rotation.set(-0.55 * L + gal * 0.14 - s.aim * 0.18 * L - c.recoil * 0.04, -S * Math.sin(ph - 1.6) * 0.08 * mv, 0);
    const look = (1 - Math.min(1, mv)) * (1 - D);
    B.neck.rotation.set(0.3 * L - s.aim * 0.2, Math.sin(time * 0.55 + m.seed * 2) * 0.22 * look, 0);
    B.head.rotation.set(0.72 * L - s.aim * 0.25 - S * 0.1 + D * 0.3 + Math.sin(time * 0.8 + m.seed) * 0.03 * look, Math.sin(time * 0.55 + m.seed * 2) * 0.25 * look, s.lean * 0.1);
    B.tail.rotation.set(L * (0.22 - gal * 0.35), S * Math.sin(ph + 1.2) * 0.42 * pm, 0);
    B.hfL.rotation.set(0, -0.25 - L * 0.35 + S * Math.sin(ph + 2.2) * 0.5 * pm, L * 0.3); B.hfR.rotation.set(0, 0.25 + L * 0.35 + S * Math.sin(ph + 2.2) * 0.5 * pm, -L * 0.3);
    const cp = B.pelvis.rotation.x + B.lumbar.rotation.x + B.thorax.rotation.x, g = m.gun;
    g.position.set(lerp(k.gunU[0], k.gunP[0], S) + D * 0.2, lerp(k.gunU[1], k.gunP[1], S) - (m.melee ? s.sw * 0.2 : 0), lerp(k.gunU[2], k.gunP[2], S) - c.recoil * 0.07 * (1 - S) + (m.melee ? s.sw * 0.2 : 0));
    g.rotation.set(-s.aim - cp + D * 0.8 + (m.melee ? -0.7 + s.sw * 1.9 : 0), 0, s.rl * 0.5);
    hands(m, c, D * 0.8, gal * 0.1);
  },
  orca(m, c, dt, time) {
    const B = m.B, s = m.st, D = s.dead, mv = Math.max(s.move, 0.12), ph = s.phase, w = (o, a) => Math.sin(ph + o) * a * mv, tw = s.sw;
    B.body.position.y = 0.1 + Math.sin(time * 1.4 + m.seed) * 0.035 + w(0, 0.03) - D * 0.1;
    B.body.rotation.set(-s.aim * 0.22 + w(0.2, 0.04) + s.flinch * 0.05, -tw * 0.45, -s.lean * 0.4 + D * 3.0); B.body.scale.setScalar(1 + s.flinch * 0.04);
    B.chest.rotation.set(-w(-0.6, 0.05) - s.aim * 0.1, s.lean * 0.12, 0); B.head.rotation.set(-w(-1.2, 0.05) - s.aim * 0.14, s.lean * 0.18 + Math.sin(time * 0.5 + m.seed) * 0.05, 0);
    B.lumbar.rotation.set(w(0.9, 0.12), -s.lean * 0.25 + tw * 0.7, 0); B.tail1.rotation.set(w(1.7, 0.22), -s.lean * 0.3 + tw * 0.8, 0); B.tail2.rotation.set(w(2.5, 0.3), -s.lean * 0.3 + tw * 0.6, 0); B.fluke.rotation.set(w(3.3, 0.42), 0, 0);
    const pf = Math.sin(time * 1.1 + m.seed) * 0.12; B.pecL.rotation.set(0.1 + w(1, 0.1), 0, 0.12 + pf + s.lean * 0.4); B.pecR.rotation.set(0.1 + w(1, 0.1), 0, -0.12 - pf + s.lean * 0.4);
    B.mount.rotation.set(0, 0, 0); const g = m.gun, k = m.cfg; g.position.set(k.gun[0], k.gun[1], k.gun[2] - c.recoil * 0.1); g.rotation.set(-s.aim - B.body.rotation.x + (m.melee ? 0.6 : 0), 0, 0); g.visible = !m.melee || true;
  },
};
