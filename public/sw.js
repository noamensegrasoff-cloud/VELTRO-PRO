const CACHE_NAME = 'veltro-pro-shell-v2';
const APP_SCOPE = '/VELTRO-PRO/';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const oldCaches = await caches.keys();
    await Promise.all(oldCaches.filter((name) => name.startsWith('veltro-pro-shell-') && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
    // Reload already-open app tabs so they stop running an older bundled interface.
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map((client) => client.navigate(client.url).catch(() => null)));
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Network-first: always prefer the latest deployed application.
  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response.ok && (request.mode === 'navigate' || new URL(request.url).pathname.startsWith(APP_SCOPE))) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
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
