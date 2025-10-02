const CACHE_NAME = 'app-cache-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/vite.svg',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css',
  '/public/manifest.json',
  '/index-Cujft3z8.js',
  '/index-D8b4DHJx.css'
  
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Evitar interferir con WebSockets y recarga en desarrollo de Vite
  if (event.request.url.includes('vite') || event.request.url.startsWith('ws')) {
    return;
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            if (event.request.url.startsWith('http')) {
              cache.put(event.request,responseClone);
            }
          });
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return caches.match(event.request, { ignoreSearch: true }).then((res) => {
            return res || caches.match('/vite.svg');
          });
        });
    })
  );
});