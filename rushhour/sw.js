/* Rush Hour · service worker (offline shell) */
const CACHE = "rushhour-v3";
const ASSETS = [
  "./", "./index.html", "./manifest.json", "./pwa-install.js",
  "./icon-180.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./wordmark.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  // ปล่อยให้ Google Apps Script / Drive / ฟอนต์ วิ่งออกเน็ตตรง ๆ ไม่แคช
  if (u.origin !== location.origin) return;
  if (e.request.method !== "GET") return;

  const accept = e.request.headers.get("accept") || "";
  const isPage = e.request.mode === "navigate" || accept.indexOf("text/html") >= 0;

  if (isPage) {
    // หน้าเว็บ: เอาของใหม่จากเน็ตก่อนเสมอ — อัปเดตแล้วเห็นทันที
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // ไฟล์อื่น: หยิบจากแคชก่อน เร็วกว่า
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
      const copy = res.clone();
      if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }))
  );
});
