const CACHE_NAME = 'folio-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 네트워크 우선으로 가져올 파일 (자주 바뀌는 앱 본체)
const NETWORK_FIRST = ['./', './index.html', './manifest.json'];

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

function isNetworkFirstPath(pathname) {
  return pathname === '/' || pathname.endsWith('/index.html') || pathname.endsWith('/manifest.json');
}

// 앱 파일(HTML/manifest/아이콘)은 origin 내 요청만 처리, 외부 API 호출은 항상 네트워크로
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isCoreAsset = url.origin === self.location.origin;

  if (!isCoreAsset) return; // 외부 API 호출은 서비스워커가 가로채지 않음

  // index.html / manifest.json: 네트워크 우선 (항상 최신 버전 시도, 실패 시 캐시로 폴백)
  if (isNetworkFirstPath(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 그 외 정적 파일(아이콘 등): 캐시 우선
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
