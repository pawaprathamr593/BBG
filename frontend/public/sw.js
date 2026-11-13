/* BBG public-shell service worker. Never cache API, identity, tenant or payment data. */
const CACHE_NAME = 'bbg-public-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/offline.html', '/icons/bbg.svg', '/favicon.ico'];
const HASHED_BUNDLE = /^\/(?:main|polyfills|styles|chunk)-[A-Za-z0-9_-]+\.(?:js|css)$/i;
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('bbg-public-shell-') && key !== CACHE_NAME)
      .map((key) => caches.delete(key))
  )));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;
  if (url.pathname.startsWith('/api/') || /token|auth|payment|proof|admin|tenant|uploads|media/i.test(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline.html')) || Response.error()));
    return;
  }
  const approvedStaticAsset = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')
    || HASHED_BUNDLE.test(url.pathname) || SHELL.includes(url.pathname);
  if (approvedStaticAsset) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })));
  }
});
