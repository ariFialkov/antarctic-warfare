// Game modes + the "fate" system.
//
// Every staked round has its outcome rolled BEFORE play begins (rollFate). The mode "directors"
// below then steer the simulated battle (bot buffs, reinforcements, fire support, hunters) so the
// visible result always lands on the pre-rolled one. rollFate is the single source of truth and is
// the only thing that would need to move server-side for a real-stakes deployment.
import * as THREE from '../vendor/three.module.min.js';
import { FACTIONS, CLASSES, mulberry32, clamp, lerp, pick } from './data.js';
import { audio } from './audio.js';

export const BR_TABLE = [[1, 0.05, 8], [2, 0.06, 4], [3, 0.08, 2], [4, 0.07, 1], [5, 0.07, 1]]; // place, probability, payout multiplier
export const SKIRMISH_WIN = 0.475, SKIRMISH_PAY = 2, BR_PLAYERS = 24;

export function rollFate(kind) {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0], r = mulberry32(seed);
  if (kind === 'skirmish') { const win = r() < SKIRMISH_WIN; return { kind, seed, win, mult: win ? SKIRMISH_PAY : 0, endT: 130 + r() * 70, margin: 4 + Math.floor(r() * 12), phase: r() * 6.28 }; }
  if (kind === 'br') { let u = r(), place = 0, mult = 0; for (const [p, pr, m] of BR_TABLE) { if (u < pr) { place = p; mult = m; break; } u -= pr; } if (!place) place = 6 + Math.floor(r() * (BR_PLAYERS - 7)); return { kind, seed, place, mult }; }
  const u = r(); return { kind, seed, crash: u < 0.05 ? 0.35 + r() * 0.6 : Math.min(40, 0.95 / (1 - u)) }; // sortie: loot multiplier at which hunters arrive
}

function revive(g, c, x, z) {
  if (c.waterOnly) { const wp = g.world.waterPointNear(x, z); if (wp) { x = wp.x; z = wp.z; } }
  c.alive = true; c.hp = c.maxHp; c.pos.set(x, g.world.ground(x, z), z); c.vel.set(0, 0, 0); c.deadT = 0; c.inv = 2.5; c.reload = 0; c.model.reset(); c.model.root.visible = true;
  for (const w of c.weapons) w.ammo = w.def.mag;
}
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const ENEMY_OF = { penguins: ['seals', 'orcas', 'walrus'], seals: ['penguins', 'orcas', 'walrus'], orcas: ['penguins', 'seals', 'walrus'] };

// =====================================================================================
export class SkirmishMode {
  constructor(o) { Object.assign(this, o); this.kind = 'skirmish'; }
  start() {
    const g = this.game, w = g.world, r = Math.random;
    this.enemyF = pick(ENEMY_OF[this.faction]); const wet = this.faction === 'orcas' || this.enemyF === 'orcas'; // orcas fight where there are canals
    const loc = this.loc = pick(w.locs.filter(l => wet ? l.arch : l.size >= 2 && !l.arch)), A = loc.arch; this.variant = r() < 0.5 ? 'classic' : 'objective';
    this.obj = A ? { x: loc.x + Math.sin(loc.seaA) * (A.r0 + 11), y: 0.5, z: loc.z + Math.cos(loc.seaA) * (A.r0 + 11) } : { x: loc.x, y: loc.y + 0.4, z: loc.z };
    this.bounds = { x: loc.x, z: loc.z, r: 165 }; this.t = 0; this.limit = 240; this.tick = 0; this.tickets = { A: 30, B: 30 }; this.queue = []; this.hold = 0; this.holder = null; this.b = 0; this.reinf = 0; this.fsT = 0; this.pace = 1; this.playerEvade = 1.3;
    this.winner = this.fate.win ? 'A' : 'B'; this.loser = this.fate.win ? 'B' : 'A';
    let ang = 0; for (let i = 0; i < 24; i++) { ang = r() * 6.28; if (A || (w.h(loc.x + Math.sin(ang) * 90, loc.z + Math.cos(ang) * 90) > 1.2 && w.h(loc.x - Math.sin(ang) * 90, loc.z - Math.cos(ang) * 90) > 1.2)) break; }
    this.base = { A: { x: loc.x + Math.sin(ang) * 90, z: loc.z + Math.cos(ang) * 90 }, B: { x: loc.x - Math.sin(ang) * 90, z: loc.z - Math.cos(ang) * 90 } };
    const sp = (team) => w.landPointNear(this.base[team].x, this.base[team].z, 0, 14, r, true);
    let p = sp('A'); g.player = g.spawn({ faction: this.faction, cls: this.cls, team: 'A', name: this.profile.name, isPlayer: true, x: p.x, z: p.z }); g.camYaw = ang + Math.PI; g.camPitch = 0;
    const aux = r() < 0.3;
    for (let i = 0; i < 7; i++) { p = sp('A'); this.addBot('A', aux && i > 4 ? 'albatross' : this.faction, p); }
    for (let i = 0; i < 8; i++) { p = sp('B'); this.addBot('B', this.enemyF, p); }
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(15, 0.35, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffffff })); this.ring.rotation.x = Math.PI / 2; this.ring.position.set(this.obj.x, this.obj.y, this.obj.z); this.ring.visible = this.variant === 'objective'; g.scene.add(this.ring);
    const OBJ = { penguins: 'Hold the Avalanche battery site', seals: 'Secure the breach point', orcas: 'Hold the Super-Calver dig site' };
    this.objective = this.variant === 'objective' ? OBJ[this.faction] + ' (the ring) to drain enemy reinforcements' : 'Classic battle: wipe out enemy reinforcements';
    g.ui.toast(`${loc.name} — ${FACTIONS[this.faction].name} vs ${FACTIONS[this.enemyF].name}`); if (aux) g.ui.toast('Albatross auxiliaries have joined your side');
  }
  addBot(team, faction, p, name) { const c = this.game.spawn({ faction, team, x: p.x, z: p.z, name }); c.ai.rush = true; c.ai.sight = 90; return c; }
  dispose() { this.game.scene.remove(this.ring); }
  botGoal(c) { const l = this.variant === 'objective' ? this.obj : this.loc, w = this.game.world; if (this.variant === 'objective' || Math.random() < 0.6) return w.landPointNear(l.x, l.z, 0, this.variant === 'objective' ? 13 : 45, Math.random, true); const e = this.base[c.team === 'A' ? 'B' : 'A']; return w.landPointNear(e.x, e.z, 10, 45, Math.random, true); }
  filterDamage(v, amt, a) { return v.isPlayer ? amt * 0.55 : a && a.ai ? amt * 0.5 * this.pace : amt; }
  onKill(v) {
    if (this.over) return; this.tickets[v.team] = Math.max(0, this.tickets[v.team] - 1);
    if (v.isPlayer) this.respawnT = 4; else this.queue.push({ team: v.team, faction: v.faction, name: v.name, t: 3 + Math.random() * 3 });
    this.guard();
  }
  guard() { // the pre-rolled winner can never run dry
    if (this.tickets[this.winner] <= 3 && this.tickets[this.loser] > 0) { this.tickets[this.winner] += 8; this.reinf++; this.game.ui.toast(this.winner === 'A' ? 'Albatross airlift: reinforcements have arrived! (+8)' : 'Enemy reinforcements have landed (+8)'); }
    if (this.tickets[this.loser] <= 0) this.finish();
  }
  fireSupport() { // visible fire mission against the side fated to lose
    const g = this.game, foes = g.chars.filter(c => c.alive && c.team === this.loser && !c.isPlayer); if (!foes.length) return;
    const t = pick(foes), owner = g.chars.find(c => c.alive && c.team === this.winner && !c.isPlayer) || null;
    g.callStrike(t.pos, owner, 7, 8, 1.2, 130); if (this.winner === 'A') g.ui.toast('Friendly fire mission inbound!'); else g.ui.toast('⚠ Enemy fire mission inbound!');
  }
  update(dt) {
    const g = this.game, p = g.player; if (this.over) return; this.t += dt;
    for (let i = this.queue.length - 1; i >= 0; i--) { const q = this.queue[i]; q.t -= dt; if (q.t <= 0) { this.queue.splice(i, 1); const s = g.world.landPointNear(this.base[q.team].x, this.base[q.team].z, 0, 14, Math.random, true); this.addBot(q.team, q.faction, s, q.name).inv = 2; } }
    if (!p.alive) { this.respawnT -= dt; if (this.respawnT <= 0) { const s = g.world.landPointNear(this.base.A.x, this.base.A.z, 0, 12, Math.random, true); revive(g, p, s.x, s.z); } }
    this.tick -= dt; if (this.tick > 0) return; this.tick = 1;
    if (this.variant === 'objective') {
      let a = 0, b = 0; for (const c of g.chars) if (c.alive && dist2(c.pos, this.obj) < 15 + c.r) c.team === 'A' ? a++ : b++;
      const h = a > b ? 'A' : b > a ? 'B' : null; if (h !== this.holder) { this.holder = h; this.hold = 0; } this.ring.material.color.set(h === 'A' ? 0x3aa0ff : h === 'B' ? 0xff4a4a : 0xffffff);
      if (h && ++this.hold >= 6) { this.hold = 0; const e = h === 'A' ? 'B' : 'A'; this.tickets[e] = Math.max(0, this.tickets[e] - 1); this.guard(); if (this.over) return; }
    }
    // director: steer ticket curves toward the fated result
    const f = this.fate, prog = Math.min(1.2, this.t / f.endT), wob = 5 * Math.sin(prog * 6.28 + f.phase) * Math.max(0, 1 - prog);
    const Ls = 30 * (1 - Math.pow(Math.min(1, prog), 1.25)) + wob, Ws = 30 - (30 - f.margin) * Math.pow(Math.min(1, prog), 0.9) - wob;
    const err = (this.tickets[this.loser] - Ls) - (this.tickets[this.winner] - Ws); this.b = clamp(err / 5, -1, 1);
    this.pace = clamp(1 + (this.tickets.A + this.tickets.B - Ls - Ws) / 10, 0.2, 1.8);
    const bp = Math.max(this.b, 0), bn = Math.max(-this.b, 0);
    for (const c of g.chars) { if (!c.ai) continue; const win = c.team === this.winner; c.dmgMul = win ? 1 + 1.4 * bp - 0.45 * bn : 1 - 0.45 * bp + 1.4 * bn; c.accMul = win ? 1 - 0.65 * bp + 1.3 * bn : 1 + 1.3 * bp - 0.65 * bn; c.resist = win ? 1 - 0.45 * bp + 0.4 * bn : 1 + 0.5 * bp - 0.45 * bn; c.ai.noStrike = !win && bp > 0.3; }
    this.fsT -= 1;
    if (this.fsT <= 0 && ((prog > 0.6 && err > 4) || prog >= 1)) { this.fsT = prog >= 1 ? 3 : 7; this.fireSupport(); }
    if (this.t >= this.limit) { this.tickets[this.loser] = Math.min(this.tickets[this.loser], this.tickets[this.winner] - 1); this.finish(); }
  }
  finish() {
    if (this.over) return; this.over = true; const g = this.game, win = this.fate.win; g.player.inv = 1e9;
    g.ui.result({ title: win ? 'VICTORY' : 'DEFEAT', win, sub: `${this.loc.name} · ${this.tickets.A} – ${this.tickets.B}`, payout: Math.round(this.stake * this.fate.mult), stake: this.stake, kills: g.player.kills });
  }
  hud() { return { top: `<b class="ally">${this.tickets.A}</b><span>${fmtT(Math.max(0, this.limit - this.t))}</span><b class="enemy">${this.tickets.B}</b>`, objective: this.objective, dead: !this.game.player.alive ? `Redeploying in ${Math.ceil(Math.max(0, this.respawnT))}…` : null }; }
  markers() { return this.variant === 'objective' ? [{ x: this.obj.x, z: this.obj.z, col: '#ffd23a' }] : []; }
}
const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// =====================================================================================
export class BRMode {
  constructor(o) { Object.assign(this, o); this.kind = 'br'; }
  start() {
    const g = this.game, w = g.world, r = Math.random, N = BR_PLAYERS, P = this.fate.place;
    const wetP = this.faction === 'orcas', loc = this.loc = pick(w.locs.filter(l => wetP ? l.arch : l.size >= 2)); this.R0 = 230; this.zone = { x: loc.x, z: loc.z, r: this.R0 }; this.bounds = { x: loc.x, z: loc.z, r: this.R0 + 25 };
    const fa = r() * 6.28, fd = r() * 70; this.final = { x: loc.x + Math.cos(fa) * fd, z: loc.z + Math.sin(fa) * fd };
    this.t = 0; this.tick = 0; this.elimT = 6; this.hunt = null; this.duelT = 0; this.playerEvade = 2.6;
    this.tP = lerp(45, 200, Math.pow((N - P) / (N - 1), 0.75)) * (0.9 + r() * 0.2);
    const pool = ['penguins', 'penguins', 'penguins', 'seals', 'seals', 'seals', 'walrus', 'albatross'].concat(loc.arch ? ['orcas', 'orcas', 'orcas', 'orcas'] : []);
    const sp = () => w.landPointNear(loc.x, loc.z, 40, this.R0 * 0.92, r, true);
    let s = sp(); g.player = g.spawn({ faction: this.faction, cls: this.cls, team: 'P', name: this.profile.name, isPlayer: true, x: s.x, z: s.z }); g.camYaw = Math.atan2(loc.x - s.x, loc.z - s.z);
    for (let i = 1; i < N; i++) { s = sp(); const c = g.spawn({ faction: this.lobby === 'own' ? this.faction : pick(pool), team: 'T' + i, x: s.x, z: s.z }); c.ai.sight = 60; c.ai.noStrike = true; }
    g.zoneMesh.visible = true; g.ui.toast(`Dropping into ${loc.name}. ${N} players. Last one standing wins.`);
  }
  alive() { let n = 0; for (const c of this.game.chars) if (c.alive) n++; return n; }
  botGoal() { return this.game.world.landPointNear(this.zone.x, this.zone.z, 0, Math.max(6, this.zone.r * 0.8), Math.random, true); }
  filterDamage(v, amt, a, how) {
    if (v.ai && a && a.ai) return Math.max(0, Math.min(amt * 0.3, v.hp - v.maxHp * 0.08)); // bots wear each other down; the schedule decides who falls
    if (v.isPlayer && !this.hunt) return amt * (v.hp < v.maxHp * 0.35 ? 0.3 : 0.55);
    return amt;
  }
  vetoDeath(v) {
    if (!v.isPlayer || this.hunt) return false;
    v.hp = v.maxHp * 0.45; v.inv = 2.5; this.playerEvade += 0.6; if (dist2(v.pos, this.zone) > this.zone.r) this.tP = Math.min(this.tP, this.t + 15); for (const c of this.game.chars) if (c.ai && c.ai.target === v) { c.ai.target = null; c.ai.react = 1.5; } this.game.ui.toast('SECOND WIND! Blubber reserves kicked in'); this.game.puff(v.pos.x, v.pos.y + 1, v.pos.z, 12, 0x5cf2a8, 2.5, 0.5); audio.coin(); return true;
  }
  onKill(v, k) {
    const g = this.game, p = g.player;
    if (v.isPlayer) { this.place = this.alive() + 1; this.endT = 2.8; return; }
    const n = this.alive(), P = this.fate.place;
    if (p.alive && n === 1) { this.place = 1; this.endT = 1.5; return; }
    if (p.alive && P > 1 && n <= P && !this.hunt) this.startHunt();
  }
  startHunt() { // the player's fated placement has arrived
    const g = this.game, p = g.player, bots = g.chars.filter(c => c.alive && c.ai).sort((a, b) => dist2(a.pos, p.pos) - dist2(b.pos, p.pos));
    this.hunt = { t: 0, snipe: 0, hunters: bots.slice(0, 2) }; this.playerEvade = 1;
    for (const c of bots) c.floorHp = 1;
    for (const h of this.hunt.hunters) { h.ai.forced = p; h.ai.sight = 400; h.accMul = 0.3; h.resist = 0.15; h.dmgMul = 1.1; }
  }
  update(dt) {
    const g = this.game, p = g.player, z = this.zone, P = this.fate.place; this.t += dt;
    if (this.endT != null) { this.endT -= dt; if (this.endT <= 0 && !this.over) this.finish(); if (this.over) return; }
    const duel = P === 1 && p.alive && this.alive() === 2;
    if (duel) { this.duelT += dt; z.x = lerp(z.x, p.pos.x, dt * 0.25); z.z = lerp(z.z, p.pos.z, dt * 0.25); z.r = Math.max(8, z.r - dt * 5); }
    else { const k = clamp((this.t - 15) / 190, 0, 1); z.r = Math.max(10, lerp(this.R0, 14, k)); z.x = lerp(this.loc.x, this.final.x, k); z.z = lerp(this.loc.z, this.final.z, k); }
    g.zoneMesh.position.set(z.x, 60, z.z); g.zoneMesh.scale.set(z.r, 1, z.r); g.zoneMesh.material.opacity = 0.28 + Math.sin(this.t * 2) * 0.06;
    if (this.hunt && p.alive) {
      const h = this.hunt; h.t += dt; for (const c of h.hunters) c.dmgMul = 1.1 + h.t * 0.35;
      if (h.t > 8) { h.snipe -= dt; if (h.snipe <= 0) { h.snipe = 0.6; const k = h.hunters.find(c => c.alive) || null; if (k) { g.eye(k, _v1); g.shoot(_v1, _v2.copy(p.pos).sub(_v1).normalize(), 400, 0, 0, k, 0.05, 0, 0xffffff, 0.15); audio.shot('sniper', 30); } g.damage(p, 34 / (k ? k.dmgMul : 1), k, 'snipe'); } }
    }
    this.tick -= dt; if (this.tick > 0) return; this.tick = 0.5;
    const storm = 2 + this.t * 0.03;
    for (const c of g.chars) { if (c.alive && dist2(c.pos, z) > z.r) { g.damage(c, storm / c.resist, null, 'storm'); if (c.ai && !c.ai.target) c.ai.goal = null; } if (c.ai) c.ai.home = z; }
    if (this.endT != null || this.hunt || !p.alive) return;
    if (duel) { const last = g.chars.find(c => c.alive && c.ai); if (last) { last.accMul = 3; last.dmgMul = 0.3; last.resist = 1.7; last.ai.forced = p; if (this.duelT > 38) g.kill(last, null, 'storm'); } return; }
    // scheduled eliminations keep the lobby shrinking on pace
    this.elimT -= 0.5; const n = this.alive(), floor = Math.max(P, 2), target = Math.max(floor, BR_PLAYERS - (BR_PLAYERS - P) * clamp((this.t - 8) / (this.tP - 8), 0, 1));
    if (n > target && this.elimT <= 0) {
      this.elimT = 1.5 + Math.random() * 3;
      const bots = g.chars.filter(c => c.alive && c.ai); let v = null, best = -1;
      for (const c of bots) { const la = c.lastAttacker, sc = (1 - c.hp / c.maxHp) * 120 + (la && la.alive && la.ai ? 40 : 0) + (c.ai.target === p ? -300 : 0) + Math.random() * 40 + (dist2(c.pos, z) > z.r ? 150 : 0); if (sc > best) { best = sc; v = c; } }
      if (v) { let k = v.lastAttacker && v.lastAttacker.alive && v.lastAttacker.ai ? v.lastAttacker : null, kd = k ? 0 : 90; for (const c of bots) if (c !== v) { const d = dist2(c.pos, v.pos); if (d < kd) { kd = d; k = c; } } g.kill(v, k, k ? null : 'storm'); }
    }
  }
  finish() {
    this.over = true; const g = this.game, pl = this.place; g.player.inv = 1e9; g.zoneMesh.visible = false;
    g.ui.result({ title: pl === 1 ? 'LAST ONE STANDING!' : `#${pl} of ${BR_PLAYERS}`, win: this.fate.mult >= 1, sub: `${this.loc.name} · ${this.lobby === 'own' ? FACTIONS[this.faction].name + ' only' : 'All animals'}`, payout: Math.round(this.stake * this.fate.mult), stake: this.stake, kills: g.player.kills });
  }
  hud() { const g = this.game, out = g.player.alive && dist2(g.player.pos, this.zone) > this.zone.r; return { top: `<span>🐧 ${this.alive()} alive</span><span>☠ ${g.player.kills}</span>`, objective: out ? '⚠ You are in the blizzard! Get inside the zone' : 'Survive. Stay inside the blizzard wall.', dead: !g.player.alive ? 'Eliminated' : null, zone: this.zone }; }
  markers() { return []; }
}
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();

// =====================================================================================
export class OpenWorldMode {
  constructor(o) { Object.assign(this, o); this.kind = 'open'; this.faction = this.profile.faction; this.cls = this.profile.cls; }
  rel(fa, fb) { if (fa === fb) return false; if (fa === 'albatross' || fb === 'albatross') return fa === 'walrus' || fb === 'walrus'; return true; }
  hostile(a, b) { if (a.team === 'hunters' || b.team === 'hunters') return a.isPlayer || b.isPlayer; return this.rel(a.team, b.team); }
  friendlyLoc(l) { return !this.rel(l.f, this.faction); }
  start() {
    const g = this.game, w = g.world, pr = this.profile;
    this.t = 0; this.tick = 0; this.spawned = new Set(); this.patrolT = 20; this.battleT = 60; this.saveT = 10; this.sortie = null; this.mission = null; this.battle = null; this.playerEvade = 1.5;
    const home = w.locById[FACTIONS[this.faction].home];
    const s = pr.pos && w.h(pr.pos.x, pr.pos.z) > -5 ? pr.pos : { x: home.board.x, z: home.board.z + 7 };
    g.player = g.spawn({ faction: this.faction, cls: this.cls, team: this.faction, name: pr.name, isPlayer: true, x: s.x, z: s.z });
    for (const l of w.locs) { // vehicles parked at every settlement
      const r = mulberry32(l.px * 7 + l.py), pt = () => w.landPointNear(l.board.x, l.board.z, 5, 16, r);
      let p = pt(); g.spawnVehicle('waddle', p.x, p.z, r() * 6.28);
      if (l.f === 'penguins' && l.size >= 2) { p = pt(); g.spawnVehicle('gentoo', p.x, p.z, r() * 6.28); }
      if (l.f === 'seals' || l.f === 'orcas') { for (let i = 0; i < 30; i++) { const a = r() * 6.28, d = l.R + 10 + r() * 60, x = l.x + Math.cos(a) * d, z = l.z + Math.sin(a) * d; if (w.h(x, z) < -1.5) { g.spawnVehicle('manta', x, z, a); break; } } }
    }
    g.ui.toast(`Welcome to ${w.nearestLoc(s.x, s.z).name}, ${pr.name}. Find a Mission Board to start a sortie.`);
  }
  dispose() { this.savePos(); }
  savePos() { const p = this.game.player; if (p && p.alive) { this.profile.pos = { x: p.pos.x, z: p.pos.z }; this.save(); } }
  garrison(l) {
    const g = this.game, n = 2 + l.size * 2;
    for (let i = 0; i < n; i++) { const p = g.world.landPointNear(l.x, l.z, 6, l.R * 0.9); const c = g.spawn({ faction: l.f, team: l.f, x: p.x, z: p.z, home: { x: l.x, z: l.z, r: l.R * 0.9 }, tag: l.id }); c.loc = l; }
  }
  squad(faction, x, z, n, home, team) { const out = []; if (faction === 'orcas' && !this.game.world.waterPointNear(x, z, 140)) faction = this.faction === 'seals' ? 'penguins' : 'seals'; for (let i = 0; i < n; i++) { const p = this.game.world.landPointNear(x, z, 0, 8, Math.random, true); const c = this.game.spawn({ faction, team: team || faction, x: p.x, z: p.z, home: home || { x, z, r: 25 } }); out.push(c); } return out; }
  filterDamage(v, amt, a) { if (v.ai && a && a.ai) return amt * 0.5; if (v.isPlayer && !(this.sortie && this.sortie.bust)) return amt * 0.6; return amt; }
  vetoDeath(v) {
    if (!v.isPlayer || !this.sortie || this.sortie.bust) return false;
    v.hp = v.maxHp * 0.4; v.inv = 1.6; this.game.ui.toast('SECOND WIND! Blubber reserves kicked in'); this.game.puff(v.pos.x, v.pos.y + 1, v.pos.z, 12, 0x5cf2a8, 2.5, 0.5); audio.coin(); return true;
  }
  // ----- sorties (staked runs) -----
  startSortie(stake, fate) { this.sortie = { stake, fate, mult: 0, bust: null, kills: 0 }; this.newMission(); this.game.ui.toast(`Sortie started. Stake ${stake}. Complete missions, then bank at any friendly board.`); }
  loot() { return this.sortie ? Math.floor(this.sortie.stake * this.sortie.mult) : 0; }
  award(r, label) {
    const s = this.sortie; if (!s || s.bust) return;
    if (s.mult + r >= s.fate.crash) { this.triggerBust(); return; }
    s.mult += r; this.game.ui.toast(`${label}  +${Math.round(r * s.stake)} loot (×${s.mult.toFixed(2)})`); audio.coin();
  }
  triggerBust() {
    const g = this.game, p = g.player, s = this.sortie; s.bust = { t: 0, snipe: 0 }; this.mission = null; g.beacon.visible = false;
    if (p.vehicle) { g.exitVehicle(p); g.ui.toast('Your ride has been disabled!'); }
    g.ui.toast('⚠ Tusk bounty hunters are after your loot!'); audio.lose();
    const a = Math.random() * 6.28; s.bust.hunters = [];
    for (let i = 0; i < 3; i++) { const pt = g.world.landPointNear(p.pos.x + Math.cos(a + i * 2.1) * 70, p.pos.z + Math.sin(a + i * 2.1) * 70, 0, 8, Math.random, true); const c = g.spawn({ faction: 'walrus', team: 'hunters', x: pt.x, z: pt.z, name: 'Bounty Hunter ' + pick(['Odo', 'Bjorn', 'Tusk', 'Gunnar', 'Ivar', 'Sven']) }); c.ai.forced = p; c.ai.sight = 400; c.accMul = 0.35; c.resist = 0.15; c.floorHp = 1; c.dmgMul = 0.7; c.ai.rush = true; s.bust.hunters.push(c); }
    this.playerEvade = 1;
  }
  bank() { const s = this.sortie; if (!s || s.bust) return 0; const v = this.loot(); this.wallet.coins += v; this.profile.stats.banked += v; this.sortie = null; this.mission = null; this.game.beacon.visible = false; this.save(); audio.win(); return v; }
  newMission() {
    const g = this.game, w = g.world, p = g.player.pos, wet = g.player.waterOnly; let r = Math.random(); if (wet && r >= 0.55 && r < 0.8) r = 0.9;
    const far = (f) => { const c = w.locs.filter(l => f(l) && (!wet || l.arch || l.coastal) && dist2(l, p) > 160 && dist2(l, p) < 900); return c.length ? pick(c) : null; };
    let m = null;
    if (r < 0.3) { const n = 3 + Math.floor(Math.random() * 3); m = { type: 'bounty', n, done: 0, reward: 0.13 * n, text: `Bounty: take down ${n} hostiles` }; }
    else if (r < 0.55) { const l = far(l => this.friendlyLoc(l)); if (l) m = { type: 'deliver', loc: l, reward: 0.2 + dist2(l, p) / 1000, text: `Deliver supplies to ${l.name}` }; }
    else if (r < 0.8) { const l = far(l => !this.friendlyLoc(l)); if (l) m = { type: 'raid', loc: l, n: 3, done: 0, reward: 0.5 + dist2(l, p) / 1100, text: `Raid ${l.name}: defeat 3 defenders` }; }
    else { const l = far(() => true); if (l) m = { type: 'recon', loc: l, reward: 0.18 + dist2(l, p) / 1050, text: `Recon the ${l.kind.toLowerCase()} at ${l.name}` }; }
    this.mission = m || { type: 'bounty', n: 3, done: 0, reward: 0.4, text: 'Bounty: take down 3 hostiles' };
  }
  completeMission() { const m = this.mission; this.mission = null; this.award(m.reward, 'Mission complete!'); if (this.sortie && !this.sortie.bust) this.newMission(); }
  onKill(v, k) {
    const g = this.game, s = this.sortie;
    if (v.isPlayer) { this.respawnT = 4; if (s) { g.ui.toast(`Sortie failed. ${this.loot()} loot and your ${s.stake} stake are gone.`); for (const h of s.bust ? s.bust.hunters : []) { h.ai.forced = null; h.ai.passive = true; h.gone = 4; } this.sortie = null; this.mission = null; this.playerEvade = 1.5; g.beacon.visible = false; this.profile.stats.games++; this.save(); } return; }
    if (k && k.isPlayer) { this.profile.stats.kills++; if (s && !s.bust) { const m = this.mission; s.kills++; this.award(0.04, `${v.name} down`); if (this.sortie && !this.sortie.bust && m && m === this.mission) { if (m.type === 'bounty' && ++m.done >= m.n) this.completeMission(); else if (m.type === 'raid' && v.tag === m.loc.id && ++m.done >= m.n) this.completeMission(); } } }
    if (this.battle && this.battle.foes.includes(v) && this.battle.foes.every(c => !c.alive)) { g.ui.toast('⚔ Battle won! The line holds.'); this.battle = null; this.award(0.3, 'Battle bonus'); }
  }
  reach() { return this.game.player.waterOnly ? 17 : 6; }
  onUse() { const g = this.game, p = g.player, l = g.world.nearestLoc(p.pos.x, p.pos.z); if (dist2(l.board, p.pos) < this.reach()) { if (this.friendlyLoc(l)) g.ui.openBoard(this, l); else g.ui.toast("This board belongs to a hostile faction."); } }
  update(dt) {
    const g = this.game, w = g.world, p = g.player; this.t += dt;
    if (!p.alive) { this.respawnT -= dt; if (this.respawnT <= 0) { const l = w.nearestLoc(p.pos.x, p.pos.z, l => this.friendlyLoc(l) && l.f === this.faction) || w.locById[FACTIONS[this.faction].home]; revive(g, p, l.board.x, l.board.z + 7); g.ui.toast(`Recovered at ${l.name}`); } }
    const s = this.sortie;
    if (s && s.bust && p.alive) { const b = s.bust; b.t += dt; for (const c of b.hunters) c.dmgMul = 0.7 + b.t * 0.3; if (b.t > 9) { b.snipe -= dt; if (b.snipe <= 0) { b.snipe = 0.6; const k = b.hunters.find(c => c.alive) || null; if (k) { g.eye(k, _v1); g.shoot(_v1, _v2.copy(p.pos).sub(_v1).normalize(), 400, 0, 0, k, 0.05, 0, 0xffffff, 0.15); } g.damage(p, 34 / (k ? k.dmgMul : 1), k, 'snipe'); } } }
    this.tick -= dt; if (this.tick > 0) return; this.tick = 0.5;
    // settlement garrisons stream in/out around the player
    for (const l of w.locs) { const d = dist2(l, p.pos); if (d < 270 && !this.spawned.has(l.id)) { this.spawned.add(l.id); this.garrison(l); } else if (d > 430 && this.spawned.has(l.id)) { this.spawned.delete(l.id); for (const c of g.chars.filter(c => c.loc === l)) g.remove(c); } }
    for (const c of g.chars.slice()) { if (c.isPlayer || c.loc) continue; if (c.gone != null) { c.gone -= 0.5; if (c.gone <= 0) g.remove(c); } else if (c.team !== 'hunters' && dist2(c.pos, p.pos) > 380) g.remove(c); }
    for (const v of g.vehicles) v.model.root.visible = dist2(v.pos, p.pos) < 500;
    // roaming patrols to jump (or be jumped by)
    this.patrolT -= 0.5;
    if (this.patrolT <= 0 && p.alive && g.chars.length < 34) { this.patrolT = 22 + Math.random() * 25; const a = g.camYaw + Math.PI + (Math.random() - 0.5) * 2.4, d = 110 + Math.random() * 50, f = Math.random() < 0.75 ? pick(ENEMY_OF[this.faction]) : 'albatross'; this.squad(f, p.pos.x + Math.sin(a) * d, p.pos.z + Math.cos(a) * d, 2 + Math.floor(Math.random() * 2), { x: p.pos.x, z: p.pos.z, r: 60 }); }
    this.battleT -= 0.5;
    if (this.battleT <= 0 && p.alive && !this.battle && g.chars.length < 30) { this.battleT = 100 + Math.random() * 70; const a = Math.random() * 6.28, bx = p.pos.x + Math.sin(a) * 130, bz = p.pos.z + Math.cos(a) * 130, ef = pick(ENEMY_OF[this.faction]); const home = { x: bx, z: bz, r: 22 }; this.squad(this.faction, bx - 14, bz, 4, home); this.battle = { x: bx, z: bz, foes: this.squad(ef, bx + 14, bz, 5, home) }; g.ui.toast(`⚔ ${FACTIONS[ef].name} are attacking near ${w.nearestLoc(bx, bz).name}! Your faction needs you.`); }
    if (this.battle && dist2(this.battle, p.pos) > 420) this.battle = null;
    const m = this.mission;
    if (m && m.loc) { g.beacon.visible = true; g.beacon.position.set(m.loc.x, m.loc.y + 150, m.loc.z); if ((m.type === 'deliver' || m.type === 'recon') && dist2(m.loc, p.pos) < (p.waterOnly ? m.loc.R + 75 : 32)) this.completeMission(); } else g.beacon.visible = false;
    this.saveT -= 0.5; if (this.saveT <= 0) { this.saveT = 10; this.savePos(); }
  }
  hud() {
    const g = this.game, p = g.player, s = this.sortie, m = this.mission, l = g.world.nearestLoc(p.pos.x, p.pos.z); let prompt = null;
    if (p.alive) { if (p.vehicle) prompt = 'Exit vehicle'; else if (!p.waterOnly && g.vehicles.some(v => !v.driver && v.pos.distanceTo(p.pos) < 4.5)) prompt = 'Drive'; else if (dist2(l.board, p.pos) < this.reach()) prompt = 'Mission Board'; }
    return { top: s ? `<span>💰 Loot ${this.loot()}</span><span>×${s.mult.toFixed(2)}</span><span>Stake ${s.stake}</span>` : `<span>Free roam</span><span>${dist2(l, p.pos) < l.R * 1.6 ? l.name : 'The Ice'}</span>`,
      objective: s ? (s.bust ? '⚠ Bounty hunters inbound. Survive!' : m ? m.text + (m.n ? ` (${m.done}/${m.n})` : '') + (m.loc ? ` · ${Math.round(dist2(m.loc, p.pos))}m` : '') : '') : 'Explore, or start a sortie at a friendly Mission Board',
      dead: !p.alive ? `Recovering in ${Math.ceil(Math.max(0, this.respawnT))}…` : null, prompt };
  }
  markers() { const out = []; if (this.mission && this.mission.loc) out.push({ x: this.mission.loc.x, z: this.mission.loc.z, col: '#ffd23a' }); if (this.battle) out.push({ x: this.battle.x, z: this.battle.z, col: '#ff4a4a' }); return out; }
}
