/* Rush Coffee · ปุ่ม "ติดตั้งแอป" ในหน้าเว็บ (ใช้ร่วมทุกหน้า)
   - Android/Chrome: ดัก beforeinstallprompt แล้วกดติดตั้งได้เลย
   - iPhone/Safari: โชว์วิธีเพิ่มลงหน้าจอโฮม (iOS ไม่มี prompt อัตโนมัติ)
   - ซ่อนปุ่มเองถ้าเปิดจากไอคอน (ติดตั้งแล้ว) */
(function () {
  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  if (isStandalone()) return;

  var deferred = null;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  var css = document.createElement("style");
  css.textContent =
    ".pwa-install-btn{position:fixed;right:14px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:95;" +
    "display:none;align-items:center;gap:8px;padding:11px 17px;border:none;border-radius:999px;cursor:pointer;" +
    "font-family:inherit;font-size:13.5px;font-weight:800;color:var(--on-accent,#fff);" +
    "background:var(--accent-grad,linear-gradient(135deg,#8C95A1,#69727E));" +
    "box-shadow:0 8px 24px rgba(28,28,36,.25),inset 0 1px 0 rgba(255,255,255,.3);}" +
    ".pwa-install-btn svg{width:18px;height:18px;}" +
    ".pwa-install-btn.show{display:inline-flex;animation:pwaPop .25s ease;}" +
    "@keyframes pwaPop{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}" +
    ".pwa-ov{position:fixed;inset:0;background:rgba(24,22,20,.5);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);z-index:140;display:flex;align-items:flex-end;justify-content:center;}" +
    ".pwa-sheet{background:#fff;border-radius:20px 20px 0 0;max-width:520px;width:100%;padding:20px 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.2);font-family:inherit;color:#1E232A;animation:pwaPop .22s ease;}" +
    "@media(min-width:600px){.pwa-ov{align-items:center;padding:16px;}.pwa-sheet{border-radius:18px;max-width:380px;}}" +
    ".pwa-sheet h3{margin:0 0 8px;font-size:17px;font-weight:800;}" +
    ".pwa-sheet p{margin:7px 0;font-size:14px;color:#5D646E;line-height:1.6;}" +
    ".pwa-sheet b{color:#1E232A;}" +
    ".pwa-close{margin-top:16px;width:100%;padding:12px;border:none;border-radius:12px;font-family:inherit;font-weight:800;font-size:14px;color:#fff;background:#1E232A;cursor:pointer;}";
  document.head.appendChild(css);

  var btn = document.createElement("button");
  btn.className = "pwa-install-btn";
  btn.type = "button";
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>ติดตั้งแอป';
  function addBtn() { if (document.body) document.body.appendChild(btn); else window.addEventListener("DOMContentLoaded", function(){ document.body.appendChild(btn); }); }
  addBtn();

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    btn.classList.add("show");
  });
  window.addEventListener("appinstalled", function () {
    btn.classList.remove("show");
    deferred = null;
  });

  // iOS ไม่มี beforeinstallprompt → โชว์ปุ่มเพื่อกดดูวิธี
  if (isIOS) setTimeout(function () { btn.classList.add("show"); }, 1200);

  btn.addEventListener("click", function () {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; btn.classList.remove("show"); });
      return;
    }
    showSheet();
  });

  function showSheet() {
    var ov = document.createElement("div");
    ov.className = "pwa-ov";
    var steps = isIOS
      ? '<p>1. แตะปุ่ม <b>แชร์</b> (รูปสี่เหลี่ยมมีลูกศรขึ้น) ที่แถบล่างของ Safari</p>' +
        '<p>2. เลื่อนหา <b>"เพิ่มไปยังหน้าจอโฮม"</b> แล้วแตะ</p>' +
        '<p>3. แตะ <b>เพิ่ม</b> มุมขวาบน</p>'
      : '<p>เปิดเมนู <b>⋮</b> มุมขวาบนของ Chrome แล้วเลือก <b>"ติดตั้งแอป"</b> หรือ <b>"เพิ่มลงในหน้าจอหลัก"</b></p>' +
        '<p>หรือแตะไอคอนติดตั้งที่แถบที่อยู่เว็บด้านบน</p>';
    ov.innerHTML =
      '<div class="pwa-sheet"><h3>ติดตั้ง "Rush Coffee" ลงมือถือ</h3>' + steps +
      '<button class="pwa-close" type="button">เข้าใจแล้ว</button></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    ov.querySelector(".pwa-close").addEventListener("click", function () { ov.remove(); });
    document.body.appendChild(ov);
  }
})();
