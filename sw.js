// Offline support. The app's own files are network-first, so updates show up right away when online, with a
// cached copy when offline. Recordings (voice, instruments, scene sounds) and the Firebase, three.js and font files
// never change, so they are cache-first and only fetched the first time they're needed.
// Bump VERSION when you ship changes.
const VERSION = 'ph-v2';
const MEDIA = 'ph-media-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
  'vendor/instruments.js',
  'vendor/tones.js',
  'vendor/samples/manifest.js',
  'book/css/shell.css',
  'book/css/styles.css',
  'book/js/ai.js',
  'book/js/assist.js',
  'book/js/book.js',
  'book/js/book3d.js',
  'book/js/cover.js',
  'book/js/covers.js',
  'book/js/dates.js',
  'book/js/modelpicker.js',
  'book/js/pagetex.js',
  'book/js/settings.js',
  'book/js/store.js',
  'book/js/ui.js',
  'book/shell.js',
  'js/app.js',
  'js/config.js',
  'js/content/concepts.js',
  'js/content/stages.js',
  'js/data/cloud.js',
  'js/data/store.js',
  'js/lib/bookdoor.js',
  'js/lib/charts.js',
  'js/lib/content.js',
  'js/lib/dates.js',
  'js/lib/day.js',
  'js/lib/experiments.js',
  'js/lib/page.js',
  'js/lib/putdown.js',
  'js/lib/sky.js',
  'js/lib/util.js',
  'js/lib/wakelock.js',
  'js/sit/ambient.js',
  'js/sit/audio.js',
  'js/sit/common.js',
  'js/sit/figure.js',
  'js/sit/player.js',
  'js/sit/prep.js',
  'js/sit/remote.js',
  'js/sit/review.js',
  'js/sit/scenes.js',
  'js/sit/script.js',
  'js/sit/tonePresets.js',
  'js/sit/voice.js',
  'js/sit/voiceClips.js',
  'js/sit/voiceKey.js',
  'js/views/book.js',
  'js/views/path.js',
  'js/views/pause.js',
  'js/views/settings.js',
  'js/views/sit.js',
  'js/views/today.js',
];
const isMedia = (url) => /\.(mp3|jpg|png|woff2?)$/.test(url.pathname) || url.hostname === 'www.gstatic.com' || url.hostname === 'cdn.jsdelivr.net' || url.hostname.startsWith('fonts.g');

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== MEDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (isMedia(url)) {
    e.respondWith((async () => {
      const cache = await caches.open(MEDIA);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;
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
