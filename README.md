# Hub Pulse (ABBTG-A)

PWA สำหรับมือถือ แสดงตัวเลขหน้างานจากชีต `[ABBTG-A] Dashboard Last Mile` แท็บ **DailySummary** (อ่านอย่างเดียว ไม่เขียนกลับชีต)

## ทำอะไรได้
- การ์ด KPI: Delivered/In Hub + Complete %, Assign, No Assign (เป็นสีแดงเมื่อมากกว่า 0), HC Active (2W/4W), PDTY Assign เทียบ Target, WL, %Assign, SLA (ค่าที่ตั้งไว้ในชีต), Issue/Action
- ปุ่ม **คัดลอก Daily Report** คัดลอกข้อความจากเซลล์ "ข้อความ" ในชีต ไปวางใน SeaTalk ได้เลย
- ดึงข้อมูลใหม่อัตโนมัติทุก 5 นาที ตอนเปิดแอพกลับมา และตอนเน็ตกลับมา
- ถ้าออฟไลน์หรือดึงข้อมูลไม่สำเร็จ จะแสดงข้อมูลล่าสุดที่เคยดึงได้ พร้อมแถบบอกเวลาของข้อมูลนั้น
- ค่าไหนไม่มีในชีต จะแสดงเป็น `—` (ไม่ใส่ 0 แทน)

## ติดตั้ง (ทำครั้งเดียว)

### 1) Apps Script (ตัวส่งข้อมูล)
1. เปิดชีต → Extensions → Apps Script → วางโค้ดจาก `apps-script/Code.gs`
2. Project Settings → Script Properties → เพิ่ม `HUB_PULSE_KEY` = รหัสลับยาว ๆ
3. Deploy → New deployment → Web app → Execute as: **Me**, Who has access: **Anyone** → คัดลอก URL ที่ลงท้ายด้วย `/exec`

> ใครที่มีทั้ง URL และ Key จะอ่านตัวเลขสรุปได้ แต่ไม่เห็นรายชื่อคนขับ (โค้ดอ่านแค่แท็บ DailySummary) และแก้ไขชีตไม่ได้

### 2) โฮสต์ตัวแอพ
อัปโหลดทุกไฟล์ในโฟลเดอร์นี้ **ยกเว้น `apps-script/`** ขึ้นโฮสต์ที่เป็น HTTPS เช่น GitHub Pages, Netlify หรือ Cloudflare Pages

### 3) บนมือถือ
เปิด URL ของแอพ → กดฟันเฟือง → วาง Web App URL และ Key → **บันทึกและทดสอบ** → เมนูเบราว์เซอร์ → **Add to Home Screen**

## ไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| `index.html`, `styles.css`, `app.js` | หน้าแอพ |
| `sw.js` | Service worker: เก็บแค่ไฟล์ของหน้าแอพไว้ใช้ออฟไลน์ ไม่เก็บตัวเลขจากชีต |
| `manifest.webmanifest`, `icons/` | ข้อมูลสำหรับติดตั้งเป็นแอพ |
| `apps-script/Code.gs` | Endpoint JSON อ่านแท็บ DailySummary ตามชื่อแถวในคอลัมน์ A |
