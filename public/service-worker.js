// vocab-pwa · Service Worker (v2: 自动 cache-busting)
// 策略：cache-first + 后台更新；CACHE_VERSION 由 deploy workflow 自动 bump

const CACHE_VERSION = 'v2';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=2',
  './app.js?v=2',
  './data.js?v=2',
  './phrases.js?v=2',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png',
  'https://cdn.jsdelivr.net/npm/marked@4/marked.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        // 删所有非 v2 的旧缓存
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
        }
        return response;
    }).catch(() => cached);
    })
  );
});
