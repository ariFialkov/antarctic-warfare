import { Input } from './input.js';
import { UI, store } from './ui.js';
import { Game } from './game.js';
import { audio } from './audio.js';

const canvas = document.getElementById('game'), loading = document.getElementById('loading');

function boot() {
  const s = store.data.settings;
  const input = new Input(canvas); input.sens = s.sens; audio.volume = s.volume;
  const ui = new UI();
  let game;
  try { game = new Game(canvas, input, ui, s); }
  catch (e) { console.error(e); document.getElementById('loadmsg').textContent = 'Could not start 3D graphics on this device (WebGL is required).'; return; }
  window.__aw = { game, ui, store }; // handy for debugging
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && game.mode && input.enabled && !ui.overlay && !input.touch) ui.pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode && input.enabled && !ui.overlay) ui.pause(); });
  addEventListener('pointerdown', () => audio.init(), { once: true });
  let last = performance.now();
  const loop = (t) => { requestAnimationFrame(loop); const dt = (t - last) / 1000; last = t; game.frame(dt); };
  requestAnimationFrame(loop);
  loading.style.opacity = 0; setTimeout(() => loading.remove(), 700);
  if (store.profile) ui.showMenu(); else ui.showSlots();
}
// let the loading screen paint before the (synchronous) world generation
requestAnimationFrame(() => setTimeout(boot, 30));

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
