# <img src="public/favicon.png" width="30" style="vertical-align: middle; margin-right: 10px;"> Lux Countdown

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/pathompuam/LuxCountdown?style=flat-square)](https://github.com/pathompuam/LuxCountdown/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Lux Countdown** เป็นแอปพลิเคชัน Desktop Widget ที่ออกแบบมาให้เรียบหรู ทันสมัย และช่วยให้คุณไม่พลาดทุกเหตุการณ์สำคัญในชีวิต พัฒนาโดยคุณ **Lux**

## 📥 ดาวน์โหลด (Download)

คุณสามารถดาวน์โหลดโปรแกรมเวอร์ชันล่าสุดสำหรับ Windows (.exe) ได้ที่หน้า **[Releases](https://github.com/pathompuam/LuxCountdown/releases)**

<p align="center">
  <img src="ref/example1.png" width="350" alt="Main View" />
  <img src="ref/example2.png" width="250" alt="Settings View" />
</p>

## ฟีเจอร์เด่น (Key Features)

- **Desktop Widget:** ทำงานเป็นวิดเจ็ตลอยอยู่บนหน้าจอ Desktop ไม่เกะกะแถบ Taskbar
- **Position & Size Memory:** จดจำตำแหน่งและขนาดล่าสุดที่วางไว้ เปิดเครื่องใหม่แอปจะกลับมาอยู่ที่เดิมเป๊ะๆ
- **Custom Presets:** สร้างและจัดการการนับถอยหลังได้หลายเหตุการณ์พร้อมกัน
- **Personalized Background:** ใส่รูปภาพพื้นหลังของคุณเองได้ในแต่ละเหตุการณ์
- **Run on Startup:** ตั้งค่าให้แอปเปิดใช้งานอัตโนมัติทันทีที่เปิดเครื่อง (Windows)
- **Modern UI:** ไอคอนสวยงามจาก Lucide React และรูปแบบวันที่แบบ dd/mm/yy ที่อ่านง่าย

## วิธีการใช้งาน (How to Use)

1.  **การลากและวาง:** คุณสามารถคลิกค้างที่ตัววิดเจ็ตเพื่อย้ายตำแหน่งไปวางไว้จุดไหนก็ได้บนหน้าจอ
2.  **การปรับขนาด:** วางเมาส์ที่ขอบวิดเจ็ตเพื่อลากปรับขนาดตามต้องการ
3.  **การตั้งค่า (Settings):**
    - คลิกที่ไอคอน **ฟันเฟือง (Settings)** บนวิดเจ็ต หรือคลิกขวาที่ไอคอนแอปใน **System Tray** (มุมขวาล่างของจอ)
    - ในหน้าตั้งค่า คุณสามารถ:
        - เพิ่มเหตุการณ์ใหม่ (+)
        - เปลี่ยนชื่อเหตุการณ์และเลือกวันเวลาที่ต้องการ
        - อัปโหลดรูปภาพพื้นหลัง
        - เปิด/ปิด ระบบ **Run on startup**
4.  **System Tray:** ไอคอนแอปที่มุมขวาล่างช่วยให้คุณเข้าถึงการตั้งค่าหรือปิดแอปได้ตลอดเวลา

## การติดตั้งและพัฒนา (Development)

สำหรับนักพัฒนาที่ต้องการนำไปต่อยอด:

```bash
# ติดตั้ง dependencies
npm install

# รันในโหมดพัฒนา (Development)
npm run dev

# สร้างตัวโปรแกรมสำหรับใช้งาน (Build)
npm run build
```

## เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend:** React + TypeScript + Vite
- **Desktop Framework:** Electron
- **Icons:** Lucide React
- **Styling:** CSS3 (Custom Design)

---
Developed with ❤️ by **Lux**
