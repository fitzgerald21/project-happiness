// Offline support. Network-first so updates show up right away when online,
// with a cached copy when offline. Bump VERSION to clear old caches.
const VERSION = 'ph-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
  'js/app.js',
  'js/config.js',
  'js/store.js',
  'js/lib/audio.js',
  'js/lib/charts.js',
  'js/lib/content.js',
  'js/lib/dates.js',
  'js/lib/putdown.js',
  'js/lib/util.js',
  'js/lib/wakelock.js',
  'js/views/experiments.js',
  'js/views/pause.js',
  'js/views/reflect.js',
  'js/views/settings.js',
  'js/views/sit.js',
  'js/views/today.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
      const res = await Promise.race([fetch(req), timeout]);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
