// 파프짐 체력평가 — 앱 설치(PWA)용 서비스 워커
// 역할: (1) 크롬/안드로이드 '앱 설치' 조건 충족 (2) 인터넷이 끊겼을 때 /offline 안내
//       (3) 정적 자산(/_next/static, 아이콘, 로고)만 네트워크 우선 + 캐시 백업
// 주의: API 호출과 회원·평가 데이터는 절대 캐시하지 않는다 (항상 서버 최신값).
const VERSION = 'pafgym-fa-v1';
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/pafgym-logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(pathname) {
  return pathname.startsWith('/_next/static/') || pathname.startsWith('/icons/')
    || pathname === '/pafgym-logo.png' || pathname === '/body-posture.png';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 페이지 이동: 항상 네트워크. 실패(오프라인)했을 때만 안내 페이지.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_URL).then((r) =>
          r || new Response('인터넷이 연결되어 있지 않습니다.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
        )
      )
    );
    return;
  }

  // 정적 자산: 네트워크 우선, 성공하면 캐시에 복사, 실패하면 캐시.
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            event.waitUntil(caches.open(VERSION).then((c) => c.put(req, copy)));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || Response.error()))
    );
  }
  // 그 외(API 등)는 서비스 워커가 관여하지 않음
});
