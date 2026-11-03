// 离线缓存 Service Worker —— 策略：Cache-First（有缓存先给，后台网络更新）
// 这样 iPad 首次加载后就能完全离线，更新时静默覆盖缓存

const CACHE_NAME = 'novel-outline-v1';
const PRECACHE_URLS = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安装时预缓存基础资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// 激活时清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 拦截所有请求
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // 只处理 GET 请求，忽略 POST/PUT 等（它们是写操作，不走缓存）
  if (req.method !== 'GET') return;

  // Stale-While-Revalidate：先用缓存快显，后台网络更新缓存
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => cached); // 网络也失败，退回缓存
      return cached || networkFetch;
    })
  );
});
