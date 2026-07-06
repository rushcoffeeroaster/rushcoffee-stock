/*****************************************************************************************
 *  Rush Coffee · ต้นทุนเมนู (Menu Cost / Recipes) — Google Apps Script backend
 *  ------------------------------------------------------------------------------------
 *  ใช้กับ menu-cost.html — เก็บสูตร + ต้นทุนวัตถุดิบ + ราคาขาย แยกรายสาขา (rush/rushhour)
 *  ★ รองรับ "หมวด" (เครื่องดื่ม/เบเกอรี่) และ "จำนวนเสิร์ฟต่อสูตร" เพื่อหารต้นทุนต่อเสิร์ฟ
 *
 *  วิธีอัปเกรด (เก็บข้อมูลเดิมครบ):
 *   1) เปิดชีต Menu Cost ▸ Extensions ▸ Apps Script ▸ วางโค้ดนี้ทับทั้งหมด ▸ บันทึก
 *   2) รัน setup() หนึ่งครั้ง — เติมคอลัมน์ category + servings ให้อัตโนมัติ (ไม่ลบของเดิม)
 *   3) Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸ Deploy
 *      (ลิงก์ /exec เดิมไม่เปลี่ยน → menu-cost.html ใช้ได้เลย)
 *****************************************************************************************/

const SHEET = "Recipes";
// ★ เพิ่ม category + servings (ต่อท้ายเมื่ออัปเกรดชีตเดิม เพื่อไม่ให้ข้อมูลเลื่อน)
const HEADERS = ["id", "menuName", "category", "servings", "sellingPrice",
                 "ingredientName", "ingredientQty", "ingredientUnit", "buyPrice", "packSize", "branch"];

function setup() {
  const sh = sheet();
  ensureHeaders(sh);
  Logger.log("setup เสร็จแล้ว ✓  เติมคอลัมน์ category + servings ให้แล้ว (ข้อมูลเดิมอยู่ครบ)");
}

/* เติมหัวคอลัมน์ที่ขาด (category, servings, ...) ต่อท้าย โดยไม่แตะข้อมูลเดิม */
function ensureHeaders(sh) {
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    sh.setFrozenRows(1);
    return;
  }
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (x) { return String(x).trim(); });
  HEADERS.forEach(function (h) {
    if (header.indexOf(h) < 0) { header.push(h); sh.getRange(1, header.length).setValue(h).setFontWeight("bold"); }
  });
}

/* ---------- Router (รองรับ GET + POST) ---------- */
function doGet(e)  { return handle(e); }
function doPost(e) { return handle(e); }

function handle(e) {
  try {
    const req = parseRequest(e);
    const p = req.payload;
    switch (req.action) {
      case "getAll":           return json(getAll());
      case "saveRecipe":       return json(saveRecipe(p));
      case "addRecipeRow":     return json(addRecipeRow(p));
      case "deleteRecipeMenu": return json(deleteRecipeMenu(p.menuName, p.branch));
      case "":                 return json({ ok: true, service: "Rush Menu Cost", time: new Date().toISOString() });
      default:                 return json({ error: "unknown action: " + req.action });
    }
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) });
  }
}

function parseRequest(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  let action = params.action || "";
  let payload = {};
  if (params.payload) { try { payload = JSON.parse(params.payload); } catch (_) {} }
  if (e && e.postData && e.postData.contents) {
    const bp = {};
    e.postData.contents.split("&").forEach(function (kv) {
      const a = kv.split("=");
      bp[decodeURIComponent((a[0] || "").replace(/\+/g, " "))] = decodeURIComponent((a[1] || "").replace(/\+/g, " "));
    });
    if (!action) action = bp.action || "";
    if (bp.payload) { try { payload = JSON.parse(bp.payload); } catch (_) {} }
    Object.keys(bp).forEach(function (k) { if (k !== "action" && k !== "payload" && payload[k] == null) payload[k] = bp[k]; });
  }
  Object.keys(params).forEach(function (k) { if (k !== "action" && k !== "payload" && payload[k] == null) payload[k] = params[k]; });
  return { action: action, payload: payload };
}

/* ---------- actions ---------- */
function getAll() {
  const recipes = readSheet().map(function (r) {
    return {
      id: String(r.id).trim(), menuName: String(r.menuName),
      category: String(r.category || "").trim() || "เครื่องดื่ม",  // เดิมที่ไม่มีหมวด = เครื่องดื่ม
      servings: Number(r.servings) > 0 ? Number(r.servings) : 1,    // เดิมที่ไม่มี = 1 เสิร์ฟ
      sellingPrice: Number(r.sellingPrice) || 0,
      ingredientName: String(r.ingredientName || ""), ingredientQty: Number(r.ingredientQty) || 0,
      ingredientUnit: String(r.ingredientUnit || ""), buyPrice: Number(r.buyPrice) || 0,
      packSize: Number(r.packSize) || 0, branch: String(r.branch || "").trim()
    };
  }).filter(function (r) { return r.id; });
  return { ok: true, recipes: recipes };
}

function addRecipeRow(p) {
  if (!p || !p.menuName) return { error: "missing menuName" };
  const sh = sheet();
  let cm = colMap(sh);
  // ถ้ายังไม่มีคอลัมน์ใหม่ (category/servings) → เติมหัวก่อนแล้วลองใหม่
  if (cm.category < 0 || cm.servings < 0) { ensureHeaders(sh); cm = colMap(sh); }
  const width = Math.max(sh.getLastColumn(), HEADERS.length);
  const row = new Array(width).fill("");
  function put(k, v) { const c = cm[k]; if (c >= 0) row[c] = v; }
  put("id", String(p.id || uid()));
  put("menuName", String(p.menuName));
  put("category", String(p.category || "เครื่องดื่ม"));
  put("servings", Number(p.servings) > 0 ? Number(p.servings) : 1);
  put("sellingPrice", Number(p.sellingPrice) || 0);
  put("ingredientName", String(p.ingredientName || ""));
  put("ingredientQty", Number(p.ingredientQty) || 0);
  put("ingredientUnit", String(p.ingredientUnit || ""));
  put("buyPrice", Number(p.buyPrice) || 0);
  put("packSize", Number(p.packSize) || 0);
  put("branch", String(p.branch || ""));
  sh.appendRow(row);
  return { ok: true };
}

/* บันทึกทั้งสูตรในครั้งเดียว (เร็ว) — ถ้าส่ง replaceMenu มาด้วย = แก้ไข (ลบของเดิมก่อน) */
function saveRecipe(p) {
  if (!p || !p.menuName) return { error: "missing menuName" };
  const sh = sheet();
  let cm = colMap(sh);
  if (cm.category < 0 || cm.servings < 0) { ensureHeaders(sh); cm = colMap(sh); }

  // แก้ไข: ลบแถวของเมนูเดิมก่อน (ตามชื่อเดิม + สาขา)
  const oldName = p.replaceMenu || (p.replaceMenu === "" ? "" : p.menuName);
  if (p.replaceMenu != null) {
    const values = sh.getDataRange().getValues();
    for (let i = values.length - 1; i >= 1; i--) {
      if (String(values[i][cm.menuName]).trim() === String(oldName).trim() &&
          (!p.branch || cm.branch < 0 || String(values[i][cm.branch]).trim() === String(p.branch).trim())) {
        sh.deleteRow(i + 1);
      }
    }
  }

  // เขียนทุกวัตถุดิบเป็นบล็อกเดียว (setValues ครั้งเดียว = เร็วกว่าต่อแถวมาก)
  const ings = Array.isArray(p.ingredients) ? p.ingredients : [];
  const width = Math.max(sh.getLastColumn(), HEADERS.length);
  const rows = ings.filter(function (g) { return String(g.ingredientName || "").trim(); }).map(function (g) {
    const row = new Array(width).fill("");
    function put(k, v) { const c = cm[k]; if (c >= 0) row[c] = v; }
    put("id", String(g.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7))));
    put("menuName", String(p.menuName));
    put("category", String(p.category || "เครื่องดื่ม"));
    put("servings", Number(p.servings) > 0 ? Number(p.servings) : 1);
    put("sellingPrice", Number(p.sellingPrice) || 0);
    put("ingredientName", String(g.ingredientName || ""));
    put("ingredientQty", Number(g.ingredientQty) || 0);
    put("ingredientUnit", String(g.ingredientUnit || ""));
    put("buyPrice", Number(g.buyPrice) || 0);
    put("packSize", Number(g.packSize) || 0);
    put("branch", String(p.branch || ""));
    return row;
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, width).setValues(rows);
  return { ok: true, count: rows.length };
}

function deleteRecipeMenu(menuName, branch) {
  if (!menuName) return { error: "missing menuName" };
  const sh = sheet();
  const cm = colMap(sh);
  const values = sh.getDataRange().getValues();
  const nameCol = cm.menuName, brCol = cm.branch;
  let n = 0;
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][nameCol]).trim() === String(menuName).trim() &&
        (!branch || brCol < 0 || String(values[i][brCol]).trim() === String(branch).trim())) {
      sh.deleteRow(i + 1); n++;
    }
  }
  return { ok: true, deleted: n };
}

/* ---------- helpers ---------- */
function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold"); sh.setFrozenRows(1); }
  return sh;
}
function colMap(sh) { // คืน index คอลัมน์ตามชื่อหัวจริงในชีต (ไม่อิงตำแหน่งคงที่)
  const last = Math.max(sh.getLastColumn(), HEADERS.length);
  const row = sh.getRange(1, 1, 1, last).getValues()[0].map(function (x) { return String(x).trim(); });
  const map = {};
  HEADERS.forEach(function (h) { map[h] = row.indexOf(h); });
  return map;
}
function readSheet() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET);
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  if (v.length < 2) return [];
  const h = v[0].map(function (x) { return String(x).trim(); });
  const out = [];
  for (let i = 1; i < v.length; i++) { const o = {}; for (let j = 0; j < h.length; j++) o[h[j]] = v[i][j]; out.push(o); }
  return out;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
