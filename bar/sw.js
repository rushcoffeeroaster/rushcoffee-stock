/* Rush Coffee · bar — service worker (offline shell) */
const CACHE = "rush-bar-v6";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./pwa-install.js"];

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
    // หน้าเว็บ: เอาของใหม่จากเน็ตก่อนเสมอ — อัปเดตแล้วเห็นทันที ไม่ต้องลบแอปทิ้ง
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  // ไอคอน/สคริปต์: ใช้ของในเครื่องก่อน เร็วกว่า
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
