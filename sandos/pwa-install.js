/* ============================================================================
   Rush Coffee · ปุ่มติดตั้งแอปลงมือถือ (PWA install)
   - Android/Chrome : ใช้ beforeinstallprompt → กดติดตั้งได้เลย
   - iOS/Safari     : ไม่มี API ให้เรียก จึงแสดงวิธีทำทีละขั้นแทน
   - ถ้าติดตั้งแล้ว  : ซ่อนทุกอย่างอัตโนมัติ
   เรียกใช้จากที่อื่นได้ด้วย  window.rushInstall.trigger()
   ============================================================================ */
(function () {
  var KEY = "rushInstallDismissed";
  var deferred = null;

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
           window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
           (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function isInAppBrowser() {
    return /line|fbav|fban|instagram|micromessenger/i.test(navigator.userAgent);
  }
  function el(id) { return document.getElementById(id); }

  /* ---------- แถบแนะนำด้านล่าง ---------- */
  function showBanner() {
    if (isStandalone() || el("rushInstallBar")) return;
    var bar = document.createElement("div");
    bar.id = "rushInstallBar";
    bar.setAttribute("style", [
      "position:fixed", "left:12px", "right:12px",
      "bottom:calc(88px + env(safe-area-inset-bottom))",
      "max-width:536px", "margin:0 auto", "z-index:110",
      "display:flex", "align-items:center", "gap:11px",
      "padding:12px 13px",
      "background:var(--surface,#fff)",
      "border:1px solid var(--line,#EAE7DF)",
      "border-radius:15px",
      "box-shadow:0 8px 26px rgba(28,28,36,.16)",
      "font-family:inherit",
      "animation:rushInsUp .3s cubic-bezier(.2,.8,.2,1)",
    ].join(";"));
    bar.innerHTML =
      '<div style="width:38px;height:38px;border-radius:11px;flex-shrink:0;display:grid;place-items:center;color:#fff;background:var(--accent-grad,linear-gradient(135deg,#8C95A1,#69727E))">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>' +
      '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<p style="margin:0;font-size:13.5px;font-weight:800;color:var(--ink,#1E232A)">ติดตั้งเป็นแอปบนมือถือ</p>' +
        '<p style="margin:2px 0 0;font-size:11.5px;color:var(--ink-3,#9A9FA8)">เปิดใช้ง่ายขึ้น เต็มจอ ไม่ต้องหาลิงก์</p>' +
      '</div>' +
      '<button id="rushInstallGo" style="flex-shrink:0;border:none;cursor:pointer;font-family:inherit;font-weight:800;font-size:13px;padding:10px 14px;border-radius:11px;color:var(--on-accent,#fff);background:var(--accent-grad,linear-gradient(135deg,#8C95A1,#69727E))">ติดตั้ง</button>' +
      '<button id="rushInstallX" aria-label="ปิด" style="flex-shrink:0;border:none;background:none;cursor:pointer;color:var(--ink-3,#9A9FA8);font-size:19px;line-height:1;padding:4px 2px">&times;</button>';

    if (!el("rushInsAnim")) {
      var st = document.createElement("style");
      st.id = "rushInsAnim";
      st.textContent = "@keyframes rushInsUp{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}";
      document.head.appendChild(st);
    }
    document.body.appendChild(bar);
    el("rushInstallGo").onclick = trigger;
    el("rushInstallX").onclick = function () {
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      hideBanner();
    };
  }
  function hideBanner() { var b = el("rushInstallBar"); if (b) b.remove(); }

  /* ---------- กล่องบอกวิธีติดตั้งบน iOS ---------- */
  function showHelp() {
    if (el("rushInstallHelp")) return;
    var ios = isIOS();
    var steps = ios
      ? '<li>แตะปุ่ม <b>แชร์</b> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;vertical-align:-2px"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg> ที่แถบล่างของ Safari</li>' +
        '<li>เลื่อนลงแล้วเลือก <b>เพิ่มไปยังหน้าจอโฮม</b></li>' +
        '<li>กด <b>เพิ่ม</b> มุมขวาบน</li>'
      : '<li>แตะปุ่ม <b>⋮</b> มุมขวาบนของเบราว์เซอร์</li>' +
        '<li>เลือก <b>ติดตั้งแอป</b> หรือ <b>เพิ่มลงในหน้าจอหลัก</b></li>';
    var warn = isInAppBrowser()
      ? '<p style="margin:10px 0 0;padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.6;background:var(--amber-bg,#FAF2DD);color:#8a6a14;font-weight:600">ตอนนี้เปิดอยู่ในแอปอื่น (LINE / Facebook) ซึ่งติดตั้งไม่ได้ — กด ⋯ แล้วเลือก "เปิดในเบราว์เซอร์" ก่อน</p>'
      : "";

    var wrap = document.createElement("div");
    wrap.id = "rushInstallHelp";
    wrap.setAttribute("style", "position:fixed;inset:0;z-index:130;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(24,22,20,.55);backdrop-filter:blur(3px)");
    wrap.innerHTML =
      '<div style="background:var(--surface,#fff);border-radius:20px;padding:22px 20px;width:100%;max-width:360px;box-shadow:0 10px 34px rgba(0,0,0,.24);font-family:inherit">' +
        '<p style="margin:0 0 3px;font-size:17px;font-weight:800;color:var(--ink,#1E232A)">ติดตั้งแอปลงมือถือ</p>' +
        '<p style="margin:0 0 12px;font-size:12.5px;color:var(--ink-2,#5D646E)">ทำตาม ' + (ios ? "3" : "2") + ' ขั้นตอนนี้</p>' +
        '<ol style="margin:0;padding-left:20px;font-size:13.5px;line-height:1.95;color:var(--ink,#1E232A)">' + steps + '</ol>' +
        warn +
        '<button id="rushHelpClose" style="width:100%;margin-top:16px;border:none;cursor:pointer;font-family:inherit;font-weight:800;font-size:14.5px;padding:13px;border-radius:12px;color:var(--on-accent,#fff);background:var(--accent-grad,linear-gradient(135deg,#8C95A1,#69727E))">เข้าใจแล้ว</button>' +
      '</div>';
    wrap.addEventListener("click", function (e) { if (e.target === wrap) wrap.remove(); });
    document.body.appendChild(wrap);
    el("rushHelpClose").onclick = function () { wrap.remove(); };
  }

  /* ---------- กดติดตั้ง ---------- */
  function trigger() {
    if (isStandalone()) { showInstalledToast(); return; }
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function (c) {
        if (c && c.outcome === "accepted") hideBanner();
        deferred = null;
      });
    } else {
      showHelp();
    }
  }
  function showInstalledToast() {
    var t = document.createElement("div");
    t.textContent = "ติดตั้งแอปนี้ไว้แล้ว";
    t.setAttribute("style", "position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:var(--ink,#1E232A);color:#fff;padding:11px 20px;border-radius:999px;font-size:13px;font-weight:600;z-index:140;font-family:inherit");
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  /* ---------- เริ่มทำงาน ---------- */
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    var dismissed = false;
    try { dismissed = !!localStorage.getItem(KEY); } catch (err) {}
    if (!dismissed) showBanner();
  });
  window.addEventListener("appinstalled", function () { deferred = null; hideBanner(); });

  // iOS ไม่ยิง beforeinstallprompt — ขึ้นแถบเองถ้ายังไม่ได้ติดตั้งและยังไม่เคยปิด
  window.addEventListener("load", function () {
    if (isStandalone()) return;
    var dismissed = false;
    try { dismissed = !!localStorage.getItem(KEY); } catch (err) {}
    if (isIOS() && !dismissed) setTimeout(showBanner, 1400);
  });

  window.rushInstall = { trigger: trigger, showHelp: showHelp, isStandalone: isStandalone };
})();
