// Wilderness dressing: everything between the settlements, baked per map sector so it culls cheaply.
import { mulberry32 } from './data.js';
import { Kit, C } from './kit.js';
import { X0, Z0, toWorld, FEATURES, SEA, LAND, SHELF, FLOE, LAKE, CREV, DRY, GLACIER } from './world.js';

const ROCKS = [0x7c8494, 0x6a7080, 0x8a8478, 0x5d6475];
const PROPS = {
  rock(k, r, s) { k.p('dod', ROCKS[Math.floor(r() * 4)], 0, s * 0.25, 0, s, s * (0.6 + r() * 0.5), s * (0.8 + r() * 0.4), r(), r() * 6, r()).p('sphL', C.snow, 0, s * 0.52, 0, s * 0.8, s * 0.32, s * 0.7); if (s > 2.6) k.collide(0, 0, s * 0.45, s * 0.7); },
  boulders(k, r, s) { for (let i = 0; i < 4; i++) { const a = r() * 6.28, d = r() * s * 1.6, q = s * (0.5 + r() * 0.8); k.p('dod', ROCKS[Math.floor(r() * 4)], Math.cos(a) * d, q * 0.25, Math.sin(a) * d, q, q * 0.75, q * 0.9, r(), r() * 6, r()).p('sphL', C.snow, Math.cos(a) * d, q * 0.5, Math.sin(a) * d, q * 0.75, q * 0.3, q * 0.7); if (q > 2.4) k.collide(Math.cos(a) * d, Math.sin(a) * d, q * 0.45, q * 0.7); } },
  darkrock(k, r, s) { k.p('dod', 0x4a3f38, 0, s * 0.2, 0, s, s * 0.7, s * 0.9, r(), r() * 6, r()).p('dod', 0x5e5148, s * 0.7, s * 0.12, s * 0.3, s * 0.5, s * 0.36, s * 0.5, r(), r(), r()); if (s > 2.6) k.collide(0, 0, s * 0.45, s * 0.6); },
  shards(k, r, s) { for (let i = 0; i < 4; i++) { const a = r() * 6.28, d = r() * 2.2 * s, h = (2 + r() * 6) * s; k.p('cone6', i % 2 ? 0xa9dcf7 : 0xd6f0ff, Math.cos(a) * d, h * 0.42, Math.sin(a) * d, h * 0.3, h, h * 0.3, r() * 0.5 - 0.25, r() * 6, r() * 0.5 - 0.25); } if (s > 1.2) k.collide(0, 0, s * 1.1, 4 * s); },
  drift(k, r, s) { k.p('sphL', 0xf9fcff, 0, -s * 0.1, 0, s, s * 0.36, s * (0.6 + r() * 0.5)); },
  penitentes(k, r) { for (let i = 0; i < 12; i++) { const a = r() * 6.28, d = r() * 4.5, h = 1 + r() * 2.4; k.p('cone6', i % 3 ? C.snow : 0xd6f0ff, Math.cos(a) * d, h * 0.45, Math.sin(a) * d, 0.5, h, 0.5, 0.25, 0, 0.1); } },
  hut(k, r) {
    const col = [C.red, C.orange, 0x2f7fd6, C.olive][Math.floor(r() * 4)];
    for (const [x, z] of [[-1.7, -2.2], [1.7, -2.2], [-1.7, 2.2], [1.7, 2.2]]) k.p('cyl8', C.steel, x, 0.4, z, 0.2, 0.8, 0.2);
    k.p('box', col, 0, 2.1, 0, 4, 2.6, 5.2).p('box', C.snow, 0, 3.55, 0, 4.4, 0.36, 5.6, 0, 0, 0.08).p('box', C.black, 0, 1.9, 2.62, 1, 2, 0.06).p('box', C.glow, 2.02, 2.4, 0.4, 0.05, 0.8, 1.1).p('box', C.glow, -2.02, 2.4, -0.8, 0.05, 0.8, 1.1).p('box', C.steel, 0, 0.65, 3.3, 1.4, 0.1, 1.4)
      .p('cyl8', C.steel, 1.2, 4.3, -1.6, 0.3, 1.4, 0.3).p('sphL', 0xe3e7ec, 1.4, 5.5, -1.6, 0.9).p('sphL', 0xeef1f5, 1.8, 6.6, -1.4, 1.3).p('cyl8', C.steel, -1.5, 5.6, 2, 0.06, 4, 0.06).p('sphL', C.red, -1.5, 7.6, 2, 0.24)
      .p('cyl8', C.glass, 2.8, 0.6, -1.4, 0.8, 1.2, 0.8).p('cyl8', C.rust, 3.3, 0.6, -0.5, 0.8, 1.2, 0.8).p('box', C.wood, -3, 0.5, 1, 1, 1, 1, 0, 0.4).p('sphL', C.snow, -2.6, 0, -2, 3.6, 1.6, 3);
    k.p('cyl8', C.steel, 4.2, 2.5, 3, 0.1, 5, 0.1).p('box', col, 4.9, 4.5, 3, 1.4, 0.8, 0.05); k.collide(0, 0, 3, 4);
  },
  camp(k, r) {
    const cs = [C.orange, C.gold, C.red, C.teal]; for (let i = 0; i < 2 + Math.floor(r() * 2); i++) { const a = i * 2.2 + r(), d = 3.4; k.p('domeL', cs[Math.floor(r() * 4)], Math.cos(a) * d, 0, Math.sin(a) * d, 3.2, 3, 3.6, 0, a).p('box', C.black, Math.cos(a) * (d - 1.5), 0.6, Math.sin(a) * (d - 1.5), 0.7, 1.1, 0.1, 0, -a + Math.PI / 2); k.collide(Math.cos(a) * d, Math.sin(a) * d, 1.4, 1.4); }
    for (let i = 0; i < 7; i++) k.p('dod', C.stone, Math.cos(i * 0.9) * 0.8, 0.14, Math.sin(i * 0.9) * 0.8, 0.4); k.p('cone6', 0xff7a1a, 0, 0.5, 0, 0.6, 1, 0.6).p('cone6', 0xffd23a, 0, 0.36, 0, 0.3, 0.6, 0.3);
    k.p('box', C.wood, 5.4, 0.35, 1, 1, 0.12, 2.2, 0, 0.5).p('box', C.steel, 5.1, 0.1, 1.2, 0.08, 0.08, 2.6, 0, 0.5).p('box', C.steel, 5.9, 0.1, 0.8, 0.08, 0.08, 2.6, 0, 0.5).p('box', C.olive, 5.4, 0.7, 1, 0.8, 0.5, 1.2, 0, 0.5).p('box', C.wood, -1, 0.4, -5, 0.8, 0.8, 0.8, 0, 0.3)
      .p('cyl8', C.steel, -4.6, 1.6, -2, 0.08, 3.2, 0.08).p('box', C.orange, -4.1, 2.9, -2, 1, 0.6, 0.04);
  },
  cairn(k, r) { for (let i = 0; i < 5; i++) k.p('dod', i % 2 ? C.stone : C.stoneD, (r() - 0.5) * 0.2, 0.3 + i * 0.5, (r() - 0.5) * 0.2, 1.3 - i * 0.2, 0.6, 1.2 - i * 0.2, 0, i); k.p('cyl8', C.wood, 0, 3.4, 0, 0.08, 1.8, 0.08).p('box', C.orange, 0.4, 4, 0, 0.8, 0.5, 0.04); k.collide(0, 0, 0.7, 2.6); },
  bones(k, r) { for (let i = 0; i < 5; i++) k.p('archL', C.white, 0, -0.2, -4 + i * 2, 6 - Math.abs(i - 2), 8 - Math.abs(i - 2) * 1.4, 4, 0, 0, (r() - 0.5) * 0.2); k.p('sphL', C.white, 0, 1.2, 7.4, 2.8, 2.2, 4.4).p('sphL', C.white, 0, 0.5, 9.6, 1.6, 0.8, 3).p('cyl8', C.white, 0, 0.3, 0, 0.5, 14, 0.5, Math.PI / 2); k.collide(0, 7.4, 1.6, 2.2); },
  fishhole(k, r) {
    k.p('cyl8', 0x0d3a80, 0, 0.04, 0, 2.2, 0.08, 2.2).p('torus', C.snow, 0, 0.1, 0, 2.5, 2.5, 4, Math.PI / 2).p('box', C.wood, 1.9, 0.3, 0, 0.6, 0.6, 0.6).p('cyl8', C.wood, 1.2, 1.2, 0, 0.05, 2.4, 0.05, 0, 0, 0.9).p('cyl8', C.glass, 2.2, 0.3, 1, 0.5, 0.6, 0.5);
    for (let i = 0; i < 3; i++) k.p('sphL', i % 2 ? 0x9fb6c9 : C.orange, 2 + i * 0.3, 0.12, -1 - i * 0.2, 0.3, 0.16, 0.8, 0, i);
    if (r() < 0.45) { const col = [0x2f7fd6, C.red, C.gold][Math.floor(r() * 3)]; k.p('box', col, -3.4, 1.2, 0, 2.4, 2.4, 2.4).p('prism', C.snow, -3.4, 2.9, 0, 3.2, 1.2, 3).p('box', C.black, -2.18, 1, 0, 0.05, 1.8, 0.9).p('cyl8', C.steel, -3.9, 3.5, 0.6, 0.2, 1, 0.2); k.collide(-3.4, 0, 1.7, 3); }
  },
  tankwreck(k, r) { k.p('box', 0x3a3f4b, -1.3, 0.3, 0, 0.5, 0.7, 4.6, 0, 0, 0.1).p('box', 0x3a3f4b, 1.3, 0.5, 0, 0.5, 0.7, 4.6, 0, 0, 0.1).p('box', 0x8a8f86, 0, 0.9, 0, 2.5, 0.8, 4.4, 0.06, 0, 0.1).p('domeL', 0x7a8078, 0.4, 1.2, -0.3, 2.1, 1.5, 2.3, 0.2, 0.6, 0.15).p('cyl8', 0x38404f, 1.6, 1.1, 1.6, 0.26, 2.8, 0.26, 1.9, 0.6).p('sphL', C.snow, -0.3, 1.25, 1.2, 2.2, 0.5, 2).p('sphL', C.snow, -2, 0, -1, 3, 1.2, 3).p('box', 0x1c2030, 0.6, 1.36, -1.6, 1.2, 0.1, 0.9, 0.5).p('sphL', 0x2a2d36, 0.9, 2.6, -0.4, 0.9).p('sphL', 0x3a3d46, 1.2, 3.6, -0.2, 1.3); k.collide(0, 0, 2.3, 2); },
  planewreck(k, r) { k.p('cyl8', 0xc9ced6, 0, 1, 0, 2.6, 9, 2.6, Math.PI / 2 - 0.12, 0, 0.2).p('sphL', 0xc9ced6, 0.1, 1.6, 4.8, 2.6, 2.6, 3.4).p('box', 0x8fd0f5, 0.1, 2.2, 5.3, 1.6, 0.6, 1.2).p('box', 0xb8bec7, 5, 0.5, 0.6, 9, 0.24, 2.6, 0, 0.1, 0.12).p('box', 0xb8bec7, -5.6, 1.6, -1, 7, 0.24, 2.4, 0, -0.3, -0.35).p('box', C.red, 0, 2.6, -5.6, 0.2, 2.8, 2, -0.2).p('box', 0xc9ced6, 0, 1.5, -5.6, 4.4, 0.16, 1.4).p('cyl8', C.steel, 4.6, 0.6, 1.9, 1.2, 1.4, 1.2, Math.PI / 2).p('sphL', C.snow, -2, 0, 2, 5, 1.6, 4).p('box', C.wood, 3, 0.4, -4, 0.9, 0.8, 0.9, 0, 0.6).p('box', C.orange, -3.4, 0.3, -3.4, 0.7, 0.6, 0.7, 0, 0.2); k.collide(0, -2.5, 1.7, 2.6); k.collide(0, 2.5, 1.7, 2.6); },
  shipwreck(k, r) { k.p('sphL', C.woodD, 0, 1, 0, 6, 5, 20, 0.1, 0, 0.42).p('box', C.wood, 0.9, 2.6, 0, 4.2, 0.2, 15, 0.1, 0, 0.42).p('cyl8', C.wood, 2.4, 6.5, 2, 0.34, 11, 0.34, 0.15, 0, -0.5).p('cyl8', C.wood, 2, 5, -5, 0.3, 8, 0.3, -0.1, 0, -0.5).p('box', C.tan, 4.2, 8, 2, 0.08, 4, 3.6, 0.15, 0, -0.5).p('sphL', C.snow, -1.4, 3, -3, 3.4, 1, 6); k.collide(0, -4.5, 3, 4); k.collide(0, 0, 3, 4); k.collide(0, 4.5, 3, 4); },
  bunker(k, r) {
    for (let j = 0; j < 2; j++) for (let i = 0; i < 9 - j; i++) { const a = -0.9 + (i + j * 0.5) * 0.225; k.p('sphL', j ? 0xcdb98c : C.tan, Math.sin(a) * 5, 0.32 + j * 0.56, Math.cos(a) * 5, 1.4, 0.64, 0.8, 0, a); }
    for (const a of [-0.6, 0, 0.6]) k.collide(Math.sin(a) * 5, Math.cos(a) * 5, 1.1, 1.3);
    k.p('box', C.olive, -1, 0.35, 2.4, 1.4, 0.7, 0.9, 0, 0.3).p('box', 0x55703a, 0.6, 0.3, 2, 0.8, 0.6, 0.6).p('cyl8', 0x4f7d5a, 1.8, 0.8, 3.4, 0.3, 1.6, 0.3, 0.5).p('cyl8', C.black, 1.8, 0.06, 3.1, 0.9, 0.12, 0.9).p('cyl8', C.steel, -3, 1.8, 3, 0.08, 3.6, 0.08).p('box', [C.orange, C.teal, C.purple][Math.floor(r() * 3)], -2.5, 3.2, 3, 1, 0.6, 0.04).p('sphL', C.snow, 0.3, 0.2, 2.9, 0.4).p('sphL', C.snow, 0.7, 0.2, 3.2, 0.4);
  },
  snowman(k, r) { k.p('sphL', C.snow, 0, 0.6, 0, 1.5).p('sphL', C.snow, 0, 1.6, 0, 1.1).p('sphL', C.snow, 0, 2.35, 0, 0.8).p('cone6', C.orange, 0, 2.35, 0.5, 0.16, 0.5, 0.16, Math.PI / 2).p('sphL', C.black, -0.17, 2.5, 0.33, 0.1).p('sphL', C.black, 0.17, 2.5, 0.33, 0.1).p('cyl8', C.woodD, 0.9, 1.8, 0, 0.06, 1.1, 0.06, 0, 0, -1).p('cyl8', C.woodD, -0.9, 1.8, 0, 0.06, 1.1, 0.06, 0, 0, 1); if (r() < 0.5) k.p('domeL', C.olive, 0, 2.5, 0, 0.9, 0.7, 0.9); else k.p('cyl8', C.black, 0, 2.75, 0, 0.9, 0.06, 0.9).p('cyl8', C.black, 0, 3, 0, 0.56, 0.5, 0.56); k.p('torus', [C.red, C.orange, C.teal][Math.floor(r() * 3)], 0, 2.05, 0, 0.8, 0.8, 2.4, Math.PI / 2); k.collide(0, 0, 0.7, 2.6); },
  fumarole(k, r, s) { const h = (3 + r() * 5) * s; k.p('taper6', 0xd6f0ff, 0, h / 2, 0, 2.2 * s, h, 2.2 * s, 0, r() * 3).p('taper6', C.snow, 0.3, h * 0.9, 0, 1.3 * s, h * 0.4, 1.3 * s, 0.1); for (let i = 0; i < 4; i++) k.p('sphL', i % 2 ? 0xeef1f5 : 0xdfe4ea, 0.3 + i * 0.5, h * 1.2 + i * 1.5, i * 0.3, 1 + i * 0.6); k.collide(0, 0, s, h); },
  seastack(k, r, s) { if (r() < 0.5) { k.p('archL', 0xcfeeff, 0, -2, 0, 16 * s, 20 * s, 14 * s, 0, 0, 0).p('ico', C.snow, -8 * s, 9 * s, 0, 6 * s, 3 * s, 6 * s, 0.3); k.collide(-8 * s, 0, 3 * s, 12); k.collide(8 * s, 0, 3 * s, 12); } else { k.p('cone6', 0xcfeeff, 0, 6 * s, 0, 7 * s, 16 * s, 7 * s, 0.08, r() * 3, 0.06).p('cone6', 0xbfe6fb, 4 * s, 3 * s, 2 * s, 4 * s, 9 * s, 4 * s, -0.1, 1, 0.12).p('ico', 0xe8f6ff, -3 * s, 0.4, -3 * s, 6 * s, 2.4 * s, 5 * s); k.collide(0, 0, 3 * s, 12); } },
  bergTab(k, r, s) { k.p('cyl6', 0x9fd6f5, 0, -0.5, 0, s, s * 0.16, s * (0.6 + r() * 0.5), 0, r() * 3).p('cyl6', 0xeaf6ff, 0, s * 0.16, 0, s * 0.94, s * 0.22, s * (0.55 + r() * 0.4), 0, r() * 3).p('ico', C.snow, s * 0.12, s * 0.3, 0, s * 0.5, s * 0.14, s * 0.4, 0, r()); k.collide(0, 0, s * 0.42, s * 0.3); },
  bergPin(k, r, s) { k.p('ico', 0xcfeeff, 0, s * 0.12, 0, s, s * (0.5 + r() * 0.5), s * (0.7 + r() * 0.6), r() * 0.3, r() * 6, r() * 0.3).p('ico', 0xe8f6ff, s * 0.25, s * 0.34, s * 0.1, s * 0.5, s * 0.5, s * 0.5, r(), r(), r()).p('ico', 0x9fd6f5, -s * 0.3, -0.4, s * 0.2, s * 0.6, s * 0.2, s * 0.6, 0, r(), 0); k.collide(0, 0, s * 0.4, s * 0.4); },
  buoy(k, r) { k.p('cyl8', C.white, 0, 0.2, 0, 1.6, 0.7, 1.6).p('cone6', r() < 0.5 ? C.red : 0x2fbf71, 0, 1.4, 0, 1.3, 2, 1.3).p('cyl8', C.steel, 0, 2.8, 0, 0.08, 1, 0.08).p('sphL', C.glow, 0, 3.4, 0, 0.4); },
  supply(k, r) { k.p('box', C.wood, 0, 0.6, 0, 1.4, 1.2, 1.4, 0, 0.2).p('box', C.orange, 0, 0.6, 0, 1.44, 0.2, 1.44, 0, 0.2).p('box', C.woodD, 1.3, 0.4, 0.5, 0.8, 0.8, 0.8, 0, 0.7).p('domeL', C.orange, -2.4, 0, 1, 4.4, 1.2, 3.6, 0, 0.4).p('domeL', C.white, -2.4, 0.03, 1, 2.4, 1.24, 3.7, 0, 0.4).p('box', C.white, -1, 0.7, 0.5, 2, 0.03, 0.03, 0, 0.3, 0.4); k.collide(0, 0, 1, 1.3); },
  weather(k, r) { k.p('cyl8', C.steel, 0, 4.5, 0, 0.14, 9, 0.14).p('box', C.steel, 0, 8.4, 0, 2.4, 0.06, 0.06).p('sphL', C.white, 1.2, 8.6, 0, 0.4).p('sphL', C.white, -1.2, 8.6, 0, 0.4).p('cone6', C.red, 0, 9.3, 0.3, 0.3, 0.9, 0.3, Math.PI / 2).p('box', C.white, 0, 1.4, 0.3, 0.8, 1, 0.6).p('box', C.steel, 2.2, 0.6, 0, 0.12, 1.2, 0.12).p('box', 0x24406e, 2.2, 1.3, 0, 2.2, 0.08, 1.4, 0.6); for (let i = 0; i < 3; i++) k.p('cyl8', C.steel, Math.cos(i * 2.1) * 1.6, 3.4, Math.sin(i * 2.1) * 1.6, 0.03, 7.4, 0.03, Math.sin(i * 2.1) * 0.44, 0, -Math.cos(i * 2.1) * 0.44); k.collide(0, 0, 0.5, 9); },
  ruin(k, r) { for (let i = 0; i < 6; i++) { const a = i * 1.05 + r() * 0.3, h = 2 + r() * 5; k.p('box', i % 2 ? C.stone : C.stoneD, Math.cos(a) * 6, h / 2 - 0.3, Math.sin(a) * 6, 1.6, h, 1.1, r() * 0.2 - 0.1, -a, r() * 0.2 - 0.1); k.collide(Math.cos(a) * 6, Math.sin(a) * 6, 1, h); } k.p('box', C.stoneD, 5.6, 0.5, 2.6, 1.3, 1, 6, 0.1, 0.5).p('archL', C.stone, 0, 0, 0, 5, 7, 4, 0, 0.6).p('box', C.kelp, 0, 3.4, 0.2, 1.4, 2, 0.06, 0, 0.6).p('sphL', C.snow, -2, 0, -2, 4, 1.2, 3).p('cyl8', C.stoneD, 0, 0.3, 0, 3, 0.6, 3); },
  opylon(k, r) { const h = 6 + r() * 8; k.p('taper6', C.black, 0, h / 2, 0, 2.2, h, 2.2).p('torus', C.purple, 0, h * 0.8, 0, 2.2, 2.2, 3, Math.PI / 2).p('sphL', C.white, 0, h, 0, 1.3).p('oct', C.cyan, 0, h + 1.4, 0, 0.6, 1, 0.6).p('taper6', C.black, 2.4, 1.2, 1, 1.2, 2.4, 1.2); k.collide(0, 0, 1.1, h); },
  crystal(k, r, s) { for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = r() * 3 * s, h = (2 + r() * 6) * s; k.p('oct', i % 3 ? 0x9a7cff : C.cyan, Math.cos(a) * d, h * 0.36, Math.sin(a) * d, h * 0.3, h, h * 0.3, r() * 0.6 - 0.3, r() * 3, r() * 0.6 - 0.3); } k.collide(0, 0, 1.6 * s, 4); },
  pole(k) { k.p('cyl8', 0x38404f, 0, 1.5, 0, 0.1, 3, 0.1).p('cyl8', C.orange, 0, 2.7, 0, 0.16, 0.5, 0.16).p('box', C.orange, 0.3, 2.2, 0, 0.5, 0.3, 0.03); },
  lamp(k) { k.p('cyl8', C.steel, 0, 2.2, 0, 0.14, 4.4, 0.14).p('box', C.steel, 0, 4.4, 0.4, 0.1, 0.1, 0.9).p('sphL', C.glow, 0, 4.25, 0.8, 0.7).p('sphL', C.snow, 0, 0.05, 0, 1.4, 0.5, 1.4); },
  signpost(k, r) { k.p('box', C.wood, 0, 1.5, 0, 0.16, 3, 0.16).p('box', C.orange, 0.6, 2.6, 0, 1.4, 0.34, 0.06, 0, 0.2).p('box', C.white, -0.6, 2.15, 0, 1.4, 0.34, 0.06, 0, -0.3).p('box', C.teal, 0.5, 1.7, 0, 1.2, 0.3, 0.06, 0, 1.3).p('sphL', C.snow, 0, 3.05, 0, 0.4, 0.2, 0.4); },
  checkpoint(k, r) { k.p('box', C.red, 0, 1.1, 0, 7, 0.2, 0.2).p('box', C.white, -1.75, 1.1, 0, 1.2, 0.22, 0.22).p('box', C.white, 1.75, 1.1, 0, 1.2, 0.22, 0.22).p('box', C.steel, -3.6, 0.6, 0, 0.3, 1.2, 0.3).p('box', C.steel, 3.6, 0.6, 0, 0.3, 1.2, 0.3).p('box', 0x2f7fd6, 6, 1.4, 1, 2.4, 2.8, 2.4).p('prism', C.snow, 6, 3.3, 1, 3.2, 1.2, 3).p('box', C.glow, 6, 1.8, -0.22, 1.2, 0.8, 0.05).p('cyl8', C.steel, -5, 2.5, 0, 0.1, 5, 0.1).p('box', C.orange, -4.4, 4.5, 0, 1.2, 0.7, 0.04); for (let i = 0; i < 5; i++) k.p('sphL', C.tan, -6 + (i % 3) * 1.2, 0.3 + (i > 2 ? 0.5 : 0), 1.6, 1.3, 0.6, 0.8); k.collide(6, 1, 1.8, 3); },
};
const FLOAT = { seastack: 1, bergTab: 1, bergPin: 1, buoy: 1 };

export function buildScatter(world, quality) {
  const S = 500, kits = new Map(), r = mulberry32(77), dens = quality > 0 ? 1 : 0.55;
  const kitAt = (x, z) => { const i = Math.floor((x - X0) / S), j = Math.floor((z - Z0) / S), key = i + '_' + j; let e = kits.get(key); if (!e) kits.set(key, e = { kit: new Kit(), x: X0 + (i + 0.5) * S, z: Z0 + (j + 0.5) * S }); return e.kit; };
  const put = (type, x, z, a = r() * 6.283, s = 1) => { const k = kitAt(x, z); k.at(x, FLOAT[type] ? 0 : world.h(x, z), z, a, () => PROPS[type](k, r, s)); };
  const clear = (x, z, m) => world.locs.every(l => { const d = Math.hypot(l.x - x, l.z - z); return d > l.R * m + 6 && !(l.mole && d < l.mole.len + 45); });
  const scatter = (type, count, rule, s0 = 1, s1 = 1, flat = 9, m = 1.25) => {
    let c = 0; count = Math.round(count * dens);
    for (let t = 0; t < count * 40 && c < count; t++) { const x = X0 + 40 + r() * (-2 * X0 - 80), z = Z0 + 40 + r() * (-2 * Z0 - 80), o = world.idx(x, z), h = world.H[o]; if (!rule(h, world.kind[o], world.coast[o], x, z) || !clear(x, z, m) || (flat < 9 && world.slope(x, z) > flat)) continue; put(type, x, z, r() * 6.283, s0 + r() * r() * (s1 - s0)); c++; }
  };
  const land = k => k === LAND || k === SHELF || k === GLACIER || k === DRY, near = (x, z, f, d) => { const l = world.nearestLoc(x, z); return (l.f === f || l.heritage === f) && Math.hypot(l.x - x, l.z - z) < d; };
  scatter('rock', 1000, (h, k) => h > 3 && land(k), 1.2, 6);
  scatter('boulders', 300, (h, k) => h > 3 && land(k), 1.4, 3.6, 0.7);
  scatter('boulders', 220, (h, k) => k === GLACIER, 1.2, 3);
  scatter('darkrock', 260, (h, k) => k === DRY, 1.4, 5);
  scatter('shards', 520, (h, k) => h > 2.5 && (land(k) || k === CREV), 0.7, 1.6);
  scatter('shards', 160, (h, k) => k === CREV || k === GLACIER, 1, 2.2);
  scatter('drift', 1100, (h, k) => h > 2.5 && (k === LAND || k === SHELF), 3, 12);
  scatter('penitentes', 170, (h, k) => h > 34 && k === LAND, 1, 1, 0.3);
  scatter('hut', 80, (h, k, d) => k === LAND && d > 70 && h > 4, 1, 1, 0.16);
  scatter('camp', 95, (h, k, d) => (k === LAND || k === SHELF) && h > 3, 1, 1, 0.16);
  scatter('cairn', 170, (h, k) => k === LAND && h > 6);
  scatter('bones', 80, (h, k, d) => (k === LAND || k === SHELF) && h > 1.5 && h < 8 && Math.abs(d) < 80, 1, 1, 0.25);
  scatter('fishhole', 70, (h, k) => k === SHELF && h < 9, 1, 1, 0.1);
  scatter('tankwreck', 55, (h, k) => (k === LAND || k === SHELF) && h > 3, 1, 1, 0.3);
  scatter('planewreck', 16, (h, k, d) => k === LAND && d > 180, 1, 1, 0.2);
  scatter('shipwreck', 22, (h, k, d) => k === FLOE || (k === SEA && h < -0.8 && h > -4 && d > -90), 1, 1, 9, 2.2);
  scatter('bunker', 110, (h, k) => (k === LAND || k === SHELF) && h > 3, 1, 1, 0.18);
  scatter('snowman', 80, (h, k) => (k === LAND || k === SHELF) && h > 3, 1, 1, 0.3);
  scatter('supply', 60, (h, k) => (k === LAND || k === SHELF || k === FLOE), 1, 1, 0.3);
  scatter('weather', 55, (h, k, d) => k === LAND && d > 120, 1, 1, 0.3);
  scatter('ruin', 45, (h, k, d, x, z) => k === LAND && h > 3 && near(x, z, 'seals', 700), 1, 1, 0.2);
  scatter('opylon', 45, (h, k, d, x, z) => (k === LAND || k === SHELF) && Math.abs(d) < 90 && near(x, z, 'orcas', 600));
  scatter('crystal', 40, (h, k) => k === CREV, 0.6, 1.4);
  scatter('seastack', 55, (h, k, d) => k === SEA && h < -2 && d < -25 && d > -170, 0.7, 1.5, 9, 2.4);
  scatter('bergTab', 130, (h, k) => k === SEA && h < -7, 16, 60, 9, 2.6);
  scatter('bergPin', 150, (h, k) => k === SEA && h < -6, 8, 40, 9, 2.6);
  scatter('buoy', 70, (h, k, d) => k === SEA && h < -2 && d < -30 && d > -140, 1, 1, 9, 1.6);
  // set pieces tied to geography
  for (const L of FEATURES.LAKES) for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = r() * L.r * 0.8, x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d; if (world.kindAt(x, z) === LAKE) put('fishhole', x, z); }
  for (const M of [FEATURES.MOUNDS[0], FEATURES.MOUNDS[2]]) { const [mx, mz] = toWorld(M.px, M.py); for (let i = 0; i < 16 * dens; i++) { const a = r() * 6.28, d = (0.25 + r() * 0.7) * M.r, x = mx + Math.cos(a) * d, z = mz + Math.sin(a) * d; if (clear(x, z, 1.2)) put('fumarole', x, z, 0, 0.7 + r()); } }
  for (const Cr of FEATURES.CRATERS) { const [cx, cz] = toWorld(Cr.px, Cr.py); for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = r() * Cr.r * 0.5; put(i % 3 ? 'darkrock' : 'crystal', cx + Math.cos(a) * d, cz + Math.sin(a) * d, 0, 1 + r() * 2); } put('weather', cx + Cr.r * 0.3, cz + 4); put('camp', cx - Cr.r * 0.3, cz - 6); }
  // road furniture: marker poles, lamps, signposts, the odd checkpoint
  for (const rd of world.roads) { const P = rd.pts; let n = 0;
    for (let i = 5; i < P.length - 5; i += 6) { const p = P[i]; if (!p.ok) continue; const q = P[i + 1], dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1, side = n % 2 ? 1 : -1, x = p.x - dz / l * 5.4 * side, z = p.z + dx / l * 5.4 * side, a = Math.atan2(dx, dz); n++; put(n % 4 === 0 ? 'lamp' : 'pole', x, z, a + (side > 0 ? Math.PI / 2 : -Math.PI / 2)); }
    for (const t of [0.3, 0.7]) { const p = P[Math.floor(P.length * t)]; if (p.ok) put('signpost', p.x + 7, p.z + 3); }
    if (rd.len > 420) { const i = Math.floor(P.length / 2), p = P[i], q = P[i + 1]; if (p.ok && world.slope(p.x, p.z) < 0.2) put('checkpoint', p.x, p.z, Math.atan2(q.x - p.x, q.z - p.z)); }
  }
  const out = [];
  for (const e of kits.values()) { if (!e.kit.n) continue; for (const c of e.kit.cols) world.addCollider(c.x, c.z, c.r, c.top); const mesh = e.kit.bake(); world.scene.add(mesh); out.push({ mesh, x: e.x, z: e.z }); }
  return out;
}
