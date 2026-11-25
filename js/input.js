// Unified keyboard/mouse + touch input.
export class Input {
  constructor(canvas) {
    this.canvas = canvas; this.keys = {}; this.mx = 0; this.mz = 0; this.lookX = 0; this.lookY = 0;
    this.fire = false; this.ads = false; this.sprint = false; this.edges = {}; this.enabled = false;
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.sens = 1;
    addEventListener('keydown', e => { if (!this.enabled) return; if (!this.keys[e.code]) this.press(KEYMAP[e.code]); this.keys[e.code] = true; if (['Space', 'Tab'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; this.fire = false; });
    canvas.addEventListener('mousedown', e => { if (!this.enabled || this.touch) return; if (document.pointerLockElement !== canvas) { canvas.requestPointerLock?.(); return; } if (e.button === 0) this.fire = true; if (e.button === 2) this.ads = true; });
    addEventListener('mouseup', e => { if (e.button === 0) this.fire = false; if (e.button === 2) this.ads = false; });
    addEventListener('mousemove', e => { if (this.enabled && document.pointerLockElement === canvas) { this.lookX += e.movementX * 0.0023 * this.sens; this.lookY += e.movementY * 0.0023 * this.sens; } });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('wheel', e => { if (this.enabled) this.press('swap'); }, { passive: true });
    if (this.touch) this.initTouch();
  }
  press(name) { if (name) this.edges[name] = true; }
  take(name) { const v = this.edges[name]; this.edges[name] = false; return !!v; }
  setEnabled(on) { this.enabled = on; if (!on) { this.fire = false; this.ads = false; this.keys = {}; this.edges = {}; this.jx = this.jy = 0; if (document.pointerLockElement) document.exitPointerLock(); } else if (!this.touch) this.canvas.requestPointerLock?.(); }
  initTouch() {
    document.body.classList.add('touch');
    const stick = document.getElementById('stick'), nub = document.getElementById('nub'); this.jx = this.jy = 0;
    let moveId = null, lookId = null, ox = 0, oy = 0, lx = 0, ly = 0;
    const zone = document.getElementById('touchzone');
    const start = e => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.42 && moveId === null) { moveId = t.identifier; ox = t.clientX; oy = t.clientY; stick.style.display = 'block'; stick.style.left = ox + 'px'; stick.style.top = oy + 'px'; nub.style.transform = ''; }
        else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
      e.preventDefault();
    };
    const move = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === moveId) { let dx = t.clientX - ox, dy = t.clientY - oy; const d = Math.hypot(dx, dy), m = 55; if (d > m) { dx *= m / d; dy *= m / d; } this.jx = dx / m; this.jy = dy / m; this.sprint = d > 95; nub.style.transform = `translate(${dx}px,${dy}px)`; }
        else if (t.identifier === lookId) { this.lookX += (t.clientX - lx) * 0.0052 * this.sens; this.lookY += (t.clientY - ly) * 0.0052 * this.sens; lx = t.clientX; ly = t.clientY; }
      }
      e.preventDefault();
    };
    const end = e => { for (const t of e.changedTouches) { if (t.identifier === moveId) { moveId = null; this.jx = this.jy = 0; this.sprint = false; stick.style.display = 'none'; } if (t.identifier === lookId) { lookId = null; if (this.fireTouch === t.identifier) { this.fire = false; this.fireTouch = null; } } } };
    zone.addEventListener('touchstart', start, { passive: false }); zone.addEventListener('touchmove', move, { passive: false }); zone.addEventListener('touchend', end); zone.addEventListener('touchcancel', end);
    // fire button doubles as a look pad while held
    const fb = document.getElementById('btnFire');
    fb.addEventListener('touchstart', e => { if (!this.enabled) return; const t = e.changedTouches[0]; this.fire = true; if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; this.fireTouch = t.identifier; } e.preventDefault(); }, { passive: false });
    fb.addEventListener('touchmove', move, { passive: false }); fb.addEventListener('touchend', e => { this.fire = false; end(e); }); fb.addEventListener('touchcancel', e => { this.fire = false; end(e); });
    for (const [id, name] of [['btnJump', 'jump'], ['btnSwap', 'swap'], ['btnSpecial', 'special'], ['btnUse', 'use'], ['btnReload', 'reload'], ['btnMap', 'map'], ['btnPause', 'pause']]) {
      const el = document.getElementById(id); el.addEventListener('touchstart', e => { this.press(name); e.preventDefault(); e.stopPropagation(); }, { passive: false }); el.addEventListener('click', () => this.press(name));
    }
    const ads = document.getElementById('btnAds'); ads.addEventListener('touchstart', e => { this.ads = !this.ads; ads.classList.toggle('on', this.ads); e.preventDefault(); }, { passive: false });
  }
  update() {
    const k = this.keys;
    if (this.touch && (this.jx || this.jy)) { this.mx = this.jx; this.mz = -this.jy; }
    else { this.mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0); this.mz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0); if (!this.touch) this.sprint = !!(k.ShiftLeft || k.ShiftRight); }
  }
}
const KEYMAP = { Space: 'jump', KeyE: 'use', KeyF: 'use', KeyQ: 'special', KeyG: 'special', KeyR: 'reload', Digit1: 'w1', Digit2: 'w2', KeyM: 'map', Tab: 'map', Escape: 'pause', KeyP: 'pause', KeyX: 'swap' };
