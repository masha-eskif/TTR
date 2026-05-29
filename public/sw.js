// Service worker для PWA. Стратегия network-first: при наличии сети всегда
// отдаём свежую версию (важно — сайт часто переразвёртывается), а кэш служит
// запасным вариантом при офлайне. WebSocket-релей SW не перехватывает.
const CACHE = 'ttr-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // только ресурсы своего origin

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const fallback = await caches.match('./');
          if (fallback) return fallback;
        }
        throw err;
      }
    })(),
  );
});
