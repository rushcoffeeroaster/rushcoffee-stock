# Rush Coffee — ระบบจัดการร้านกาแฟ

แอปเว็บแบบหน้าเดียว (single-page) สำหรับร้าน Rush Coffee ใช้บนมือถือได้สะดวก ดีไซน์มินิมอลโทนกาแฟ เชื่อมต่อข้อมูลผ่าน Google Apps Script + Google Sheets ไม่ต้องมีเซิร์ฟเวอร์

เปิดใช้งานผ่าน GitHub Pages: `https://rushcoffeeroaster.github.io/rushcoffee-stock/`

## ไฟล์ในโปรเจกต์

| ไฟล์ | หน้าที่ |
| --- | --- |
| `index.html` | จัดการ**สต๊อกวัตถุดิบ** — รับเข้า/ใช้ออก, จุดสั่งซื้อขั้นต่ำ, ภาพรวมเชิงลึก |
| `dashboard.html` | **บัญชีรายรับ-รายจ่าย** สองสาขา — KPI, วิเคราะห์, กราฟ, ส่งออก CSV |
| `menu-cost.html` | **ต้นทุน & กำไรต่อเมนู (GP%)** — กรอกสูตร, จัดอันดับกำไร, เตือนเมนูกำไรต่ำ |
| `README.md` | เอกสารนี้ |

ทุกหน้ามีลิงก์สลับไปมาถึงกันที่มุมขวาบน

## ฟีเจอร์

### สต๊อกวัตถุดิบ (`index.html`)
- **แท็บภาพรวม** — จำนวนวัตถุดิบ, รายการใกล้หมด/หมดสต๊อก, การเคลื่อนไหว 7 วัน
- **ประเมินจากการใช้งานจริง** — คำนวณอัตราการใช้ต่อวันจากประวัติ 14 วันล่าสุด แล้วบอกว่าแต่ละรายการ "เหลือพออีกราวกี่วัน"
- **ใช้บ่อยที่สุด** และ **สัดส่วนตามหมวดหมู่** เป็นกราฟ
- ค้นหา/กรองตามหมวด, การ์ดแสดงระดับสต๊อกพร้อมแถบเตือนสี, รับเข้า/ใช้ออก/แก้ไข/ลบ
- ประวัติการเคลื่อนไหวจัดกลุ่มตามวัน

### บัญชี (`dashboard.html`)
- เลือกดูราย **สาขา Rush / Rush Hour / รวม** พร้อมธีมสีต่างกัน
- ช่วงเวลา: รายวัน / 7 วัน / 30 วัน / ทั้งหมด
- **KPI พร้อมเทียบช่วงก่อนหน้า** (▲▼ %) — รายรับ, รายจ่าย, กำไร, อัตรากำไร
- **ข้อสังเกตอัตโนมัติ** — วันขายดีที่สุด, หมวดรายจ่ายก้อนใหญ่สุด, สัดส่วนต้นทุนวัตถุดิบ ฯลฯ
- เทียบรายสาขา, สัดส่วนช่องทาง (หน้าร้าน/Delivery)
- กราฟแนวโน้มรายวัน (แท่งซ้อน + เส้นรายจ่าย) และโดนัทรายจ่ายตามหมวด
- บันทึกรายรับ/รายจ่าย, รายการทั้งหมด, **ส่งออก CSV**

### ต้นทุนเมนู (`menu-cost.html`)
- กรอกสูตรแต่ละเมนู (วัตถุดิบ + ราคาซื้อทั้งแพ็ก + ขนาดแพ็ก) ระบบหารเป็น **ต้นทุนต่อหน่วย** ให้อัตโนมัติ
- คำนวณ **GP% (อัตรากำไรขั้นต้น)**, ต้นทุนรวม และกำไรต่อแก้ว พร้อมแถบสี (แดง <30% / เหลือง <60% / เขียว ≥60%)
- **แท็บภาพรวม** — GP เฉลี่ย, ต้นทุนเฉลี่ย/แก้ว, เมนูกำไรดีสุด/ต่ำสุด, เตือนเมนูกำไรต่ำ, กราฟจัดอันดับ GP ทุกเมนู
- ดูตัวอย่างผลคำนวณสด ๆ ระหว่างกรอก, **แก้ไข/ลบเมนู**, แยกตามสาขา

## การตั้งค่า Google Apps Script

แต่ละหน้าเชื่อมกับ Apps Script web app คนละตัว ตั้งค่า URL ที่ตัวแปร `API_URL` ด้านบนของ `<script>` ในแต่ละไฟล์

Backend (Apps Script) ต้องรองรับ action ผ่าน `POST` (body แบบ `application/x-www-form-urlencoded`: `action`, `payload` เป็น JSON) และตอบกลับเป็น JSON

**สต๊อก (`index.html`)**
- `getAll` → `{ items: [{id,name,unit,category,qty,min}], logs: [{itemName,type,delta,note,time}] }`
- `saveItem` `{id,name,unit,category,qty,min}`
- `moveStock` `{itemId,itemName,type:"in"|"out",amount,note}`
- `logOnly` `{itemName,type,amount,note}`
- `deleteItem` (เรียกแบบ GET: `?action=deleteItem&id=...`)

**บัญชี (`dashboard.html`)**
- `getAll` → `{ income: [{id,date,channel,amount,note,branch}], expense: [{id,date,category,amount,note,branch,itemName,itemQty,itemUnit}] }`
- `addIncome` `{id,date,channel,amount,note,branch}`
- `addExpense` `{id,date,category,amount,note,branch,itemName,itemQty,itemUnit}`
- `deleteIncome` / `deleteExpense` `{action, id}`

**ต้นทุนเมนู (`menu-cost.html`)** — ใช้ Apps Script ตัวเดียวกับหน้าบัญชี
- `getAll` → `{ recipes: [{id,menuName,sellingPrice,ingredientName,ingredientQty,ingredientUnit,buyPrice,packSize,branch}] }`
- `addRecipeRow` `{id,menuName,sellingPrice,ingredientName,ingredientQty,ingredientUnit,buyPrice,packSize,branch}` (หนึ่งแถวต่อวัตถุดิบหนึ่งชนิด)
- `deleteRecipeMenu` `{action, menuName, branch}` (การ "แก้ไข" = ลบเมนูเดิมแล้วบันทึกใหม่)

> โครงสร้างข้อมูลและชื่อ action เหล่านี้ถูกคงไว้เหมือนเดิม การปรับปรุงเป็นเพียงส่วนหน้า (UI/insight) จึงใช้กับ Apps Script เดิมได้ทันที

## เทคโนโลยี
HTML/CSS/JavaScript ล้วน ไม่มี build step · กราฟด้วย [Chart.js](https://www.chartjs.org/) (โหลดผ่าน CDN) · ฟอนต์ระบบ/Noto Sans Thai

## การนำขึ้นใช้งาน
นำไฟล์ทั้งสามวางในรากของ repo แล้วเปิด GitHub Pages (Settings → Pages → branch `main`) เปิดดูได้ทันทีที่ลิงก์ด้านบน
