// vocab-pwa · Service Worker
// 缓存策略：仅用 CACHE_VERSION 失效，不用 ?v= query
// 关键资源必须 cache；CDN 资源降级可选（内置浏览器可能屏蔽外网）

const CACHE_VERSION = 'v1.2.1';

const CRITICAL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './phrases.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png'
];

const OPTIONAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/marked@4/marked.min.js'  // 仅 changelog 页面用，缺失不影响主功能
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // 关键资源：必须全部成功
    await cache.addAll(CRITICAL_ASSETS);
    // 可选资源：失败不影响 install
    await Promise.all(OPTIONAL_ASSETS.map(async url => {
      try { await cache.add(url); } catch (e) { console.warn('[SW] 可选资源缓存失败:', url); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      // 只缓存同源资源（type === 'basic'）；cross-origin 留给浏览器
      if (response.ok && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
      }
      return response;
    } catch (e) {
      // 网络失败且无缓存：返回主页 fallback
      return caches.match('./index.html') || new Response('Offline', { status: 503 });
    }
  })());
});
