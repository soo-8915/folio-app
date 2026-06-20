const CACHE_NAME = 'folio-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 앱 파일(HTML/manifest/아이콘)은 캐시 우선, 그 외(가격 조회 API 등)는 항상 네트워크로
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isCoreAsset = url.origin === self.location.origin;

  if (!isCoreAsset) return; // 외부 API 호출은 서비스워커가 가로채지 않음

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});
