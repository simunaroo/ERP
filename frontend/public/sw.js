// Service worker cua PWA: cai duoc len man hinh chinh, mo nhanh nho bo nho dem "vo" ung dung.
// - Tep tinh (JS/CSS/anh co ma bam trong ten): lay tu bo nho dem truoc (cache-first) — ten doi khi build lai nen khong cu.
// - Trang (dieu huong): mang truoc, mat mang thi tra index.html da luu (van mo duoc khung ung dung).
// - /api: KHONG bao gio luu dem (du lieu nghiep vu phai luon moi, va co token dang nhap).
const BAN = 'erp-nst-v1';
const VO = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(BAN).then((c) => c.addAll(VO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== BAN).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => {
      caches.open(BAN).then((c) => c.put('/', r.clone()));
      return r;
    }).catch(() => caches.match('/')));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(caches.match(req).then((daCo) => daCo || fetch(req).then((r) => {
      if (r.ok) { const ban = r.clone(); caches.open(BAN).then((c) => c.put(req, ban)); }
      return r;
    })));
  }
});
