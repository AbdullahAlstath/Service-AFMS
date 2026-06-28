// ServicePal Service Worker — installable PWA + on-demand manual caching
const CACHE = 'servicepal-v2';
const CORE = ['./ServicePal.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // PDFs: cache-first (once an engineer opens a manual, it works offline next time)
  if (url.pathname.endsWith('.pdf')) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        }
        return res;
      }))
    );
    return;
  }

  // App shell + everything else: network-first, fall back to cache offline
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200 && url.origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./ServicePal.html')))
  );
});
