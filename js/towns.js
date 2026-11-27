// Settlements: faction architecture, landmarks, street furniture, harbours, perimeters.
import { FACTIONS, mulberry32 } from './data.js';
import { Kit, C } from './kit.js';
import { toWorld, FEATURES } from './world.js';

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


// ---------- extra buildings ----------
function watchtower(k, x, z, h, ac, wood = C.wood) {
  k.at(x, 0, z, x, () => { for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.p('box', wood, a * 1.3, h / 2, b * 1.3, 0.3, h, 0.3, b * 0.05, 0, -a * 0.05);
    k.p('box', wood, 0, h, 0, 3.6, 0.25, 3.6).p('box', wood, 0, h + 0.7, 1.75, 3.6, 1.1, 0.12).p('box', wood, 0, h + 0.7, -1.75, 3.6, 1.1, 0.12).p('box', wood, 1.75, h + 0.7, 0, 0.12, 1.1, 3.6).p('box', wood, -1.75, h + 0.7, 0, 0.12, 1.1, 3.6)
      .p('cone4', ac, 0, h + 3.4, 0, 5.6, 1.8, 5.6, 0, Math.PI / 4).p('box', wood, 0, h / 2, 1.5, 0.7, h, 0.08, 0.12).p('sphL', C.glow, 0, h + 2.2, 0, 0.5); for (const a of [-1, 1]) for (const b of [-1, 1]) k.p('box', wood, a * 1.6, h + 1.6, b * 1.6, 0.14, 2, 0.14);
    k.collide(0, 0, 1.9, h); });
}
function barracks(k, x, z, ac, ry) {
  k.at(x, 0, z, ry, () => { k.p('cyl', 0xdfe9f2, 0, 0, 0, 8, 16, 8, Math.PI / 2).p('box', C.steel, 0, 1.6, 8.05, 5, 3.2, 0.2).p('box', C.black, 0, 1.2, 8.2, 1.4, 2.4, 0.1).p('box', ac, 0, 3.7, 8.1, 5.4, 0.5, 0.2);
    for (let i = -2; i <= 2; i++) k.p('box', C.glow, 3.55, 2, i * 2.8, 0.2, 0.9, 1.2, 0, 0, -0.55).p('box', C.glow, -3.55, 2, i * 2.8, 0.2, 0.9, 1.2, 0, 0, 0.55);
    k.p('cyl8', C.steel, 1.6, 4.4, -4, 0.5, 1.6, 0.5).p('box', C.snow, 0, 3.95, 0, 3, 0.3, 15); for (const zz of [-5, 0, 5]) k.collide(0, zz, 4.2, 4); });
}
function greenhouse(k, x, z, ac) { k.p('cyl', C.steel, x, 0.4, z, 9, 0.8, 9).p('dome', 0x8fd0f5, x, 0.8, z, 8.6, 8, 8.6).p('torus', ac, x, 0.85, z, 8.8, 8.8, 3, Math.PI / 2).p('arch', C.steel, x, 0.8, z, 8.7, 8.2, 2).p('arch', C.steel, x, 0.8, z, 8.7, 8.2, 2, 0, Math.PI / 2); for (let i = 0; i < 5; i++) k.p('cone6', C.kelp, x + Math.cos(i * 1.3) * 2.2, 1.8, z + Math.sin(i * 1.3) * 2.2, 1.2, 2.2, 1.2); k.collide(x, z, 4.4, 4.5); }
function shop(k, x, z, ac, ry, r) {
  const st = [C.red, C.gold, C.teal, C.orange][Math.floor(r() * 4)];
  k.at(x, 0, z, ry, () => { k.p('dome', C.snow, 0, 0, 0, 7, 6.4, 7).p('torus', ac, 0, 0.25, 0, 7.1, 7.1, 4, Math.PI / 2).p('box', C.wood, 0, 0.9, 4, 4.4, 1.8, 1.4).p('prism', st, 0, 3.4, 4.3, 3.2, 1.3, 5.2, 0, Math.PI / 2).p('box', C.white, 0, 3.05, 5.15, 5.2, 0.5, 0.08)
    .p('cyl8', C.wood, -2.3, 1.6, 5, 0.16, 3.2, 0.16).p('cyl8', C.wood, 2.3, 1.6, 5, 0.16, 3.2, 0.16).p('sphL', C.orange, -1, 2.05, 4, 0.6).p('sphL', 0x9fb6c9, 0.2, 2, 4.1, 0.5, 0.3, 0.9).p('sphL', C.red, 1.2, 2.05, 4, 0.55).p('box', st, 0, 5, 2.2, 3, 1, 0.15).p('cyl8', C.wood, 0, 4, 2.2, 0.15, 1.6, 0.15);
    k.collide(0, 0, 3.6, 3.4); k.collide(0, 4, 2.2, 2); });
}
function boathouse(k, x, z, ac, ry) {
  k.at(x, 0, z, ry, () => { k.p('box', C.wood, -3.4, 2, 0, 0.5, 4, 11).p('box', C.wood, 3.4, 2, 0, 0.5, 4, 11).p('box', C.wood, 0, 2, -5.3, 7, 4, 0.5).p('prism', C.woodD, 0, 5.2, 0, 9, 3.4, 11.8).p('box', ac, 0, 4.3, 5.6, 7.4, 0.5, 0.2)
    .p('domeL', C.woodD, 0, 0.5, 0.5, 2.6, 2, 7.5).p('box', C.tan, 0, 0.5, 0.5, 2.3, 0.08, 6.6).p('cyl8', C.wood, 0, 1.8, 6.6, 0.12, 3.6, 0.12).p('box', C.woodD, 0, 0.12, 8, 5, 0.24, 4.4); k.collide(-3.4, -3, 1.2, 4); k.collide(-3.4, 3, 1.2, 4); k.collide(3.4, -3, 1.2, 4); k.collide(3.4, 3, 1.2, 4); k.collide(0, -5.3, 2.6, 4); });
}
function roundhouse(k, x, z, ac, s = 1) { k.p('cyl', C.stone, x, 1.5 * s, z, 6.4 * s, 3 * s, 6.4 * s).p('cone', C.tan, x, 4.6 * s, z, 8 * s, 3.4 * s, 8 * s).p('cyl8', C.stoneD, x, 6.4 * s, z, 0.9, 0.8, 0.9).p('box', C.woodD, x, 1.1 * s, z + 3.2 * s, 1.5, 2.2 * s, 0.25).p('torus', ac, x, 3 * s, z, 6.6 * s, 6.6 * s, 3, Math.PI / 2).p('box', C.glow, x + 3.15 * s, 1.8 * s, z, 0.2, 0.9, 1); k.collide(x, z, 3.3 * s, 4); }
function poolDome(k, x, z, ac, s = 1) { k.p('dome', C.black, x, 0, z, 9 * s, 7 * s, 9 * s).p('torus', C.white, x, 1.6 * s, z, 8.3 * s, 8.3 * s, 6, Math.PI / 2).p('torus', ac, x, 0.2, z, 9.2 * s, 9.2 * s, 3, Math.PI / 2).p('arch', ac, x, 0, z + 4.2 * s, 3.4, 5, 3).p('box', C.navy, x, 1.2, z + 4.35 * s, 2.4, 2.4, 0.3).p('cone', C.black, x, 4.2 * s, z - 1, 0.5, 2.8 * s, 2.2, -0.4); k.collide(x, z, 4.6 * s, 4); }
function spire(k, x, z, h, ac) { for (let i = 0; i < 4; i++) k.p('taper6', i % 2 ? 0x2a3046 : C.black, x, h * (0.125 + i * 0.25), z, 4.4 - i * 0.9, h * 0.26, 4.4 - i * 0.9, 0, i * 0.5); k.p('torus', ac, x, h * 0.5, z, 3.6, 3.6, 3, Math.PI / 2).p('torus', C.cyan, x, h * 0.75, z, 2.7, 2.7, 3, Math.PI / 2).p('cone', C.black, x, h + 1.6, z, 0.5, 3.4, 2.4).p('oct', C.cyan, x, h * 0.9, z + 1.2, 0.8); k.collide(x, z, 2.3, h); }
function longhouse(k, x, z, ac, ry) {
  k.at(x, 0, z, ry, () => { k.p('box', C.rust, 0, 1.7, 0, 7, 3.4, 15).p('prism', 0x5a2f20, 0, 5.2, 0, 9.6, 4.6, 16).p('box', C.black, 0, 1.3, 7.55, 1.8, 2.6, 0.15).p('cone', C.white, -1.4, 7.6, 7.9, 0.5, 3, 0.5, 0.3, 0, 0.5).p('cone', C.white, 1.4, 7.6, 7.9, 0.5, 3, 0.5, 0.3, 0, -0.5);
    for (let i = -2; i <= 2; i++) k.p('cyl8', i % 2 ? C.gold : ac, 3.6, 2, i * 2.8, 1.5, 0.2, 1.5, 0, 0, Math.PI / 2).p('cyl8', i % 2 ? ac : C.gold, -3.6, 2, i * 2.8, 1.5, 0.2, 1.5, 0, 0, Math.PI / 2); for (const zz of [-5, 0, 5]) k.collide(0, zz, 3.9, 5); });
}

// ---------- street furniture & faction props (drawn at the local origin) ----------
const P = {
  fishRack(k) { k.p('box', C.wood, -1.3, 1, 0, 0.15, 2, 0.15).p('box', C.wood, 1.3, 1, 0, 0.15, 2, 0.15).p('box', C.wood, 0, 2, 0, 2.9, 0.12, 0.12); for (let i = 0; i < 5; i++) k.p('sphL', i % 2 ? 0x9fb6c9 : C.orange, -1 + i * 0.5, 1.55, 0, 0.22, 0.75, 0.1); },
  sled(k, r, ac) { k.p('box', C.wood, 0, 0.35, 0, 1, 0.12, 2.2).p('box', C.steel, -0.45, 0.1, 0, 0.08, 0.08, 2.6).p('box', C.steel, 0.45, 0.1, 0, 0.08, 0.08, 2.6).p('box', ac, 0, 0.66, -0.3, 0.8, 0.5, 1).p('box', C.tan, 0, 0.6, 0.6, 0.7, 0.36, 0.6); },
  snowballs(k) { for (let i = 0; i < 9; i++) k.p('sphL', C.snow, (i % 3 - 1) * 0.5, 0.25, (Math.floor(i / 3) - 1) * 0.5, 0.52); for (let i = 0; i < 4; i++) k.p('sphL', C.snow, (i % 2 - 0.5) * 0.5, 0.66, (Math.floor(i / 2) - 0.5) * 0.5, 0.52); k.p('sphL', C.snow, 0, 1.05, 0, 0.52); },
  mailbox(k, r, ac) { k.p('box', C.wood, 0, 0.6, 0, 0.14, 1.2, 0.14).p('box', ac, 0, 1.35, 0, 0.4, 0.4, 0.7).p('box', C.red, 0.24, 1.6, 0.1, 0.04, 0.4, 0.2); },
  bench(k) { k.p('box', C.wood, 0, 0.5, 0, 2, 0.1, 0.6).p('box', C.wood, 0, 0.95, -0.28, 2, 0.5, 0.08).p('box', C.steel, -0.8, 0.25, 0, 0.1, 0.5, 0.5).p('box', C.steel, 0.8, 0.25, 0, 0.1, 0.5, 0.5); },
  sculpture(k) { k.p('cyl8', C.iceD, 0, 0.25, 0, 1.6, 0.5, 1.6).p('capsule', C.ice, 0, 1.5, 0, 1.1, 0.5, 1).p('sphL', C.ice, 0, 2.5, 0.05, 0.8).p('cone6', C.iceD, 0, 2.45, 0.5, 0.22, 0.4, 0.2, Math.PI / 2); k.collide(0, 0, 0.8, 3); },
  mortar(k) { for (let i = 0; i < 7; i++) { const a = -0.4 + i * 0.63; k.p('sphL', C.tan, Math.cos(a) * 1.9, 0.3, Math.sin(a) * 1.9, 1.2, 0.6, 0.7, 0, -a); } k.p('cyl8', C.black, 0, 0.08, 0, 1.1, 0.16, 1.1).p('cyl8', 0x4f7d5a, 0, 0.9, 0.25, 0.34, 1.9, 0.34, 0.45).p('sphL', C.snow, 0.8, 0.22, -0.5, 0.44).p('sphL', C.snow, 1.1, 0.22, -0.1, 0.44); k.collide(0, 0, 1.2, 1.2); },
  dummy(k) { k.p('box', C.wood, 0, 0.9, 0, 0.16, 1.8, 0.16).p('cyl8', C.white, 0, 1.9, 0.02, 1.4, 0.1, 1.4, Math.PI / 2).p('cyl8', C.red, 0, 1.9, 0.06, 0.9, 0.1, 0.9, Math.PI / 2).p('cyl8', C.white, 0, 1.9, 0.1, 0.4, 0.1, 0.4, Math.PI / 2).p('sphL', 0x8d9aab, 1.6, 0.6, 0, 0.8, 1.2, 0.3).p('sphL', 0x8d9aab, 1.6, 1.4, 0, 0.55, 0.55, 0.3); },
  slide(k, r, ac) { k.p('box', C.wood, -0.5, 1.2, -1.6, 0.14, 2.4, 0.14).p('box', C.wood, 0.5, 1.2, -1.6, 0.14, 2.4, 0.14).p('box', ac, 0, 2.4, -1.4, 1.3, 0.12, 1).p('box', C.ice, 0, 1.25, 0.7, 1.1, 0.12, 3.9, 0.62).p('box', C.iceD, -0.6, 1.4, 0.7, 0.1, 0.3, 3.9, 0.62).p('box', C.iceD, 0.6, 1.4, 0.7, 0.1, 0.3, 3.9, 0.62); for (let i = 0; i < 4; i++) k.p('box', C.wood, 0, 0.5 + i * 0.5, -1.6, 1, 0.08, 0.1); k.collide(0, -1.4, 0.8, 2.4); },
  creche(k) { for (let i = 0; i < 8; i++) { const a = i * 0.785; k.p('box', C.wood, Math.cos(a) * 1.7, 0.35, Math.sin(a) * 1.7, 0.12, 0.7, 0.12).p('box', C.wood, Math.cos(a + 0.39) * 1.6, 0.5, Math.sin(a + 0.39) * 1.6, 1.3, 0.08, 0.06, 0, -a - 0.39 + Math.PI / 2); } for (let i = 0; i < 4; i++) k.p('sphL', 0xfaf6e6, Math.cos(i * 1.7) * 0.6, 0.36, Math.sin(i * 1.7) * 0.6, 0.5, 0.7, 0.5); k.p('cyl8', C.tan, 0, 0.06, 0, 2.4, 0.12, 2.4); },
  drums(k, r, ac) { k.p('cyl8', C.glass, -0.5, 0.6, 0, 0.8, 1.2, 0.8).p('cyl8', ac, 0.45, 0.6, 0.2, 0.8, 1.2, 0.8).p('cyl8', C.steel, 0, 0.4, -0.9, 0.8, 1.2, 0.8, Math.PI / 2, 0.4).p('box', C.snow, -0.5, 1.24, 0, 0.6, 0.1, 0.6); k.collide(0, 0, 1, 1.3); },
  ammo(k) { k.p('box', C.olive, 0, 0.35, 0, 1.6, 0.7, 1).p('box', C.olive, 0.1, 1.0, 0, 1.4, 0.6, 0.9, 0, 0.2).p('box', 0x55703a, -1.2, 0.3, 0.4, 0.7, 0.6, 0.7, 0, 0.5).p('box', C.tan, 0.1, 1.36, 0, 1.6, 0.08, 1.1, 0, 0.2, 0.06).p('box', C.gold, 0, 0.36, 0.52, 0.5, 0.2, 0.02); k.collide(0, 0, 1.1, 1.4); },
  snowfence(k) { for (let i = -2; i <= 2; i++) k.p('box', C.wood, i * 1.2, 0.6, 0, 0.12, 1.2, 0.12, 0, 0, 0.06 * i); for (let j = 0; j < 3; j++) k.p('box', C.red, 0, 0.35 + j * 0.3, 0.02, 5, 0.14, 0.04); k.p('sphL', C.snow, 0, 0.1, -0.7, 5, 0.7, 1.6); },
  dish(k) { k.p('cyl8', C.steel, 0, 0.8, 0, 0.14, 1.6, 0.14).p('domeL', C.white, 0, 1.9, 0.1, 1.5, 0.7, 1.5, Math.PI * 0.72).p('cyl8', C.red, 0, 2.0, 0.5, 0.05, 0.9, 0.05, 1.2).p('box', C.steel, 0, 0.1, 0, 0.8, 0.2, 0.8); },
  lamp(k) { k.p('cyl8', C.steel, 0, 2, 0, 0.14, 4, 0.14).p('box', C.steel, 0, 4, 0.3, 0.1, 0.1, 0.7).p('sphL', C.glow, 0, 3.9, 0.6, 0.6); },
  flagpole(k, r, ac) { k.p('cyl8', C.steel, 0, 4.5, 0, 0.16, 9, 0.16).p('box', ac, 1.1, 8.2, 0, 2.2, 1.3, 0.06).p('sphL', C.gold, 0, 9.1, 0, 0.3).p('cyl8', C.stone, 0, 0.2, 0, 1, 0.4, 1); },
  signpost(k, r, ac) { k.p('box', C.wood, 0, 1.3, 0, 0.14, 2.6, 0.14).p('box', ac, 0.5, 2.3, 0, 1.2, 0.3, 0.06, 0, 0.3).p('box', C.white, -0.45, 1.9, 0, 1.1, 0.28, 0.06, 0, -0.5).p('box', C.gold, 0.4, 1.5, 0, 1, 0.26, 0.06, 0, 1.2); },
  icebricks(k) { for (let i = 0; i < 6; i++) k.p('box', i % 2 ? C.ice : C.iceD, (i % 3 - 1) * 0.85, 0.3 + Math.floor(i / 3) * 0.6, 0, 0.8, 0.56, 0.6); k.p('box', C.ice, 1.2, 0.3, 0.9, 0.8, 0.56, 0.6, 0, 0.6); k.collide(0, 0, 1.1, 1.2); },
  netRack(k) { for (const x of [-1.6, 1.6]) k.p('box', C.wood, x, 1.1, 0.4, 0.12, 2.3, 0.12, 0.35).p('box', C.wood, x, 1.1, -0.4, 0.12, 2.3, 0.12, -0.35); k.p('box', C.wood, 0, 2.1, 0, 3.6, 0.1, 0.1).p('box', C.tan, 0, 1.3, 0, 3.2, 1.5, 0.04); for (let i = 0; i < 5; i++) k.p('sphL', i % 2 ? C.orange : C.red, -1.3 + i * 0.65, 0.55, 0.05, 0.26); },
  boat(k, r, ac) { k.p('domeL', C.woodD, 0, 0, 0, 1.9, 1.5, 4.8).p('box', C.wood, 0, 0.78, 0, 0.12, 0.14, 4.6).p('box', ac, 0.9, 0.3, 0, 0.06, 0.22, 3.4, 0, 0, 0.5).p('box', C.wood, 1.4, 0.5, 1, 0.08, 0.08, 2.4, 0.3, 0.3); k.collide(0, 0, 1.2, 0.9); },
  pots(k) { for (const [x, z, a] of [[0, 0, 0], [0.9, 0.3, 0.5], [0.3, 0.9, 1]]) k.p('box', C.woodD, x, 0.3, z, 0.8, 0.6, 0.6, 0, a).p('box', C.tan, x, 0.3, z, 0.84, 0.1, 0.64, 0, a); k.p('torus', C.tan, -0.7, 0.1, 0.6, 0.8, 0.8, 3, Math.PI / 2); },
  kelpLine(k) { k.p('box', C.wood, -1.8, 1.1, 0, 0.12, 2.2, 0.12).p('box', C.wood, 1.8, 1.1, 0, 0.12, 2.2, 0.12).p('box', C.tan, 0, 2.1, 0, 3.6, 0.04, 0.04); for (let i = 0; i < 6; i++) k.p('box', i % 2 ? C.kelp : 0x247a52, -1.4 + i * 0.56, 1.5 - (i % 3) * 0.1, 0, 0.3, 1.1 + (i % 3) * 0.2, 0.04); },
  firepit(k) { for (let i = 0; i < 8; i++) k.p('dod', C.stone, Math.cos(i * 0.785) * 1.1, 0.2, Math.sin(i * 0.785) * 1.1, 0.5); k.p('cone6', 0xff7a1a, 0, 0.7, 0, 0.9, 1.4, 0.9).p('cone6', 0xffd23a, 0, 0.5, 0, 0.5, 0.9, 0.5); for (let i = 0; i < 3; i++) k.p('cyl8', C.wood, Math.cos(i * 2.1) * 2.3, 0.3, Math.sin(i * 2.1) * 2.3, 0.6, 1.6, 0.6, Math.PI / 2, -i * 2.1); },
  harpoons(k) { k.p('box', C.woodD, 0, 0.9, 0, 2, 0.12, 0.12).p('box', C.woodD, -0.9, 0.5, 0, 0.12, 1, 0.5).p('box', C.woodD, 0.9, 0.5, 0, 0.12, 1, 0.5); for (let i = 0; i < 4; i++) k.p('cyl8', C.wood, -0.6 + i * 0.4, 1.3, 0.25, 0.06, 2.8, 0.06, -0.2).p('cone6', C.steel, -0.6 + i * 0.4, 2.75, -0.04, 0.16, 0.4, 0.16, -0.2); },
  anchor(k) { k.p('cyl8', C.stoneD, 0, 0.9, 0, 0.16, 1.8, 0.16, 0, 0, 0.35).p('torus', C.stoneD, -0.3, 1.8, 0, 0.5, 0.5, 2.5).p('archL', C.stoneD, 0.3, 0.5, 0, 1.4, -1, 1, 0, 0, 0.35).p('torus', C.tan, 1.1, 0.12, 0.5, 1, 1, 3.5, Math.PI / 2).p('torus', C.tan, 1.1, 0.26, 0.5, 0.85, 0.85, 3.5, Math.PI / 2); },
  barrels(k) { k.p('cyl8', C.woodD, 0, 0.55, 0, 0.8, 1.1, 0.8).p('cyl8', C.wood, 0.85, 0.55, 0.2, 0.8, 1.1, 0.8).p('cyl8', C.woodD, 0.3, 0.4, -0.95, 0.8, 1.1, 0.8, Math.PI / 2, 0.5).p('torus', C.steel, 0, 0.8, 0, 0.84, 0.84, 1.2, Math.PI / 2).p('torus', C.steel, 0.85, 0.3, 0.2, 0.84, 0.84, 1.2, Math.PI / 2); k.collide(0.3, 0, 1, 1.2); },
  lantern(k) { k.p('box', C.woodD, 0, 1.6, 0, 0.16, 3.2, 0.16).p('box', C.woodD, 0.4, 3.1, 0, 0.9, 0.1, 0.1).p('box', C.glow, 0.75, 2.7, 0, 0.36, 0.5, 0.36).p('cone4', C.woodD, 0.75, 3.05, 0, 0.6, 0.3, 0.6, 0, 0.785); },
  cairn(k) { for (let i = 0; i < 4; i++) k.p('dod', i % 2 ? C.stone : C.stoneD, (i % 2) * 0.1, 0.3 + i * 0.5, 0, 1.1 - i * 0.2, 0.6, 1 - i * 0.18, 0, i); },
  drum(k) { k.p('cyl8', C.wood, 0, 0.5, 0, 1.3, 1, 1.3).p('cyl8', C.tan, 0, 1.02, 0, 1.24, 0.06, 1.24).p('cyl8', C.woodD, 0.3, 1.2, 0.2, 0.08, 0.9, 0.08, 1.3, 0.5).p('torus', C.red, 0, 0.5, 0, 1.34, 1.34, 1.5, Math.PI / 2); },
  smoker(k) { k.p('box', C.woodD, 0, 1.1, 0, 1.8, 2.2, 1.8).p('cone4', C.wood, 0, 2.7, 0, 3, 1, 3, 0, 0.785).p('cyl8', C.stone, 0.4, 3.2, 0, 0.36, 0.9, 0.36).p('sphL', 0xdfe4ea, 0.5, 4.1, 0, 0.8).p('sphL', 0xeef1f5, 0.8, 5, 0.2, 1.1).p('box', C.black, 0, 0.9, 0.92, 0.8, 1.5, 0.06); k.collide(0, 0, 1.2, 2.4); },
  pool(k, r, ac) { k.p('cyl', C.black, 0, 0.2, 0, 5, 0.4, 5).p('cyl', C.teal, 0, 0.42, 0, 4.2, 0.06, 4.2).p('taper6', C.black, 0, 0.9, 0, 0.9, 1.2, 0.9).p('sphL', C.cyan, 0, 1.7, 0, 0.6).p('torus', ac, 0, 0.42, 0, 5.1, 5.1, 2, Math.PI / 2); },
  obelisk(k, r, ac) { k.p('taper6', C.black, 0, 2, 0, 1.2, 4, 1.2).p('torus', ac, 0, 2.6, 0, 1.1, 1.1, 3, Math.PI / 2).p('oct', C.cyan, 0, 4.5, 0, 0.6, 0.9, 0.6); k.collide(0, 0, 0.6, 4); },
  coralLamp(k, r, ac) { k.p('cyl8', C.black, 0, 1.5, 0, 0.14, 3, 0.14, 0, 0, 0.08).p('oct', C.cyan, 0.1, 3.3, 0, 0.6, 0.9, 0.6).p('cone6', 0xff6f8a, 0.3, 0.5, 0.2, 0.3, 1, 0.3, 0, 0, -0.3).p('cone6', 0xff6f8a, -0.2, 0.4, -0.2, 0.26, 0.8, 0.26, 0.3); },
  torpedoes(k) { k.p('box', C.steel, 0, 0.3, -0.9, 2.4, 0.6, 0.2).p('box', C.steel, 0, 0.3, 0.9, 2.4, 0.6, 0.2); for (let i = 0; i < 3; i++) k.p('cyl8', C.black, -0.7 + i * 0.7, 0.8, 0, 0.5, 2.6, 0.5, Math.PI / 2).p('cone6', C.red, -0.7 + i * 0.7, 0.8, 1.6, 0.5, 0.7, 0.5, Math.PI / 2); k.collide(0, 0, 1.3, 1.2); },
  container(k, r, ac) { k.p('box', C.black, 0, 1.3, 0, 2.5, 2.6, 5.6).p('box', ac, 0, 2.2, 0, 2.54, 0.4, 5.64).p('cone', C.white, 1.28, 1.2, 0, 0.1, 1.2, 0.9).p('box', C.steel, 0, 1.3, 2.82, 2, 2.2, 0.06).p('box', C.snow, 0, 2.66, 0, 2.3, 0.12, 5.2); k.collide(0, -1.6, 1.6, 2.7); k.collide(0, 1.6, 1.6, 2.7); },
  sonarDish(k, r, ac) { k.p('cyl8', C.black, 0, 1.2, 0, 0.2, 2.4, 0.2).p('domeL', ac, 0, 2.7, 0.2, 2, 0.9, 2, Math.PI * 0.7).p('sphL', C.cyan, 0, 2.9, 0.9, 0.3); },
  dronePad(k, r, ac) { k.p('cyl', C.black, 0, 0.08, 0, 4.6, 0.16, 4.6).p('torus', C.white, 0, 0.18, 0, 3.6, 3.6, 1.5, Math.PI / 2).p('box', 0x59616f, 0, 0.55, 0, 0.8, 0.3, 1.6).p('box', 0x59616f, 0, 0.6, 0.1, 3.4, 0.08, 0.6).p('cone6', C.gold, 0, 0.55, 1, 0.3, 0.6, 0.3, Math.PI / 2).p('cyl8', ac, 1.5, 0.75, 0.1, 0.9, 0.05, 0.9).p('cyl8', ac, -1.5, 0.75, 0.1, 0.9, 0.05, 0.9); },
  kelpGarden(k) { for (let i = 0; i < 6; i++) k.p('cone6', i % 2 ? C.kelp : 0x247a52, Math.cos(i * 1.1) * 0.9, 0.9 + (i % 3) * 0.3, Math.sin(i * 1.1) * 0.9, 0.5, 1.8 + (i % 3) * 0.6, 0.5, 0.1 * i - 0.2, 0, 0.1); k.p('cyl8', C.black, 0, 0.12, 0, 2.6, 0.24, 2.6); },
  boneGate(k) { k.p('archL', C.white, 0, 0, 0, 3.4, 5, 3).p('archL', C.white, 0, 0, 0.6, 3, 4.4, 3); },
  brazier(k) { for (let i = 0; i < 3; i++) k.p('cyl8', C.black, Math.cos(i * 2.1) * 0.4, 0.7, Math.sin(i * 2.1) * 0.4, 0.08, 1.5, 0.08, Math.sin(i * 2.1) * 0.3, 0, -Math.cos(i * 2.1) * 0.3); k.p('cyl8', C.rust, 0, 1.45, 0, 1.1, 0.3, 1.1).p('cone6', 0xff7a1a, 0, 2.1, 0, 0.8, 1.2, 0.8).p('cone6', 0xffd23a, 0, 1.9, 0, 0.4, 0.8, 0.4); },
  tuskTotem(k, r, ac) { k.p('cyl8', C.woodD, 0, 2, 0, 0.7, 4, 0.7).p('cone', C.white, -0.6, 3.2, 0.3, 0.3, 1.8, 0.3, 0.3, 0, 2.6).p('cone', C.white, 0.6, 3.2, 0.3, 0.3, 1.8, 0.3, 0.3, 0, -2.6).p('torus', ac, 0, 2.4, 0, 0.8, 0.8, 3, Math.PI / 2).p('sphL', C.black, -0.18, 3.5, 0.33, 0.14).p('sphL', C.black, 0.18, 3.5, 0.33, 0.14); k.collide(0, 0, 0.5, 4); },
  cannon(k) { k.p('cyl8', C.woodD, -0.8, 0.6, 0, 1.2, 0.2, 1.2, 0, 0, Math.PI / 2).p('cyl8', C.woodD, 0.8, 0.6, 0, 1.2, 0.2, 1.2, 0, 0, Math.PI / 2).p('cyl8', C.black, 0, 1, 0.6, 0.6, 3, 0.6, 1.3).p('box', C.woodD, 0, 0.5, -0.9, 0.5, 0.3, 2, 0.2); for (let i = 0; i < 3; i++) k.p('sphL', C.black, 1.4 + (i % 2) * 0.4, 0.2, -0.4 + i * 0.4, 0.4); k.collide(0, 0, 1.1, 1.4); },
  loot(k) { k.p('box', C.rust, 0, 0.4, 0, 1.2, 0.8, 0.9).p('box', C.woodD, 0.9, 0.3, 0.5, 0.8, 0.6, 0.7, 0, 0.6); for (let i = 0; i < 6; i++) k.p('sphL', C.gold, -0.3 + (i % 3) * 0.26, 0.9 + Math.floor(i / 3) * 0.15, (i % 2) * 0.2, 0.24); k.p('sphL', 0x9fb6c9, -0.9, 0.2, 0.4, 0.4, 0.3, 1); },
  spikes(k) { for (let i = 0; i < 5; i++) k.p('cone6', C.woodD, -1.6 + i * 0.8, 0.9, 0, 0.36, 2.2, 0.36, 0.7); k.p('box', C.woodD, 0, 0.4, -0.3, 4, 0.2, 0.2); k.collide(-1, 0, 0.7, 1.4); k.collide(1, 0, 0.7, 1.4); },
  banner(k, r, ac) { k.p('cyl8', C.woodD, 0, 3.5, 0, 0.16, 7, 0.16).p('box', C.woodD, 0.6, 6.6, 0, 1.4, 0.1, 0.1).p('box', ac, 0.7, 4.9, 0, 1.1, 3.2, 0.05).p('cone', C.white, 0.7, 5.6, 0.04, 0.5, 0.8, 0.04, Math.PI); },
  perch(k) { k.p('cyl8', C.wood, 0, 1.6, 0, 0.14, 3.2, 0.14).p('box', C.wood, 0, 3.1, 0, 2.2, 0.12, 0.12).p('sphL', C.white, 0.6, 3.5, 0, 0.5, 0.6, 0.7).p('sphL', C.white, 0.6, 3.9, 0.2, 0.34).p('cone6', C.pink, 0.6, 3.86, 0.5, 0.1, 0.4, 0.1, Math.PI / 2); },
  windsock(k) { k.p('cyl8', C.steel, 0, 2.5, 0, 0.1, 5, 0.1).p('cone', C.orange, 0, 4.8, 0.9, 0.7, 1.8, 0.7, -Math.PI / 2 + 0.2).p('torus', C.white, 0, 4.82, 0.7, 0.56, 0.56, 2); },
  crateNet(k) { k.p('box', C.wood, 0, 0.5, 0, 1.2, 1, 1.2).p('box', C.wood, 1.1, 0.4, 0.2, 0.8, 0.8, 0.8, 0, 0.4).p('box', C.woodD, 0.2, 1.3, 0, 0.9, 0.6, 0.9, 0, 0.3).p('domeL', C.orange, -1.6, 0, 0.6, 2.6, 0.9, 2.2).p('domeL', C.white, -1.6, 0.02, 0.6, 1.5, 0.94, 2.25); k.collide(0.3, 0, 1.1, 1.5); },
  eggNest(k) { k.p('torus', C.woodD, 0, 0.2, 0, 1.6, 1.6, 5, Math.PI / 2).p('sphL', 0xfaf6e6, -0.2, 0.4, 0, 0.5, 0.7, 0.5).p('sphL', 0xfaf6e6, 0.3, 0.38, 0.2, 0.46, 0.64, 0.46, 0.3); },
  chimes(k) { k.p('box', C.wood, -0.7, 1.2, 0, 0.1, 2.4, 0.1).p('box', C.wood, 0.7, 1.2, 0, 0.1, 2.4, 0.1).p('box', C.wood, 0, 2.4, 0, 1.6, 0.1, 0.1); for (let i = 0; i < 4; i++) k.p('box', C.gold, -0.45 + i * 0.3, 1.8 - i * 0.12, 0, 0.08, 0.8 + i * 0.2, 0.08); },
  crates(k, r) { k.p('box', C.wood, 0, 0.5, 0, 1, 1, 1, 0, 0.2).p('box', C.woodD, 0.9, 0.35, 0.3, 0.7, 0.7, 0.7, 0, 0.7).p('box', C.snow, 0, 1.03, 0, 0.9, 0.08, 0.9, 0, 0.2); k.collide(0.2, 0, 0.9, 1); },
  drift(k, r) { k.p('sphL', C.snow, 0, -0.1, 0, 3 + r() * 2, 1 + r() * 0.6, 2 + r()); },
  // parked hardware
  icecrawler(k, r, ac) { k.p('box', C.black, -1.5, 0.45, 0, 0.6, 0.9, 6.4).p('box', C.black, 1.5, 0.45, 0, 0.6, 0.9, 6.4).p('box', 0xe6eef7, 0, 1.0, 0, 3.2, 1.1, 6.6).p('box', 0xbcd8ee, 0, 1.3, 3, 3, 0.6, 1.2, 0.6).p('box', ac, 0, 1.6, -1, 3.24, 0.12, 0.6).p('cyl8', 0xe6eef7, 0, 1.75, 0.8, 1.4, 0.5, 1.4).p('cyl8', C.black, 0, 1.85, 1.9, 0.14, 1.8, 0.14, Math.PI / 2).p('box', C.black, 0, 1.0, -3.32, 1.6, 0.9, 0.06).p('box', C.snow, 0, 1.6, -2.2, 2.8, 0.14, 1.6); k.collide(0, -1.8, 2, 2); k.collide(0, 1.8, 2, 2); },
  rockhopper(k, r, ac) { k.p('box', C.black, -1.2, 0.4, 0, 0.5, 0.8, 4.4).p('box', C.black, 1.2, 0.4, 0, 0.5, 0.8, 4.4).p('box', 0xc9d6c0, 0, 0.85, 0, 2.3, 0.8, 4.2).p('domeL', 0xc9d6c0, 0, 1.25, -0.2, 2, 1.5, 2.2).p('cyl8', 0x38404f, 0, 1.6, 1.6, 0.26, 2.6, 0.26, Math.PI / 2 - 0.1).p('box', ac, 0, 1.3, -1.6, 1.8, 0.1, 0.5).p('box', C.rust, 0.8, 1.0, 1, 0.5, 0.3, 0.8).p('box', C.snow, 0, 1.3, -1.9, 1.8, 0.1, 0.6); k.collide(0, 0, 2.2, 2); },
  mlrs(k, r, ac) { k.p('box', C.black, -1.5, 0.45, 0, 0.6, 0.9, 6).p('box', C.black, 1.5, 0.45, 0, 0.6, 0.9, 6).p('box', 0xe6eef7, 0, 1, 0, 3, 1, 6.2).p('box', 0xbcd8ee, 0, 1.9, 2.2, 2.6, 1, 1.6).p('box', C.glass, 0, 2, 3.02, 2.2, 0.5, 0.06).p('box', 0xdfe9f2, 0, 2.7, -1, 3, 1.6, 3.8, -0.4); for (let i = 0; i < 12; i++) k.p('cyl8', C.black, -1.1 + (i % 4) * 0.72, 2.9 + Math.floor(i / 4) * 0.5 + 0.45, 0.8 + Math.floor(i / 4) * 0.2, 0.5, 0.2, 0.5, Math.PI / 2 - 0.4); k.p('sphL', C.snow, 0, 3.75, -2.2, 1.6, 0.5, 1.4).p('box', ac, 1.52, 1.1, 0, 0.04, 0.5, 2); k.collide(0, -1.6, 2, 3); k.collide(0, 1.6, 2, 3); },
  buggy(k, r, ac) { for (const [x, z] of [[-1, 1.2], [1, 1.2], [-1, -1.2], [1, -1.2]]) k.p('sphL', C.black, x, 0.5, z, 0.6, 1, 1); k.p('box', C.tan, 0, 0.8, 0, 1.6, 0.4, 3).p('box', ac, 0, 1.1, 1, 1.5, 0.3, 0.9).p('archL', C.steel, 0, 1, -0.3, 1.6, 1.6, 1.4).p('box', C.black, 0, 1.1, -0.2, 1.2, 0.2, 0.6).p('cyl8', C.steel, 0, 1.9, -0.9, 0.1, 1.3, 0.1, 1.2); k.collide(0, 0, 1.5, 1.6); },
  mantaTrailer(k) { k.p('box', C.steel, 0, 0.5, 0, 1.4, 0.14, 4).p('sphL', C.black, -0.9, 0.4, -0.8, 0.3, 0.8, 0.8).p('sphL', C.black, 0.9, 0.4, -0.8, 0.3, 0.8, 0.8).p('box', C.steel, 0, 0.4, 2.6, 0.12, 0.12, 1.4).p('sphL', 0x1f6f78, 0, 1, 0, 1.3, 0.6, 3.6).p('sphL', 0x23b8a8, 0, 1, 0.2, 3.6, 0.16, 1.8).p('sphL', 0x8fd0f5, 0, 1.25, 0.6, 0.8, 0.4, 1.2); k.collide(0, 0, 1.6, 1.6); },
  makoRack(k) { k.p('box', C.steel, 0, 0.6, 0, 2.6, 0.1, 1.2).p('box', C.steel, -1.2, 0.3, 0, 0.1, 0.6, 1.2).p('box', C.steel, 1.2, 0.3, 0, 0.1, 0.6, 1.2); for (let i = 0; i < 3; i++) k.p('sphL', 0x3a6f8a, -0.8 + i * 0.8, 0.9, 0, 0.5, 0.4, 1.8).p('cone6', C.red, -0.8 + i * 0.8, 0.9, 1, 0.3, 0.5, 0.3, Math.PI / 2).p('box', 0x3a6f8a, -0.8 + i * 0.8, 1.15, -0.5, 0.04, 0.3, 0.4); },
  tsunami(k, r, ac) { k.p('sphL', C.black, 0, 0.7, 0, 3.4, 1.4, 5).p('cyl8', C.steel, 0, 1.6, 0, 2.6, 0.8, 2.6).p('cyl8', 0x38404f, 0, 3.4, 2.4, 0.9, 7, 0.9, 1.0).p('cyl8', C.black, 0, 5.2, 5.2, 1.2, 1, 1.2, 1.0).p('torus', ac, 0, 2.4, 0.8, 1.3, 1.3, 2, 1.0).p('box', C.steel, 0, 0.3, -2.6, 0.5, 0.3, 3, 0.2); for (let i = 0; i < 3; i++) k.p('cyl8', C.gold, 2.4, 0.6, -1 + i * 0.9, 0.7, 1.6, 0.7, 0, 0, 0.1).p('cone6', C.black, 2.4, 1.7, -1 + i * 0.9, 0.7, 0.7, 0.7); k.collide(0, 0, 2.4, 3); },
  // boats (drawn at water level)
  skiff(k, r, ac) { k.p('sphL', 0x38404f, 0, 0.1, 0, 2, 0.9, 5).p('box', ac, 0, 0.5, 0, 1.5, 0.1, 3.6).p('box', C.black, 0, 0.75, -2.3, 0.5, 0.7, 0.4).p('box', C.wood, 0, 0.62, 0.3, 1.4, 0.08, 0.4); },
  schooner(k, r, ac) { k.p('sphL', C.woodD, 0, 0.6, 0, 4.6, 3, 17).p('box', C.wood, 0, 1.9, 0, 3.6, 0.2, 14).p('box', C.snow, 0, 2.6, -3, 2.4, 1.4, 3.4).p('cyl8', C.wood, 0, 7, 2.6, 0.3, 11, 0.3).p('cyl8', C.wood, 0, 6, -4, 0.26, 9, 0.26).p('box', C.snow, 0.1, 7, 2.6, 0.08, 7, 4.4).p('box', C.snow, 0.1, 6, -4, 0.08, 5.4, 3.6).p('box', ac, 0.6, 12, 2.6, 1.2, 0.7, 0.05).p('cone6', C.iceD, 0, 1.2, 9, 2, 3.4, 1.2, Math.PI / 2).p('cyl8', C.black, 0, 2.5, 5.4, 0.3, 2, 0.3, Math.PI / 2 - 0.2); k.collide(0, -4, 2.6, 5); k.collide(0, 0, 2.6, 5); k.collide(0, 4, 2.6, 5); },
  corvette(k, r, ac) { k.p('sphL', 0x8fa6bd, 0, 0.8, 0, 6, 4, 30).p('box', 0xbcd8ee, 0, 2.7, 0, 4.6, 0.3, 25).p('box', 0xe6eef7, 0, 4.2, -2, 3.4, 2.8, 8).p('box', C.glass, 0, 5, 2.02, 3, 0.7, 0.06).p('cyl8', C.steel, 0, 7.6, -3, 0.2, 5, 0.2).p('domeL', C.white, 0, 6, -5, 2, 1.6, 2).p('cyl8', 0xe6eef7, 0, 3.3, 8, 2.4, 1, 2.4).p('cyl8', 0x38404f, 0, 3.6, 10.4, 0.36, 4, 0.36, Math.PI / 2 - 0.1).p('box', ac, 0, 3, -11.5, 4.7, 0.5, 1.6).p('box', ac, 0.5, 9.6, -3, 1, 0.6, 0.05); for (let z = -10; z <= 10; z += 5) k.collide(0, z, 3.4, 6); },
  remora(k, r, ac) { k.p('sphL', C.black, 0, 0.5, 0, 3, 1.8, 10).p('sphL', C.white, 0, 0.1, 0.4, 2.6, 1.2, 8.6).p('cone', C.black, 0, 2.2, -1, 0.3, 2.4, 1.8, -0.3).p('cyl8', C.steel, 0, 1.5, 2.4, 1.3, 0.5, 1.3).p('cyl8', C.black, 0, 1.7, 3.6, 0.2, 2.2, 0.2, Math.PI / 2 - 0.1).p('torus', ac, 0, 1.3, 0, 2.6, 2.6, 1.5, Math.PI / 2); k.collide(0, -2, 1.8, 3); k.collide(0, 2, 1.8, 3); },
  longboat(k, r, ac) { k.p('sphL', C.rust, 0, 0.4, 0, 3.4, 2, 14).p('box', C.woodD, 0, 1.2, 0, 2.6, 0.14, 11).p('cone', C.white, 0, 2.6, 7, 0.6, 3.6, 0.6, 0.9).p('cyl8', C.woodD, 0, 4.6, 0, 0.24, 7, 0.24).p('box', ac, 0.06, 5.4, 0, 0.06, 4, 4.6).p('box', C.white, 0.1, 5.4, 0, 0.06, 4, 1.4); for (let i = -2; i <= 2; i++) k.p('cyl8', i % 2 ? C.gold : ac, 1.5, 1.2, i * 1.8, 1.1, 0.14, 1.1, 0, 0, Math.PI / 2).p('cyl8', i % 2 ? ac : C.gold, -1.5, 1.2, i * 1.8, 1.1, 0.14, 1.1, 0, 0, Math.PI / 2); k.collide(0, -3, 2, 3); k.collide(0, 3, 2, 3); },
  crane(k, r, ac) { k.p('box', C.steel, 0, 0.3, 0, 2.4, 0.6, 2.4).p('box', ac, 0, 4, 0, 0.7, 7, 0.7).p('box', ac, 0, 7.4, 2.6, 0.5, 0.5, 7.4).p('box', C.steel, 0, 7.4, -1.6, 1.2, 1.2, 1.6).p('cyl8', C.black, 0, 5, 5.8, 0.06, 4.6, 0.06).p('box', C.wood, 0, 2.3, 5.8, 1.1, 1, 1.1).p('box', C.glass, 0, 6.4, 0.5, 1.1, 1, 1); k.collide(0, 0, 1.4, 7); },
  beacon(k, r, ac) { for (let i = 0; i < 3; i++) k.p('cyl8', i % 2 ? C.white : ac, 0, 0.8 + i * 1.6, 0, 1.7 - i * 0.25, 1.6, 1.7 - i * 0.25); k.p('cyl8', C.glow, 0, 5.3, 0, 1, 1, 1).p('cone6', ac, 0, 6.2, 0, 1.5, 0.8, 1.5); k.collide(0, 0, 0.9, 6); },
  solar(k) { k.p('box', C.steel, 0, 0.6, 0, 0.14, 1.2, 0.14).p('box', 0x24406e, 0, 1.3, 0, 2.6, 0.08, 1.6, 0.6).p('box', C.white, 0, 1.3, 0, 2.7, 0.04, 1.7, 0.6); },
  mast(k) { k.p('cyl8', C.steel, 0, 6, 0, 0.16, 12, 0.16).p('sphL', C.red, 0, 12.2, 0, 0.4).p('box', C.steel, 0, 10, 0, 1.6, 0.06, 0.06).p('box', C.steel, 0, 8.6, 0, 0.06, 0.06, 1.2); for (let i = 0; i < 3; i++) k.p('cyl8', C.steel, Math.cos(i * 2.1) * 2, 4.5, Math.sin(i * 2.1) * 2, 0.03, 10, 0.03, Math.sin(i * 2.1) * 0.42, 0, -Math.cos(i * 2.1) * 0.42); },
  train(k, r, ac) { k.p('box', C.black, 0, 0.5, 0, 2.2, 0.5, 6).p('cyl8', ac, 0, 1.8, 0.8, 2, 3.8, 2, Math.PI / 2).p('box', ac, 0, 2.1, -2, 2.2, 2.8, 2).p('box', C.glow, 1.12, 2.5, -2, 0.04, 0.8, 1.2).p('cyl8', C.black, 0, 3.3, 2, 0.6, 1.2, 0.6).p('sphL', 0xeef1f5, 0.2, 4.6, 1.8, 1.2).p('sphL', 0xeef1f5, 0.7, 5.8, 1.4, 1.7).p('cone6', C.red, 0, 0.8, 3.4, 2.2, 1.2, 1, Math.PI / 2).p('box', C.snow, 0, 3.55, -2, 2.3, 0.14, 2.1); for (const z of [-7, -13]) k.p('box', C.black, 0, 0.5, z, 2.2, 0.5, 5).p('box', z < -8 ? C.teal : C.gold, 0, 1.7, z, 2.1, 2, 4.8).p('box', C.glow, 1.07, 2, z, 0.04, 0.7, 3.6).p('box', C.snow, 0, 2.76, z, 2.2, 0.14, 4.9); for (const z of [2, 0, -2, -6, -8, -12, -14]) k.p('cyl8', C.steel, -1.1, 0.4, z, 0.8, 0.14, 0.8, 0, 0, Math.PI / 2).p('cyl8', C.steel, 1.1, 0.4, z, 0.8, 0.14, 0.8, 0, 0, Math.PI / 2); for (const z of [0, -7, -13]) k.collide(0, z, 1.9, 3.4); },
};
const FPROPS = {
  penguins: ['fishRack', 'sled', 'snowballs', 'mailbox', 'bench', 'sculpture', 'mortar', 'dummy', 'slide', 'creche', 'drums', 'ammo', 'snowfence', 'dish', 'lamp', 'flagpole', 'signpost', 'icebricks', 'crates', 'solar'],
  seals: ['netRack', 'boat', 'pots', 'kelpLine', 'firepit', 'harpoons', 'anchor', 'barrels', 'lantern', 'cairn', 'drum', 'smoker', 'fishRack', 'crates', 'flagpole', 'bench', 'makoRack'],
  orcas: ['pool', 'obelisk', 'coralLamp', 'torpedoes', 'container', 'sonarDish', 'dronePad', 'kelpGarden', 'boneGate', 'crates', 'flagpole', 'coralLamp', 'drums'],
  walrus: ['brazier', 'tuskTotem', 'cannon', 'loot', 'spikes', 'banner', 'barrels', 'drum', 'crates', 'firepit'],
  albatross: ['perch', 'windsock', 'crateNet', 'eggNest', 'chimes', 'cairn', 'crates', 'eggNest'],
};
const HARDWARE = { penguins: ['icecrawler', 'rockhopper', 'mlrs'], seals: ['mantaTrailer', 'buggy'], orcas: ['tsunami'], walrus: ['cannon'], albatross: ['crateNet'] };
const BOATS = { penguins: ['skiff', 'schooner', 'corvette'], seals: ['skiff', 'skiff', 'schooner'], orcas: ['remora', 'remora', 'skiff'], walrus: ['longboat', 'longboat'], albatross: ['skiff'] };
const GROUND = { penguins: 0xcfe4f5, seals: 0xb9b3a6, orcas: 0x4a5266, walrus: 0x9a7a5e, albatross: 0xd8cfa8 };
const SMOKE = [0xdfe4ea, 0xeaeef2, 0xf4f6f9];

// one perimeter segment (about 6m wide), facing outward along local +z
function wallPiece(k, f, ac, r) {
  if (f === 'penguins') { k.p('box', C.ice, 0, 1.1, 0, 6.2, 2.2, 1.2).p('box', C.iceD, 0, 0.3, 0.05, 6.3, 0.6, 1.3); for (let i = -1; i <= 1; i++) k.p('box', C.snow, i * 2.1, 2.5, 0, 1.1, 0.6, 1.2); k.collide(-1.6, 0, 1.6, 2.6); k.collide(1.6, 0, 1.6, 2.6); }
  else if (f === 'seals') { for (let i = 0; i < 7; i++) k.p('cyl6', i % 2 ? C.wood : C.woodD, -2.7 + i * 0.9, 1.2 + (i % 3) * 0.2, 0, 0.6, 2.4 + (i % 3) * 0.4, 0.6).p('cone6', C.tan, -2.7 + i * 0.9, 2.6 + (i % 3) * 0.4, 0, 0.6, 0.5, 0.6); k.p('box', C.tan, 0, 1.4, 0.3, 6, 0.14, 0.1); k.collide(-1.6, 0, 1.5, 2.6); k.collide(1.6, 0, 1.5, 2.6); }
  else if (f === 'orcas') { k.p('taper6', C.black, -2.6, 1.3, 0, 1, 2.6, 1).p('taper6', C.black, 2.6, 1.3, 0, 1, 2.6, 1).p('sphL', C.white, -2.6, 2.7, 0, 0.7).p('sphL', C.white, 2.6, 2.7, 0, 0.7).p('box', ac, 0, 1.6, 0, 5, 0.14, 0.14).p('box', ac, 0, 0.8, 0, 5, 0.14, 0.14); k.collide(-2.6, 0, 0.7, 2.6); k.collide(2.6, 0, 0.7, 2.6); }
  else if (f === 'walrus') { for (let i = 0; i < 6; i++) k.p('cone6', C.woodD, -2.5 + i, 1.3, 0.3, 0.5, 3.2, 0.5, 0.5); k.p('box', C.rust, 0, 0.6, -0.4, 6, 1.2, 0.5); k.collide(-1.6, 0, 1.5, 2); k.collide(1.6, 0, 1.5, 2); }
  else { for (let i = 0; i < 5; i++) k.p('dod', i % 2 ? C.rock : C.stone, -2.4 + i * 1.2, 0.4, (i % 2) * 0.3, 1.3, 0.9, 1.1, 0, i); }
}
function gate(k, f, ac) {
  const post = f === 'orcas' ? C.black : f === 'penguins' ? C.ice : C.woodD;
  k.p('box', post, -4.6, 3, 0, 1.2, 6, 1.2).p('box', post, 4.6, 3, 0, 1.2, 6, 1.2).p('box', post, 0, 6.3, 0, 10.6, 0.7, 0.9).p('box', ac, 0, 5.2, 0.1, 5, 1.5, 0.08).p('sphL', C.glow, -4.6, 6.4, 0.7, 0.6).p('sphL', C.glow, 4.6, 6.4, 0.7, 0.6).p('cone4', ac, -4.6, 7.2, 0, 1.6, 1.2, 1.6, 0, 0.785).p('cone4', ac, 4.6, 7.2, 0, 1.6, 1.2, 1.6, 0, 0.785);
  k.collide(-4.6, 0, 0.9, 6); k.collide(4.6, 0, 0.9, 6);
}
const angNear = (a, list, tol) => list.some(b => { let d = Math.abs(a - b) % 6.2832; if (d > Math.PI) d = 6.2832 - d; return d < tol; });

export function buildLocation(loc, world) {
  const r = mulberry32(loc.px * 131 + loc.py * 7), k = new Kit(), kd = new Kit(), f = loc.f, ac = FACTIONS[f].color, R = loc.R, pick = a => a[Math.floor(r() * a.length)];
  const fort = /Fort|Garrison|Capital|Fleet|Beachhead|Base|Dock|Siege/.test(loc.kind), sa = loc.seaA, lm = loc.landmark;
  const ship = lm === 'dreadnought' || lm === 'leviathan', lat = lm === 'dreadnought' ? 40 : 34, sd = R * 1.9;
  const sea = { x: Math.sin(sa) * sd + Math.cos(sa) * lat, z: Math.cos(sa) * sd - Math.sin(sa) * lat, y: -loc.y - 1.5, a: sa };
  let mound = null; if (lm === 'volcano') { const M = FEATURES.MOUNDS[0], [mx, mz] = toWorld(M.px, M.py); mound = { x: mx - loc.x, z: mz - loc.z, y: world.h(mx, mz) - loc.y }; }
  const fixed = ship || lm === 'volcano', reserve = Math.min(26, R * 0.45);
  k.at(0, 0, 0, fixed ? 0 : r() * 6.283, () => LANDMARKS[lm](k, r, ac, sea, mound));
  const placed = [{ x: 0, z: 0, r: reserve }];
  const spot = (rad, tries = 30) => { for (let i = 0; i < tries; i++) { const a = r() * 6.283, lo = reserve + rad, hi = R - 3 - rad * 0.6; if (hi <= lo) return null; const d = lo + r() * (hi - lo), x = Math.cos(a) * d, z = Math.sin(a) * d; if (placed.every(p => Math.hypot(p.x - x, p.z - z) > p.r + rad)) { placed.push({ x, z, r: rad }); return { x, z, d, a: Math.atan2(-x, -z) + (r() - 0.5) * 0.6 }; } } return null; };
  const prop = (name, x, z, a) => kd.at(x, 0, z, a, () => P[name](kd, r, ac));
  // plaza under the landmark, ringed with lamps and bunting
  if (!ship) {
    const pr = Math.min(18, reserve - 2); kd.p('cyl', GROUND[f], 0, 0.05, 0, pr * 2, 0.1, pr * 2);
    const nl = 8, cs = [C.red, C.gold, C.teal, C.orange, C.purple];
    for (let i = 0; i < nl; i++) { const a = i / nl * 6.283, x = Math.cos(a) * (pr + 1.5), z = Math.sin(a) * (pr + 1.5), a2 = (i + 1) / nl * 6.283, x2 = Math.cos(a2) * (pr + 1.5), z2 = Math.sin(a2) * (pr + 1.5);
      kd.at(x, 0, z, -a - Math.PI / 2, () => P[f === 'seals' || f === 'walrus' ? 'lantern' : f === 'orcas' ? 'coralLamp' : 'lamp'](kd, r, ac));
      if (R > 50) { const L = Math.hypot(x2 - x, z2 - z), ba = Math.atan2(x2 - x, z2 - z); kd.at((x + x2) / 2, 3.5, (z + z2) / 2, ba, () => { kd.p('box', C.black, 0, 0, 0, 0.04, 0.04, L); for (let j = 0; j < 6; j++) kd.p('cone4', cs[(i + j) % 5], 0, -0.3, -L / 2 + (j + 0.5) * L / 6, 0.08, 0.6, 0.5, Math.PI); }); }
      kd.p('dod', C.stone, Math.cos(a + 0.39) * (pr + 0.4), 0.2, Math.sin(a + 0.39) * (pr + 0.4), 1, 0.5, 0.8, 0, a); }
    for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.5; prop('bench', Math.cos(a) * (pr - 2), Math.sin(a) * (pr - 2), -a - Math.PI / 2); }
  }
  // buildings (major mesh) dressed with paths, smoke, drifts and neighbours' clutter (detail mesh)
  const dress = (s, rad, smokeH) => {
    const len = s.d - rad - reserve + 3, a = Math.atan2(-s.x, -s.z), m = (s.d + rad * 0.2 + reserve - 3) / 2 / s.d;
    if (len > 1) kd.at(s.x * m, 0, s.z * m, a, () => kd.p('box', C.path, 0, 0.04, 0, 2.4, 0.08, len + rad * 0.8));
    for (let i = 0; i < 3; i++) { const b = s.a + Math.PI + (i - 1) * 0.9; kd.p('sphL', C.snow, s.x + Math.sin(b) * rad * 0.95, -0.1, s.z + Math.cos(b) * rad * 0.95, 3 + r() * 2, 1.2 + r(), 2.4 + r()); }
    if (smokeH) for (let i = 0; i < 4; i++) kd.p('sphL', SMOKE[i % 3], s.x + i * 0.5, smokeH + i * 1.3, s.z + i * 0.2, 0.8 + i * 0.45);
    for (let i = 0; i < 2; i++) { const b = s.a + (i ? 1 : -1) * (1.3 + r() * 0.6), d = rad + 2.4, x = s.x + Math.sin(b) * d, z = s.z + Math.cos(b) * d; if (Math.hypot(x, z) < R - 3 && placed.every(p => p === s.ref || Math.hypot(p.x - x, p.z - z) > p.r + 1.2)) { placed.push({ x, z, r: 1.6 }); prop(pick(FPROPS[f]), x, z, s.a + r() - 0.5); } }
  };
  const build = (f2, old) => {
    let s, t = r(); const go = (rad) => { s = spot(rad); if (s) s.ref = placed[placed.length - 1]; return s; };
    if (f2 === 'penguins') {
      if (t < 0.34) { if (go(5)) { const sc = 0.8 + r() * 0.6; igloo(k, s.x, s.z, sc, ac, s.a); dress(s, 4.4, sc * 3.6); } }
      else if (t < 0.48) { if (go(5)) { shop(k, s.x, s.z, ac, s.a, r); dress(s, 4.6, 0); } }
      else if (t < 0.64 && loc.size > 1) { if (go(6)) { pTower(k, s.x, s.z, 9 + r() * 10, ac, s.a); dress(s, 4, 0); } }
      else if (t < 0.76) { if (go(9)) { barracks(k, s.x, s.z, ac, s.a); dress(s, 8, 5.4); } }
      else if (t < 0.86) { if (go(6)) { greenhouse(k, s.x, s.z, ac); dress(s, 5, 0); } }
      else if (t < 0.93) { if (go(3)) { watchtower(k, s.x, s.z, 7 + r() * 3, ac, C.steel); dress(s, 2.4, 0); } }
      else if (go(8)) { hangar(k, s.x, s.z, ac, s.a); dress(s, 7, 0); }
    } else if (f2 === 'seals') {
      if (old) { if (t < 0.4) { if (go(7)) { lodge(k, s.x, s.z, C.kelp, s.a, true); dress(s, 6, 0); } } else if (t < 0.7) { if (go(5)) { roundhouse(k, s.x, s.z, C.kelp, 0.9); dress(s, 3.6, 0); } } else if (go(2)) menhir(k, s.x, s.z, 4 + r() * 4, r()); }
      else if (t < 0.34) { if (go(7)) { lodge(k, s.x, s.z, ac, s.a); dress(s, 6, 7); } }
      else if (t < 0.52) { if (go(4)) { tent(k, s.x, s.z, ac); dress(s, 3, 0); } }
      else if (t < 0.68) { if (go(5)) { roundhouse(k, s.x, s.z, ac, 0.8 + r() * 0.4); dress(s, 3.8, 6.4); } }
      else if (t < 0.8) { if (go(8)) { boathouse(k, s.x, s.z, ac, s.a); dress(s, 6.5, 0); } }
      else if (t < 0.9) { if (go(3)) { watchtower(k, s.x, s.z, 6 + r() * 3, ac); dress(s, 2.4, 0); } }
      else if (go(2)) menhir(k, s.x, s.z, 4 + r() * 3, r());
    } else if (f2 === 'orcas') {
      if (t < 0.36) { if (go(9)) { orcaHall(k, s.x, s.z, 0.8 + r() * 0.5, ac, s.a); dress(s, 7.5, 0); } }
      else if (t < 0.58) { if (go(6)) { poolDome(k, s.x, s.z, ac, 0.8 + r() * 0.4); dress(s, 5, 0); } }
      else if (t < 0.76) { if (go(4)) { spire(k, s.x, s.z, 12 + r() * 12, ac); dress(s, 2.8, 0); } }
      else if (go(3)) { pylon(k, s.x, s.z, 6 + r() * 9, ac); dress(s, 1.6, 0); }
    } else if (f2 === 'walrus') {
      if (t < 0.4) { if (go(7)) { bunker(k, s.x, s.z, ac, s.a); dress(s, 5.5, 0); } }
      else if (t < 0.7) { if (go(9)) { longhouse(k, s.x, s.z, ac, s.a); dress(s, 7.5, 9); } }
      else if (go(3)) { watchtower(k, s.x, s.z, 7 + r() * 3, ac, C.woodD); dress(s, 2.4, 0); }
    } else if (t < 0.7) { if (go(4)) { nest(k, s.x, s.z, 3 + r() * 8, ac); dress(s, 2.4, 0); } } else if (go(3)) { watchtower(k, s.x, s.z, 8, ac); dress(s, 2.4, 0); }
  };
  const n = Math.max(4, Math.round([0, 7, 13, 22][loc.size] * (R / loc.full) ** 2));
  for (let i = 0; i < n; i++) { const her = loc.heritage && i % 3 === 0; build(her ? loc.heritage : f, her && loc.heritage === 'seals'); }
  // main streets out to the road gates
  const dirs = loc.roadDirs || [];
  for (const a of dirs) kd.at(0, 0, 0, a, () => { const L = R - reserve + 4; kd.p('box', C.path, 0, 0.03, reserve - 3 + L / 2, 5, 0.07, L); for (let z = reserve + 4; z < R - 6; z += 13) for (const sx of [-3.6, 3.6]) kd.at(sx, 0, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2, () => P.lamp(kd)); kd.at(0, 0, R - 1, 0, () => gate(kd, f, ac)); });
  // parked hardware and kind-specific set dressing
  for (let i = 0; i < loc.size; i++) { const s = spot(4.5, 20); if (s) prop(pick(HARDWARE[f]), s.x, s.z, r() * 6.283); }
  if (/Research|Base|Station/.test(loc.kind)) { for (let i = 0; i < 5; i++) { const s = spot(2, 12); if (s) prop(i < 3 ? 'solar' : 'mast', s.x, s.z, 0.4); } }
  if (/Rail/.test(loc.kind)) { const s = spot(9, 60); if (s) { const a = Math.atan2(s.x, s.z) + Math.PI / 2; kd.at(s.x, 0, s.z, a, () => { kd.p('box', C.steel, -0.9, 0.12, -4, 0.16, 0.16, 34).p('box', C.steel, 0.9, 0.12, -4, 0.16, 0.16, 34); for (let z = -20; z < 13; z += 1.6) kd.p('box', C.woodD, 0, 0.05, z, 2.6, 0.1, 0.4); P.train(kd, r, ac); }); } }
  if (/Market|Trading|Capital|Town/.test(loc.kind)) for (let i = 0; i < 4; i++) { const s = spot(4.6, 12); if (s) shop(k, s.x, s.z, ac, s.a, r); }
  if (/Artillery|Fort|Garrison|Siege/.test(loc.kind)) for (let i = 0; i < 5; i++) { const s = spot(2.4, 12); if (s) prop(f === 'walrus' ? 'cannon' : f === 'penguins' ? 'mortar' : 'ammo', s.x, s.z, Math.atan2(s.x, s.z)); }
  if (/Rookery|Mystery/.test(loc.kind)) for (let i = 0; i < 8; i++) { const s = spot(1.8, 12); if (s) prop('eggNest', s.x, s.z, r() * 6); }
  // general clutter
  const np = Math.max(10, Math.round((12 + loc.size * 9) * (R / loc.full) ** 2));
  for (let i = 0; i < np; i++) { const s = spot(1.9, 12); if (s) prop(pick(FPROPS[f]), s.x, s.z, s.a + r() - 0.5); }
  for (let i = 0; i < 6 + loc.size * 3; i++) { const s = spot(1.4, 8); if (s) prop(i % 3 ? 'drift' : 'flagpole', s.x, s.z, r() * 6); }
  // perimeter: walls with towers for forts, scattered fences for villages; gaps at gates and the pier
  const open = dirs.concat(loc.mole ? [sa] : []), segs = Math.floor(6.283 * (R - 1) / 6.6), cover = fort ? 0.72 : 0.34;
  for (let i = 0; i < segs; i++) { const a = i / segs * 6.283; if (angNear(a, open, 7 / R + 0.05)) continue; const run = Math.sin(i * 0.9 + loc.px) * 0.5 + 0.5; if (!fort && run > cover * 1.6) continue; if (fort && r() > cover) continue;
    kd.at(Math.sin(a) * (R - 1), 0, Math.cos(a) * (R - 1), a, () => wallPiece(kd, f, ac, r));
    if (fort && i % Math.max(4, Math.round(segs / 7)) === 0) watchtower(k, Math.sin(a) * (R - 5), Math.cos(a) * (R - 5), 8, ac, f === 'penguins' ? C.steel : f === 'orcas' ? C.black : C.woodD); }
  // harbour: planked pier along the breakwater, moored boats, crane, beacon
  if (loc.mole) kd.at(0, 0, 0, sa, () => {
    const my = Math.min(loc.y, 2.8) - loc.y, L = loc.mole.len, wy = -loc.y, deck = f === 'orcas' ? [0x2a3046, 0x1c2030] : [C.wood, C.woodD];
    for (let z = R - 2; z < L - 4; z += 3.7) { const y = z < R + 10 ? (my * Math.max(0, (z - R + 2) / 12)) : my; kd.p('box', deck[Math.round(z) % 2], 0, y + 0.1, z, 6.4, 0.18, 3.6); if (Math.round(z / 3.7) % 2 === 0) for (const sx of [-3.5, 3.5]) kd.p('cyl8', C.black, sx, y + 0.6, z, 0.5, 1, 0.5).p('torus', C.tan, sx, y + 0.5, z, 0.6, 0.6, 2, Math.PI / 2); }
    for (let z = R + 14; z < L - 10; z += 20) kd.at(4.6, my, z, -Math.PI / 2, () => P.lamp(kd));
    kd.at(-6.5, my, R + (L - R) * 0.35, Math.PI / 2, () => P.crane(kd, r, ac)); kd.at(0, my, L - 3, 0, () => P.beacon(kd, r, ac));
    kd.at(5, my, R + (L - R) * 0.6, 0.3, () => P.crates(kd, r)); kd.at(-5, my, R + (L - R) * 0.75, 1, () => P[f === 'orcas' ? 'torpedoes' : 'barrels'](kd));
    const bl = BOATS[f]; let i = 0; for (let z = R + 22; z < L - 6; z += 26) { const side = i % 2 ? 1 : -1, b = bl[Math.min(i, bl.length - 1)], off = b === 'corvette' ? 30 : b === 'schooner' || b === 'longboat' ? 27 : 24; if (ship && side > 0) { i++; continue; } k.at(side * off, wy, z, r() < 0.5 ? 0 : Math.PI, () => P[b](k, r, ac)); i++; }
    for (let j = 0; j < 4; j++) k.p('cone6', C.red, (j % 2 ? 1 : -1) * 34, wy + 0.6, L + 6 + j * 9, 1.2, 1.8, 1.2).p('cyl8', C.white, (j % 2 ? 1 : -1) * 34, wy + 0.1, L + 6 + j * 9, 1.5, 0.5, 1.5);
  });
  // mission board
  const bs = spot(3, 80) || { x: reserve + 3, z: 0 }, bk = kd;
  bk.p('box', C.woodD, bs.x - 1.6, 1.5, bs.z, 0.3, 3, 0.3).p('box', C.woodD, bs.x + 1.6, 1.5, bs.z, 0.3, 3, 0.3).p('box', C.tan, bs.x, 2.3, bs.z, 3.6, 2, 0.2).p('box', ac, bs.x, 3.5, bs.z, 4, 0.4, 0.5).p('box', C.red, bs.x - 0.8, 2.5, bs.z + 0.12, 0.8, 1, 0.05).p('box', C.white, bs.x + 0.6, 2.2, bs.z + 0.12, 1, 1.2, 0.05).p('cone4', ac, bs.x, 4.1, bs.z, 4.4, 0.9, 1.4, 0, 0).p('sphL', C.glow, bs.x - 1.9, 3.3, bs.z + 0.4, 0.5).p('sphL', C.glow, bs.x + 1.9, 3.3, bs.z + 0.4, 0.5);
  kd.collide(bs.x, bs.z, 1.9, 4); loc.board = { x: loc.x + bs.x, z: loc.z + bs.z };
  for (const kit of [k, kd]) for (const c of kit.cols) world.addCollider(loc.x + c.x, loc.z + c.z, c.r, loc.y + c.top);
  const major = k.bake(), detail = kd.bake(); major.position.set(loc.x, loc.y, loc.z); detail.position.set(loc.x, loc.y, loc.z);
  return { major, detail };
}
