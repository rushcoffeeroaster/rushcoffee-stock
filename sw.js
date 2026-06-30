/* Rush Coffee · Service Worker — รองรับติดตั้งเป็นแอป (PWA) + เปิดเร็ว/ออฟไลน์เบื้องต้น
   หมายเหตุ: ไม่แคชการเรียก API (Apps Script) และรูปจาก Google Drive เพื่อให้ข้อมูลสดเสมอ */
const CACHE = "rush-coffee-v9";
const SHELL = [
  "./", "index.html", "dashboard.html", "menu-cost.html", "attendance.html", "report.html", "bakery.html", "order.html", "order-qr.html",
  "manifest.json", "order-manifest.json", "pwa-install.js", "icon-192.png", "icon-512.png", "icon-180.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // ข้อมูลสด: ไม่แตะ (ปล่อยไปเครือข่ายปกติ) — Apps Script API + รูป Drive
  if (url.hostname.indexOf("script.google.com") >= 0 ||
      url.hostname.indexOf("googleusercontent.com") >= 0 ||
      url.hostname.indexOf("drive.google.com") >= 0) {
    return;
  }

  // หน้าเว็บ (HTML): network-first เพื่อให้ได้เวอร์ชันล่าสุดเสมอ, ออฟไลน์ค่อย fallback แคช
  const isHTML = req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") >= 0;
  if (isHTML) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
    );
    return;
  }

  // ไฟล์สแตติก (ไอคอน, ฟอนต์, chart.js): cache-first + เติมแคชเบื้องหลัง
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
