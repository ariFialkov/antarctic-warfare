// Procedural Antarctica: terrain + geography, ocean, sky, roads, collision.
import * as THREE from '../vendor/three.module.min.js';
import { LOCATIONS, mulberry32, clamp, lerp, smooth } from './data.js';
import { buildLocation } from './towns.js';
import { buildScatter } from './scatter.js';

export const SCALE = 3, CELL = 10, NX = 451, NZ = 334, X0 = -2250, Z0 = -1665;
export const toWorld = (px, py) => [(px - 750) * SCALE, (py - 554.5) * SCALE];
// terrain kinds
export const SEA = 0, LAND = 1, SHELF = 2, FLOE = 3, LAKE = 4, CREV = 5, DRY = 6, GLACIER = 7;

const COAST = [[128,190],[150,215],[160,255],[185,290],[235,318],[290,345],[338,378],[352,440],[362,495],[385,524],[430,516],[480,492],[520,462],[536,420],[524,352],[506,300],[520,255],[552,175],[600,108],[660,74],
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
const line = (pts, o) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } const m = (o.w * 2.2) / SCALE + 8; return { pts, ...o, bb: [x0 - m, y0 - m, x1 + m, y1 + m] }; };
const RIDGES = [
  line([[752,940],[748,840],[725,762],[680,702],[612,642],[545,575],[505,548]], { w: 105, peak: 165 }),
  line([[140,206],[165,280],[240,332],[318,384]], { w: 46, peak: 66 }),
  line([[300,570],[345,540],[385,562]], { w: 60, peak: 135 }),
  line([[1000,330],[1060,420],[1050,520]], { w: 90, peak: 90 }),
  line([[850,185],[905,235],[900,300]], { w: 60, peak: 60 }),
  line([[1040,800],[1090,740],[1110,650]], { w: 70, peak: 70 }),
  line([[640,200],[700,250],[740,330]], { w: 55, peak: 50 }),
  line([[430,650],[480,690],[470,760]], { w: 60, peak: 75 }),
];
// glaciers carve U-shaped passes from the plateau down to the sea
const GLACIERS = [
  line([[610,610],[640,650],[652,690]], { w: 62, name: 'Beardmore' }), line([[690,650],[722,705],[738,760]], { w: 58, name: 'Byrd' }),
  line([[1020,480],[1085,425],[1140,386]], { w: 80, name: 'Lambert' }), line([[400,650],[340,655],[300,636]], { w: 60, name: 'Pine Island' }),
  line([[430,730],[375,745],[338,760]], { w: 60, name: 'Thwaites' }), line([[1070,750],[1130,790],[1168,800]], { w: 65, name: 'Totten' }),
  line([[640,360],[575,340],[528,346]], { w: 62, name: 'Recovery' }), line([[820,900],[790,950],[780,985]], { w: 55, name: 'Mertz' }),
  line([[870,170],[880,130],[872,108]], { w: 50, name: 'Jutulstraumen' }),
];
const RIFTS = [line([[810,330],[856,410],[838,500],[884,590],[870,650]], { w: 34, depth: 34 }), line([[560,700],[520,740],[505,790]], { w: 26, depth: 24 })];
const LEADS = [line([[378,424],[416,402],[440,384]], { w: 12 }), line([[630,770],[676,792],[716,826]], { w: 12 })]; // open-water cracks through the shelves
const LAKES = [[1000,620,150],[566,246,85],[830,790,95],[404,600,70],[1096,300,75],[905,440,65],[306,486,48],[720,470,80],[980,250,60],[620,480,55]].map(([px, py, r]) => ({ px, py, r }));
const CRATERS = [{ px: 975, py: 862, r: 115 }, { px: 760, py: 250, r: 70 }];
const MOUNDS = [{ px: 744, py: 834, r: 105, h: 85 }, { px: 470, py: 368, r: 90, h: 22 }, { px: 1120, py: 560, r: 80, h: 60 }];
const DRYV = { px: 800, py: 815, r: 125 };
export const FEATURES = { GLACIERS, RIFTS, LAKES, CRATERS, MOUNDS, DRYV };

function hash2(x, y) { let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
}
export function fbm(x, y, o = 4) { let a = 0.5, s = 0, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); a *= 0.5; f *= 2.03; } return s; }
function voronoi(x, y) { // returns [edge distance, cell id]
  const xi = Math.floor(x), yi = Math.floor(y); let f1 = 9, f2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const cx = xi + i, cy = yi + j, px = cx + hash2(cx, cy), py = cy + hash2(cy + 31, cx + 17), d = Math.hypot(px - x, py - y); if (d < f1) { f2 = f1; f1 = d; id = hash2(cx + 5, cy + 9); } else if (d < f2) f2 = d; }
  return [f2 - f1, id];
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay; let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = t < 0 ? 0 : t > 1 ? 1 : t; const ex = ax + dx * t - px, ey = ay + dy * t - py; return Math.sqrt(ex * ex + ey * ey);
}
function lineDist(l, px, py) { const b = l.bb; if (px < b[0] || py < b[1] || px > b[2] || py > b[3]) return 1e9; let d = 1e9; const p = l.pts; for (let i = 0; i < p.length - 1; i++) { const s = segDist(px, py, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]); if (s < d) d = s; } return d * SCALE; }
function polyInfo(poly, px, py) {
  let inside = false, d = 1e9;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const s = segDist(px, py, a[0], a[1], b[0], b[1]); if (s < d) d = s;
  }
  return [inside, d];
}

export class World {
  constructor(scene, quality) {
    this.scene = scene; this.quality = quality; this.time = 0; this.colGrid = new Map();
    const n = NX * NZ; this.H = new Float32Array(n); this.kind = new Uint8Array(n); this.coast = new Float32Array(n); this.aux = new Float32Array(n);
    this.locs = LOCATIONS.map(l => { const [x, z] = toWorld(l.px, l.py); return { ...l, x, z, R: 45 + 22 * l.size }; });
    for (const l of this.locs) { let nd = 1e9; for (const o of this.locs) if (o !== l) nd = Math.min(nd, Math.hypot(o.x - l.x, o.z - l.z)); l.full = l.R; l.R = Math.max(38, Math.min(l.R, nd * 0.42)); }
    this.locById = Object.fromEntries(this.locs.map(l => [l.id, l]));
    const r = mulberry32(4242); this.nunataks = [];
    for (let i = 0; i < 400 && this.nunataks.length < 46; i++) { const px = 140 + r() * 1080, py = 90 + r() * 900, [inL, d] = polyInfo(COAST, px, py); if (inL && d * SCALE > 170 && this.locs.every(l => Math.hypot(l.px - px, l.py - py) * SCALE > 150)) this.nunataks.push({ px, py, r: 35 + r() * 60, h: 26 + r() * r() * 75 }); }
    this.genHeights(); this.buildRoads(); this.buildTerrain(); this.buildSkyWater();
    this.locMeshes = this.locs.map(l => { const m = buildLocation(l, this); scene.add(m.major, m.detail); return m; });
    this.sectors = buildScatter(this, quality);
  }
  rawHeight(x, z, info) {
    const px = x / SCALE + 750, py = z / SCALE + 554.5;
    const wx = px + (fbm(px / 36, py / 36, 3) - 0.5) * 22, wy = py + (fbm(px / 36 + 9, py / 36 + 4, 3) - 0.5) * 22;
    const [inL, dL] = polyInfo(COAST, wx, wy), d = dL * SCALE;
    let h, kind = SEA, aux = 0;
    if (inL) {
      kind = LAND;
      const rise = lerp(34, 175, smooth((fbm(px / 70 + 3, py / 70, 2) - 0.36) / 0.3)); // cliffs vs gentle beaches
      h = 2.2 + 20 * smooth(d / rise) + 46 * smooth((d - 90) / 650) + 30 * smooth((d - 300) / 900);
      h += (fbm(x / 170, z / 170) - 0.45) * 34 * smooth(d / 220) + (fbm(x / 40, z / 40, 3) - 0.5) * 6 * smooth(d / 50);
      h += Math.sin(x / 61 + fbm(x / 300, z / 300, 2) * 6) * Math.sin(z / 53 + fbm(x / 260 + 7, z / 260, 2) * 6) * 4.5 * smooth(d / 120); // drumlins
      const dm = smooth((fbm(x / 900 + 2, z / 900 + 5, 2) - 0.5) / 0.1) * smooth((d - 250) / 300); // megadune fields
      if (dm > 0) { const s = Math.sin((x * 0.8 + z * 0.6) / 30 + fbm(x / 220, z / 220, 2) * 5); h += (1 - Math.abs(s)) ** 2 * 7 * dm; }
      const tm = smooth((fbm(x / 600 + 11, z / 600 + 3, 2) - 0.52) / 0.1) * smooth(d / 150); // icefall terraces
      if (tm > 0) { const t = h / 11, f = Math.floor(t); h = lerp(h, (f + smooth((t - f - 0.3) / 0.25)) * 11, tm * 0.9); }
      const flat = h, land = smooth(d / 70);
      for (const rg of RIDGES) { const m = 1 - lineDist(rg, px, py) / (rg.w * 2); if (m > 0) { const rn = 1 - Math.abs(fbm(x / 55, z / 55, 3) * 2 - 1); h += rg.peak * (m * m * (0.35 + 0.8 * rn) + 0.35 * m * Math.pow(fbm(x / 24 + 3, z / 24, 2), 3)) * land; } }
      for (const nk of this.nunataks) { const dx = px - nk.px, dy = py - nk.py; if (Math.abs(dx) * SCALE > nk.r || Math.abs(dy) * SCALE > nk.r) continue; const m = 1 - Math.hypot(dx, dy) * SCALE / nk.r; if (m > 0) h += nk.h * Math.pow(m, 1.6) * (0.75 + 0.5 * fbm(x / 18, z / 18, 2)); }
      for (const gl of GLACIERS) { const m = 1 - lineDist(gl, px, py) / gl.w; if (m > 0) { const w = smooth(m * 1.5); h = lerp(h, Math.max(2.6, Math.min(h, flat * 0.72) - 5), w); if (w > aux) aux = w; if (w > 0.45) { kind = GLACIER; const cr = Math.sin((x * 0.6 + z * 0.8) / 14 + fbm(x / 70, z / 70, 2) * 7); if (cr > 0.86 && m > 0.35) { h -= (cr - 0.86) * 30; } } } }
      for (const rf of RIFTS) { const m = 1 - lineDist(rf, px, py) / rf.w; if (m > 0) { h -= rf.depth * Math.pow(smooth(m), 0.6) * land; if (m > 0.2) { kind = CREV; aux = m; } } }
      const cm = smooth((fbm(x / 420 + 20, z / 420 + 9, 2) - 0.51) / 0.07) * smooth((d - 60) / 100) * (1 - smooth((d - 520) / 200)); // crevasse fields
      if (cm > 0.3 && kind === LAND) { const s = Math.abs(Math.sin((x * 0.7 - z * 0.7) / 17 + fbm(x / 90, z / 90, 2) * 4)); if (s < 0.24) { h -= 6.5 * (1 - s / 0.24) * cm; kind = CREV; aux = (1 - s / 0.24) * cm; } }
      for (const c of CRATERS) { const dc = Math.hypot(px - c.px, py - c.py) * SCALE; if (dc < c.r * 1.6) { const q = (dc - c.r) / (c.r * 0.2); h += Math.exp(-q * q) * 17 + (dc < c.r ? -24 * (1 - (dc / c.r) ** 2) : 0) + Math.exp(-((dc / (c.r * 0.16)) ** 2)) * 12; if (dc < c.r * 0.8) { kind = DRY; aux = 0.5; } } }
      if (!this._noLakes) for (const L of LAKES) { const dl = Math.hypot(px - L.px, py - L.py) * SCALE; if (dl < L.r + 30) { const w = smooth((L.r + 30 - dl) / 30); h = lerp(h, L.y, w); if (w > 0.9) kind = LAKE; } }
      { const dv = Math.hypot(px - DRYV.px, py - DRYV.py) * SCALE; if (dv < DRYV.r && d > 25) { const w = smooth((DRYV.r - dv) / 40); h = lerp(h, 6 + Math.abs(fbm(x / 60, z / 60, 3) - 0.5) * 60, w * 0.8); if (w > 0.4) { kind = DRY; aux = 1; } } }
    } else {
      let shelf = false, ds = 0;
      for (const s of SHELVES) { const [i2, d2] = polyInfo(s, wx, wy); if (i2) { shelf = true; ds = d2 * SCALE; } }
      if (shelf) {
        kind = SHELF; const pr = 1 - Math.abs(fbm(x / 45, z / 45, 2) * 2 - 1);
        h = 5.2 + (fbm(x / 60, z / 60, 3) - 0.5) * 1.6 + smooth(ds / 300) * 2 + (pr > 0.86 ? (pr - 0.86) * 22 : 0);
        for (const ld of LEADS) { const dd = lineDist(ld, px, py); if (dd < ld.w * 2.4) { h = lerp(-3, h, smooth((dd - ld.w) / (ld.w * 1.2))); if (dd < ld.w * 1.2) kind = SEA; } }
      } else {
        h = -2.5 - 11 * smooth(d / 170) + (fbm(x / 50, z / 50, 2) - 0.5) * 2;
        if (d < 380 && d > 14 && fbm(px / 90 + 40, py / 90, 2) > 0.45) { const [e, id] = voronoi(x / 46, z / 46); if (e > 0.17 && id > 0.25) { h = 0.5 + id * 0.5; kind = FLOE; aux = id; } } // pack ice
      }
    }
    for (const m of MOUNDS) { const [mx, mz] = toWorld(m.px, m.py), dm = Math.hypot(x - mx, z - mz); if (dm < m.r) { const t = smooth(1 - dm / m.r); h = Math.max(h, 2) + m.h * t * t * (0.85 + 0.3 * fbm(x / 30, z / 30, 2)); if (kind === SEA || kind === FLOE) kind = LAND; } }
    if (info) { info.kind = kind; info.d = inL ? d : -d; info.aux = aux; }
    return h;
  }
  genHeights() {
    const info = {}, locs = this.locs;
    this._noLakes = true; for (const L of LAKES) { const [x, z] = toWorld(L.px, L.py); L.y = this.rawHeight(x, z) - 3; L.x = x; L.z = z; } this._noLakes = false;
    for (const l of locs) {
      l.y = Math.max(this.rawHeight(l.x, l.z), 2.6);
      let best = 1e9; l.seaA = 0; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; let s = 0; for (const d of [1.3, 1.9, 2.6]) s += this.rawHeight(l.x + Math.sin(a) * l.R * d, l.z + Math.cos(a) * l.R * d); if (s < best) { best = s; l.seaA = a; } }
      l.coastal = best / 3 < 0.5;
      if (l.coastal && l.y < 7 && /Harbour|Wharf|Dock|Landing|Fishing|Fleet|Sea|Beachhead|Yard|Island|Works|Fortress|Bomber/.test(l.kind)) l.mole = { len: l.R * 2.35 }; // walkable breakwater
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = X0 + i * CELL, z = Z0 + j * CELL, o = j * NX + i; let h = this.rawHeight(x, z, info), kind = info.kind;
      for (const l of locs) {
        const dx = x - l.x, dz = z - l.z, reach = l.mole ? l.mole.len + 20 : l.R * 1.7; if (Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
        const w = smooth((l.R * 1.65 - Math.hypot(dx, dz)) / (l.R * 0.65)); if (w > 0) { h = lerp(h, l.y, w); if (w > 0.5) kind = kind === SHELF ? SHELF : LAND; }
        if (l.mole) { const md = segDist(x, z, l.x + Math.sin(l.seaA) * l.R * 0.95, l.z + Math.cos(l.seaA) * l.R * 0.95, l.x + Math.sin(l.seaA) * l.mole.len, l.z + Math.cos(l.seaA) * l.mole.len), mw = smooth((19 - md) / 9); if (mw > 0) { h = lerp(h, Math.min(l.y, 2.8), mw); if (mw > 0.5) kind = LAND; } }
      }
      this.H[o] = h; this.kind[o] = kind; this.coast[o] = info.d; this.aux[o] = info.aux;
    }
  }
  idx(x, z) { return clamp(Math.round((z - Z0) / CELL), 0, NZ - 1) * NX + clamp(Math.round((x - X0) / CELL), 0, NX - 1); }
  kindAt(x, z) { return this.kind[this.idx(x, z)]; }
  coastAt(x, z) { return this.coast[this.idx(x, z)]; }
  h(x, z) {
    let fx = (x - X0) / CELL, fz = (z - Z0) / CELL; fx = clamp(fx, 0, NX - 1.001); fz = clamp(fz, 0, NZ - 1.001);
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, H = this.H, o = j * NX + i;
    return lerp(lerp(H[o], H[o + 1], u), lerp(H[o + NX], H[o + NX + 1], u), v);
  }
  ground(x, z) { return Math.max(this.h(x, z), -0.42); }
  isWater(x, z) { return this.h(x, z) < -0.6; }
  normal(x, z, out) { const e = 2.5; return out.set(this.h(x - e, z) - this.h(x + e, z), 2 * e, this.h(x, z - e) - this.h(x, z + e)).normalize(); }
  slope(x, z) { return Math.hypot(this.h(x + 4, z) - this.h(x - 4, z), this.h(x, z + 4) - this.h(x, z - 4)) / 8; }

  // packed-snow roads between neighbouring settlements
  buildRoads() {
    const L = this.locs, seen = new Set(); this.roads = [];
    for (const a of L) { a.roadDirs = a.roadDirs || []; const near = L.filter(b => b !== a).map(b => [Math.hypot(a.x - b.x, a.z - b.z), b]).sort((p, q) => p[0] - q[0]).slice(0, 2);
      for (const [d, b] of near) {
        const key = a.id < b.id ? a.id + b.id : b.id + a.id; if (seen.has(key) || d > 1000) continue; seen.add(key);
        const n = Math.ceil(d / 6), pts = [], nx = -(b.z - a.z) / d, nz = (b.x - a.x) / d, bend = (hash2(a.px, b.py) - 0.5) * d * 0.16; let wet = 0;
        for (let i = 0; i <= n; i++) { const t = i / n, o = Math.sin(t * Math.PI) * bend + Math.sin(t * 9) * 4 * Math.sin(t * Math.PI), x = lerp(a.x, b.x, t) + nx * o, z = lerp(a.z, b.z, t) + nz * o, h = this.h(x, z); if (h < 0.4) wet++; pts.push({ x, z, h, ok: h >= 0.4 && Math.hypot(x - a.x, z - a.z) > a.R * 0.85 && Math.hypot(x - b.x, z - b.z) > b.R * 0.85 }); }
        if (wet > n * 0.3) continue;
        this.roads.push({ a, b, pts, len: d }); (b.roadDirs = b.roadDirs || []).push(Math.atan2(a.x - b.x, a.z - b.z)); a.roadDirs.push(Math.atan2(b.x - a.x, b.z - a.z));
      } }
    const pos = [], col = [], idx = []; let v = 0;
    for (const rd of this.roads) { let prev = false;
      for (let i = 0; i < rd.pts.length; i++) { const p = rd.pts[i], q = rd.pts[Math.min(i + 1, rd.pts.length - 1)], o = rd.pts[Math.max(i - 1, 0)], dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1, sx = -dz / l * 3.6, sz = dx / l * 3.6;
        if (!p.ok) { prev = false; continue; }
        for (const s of [-1, -0.35, 0.35, 1]) { const x = p.x + sx * s, z = p.z + sz * s; pos.push(x, this.h(x, z) + 0.16, z); const rut = Math.abs(s) < 0.5 ? 0.9 : 1; col.push(0.6 * rut, 0.72 * rut, 0.86 * rut); }
        if (prev) for (let k = 0; k < 3; k++) idx.push(v - 4 + k, v + k, v - 3 + k, v - 3 + k, v + k, v + 1 + k);
        v += 4; prev = true; } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.receiveShadow = true; this.scene.add(m);
  }
  detailTexture() { // tiling snow grain so the ground has texture up close
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), img = c.createImageData(S, S), r = mulberry32(9);
    const per = (x, y, f) => { const a = x / S * f, b = y / S * f, xi = Math.floor(a), yi = Math.floor(b), u = a - xi, v = b - yi, hh = (i, j) => hash2((i % f + f) % f, (j % f + f) % f), su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v); return lerp(lerp(hh(xi, yi), hh(xi + 1, yi), su), lerp(hh(xi, yi + 1), hh(xi + 1, yi + 1), su), sv); };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const n = per(x, y, 8) * 0.5 + per(x, y, 32) * 0.3 + per(x + y * 0.5, y * 2, 16) * 0.2, sp = r() > 0.985 ? 22 : 0, v = 222 + n * 30 + sp, o = (y * S + x) * 4; img.data[o] = Math.min(255, v - 4); img.data[o + 1] = Math.min(255, v); img.data[o + 2] = Math.min(255, v + 8); img.data[o + 3] = 255; }
    c.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.quality > 0 ? 4 : 1; return t;
  }
  buildTerrain() {
    const cols = new Float32Array(NX * NZ * 3), H = this.H, c = new THREE.Color();
    const cv = document.createElement('canvas'); cv.width = NX; cv.height = NZ; const ctx = cv.getContext('2d'), img = ctx.createImageData(NX, NZ);
    const mix = (r, g, b, t) => { c.r = lerp(c.r, r, t); c.g = lerp(c.g, g, t); c.b = lerp(c.b, b, t); };
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const o = j * NX + i, h = H[o], x = X0 + i * CELL, z = Z0 + j * CELL, k = this.kind[o], aux = this.aux[o], d = this.coast[o];
      const il = Math.max(i - 1, 0), ir = Math.min(i + 1, NX - 1), ju = Math.max(j - 1, 0), jd = Math.min(j + 1, NZ - 1);
      const hx = H[j * NX + ir] - H[j * NX + il], hz = H[jd * NX + i] - H[ju * NX + i], slope = Math.hypot(hx, hz) / (2 * CELL);
      const curv = (H[j * NX + ir] + H[j * NX + il] + H[jd * NX + i] + H[ju * NX + i]) / 4 - h; // >0 hollow, <0 crest
      const n = fbm(x / 23, z / 9, 2), n2 = fbm(x / 140, z / 140, 3);
      if (h < -0.3) { const t = smooth((-h - 0.3) / 11); c.setRGB(lerp(0.62, 0.05, t), lerp(0.88, 0.2, t), lerp(0.97, 0.5, t)); }
      else if (k === FLOE) c.setRGB(0.86 + aux * 0.1, 0.94 + aux * 0.04, 1);
      else if (k === LAKE) { const cr = 1 - Math.abs(fbm(x / 26, z / 26, 3) * 2 - 1); c.setRGB(0.42, 0.8, 0.92); mix(0.9, 0.97, 1, smooth((cr - 0.86) / 0.08) * 0.8 + n2 * 0.2); }
      else if (k === SHELF && h < 9) { c.setRGB(0.82 + n * 0.06, 0.93 + n * 0.03, 1); mix(0.66, 0.87, 0.98, smooth((n2 - 0.55) / 0.1) * 0.6); if (d > -22) mix(0.45, 0.75, 0.95, 0.7); }
      else {
        c.setRGB(0.93 + n * 0.07, 0.955 + n * 0.045, 1);
        mix(0.74, 0.86, 0.98, clamp(curv * 0.28, 0, 0.55)); mix(1, 1, 1, clamp(-curv * 0.3, 0, 0.5));          // blue hollows, bright crests
        mix(0.72, 0.89, 0.99, smooth((n2 - 0.6) / 0.08) * 0.55 * smooth((h - 12) / 20));                        // wind-scoured blue ice
        const coastT = 1 - smooth((h - 1) / 6); mix(0.78, 0.91, 1, coastT * 0.8);
        if (d < 60 && h < 5 && fbm(x / 110 + 8, z / 110, 2) > 0.52) mix(0.34, 0.36, 0.41, clamp(0.75 * (1 - smooth((h - 2.5) / 2.5)) + n * 0.2, 0, 1));     // pebble beaches
        if (k === GLACIER) { mix(0.6, 0.83, 0.97, 0.75); if (aux < 0.72) mix(0.45, 0.42, 0.4, 0.55 * smooth((0.72 - aux) / 0.12) * (0.5 + n)); if (Math.sin((x * 0.6 + z * 0.8) / 14 + fbm(x / 70, z / 70, 2) * 7) > 0.8) mix(0.22, 0.52, 0.86, 0.6); }
        if (k === CREV) mix(0.2, 0.5, 0.86, clamp(aux * 1.1, 0, 0.9));
        const warm = smooth((fbm(x / 700 + 4, z / 700, 2) - 0.42) / 0.2), strata = 0.82 + 0.18 * Math.sin(h * 0.5 + n2 * 9);
        if (k === DRY) { c.setRGB(0.62 * strata, 0.5 * strata, 0.38 * strata); mix(0.95, 0.96, 1, smooth((n - 0.62) / 0.1) * 0.6 * (1 - aux * 0.6)); }
        const rock = k === CREV ? 0 : smooth((slope - 0.4) / 0.28) * smooth((h - 9) / 16);
        mix(lerp(0.4, 0.5, warm) * strata, lerp(0.43, 0.4, warm) * strata, lerp(0.53, 0.35, warm) * strata, rock);
        const sh = clamp(1 + (hx - hz) * 0.012, 0.86, 1.06); c.r *= sh; c.g *= sh;
      }
      cols[o * 3] = c.r; cols[o * 3 + 1] = c.g; cols[o * 3 + 2] = c.b;
      const mm = h < -0.3 ? 1 : clamp(1 + (hx - hz) * 0.03, 0.7, 1.1);
      img.data[o * 4] = Math.min(255, c.r * 255 * mm); img.data[o * 4 + 1] = Math.min(255, c.g * 255 * mm); img.data[o * 4 + 2] = Math.min(255, c.b * 255); img.data[o * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); ctx.strokeStyle = 'rgba(70,110,170,.75)'; ctx.lineWidth = 0.8;
    for (const rd of this.roads) { ctx.beginPath(); rd.pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo']((p.x - X0) / CELL, (p.z - Z0) / CELL)); ctx.stroke(); }
    this.mapCanvas = cv;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: this.detailTexture() }), CH = 50;
    this.terrain = new THREE.Group();
    for (let cj = 0; cj < NZ - 1; cj += CH) for (let ci = 0; ci < NX - 1; ci += CH) {
      const w = Math.min(CH, NX - 1 - ci), dd = Math.min(CH, NZ - 1 - cj), nv = (w + 1) * (dd + 1), P = new Float32Array(nv * 3), Cc = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = [];
      for (let j = 0; j <= dd; j++) for (let i = 0; i <= w; i++) {
        const gi = ci + i, gj = cj + j, o = gj * NX + gi, q = j * (w + 1) + i, p = q * 3;
        P[p] = X0 + gi * CELL; P[p + 1] = H[o]; P[p + 2] = Z0 + gj * CELL; Cc[p] = cols[o * 3]; Cc[p + 1] = cols[o * 3 + 1]; Cc[p + 2] = cols[o * 3 + 2]; U[q * 2] = gi * CELL / 26; U[q * 2 + 1] = gj * CELL / 26;
        const hx = H[gj * NX + Math.min(gi + 1, NX - 1)] - H[gj * NX + Math.max(gi - 1, 0)], hz = H[Math.min(gj + 1, NZ - 1) * NX + gi] - H[Math.max(gj - 1, 0) * NX + gi], l = Math.hypot(hx, 2 * CELL, hz);
        Nn[p] = -hx / l; Nn[p + 1] = 2 * CELL / l; Nn[p + 2] = -hz / l;
        if (i < w && j < dd) { const a = q, b = a + 1, e = a + w + 1, f = e + 1; I.push(a, e, b, b, e, f); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(I);
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
      fragmentShader: 'uniform float t; uniform vec3 fogC; uniform float fogN; uniform float fogF; varying vec3 vW; varying float vD; void main(){ float n=sin(vW.x*0.23+t*1.2)*sin(vW.z*0.19-t)+sin((vW.x+vW.z)*0.07+t*0.6); vec3 c=mix(vec3(0.07,0.33,0.72),vec3(0.2,0.6,0.9),0.5+0.22*n); float n2=sin(vW.x*0.61-t*0.9+sin(vW.z*0.33+t*0.4)*1.7)*sin(vW.z*0.57+t*0.7+sin(vW.x*0.29-t*0.3)*1.9); c+=smoothstep(0.5,0.95,n2)*0.17*(1.0-smoothstep(30.0,240.0,vD)); float f=smoothstep(fogN,fogF,vD); gl_FragColor=vec4(mix(c,fogC,f),mix(0.74,1.0,f)); }' }));
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
  addCollider(x, z, r, top) { const c = { x, z, r, top }, g = 24; for (let i = Math.floor((x - r) / g); i <= Math.floor((x + r) / g); i++) for (let j = Math.floor((z - r) / g); j <= Math.floor((z + r) / g); j++) { const key = i * 10007 + j; let a = this.colGrid.get(key); if (!a) this.colGrid.set(key, a = []); a.push(c); } }
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
  los(a, b) {
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
    const cx = cam.position.x, cz = cam.position.z, far = this.quality > 0 ? 1500 : 950, near = this.quality > 0 ? 420 : 300;
    for (let i = 0; i < this.locs.length; i++) { const l = this.locs[i], d = Math.hypot(l.x - cx, l.z - cz), m = this.locMeshes[i]; m.major.visible = d < far; m.detail.visible = d < near + l.R; }
    for (const s of this.sectors) s.mesh.visible = Math.hypot(s.x - cx, s.z - cz) < (this.quality > 0 ? 1150 : 700);
  }
}
