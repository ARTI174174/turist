const CACHE_NAME = 'turist-static-v1';
const MAX_CACHE_AGE_MS = 14 * 24 * 60 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('turist-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never cache authenticated or user-specific API responses.
  if (url.pathname.startsWith('/api/')) return;

  const isMapTile = url.pathname.includes('/tiles/');
  const isImage = /\.(?:png|jpe?g|webp|avif)$/i.test(url.pathname);
  if (!isMapTile && !(url.origin === self.location.origin && isImage)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      const storedAt = Number(cached.headers.get('x-turist-cached-at') || 0);
      if (storedAt && Date.now() - storedAt > MAX_CACHE_AGE_MS) await cache.delete(request);
      else return cached;
    }

    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      const headers = new Headers(response.headers);
      headers.set('x-turist-cached-at', String(Date.now()));
      await cache.put(request, new Response(await response.clone().blob(), { status: response.status, statusText: response.statusText, headers }));
    } else if (response.type === 'opaque') {
      await cache.put(request, response.clone());
    }
    const keys = await cache.keys();
    if (keys.length > 2200) await Promise.all(keys.slice(0, keys.length - 200).map((key) => cache.delete(key)));
    return response;
  })());
});
