// Tiny WebAudio synth for sound effects (no asset files).
let ctx = null, noise = null, master = null;
export const audio = {
  volume: 0.6,
  init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = this.volume; master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  },
  setVolume(v) { this.volume = v; if (master) master.gain.value = v; },
  tone(freq, dur, type = 'sine', vol = 0.2, slide = 0) {
    if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
  },
  burst(dur, freq, vol = 0.3, q = 1, type = 'lowpass') {
    if (!ctx) return; const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
    s.buffer = noise; f.type = type; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.25), t + dur); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5, dur);
  },
  // dist attenuates world sounds
  shot(type, dist = 0) {
    const v = Math.max(0, 1 - dist / 140); if (v <= 0.02) return;
    if (type === 'sniper') { this.burst(0.35, 2600, 0.5 * v, 0.7); this.tone(160, 0.25, 'triangle', 0.25 * v, -110); }
    else if (type === 'launcher') { this.burst(0.3, 500, 0.45 * v); this.tone(110, 0.3, 'sine', 0.3 * v, -60); }
    else if (type === 'shotgun') { this.burst(0.25, 1500, 0.55 * v, 0.5); }
    else if (type === 'flame') { this.burst(0.12, 3500, 0.1 * v, 0.5, 'bandpass'); }
    else if (type === 'melee') { this.burst(0.12, 900, 0.2 * v, 2, 'bandpass'); }
    else { this.burst(0.09, 1900, 0.28 * v, 1.5, 'bandpass'); this.tone(420, 0.06, 'square', 0.05 * v, -250); }
  },
  explode(dist = 0) { const v = Math.max(0, 1 - dist / 260); if (v > 0.02) { this.burst(0.8, 700, 0.8 * v); this.tone(70, 0.6, 'sine', 0.5 * v, -40); } },
  hit() { this.tone(900, 0.05, 'square', 0.08); },
  kill() { this.tone(660, 0.09, 'triangle', 0.18); setTimeout(() => this.tone(990, 0.14, 'triangle', 0.18), 80); },
  hurt() { this.burst(0.12, 400, 0.3); },
  ui() { this.tone(520, 0.06, 'triangle', 0.12); },
  coin() { this.tone(880, 0.08, 'triangle', 0.15); setTimeout(() => this.tone(1320, 0.16, 'triangle', 0.15), 70); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.2), i * 130)); },
  lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.2), i * 170)); },
  engine(on) { /* reserved */ },
};
