// Procedural weapons and vehicles (baked from primitives). Animals live in animals.js.
import * as THREE from '../vendor/three.module.min.js';
import { Kit, bakedMat } from './kit.js';
import { WEAPONS } from './data.js';

const cache = {};
const geo = (key, fn) => cache[key] || (cache[key] = (() => { const k = new Kit(); fn(k); return k.bake().geometry; })());
const mesh = (g, shadow = true) => { const m = new THREE.Mesh(g, bakedMat); m.castShadow = shadow; return m; };

const STEEL = 0x6c7a8c, BLACK = 0x1e2333, WHITE = 0xffffff, ORANGE = 0xff9a2a;

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

export function weaponMesh(id) { return mesh(weaponGeo(id), false); }

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
