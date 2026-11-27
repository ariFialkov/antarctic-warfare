// Offline cache. Bump VERSION on every release so clients pick up new files.
const VERSION = 'aw-v6';
const FILES = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'vendor/three.module.min.js',
  'js/main.js', 'js/game.js', 'js/world.js', 'js/kit.js', 'js/towns.js', 'js/scatter.js', 'js/models.js', 'js/animals.js', 'js/modes.js', 'js/ui.js', 'js/input.js', 'js/audio.js', 'js/data.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// network-first so updates arrive when online; cache fallback when offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
