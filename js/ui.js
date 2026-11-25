// Menus, HUD, minimap, save data.
import * as THREE from '../vendor/three.module.min.js';
import { FACTIONS, CLASSES, WEAPONS, SPECIALS, CODEX, clamp } from './data.js';
import { SkirmishMode, BRMode, OpenWorldMode, rollFate, BR_TABLE, BR_PLAYERS, SKIRMISH_WIN, SKIRMISH_PAY } from './modes.js';
import { X0, Z0, CELL, NX, NZ } from './world.js';
import { audio } from './audio.js';

const KEY = 'antarctic-warfare-v1';
export const store = {
  data: (() => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } })() || { slots: [null, null, null], active: -1, settings: { quality: matchMedia('(pointer: coarse)').matches ? 0 : 2, sens: 1, volume: 0.6, invertY: false } },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full or blocked */ } },
  get profile() { return this.data.slots[this.data.active] || null; },
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);
const STAKES = [25, 50, 100, 250, 500], PLAYABLE = ['penguins', 'seals', 'orcas'];
const EMOJI = { penguins: '🐧', seals: '🦭', orcas: '🐋', walrus: '🦣', albatross: '🕊️' };
const _v = new THREE.Vector3();

export class UI {
  constructor() {
    this.root = $('ui'); this.hudEl = $('hud'); this.mini = $('minimap').getContext('2d'); this.ov = $('overlay2d'); this.ovc = this.ov.getContext('2d');
    this.toasts = []; this.frame = 0; this.overlay = null; this.setup = {};
    this.root.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; audio.init(); audio.ui(); const fn = this['act_' + el.dataset.act]; if (fn) fn.call(this, el.dataset, el); });
    const rs = () => { const d = Math.min(devicePixelRatio, 2); this.ov.width = innerWidth * d; this.ov.height = innerHeight * d; this.ovd = d; }; rs(); addEventListener('resize', rs);
  }
  get p() { return store.profile; }
  html(h) { this.root.innerHTML = h; }
  showHud(on) { this.hudEl.hidden = !on; if (on) { this.root.innerHTML = ''; this.overlay = null; $('feed').innerHTML = ''; $('toasts').innerHTML = ''; $('hudName').textContent = this.p.name; } else this.ovc.clearRect(0, 0, this.ov.width, this.ov.height); }

  // ---------- profile slots ----------
  showSlots() {
    const s = store.data.slots;
    this.html(`<div class="screen center"><div class="card wide"><h2>Choose your soldier</h2><p class="muted">Three save slots, stored on this device.</p><div class="slots">${s.map((p, i) => p
      ? `<div class="slot full" style="border-color:${FACTIONS[p.faction].css}"><span style="font-size:34px">${EMOJI[p.faction]}</span><b>${esc(p.name)}</b><span class="muted">${FACTIONS[p.faction].name} · ${CLASSES[p.faction].find(c => c.id === p.cls).name}</span><span class="coin">${p.coins}</span><span class="grow"></span><div class="row"><button class="btn sm grow" data-act="slot" data-i="${i}">Play</button><button class="btn sm ghost" data-act="del" data-i="${i}">Delete</button></div></div>`
      : `<button class="slot" data-act="new" data-i="${i}"><span style="font-size:34px">＋</span><b>Empty slot</b><span class="muted">Enlist a new character</span></button>`).join('')}</div></div></div>`);
  }
  act_slot(d) { store.data.active = +d.i; store.save(); this.showMenu(); }
  act_del(d, el) { if (el.dataset.sure) { store.data.slots[+d.i] = null; if (store.data.active === +d.i) store.data.active = -1; store.save(); this.showSlots(); } else { el.dataset.sure = 1; el.textContent = 'Sure?'; el.classList.add('red'); el.classList.remove('ghost'); } }
  act_new(d) { this.setup = { kind: 'new', slot: +d.i, faction: 'penguins', cls: 'rifleman', name: '' }; this.showCreate(); }
  factionPick(sel) { return `<div class="pick">${PLAYABLE.map(f => `<button class="opt ${f === sel ? 'on' : ''}" style="--sel:${FACTIONS[f].css}" data-act="fac" data-f="${f}"><b>${EMOJI[f]} ${FACTIONS[f].name}</b>${FACTIONS[f].blurb}</button>`).join('')}</div>`; }
  classPick(f, sel) { return `<div class="pick">${CLASSES[f].map(c => `<button class="opt ${c.id === sel ? 'on' : ''}" style="--sel:${FACTIONS[f].css}" data-act="cls" data-c="${c.id}"><b>${c.name}</b>${c.desc}<em>${c.w.map(w => WEAPONS[w].name).join(' + ')} · ${SPECIALS[c.special].icon} ${c.strike || SPECIALS[c.special].name}</em></button>`).join('')}</div>`; }
  showCreate() {
    const s = this.setup, keep = $('nameIn') ? $('nameIn').value : s.name;
    this.html(`<div class="screen center"><div class="card wide"><h2>Enlist</h2><input id="nameIn" type="text" maxlength="14" placeholder="Callsign" value="${esc(keep)}"><h3 style="margin-top:14px">Faction</h3>${this.factionPick(s.faction)}<h3>Role</h3>${this.classPick(s.faction, s.cls)}<div class="row"><button class="btn ghost" data-act="slots">Back</button><span class="grow"></span><button class="btn orange big" data-act="create">Enlist</button></div></div></div>`);
  }
  act_slots() { this.showSlots(); }
  act_fac(d) { const s = this.setup; s.faction = d.f; s.cls = CLASSES[d.f][0].id; this.refreshSetup(); }
  act_cls(d) { this.setup.cls = d.c; this.refreshSetup(); }
  refreshSetup() { if (this.setup.kind === 'new') this.showCreate(); else this.showSetup(); }
  act_create() { const s = this.setup, name = ($('nameIn').value || '').trim() || 'Recruit' + Math.floor(Math.random() * 900 + 100); store.data.slots[s.slot] = { name, faction: s.faction, cls: s.cls, coins: 1000, stats: { kills: 0, wins: 0, games: 0, banked: 0 }, pos: null }; store.data.active = s.slot; store.save(); this.showMenu(); }

  // ---------- main menu ----------
  showMenu() {
    const p = this.p; if (!p) return this.showSlots(); const F = FACTIONS[p.faction];
    this.html(`<div class="screen"><div class="menu-head"><div class="logo"><span>ANTARCTIC</span><b>WARFARE</b></div>
      <div class="row"><span class="chip"><i class="dot" style="background:${F.css}"></i>${esc(p.name)} · ${F.name}</span><span class="chip"><span class="coin">${p.coins}</span></span><button class="btn sm ghost" data-act="slots">Switch</button></div></div>
      <div class="modes">
        <button class="mode" data-act="open"><i style="background:var(--teal)"></i><span class="ico">🗺️</span><b>Open World</b><small>Roam all of Antarctica. Run staked sorties, complete missions, jump rival patrols, bank your loot.</small></button>
        <button class="mode" data-act="setup" data-k="skirmish"><i style="background:var(--orange)"></i><span class="ico">⚔️</span><b>Skirmish</b><small>Quick 8v8 battle against a random opponent at a random location. Winner doubles their stake.</small></button>
        <button class="mode" data-act="setup" data-k="br"><i style="background:var(--purple)"></i><span class="ico">👑</span><b>Battle Royale</b><small>${BR_PLAYERS} animals, one shrinking blizzard. Top 5 get paid, last one standing takes 8×.</small></button>
      </div>
      <div class="menu-foot"><button class="btn sm ghost" data-act="codex">📖 Armoury</button><button class="btn sm ghost" data-act="settings">⚙ Settings</button><button class="btn sm ghost" data-act="info">ℹ How it works</button>${p.coins < 25 ? '<button class="btn sm orange" data-act="relief">🦐 Claim Krill Relief (+500)</button>' : ''}<button class="btn sm ghost" data-act="fs">⛶ Fullscreen</button></div></div>`);
  }
  act_relief() { if (this.p.coins < 25) { this.p.coins += 500; store.save(); audio.coin(); } this.showMenu(); }
  act_fs() { const d = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else (d.requestFullscreen || d.webkitRequestFullscreen || (() => { })).call(d); }
  act_menu() { if (this.game.mode) this.game.stop(); this.game.paused = false; this.showMenu(); }
  act_open() { this.game.start(new OpenWorldMode({ profile: this.p, save: () => store.save() })); }
  act_setup(d) { const p = this.p; this.setup = { kind: d.k, faction: p.faction, cls: p.cls, stake: Math.min(100, STAKES.filter(s => s <= p.coins).pop() || 25), lobby: 'all' }; this.showSetup(); }
  showSetup() {
    const s = this.setup, p = this.p, br = s.kind === 'br';
    this.html(`<div class="screen center"><div class="card wide"><div class="row"><h2 class="grow">${br ? '👑 Battle Royale' : '⚔️ Skirmish'}</h2><span class="chip"><span class="coin">${p.coins}</span></span></div>
      <h3 style="margin-top:10px">Faction</h3>${this.factionPick(s.faction)}<h3>Role</h3>${this.classPick(s.faction, s.cls)}
      ${br ? `<h3>Lobby</h3><div class="tabs"><button class="opt ${s.lobby === 'all' ? 'on' : ''}" data-act="lobby" data-l="all"><b>All Animals</b></button><button class="opt ${s.lobby === 'own' ? 'on' : ''}" data-act="lobby" data-l="own"><b>${FACTIONS[s.faction].name} Only</b></button></div>` : ''}
      <h3>Stake</h3><div class="tabs">${STAKES.map(v => `<button class="opt ${v === s.stake ? 'on' : ''}" data-act="stake" data-v="${v}" ${v > p.coins ? 'disabled style="opacity:.4"' : ''}><b><span class="coin">${v}</span></b></button>`).join('')}</div>
      <p class="muted">${br ? `Payouts: 1st ${BR_TABLE[0][2]}× · 2nd ${BR_TABLE[1][2]}× · 3rd ${BR_TABLE[2][2]}× · 4th–5th stake back.` : `Victory pays ${SKIRMISH_PAY}× your stake.`}</p>
      <div class="row"><button class="btn ghost" data-act="menu">Back</button><span class="grow"></span><button class="btn orange big" data-act="deploy" ${s.stake > p.coins ? 'disabled' : ''}>Find match</button></div></div></div>`);
  }
  act_lobby(d) { this.setup.lobby = d.l; this.showSetup(); }
  act_stake(d) { if (+d.v <= this.p.coins) { this.setup.stake = +d.v; this.showSetup(); } }
  act_deploy() {
    const s = this.setup, p = this.p; if (s.stake > p.coins) return;
    p.coins -= s.stake; p.stats.games++; store.save();
    const fate = rollFate(s.kind), n = s.kind === 'br' ? BR_PLAYERS - 1 : 15, g = this.game;
    this.html(`<div class="overlay"><div class="card mm"><h2 id="mmT">Searching for players…</h2><p class="muted">${s.kind === 'br' ? (s.lobby === 'own' ? FACTIONS[s.faction].name + ' only lobby' : 'All animals lobby') : 'Random opponent · random location'} · region: South Pole</p><ul id="mmL"><li class="me">${esc(p.name)}<span>${EMOJI[s.faction]}</span></li></ul></div></div>`);
    let i = 0; const idx0 = g.nameIdx;
    const step = () => { if (!$('mmL')) return; if (i < n) { const k = 1 + Math.floor(Math.random() * 3); for (let j = 0; j < k && i < n; j++, i++) { const li = document.createElement('li'); li.innerHTML = `${esc(g.botName())}<span>${Math.floor(18 + Math.random() * 60)}ms</span>`; $('mmL').appendChild(li); } setTimeout(step, 120 + Math.random() * 380); } else { $('mmT').textContent = 'Match found!'; audio.coin(); g.nameIdx = idx0; setTimeout(() => { if ($('mmL')) g.start(new (s.kind === 'br' ? BRMode : SkirmishMode)({ faction: s.faction, cls: s.cls, stake: s.stake, lobby: s.lobby, fate, profile: p })); }, 900); } };
    setTimeout(step, 500);
  }
  result(o) {
    const p = this.p; this.game.input.setEnabled(false); p.coins += o.payout; if (o.win) p.stats.wins++; p.stats.kills += o.kills; store.save(); o.payout > 0 ? audio.win() : audio.lose();
    setTimeout(() => { this.overlay = 'result'; this.html(`<div class="overlay"><div class="card result ${o.payout >= o.stake ? 'win' : 'lose'}"><h1>${o.title}</h1><p class="muted" style="text-align:center">${esc(o.sub)} · ${o.kills} takedowns</p><div class="pay">${o.payout > 0 ? `+<span class="coin">${o.payout}</span>` : `Stake lost: ${o.stake}`}</div><p class="muted" style="text-align:center">Balance <span class="coin">${p.coins}</span></p><div class="row" style="justify-content:center"><button class="btn ghost" data-act="menu">Main menu</button><button class="btn orange" data-act="again">Play again</button></div></div></div>`); }, 900);
  }
  act_again() { const k = this.game.mode.kind, s = this.setup; this.game.stop(); this.setup = { ...s, kind: k, stake: Math.min(s.stake, STAKES.filter(v => v <= this.p.coins).pop() || 25) }; this.showSetup(); }

  // ---------- in-game overlays ----------
  open(name, html, freeze) { this.overlay = name; this.game.input.setEnabled(false); if (freeze) this.game.paused = true; this.html(html); }
  act_resume() { this.overlay = null; this.game.paused = false; this.html(''); this.game.input.setEnabled(true); }
  pause() {
    if (this.overlay) { if (this.overlay !== 'result') this.act_resume(); return; } const m = this.game.mode;
    this.open('pause', `<div class="overlay"><div class="card" style="width:min(380px,100%)"><h2>Paused</h2><p class="muted">${m.kind === 'open' ? 'Progress is saved automatically.' : 'The match is live. Leaving now forfeits your stake.'}</p><div class="gap"></div><div style="display:grid;gap:10px"><button class="btn orange" data-act="resume">Resume</button><button class="btn ghost" data-act="settings">Settings</button><button class="btn ghost" data-act="controls">Controls</button><button class="btn red" data-act="menu">${m.kind === 'open' ? 'Save & quit' : 'Forfeit & quit'}</button></div></div></div>`, m.kind === 'open');
  }
  act_controls() { this.html(`<div class="overlay"><div class="card"><h2>Controls</h2><table class="table"><tr><td>Move / Sprint (penguins belly-slide)</td><td>WASD / Shift</td></tr><tr><td>Aim / Fire / Zoom</td><td>Mouse / LMB / RMB</td></tr><tr><td>Jump</td><td>Space</td></tr><tr><td>Swap weapon</td><td>1 · 2 · wheel</td></tr><tr><td>Reload</td><td>R</td></tr><tr><td>Special ability</td><td>Q</td></tr><tr><td>Interact / vehicles / boards</td><td>E</td></tr><tr><td>Map</td><td>M</td></tr><tr><td>Touch</td><td>Left stick moves, drag right side to aim, push stick far to sprint</td></tr></table><div class="gap"></div><button class="btn" data-act="${this.game.mode ? 'resume' : 'menu'}">OK</button></div></div>`); }
  toggleMap() {
    if (this.overlay === 'map') return this.act_resume(); if (this.overlay) return;
    const g = this.game, m = g.mode; this.open('map', `<div class="overlay" data-act="resume"><div class="card wide"><div class="row"><h2 class="grow">Antarctica</h2><button class="btn sm" data-act="resume">Close</button></div><div class="gap"></div><canvas id="bigmap" width="${NX * 3}" height="${NZ * 3}"></canvas><p class="muted">${Object.keys(FACTIONS).map(f => `<span style="color:${FACTIONS[f].css}">●</span> ${FACTIONS[f].name}`).join(' &nbsp; ')} &nbsp; <span style="color:#ffd23a">◆</span> objective</p></div></div>`, m.kind === 'open');
    const c = $('bigmap').getContext('2d'), S = 3 / CELL, X = x => (x - X0) * S, Z = z => (z - Z0) * S;
    c.imageSmoothingEnabled = true; c.drawImage(g.world.mapCanvas, 0, 0, NX * 3, NZ * 3); c.font = '800 13px ui-rounded, system-ui, sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.9)';
    for (const l of g.world.locs) { c.fillStyle = FACTIONS[l.f].css; c.beginPath(); c.arc(X(l.x), Z(l.z), 4 + l.size, 0, 6.3); c.fill(); c.stroke(); if (l.size > 1) { c.strokeText(l.name, X(l.x), Z(l.z) - 10); c.fillStyle = '#12305c'; c.fillText(l.name, X(l.x), Z(l.z) - 10); } }
    for (const k of m.markers()) { c.fillStyle = k.col; c.fillRect(X(k.x) - 6, Z(k.z) - 6, 12, 12); c.strokeRect(X(k.x) - 6, Z(k.z) - 6, 12, 12); }
    const z = m.hud().zone; if (z) { c.strokeStyle = '#fff'; c.beginPath(); c.arc(X(z.x), Z(z.z), z.r * S, 0, 6.3); c.stroke(); }
    const p = g.player.pos; c.fillStyle = '#ff3a4a'; c.strokeStyle = '#fff'; c.beginPath(); c.arc(X(p.x), Z(p.z), 7, 0, 6.3); c.fill(); c.stroke();
  }
  openBoard(mode, loc) {
    const p = this.p, s = mode.sortie;
    const body = s ? `<p>Current loot: <b class="coin">${mode.loot()}</b> (×${s.mult.toFixed(2)} of your ${s.stake} stake).</p><p class="muted">Bank now to keep it, or keep running missions for more. If you are taken down before banking, the loot and stake are lost.</p><div class="row"><button class="btn ghost" data-act="resume">Keep going</button><span class="grow"></span><button class="btn orange big" data-act="bank" ${mode.loot() > 0 ? '' : 'disabled'}>Bank loot</button></div>`
      : `<p>Start a <b>sortie</b>: put up a stake, then earn loot from missions, takedowns and battles. Bank it at any friendly board.</p><p class="muted">Balance <span class="coin">${p.coins}</span></p><div class="tabs">${STAKES.map(v => `<button class="btn ${v > p.coins ? 'ghost' : 'orange'}" data-act="sortie" data-v="${v}" ${v > p.coins ? 'disabled' : ''}><span class="coin">${v}</span></button>`).join('')}</div><button class="btn ghost" data-act="resume">Not now</button>`;
    this.boardMode = mode; this.open('board', `<div class="overlay"><div class="card"><h2>📋 ${esc(loc.name)} Mission Board</h2><p class="muted">${loc.kind} · ${FACTIONS[loc.f].name}</p>${body}</div></div>`, true);
  }
  act_sortie(d) { const v = +d.v, p = this.p; if (v > p.coins) return; p.coins -= v; store.save(); this.boardMode.startSortie(v, rollFate('sortie')); this.act_resume(); }
  act_bank() { const v = this.boardMode.bank(); this.act_resume(); this.toast(`Banked ${v} coins! Balance ${this.p.coins}`); }
  act_codex(d) {
    const f = (d && d.f) || 'penguins';
    this.html(`<div class="overlay"><div class="card wide codex"><div class="row"><h2 class="grow">📖 Armoury</h2><button class="btn sm" data-act="menu">Close</button></div><div class="tabs">${Object.keys(FACTIONS).map(k => `<button class="opt ${k === f ? 'on' : ''}" style="--sel:${FACTIONS[k].css}" data-act="codex" data-f="${k}"><b>${EMOJI[k]} ${FACTIONS[k].name}</b></button>`).join('')}</div><p><b>${FACTIONS[f].tag}.</b> ${FACTIONS[f].blurb}</p>
      <h3>Personnel</h3><dl>${CLASSES[f].map(c => `<div><dt>${c.name}</dt><dd>${c.desc || 'Non-playable faction unit.'} <i>${c.w.map(w => WEAPONS[w].name).join(', ')}</i></dd></div>`).join('')}</dl>
      ${CODEX.filter(c => c.f === f).map(c => `<h3>${c.cat}</h3><dl>${c.items.map(([n, t]) => `<div><dt>${n}</dt><dd>${t}</dd></div>`).join('')}</dl>`).join('')}</div></div>`);
  }
  act_settings() {
    const s = store.data.settings, back = this.game.mode ? 'resume' : 'menu';
    this.html(`<div class="overlay"><div class="card"><h2>⚙ Settings</h2><h3 style="margin-top:12px">Graphics <span class="muted">(applies after reload)</span></h3><div class="tabs">${['Low', 'Medium', 'High'].map((n, i) => `<button class="opt ${s.quality === i ? 'on' : ''}" data-act="q" data-v="${i}"><b>${n}</b></button>`).join('')}</div>
      <h3>Look sensitivity</h3><input type="range" min="0.3" max="2.5" step="0.05" value="${s.sens}" id="sSens"><h3>Volume</h3><input type="range" min="0" max="1" step="0.05" value="${s.volume}" id="sVol">
      <div class="tabs"><button class="opt ${s.invertY ? 'on' : ''}" data-act="inv"><b>Invert Y: ${s.invertY ? 'On' : 'Off'}</b></button></div><div class="row"><button class="btn" data-act="${back}">Done</button></div></div></div>`);
    $('sSens').oninput = e => { s.sens = +e.target.value; this.game.input.sens = s.sens; store.save(); }; $('sVol').oninput = e => { s.volume = +e.target.value; audio.setVolume(s.volume); store.save(); };
  }
  act_q(d) { store.data.settings.quality = +d.v; store.save(); this.act_settings(); }
  act_inv() { const s = store.data.settings; s.invertY = !s.invertY; store.save(); this.act_settings(); }
  act_info() {
    this.html(`<div class="overlay"><div class="card"><h2>ℹ How it works</h2><p>Antarctic Warfare is an action game wrapped around a <b>game of chance</b>. Coins are play money with no cash value.</p><p>The result of every staked round is drawn at random <b>before</b> the round starts. Your play changes how the battle looks and feels, not who wins. Other "players" are simulated.</p>
      <table class="table"><tr><td>Skirmish: chance of victory</td><td>${(SKIRMISH_WIN * 100).toFixed(1)}% · pays ${SKIRMISH_PAY}×</td></tr>${BR_TABLE.map(([p, pr, m]) => `<tr><td>Battle Royale: finish #${p}</td><td>${(pr * 100).toFixed(0)}% · pays ${m}×</td></tr>`).join('')}<tr><td>Open World sortie</td><td>Hunters arrive at a hidden loot multiplier. Bank before they do. ~95% return.</td></tr></table>
      <div class="gap"></div><button class="btn" data-act="menu">Got it</button></div></div>`);
  }

  // ---------- HUD ----------
  toast(t) { const el = document.createElement('div'); el.textContent = t; const box = $('toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => el.remove(), 4200); }
  feed(k, v, how) {
    const p = this.game.player, cls = c => c === p ? 'me' : p && !this.game.hostile(p, c) ? 'a' : 'e', el = document.createElement('div');
    el.innerHTML = how === 'storm' || !k ? `<span class="${cls(v)}">${esc(v.name)}</span> was lost to the blizzard` : `<span class="${cls(k)}">${esc(k.name)}</span> ${how === 'roadkill' ? '🛷' : how === 'blast' ? '💥' : '❄'} <span class="${cls(v)}">${esc(v.name)}</span>`;
    const box = $('feed'); box.appendChild(el); while (box.children.length > 5) box.firstChild.remove(); setTimeout(() => el.remove(), 6000);
  }
  hurt() { const v = $('vignette'); v.style.transition = 'none'; v.style.opacity = 0.75; requestAnimationFrame(() => { v.style.transition = 'opacity .6s'; v.style.opacity = 0; }); }
  hitmarker(kill) { const c = $('crosshair'); c.classList.remove('hit', 'kill'); void c.offsetWidth; c.classList.add(kill ? 'kill' : 'hit'); clearTimeout(this.hmT); this.hmT = setTimeout(() => c.classList.remove('hit', 'kill'), 120); }
  update() {
    const g = this.game, p = g.player, m = g.mode; if (!p || !m) return; this.frame++;
    const info = m.hud(), slot = p.weapons[p.cur];
    if (this.frame % 4 === 0) {
      $('hpFill').style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%'; $('hpText').textContent = Math.ceil(Math.max(0, p.hp)) + ' / ' + p.maxHp; $('hpFill').style.filter = p.hp < p.maxHp * 0.35 ? 'hue-rotate(-110deg)' : '';
      $('wName').textContent = p.vehicle ? { waddle: 'Waddle Technical', gentoo: 'P2 Gentoo', manta: 'Manta SDV' }[p.vehicle.type] : slot.def.name;
      $('wAmmo').innerHTML = p.vehicle ? '' : p.reload > 0 ? '<small>reloading…</small>' : slot.def.type === 'melee' ? '<small>melee</small>' : `${slot.ammo}<small> / ${slot.def.mag}</small>`;
      $('spIcon').textContent = SPECIALS[p.cls.special].icon; $('spFill').style.height = clamp(p.specialCd / SPECIALS[p.cls.special].cd * 100, 0, 100) + '%';
      $('btnSpecial').style.opacity = p.specialCd > 0 ? 0.4 : 1;
      if (this.topHtml !== info.top) $('topbar').innerHTML = this.topHtml = info.top; $('objective').textContent = info.objective || '';
      const dm = $('deadmsg'); dm.hidden = !info.dead; if (info.dead) dm.textContent = info.dead;
      const pr = $('prompt'); pr.hidden = !info.prompt; if (info.prompt) pr.innerHTML = `<kbd>E</kbd>${info.prompt}`; $('btnUse').style.visibility = info.prompt ? 'visible' : 'hidden'; if (info.prompt) $('btnUse').textContent = info.prompt.split(' ')[0].toUpperCase();
      $('coinsHud').innerHTML = `<span class="coin">${this.p.coins}</span>`; $('crosshair').classList.toggle('foe', !!g.aimEnemy); $('crosshair').style.visibility = p.alive ? 'visible' : 'hidden';
    }
    if (this.frame % 2 === 0) this.drawMini(info);
    this.drawPlates();
  }
  drawMini(info) {
    const g = this.game, p = g.player, c = this.mini, R = 200, S = 75 / R, px = (p.pos.x - X0) / CELL, pz = (p.pos.z - Z0) / CELL, r = R / CELL;
    c.fillStyle = '#0d3a80'; c.fillRect(0, 0, 150, 150); c.drawImage(g.world.mapCanvas, px - r, pz - r, r * 2, r * 2, 0, 0, 150, 150);
    const X = x => 75 + (x - p.pos.x) * S, Z = z => 75 + (z - p.pos.z) * S;
    for (const l of g.world.locs) { const x = X(l.x), z = Z(l.z); if (x < -10 || x > 160 || z < -10 || z > 160) continue; c.fillStyle = FACTIONS[l.f].css; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.rect(x - 4, z - 4, 8, 8); c.fill(); c.stroke(); }
    if (info.zone) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(X(info.zone.x), Z(info.zone.z), info.zone.r * S, 0, 6.3); c.stroke(); }
    for (const o of g.chars) { if (!o.alive || o === p) continue; const d = Math.hypot(o.pos.x - p.pos.x, o.pos.z - p.pos.z); if (d > R) continue; const h = g.hostile(p, o); if (h && d > 70 && g.time - o.lastShot > 2) continue; c.fillStyle = h ? '#ff4a4a' : '#3aa0ff'; c.beginPath(); c.arc(X(o.pos.x), Z(o.pos.z), 3, 0, 6.3); c.fill(); }
    for (const v of g.vehicles) { if (v.driver) continue; const x = X(v.pos.x), z = Z(v.pos.z); if (x > 0 && x < 150 && z > 0 && z < 150) { c.fillStyle = '#fff'; c.fillRect(x - 2, z - 2, 4, 4); } }
    for (const k of g.mode.markers()) { let dx = (k.x - p.pos.x) * S, dz = (k.z - p.pos.z) * S; const d = Math.hypot(dx, dz); if (d > 66) { dx *= 66 / d; dz *= 66 / d; } c.fillStyle = k.col; c.strokeStyle = '#12305c'; c.lineWidth = 2; c.save(); c.translate(75 + dx, 75 + dz); c.rotate(0.785); c.fillRect(-5, -5, 10, 10); c.strokeRect(-5, -5, 10, 10); c.restore(); }
    c.save(); c.translate(75, 75); c.rotate(-g.camYaw + Math.PI); c.fillStyle = '#fff'; c.strokeStyle = '#12305c'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 7); c.lineTo(0, 3); c.lineTo(-6, 7); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  drawPlates() {
    const g = this.game, p = g.player, c = this.ovc, d = this.ovd, W = this.ov.width, H = this.ov.height; c.clearRect(0, 0, W, H); if (this.overlay && this.overlay !== 'result') return;
    c.font = `800 ${12 * d}px ui-rounded, system-ui, sans-serif`; c.textAlign = 'center';
    for (const o of g.chars) {
      if (!o.alive || o === p) continue; const dist = o.pos.distanceTo(p.pos), h = g.hostile(p, o);
      if (dist > (h ? 55 : 90) && o !== g.aimEnemy && !(h && g.time - o.lastHit < 3 && o.lastAttacker === p)) continue;
      _v.set(o.pos.x, o.pos.y + o.h + 0.45, o.pos.z).project(g.camera); if (_v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) continue;
      const x = (_v.x * 0.5 + 0.5) * W, y = (-_v.y * 0.5 + 0.5) * H, a = clamp(1.3 - dist / 90, 0.35, 1);
      c.globalAlpha = a; c.lineWidth = 3 * d; c.strokeStyle = 'rgba(18,48,92,.8)'; c.strokeText(o.name, x, y); c.fillStyle = h ? '#ff8a8a' : '#9fd6ff'; c.fillText(o.name, x, y);
      if (o.hp < o.maxHp) { const w = 40 * d; c.fillStyle = 'rgba(18,48,92,.7)'; c.fillRect(x - w / 2, y + 4 * d, w, 5 * d); c.fillStyle = h ? '#ff5a5a' : '#5fe08f'; c.fillRect(x - w / 2, y + 4 * d, w * clamp(o.hp / o.maxHp, 0, 1), 5 * d); }
    }
    c.globalAlpha = 1;
  }
}
