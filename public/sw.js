const CACHE_NAME = 'veltro-pro-shell-v1';
const APP_SCOPE = '/VELTRO-PRO/';
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Network-first: keep the app current and use the cached shell only when offline.
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && (request.mode === 'navigate' || new URL(request.url).pathname.startsWith(APP_SCOPE))) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return caches.match(APP_SCOPE);
      throw new Error('Offline and resource is not cached');
    }
  })());
});