// Geometry kit: bakes many primitives into one vertex-coloured mesh (1 draw call).
import * as THREE from '../vendor/three.module.min.js';

export const G = {
  box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14), cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6), cyl8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  taper: new THREE.CylinderGeometry(0.32, 0.5, 1, 14), taper6: new THREE.CylinderGeometry(0.3, 0.5, 1, 6), cone: new THREE.ConeGeometry(0.5, 1, 14), cone4: new THREE.ConeGeometry(0.5, 1, 4), cone6: new THREE.ConeGeometry(0.5, 1, 6),
  prism: new THREE.CylinderGeometry(0.5, 0.5, 1, 3).rotateY(Math.PI).rotateX(Math.PI / 2), sph: new THREE.SphereGeometry(0.5, 12, 8), sphL: new THREE.SphereGeometry(0.5, 7, 5),
  dome: new THREE.SphereGeometry(0.5, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), domeL: new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), torus: new THREE.TorusGeometry(0.5, 0.05, 6, 24),
  arch: new THREE.TorusGeometry(0.5, 0.07, 6, 16, Math.PI), archL: new THREE.TorusGeometry(0.5, 0.12, 5, 8, Math.PI), ico: new THREE.IcosahedronGeometry(0.5, 0), oct: new THREE.OctahedronGeometry(0.5, 0),
  dod: new THREE.DodecahedronGeometry(0.5, 0), capsule: new THREE.CapsuleGeometry(0.5, 1, 6, 14),
};
export const C = { snow: 0xf4f9ff, ice: 0xbfe6fb, iceD: 0x8cc8ee, glass: 0x4aa8e8, wood: 0x8a5a36, woodD: 0x5e3b22, stone: 0x8b93a3, stoneD: 0x5d6475,
  tan: 0xd9c49a, kelp: 0x2f9d6a, black: 0x1c2030, white: 0xffffff, steel: 0x6c7a8c, rust: 0x8a4a2e, red: 0xd9433b, gold: 0xf2c230, rock: 0x6f7686, teal: 0x35d0c0,
  orange: 0xff8a1f, purple: 0x7a5cff, glow: 0xfff0a8, olive: 0x6f8a4a, path: 0xc9dcec, navy: 0x0d3a80, pink: 0xf4b8a0, cyan: 0x5ce8ff };
export const bakedMat = new THREE.MeshLambertMaterial({ vertexColors: true });

const _m = new THREE.Matrix4(), _n3 = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
export class Kit {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.idx = []; this.n = 0; this.base = new THREE.Matrix4(); this.cols = []; }
  at(x, y, z, ry, fn) { const old = this.base.clone(); this.base.multiply(_m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(1, 1, 1))); fn(); this.base.copy(old); }
  p(shape, color, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
    const g = G[shape], P = g.attributes.position.array, N = g.attributes.normal.array, cnt = P.length / 3;
    _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)).premultiply(this.base); _n3.getNormalMatrix(_m);
    const e = _m.elements, n = _n3.elements, pos = this.pos, nor = this.nor, col = this.col; _c.set(color);
    for (let i = 0; i < P.length; i += 3) {
      const a = P[i], b = P[i + 1], c = P[i + 2]; pos.push(e[0] * a + e[4] * b + e[8] * c + e[12], e[1] * a + e[5] * b + e[9] * c + e[13], e[2] * a + e[6] * b + e[10] * c + e[14]);
      const u = N[i], v = N[i + 1], w = N[i + 2], nx = n[0] * u + n[3] * v + n[6] * w, ny = n[1] * u + n[4] * v + n[7] * w, nz = n[2] * u + n[5] * v + n[8] * w, l = Math.hypot(nx, ny, nz) || 1;
      nor.push(nx / l, ny / l, nz / l); col.push(_c.r, _c.g, _c.b);
    }
    if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) this.idx.push(I[i] + this.n); } else for (let i = 0; i < cnt; i++) this.idx.push(i + this.n);
    this.n += cnt; return this;
  }
  // circle collider; `h` is height above the current base origin
  collide(x, z, r, h = 6) { _v.set(x, 0, z).applyMatrix4(this.base); this.cols.push({ x: _v.x, z: _v.z, r, top: _v.y + h }); }
  bake(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    this.pos = this.nor = this.col = this.idx = null;
    const m = new THREE.Mesh(g, mat || bakedMat); m.castShadow = true; m.receiveShadow = true; return m;
  }
}
