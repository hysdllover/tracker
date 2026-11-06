const C = 'ht-v14';
const A = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];
// 설치 시 HTTP 캐시를 거치지 않고 최신 파일을 받음
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(A.map(u => new Request(u, { cache: 'reload' }))))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname.endsWith('github.com') || u.hostname.endsWith('githubusercontent.com')) return;
  if (u.origin === location.origin) {
    // 같은 사이트: 항상 서버에 최신 여부 확인(no-cache), 오프라인이면 저장본
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(C).then(x => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true })));
  } else {
    // 폰트 등 외부 리소스: 저장본 우선
    e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => { const c = r.clone(); caches.open(C).then(x => x.put(e.request, c)); return r; })));
  }
});
