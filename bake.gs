/*****************************************************************************************
 *  ครัวขนม (Bakery Production) — Google Apps Script backend สำหรับ bake.html
 *  ---------------------------------------------------------------------------------------
 *  วิธีติดตั้ง:
 *    1) สร้าง Google Sheet ใหม่ 1 ไฟล์ (เช่น "Rush Bakery")
 *    2) Extensions ▸ Apps Script ▸ วางโค้ดนี้ทับทั้งหมด ▸ บันทึก
 *    3) รันฟังก์ชัน setup() หนึ่งครั้ง — จะสร้างชีต Recipes / Daily / DrawLog / Photos ให้
 *    4) Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me ▸ Who has access: Anyone
 *    5) ก๊อปลิงก์ /exec ไปวางใน bake.html ตัวแปร BAKE_API
 *
 *  ★ การผูกกับสต๊อก: ใส่ "stockItemId" ในชีต Recipes ให้ตรงกับ id ของวัตถุดิบในแอปสต๊อก
 *    เมื่อกดเบิกในแอป ระบบจะตัดสต๊อกจริงให้ (ฝั่งหน้าเว็บเป็นคนเรียก StockAPI)
 *    ถ้าเว้นว่าง = ไม่ตัดสต๊อก แค่คิดต้นทุน
 *****************************************************************************************/

const SH_RECIPES = "Recipes";
const SH_DAILY   = "Daily";
const SH_DRAW    = "DrawLog";
const SH_PHOTOS  = "Photos";

// 1 แถว = 1 วัตถุดิบของเมนูหนึ่ง (หลายแถวรวมกันเป็น 1 สูตร)
const RECIPE_HEADERS = ["itemId", "name", "category", "unit", "yieldPerBatch",
                        "ingredient", "qty", "ingredientUnit", "stockItemId", "unitCost", "active"];
const DAILY_HEADERS  = ["date", "itemId", "batches", "baked", "sold", "waste", "wasteReason", "note", "updated"];
const DRAW_HEADERS   = ["id", "date", "itemId", "batches", "cost", "by", "created"];
const PHOTO_HEADERS  = ["id", "date", "url", "caption", "created"];

const PHOTO_FOLDER_NAME = "Rush Bakery Photos";

/* ====================== ติดตั้งครั้งแรก ====================== */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, SH_RECIPES, RECIPE_HEADERS);
  ensureSheet(ss, SH_DAILY,   DAILY_HEADERS);
  ensureSheet(ss, SH_DRAW,    DRAW_HEADERS);
  ensureSheet(ss, SH_PHOTOS,  PHOTO_HEADERS);

  const sh = ss.getSheetByName(SH_RECIPES);
  if (sh.getLastRow() < 2) sh.getRange(2, 1, seedRecipes().length, RECIPE_HEADERS.length).setValues(seedRecipes());

  Logger.log("setup เสร็จแล้ว ✓ ต่อไป Deploy เป็น Web app แล้วเอา /exec ไปใส่ใน bake.html");
}

// สูตรตัวอย่าง — แก้/เพิ่มได้ในชีต Recipes ได้เลย
function seedRecipes() {
  return [
    ["CR","ครัวซอง","ครัวซอง","ชิ้น",24,"แป้งขนมปัง",1000,"g","",0.045,"yes"],
    ["CR","ครัวซอง","ครัวซอง","ชิ้น",24,"เนยจืดแผ่น",500,"g","",0.32,"yes"],
    ["CR","ครัวซอง","ครัวซอง","ชิ้น",24,"นมสด",250,"ml","",0.038,"yes"],
    ["CR","ครัวซอง","ครัวซอง","ชิ้น",24,"ยีสต์",20,"g","",0.55,"yes"],
    ["CR","ครัวซอง","ครัวซอง","ชิ้น",24,"น้ำตาล",100,"g","",0.03,"yes"],
    ["SD","ซาวร์โดว์","ขนมปัง","ก้อน",6,"แป้งขนมปัง",1500,"g","",0.045,"yes"],
    ["SD","ซาวร์โดว์","ขนมปัง","ก้อน",6,"เกลือ",30,"g","",0.02,"yes"],
    ["SD","ซาวร์โดว์","ขนมปัง","ก้อน",6,"หัวเชื้อ (levain)",300,"g","",0.04,"yes"]
  ];
}

function ensureSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const cur = sh.getRange(1, 1, 1, Math.max(headers.length, sh.getLastColumn() || 1)).getValues()[0];
  const same = headers.every(function (h, i) { return String(cur[i] || "").trim() === h; });
  if (!same) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* ====================== router ====================== */
function doGet() { return json({ ok: true, service: "Rush Bakery", time: new Date().toISOString() }); }

function doPost(e) {
  try {
    const p = parseRequest(e);
    switch (String(p.action || "")) {
      case "getAll":      return json(getAll(p));
      case "saveDaily":   return json(saveDaily(p));
      case "logDraw":     return json(logDraw(p));
      case "uploadPhoto": return json(uploadPhoto(p));
      case "getReport":   return json(getReport(p));
      default:            return json({ error: "unknown action: " + p.action });
    }
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) });
  }
}

function parseRequest(e) {
  const out = {};
  if (e && e.parameter) for (const k in e.parameter) out[k] = e.parameter[k];
  if (e && e.postData && e.postData.contents) {
    const raw = String(e.postData.contents);
    raw.split("&").forEach(function (kv) {
      const i = kv.indexOf("=");
      if (i < 0) return;
      const k = decodeURIComponent(kv.slice(0, i).replace(/\+/g, " "));
      const v = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " "));
      out[k] = v;
    });
  }
  if (out.payload) { try { Object.assign(out, JSON.parse(out.payload)); } catch (_) {} }
  return out;
}

/* ====================== อ่านข้อมูล ====================== */
function getAll(p) {
  const date = String(p.date || todayStr());

  // รวมแถววัตถุดิบให้เป็นสูตรต่อเมนู
  const byItem = {};
  const order = [];
  read(SH_RECIPES).forEach(function (r) {
    const id = String(r.itemId || "").trim();
    if (!id) return;
    if (String(r.active).toLowerCase() === "no") return;
    if (!byItem[id]) {
      byItem[id] = {
        id: id,
        name: String(r.name || id),
        category: String(r.category || ""),
        unit: String(r.unit || "ชิ้น"),
        yieldPerBatch: Number(r.yieldPerBatch) || 0,
        ingredients: []
      };
      order.push(id);
    }
    if (String(r.ingredient || "").trim()) {
      byItem[id].ingredients.push({
        name: String(r.ingredient),
        qty: Number(r.qty) || 0,
        unit: String(r.ingredientUnit || ""),
        stockItemId: String(r.stockItemId || "").trim(),
        unitCost: Number(r.unitCost) || 0
      });
    }
  });

  const today = {};
  read(SH_DAILY).forEach(function (r) {
    if (asDate(r.date) !== date) return;
    today[String(r.itemId)] = {
      batches: Number(r.batches) || 0,
      baked: Number(r.baked) || 0,
      sold: Number(r.sold) || 0,
      waste: Number(r.waste) || 0,
      wasteReason: String(r.wasteReason || ""),
      note: String(r.note || "")
    };
  });

  const photos = read(SH_PHOTOS)
    .filter(function (r) { return asDate(r.date) === date; })
    .map(function (r) { return { id: String(r.id), url: String(r.url || ""), caption: String(r.caption || ""), time: String(r.caption || "") }; });

  return { ok: true, date: date, recipes: order.map(function (id) { return byItem[id]; }), today: today, photos: photos };
}

/* ====================== บันทึกผลรายวัน (upsert ตาม date+itemId) ====================== */
function saveDaily(p) {
  const date = String(p.date || todayStr());
  const rows = Array.isArray(p.rows) ? p.rows : [];
  if (!rows.length) return { ok: true, saved: 0 };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ensureSheet(ss, SH_DAILY, DAILY_HEADERS);
    const values = sh.getDataRange().getValues();
    const idx = {};
    for (let i = 1; i < values.length; i++) {
      idx[asDateStr(values[i][0]) + "|" + String(values[i][1]).trim()] = i + 1; // เลขแถวจริง
    }

    let saved = 0;
    const appends = [];
    rows.forEach(function (r) {
      const itemId = String(r.itemId || "").trim();
      if (!itemId) return;
      const rowVals = [date, itemId, Number(r.batches) || 0, Number(r.baked) || 0,
                       Number(r.sold) || 0, Number(r.waste) || 0,
                       String(r.wasteReason || ""), String(r.note || ""), new Date()];
      const at = idx[date + "|" + itemId];
      if (at) sh.getRange(at, 1, 1, DAILY_HEADERS.length).setValues([rowVals]);
      else appends.push(rowVals);
      saved++;
    });
    if (appends.length) sh.getRange(sh.getLastRow() + 1, 1, appends.length, DAILY_HEADERS.length).setValues(appends);
    SpreadsheetApp.flush();
    return { ok: true, saved: saved };
  } finally { lock.releaseLock(); }
}

/* ====================== บันทึกการเบิก ====================== */
function logDraw(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureSheet(ss, SH_DRAW, DRAW_HEADERS);
  sh.appendRow([Utilities.getUuid().slice(0, 8), String(p.date || todayStr()),
                String(p.itemId || ""), Number(p.batches) || 0, Number(p.cost) || 0,
                String(p.by || ""), new Date()]);
  return { ok: true };
}

/* ====================== รูปถ่าย ====================== */
function photoFolder() {
  const it = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(PHOTO_FOLDER_NAME);
}

function uploadPhoto(p) {
  if (!p || !p.base64) return { error: "ไม่มีไฟล์รูป" };
  const date = String(p.date || todayStr());
  const bytes = Utilities.base64Decode(p.base64);
  const name = "bake_" + date + "_" + Utilities.getUuid().slice(0, 6) + ".jpg";
  const file = photoFolder().createFile(Utilities.newBlob(bytes, "image/jpeg", name));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (_) {}
  const url = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000";

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureSheet(ss, SH_PHOTOS, PHOTO_HEADERS);
  sh.appendRow([file.getId(), date, url, String(p.caption || ""), new Date()]);
  return { ok: true, url: url };
}

/* ====================== รายงานย้อนหลัง ====================== */
function getReport(p) {
  const from = String(p.from || todayStr());
  const to   = String(p.to   || todayStr());
  const rows = read(SH_DAILY).filter(function (r) {
    const d = asDate(r.date);
    return d >= from && d <= to;
  }).map(function (r) {
    return { date: asDate(r.date), itemId: String(r.itemId), batches: Number(r.batches) || 0,
             baked: Number(r.baked) || 0, sold: Number(r.sold) || 0, waste: Number(r.waste) || 0,
             wasteReason: String(r.wasteReason || "") };
  });
  const draws = read(SH_DRAW).filter(function (r) {
    const d = asDate(r.date);
    return d >= from && d <= to;
  }).map(function (r) { return { date: asDate(r.date), itemId: String(r.itemId), batches: Number(r.batches) || 0, cost: Number(r.cost) || 0 }; });
  return { ok: true, from: from, to: to, rows: rows, draws: draws };
}

/* ====================== helpers ====================== */
function read(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const head = values[0];
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const o = {};
    for (let j = 0; j < head.length; j++) o[head[j]] = values[i][j];
    out.push(o);
  }
  return out;
}

function todayStr() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Bangkok", "yyyy-MM-dd");
}
function asDateStr(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone() || "Asia/Bangkok", "yyyy-MM-dd");
  const s = String(v || ""); const m = s.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : s.slice(0, 10);
}
function asDate(v) { return asDateStr(v); }

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
