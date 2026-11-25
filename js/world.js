// Procedural Antarctica: terrain, ocean, sky, settlements, decor, collision.
import * as THREE from '../vendor/three.module.min.js';
import { LOCATIONS, FACTIONS, mulberry32, clamp, lerp, smooth } from './data.js';

export const SCALE = 3, CELL = 12, NX = 376, NZ = 278, X0 = -2250, Z0 = -1662;
export const toWorld = (px, py) => [(px - 750) * SCALE, (py - 554.5) * SCALE];

const LAND = [[128,190],[150,215],[160,255],[185,290],[235,318],[290,345],[338,378],[352,440],[362,495],[385,524],[430,516],[480,492],[520,462],[536,420],[524,352],[506,300],[520,255],[552,175],[600,108],[660,74],
  [725,86],[795,100],[870,110],[945,128],[972,180],[1040,176],[1085,190],[1130,218],[1142,262],[1152,320],[1166,366],[1130,378],[1168,392],
  [1185,430],[1216,482],[1230,560],[1236,640],[1224,700],[1196,750],[1172,792],[1150,850],[1110,900],[1050,950],[980,986],[900,1004],[806,990],[752,984],[740,958],[764,900],[760,862],
  [742,772],[702,732],[652,692],[622,702],[610,742],[592,790],[586,812],[550,836],
  [490,836],[446,822],[416,818],[346,794],[336,750],[318,712],[316,690],[302,622],[285,636],[266,646],[244,642],[244,600],[262,562],[256,520],[278,478],[266,450],
  [250,442],[222,440],[200,433],[188,398],[215,385],[195,362],[160,330],[156,292],[118,286],[96,232],[92,200]];
const SHELVES = [
  [[338,378],[400,352],[470,338],[524,352],[536,420],[520,462],[480,492],[430,516],[385,524],[362,495],[352,440]],
  [[760,862],[742,772],[702,732],[652,692],[622,702],[610,742],[592,790],[586,812],[550,836],[600,854],[680,874],[738,858]],
  [[1166,366],[1130,378],[1168,392],[1190,384]],
];
const RIDGES = [
  { pts: [[752,940],[748,840],[725,762],[680,702],[612,642],[545,575],[505,548]], w: 105, peak: 150 },
  { pts: [[140,206],[165,280],[240,332],[318,384]], w: 46, peak: 62 },
  { pts: [[300,570],[345,540],[385,562]], w: 60, peak: 125 },
  { pts: [[1000,330],[1060,420],[1050,520]], w: 90, peak: 85 },
  { pts: [[850,185],[905,235],[900,300]], w: 60, peak: 55 },
  { pts: [[1040,800],[1090,740],[1110,650]], w: 70, peak: 60 },
];
const MOUNDS = [{ px: 744, py: 834, r: 105, h: 85 }, { px: 470, py: 368, r: 90, h: 22 }];

function hash2(x, y) { let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
}
function fbm(x, y, o = 4) { let a = 0.5, s = 0, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); a *= 0.5; f *= 2.03; } return s; }
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay; let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = t < 0 ? 0 : t > 1 ? 1 : t; const ex = ax + dx * t - px, ey = ay + dy * t - py; return Math.sqrt(ex * ex + ey * ey);
}
function polyInfo(poly, px, py) { // [inside, distToEdge]
  let inside = false, d = 1e9;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const s = segDist(px, py, a[0], a[1], b[0], b[1]); if (s < d) d = s;
  }
  return [inside, d];
}

// ---------- geometry kit: bakes many primitives into one vertex-coloured mesh ----------
const G = {
  box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14), cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  taper: new THREE.CylinderGeometry(0.32, 0.5, 1, 14), cone: new THREE.ConeGeometry(0.5, 1, 14), cone4: new THREE.ConeGeometry(0.5, 1, 4),
  prism: new THREE.CylinderGeometry(0.5, 0.5, 1, 3).rotateY(Math.PI).rotateX(Math.PI / 2), sph: new THREE.SphereGeometry(0.5, 12, 8),
  dome: new THREE.SphereGeometry(0.5, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), torus: new THREE.TorusGeometry(0.5, 0.05, 6, 24),
  arch: new THREE.TorusGeometry(0.5, 0.07, 6, 16, Math.PI), ico: new THREE.IcosahedronGeometry(0.5, 0), oct: new THREE.OctahedronGeometry(0.5, 0),
  dod: new THREE.DodecahedronGeometry(0.5, 0), capsule: new THREE.CapsuleGeometry(0.5, 1, 6, 14),
};
export { G as SHAPES };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
export class Kit {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.idx = []; this.n = 0; this.base = new THREE.Matrix4(); this.cols = []; }
  at(x, y, z, ry, fn) { const old = this.base.clone(); this.base.multiply(_m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(1, 1, 1))); fn(); this.base.copy(old); }
  p(shape, color, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
    const g = G[shape].clone();
    _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)).premultiply(this.base);
    g.applyMatrix4(_m);
    const P = g.attributes.position.array, N = g.attributes.normal.array, cnt = P.length / 3;
    _c.set(color);
    for (let i = 0; i < P.length; i++) { this.pos.push(P[i]); this.nor.push(N[i]); }
    for (let i = 0; i < cnt; i++) this.col.push(_c.r, _c.g, _c.b);
    if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) this.idx.push(I[i] + this.n); }
    else for (let i = 0; i < cnt; i++) this.idx.push(i + this.n);
    this.n += cnt; g.dispose();
    return this;
  }
  collide(x, z, r, h = 6) { _v.set(x, 0, z).applyMatrix4(this.base); this.cols.push({ x: _v.x, z: _v.z, r, h }); }
  bake(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    const m = new THREE.Mesh(g, mat || bakedMat); m.castShadow = true; m.receiveShadow = true; return m;
  }
}
export const bakedMat = new THREE.MeshLambertMaterial({ vertexColors: true });

const C = { snow: 0xf4f9ff, ice: 0xbfe6fb, iceD: 0x8cc8ee, glass: 0x4aa8e8, wood: 0x8a5a36, woodD: 0x5e3b22, stone: 0x8b93a3, stoneD: 0x5d6475,
  tan: 0xd9c49a, kelp: 0x2f9d6a, black: 0x1c2030, white: 0xffffff, steel: 0x6c7a8c, rust: 0x8a4a2e, red: 0xd9433b, gold: 0xf2c230, rock: 0x6f7686, teal: 0x35d0c0 };

// ---------- buildings ----------
function flag(k, x, z, color, h = 7) { k.p('cyl', C.steel, x, h / 2, z, 0.18, h, 0.18).p('box', color, x + 1, h - 0.7, z, 2, 1.2, 0.08); }
function crate(k, x, z, s = 1.2, c = C.wood) { k.p('box', c, x, s / 2, z, s, s, s, 0, x); k.collide(x, z, s * 0.7, s); }
function lamp(k, x, z) { k.p('cyl', C.steel, x, 2, z, 0.15, 4, 0.15).p('sph', 0xfff2b0, x, 4.2, z, 0.7); }
function igloo(k, x, z, s, ac, ry) {
  k.at(x, 0, z, ry, () => {
    k.p('dome', C.snow, 0, 0, 0, s * 6, s * 6, s * 6).p('torus', ac, 0, 0.25, 0, s * 6.1, s * 6.1, 4, Math.PI / 2)
      .p('cyl', C.ice, 0, s * 0.9, s * 3.1, s * 2.2, s * 2.4, s * 2.2, Math.PI / 2).p('cyl', C.black, 0, s * 0.8, s * 4.25, s * 1.5, 0.2, s * 1.5, Math.PI / 2)
      .p('box', C.glass, s * 2.1, s * 1.6, s * 1.4, 0.3, s * 0.9, s * 0.9, 0, 0.5).p('cyl', ac, -s, s * 3, -s * 0.6, 0.5, 1.4, 0.5);
    k.collide(0, 0, s * 3.1, s * 3);
  });
}
function pTower(k, x, z, h, ac, ry) {
  k.at(x, 0, z, ry, () => {
    k.p('cyl', C.snow, 0, h / 2, 0, 5.5, h, 5.5).p('cyl', C.glass, 0, h * 0.72, 0, 5.7, h * 0.12, 5.7).p('cyl', C.glass, 0, h * 0.4, 0, 5.7, h * 0.1, 5.7)
      .p('dome', ac, 0, h, 0, 6.4, 5, 6.4).p('cyl', C.steel, 0, h + 4, 0, 0.15, 4, 0.15).p('box', C.black, 0, 1.3, 2.8, 1.6, 2.6, 0.3);
    k.collide(0, 0, 3, h);
  });
}
function hangar(k, x, z, ac, ry) {
  k.at(x, 0, z, ry, () => {
    k.p('cyl', C.ice, 0, 0, 0, 9, 13, 9, Math.PI / 2).p('box', C.steel, 0, 2, 6.55, 6, 4, 0.2).p('box', ac, 0, 4.4, 6.6, 6.4, 0.5, 0.2);
    k.collide(0, 3.3, 4.6, 4.5); k.collide(0, -3.3, 4.6, 4.5);
  });
}
function lodge(k, x, z, ac, ry, old) {
  const w = old ? C.stoneD : C.wood, r = old ? C.stone : C.woodD;
  k.at(x, 0, z, ry, () => {
    k.p('box', w, 0, 1.6, 0, 6, 3.2, 10).p('prism', r, 0, 4.3, 0, 7.6, 3.6, 10.6).p('box', C.stone, 2, 5, -3, 1, 3, 1)
      .p('box', C.black, 0, 1.2, 5.05, 1.5, 2.4, 0.15).p('box', ac, 3.05, 2.2, 1, 0.1, 1.6, 1.2).p('box', ac, -3.05, 2.2, -2, 0.1, 1.6, 1.2);
    if (old) k.p('box', C.kelp, 3.06, 1, -1, 0.1, 2, 3);
    k.collide(0, 2.6, 3.4, 5); k.collide(0, -2.6, 3.4, 5);
  });
}
function tent(k, x, z, ac) { k.p('cone', C.tan, x, 2.4, z, 5.4, 4.8, 5.4).p('cone', ac, x, 4.6, z, 1.4, 1.2, 1.4).p('box', C.woodD, x, 1, z + 2.3, 1.2, 2, 0.4); k.collide(x, z, 2.4, 4); }
function menhir(k, x, z, h, r) { k.p('box', C.stone, x, h / 2 - 0.3, z, 1.5, h, 1, r * 0.25 - 0.1, r * 6, r * 0.2 - 0.1); k.collide(x, z, 0.9, h); }
function orcaHall(k, x, z, s, ac, ry) {
  k.at(x, 0, z, ry, () => {
    k.p('sph', C.black, 0, s * 1.2, 0, s * 6, s * 5.4, s * 13).p('sph', C.white, 0, s * 0.3, 0, s * 5.6, s * 3, s * 12)
      .p('cone', C.black, 0, s * 4.6, -s, s * 0.7, s * 4, s * 3, -0.25).p('sph', C.white, s * 2.2, s * 2.3, s * 4, s * 1.2, s * 0.8, s * 2)
      .p('sph', C.white, -s * 2.2, s * 2.3, s * 4, s * 1.2, s * 0.8, s * 2).p('arch', ac, 0, 0, s * 6.2, s * 3.4, s * 4.4, s * 3)
      .p('box', C.black, s * 1.6, s * 0.6, -s * 6.8, s * 3.4, 0.4, s * 2, 0, 0.4).p('box', C.black, -s * 1.6, s * 0.6, -s * 6.8, s * 3.4, 0.4, s * 2, 0, -0.4);
    k.collide(0, 0, s * 3, s * 3.5); k.collide(0, s * 3.6, s * 2.6, s * 3); k.collide(0, -s * 3.6, s * 2.6, s * 3);
  });
}
function pylon(k, x, z, h, ac) { k.p('taper', C.black, x, h / 2, z, 2.2, h, 2.2).p('torus', ac, x, h * 0.8, z, 2.4, 2.4, 3, Math.PI / 2).p('dome', C.white, x, h, z, 1.5, 1.6, 1.5); k.collide(x, z, 1.1, h); }
function bunker(k, x, z, ac, ry) {
  k.at(x, 0, z, ry, () => {
    k.p('box', C.rust, 0, 1.8, 0, 8, 3.6, 6).p('box', 0x5a2f20, 0, 3.8, 0, 8.6, 0.5, 6.6).p('box', C.black, 0, 2.3, 3.05, 4, 0.6, 0.1)
      .p('cone', C.white, -3, 5.4, 2.4, 0.8, 3, 0.8, 0.3).p('cone', C.white, 3, 5.4, 2.4, 0.8, 3, 0.8, 0.3);
    flag(k, 0, -2, ac, 8); k.collide(-2, 0, 3.3, 4); k.collide(2, 0, 3.3, 4);
  });
}
function nest(k, x, z, h, ac) { k.p('cyl6', C.rock, x, h / 2, z, 3.4, h, 3.4).p('torus', C.woodD, x, h + 0.2, z, 3.6, 3.6, 8, Math.PI / 2).p('sph', C.white, x, h + 0.6, z, 1, 1.3, 1).p('box', ac, x + 1.9, h * 0.6, z, 0.1, 2.4, 1); k.collide(x, z, 1.9, h); }

const LANDMARKS = {
  lighthouse(k) { for (let i = 0; i < 5; i++) k.p('cyl', i % 2 ? C.white : C.red, 0, 2.5 + i * 5, 0, 6 - i * 0.6, 5, 6 - i * 0.6); k.p('cyl', 0xfff2a0, 0, 26.5, 0, 3.4, 3, 3.4).p('cone', C.red, 0, 29.5, 0, 4.6, 3, 4.6).p('cyl', C.stone, 0, 0.5, 0, 9, 1, 9); k.collide(0, 0, 3.2, 30); },
  wreck(k) { k.p('sph', C.woodD, 0, 1, 0, 9, 7, 26, 0.12, 0.4, 0.35).p('cyl', C.wood, 2, 8, 3, 0.5, 16, 0.5, 0.2, 0, 0.3).p('cyl', C.wood, -1, 6, -6, 0.4, 12, 0.4, 0.1, 0, 0.4).p('box', C.tan, 0, 10, 3, 5, 4, 0.1, 0.2, 0.4, 0.3); k.collide(0, 4, 4.5, 6); k.collide(0, -4, 4.5, 6); },
  hotspring(k, r) { k.p('cyl', C.teal, 0, 0.15, 0, 16, 0.3, 16); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; k.p('dod', C.rock, Math.cos(a) * 8.5, 0.6, Math.sin(a) * 8.5, 2 + r() * 2, 1.6 + r(), 2 + r() * 2, r(), r()); } for (let i = 0; i < 6; i++) k.p('sph', C.white, r() * 8 - 4, 2 + i * 1.4, r() * 8 - 4, 1.5 + i * 0.5); },
  skeleton(k) { for (let i = 0; i < 7; i++) k.p('arch', C.white, 0, 0, -9 + i * 3, 9 - Math.abs(i - 3), 11 - Math.abs(i - 3) * 1.5, 5); k.p('sph', C.white, 0, 2, 12.5, 4, 3.4, 6).p('cyl', C.white, 0, 0.6, 0, 0.7, 24, 0.7, Math.PI / 2); k.collide(0, 12, 2.4, 4); },
  totem(k) { const cs = [C.teal, C.red, C.gold, C.white, C.kelp]; for (let i = 0; i < 5; i++) k.p('box', cs[i], 0, 1.5 + i * 3, 0, 3 - i * 0.2, 3, 3 - i * 0.2, 0, i * 0.3); k.p('box', C.teal, 0, 11, 0, 11, 1.2, 0.4).p('cone', C.gold, 0, 17, 0, 2, 3, 2); k.collide(0, 0, 2, 16); },
  bonfire(k, r) { for (let i = 0; i < 6; i++) k.p('cyl', C.woodD, 0, 1.5, 0, 0.5, 5, 0.5, 0.5, i * 1.05, 0); k.p('cone', 0xff7a1a, 0, 2.6, 0, 2.6, 5, 2.6).p('cone', 0xffd23a, 0, 2, 0, 1.5, 3.4, 1.5); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; k.p('dod', C.stone, Math.cos(a) * 3.4, 0.4, Math.sin(a) * 3.4, 1.2); } for (let i = 0; i < 4; i++) k.p('cyl', C.wood, Math.cos(i * 1.57) * 6.5, 0.5, Math.sin(i * 1.57) * 6.5, 1, 4, 1, Math.PI / 2, i * 1.57 + 1.57); k.collide(0, 0, 2, 3); },
  bell(k) { k.p('box', C.wood, -3, 5, 0, 0.8, 10, 0.8).p('box', C.wood, 3, 5, 0, 0.8, 10, 0.8).p('box', C.woodD, 0, 10.2, 0, 8, 0.8, 1.4).p('cone', C.gold, 0, 7.6, 0, 3.6, 4, 3.6).p('sph', C.gold, 0, 5.4, 0, 1); k.collide(-3, 0, 0.7, 10); k.collide(3, 0, 0.7, 10); },
  skijump(k) { k.p('box', C.ice, 0, 14, -8, 5, 0.6, 34, -0.62).p('box', C.snow, 0, 3.6, 9.5, 5, 0.6, 9, 0.25); for (let i = 0; i < 4; i++) k.p('box', C.steel, 0, (22 - i * 5.5) / 2, -19 + i * 7, 4, 22 - i * 5.5, 0.7); k.p('box', C.red, 0, 25, -21, 6, 3, 4); flag(k, 3.5, 12, C.red, 5); k.collide(0, -19, 2.4, 22); k.collide(0, -12, 2.4, 16); },
  castle(k, r, ac) { for (const [x, z] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) { k.p('cyl', C.ice, x, 6, z, 6, 12, 6).p('cone', ac, x, 14.5, z, 7, 5, 7); k.collide(x, z, 3.1, 12); } for (let i = 0; i < 4; i++) k.at(0, 0, 0, i * Math.PI / 2, () => { if (i === 0) { k.p('box', C.iceD, -8.5, 3.5, 13, 9, 7, 2).p('box', C.iceD, 8.5, 3.5, 13, 9, 7, 2).p('box', C.iceD, 0, 6.5, 13, 8, 1.4, 2.4); for (const x of [-10, -7, 7, 10]) k.collide(x, 13, 1.6, 7); } else { k.p('box', C.iceD, 0, 3.5, 13, 26, 7, 2); for (let x = -11; x <= 11; x += 2.75) k.collide(x, 13, 1.5, 7); } }); k.p('cyl', C.snow, 0, 5, 0, 8, 10, 8).p('cone', ac, 0, 13, 0, 9, 6, 9); k.collide(0, 0, 4.2, 12); flag(k, 0, 0, ac, 20); },
  henge(k, r) { for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, x = Math.cos(a) * 15, z = Math.sin(a) * 15; k.p('box', C.stone, x, 4, z, 2, 8, 3, 0, -a).p('box', C.stoneD, Math.cos(a + 0.35) * 15, 8.5, Math.sin(a + 0.35) * 15, 2.2, 1.2, 9, 0, -a - 0.35); k.collide(x, z, 1.5, 8); } k.p('cyl', C.stoneD, 0, 0.6, 0, 6, 1.2, 6).p('oct', C.teal, 0, 3.4, 0, 2.2, 3.6, 2.2); },
  turbines(k) { for (const [x, z, a] of [[-12, 4, 0], [0, -6, 0.7], [12, 5, 1.6]]) { k.p('taper', C.white, x, 11, z, 1.4, 22, 1.4).p('sph', C.white, x, 22, z + 0.8, 1.8); for (let i = 0; i < 3; i++) k.p('box', C.white, x + Math.cos(a + i * 2.094) * 4.5, 22 + Math.sin(a + i * 2.094) * 4.5, z + 1.6, 9, 0.9, 0.2, 0, 0, a + i * 2.094); k.collide(x, z, 0.9, 22); } },
  clock(k, r, ac) { k.p('box', C.snow, 0, 9, 0, 6, 18, 6).p('box', ac, 0, 15, 0, 6.4, 0.6, 6.4).p('cone4', ac, 0, 21.5, 0, 9.5, 7, 9.5, 0, Math.PI / 4); for (let i = 0; i < 4; i++) k.p('cyl', C.white, Math.sin(i * 1.57) * 3.05, 12, Math.cos(i * 1.57) * 3.05, 4, 0.2, 4, Math.PI / 2, i * 1.57).p('box', C.black, Math.sin(i * 1.57) * 3.2, 12.6, Math.cos(i * 1.57) * 3.2, 0.25, 1.6, 0.25, 0, i * 1.57); k.p('box', C.steel, 0, 0.3, 14, 1, 0.4, 40).p('box', C.steel, 2.4, 0.3, 14, 1, 0.4, 40); k.collide(0, 0, 3.6, 18); },
  snowman(k) { k.p('sph', C.snow, 0, 5, 0, 12).p('sph', C.snow, 0, 13, 0, 9).p('sph', C.snow, 0, 19.5, 0, 6.4).p('cone', 0xff8a1f, 0, 19.5, 4.4, 1.2, 4, 1.2, Math.PI / 2).p('sph', C.black, -1.2, 20.6, 2.8, 0.8).p('sph', C.black, 1.2, 20.6, 2.8, 0.8).p('cyl', C.black, 0, 22.6, 0, 7, 0.4, 7).p('cyl', C.black, 0, 24.6, 0, 4.4, 4, 4.4).p('cyl', C.red, 0, 23.1, 0, 4.6, 0.8, 4.6).p('cyl', C.woodD, 6.5, 14.5, 0, 0.5, 8, 0.5, 0, 0, -1).p('cyl', C.woodD, -6.5, 14.5, 0, 0.5, 8, 0.5, 0, 0, 1).p('torus', C.red, 0, 16.6, 0, 6.4, 6.4, 14, Math.PI / 2); k.collide(0, 0, 5.6, 22); },
  market(k, r) { const cs = [C.red, C.gold, C.teal, 0xff8a1f, 0x7a5cff, 0x4aa8e8]; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; k.at(Math.cos(a) * 13, 0, Math.sin(a) * 13, -a + Math.PI / 2, () => { k.p('box', C.wood, 0, 0.9, 0, 4.5, 1.8, 2.5).p('prism', cs[i % 6], 0, 3.7, 0, 3.8, 1.6, 5, 0, Math.PI / 2, 0).p('cyl', C.wood, -2, 1.7, 1.1, 0.2, 3.4, 0.2).p('cyl', C.wood, 2, 1.7, 1.1, 0.2, 3.4, 0.2).p('sph', cs[(i + 2) % 6], 0.8, 2.1, 0, 0.8).p('sph', cs[(i + 3) % 6], -0.6, 2.1, 0.2, 0.7); k.collide(0, 0, 2.3, 4); }); } k.p('cyl', C.stone, 0, 0.5, 0, 8, 1, 8).p('cyl', C.teal, 0, 1.05, 0, 7, 0.1, 7).p('taper', C.stone, 0, 2.5, 0, 1.6, 4, 1.6).p('sph', C.gold, 0, 5.4, 0, 2); k.collide(0, 0, 4, 2); },
  radar(k) { k.p('cyl', C.steel, 0, 4, 0, 5, 8, 5).p('dome', C.white, 0, 15, 0, 17, 9, 17, Math.PI * 0.75).p('cyl', C.steel, 0, 9.5, 2, 1.2, 6, 1.2, 0.5).p('cyl', C.red, 0, 13.6, 6.4, 0.3, 9, 0.3, -0.8); for (const [x, z] of [[14, -8], [-13, -10]]) { k.p('cyl', C.steel, x, 9, z, 0.4, 18, 0.4).p('sph', C.red, x, 18.3, z, 0.9); k.collide(x, z, 0.5, 18); } k.collide(0, 0, 3, 16); },
  ferris(k, r, ac) { const cs = [C.red, C.gold, C.teal, 0xff8a1f, 0x7a5cff, 0x4aa8e8]; k.p('torus', C.white, 0, 19, 0, 30, 30, 4).p('torus', ac, 0, 19, 0, 27, 27, 3); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; if (i < 6) k.p('box', C.steel, 0, 19, 0, 29.6, 0.3, 0.3, 0, 0, a); k.p('box', cs[i % 6], Math.cos(a) * 15, 19 + Math.sin(a) * 15 - 1.2, 0, 2.6, 2.2, 2.4); } for (const s of [-1, 1]) k.p('box', C.steel, -5.5, 9.5, s * 2, 0.8, 21, 0.8, 0, 0, -0.55).p('box', C.steel, 5.5, 9.5, s * 2, 0.8, 21, 0.8, 0, 0, 0.55); k.p('cyl', ac, 0, 19, 0, 2.4, 5, 2.4, Math.PI / 2).p('box', C.stone, 0, 0.4, 0, 26, 0.8, 8); k.collide(-10, 0, 2, 4); k.collide(10, 0, 2, 4); },
  statue(k) { k.p('cyl', C.stone, 0, 2, 0, 9, 4, 9).p('capsule', C.gold, 0, 10, 0, 6.5, 5.5, 6.5).p('sph', C.gold, 0, 17.4, 0.4, 5.4).p('cone', C.gold, 0, 17.2, 3.6, 1.6, 3, 1.6, Math.PI / 2).p('sph', C.gold, 3.6, 10.5, 0, 1.4, 8, 3.4, 0, 0, 0.5).p('sph', C.gold, -3.6, 12.5, 0.6, 1.4, 8, 3.4, 0, 0, -2.4).p('cyl', C.gold, -6.6, 17.5, 1, 0.3, 6, 0.3).p('box', 0xff8a1f, -5.2, 19.5, 1, 2.6, 1.6, 0.1); k.collide(0, 0, 4.7, 18); },
  arch(k, r, ac) { k.p('arch', C.ice, 0, 0, 0, 34, 44, 34).p('arch', C.iceD, 0, 0, 0, 30, 38, 20); k.p('box', C.ice, -17, 3, 0, 7, 6, 7).p('box', C.ice, 17, 3, 0, 7, 6, 7).p('box', ac, -17, 12, 3.3, 3, 8, 0.1).p('box', ac, 17, 12, 3.3, 3, 8, 0.1).p('oct', C.gold, 0, 24.5, 0, 3, 4.5, 3); k.collide(-17, 0, 4.2, 8); k.collide(17, 0, 4.2, 8); },
  observatory(k) { k.p('cyl', C.snow, 0, 3.5, 0, 16, 7, 16).p('dome', C.steel, 0, 7, 0, 16, 16, 16).p('box', C.black, 0, 11.4, 4.4, 3, 7, 6, -0.7).p('cyl', C.white, 0, 13.6, 7.2, 1.8, 9, 1.8, 0.85).p('torus', 0x5cf2a8, 0, 7.1, 0, 16.4, 16.4, 4, Math.PI / 2); for (let i = 0; i < 5; i++) k.p('dome', 0x5cf2a8, -16 + i * 2, 0, 14 + (i % 2) * 3, 2.4, 3, 2.4, Math.PI * 0.8); k.collide(0, 0, 8.2, 14); },
  globe(k) { k.p('cyl', C.wood, 0, 1.5, 0, 15, 3, 15).p('torus', C.gold, 0, 3, 0, 15, 15, 6, Math.PI / 2).p('sph', 0xcdeeff, 0, 9.5, 0, 17).p('sph', C.white, -4, 15, 5.5, 3, 2, 1.4, 0, 0.6).p('cone', C.kelp, 5.5, 2.5, 10, 2.4, 5, 2.4).p('cone', C.kelp, -9, 2.5, 6, 2, 4, 2); k.collide(0, 0, 8, 16); },
  dreadnought(k, r, ac, sea) { k.at(sea.x, sea.y, sea.z, sea.a, () => { k.p('ico', C.ice, 0, 9, 0, 46, 30, 100).p('ico', C.iceD, 3, 15, -18, 32, 26, 44, 0.3, 0.5).p('ico', C.snow, -4, 16, 22, 26, 20, 36, 0.2, 1); for (const z of [-28, -6, 18, 36]) k.p('cyl', C.rust, 0, 25, z, 7, 3, 7).p('cyl', C.black, 0, 26.5, z + 5, 1.2, 10, 1.2, 1.35).p('cyl', C.black, 2.4, 26.5, z + 5, 1.2, 10, 1.2, 1.35); k.p('box', C.rust, 0, 31, -16, 9, 12, 12).p('box', C.black, 0, 34, -9.9, 7, 1.6, 0.2).p('cyl', C.black, 0, 41, -19, 2.4, 9, 2.4).p('cone', C.white, -9, 12, 52, 4, 26, 4, 1.2, 0, 0.2).p('cone', C.white, 9, 12, 52, 4, 26, 4, 1.2, 0, -0.2); flag(k, 0, -10, ac, 46); for (let z = -40; z <= 40; z += 10) k.collide(0, z, 18, 30); }); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + 0.3; k.p('cone', C.woodD, Math.cos(a) * 20, 2, Math.sin(a) * 20, 1, 6, 1, Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4); } },
  crystals(k, r) { for (let i = 0; i < 16; i++) { const a = r() * 6.283, d = r() * 11, h = 5 + r() * 14; k.p('oct', i % 3 ? 0x9a7cff : 0x5ce8ff, Math.cos(a) * d, h * 0.38, Math.sin(a) * d, 2 + r() * 2.4, h, 2 + r() * 2.4, r() * 0.5 - 0.25, r() * 3, r() * 0.5 - 0.25); } k.collide(0, 0, 6, 12); },
  battery(k, r, ac) { for (const x of [-12, 0, 12]) { k.at(x, 0, 0, 0, () => { k.p('cyl', C.black, -1.8, 1.2, 0, 2.4, 0.6, 2.4, 0, 0, Math.PI / 2).p('cyl', C.black, 1.8, 1.2, 0, 2.4, 0.6, 2.4, 0, 0, Math.PI / 2).p('box', 0x4f7d5a, 0, 2, 0, 3, 1.6, 4).p('cyl', 0x4f7d5a, 0, 5, 4.2, 1.1, 11, 1.1, 0.95).p('cyl', C.black, 0, 8.3, 8.8, 1.4, 1, 1.4, 0.95).p('box', C.woodD, 0, 0.7, -3.4, 0.6, 0.6, 5, 0.25); for (let i = 0; i < 5; i++) k.p('sph', C.snow, -3.4 + (i % 3) * 0.9, 0.5 + (i > 2 ? 0.8 : 0), -1 + (i > 2 ? 0.45 : 0), 1); k.collide(0, 0, 2.6, 4); }); } for (let i = 0; i < 16; i++) { const a = -0.3 + i / 15 * 3.74; k.p('sph', C.tan, Math.cos(a) * 22, 0.7, 6 + Math.sin(a) * 13, 3, 1.5, 1.8, 0, -a); } flag(k, 18, -6, ac, 9); },
  windmill(k, r, ac) { k.p('taper', C.snow, 0, 7, 0, 8, 14, 8).p('cone', ac, 0, 16, 0, 6.4, 4, 6.4).p('cyl', C.woodD, 0, 13, 3, 0.8, 3, 0.8, Math.PI / 2); for (let i = 0; i < 4; i++) k.p('box', C.wood, Math.cos(i * 1.571 + 0.4) * 5.5, 13 + Math.sin(i * 1.571 + 0.4) * 5.5, 4.4, 11, 2, 0.15, 0, 0, i * 1.571 + 0.4); k.p('box', C.black, 0, 1.4, 3.9, 1.6, 2.8, 0.2); k.collide(0, 0, 4.2, 14); },
  leviathan(k, r, ac, sea) { k.at(sea.x, sea.y, sea.z, sea.a, () => { k.p('sph', C.black, 0, 3, 0, 34, 20, 130).p('sph', C.white, 0, 0.5, 6, 31, 14, 112).p('cone', C.black, 0, 26, -8, 4, 30, 22, -0.3).p('sph', C.white, 13, 8, 42, 6, 5, 16).p('sph', C.white, -13, 8, 42, 6, 5, 16).p('box', C.black, 18, 3, -66, 34, 2, 16, 0, 0.5).p('box', C.black, -18, 3, -66, 34, 2, 16, 0, -0.5).p('box', C.steel, 0, 15.5, 16, 12, 8, 18).p('box', ac, 0, 17, 25.1, 10, 2, 0.2); for (const z of [-34, 36, 50]) k.p('cyl', C.steel, 0, 13.5, z, 8, 3, 8).p('cyl', C.black, -1.6, 15, z + 6, 1.2, 12, 1.2, 1.4).p('cyl', C.black, 1.6, 15, z + 6, 1.2, 12, 1.2, 1.4); for (const x of [-8, 8]) for (const z of [-20, 0]) k.p('cyl', C.steel, x, 13, z, 3, 2, 3).p('cyl', ac, x, 15, z, 0.6, 5, 0.6, 0.6, 0, x > 0 ? -0.5 : 0.5); k.p('cyl', C.steel, 0, 24, 18, 0.5, 12, 0.5).p('dome', C.white, 0, 29, 18, 5, 3, 5, Math.PI); for (let z = -50; z <= 50; z += 12.5) k.collide(0, z, 14, 14); }); k.p('box', C.black, 0, 0.5, 0, 8, 1, 46).p('box', C.white, 0, 1.05, 0, 6, 0.1, 44); for (const z of [-20, 0, 20]) pylon(k, 6.5, z, 9, ac); },
  ribs(k, r, ac) { for (let i = 0; i < 6; i++) k.p('arch', C.white, 0, 0, -20 + i * 8, 22 - Math.abs(i - 2.5) * 2, 30 - Math.abs(i - 2.5) * 3, 9).collide(11 - Math.abs(i - 2.5), -20 + i * 8, 1, 6), k.collide(-11 + Math.abs(i - 2.5), -20 + i * 8, 1, 6); pylon(k, 0, -30, 16, ac); },
  sonar(k, r, ac) { k.p('taper', C.black, 0, 12, 0, 5, 24, 5); for (let i = 0; i < 5; i++) k.p('torus', i % 2 ? ac : 0x5ce8ff, 0, 8 + i * 4.4, 0, 16 - i * 2.6, 16 - i * 2.6, 5, Math.PI / 2); k.p('sph', 0x5ce8ff, 0, 26, 0, 4); for (let i = 0; i < 4; i++) { const x = Math.cos(i * 1.57 + 0.8) * 16, z = Math.sin(i * 1.57 + 0.8) * 16; k.p('box', C.steel, x, 0.6, z, 7, 1.2, 4, 0, i).p('sph', C.black, x, 1.8, z, 5, 1.4, 2.4, 0, i).p('box', ac, x, 2.2, z, 1, 0.6, 5, 0, i); k.collide(x, z, 2.6, 3); } k.collide(0, 0, 2.6, 24); },
  calver(k, r, ac) { for (const [x, z] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) { k.p('sph', C.black, x, 2, z, 4, 3.4, 8).p('sph', C.white, x, 1.2, z, 3.6, 2, 7).p('cone', C.black, x, 4.4, z - 1, 0.5, 2.6, 2, -0.3).p('cyl', C.steel, x * 0.6, 5.5, z * 0.6, 0.4, 8, 0.4, z > 0 ? -0.5 : 0.5, 0, x > 0 ? 0.5 : -0.5); k.collide(x, z, 2.6, 4); } k.p('cyl', C.steel, 0, 9.5, 2, 5, 22, 5, 1.2).p('cyl', C.black, 0, 9.5, 2, 5.4, 3, 5.4, 1.2).p('cyl', ac, 0, 13.8, 13, 5.6, 1.4, 5.6, 1.2).p('cone', 0xff3a4a, 0, 14.6, 15, 4, 3, 4, 1.2).p('cyl', 0xff3a4a, 0, 20, 29, 0.5, 30, 0.5, 1.2); },
  volcano(k, r, ac, sea, mound) { if (!mound) return; k.p('cyl', C.black, mound.x, mound.y - 1, mound.z, 22, 3, 22).p('cyl', 0xff5a1a, mound.x, mound.y + 0.6, mound.z, 15, 0.4, 15); for (let i = 0; i < 9; i++) k.p('sph', i < 3 ? 0x8a8f9c : 0xd6dae2, mound.x + i * 2.6 + r() * 3, mound.y + 5 + i * 5.4, mound.z + r() * 4, 7 + i * 2.2); pylon(k, -12, 6, 10, 0x7a5cff); pylon(k, 12, -8, 7, 0x7a5cff); },
  airfield(k, r, ac) { k.p('box', C.black, 0, 0.15, 0, 12, 0.3, 70).p('box', C.black, 0, 4.4, 42, 12, 0.6, 20, -0.42); for (let z = -30; z < 30; z += 8) k.p('box', C.white, 0, 0.32, z, 0.6, 0.05, 4); k.at(0, 2.4, -14, 0, () => { k.p('sph', 0x59616f, 0, 0, 0, 4.4, 3.6, 22).p('box', 0x59616f, 0, 0.4, -1, 46, 0.5, 6.5).p('box', 0x424956, 0, 0.5, -3, 30, 0.4, 3, 0, 0, 0).p('cone4', 0x424956, 0, 2.2, -9.5, 1, 5, 6, -0.3).p('cone', C.gold, 0, -0.2, 11.6, 1.6, 3.4, 1.6, Math.PI / 2 + 0.2).p('sph', C.white, 1.6, 0.9, 8, 1.2).p('sph', C.white, -1.6, 0.9, 8, 1.2).p('cyl', ac, 9, -0.6, 0, 1.4, 4, 1.4, Math.PI / 2).p('cyl', ac, -9, -0.6, 0, 1.4, 4, 1.4, Math.PI / 2).p('cyl', C.steel, 0, -1.4, 4, 0.5, 2.4, 0.5).p('cyl', C.steel, 6, -1.4, -1, 0.5, 2.4, 0.5).p('cyl', C.steel, -6, -1.4, -1, 0.5, 2.4, 0.5); k.collide(0, 0, 4, 5); }); k.p('cyl', C.steel, 16, 8, 20, 4, 16, 4).p('cyl', C.glass, 16, 17, 20, 7, 3, 7).p('cone', ac, 16, 20, 20, 7.6, 3, 7.6); k.collide(16, 20, 2.4, 18); },
  spire(k, r, ac) { k.p('cyl6', C.rock, 0, 16, 0, 9, 32, 7, 0, 0.3).p('cyl6', C.stoneD, 4, 9, 3, 6, 18, 6, 0.08, 1).p('cyl6', C.rock, -5, 6, -2, 5, 12, 5, 0, 2); nest(k, 0, 0, 32.2, ac); k.p('torus', C.woodD, 4, 18.2, 3, 5, 5, 8, Math.PI / 2).p('torus', C.woodD, -5, 12.2, -2, 4.4, 4.4, 8, Math.PI / 2).p('sph', C.white, 4, 18.7, 3, 1.2, 1.5, 1.2); for (let i = 0; i < 5; i++) k.p('box', i % 2 ? C.white : ac, 5.2, 28 - i * 4, 0, 0.1, 3, 1.6); k.collide(0, 0, 6.5, 30); },
  pole(k) { for (let i = 0; i < 8; i++) k.p('cyl', i % 2 ? C.white : C.red, 0, 1 + i * 2, 0, 1.2, 2, 1.2); k.p('sph', 0xdfe8f2, 0, 18.4, 0, 5).p('torus', C.gold, 0, 18.4, 0, 6.4, 6.4, 3, Math.PI / 2 - 0.4).p('cyl', C.stone, 0, 0.4, 0, 9, 0.8, 9); let i = 0; for (const f in FACTIONS) { const a = i++ / 5 * Math.PI + 0.3; flag(k, Math.cos(a) * 14, -Math.sin(a) * 14, FACTIONS[f].color, 9); } k.collide(0, 0, 1.2, 16); },
  monolith(k, r) { k.p('box', 0x12141c, 0, 14, 0, 9, 28, 2.4).p('cyl6', C.stoneD, 0, 0.8, 0, 22, 1.6, 22); for (let i = 0; i < 3; i++) k.p('torus', C.gold, 0, 12 + i * 7, 0, 18 - i * 3, 18 - i * 3, 5, Math.PI / 2 + (i - 1) * 0.3, 0, i * 0.5); for (let i = 0; i < 6; i++) nest(k, Math.cos(i * 1.047) * 19, Math.sin(i * 1.047) * 19, 3 + (i % 3) * 2, C.gold); k.collide(0, 0, 4.6, 28); },
};

function buildLocation(loc, world) {
  const r = mulberry32(loc.px * 131 + loc.py * 7), k = new Kit(), f = loc.f, ac = FACTIONS[f].color, R = loc.R;
  const sea = { x: 0, y: 0, z: 0, a: 0 };
  { // find nearest open water direction for ships
    let best = 1e9;
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; let s = 0; for (const d of [1.3, 1.9, 2.6]) s += world.h(loc.x + Math.sin(a) * R * d, loc.z + Math.cos(a) * R * d); if (s < best) { best = s; sea.a = a; } }
    const d = R * 2.1; sea.x = Math.sin(sea.a) * d; sea.z = Math.cos(sea.a) * d; sea.y = -loc.y - 1.5; sea.a += Math.PI / 2;
  }
  let mound = null;
  if (loc.landmark === 'volcano') { const [mx, mz] = toWorld(MOUNDS[0].px, MOUNDS[0].py); mound = { x: mx - loc.x, z: mz - loc.z, y: world.h(mx, mz) - loc.y }; }
  const lmOff = loc.size > 1 ? { x: (r() - 0.5) * R * 0.3, z: (r() - 0.5) * R * 0.3 } : { x: 0, z: 0 };
  const fixed = ['dreadnought', 'leviathan', 'volcano'].includes(loc.landmark);
  if (fixed) lmOff.x = lmOff.z = 0;
  k.at(lmOff.x, 0, lmOff.z, fixed ? 0 : r() * 6.283, () => LANDMARKS[loc.landmark](k, r, ac, sea, mound));
  const placed = [{ x: lmOff.x, z: lmOff.z, r: 26 }];
  const spot = (rad, tries = 30) => { for (let i = 0; i < tries; i++) { const a = r() * 6.283, d = 20 + r() * (R - 24), x = Math.cos(a) * d, z = Math.sin(a) * d; if (placed.every(p => Math.hypot(p.x - x, p.z - z) > p.r + rad)) { placed.push({ x, z, r: rad }); return { x, z, a: Math.atan2(-x, -z) + (r() - 0.5) }; } } return null; };
  const n = Math.max(3, Math.round([0, 5, 10, 17][loc.size] * (R / loc.full) ** 2));
  const style = (f2, i, old) => {
    let s;
    if (f2 === 'penguins') { const t = r(); if (t < 0.55) { if (s = spot(5)) igloo(k, s.x, s.z, 0.8 + r() * 0.6, ac, s.a); } else if (t < 0.8 && loc.size > 1) { if (s = spot(6)) pTower(k, s.x, s.z, 9 + r() * 10, ac, s.a); } else if (s = spot(8)) hangar(k, s.x, s.z, ac, s.a); }
    else if (f2 === 'seals') { const t = r(); if (old) { if (t < 0.5) { if (s = spot(7)) lodge(k, s.x, s.z, C.kelp, s.a, true); } else if (s = spot(2)) menhir(k, s.x, s.z, 4 + r() * 4, r()); } else if (t < 0.5) { if (s = spot(7)) lodge(k, s.x, s.z, ac, s.a); } else if (t < 0.85) { if (s = spot(4)) tent(k, s.x, s.z, ac); } else if (s = spot(2)) menhir(k, s.x, s.z, 4 + r() * 3, r()); }
    else if (f2 === 'orcas') { const t = r(); if (t < 0.5) { if (s = spot(9)) orcaHall(k, s.x, s.z, 0.8 + r() * 0.5, ac, s.a); } else if (s = spot(3)) pylon(k, s.x, s.z, 6 + r() * 9, ac); }
    else if (f2 === 'walrus') { if (r() < 0.6) { if (s = spot(7)) bunker(k, s.x, s.z, ac, s.a); } else if (s = spot(3)) { k.p('cone', C.woodD, s.x, 3, s.z, 1.4, 6, 1.4, 0.3, 0, 0.2); crate(k, s.x + 2, s.z, 1.6, C.rust); } }
    else { if (s = spot(4)) nest(k, s.x, s.z, 3 + r() * 8, ac); }
  };
  for (let i = 0; i < n; i++) style(loc.heritage && i % 3 === 0 ? loc.heritage : f, i, loc.heritage && i % 3 === 0 && loc.heritage === 'seals');
  // props
  for (let i = 0; i < 4 + loc.size * 3; i++) { const s = spot(2.2, 10); if (!s) continue; const t = r(); if (t < 0.3) crate(k, s.x, s.z, 1 + r() * 0.8, f === 'orcas' ? C.black : f === 'walrus' ? C.rust : C.wood); else if (t < 0.5) lamp(k, s.x, s.z); else if (t < 0.7) flag(k, s.x, s.z, ac); else if (t < 0.85) { for (let j = 0; j < 4; j++) k.p('sph', C.snow, s.x + (j % 3) * 0.9 - 0.9, 0.5 + (j > 2 ? 0.8 : 0), s.z, 1.05); } else { k.p('cyl', f === 'penguins' ? 0x4aa8e8 : C.woodD, s.x, 0.8, s.z, 1.2, 1.6, 1.2); k.collide(s.x, s.z, 0.7, 1.6); } }
  // mission board + bank beacon
  const bs = spot(3, 60) || { x: 18, z: 18 };
  k.p('box', C.woodD, bs.x - 1.6, 1.5, bs.z, 0.3, 3, 0.3).p('box', C.woodD, bs.x + 1.6, 1.5, bs.z, 0.3, 3, 0.3).p('box', C.tan, bs.x, 2.3, bs.z, 3.6, 2, 0.2).p('box', ac, bs.x, 3.5, bs.z, 4, 0.4, 0.5).p('box', C.red, bs.x - 0.8, 2.5, bs.z + 0.12, 0.8, 1, 0.05).p('box', C.white, bs.x + 0.6, 2.2, bs.z + 0.12, 1, 1.2, 0.05);
  k.collide(bs.x, bs.z, 1.9, 4); loc.board = { x: loc.x + bs.x, z: loc.z + bs.z };
  const mesh = k.bake(); mesh.position.set(loc.x, loc.y, loc.z);
  for (const c of k.cols) world.addCollider(loc.x + c.x, loc.z + c.z, c.r, loc.y + c.h);
  return mesh;
}

// ---------- the world ----------
export class World {
  constructor(scene, quality) {
    this.scene = scene; this.quality = quality;
    this.H = new Float32Array(NX * NZ); this.kind = new Uint8Array(NX * NZ); // 0 sea 1 land 2 shelf
    this.colGrid = new Map(); this.time = 0;
    this.locs = LOCATIONS.map(l => { const [x, z] = toWorld(l.px, l.py); return { ...l, x, z, R: 45 + 22 * l.size }; });
    for (const l of this.locs) { let nd = 1e9; for (const o of this.locs) if (o !== l) nd = Math.min(nd, Math.hypot(o.x - l.x, o.z - l.z)); l.full = l.R; l.R = Math.max(38, Math.min(l.R, nd * 0.42)); }
    this.locById = Object.fromEntries(this.locs.map(l => [l.id, l]));
    this.genHeights(); this.buildTerrain(); this.buildSkyWater(); this.buildDecor();
    this.locMeshes = this.locs.map(l => { const m = buildLocation(l, this); scene.add(m); return m; });
  }
  rawHeight(x, z, info) {
    const px = x / SCALE + 750, py = z / SCALE + 554.5;
    const wx = px + (fbm(px / 36, py / 36, 3) - 0.5) * 22, wy = py + (fbm(px / 36 + 9, py / 36 + 4, 3) - 0.5) * 22;
    const [inL, dL] = polyInfo(LAND, wx, wy); const d = dL * SCALE;
    let h, kind = 0;
    if (inL) {
      kind = 1;
      h = 2.2 + 20 * smooth(d / 110) + 46 * smooth((d - 90) / 650) + 30 * smooth((d - 300) / 900);
      h += (fbm(x / 170, z / 170) - 0.45) * 30 * smooth(d / 220) + (fbm(x / 34, z / 34, 3) - 0.5) * 4.5 * smooth(d / 50);
      const land = smooth(d / 70);
      for (const rg of RIDGES) { let dr = 1e9; for (let i = 0; i < rg.pts.length - 1; i++) { const a = rg.pts[i], b = rg.pts[i + 1], s = segDist(px, py, a[0], a[1], b[0], b[1]); if (s < dr) dr = s; } const m = 1 - dr * SCALE / (rg.w * 2); if (m > 0) { const rn = 1 - Math.abs(fbm(x / 55, z / 55, 3) * 2 - 1); h += rg.peak * m * m * (0.4 + 0.75 * rn) * land; } }
    } else {
      let shelf = false, ds = 0;
      for (const s of SHELVES) { const [i2, d2] = polyInfo(s, wx, wy); if (i2) { shelf = true; ds = d2 * SCALE; } }
      if (shelf) { kind = 2; h = 3.2 + (fbm(x / 60, z / 60, 3) - 0.5) * 1.2 + smooth(ds / 300) * 1.5; }
      else h = -2.5 - 11 * smooth(d / 170) + (fbm(x / 50, z / 50, 2) - 0.5) * 2;
    }
    for (const m of MOUNDS) { const [mx, mz] = toWorld(m.px, m.py), dm = Math.hypot(x - mx, z - mz); if (dm < m.r) { const t = smooth(1 - dm / m.r); h = Math.max(h, 2) + m.h * t * t * (0.85 + 0.3 * fbm(x / 30, z / 30, 2)); if (kind === 0) kind = 1; } }
    if (info) info.kind = kind;
    return h;
  }
  genHeights() {
    const info = {}; const locs = this.locs;
    for (const l of locs) l.y = Math.max(this.rawHeight(l.x, l.z), 2.4);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = X0 + i * CELL, z = Z0 + j * CELL; let h = this.rawHeight(x, z, info), kind = info.kind;
      for (const l of locs) { const dx = x - l.x, dz = z - l.z; if (Math.abs(dx) > l.R * 1.7 || Math.abs(dz) > l.R * 1.7) continue; const w = smooth((l.R * 1.65 - Math.hypot(dx, dz)) / (l.R * 0.65)); if (w > 0) { h = lerp(h, l.y, w); if (w > 0.5 && kind === 0) kind = 1; } }
      this.H[j * NX + i] = h; this.kind[j * NX + i] = kind;
    }
  }
  h(x, z) {
    let fx = (x - X0) / CELL, fz = (z - Z0) / CELL; fx = clamp(fx, 0, NX - 1.001); fz = clamp(fz, 0, NZ - 1.001);
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, H = this.H, o = j * NX + i;
    return lerp(lerp(H[o], H[o + 1], u), lerp(H[o + NX], H[o + NX + 1], u), v);
  }
  ground(x, z) { return Math.max(this.h(x, z), -0.42); } // swim line
  isWater(x, z) { return this.h(x, z) < -0.6; }
  normal(x, z, out) { const e = 2.5; return out.set(this.h(x - e, z) - this.h(x + e, z), 2 * e, this.h(x, z - e) - this.h(x, z + e)).normalize(); }
  buildTerrain() {
    const cols = new Float32Array(NX * NZ * 3), H = this.H; const c = new THREE.Color();
    const cv = document.createElement('canvas'); cv.width = NX; cv.height = NZ; const ctx = cv.getContext('2d'), img = ctx.createImageData(NX, NZ);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const o = j * NX + i, h = H[o], x = X0 + i * CELL, z = Z0 + j * CELL;
      const hx = H[j * NX + Math.min(i + 1, NX - 1)] - H[j * NX + Math.max(i - 1, 0)], hz = H[Math.min(j + 1, NZ - 1) * NX + i] - H[Math.max(j - 1, 0) * NX + i];
      const slope = Math.hypot(hx, hz) / (2 * CELL), n = fbm(x / 23, z / 9, 2);
      if (h < -0.3) { const t = smooth((-h - 0.3) / 11); c.setRGB(lerp(0.62, 0.05, t), lerp(0.88, 0.2, t), lerp(0.97, 0.5, t)); }
      else if (this.kind[o] === 2 && h < 7) c.setRGB(0.83 + n * 0.05, 0.94 + n * 0.02, 1.0);
      else {
        const rock = smooth((slope - 0.42) / 0.3) * smooth((h - 12) / 20), coast = 1 - smooth((h - 1) / 7);
        c.setRGB(0.93 + n * 0.07, 0.955 + n * 0.045, 1.0);
        c.r = lerp(c.r, 0.78, coast * 0.8); c.g = lerp(c.g, 0.91, coast * 0.8);
        c.r = lerp(c.r, 0.40 + n * 0.1, rock); c.g = lerp(c.g, 0.43 + n * 0.1, rock); c.b = lerp(c.b, 0.53 + n * 0.1, rock);
        const sh = clamp(1 + (hx - hz) * 0.012, 0.86, 1.06); c.r *= sh; c.g *= sh; // baked soft relief
      }
      cols[o * 3] = c.r; cols[o * 3 + 1] = c.g; cols[o * 3 + 2] = c.b;
      const sh2 = clamp(1 + (hx - hz) * 0.03, 0.7, 1.1), mm = h < -0.3 ? 1 : sh2;
      img.data[o * 4] = Math.min(255, c.r * 255 * mm); img.data[o * 4 + 1] = Math.min(255, c.g * 255 * mm); img.data[o * 4 + 2] = Math.min(255, c.b * 255); img.data[o * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); this.mapCanvas = cv;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true }), CH = 47;
    this.terrain = new THREE.Group();
    for (let cj = 0; cj < NZ - 1; cj += CH) for (let ci = 0; ci < NX - 1; ci += CH) {
      const w = Math.min(CH, NX - 1 - ci), d = Math.min(CH, NZ - 1 - cj), P = new Float32Array((w + 1) * (d + 1) * 3), Cc = new Float32Array(P.length), Nn = new Float32Array(P.length), I = [];
      for (let j = 0; j <= d; j++) for (let i = 0; i <= w; i++) {
        const gi = ci + i, gj = cj + j, o = gj * NX + gi, p = (j * (w + 1) + i) * 3;
        P[p] = X0 + gi * CELL; P[p + 1] = H[o]; P[p + 2] = Z0 + gj * CELL; Cc[p] = cols[o * 3]; Cc[p + 1] = cols[o * 3 + 1]; Cc[p + 2] = cols[o * 3 + 2];
        const hx = H[gj * NX + Math.min(gi + 1, NX - 1)] - H[gj * NX + Math.max(gi - 1, 0)], hz = H[Math.min(gj + 1, NZ - 1) * NX + gi] - H[Math.max(gj - 1, 0) * NX + gi], l = Math.hypot(hx, 2 * CELL, hz);
        Nn[p] = -hx / l; Nn[p + 1] = 2 * CELL / l; Nn[p + 2] = -hz / l;
        if (i < w && j < d) { const a = j * (w + 1) + i, b = a + 1, e = a + w + 1, f = e + 1; I.push(a, e, b, b, e, f); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); g.setIndex(I);
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; this.terrain.add(m);
    }
    this.scene.add(this.terrain);
  }
  buildSkyWater() {
    const s = this.scene; const fogC = new THREE.Color(0xd4ecfc);
    s.fog = new THREE.Fog(fogC, 180, this.quality > 0 ? 1500 : 1000); s.background = fogC;
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h=clamp(vP.y,0.0,1.0); vec3 c=mix(vec3(0.83,0.925,0.99),vec3(0.2,0.55,0.93),pow(h,0.55)); float s=pow(max(dot(vP,normalize(vec3(0.45,0.5,0.35))),0.0),350.0); c+=vec3(1.0,0.95,0.8)*s*1.5+vec3(1.0,0.9,0.7)*pow(max(dot(vP,normalize(vec3(0.45,0.5,0.35))),0.0),12.0)*0.25; gl_FragColor=vec4(c,1.0); }' }));
    s.add(this.sky);
    this.waterU = { t: { value: 0 }, fogC: { value: fogC }, fogN: { value: s.fog.near }, fogF: { value: s.fog.far } };
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.ShaderMaterial({ transparent: true, uniforms: this.waterU,
      vertexShader: 'varying vec3 vW; varying float vD; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mv=viewMatrix*w; vD=-mv.z; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform float t; uniform vec3 fogC; uniform float fogN; uniform float fogF; varying vec3 vW; varying float vD; void main(){ float n=sin(vW.x*0.23+t*1.2)*sin(vW.z*0.19-t)+sin((vW.x+vW.z)*0.07+t*0.6); vec3 c=mix(vec3(0.07,0.33,0.72),vec3(0.2,0.6,0.9),0.5+0.25*n); float sp=smoothstep(1.55,1.8,n+sin(vW.x*1.3-t*2.0)*sin(vW.z*1.5+t*1.6)); c+=sp*0.3; float f=smoothstep(fogN,fogF,vD); gl_FragColor=vec4(mix(c,fogC,f),mix(0.74,1.0,f)); }' }));
    this.water.rotation.x = -Math.PI / 2; s.add(this.water);
    s.add(this.hemi = new THREE.HemisphereLight(0xe6f3ff, 0xa8c8ea, 1.4));
    this.sun = new THREE.DirectionalLight(0xfff4e0, 2.7); this.sunDir = new THREE.Vector3(0.45, 0.5, 0.35).normalize(); s.add(this.sun, this.sun.target);
    if (this.quality > 0) { const sh = this.sun.shadow; this.sun.castShadow = true; sh.mapSize.set(this.quality > 1 ? 2048 : 1024, this.quality > 1 ? 2048 : 1024); const cam = sh.camera; cam.left = cam.bottom = -70; cam.right = cam.top = 70; cam.near = 1; cam.far = 400; sh.bias = -0.0015; sh.normalBias = 0.05; }
    // falling snow
    const n = this.quality > 0 ? 900 : 350, P = new Float32Array(n * 3); for (let i = 0; i < P.length; i++) P[i] = Math.random() * 70;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    this.snowU = { t: { value: 0 }, cam: { value: new THREE.Vector3() } };
    this.snow = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: this.snowU,
      vertexShader: 'uniform float t; uniform vec3 cam; void main(){ vec3 p=position+vec3(t*2.2+sin(t+position.y)*0.6,-t*4.0,t*0.8); p=mod(p-cam,70.0)-35.0+cam; vec4 mv=viewMatrix*vec4(p,1.0); gl_PointSize=min(6.0,90.0/-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'void main(){ float d=length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor=vec4(1.0,1.0,1.0,0.85*(1.0-d*2.0)); }' }));
    this.snow.frustumCulled = false; s.add(this.snow);
  }
  buildDecor() {
    const r = mulberry32(77), d = new THREE.Object3D();
    const inst = (geo, color, n, place) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true }), n); let c = 0; for (let t = 0; t < n * 12 && c < n; t++) { const x = X0 + 30 + r() * (-2 * X0 - 60), z = Z0 + 30 + r() * (-2 * Z0 - 60); if (place(x, z, d)) { d.updateMatrix(); m.setMatrixAt(c++, d.matrix); } } m.count = c; m.castShadow = true; m.receiveShadow = true; this.scene.add(m); };
    const clear = (x, z) => this.locs.every(l => Math.hypot(l.x - x, l.z - z) > l.R * 1.5);
    inst(G.dod, 0x7c8494, 800, (x, z, d) => { const h = this.h(x, z); if (h < 3 || !clear(x, z)) return false; const s = 1.5 + r() * r() * 9; d.position.set(x, h + s * 0.2, z); d.scale.set(s, s * (0.6 + r() * 0.5), s * (0.8 + r() * 0.4)); d.rotation.set(r(), r() * 6, r()); if (s > 3) this.addCollider(x, z, s * 0.45, h + s * 0.5); return true; });
    inst(new THREE.ConeGeometry(0.5, 1, 5), 0xa9dcf7, 700, (x, z, d) => { const h = this.h(x, z); if (h < 2.5 || !clear(x, z)) return false; const s = 2 + r() * 7; d.position.set(x, h + s * 0.4, z); d.scale.set(s * 0.45, s, s * 0.45); d.rotation.set(r() * 0.3 - 0.15, r() * 6, r() * 0.3 - 0.15); if (s > 4) this.addCollider(x, z, s * 0.18, h + s); return true; });
    inst(new THREE.SphereGeometry(0.5, 8, 5), 0xf9fcff, 900, (x, z, d) => { const h = this.h(x, z); if (h < 2.5 || !clear(x, z)) return false; const s = 3 + r() * 9; d.position.set(x, h - s * 0.12, z); d.scale.set(s, s * 0.38, s * (0.6 + r() * 0.5)); d.rotation.set(0, r() * 6, 0); return true; });
    inst(G.ico, 0xcfeeff, 200, (x, z, d) => { const h = this.h(x, z); if (h > -6 || !clear(x, z)) return false; const s = 8 + r() * r() * 38; d.position.set(x, s * 0.12, z); d.scale.set(s, s * (0.5 + r() * 0.5), s * (0.7 + r() * 0.6)); d.rotation.set(r() * 0.3, r() * 6, r() * 0.3); this.addCollider(x, z, s * 0.4, s * 0.4); return true; });
  }
  addCollider(x, z, r, top) { const c = { x, z, r, top }, g = 24; for (let i = Math.floor((x - r) / g); i <= Math.floor((x + r) / g); i++) for (let j = Math.floor((z - r) / g); j <= Math.floor((z + r) / g); j++) { const key = i * 10007 + j; let a = this.colGrid.get(key); if (!a) this.colGrid.set(key, a = []); a.push(c); } }
  // push a circle out of obstacles (returns true if touched)
  collide(p, rad) {
    const a = this.colGrid.get(Math.floor(p.x / 24) * 10007 + Math.floor(p.z / 24)); if (!a) return false; let hit = false;
    for (const c of a) { if (p.y > c.top) continue; const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + rad; if (d < m && d > 1e-4) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; hit = true; } }
    return hit;
  }
  pointBlocked(x, y, z) {
    if (y < this.h(x, z)) return true;
    const a = this.colGrid.get(Math.floor(x / 24) * 10007 + Math.floor(z / 24)); if (!a) return false;
    for (const c of a) if (y < c.top && (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) return true;
    return false;
  }
  los(a, b) { // coarse line-of-sight between two eye points
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, n = Math.ceil(Math.hypot(dx, dz) / 4);
    for (let i = 1; i < n; i++) { const t = i / n; if (this.pointBlocked(a.x + dx * t, a.y + dy * t, a.z + dz * t)) return false; }
    return true;
  }
  landPointNear(x, z, rMin, rMax, rng = Math.random, allowWater = false) {
    for (let i = 0; i < 40; i++) { const a = rng() * 6.283, d = rMin + rng() * (rMax - rMin), px = clamp(x + Math.cos(a) * d, X0 + 40, -X0 - 40), pz = clamp(z + Math.sin(a) * d, Z0 + 40, -Z0 - 40); const p = { x: px, y: 0, z: pz }; if ((allowWater || this.h(px, pz) > 1) && !this.pointBlocked(px, this.h(px, pz) + 1, pz)) return p; }
    return { x, y: 0, z };
  }
  nearestLoc(x, z, filter) { let b = null, bd = 1e9; for (const l of this.locs) { if (filter && !filter(l)) continue; const d = Math.hypot(l.x - x, l.z - z); if (d < bd) { bd = d; b = l; } } return b; }
  update(dt, cam, focus) {
    this.time += dt; this.waterU.t.value = this.time; this.snowU.t.value = this.time; this.snowU.cam.value.copy(cam.position);
    this.sky.position.copy(cam.position); this.water.position.set(cam.position.x, 0, cam.position.z);
    this.sun.target.position.copy(focus); this.sun.position.copy(focus).addScaledVector(this.sunDir, 150);
    for (let i = 0; i < this.locs.length; i++) { const l = this.locs[i]; this.locMeshes[i].visible = Math.hypot(l.x - cam.position.x, l.z - cam.position.z) < (this.quality > 0 ? 1500 : 950); }
  }
}
