// Core runtime: renderer, characters, combat, bots, vehicles, camera.
import * as THREE from '../vendor/three.module.min.js';
import { World, X0, Z0 } from './world.js';
import { makeChar, setWeapon, makeVehicle } from './models.js';
import { FACTIONS, CLASSES, WEAPONS, SPECIALS, BOT_NAMES, clamp, lerp, pick } from './data.js';
import { audio } from './audio.js';

const V = () => new THREE.Vector3();
const _a = V(), _b = V(), _c = V(), _n = V(), _d = new THREE.Object3D(), _col = new THREE.Color(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
const angDiff = (a, b) => { let d = (a - b) % 6.2832; if (d > Math.PI) d -= 6.2832; if (d < -Math.PI) d += 6.2832; return d; };
const CLIMB = 0.95, BODY = { seals: 1.3, walrus: 1.45, orcas: 2.1 }; // steepest walkable grade; body scale per faction
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const PREF = { melee: 0, shotgun: 11, flame: 9, auto: 26, semi: 32, sniper: 75, launcher: 38 };
const VEH = { waddle: { max: 30, acc: 16, turn: 1.9, r: 1.3, cam: 7.5, resist: 0.8, seat: 0.75 }, gentoo: { max: 13, acc: 7, turn: 1.1, r: 2.6, cam: 11, resist: 0.3, seat: -9 }, manta: { max: 26, acc: 12, turn: 1.6, r: 1.8, cam: 8, resist: 0.7, seat: 0.5 } };

export class Game {
  constructor(canvas, input, ui, settings) {
    this.canvas = canvas; this.input = input; this.ui = ui; this.settings = settings; ui.game = this;
    const q = settings.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q > 0, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q > 1 ? 2 : q > 0 ? 1.5 : 1));
    this.renderer.shadowMap.enabled = q > 0; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(68, 1, 0.3, 5000); this.camera.rotation.order = 'YXZ';
    this.world = new World(this.scene, q);
    this.chars = []; this.projs = []; this.puffs = []; this.strikes = []; this.vehicles = []; this.time = 0; this.mode = null; this.player = null;
    this.camYaw = 0; this.camPitch = 0; this.shake = 0; this.aim = V(); this.nameIdx = Math.floor(Math.random() * BOT_NAMES.length);
    const mk = (n, mat) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 8, 6), mat, n); m.frustumCulled = false; m.count = 0; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); this.scene.add(m); return m; };
    this.projMesh = mk(260, new THREE.MeshBasicMaterial({ fog: false }));
    this.outMesh = mk(260, new THREE.MeshBasicMaterial({ color: 0x0f2a52, side: THREE.BackSide, fog: false })); this.trailMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.5, 1, 6, 1, true).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5f86b8, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }), 260); this.trailMesh.frustumCulled = false; this.trailMesh.count = 0; this.scene.add(this.trailMesh); this.ghosts = []; this.puffMesh = mk(420, new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.9 }));
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: 0xff3a4a })); this.ring.rotation.x = Math.PI / 2; this.ring.visible = false; this.scene.add(this.ring);
    this.zoneMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 160, 64, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })); this.zoneMesh.visible = false; this.scene.add(this.zoneMesh);
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 300, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, fog: false })); this.beacon.visible = false; this.scene.add(this.beacon);
    this.resize(); addEventListener('resize', () => this.resize());
    this.attractT = Math.random() * 100; this.vDir = V(); this.vPivot = V();
  }
  resize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  botName() { return BOT_NAMES[this.nameIdx++ % BOT_NAMES.length]; }

  // ---------- lifecycle ----------
  clear() {
    for (const c of this.chars) this.scene.remove(c.model.root); for (const v of this.vehicles) this.scene.remove(v.model.root);
    this.chars = []; this.vehicles = []; this.projs = []; this.ghosts = []; this.puffs = []; this.strikes = []; this.player = null; this.zoneMesh.visible = false; this.beacon.visible = false; this.ring.visible = false;
  }
  start(mode) { this.clear(); this.mode = mode; mode.game = this; this.time = 0; mode.start(); this.input.setEnabled(true); this.ui.showHud(true); }
  stop() { if (this.mode && this.mode.dispose) this.mode.dispose(); this.clear(); this.mode = null; this.input.setEnabled(false); this.ui.showHud(false); }
  hostile(a, b) { if (a === b) return false; return this.mode && this.mode.hostile ? this.mode.hostile(a, b) : a.team !== b.team; }

  // ---------- characters ----------
  spawn(o) {
    const F = FACTIONS[o.faction], def = CLASSES[o.faction].find(c => c.id === o.cls) || pick(CLASSES[o.faction]);
    const model = makeChar(o.faction, def.id), m = model.metrics, sc = BODY[o.faction] || 1, wet = o.faction === 'orcas';
    if (wet && this.world.h(o.x, o.z) > -1) { const wp = this.world.waterPointNear(o.x, o.z); if (wp) { o.x = wp.x; o.z = wp.z; } }
    model.root.scale.setScalar(sc);
    const c = { faction: o.faction, cls: def, team: o.team ?? o.faction, name: o.name || this.botName(), isPlayer: !!o.isPlayer, pos: V().set(o.x, 0, o.z), vel: V(), yaw: o.yaw || Math.random() * 6.28, pitch: 0,
      maxHp: Math.round(F.hp * def.hp), h: m.h * sc, r: m.r * sc, sc, waterOnly: wet, model, weapons: def.w.map(id => ({ id, def: WEAPONS[id], ammo: WEAPONS[id].mag })), cur: 0, cd: 0, reload: 0, specialCd: 3, alive: true, deadT: 0,
      dmgMul: 1, accMul: 1, resist: 1, floorHp: 0, onGround: true, swim: false, sliding: false, lastHit: -99, lastShot: -99, recoil: 0, swing: 0, flash: 0, inv: 0, dash: 0, vehicle: null, kills: 0, tag: o.tag || null,
      landSp: 6.4 * F.land * def.speed, swimSp: 5 * F.swim * def.speed };
    c.hp = c.maxHp; c.pos.y = this.world.ground(o.x, o.z);
    if (!c.isPlayer) c.ai = { think: Math.random() * 0.3, target: null, forced: null, los: false, react: 0, goal: null, idle: Math.random() * 2, home: o.home || { x: o.x, z: o.z, r: 30 }, strafe: 0, strafeT: 0, burst: 3, pause: 0, errY: 0, errP: 0, sight: 70, stuckT: 0, lastX: o.x, lastZ: o.z, passive: !!o.passive, pref: 30 };
    setWeapon(model, c.weapons[0].id); if (c.ai) this.botLoadout(c);
    this.scene.add(model.root); this.chars.push(c); this.animate(c, 0);
    return c;
  }
  botLoadout(c) { const w = c.weapons[c.cur].def; c.ai.pref = PREF[w.type] * (0.8 + Math.random() * 0.4); c.ai.sight = w.type === 'sniper' ? 130 : 75; }
  remove(c) { const i = this.chars.indexOf(c); if (i >= 0) this.chars.splice(i, 1); this.scene.remove(c.model.root); }
  eye(c, out) { return out.set(c.pos.x, c.pos.y + c.h * 0.78, c.pos.z); }
  switchWeapon(c, i) { if (i === c.cur || !c.weapons[i]) return; c.cur = i; c.reload = 0; c.cd = Math.max(c.cd, 0.3); setWeapon(c.model, c.weapons[i].id); if (c.ai) this.botLoadout(c); }
  startReload(c) { const s = c.weapons[c.cur]; if (c.reload > 0 || s.def.type === 'melee' || s.ammo >= s.def.mag) return; c.reload = s.def.reload; }

  move(c, dt, mx, mz, sprint, jump) {
    const w = this.world; let h = w.h(c.pos.x, c.pos.z);
    if (c.waterOnly) { if (h < -0.7) { c.wetX = c.pos.x; c.wetZ = c.pos.z; } else if (h > -0.3 && c.wetX != null) { c.pos.x = c.wetX; c.pos.z = c.wetZ; h = w.h(c.pos.x, c.pos.z); c.vel.set(0, 0, 0); } } // shoved ashore: slip back
    c.swim = h < -0.6 && c.pos.y < 0.2;
    let sp = c.swim ? c.swimSp * (sprint ? 1.4 : 1) : c.landSp * (sprint ? (c.faction === 'penguins' ? 1.75 : 1.5) : 1);
    const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
    c.sliding = sprint && !c.swim && l > 0.3 && c.faction === 'penguins';
    if (c.dash > 0) { c.dash -= dt; sp = 24; mx = Math.sin(c.yaw); mz = Math.cos(c.yaw); }
    const k = Math.min(1, dt * (c.swim ? 4 : c.sliding ? 3.5 : 10));
    c.vel.x += (mx * sp - c.vel.x) * k; c.vel.z += (mz * sp - c.vel.z) * k;
    const ox = c.pos.x, oz = c.pos.z; let sx = c.vel.x * dt, sz = c.vel.z * dt;
    if (!c.swim && c.onGround && (sx || sz)) { // grades: slow the uphill part of the step, refuse it past CLIMB
      w.normal(ox + sx, oz + sz, _n); const gl = Math.hypot(_n.x, _n.z), slope = gl / Math.max(_n.y, 0.01);
      if (slope > 0.1) { const ux = -_n.x / gl, uz = -_n.z / gl, up = sx * ux + sz * uz;
        if (up > 0) { const f = slope > CLIMB ? 0 : clamp(1.12 - slope, 0.28, 1); sx -= ux * up * (1 - f); sz -= uz * up * (1 - f); if (f < 0.6) { c.vel.x *= 0.9; c.vel.z *= 0.9; } }
        else if (c.sliding) { const bo = Math.min(0.3, slope * 0.45); sx *= 1 + bo; sz *= 1 + bo; } }
    }
    c.pos.x = ox + sx; c.pos.z = oz + sz;
    if (c.waterOnly) { const ok = (x, z) => { const nh = w.h(x, z); return nh < -0.55 || nh < h - 0.01; }; if (!ok(c.pos.x, c.pos.z)) { if (ok(c.pos.x, oz)) c.pos.z = oz; else if (ok(ox, c.pos.z)) c.pos.x = ox; else { c.pos.x = ox; c.pos.z = oz; } c.vel.x *= 0.6; c.vel.z *= 0.6; } }
    w.collide(c.pos, Math.min(c.r * 0.8, 1.1));
    c.pos.x = clamp(c.pos.x, X0 + 25, -X0 - 25); c.pos.z = clamp(c.pos.z, Z0 + 25, -Z0 - 25);
    const b = this.mode && this.mode.bounds; if (b) { const dx = c.pos.x - b.x, dz = c.pos.z - b.z, d = Math.hypot(dx, dz); if (d > b.r) { c.pos.x = b.x + dx / d * b.r; c.pos.z = b.z + dz / d * b.r; } }
    const g = w.ground(c.pos.x, c.pos.z);
    if (jump && c.onGround && !c.swim) { c.vel.y = 7.5; c.onGround = false; }
    if (!c.onGround) { c.vel.y -= 20 * dt; c.pos.y += c.vel.y * dt; if (c.pos.y <= g) { c.pos.y = g; c.onGround = true; c.vel.y = 0; } }
    else if (c.pos.y - g > 0.6) { c.onGround = false; c.vel.y = 0; } else c.pos.y = g;
  }

  // ---------- combat ----------
  muzzle(c, out) { const s = Math.sin(c.yaw), co = Math.cos(c.yaw); const k = c.sc; return out.set(c.pos.x + (s * 0.9 - co * 0.25) * k, c.pos.y + c.h * 0.58, c.pos.z + (co * 0.9 + s * 0.25) * k); }
  ballistic(from, to, speed, g, out) { // launch direction that lands on `to`
    const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz) || 0.01, dy = to.y - from.y, v2 = speed * speed, disc = v2 * v2 - g * (g * d * d + 2 * dy * v2);
    const th = disc < 0 ? Math.PI / 4 : Math.atan((v2 - Math.sqrt(disc)) / (g * d)); return out.set(dx / d * Math.cos(th), Math.sin(th), dz / d * Math.cos(th));
  }
  fire(c, aimPoint, spreadMul = 1) {
    const slot = c.weapons[c.cur], w = slot.def; if (c.cd > 0 || c.reload > 0 || !c.alive) return false;
    const dist = this.player ? c.pos.distanceTo(this.player.pos) : 999;
    if (w.type === 'melee') {
      c.cd = 1 / w.rate; c.swing = 0.28; audio.shot('melee', dist);
      for (const o of this.chars) { if (!o.alive || !this.hostile(c, o)) continue; const dx = o.pos.x - c.pos.x, dz = o.pos.z - c.pos.z, d = Math.hypot(dx, dz); if (d < w.range + o.r && (dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw)) / (d || 1) > 0.25 && Math.abs(o.pos.y - c.pos.y) < 2.5) { this.damage(o, w.dmg, c); this.puff(o.pos.x, o.pos.y + o.h * 0.6, o.pos.z, 5, 0xffffff, 2); } }
      return true;
    }
    if (slot.ammo <= 0) { this.startReload(c); return false; }
    slot.ammo--; c.cd = 1 / w.rate; c.recoil = 1; c.lastShot = this.time;
    const m = this.muzzle(c, _a), g = w.type === 'launcher' ? 16 : w.type === 'flame' ? 4 : 0;
    const dir = g > 10 ? this.ballistic(m, aimPoint, w.speed, g, _b) : _b.copy(aimPoint).sub(m).normalize();
    for (let i = 0; i < (w.pellets || 1); i++) {
      const s = w.spread * spreadMul; _c.set(dir.x + (Math.random() - 0.5) * 2 * s, dir.y + (Math.random() - 0.5) * 2 * s, dir.z + (Math.random() - 0.5) * 2 * s).normalize();
      this.shoot(m, _c, w.speed, g, w.dmg, c, w.range / w.speed, w.blast || 0, w.col, w.type === 'launcher' ? 0.34 : w.type === 'flame' ? 0.3 : w.type === 'sniper' ? 0.12 : 0.17, w.type === 'flame');
    }
    audio.shot(w.type, dist); if (slot.ammo <= 0) this.startReload(c);
    return true;
  }
  shoot(from, dir, speed, g, dmg, owner, life, blast, col, size, flame) { if (this.projs.length < 255) this.projs.push({ p: from.clone(), v: dir.clone().multiplyScalar(speed), g, dmg, owner, life, blast, col, size, flame }); }
  damage(victim, amt, attacker, how) {
    if (!victim.alive || victim.inv > 0) return;
    if (attacker) amt *= attacker.dmgMul; amt *= victim.resist; if (victim.vehicle) amt *= VEH[victim.vehicle.type].resist;
    if (this.mode.filterDamage) amt = this.mode.filterDamage(victim, amt, attacker, how);
    if (amt <= 0) return;
    victim.hp -= amt; victim.lastHit = this.time; victim.flash = 1; victim.lastAttacker = attacker;
    if (victim.isPlayer) { this.ui.hurt(attacker, victim); audio.hurt(); this.shake = Math.max(this.shake, 0.25); }
    if (attacker && attacker.isPlayer && victim !== attacker) { this.ui.hitmarker(victim.hp <= Math.max(0, victim.floorHp)); audio.hit(); }
    if (victim.ai && attacker && attacker.alive && !victim.ai.forced && this.hostile(victim, attacker) && (!victim.ai.target || Math.random() < 0.4)) { victim.ai.target = attacker; victim.ai.memory = 4; victim.ai.passive = false; }
    if (victim.hp <= victim.floorHp) { if (victim.floorHp > 0) { victim.hp = victim.floorHp; return; } if (this.mode.vetoDeath && this.mode.vetoDeath(victim, attacker, how)) return; this.kill(victim, attacker, how); }
  }
  kill(victim, killer, how) {
    if (!victim.alive) return; victim.alive = false; victim.hp = 0; victim.deadT = 0;
    if (victim.vehicle) this.exitVehicle(victim);
    this.puff(victim.pos.x, victim.pos.y + victim.h * 0.5, victim.pos.z, 12, 0xffffff, 3.5);
    if (killer) killer.kills++;
    this.ui.feed(killer, victim, how);
    if (killer && killer.isPlayer) audio.kill();
    this.mode.onKill && this.mode.onKill(victim, killer, how);
  }
  explode(pos, radius, dmg, owner) {
    const pd = this.player ? pos.distanceTo(this.player.pos) : 999; audio.explode(pd); if (pd < 40) this.shake = Math.max(this.shake, 0.7 * (1 - pd / 40));
    this.puff(pos.x, pos.y + 0.5, pos.z, 18, 0xffffff, radius * 1.1, radius * 0.5); this.puff(pos.x, pos.y + 0.6, pos.z, 6, 0xbfe6ff, radius * 0.6, radius * 0.7);
    for (const o of this.chars) { if (!o.alive) continue; if (owner && o !== owner && !this.hostile(owner, o)) continue; const d = o.pos.distanceTo(pos); if (d < radius + o.r) this.damage(o, dmg * (1 - 0.65 * clamp(d / radius, 0, 1)) * (o === owner ? 0.35 : 1), owner, 'blast'); }
  }
  puff(x, y, z, n, col, spread = 2, size = 0.5) { for (let i = 0; i < n && this.puffs.length < 410; i++) this.puffs.push({ x, y, z, vx: (Math.random() - 0.5) * spread * 2, vy: Math.random() * spread * 1.2, vz: (Math.random() - 0.5) * spread * 2, life: 0, max: 0.4 + Math.random() * 0.5, size: size * (0.6 + Math.random() * 0.8), col }); }
  callStrike(pos, owner, n = 6, r = 9, delay = 1.8, dmg = 75) { this.strikes.push({ x: pos.x, y: pos.y, z: pos.z, owner, n, r, t: delay, gap: 0, dmg }); }
  useSpecial(c, aimPoint) {
    if (c.specialCd > 0 || !c.alive) return false; const sp = c.cls.special; c.specialCd = SPECIALS[sp].cd;
    if (sp === 'grenade') { const m = this.muzzle(c, _a); this.ballistic(m, aimPoint, 24, 16, _b); this.shoot(m, _b, 24, 16, 80, c, 4, 6.5, 0xffffff, 0.4); }
    else if (sp === 'strike') { this.callStrike(aimPoint, c); if (c.isPlayer) this.ui.toast(`${c.cls.strike} inbound!`); }
    else if (sp === 'heal') { c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.5); this.puff(c.pos.x, c.pos.y + 1, c.pos.z, 10, 0x5cf2a8, 2, 0.4); for (const o of this.chars) if (o.alive && o !== c && !this.hostile(c, o) && o.pos.distanceTo(c.pos) < 10) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.3); }
    else if (sp === 'dash') { c.dash = 0.32; this.puff(c.pos.x, c.pos.y + 0.3, c.pos.z, 8, 0xffffff, 2, 0.5); }
    if (c.isPlayer) audio.ui();
    return true;
  }

  // ---------- bots ----------
  botThink(c) {
    const ai = c.ai; ai.memory = (ai.memory || 0) - 0.25;
    let best = null, los = false;
    if (ai.forced && ai.forced.alive) { best = ai.forced; los = this.world.los(this.eye(c, _a), this.eye(best, _b)); }
    else if (!ai.passive) {
      let bd = ai.sight;
      for (const o of this.chars) { if (!o.alive || !this.hostile(c, o)) continue; let d = Math.hypot(o.pos.x - c.pos.x, o.pos.z - c.pos.z); if (o === ai.target) d *= 0.7; if (d < bd) { bd = d; best = o; } }
      if (best) { los = this.world.los(this.eye(c, _a), this.eye(best, _b)); if (!los && bd > 28 && !(best === ai.target && ai.memory > 0)) best = null; else if (los) ai.memory = 3; }
    }
    if (best !== ai.target && best) ai.react = 0.25 + Math.random() * 0.5;
    ai.target = best; ai.los = los;
    if (best) {
      const d = c.pos.distanceTo(best.pos), tv = Math.hypot(best.vel.x, best.vel.z), e = 0.03 * c.accMul * (best.isPlayer ? this.mode.playerEvade || 1 : 1) * (1 + tv * 0.07) * (1 + d / 90);
      ai.errY = lerp(ai.errY, (Math.random() + Math.random() - 1) * e * 2, 0.6); ai.errP = lerp(ai.errP, (Math.random() + Math.random() - 1) * e, 0.6);
      const mi = c.weapons.findIndex(w => w.def.type === 'melee'), pi = c.weapons.findIndex(w => w.def.type !== 'melee');
      if (mi >= 0 && pi >= 0) this.switchWeapon(c, d < 3.2 ? mi : pi);
      else if (c.weapons[1] && c.weapons[c.cur].def.type === 'sniper' && d < 14) this.switchWeapon(c, 1); else if (c.cur === 1 && c.weapons[0].def.type === 'sniper' && d > 30) this.switchWeapon(c, 0);
      if (c.specialCd <= 0 && Math.random() < 0.06) { const sp = c.cls.special; if (sp === 'heal' ? c.hp < c.maxHp * 0.45 : sp === 'dash' ? d > ai.pref * 1.5 : sp === 'grenade' ? (d > 10 && d < 34 && los) : (d > 25 && los && !ai.noStrike)) this.useSpecial(c, best.pos); }
    } else if (c.specialCd <= 0 && c.cls.special === 'heal' && c.hp < c.maxHp * 0.5) this.useSpecial(c, c.pos);
    // stuck detection
    const moved = Math.hypot(c.pos.x - ai.lastX, c.pos.z - ai.lastZ); ai.lastX = c.pos.x; ai.lastZ = c.pos.z;
    if (ai.wantMove && moved < 0.25) { ai.stuckT += 1; if (ai.stuckT > 3) { ai.detour = { a: Math.random() * 6.28, t: 0.8 + Math.random() }; ai.stuckT = 0; } } else ai.stuckT = 0;
  }
  updateBot(c, dt) {
    const ai = c.ai; ai.think -= dt; if (ai.think <= 0) { ai.think = 0.2 + Math.random() * 0.1; this.botThink(c); }
    ai.react -= dt; ai.pause -= dt;
    let mx = 0, mz = 0, sprint = false, jump = false; const t = ai.target;
    if (t && t.alive) {
      const dx = t.pos.x - c.pos.x, dz = t.pos.z - c.pos.z, d = Math.hypot(dx, dz) || 1, w = c.weapons[c.cur].def;
      const lead = w.speed ? Math.min(d / w.speed, 0.6) * 0.8 : 0, tx = t.pos.x + t.vel.x * lead, tz = t.pos.z + t.vel.z * lead, ty = t.pos.y + t.h * 0.55;
      const yaw = Math.atan2(tx - c.pos.x, tz - c.pos.z); c.yaw += clamp(angDiff(yaw, c.yaw), -7 * dt, 7 * dt);
      c.pitch = Math.atan2(ty - (c.pos.y + c.h * 0.6), d);
      const f = !ai.los ? 1 : d > ai.pref * 1.15 ? 1 : d < ai.pref * 0.5 ? -0.8 : 0;
      ai.strafeT -= dt; if (ai.strafeT <= 0) { ai.strafeT = 0.5 + Math.random() * 1.6; ai.strafe = pick([-1, 0, 1, 1, -1]); if (Math.random() < 0.12) jump = true; }
      mx = dx / d * f - dz / d * ai.strafe * 0.75; mz = dz / d * f + dx / d * ai.strafe * 0.75;
      sprint = d > ai.pref * 2.2 || (w.type === 'melee' && d > 3) || !!ai.forced && d > ai.pref;
      if (ai.los && ai.react <= 0 && ai.pause <= 0 && c.cd <= 0 && c.reload <= 0 && d < (w.type === 'melee' ? w.range + t.r : w.range) && Math.abs(angDiff(yaw, c.yaw)) < 0.3) {
        const ey = yaw + ai.errY, ep = c.pitch + ai.errP, dd = Math.hypot(d, ty - c.pos.y);
        this.muzzle(c, _n); _n.set(_n.x + Math.sin(ey) * Math.cos(ep) * dd, w.type === 'launcher' ? t.pos.y + 0.2 : _n.y + Math.sin(ep) * dd, _n.z + Math.cos(ey) * Math.cos(ep) * dd);
        if (this.fire(c, _n) && --ai.burst <= 0) { ai.burst = w.type === 'auto' || w.type === 'flame' ? 4 + Math.floor(Math.random() * 7) : w.type === 'semi' ? 1 + Math.floor(Math.random() * 3) : 1; ai.pause = 0.25 + Math.random() * 0.7; }
      }
    } else {
      c.pitch *= 0.9; ai.idle -= dt;
      if (!ai.goal && ai.idle <= 0) { ai.goal = (this.mode.botGoal && this.mode.botGoal(c)) || this.world.landPointNear(ai.home.x, ai.home.z, 2, ai.home.r); if (c.waterOnly && this.world.h(ai.goal.x, ai.goal.z) > -1) { ai.goal = this.world.waterPointNear(ai.goal.x, ai.goal.z, 160); if (!ai.goal) ai.idle = 2; } }
      if (ai.goal) {
        const dx = ai.goal.x - c.pos.x, dz = ai.goal.z - c.pos.z, d = Math.hypot(dx, dz);
        if (d < 3) { ai.goal = null; ai.idle = ai.rush ? 0 : Math.random() * 3; }
        else { mx = dx / d; mz = dz / d; sprint = d > 45 || !!ai.rush; c.yaw += clamp(angDiff(Math.atan2(dx, dz), c.yaw), -5 * dt, 5 * dt); }
      } else c.yaw += Math.sin(this.time * 0.7 + c.model.phase) * dt * 0.4;
      const s = c.weapons[c.cur]; if (s.ammo < s.def.mag * 0.4) this.startReload(c);
    }
    if (ai.detour) { ai.detour.t -= dt; mx = Math.sin(ai.detour.a); mz = Math.cos(ai.detour.a); if (ai.detour.t <= 0) ai.detour = null; }
    ai.wantMove = Math.hypot(mx, mz) > 0.3;
    this.move(c, dt, mx, mz, sprint, jump);
  }

  // ---------- vehicles ----------
  spawnVehicle(type, x, z, yaw = 0) { const model = makeVehicle(type), v = { type, pos: V().set(x, this.world.ground(x, z), z), yaw, speed: 0, model, driver: null, cd: 0 }; this.scene.add(model.root); this.vehicles.push(v); this.placeVehicle(v); return v; }
  placeVehicle(v) {
    const w = this.world; v.pos.y = v.type === 'manta' ? Math.max(w.h(v.pos.x, v.pos.z), -0.35) : w.ground(v.pos.x, v.pos.z);
    w.normal(v.pos.x, v.pos.z, _n); if (v.pos.y <= -0.3) _n.set(0, 1, 0);
    _q.setFromAxisAngle(UP, v.yaw); _q2.setFromUnitVectors(UP, _n); v.model.root.quaternion.copy(_q2).multiply(_q); v.model.root.position.copy(v.pos);
  }
  enterVehicle(c, v) { c.vehicle = v; v.driver = c; c.vel.set(0, 0, 0); }
  exitVehicle(c) { const v = c.vehicle; if (!v) return; v.driver = null; v.speed = 0; c.vehicle = null; c.pos.x += Math.cos(v.yaw) * 2.6; c.pos.z -= Math.sin(v.yaw) * 2.6; c.pos.y = this.world.ground(c.pos.x, c.pos.z); c.model.root.visible = true; }
  driveVehicle(v, dt, thr, steer) {
    const s = VEH[v.type], w = this.world, h = w.h(v.pos.x, v.pos.z), wet = h < -0.6;
    let max = s.max; if (v.type === 'manta' ? !wet : wet) max = v.type === 'manta' ? 2 : 4;
    const target = thr * (thr < 0 ? max * 0.4 : max); v.speed += clamp(target - v.speed, -s.acc * 2 * dt, s.acc * dt);
    if (Math.abs(v.speed) > max) v.speed *= 0.94;
    v.yaw -= steer * s.turn * dt * clamp(v.speed / 6, -1, 1);
    const ox = v.pos.x, oz = v.pos.z; v.pos.x += Math.sin(v.yaw) * v.speed * dt; v.pos.z += Math.cos(v.yaw) * v.speed * dt;
    if (v.type !== 'manta') { const nh = w.h(v.pos.x, v.pos.z); if (nh > h + 0.001 && nh > 0) { const sl = w.slope(v.pos.x, v.pos.z); if (sl > 0.72) { v.pos.x = ox; v.pos.z = oz; v.speed *= 0.6; } else if (sl > 0.15) { const f = clamp(1.15 - sl * 1.25, 0.25, 1); v.pos.x = ox + (v.pos.x - ox) * f; v.pos.z = oz + (v.pos.z - oz) * f; if (f < 0.7) v.speed *= 0.985; } } }
    if (w.collide(v.pos, s.r)) v.speed *= 0.9;
    v.pos.x = clamp(v.pos.x, X0 + 25, -X0 - 25); v.pos.z = clamp(v.pos.z, Z0 + 25, -Z0 - 25);
    if (v.type === 'manta' && w.h(v.pos.x, v.pos.z) > 0.6) { v.pos.x = ox; v.pos.z = oz; v.speed = 0; }
    this.placeVehicle(v); v.cd -= dt;
    if (Math.abs(v.speed) > 8) { for (const o of this.chars) if (o.alive && o !== v.driver && this.hostile(v.driver, o) && Math.hypot(o.pos.x - v.pos.x, o.pos.z - v.pos.z) < s.r + o.r + 0.3 && this.time - (o.ranOver || -9) > 0.8) { o.ranOver = this.time; this.damage(o, 45 + Math.abs(v.speed) * 2.5, v.driver, 'roadkill'); } if (Math.random() < 0.5) this.puff(v.pos.x - Math.sin(v.yaw) * 1.5, v.pos.y + 0.2, v.pos.z - Math.cos(v.yaw) * 1.5, 1, 0xffffff, 1.5, 0.7); }
  }

  // ---------- player ----------
  updatePlayer(dt) {
    const p = this.player, inp = this.input, w = this.world; inp.update();
    this.camYaw -= inp.lookX; this.camPitch = clamp(this.camPitch - inp.lookY * (this.settings.invertY ? -1 : 1), -1.15, 1.2); inp.lookX = inp.lookY = 0;
    if (inp.take('pause')) this.ui.pause(); if (inp.take('map')) this.ui.toggleMap();
    const slot = p.weapons[p.cur], wd = slot.def, v = p.vehicle;
    const ads = inp.ads && p.alive && !v, cp = Math.cos(this.camPitch), dir = this.vDir.set(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp);
    if (p.alive) {
      // gentle aim assist for touch
      if (inp.touch && !v) { let best = null, ba = 0.14; for (const o of this.chars) { if (!o.alive || !this.hostile(p, o)) continue; const d = p.pos.distanceTo(o.pos); if (d > wd.range || d < 2) continue; const a = Math.abs(angDiff(Math.atan2(o.pos.x - p.pos.x, o.pos.z - p.pos.z), this.camYaw)); if (a < ba) { ba = a; best = o; } } if (best) { const d = Math.hypot(best.pos.x - p.pos.x, best.pos.z - p.pos.z); this.camYaw += angDiff(Math.atan2(best.pos.x - p.pos.x, best.pos.z - p.pos.z), this.camYaw) * Math.min(1, dt * 4); this.camPitch += (Math.atan2(best.pos.y + best.h * 0.5 - p.pos.y - p.h * 0.9, d) + 0.06 - this.camPitch) * Math.min(1, dt * 2.5); } }
      if (v) {
        this.driveVehicle(v, dt, inp.mz, inp.mx); p.pos.copy(v.pos); p.yaw = v.yaw; p.vel.set(Math.sin(v.yaw) * v.speed, 0, Math.cos(v.yaw) * v.speed);
        if (v.model.turret) { v.model.turret.rotation.y = this.camYaw - v.yaw; if (inp.fire && v.cd <= 0) { v.cd = 1.7; _b.set(v.pos.x + Math.sin(this.camYaw) * 4, v.pos.y + 2.1, v.pos.z + Math.cos(this.camYaw) * 4); this.ballistic(_b, this.aim, 95, 9, _c); this.shoot(_b, _c, 95, 9, 120, p, 4, 8, 0xffffff, 0.6); audio.shot('launcher', 0); this.shake = 0.4; } }
        if (inp.take('use')) this.exitVehicle(p);
      } else {
        const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
        this.move(p, dt, fx * inp.mz - fz * inp.mx, fz * inp.mz + fx * inp.mx, inp.sprint && !ads && inp.mz > 0, inp.take('jump'));
        const firing = inp.fire || ads || this.time - p.lastShot < 0.5, moving = Math.hypot(p.vel.x, p.vel.z) > 1;
        if (firing || !moving) p.yaw += angDiff(this.camYaw, p.yaw) * Math.min(1, dt * (firing ? 25 : 6)); else p.yaw += angDiff(Math.atan2(p.vel.x, p.vel.z), p.yaw) * Math.min(1, dt * 10);
        p.pitch = this.camPitch;
        if (inp.take('swap')) this.switchWeapon(p, (p.cur + 1) % p.weapons.length); if (inp.take('w1')) this.switchWeapon(p, 0); if (inp.take('w2')) this.switchWeapon(p, 1);
        if (inp.take('reload')) this.startReload(p);
        if (inp.fire) { if (Math.abs(angDiff(this.camYaw, p.yaw)) < 0.5) this.fire(p, this.aim, ads ? 0.4 : 1); }
        if (inp.take('special')) this.useSpecial(p, this.aim);
        if (inp.take('use')) { const nv = this.vehicles.find(x => !x.driver && x.pos.distanceTo(p.pos) < 4.5); if (nv && !p.waterOnly) this.enterVehicle(p, nv); else this.mode.onUse && this.mode.onUse(); }
      }
      inp.take('jump');
    } else { this.camYaw += dt * 0.3; inp.edges = {}; }
    // camera
    const big = Math.max(1, p.h / 1.7), vs = v ? VEH[v.type] : null, dist = (v ? vs.cam : ads ? (wd.type === 'sniper' ? 1.4 : 2.6) : 5.4) * (v ? 1 : 0.5 + 0.5 * big), fov = ads ? (wd.type === 'sniper' ? 24 : 48) : p.sliding ? 76 : 68;
    if (Math.abs(this.camera.fov - fov) > 0.1) { this.camera.fov = lerp(this.camera.fov, fov, Math.min(1, dt * 10)); this.camera.updateProjectionMatrix(); }
    const pivot = this.vPivot.set(p.pos.x, p.pos.y + (v ? 2.2 : p.h * 0.95), p.pos.z), rx = -Math.cos(this.camYaw), rz = Math.sin(this.camYaw), sh = (v ? 0 : ads ? 0.55 : 0.85) * Math.sqrt(big);
    let D = dist; for (let s = 0.25; s <= 1.001; s += 0.125) { const t = dist * s; if (w.pointBlocked(pivot.x - dir.x * t + rx * sh, pivot.y - dir.y * t + 0.2, pivot.z - dir.z * t + rz * sh)) { D = Math.max(0.6, t - dist * 0.125 - 0.2); break; } }
    this.camDist = lerp(this.camDist || D, D, D < (this.camDist || D) ? 1 : Math.min(1, dt * 6));
    const cam = this.camera; cam.position.set(pivot.x - dir.x * this.camDist + rx * sh, pivot.y - dir.y * this.camDist + 0.35, pivot.z - dir.z * this.camDist + rz * sh);
    cam.position.y = Math.max(cam.position.y, w.ground(cam.position.x, cam.position.z) + 0.4, 0.3);
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt * 2); cam.position.x += (Math.random() - 0.5) * this.shake * 0.5; cam.position.y += (Math.random() - 0.5) * this.shake * 0.5; }
    cam.rotation.set(this.camPitch, this.camYaw + Math.PI, 0);
    // aim point: march the crosshair ray
    const range = (v ? 160 : wd.type === 'melee' ? 6 : wd.range) + this.camDist; let hitT = range; this.aimEnemy = null;
    for (let t = this.camDist + 1; t < range; t += 1.3) {
      const x = cam.position.x + dir.x * t, y = cam.position.y + dir.y * t, z = cam.position.z + dir.z * t;
      if (w.pointBlocked(x, y, z) || y < -0.4) { hitT = t; break; }
      let found = false; for (const o of this.chars) { if (!o.alive || o === p) continue; const dx = o.pos.x - x, dy = o.pos.y + o.h * 0.5 - y, dz = o.pos.z - z; if (dx * dx + dy * dy * 0.6 + dz * dz < (o.r + 0.5) ** 2) { found = true; if (this.hostile(p, o)) this.aimEnemy = o; break; } }
      if (found) { hitT = t; break; }
    }
    this.aim.set(cam.position.x + dir.x * hitT, cam.position.y + dir.y * hitT, cam.position.z + dir.z * hitT);
  }

  // ---------- per-frame ----------
  animate(c, dt) {
    const m = c.model, sp = Math.hypot(c.vel.x, c.vel.z), moving = sp > 0.6;
    if (!c.alive) { c.deadT += dt; m.tilt.rotation.z = Math.min(1.5, c.deadT * 5); m.tilt.rotation.x *= 0.9; m.root.position.set(c.pos.x, c.pos.y + 0.2 - Math.max(0, c.deadT - 3) * 0.6, c.pos.z); return; }
    if (moving) m.phase += dt * (3 + sp * 1.2);
    const prone = c.swim ? 1.2 : c.sliding ? 1.32 : 0, gallop = moving && !c.swim && c.faction !== 'penguins' && c.faction !== 'albatross';
    m.tilt.rotation.x = lerp(m.tilt.rotation.x, prone + (gallop ? 0.12 + Math.sin(m.phase * 1.4) * 0.1 : 0), Math.min(1, dt * 9));
    m.tilt.rotation.z = lerp(m.tilt.rotation.z, moving && !prone && !gallop ? Math.sin(m.phase) * 0.14 : 0, Math.min(1, dt * 12));
    m.tilt.position.y = prone ? 0.28 + (c.swim ? Math.sin(this.time * 2 + m.phase) * 0.06 - 0.25 : 0) : moving ? Math.abs(Math.sin(m.phase)) * 0.07 : Math.sin(this.time * 2 + m.phase) * 0.012;
    c.recoil = Math.max(0, c.recoil - dt * 9); c.swing = Math.max(0, c.swing - dt); c.flash = Math.max(0, c.flash - dt * 6);
    const armed = !prone || this.time - c.lastShot < 0.6;
    m.flR.rotation.x = lerp(m.flR.rotation.x, armed ? -1.25 - c.recoil * 0.15 : 0.5 + Math.sin(m.phase * 2) * 0.4, Math.min(1, dt * 12)); m.flL.rotation.x = lerp(m.flL.rotation.x, armed ? -1.05 : 0.5 - Math.sin(m.phase * 2) * 0.4, Math.min(1, dt * 12));
    m.flR.rotation.z = armed ? -0.35 : 0.5; m.flL.rotation.z = armed ? 0.7 : -0.5;
    m.gun.rotation.x = -clamp(c.pitch, -0.9, 0.9) - prone * 0.9 - (c.swing > 0 ? Math.sin(c.swing / 0.28 * Math.PI) * 1.3 : 0); m.gun.position.z = m.metrics.sh[2] + 0.34 - c.recoil * 0.08;
    m.gun.visible = armed; m.torso.scale.setScalar(1 + c.flash * 0.1);
    if (c.vehicle) { const s = VEH[c.vehicle.type].seat; m.root.visible = s > -5; m.root.position.set(c.pos.x, c.pos.y + s, c.pos.z); m.tilt.rotation.x = 0.3; }
    else m.root.position.copy(c.pos);
    m.root.rotation.y = c.yaw;
  }
  frame(dt) {
    dt = Math.min(dt, 0.05); const w = this.world;
    if (!this.mode) { // menu attract camera
      this.attractT += dt * 0.05; const l = w.locById.huddle, a = this.attractT; this.camera.position.set(l.x + Math.cos(a) * 150, l.y + 46, l.z + Math.sin(a) * 150); this.camera.lookAt(l.x, l.y + 12, l.z);
      w.update(dt, this.camera, _a.set(l.x, l.y, l.z)); this.renderer.render(this.scene, this.camera); return;
    }
    if (this.paused) { this.renderer.render(this.scene, this.camera); return; }
    this.time += dt; const p = this.player;
    this.mode.update(dt);
    if (!this.mode) return;
    for (const c of this.chars) {
      c.cd -= dt; c.specialCd -= dt; c.inv -= dt;
      if (c.reload > 0) { c.reload -= dt; if (c.reload <= 0) c.weapons[c.cur].ammo = c.weapons[c.cur].def.mag; }
      if (c.alive) { if (this.time - c.lastHit > 6 && c.hp < c.maxHp) c.hp = Math.min(c.maxHp, c.hp + dt * (c.isPlayer ? 7 : 3)); if (c.ai) this.updateBot(c, dt); }
    }
    if (p) this.updatePlayer(dt);
    // soft separation
    const cs = this.chars; for (let i = 0; i < cs.length; i++) { const a = cs[i]; if (!a.alive || a.vehicle) continue; for (let j = i + 1; j < cs.length; j++) { const b = cs[j]; if (!b.alive || b.vehicle) continue; const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, m = a.r + b.r, d2 = dx * dx + dz * dz; if (d2 < m * m && d2 > 1e-4) { const d = Math.sqrt(d2), push = (m - d) * 0.5; a.pos.x -= dx / d * push; a.pos.z -= dz / d * push; b.pos.x += dx / d * push; b.pos.z += dz / d * push; } } }
    for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; this.animate(c, dt); if (!c.alive && c.deadT > 5 && !c.isPlayer && !c.keep) this.remove(c); }
    this.updateProjs(dt); this.updateStrikes(dt); this.updatePuffs(dt);
    w.update(dt, this.camera, p ? p.pos : this.camera.position);
    this.ui.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
  updateProjs(dt) {
    const w = this.world; let n = 0, n2 = 0;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const pr = this.projs[i], p = pr.p; pr.life -= dt; pr.v.y -= pr.g * dt;
      const ox = p.x, oy = p.y, oz = p.z; p.addScaledVector(pr.v, dt); let hit = null, done = pr.life <= 0;
      const sx = p.x - ox, sy = p.y - oy, sz = p.z - oz, sl2 = sx * sx + sy * sy + sz * sz;
      for (const o of this.chars) {
        if (!o.alive || o === pr.owner || (pr.owner && !this.hostile(pr.owner, o))) continue;
        const cx = o.pos.x - ox, cy = o.pos.y + o.h * 0.5 - oy, cz = o.pos.z - oz, t = clamp((cx * sx + cy * sy + cz * sz) / sl2, 0, 1), dx = cx - sx * t, dy = (cy - sy * t) * 0.75, dz = cz - sz * t, r = o.r + pr.size * 0.5 + (pr.owner && pr.owner.isPlayer ? 0.18 : 0);
        if (dx * dx + dy * dy + dz * dz < r * r) { hit = o; p.set(ox + sx * t, oy + sy * t, oz + sz * t); break; }
      }
      if (!hit && (w.pointBlocked(p.x, p.y, p.z) || w.pointBlocked(ox + sx * 0.5, oy + sy * 0.5, oz + sz * 0.5) || p.y < -0.3)) done = true;
      if (hit || done) {
        if (pr.blast) this.explode(p, pr.blast, pr.dmg, pr.owner); else { if (hit) this.damage(hit, pr.dmg, pr.owner); if (!pr.flame || hit) this.puff(p.x, p.y, p.z, pr.flame ? 1 : 4, pr.col, 1.5, 0.3); }
        if (!pr.flame && pr.tl > 0.5) this.ghosts.push({ p: p.clone(), v: pr.v.clone(), sp: pr.v.length() || 1, tl: pr.tl, wd: pr.size * 0.85, t: 0.22 });
        this.projs.splice(i, 1); continue;
      }
      if (pr.flame) pr.size += dt * 2.2;
      pr.trav = (pr.trav || 0) + Math.sqrt(sl2);
      _d.position.copy(p); const sp = pr.v.length(); _d.scale.set(pr.size, pr.size, pr.size + (pr.flame ? 0 : sp * 0.006)); _d.lookAt(p.x + pr.v.x, p.y + pr.v.y, p.z + pr.v.z); _d.updateMatrix();
      this.projMesh.setMatrixAt(n, _d.matrix); this.projMesh.setColorAt(n, _col.set(pr.col)); n++;
      if (!pr.flame) { // dark rim + blue streak so white snowballs read against white snow
        const st = pr.size + sp * 0.006; _d.scale.set(pr.size * 1.5 + 0.05, pr.size * 1.5 + 0.05, st * 1.12 + 0.08); _d.updateMatrix(); this.outMesh.setMatrixAt(n2, _d.matrix);
        const tl = Math.min(sp * 0.2, 34, pr.trav - pr.size * 0.5), wd = pr.size * 0.85; this.trail(n2, p, pr.v, sp, tl, wd); pr.tl = tl; n2++;
      }
    }
    // fading remnants of trails whose snowball has just landed
    for (let i = this.ghosts.length - 1; i >= 0 && n2 < 255; i--) { const gh = this.ghosts[i]; gh.t -= dt; if (gh.t <= 0) { this.ghosts.splice(i, 1); continue; } const k = gh.t / 0.22; this.outMesh.setMatrixAt(n2, ZERO); this.trail(n2, gh.p, gh.v, gh.sp, gh.tl * k, gh.wd * k); n2++; }
    this.outMesh.count = this.trailMesh.count = n2; this.outMesh.instanceMatrix.needsUpdate = true; this.trailMesh.instanceMatrix.needsUpdate = true;
    this.projMesh.count = n; this.projMesh.instanceMatrix.needsUpdate = true; this.projMesh.instanceColor.needsUpdate = true;
  }
  // tapered vapour streak: wide at the snowball, vanishing to a point `len` metres back along its path
  trail(i, head, v, sp, len, wd) {
    if (len < 0.05) { this.trailMesh.setMatrixAt(i, ZERO); return; }
    _d.position.copy(head).addScaledVector(v, -len * 0.5 / sp); _d.scale.set(wd, wd, len); _d.lookAt(_d.position.x + v.x, _d.position.y + v.y, _d.position.z + v.z); _d.updateMatrix(); this.trailMesh.setMatrixAt(i, _d.matrix);
  }
  updateStrikes(dt) {
    this.ring.visible = false;
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i]; s.t -= dt;
      if (s.t > 0) { this.ring.visible = true; this.ring.position.set(s.x, s.y + 0.4, s.z); this.ring.scale.setScalar(s.r * (0.6 + 0.4 * Math.abs(Math.sin(this.time * 6)))); continue; }
      s.gap -= dt; if (s.gap <= 0) { s.gap = 0.3; s.n--; const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * s.r; _a.set(s.x + Math.cos(a) * d - 8, s.y + 75, s.z + Math.sin(a) * d - 6); _b.set(0.1, -1, 0.08).normalize(); this.shoot(_a, _b, 70, 0, s.dmg, s.owner, 3, 6.5, 0xffffff, 0.8); }
      if (s.n <= 0) this.strikes.splice(i, 1);
    }
  }
  updatePuffs(dt) {
    let n = 0; _d.rotation.set(0, 0, 0);
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const f = this.puffs[i]; f.life += dt; if (f.life > f.max) { this.puffs.splice(i, 1); continue; }
      f.vy -= 4 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; const k = f.life / f.max;
      _d.position.set(f.x, f.y, f.z); _d.scale.setScalar(f.size * (0.5 + k) * (1 - k * k) * 2); _d.updateMatrix(); this.puffMesh.setMatrixAt(n, _d.matrix); this.puffMesh.setColorAt(n, _col.set(f.col)); n++;
    }
    this.puffMesh.count = n; this.puffMesh.instanceMatrix.needsUpdate = true; this.puffMesh.instanceColor.needsUpdate = true;
  }
}
