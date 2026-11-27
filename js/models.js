// Procedural animal soldiers, weapons and vehicles (all baked from primitives).
import * as THREE from '../vendor/three.module.min.js';
import { Kit, bakedMat } from './kit.js';
import { FACTIONS, WEAPONS } from './data.js';

const cache = {};
const geo = (key, fn) => cache[key] || (cache[key] = (() => { const k = new Kit(); fn(k); return k.bake().geometry; })());
const mesh = (g, shadow = true) => { const m = new THREE.Mesh(g, bakedMat); m.castShadow = shadow; return m; };

const OLIVE = 0x6f8a4a, STEEL = 0x6c7a8c, BLACK = 0x1e2333, WHITE = 0xffffff, ORANGE = 0xff9a2a;

// Each builder draws a torso (origin at the feet, facing +z). Returns rig metrics.
const BUILD = {
  penguins(k, cls, ac) {
    k.p('capsule', 0x252b3f, 0, 0.62, 0, 0.8, 0.36, 0.74).p('sph', WHITE, 0, 0.56, 0.15, 0.62, 0.88, 0.5)
      .p('sph', 0x252b3f, 0, 1.2, 0.02, 0.62).p('sph', WHITE, 0.15, 1.2, 0.17, 0.3, 0.34, 0.26).p('sph', WHITE, -0.15, 1.2, 0.17, 0.3, 0.34, 0.26)
      .p('sph', BLACK, 0.14, 1.26, 0.27, 0.09).p('sph', BLACK, -0.14, 1.26, 0.27, 0.09)
      .p('cone', ORANGE, 0, 1.15, 0.38, 0.17, 0.3, 0.14, Math.PI / 2)
      .p('sph', ORANGE, 0.2, 0.05, 0.14, 0.3, 0.1, 0.44).p('sph', ORANGE, -0.2, 0.05, 0.14, 0.3, 0.1, 0.44)
      .p('torus', ac, 0, 0.98, 0.02, 0.56, 0.56, 1.6, Math.PI / 2).p('box', ac, 0.16, 0.82, 0.3, 0.14, 0.34, 0.05, 0, 0, -0.2);
    if (cls === 'rifleman' || cls === 'autorifle') k.p('dome', OLIVE, 0, 1.24, 0, 0.7, 0.62, 0.72);
    if (cls === 'autorifle') k.p('torus', 0xc9a13a, 0, 0.66, 0, 0.86, 0.9, 1.4, Math.PI / 2, 0, 0.7);
    if (cls === 'grenadier') k.p('dome', 0xd9433b, 0, 1.3, 0, 0.6, 0.6, 0.6).p('sph', WHITE, 0, 1.63, 0, 0.16).p('torus', 0x6b4a2c, 0, 0.66, 0, 0.86, 0.9, 1.6, Math.PI / 2, 0, -0.7);
    if (cls === 'marksman') k.p('cyl', 0xcdbf95, 0, 1.44, 0, 0.9, 0.05, 0.9).p('dome', 0xcdbf95, 0, 1.42, 0, 0.56, 0.44, 0.56);
    if (cls === 'commander') k.p('dome', BLACK, 0, 1.3, 0, 0.66, 0.5, 0.66).p('box', 0xf2c230, 0, 1.44, 0.3, 0.14, 0.14, 0.05).p('box', 0x4aa8e8, 0, 1.34, 0.27, 0.46, 0.13, 0.12);
    k.p('box', cls === 'commander' ? BLACK : OLIVE, 0, 0.74, -0.38, 0.46, 0.5, 0.22);
    return { h: 1.5, r: 0.55, sh: [0.42, 0.92, 0], fl: (k2) => k2.p('sph', 0x252b3f, 0, -0.3, 0, 0.12, 0.66, 0.3), wy: 0.72 };
  },
  seals(k, cls, ac, base = 0x8d9aab, light = 0xc3ccd8) {
    k.p('sph', base, 0, 0.34, -0.5, 0.74, 0.56, 1.3).p('capsule', base, 0, 0.78, 0.06, 0.74, 0.3, 0.7, 0.45).p('sph', light, 0, 0.74, 0.28, 0.56, 0.78, 0.4, 0.45)
      .p('sph', base, 0, 1.3, 0.34, 0.56).p('sph', light, 0, 1.22, 0.56, 0.34, 0.26, 0.3).p('sph', BLACK, 0, 1.28, 0.7, 0.1, 0.08, 0.08)
      .p('sph', BLACK, 0.17, 1.4, 0.54, 0.12).p('sph', BLACK, -0.17, 1.4, 0.54, 0.12).p('sph', WHITE, 0.19, 1.43, 0.59, 0.04).p('sph', WHITE, -0.15, 1.43, 0.59, 0.04)
      .p('box', WHITE, 0.24, 1.2, 0.6, 0.3, 0.012, 0.012, 0, 0.3, 0.1).p('box', WHITE, -0.24, 1.2, 0.6, 0.3, 0.012, 0.012, 0, -0.3, -0.1)
      .p('sph', base, 0.2, 0.12, -1.2, 0.34, 0.1, 0.6, 0, 0.4).p('sph', base, -0.2, 0.12, -1.2, 0.34, 0.1, 0.6, 0, -0.4)
      .p('sph', 0x6f7c8e, 0.2, 0.62, -0.6, 0.16, 0.05, 0.2).p('sph', 0x6f7c8e, -0.16, 0.9, -0.3, 0.14, 0.05, 0.18)
      .p('box', BLACK, 0, 0.78, 0.44, 0.6, 0.36, 0.1, 0.45).p('box', ac, 0, 0.84, 0.5, 0.2, 0.14, 0.04, 0.45);
    if (cls === 'navigator' || cls === 'breacher') k.p('sph', ac, 0.05, 1.58, 0.3, 0.6, 0.16, 0.6, 0, 0, -0.15).p('sph', ac, 0.26, 1.6, 0.3, 0.12);
    if (cls === 'breacher') k.p('box', 0x6b4a2c, 0, 0.7, -0.5, 0.5, 0.5, 0.3);
    if (cls === 'sniper') k.p('dome', 0x5a7a52, 0, 1.38, 0.3, 0.64, 0.5, 0.64).p('box', 0x5a7a52, 0, 1.2, -0.05, 0.6, 0.6, 0.1, 0.4);
    if (cls === 'medic') k.p('dome', WHITE, 0, 1.4, 0.3, 0.62, 0.48, 0.62).p('box', 0xd9433b, 0, 1.56, 0.5, 0.2, 0.06, 0.03).p('box', 0xd9433b, 0, 1.56, 0.5, 0.06, 0.2, 0.03).p('box', WHITE, 0, 0.7, -0.5, 0.5, 0.4, 0.3);
    if (cls === 'heavy') k.p('torus', 0xd9433b, 0, 1.47, 0.32, 0.56, 0.56, 1.8, Math.PI / 2 - 0.2).p('torus', 0xc9a13a, 0, 0.8, 0.1, 0.9, 0.9, 1.4, Math.PI / 2, 0, 0.7);
    return { h: 1.6, r: 0.62, sh: [0.4, 0.82, 0.22], fl: (k2) => k2.p('sph', base, 0, -0.26, 0, 0.14, 0.6, 0.34), wy: 0.74 };
  },
  orcas(k, cls, ac) {
    k.p('sph', BLACK, 0, 0.5, -0.7, 1.0, 0.8, 1.9).p('capsule', BLACK, 0, 1.15, 0.08, 1.06, 0.42, 1.0, 0.4).p('sph', WHITE, 0, 1.0, 0.36, 0.8, 1.3, 0.56, 0.4)
      .p('sph', WHITE, 0.33, 1.78, 0.52, 0.2, 0.15, 0.34, 0, 0.3).p('sph', WHITE, -0.33, 1.78, 0.52, 0.2, 0.15, 0.34, 0, -0.3)
      .p('sph', WHITE, 0.26, 1.6, 0.74, 0.07).p('sph', WHITE, -0.26, 1.6, 0.74, 0.07).p('sph', WHITE, 0, 1.45, 0.6, 0.6, 0.3, 0.4)
      .p('cone', BLACK, 0, 1.75, -0.62, 0.16, 1.0, 0.56, -0.55).p('sph', BLACK, 0.4, 0.3, -1.75, 0.8, 0.12, 0.56, 0, 0.5).p('sph', BLACK, -0.4, 0.3, -1.75, 0.8, 0.12, 0.56, 0, -0.5)
      .p('torus', ac, 0, 1.32, 0.16, 1.08, 1.08, 2, Math.PI / 2 - 0.4);
    if (cls === 'armoured') k.p('box', STEEL, 0, 1.3, 0.6, 0.9, 0.7, 0.12, 0.4).p('dome', STEEL, 0, 1.72, 0.3, 0.96, 0.6, 0.96, -0.2).p('box', STEEL, 0.5, 0.9, -0.3, 0.1, 0.7, 0.9).p('box', STEEL, -0.5, 0.9, -0.3, 0.1, 0.7, 0.9).p('sph', 0xe0b34a, 0, 0.36, -1.8, 1.5, 0.2, 0.5);
    if (cls === 'gunner') k.p('box', STEEL, 0, 1.5, -0.5, 0.5, 0.3, 0.6, -0.3).p('torus', 0xc9a13a, 0, 1.0, 0, 1.3, 1.3, 1.4, Math.PI / 2, 0, 0.7);
    if (cls === 'echo') k.p('dome', 0x5ce8ff, 0, 1.96, 0.2, 0.44, 0.4, 0.44).p('cyl', STEEL, 0.3, 2.1, 0, 0.03, 0.7, 0.03);
    if (cls === 'tsunami') k.p('cyl', STEEL, 0.3, 1.5, -0.6, 0.3, 1.4, 0.3, 0.9);
    if (cls === 'raider') k.p('box', 0xdfe8f2, 0, 2.0, -0.82, 0.04, 0.8, 0.34, -0.55).p('torus', 0xd9433b, 0, 1.92, 0.24, 0.86, 0.86, 1.6, Math.PI / 2 - 0.3);
    return { h: 2.2, r: 0.85, sh: [0.58, 1.2, 0.26], fl: (k2) => k2.p('sph', BLACK, 0, -0.36, 0, 0.16, 0.8, 0.5), wy: 1.08 };
  },
  walrus(k, cls, ac) {
    const m = BUILD.seals(k, 'none', ac, 0x9a6a4a, 0xc79a78);
    k.p('cone', WHITE, 0.13, 0.98, 0.6, 0.09, 0.5, 0.09, Math.PI + 0.15).p('cone', WHITE, -0.13, 0.98, 0.6, 0.09, 0.5, 0.09, Math.PI + 0.15)
      .p('sph', 0xe8d8c0, 0.14, 1.2, 0.62, 0.26, 0.2, 0.2).p('sph', 0xe8d8c0, -0.14, 1.2, 0.62, 0.26, 0.2, 0.2)
      .p('box', BLACK, 0, 1.62, 0.3, 0.9, 0.2, 0.36).p('box', 0xd9433b, 0, 1.74, 0.3, 0.5, 0.14, 0.3).p('box', 0xf2c230, 0, 1.64, 0.49, 0.16, 0.12, 0.02);
    return m;
  },
  albatross(k, cls, ac) {
    k.p('capsule', WHITE, 0, 0.66, 0, 0.66, 0.34, 0.7, 0.2).p('sph', WHITE, 0, 1.22, 0.14, 0.5).p('cone', 0xf4b8a0, 0, 1.16, 0.56, 0.16, 0.6, 0.14, Math.PI / 2 + 0.15)
      .p('sph', BLACK, 0.15, 1.3, 0.32, 0.08).p('sph', BLACK, -0.15, 1.3, 0.32, 0.08).p('box', 0x3a3f4f, 0.15, 1.36, 0.3, 0.16, 0.03, 0.12, 0, 0, -0.3).p('box', 0x3a3f4f, -0.15, 1.36, 0.3, 0.16, 0.03, 0.12, 0, 0, 0.3)
      .p('sph', 0xf4b8a0, 0.17, 0.05, 0.12, 0.26, 0.08, 0.4).p('sph', 0xf4b8a0, -0.17, 0.05, 0.12, 0.26, 0.08, 0.4)
      .p('dome', 0x7a4f2e, 0, 1.3, 0.1, 0.56, 0.44, 0.56).p('box', 0x4aa8e8, 0, 1.44, 0.3, 0.4, 0.12, 0.1).p('torus', ac, 0, 0.98, 0.08, 0.5, 0.5, 1.6, Math.PI / 2).p('box', 0x3a3f4f, 0, 0.5, -0.5, 0.5, 0.1, 0.5, 0.4);
    return { h: 1.5, r: 0.52, sh: [0.36, 0.95, 0.02], fl: (k2) => k2.p('sph', 0x3a3f4f, 0, -0.45, -0.05, 0.1, 1.0, 0.36), wy: 0.72 };
  },
};

function weaponGeo(id) {
  const w = WEAPONS[id];
  return geo('w_' + id, k => {
    const body = 0xe8eef6, dark = 0x38404f, c = w.col;
    switch (w.type) {
      case 'semi': k.p('box', body, 0, 0, 0.15, 0.09, 0.13, 0.6).p('cyl', dark, 0, 0.02, 0.6, 0.05, 0.4, 0.05, Math.PI / 2).p('box', dark, 0, -0.14, 0.1, 0.07, 0.2, 0.1).p('box', c === 0xffffff ? 0x4aa8e8 : c, 0, -0.03, -0.25, 0.08, 0.14, 0.3).p('sph', 0x4aa8e8, 0, 0.11, 0.1, 0.14); break;
      case 'auto': k.p('box', body, 0, 0, 0.2, 0.1, 0.15, 0.8).p('cyl', dark, 0, 0.02, 0.8, 0.06, 0.5, 0.06, Math.PI / 2).p('cyl', c === 0xffffff ? 0x4aa8e8 : c, 0, -0.16, 0.2, 0.26, 0.1, 0.26, 0, 0, Math.PI / 2).p('box', dark, 0, -0.04, -0.32, 0.08, 0.16, 0.3).p('box', dark, 0, 0.11, 0.2, 0.03, 0.05, 0.3); break;
      case 'shotgun': k.p('box', 0x8a5a36, 0, 0, 0, 0.09, 0.13, 0.6).p('cyl', dark, 0.035, 0.03, 0.55, 0.06, 0.6, 0.06, Math.PI / 2).p('cyl', dark, -0.035, 0.03, 0.55, 0.06, 0.6, 0.06, Math.PI / 2).p('box', c, 0, -0.05, 0.4, 0.12, 0.08, 0.25); break;
      case 'sniper': k.p('box', body, 0, 0, 0.1, 0.08, 0.12, 0.8).p('cyl', c, 0, 0.02, 0.95, 0.04, 0.95, 0.04, Math.PI / 2).p('cyl', dark, 0, 0.13, 0.15, 0.07, 0.36, 0.07, Math.PI / 2).p('box', dark, 0, -0.04, -0.42, 0.07, 0.16, 0.3).p('cone', c, 0, 0.02, 1.5, 0.07, 0.2, 0.07, Math.PI / 2); break;
      case 'launcher': k.p('cyl', dark, 0, 0.04, 0.25, 0.2, 1.0, 0.2, Math.PI / 2).p('cyl', c, 0, 0.04, 0.75, 0.24, 0.12, 0.24, Math.PI / 2).p('box', body, 0, -0.14, 0.1, 0.07, 0.2, 0.1).p('box', body, 0, -0.02, -0.3, 0.08, 0.14, 0.2); break;
      case 'flame': k.p('cyl', c, 0, 0, -0.1, 0.22, 0.5, 0.22, Math.PI / 2).p('cyl', dark, 0, 0.02, 0.45, 0.07, 0.7, 0.07, Math.PI / 2).p('cone', 0xffffff, 0, 0.02, 0.85, 0.16, 0.16, 0.16, -Math.PI / 2).p('box', dark, 0, -0.16, 0.2, 0.07, 0.2, 0.1); break;
      default: k.p('box', dark, 0, 0, 0, 0.07, 0.07, 0.24).p('cone4', c, 0, 0, 0.5, 0.12, 0.8, 0.04, Math.PI / 2); if (id === 'brass') k.p('sph', c, 0, 0, 0.6, 0.5, 0.14, 0.4);
    }
  });
}

export function makeChar(faction, cls) {
  const ac = FACTIONS[faction].color, key = faction + '_' + cls;
  let metrics;
  const torsoG = geo('t_' + key, k => { metrics = BUILD[faction](k, cls, ac); });
  if (!cache['m_' + key]) cache['m_' + key] = metrics; else metrics = cache['m_' + key];
  const flG = geo('f_' + faction, k => metrics.fl(k));
  const root = new THREE.Group(), tilt = new THREE.Group(), torso = mesh(torsoG);
  const flL = mesh(flG), flR = mesh(flG), gun = new THREE.Group();
  const [sx, sy, sz] = metrics.sh;
  flL.position.set(-sx, sy, sz); flR.position.set(sx, sy, sz); gun.position.set(sx * 0.72, metrics.wy, sz + 0.34);
  tilt.add(torso, flL, flR, gun); root.add(tilt);
  return { root, tilt, torso, flL, flR, gun, metrics, weaponMesh: null, phase: Math.random() * 6 };
}
export function setWeapon(model, id) {
  if (model.weaponMesh) model.gun.remove(model.weaponMesh);
  model.weaponMesh = mesh(weaponGeo(id), false); model.gun.add(model.weaponMesh);
  const s = model.metrics.h / 1.5; model.weaponMesh.scale.setScalar(0.9 + s * 0.25);
}

export function makeVehicle(type) {
  const root = new THREE.Group(); let turret = null;
  if (type === 'waddle') {
    root.add(mesh(geo('v_waddle', k => k.p('box', 0x38404f, 0.55, 0.12, 0.5, 0.22, 0.08, 1.7).p('box', 0x38404f, -0.55, 0.12, 0.5, 0.22, 0.08, 1.7).p('box', 0x38404f, 0.55, 0.22, 1.4, 0.22, 0.08, 0.4, -0.6).p('box', 0x38404f, -0.55, 0.22, 1.4, 0.22, 0.08, 0.4, -0.6)
      .p('box', BLACK, 0, 0.3, -0.75, 0.7, 0.4, 1.3).p('sph', ORANGE, 0, 0.62, 0.3, 1.0, 0.7, 2.2).p('box', BLACK, 0, 0.92, -0.45, 0.56, 0.16, 1.0).p('box', 0x8fd0f5, 0, 1.12, 0.62, 0.7, 0.44, 0.06, -0.5)
      .p('cyl', STEEL, 0, 1.0, 0.36, 0.05, 0.9, 0.05, 0, 0, Math.PI / 2).p('sph', 0xfff2b0, 0, 0.72, 1.36, 0.24).p('box', WHITE, 0, 0.6, 0.3, 1.02, 0.1, 1.2))));
  } else if (type === 'gentoo') {
    root.add(mesh(geo('v_gentoo', k => k.p('box', BLACK, 1.35, 0.5, 0, 0.6, 1.0, 5.2).p('box', BLACK, -1.35, 0.5, 0, 0.6, 1.0, 5.2).p('box', 0xe6eef7, 0, 0.95, 0, 2.6, 0.9, 5.0).p('box', 0xbcd8ee, 0, 1.15, 2.2, 2.5, 0.5, 1.2, 0.5)
      .p('box', ORANGE, 0, 1.42, -1.6, 2.2, 0.06, 0.5).p('box', 0x8fa6bd, 0.7, 1.0, 0.6, 1.0, 0.82, 1.5, 0, 0.5).p('box', 0x8fa6bd, -0.8, 1.0, -1.2, 1.0, 0.82, 1.2, 0, -0.4))));
    turret = mesh(geo('v_gentoo_t', k => k.p('dome', 0xe6eef7, 0, 0, 0, 2.3, 1.7, 2.6).p('cyl', 0x38404f, 0, 0.42, 2.2, 0.3, 3.0, 0.3, Math.PI / 2).p('cyl', WHITE, 0, 0.42, 3.7, 0.42, 0.4, 0.42, Math.PI / 2).p('cyl', BLACK, 0.5, 0.86, -0.2, 0.6, 0.16, 0.6).p('box', ORANGE, 0, 0.5, -1.0, 0.8, 0.3, 0.1)));
    turret.position.y = 1.4; root.add(turret);
  } else { // manta
    root.add(mesh(geo('v_manta', k => k.p('sph', 0x1f6f78, 0, 0.3, 0, 1.3, 0.6, 3.6).p('sph', 0x23b8a8, 0, 0.3, 0.2, 4.2, 0.16, 1.8).p('sph', 0x8fd0f5, 0, 0.55, 0.6, 0.8, 0.4, 1.2).p('cone', 0x1f6f78, 0, 0.35, -2.2, 0.2, 1.4, 0.2, -Math.PI / 2).p('box', 0x1f6f78, 0, 0.7, -1.4, 0.06, 0.6, 0.6))));
  }
  return { root, turret };
}
