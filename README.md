# ⚔️ D&D Economic Chronicles: ไทยช่วยไทยพลัส 60/40 (Inequality Tycoon)

> **บอร์ดเกมจำลองเศรษฐศาสตร์นโยบายและการกระจายรายได้แบบ Real-time Multiplayer**  
> ผสานกลไกการเล่นแบบ **Tabletop RPG (D20 Dice Check & Stat Modifiers)** เข้ากับแบบจำลอง **เศรษฐศาสตร์มหภาค (Macroeconomics Simulation)** รองรับผู้เล่นพร้อมกันสูงสุด **200 คน** (20 เขตเศรษฐกิจ) ควบคุมจากศูนย์บัญชาการจอใหญ่ (**National Command Center**) และขับเคลื่อนเรื่องราวด้วย **AI Dungeon Master (Google Gemini 3.7 Flash)**

---

## 📑 สารบัญ (Table of Contents)
- [1. ที่มาและแนวคิดของเกม (Concept & Philosophy)](#1-ที่มาและแนวคิดของเกม-concept--philosophy)
- [2. ฟีเจอร์เด่นระดับโปรดักชัน (Key Features)](#2-ฟีเจอร์เด่นระดับโปรดักชัน-key-features)
- [3. ชนชั้นและบทบาทตัวละคร (4 Socioeconomic Classes)](#3-ชนชั้นและบทบาทตัวละคร-4-socioeconomic-classes)
- [4. วงจรการเล่นและระบบเศรษฐกิจ (Gameplay Loop & Economics)](#4-วงจรการเล่นและระบบเศรษฐกิจ-gameplay-loop--economics)
- [5. หน้าจอและการเข้าใช้งาน (System Views & Access URLs)](#5-หน้าจอและการเข้าใช้งาน-system-views--access-urls)
- [6. ข้อกำหนดเบื้องต้นและการติดตั้ง (Quick Start & Installation)](#6-ข้อกำหนดเบื้องต้นและการติดตั้ง-quick-start--installation)
- [7. การตั้งค่าสิ่งแวดล้อม (Environment Variables)](#7-การตั้งค่าสิ่งแวดล้อม-environment-variables)
- [8. การเปิดใช้งานด้วย Docker & Docker Compose](#8-การเปิดใช้งานด้วย-docker--docker-compose)
- [9. โครงสร้างซอร์สโค้ด (Project Architecture)](#9-โครงสร้างซอร์สโค้ด-project-architecture)
- [10. การทดสอบระบบ (Automated Tests)](#10-การทดสอบระบบ-automated-tests)

---

## 1. ที่มาและแนวคิดของเกม (Concept & Philosophy)

เกมนี้ได้รับการออกแบบเพื่อการเรียนรู้เศรษฐศาสตร์เชิงประสบการณ์ (**Experiential Economics Learning**) โดยจำลองปัญหาความเหลื่อมล้ำทางเศรษฐกิจและนโยบายการคลังของประเทศไทย:

1. **ม่านแห่งความไม่รู้ (Veil of Ignorance - John Rawls)**:  
   ผู้เล่นทุกคนเข้าสู่ระบบโดยไม่สามารถเลือกสถานะทางสังคมได้เอง ระบบจะสุ่มเปิดเผยบทบาท (**Character Reveal Gacha**) ว่าผู้เล่นจะได้เป็นนายทุน, ผู้ประกอบการ SME, พนักงานออฟฟิศ หรือกลุ่มเปราะบาง เพื่อสร้างความเข้าใจอกเข้าใจใจ (Empathy) และตระหนักถึงความไม่เท่าเทียมกันของโอกาสตั้งแต่จุดเริ่มต้น
2. **ระบบการตัดสินผลแบบ D&D 5e (D20 Checks)**:  
   ทุกกิจกรรมทางเศรษฐกิจไม่ได้ขึ้นอยู่กับโชคชะตาเพียงอย่างเดียว แต่ขึ้นกับความพร้อมของต้นทุนและทักษะเฉพาะด้าน ผ่านสูตร:
   $$\text{Total Score} = \text{D20 Roll} + \text{Stat Modifier}$$
   เมื่อเทียบกับค่าความยาก (**Difficulty Class: DC**) ของสถานการณ์ในแต่ละรอบ
3. **การจำลองนโยบายเศรษฐกิจจริง**:  
   จำลองผลกระทบของโครงการร่วมจ่ายภาครัฐ (**Co-Pay 60/40 - ไทยช่วยไทย**), ภาษีอิเล็กทรอนิกส์ (**e-Tax Invoice**), บัตรสวัสดิการแห่งรัฐ, สินเชื่อฐานข้อมูลธุรกรรม (**Digital Footprint**), เงินเฟ้อด้านพลังงาน และการสะสมหนี้สาธารณะต่อ GDP

---

## 2. ฟีเจอร์เด่นระดับโปรดักชัน (Key Features)

- 🌐 **Single QR Code for 200 Players (Quick Join Matchmaking)**:  
  ผู้เล่นทั้งห้องเรียน/การอบรม (สูงสุด 200 คน) สแกน QR Code กลางอันเดียวจากจอใหญ่ ระบบ Matchmaking จะเฉลี่ยผู้เล่นเข้าสู่ 20 เขตเศรษฐกิจ (**Districts: DIST-01 ถึง DIST-20**) เขตละ 10 คนโดยอัตโนมัติ
- 🖥️ **National Command Center (Master Screen Dashboard)**:  
  - **Lorenz Curve & Gini Coefficient**: กราฟเส้นโค้งลอเรนซ์และค่าสัมประสิทธิ์จีนีแบบ Real-time HTML5 Canvas คำนวณความเหลื่อมล้ำรวมของทุกเขตในประเทศ
  - **Macroeconomic Metrics**: แสดงค่า GDP รวม, ดัชนีการหมุนเวียนเงิน (**Velocity of Money**), ภาษี VAT สะสม, และหนี้สาธารณะต่อ GDP
  - **Terminal Live Ticker**: ฟีดรายงานความเคลื่อนไหวทางเศรษฐกิจและผลการทอยเต๋าของผู้เล่นทุกคนแบบเรียลไทม์
  - **One-Click Orchestration**: สั่งเริ่มเกม (Start Game), ประมวลผลเศรษฐกิจทุกเขตพร้อมกัน (Global Settle), และเปิดไตรมาสถัดไป (Advance All) โดยมีรหัส **Admin PIN** ป้องกันความปลอดภัย
- 🤖 **AI Dungeon Master (Google Gemini 3.7 Flash Engine)**:  
  - **Dynamic Action Generator**: AI วิเคราะห์สภาวะเศรษฐกิจในรอบนั้น แล้วสร้างสรรค์ทางเลือกการทำงาน (**Action Cards**) แบบสุ่มสดใหม่ในทุกไตรมาส ไม่ซ้ำซาก
  - **Personalized AI Lore**: AI บรรยายเรื่องราวชีวิตของตัวละครแต่ละคนหลังทอยเต๋าด้วยภาษาธรรมชาติที่เข้าใจง่าย สมจริง และปรับเปลี่ยนตามผลคะแนน
  - **Zero-Downtime Fallback**: หากไม่ได้ใส่ Gemini API Key หรือโครงข่ายขัดข้อง ระบบจะสลับไปใช้ Thematic Fallback Actions โดยอัตโนมัติ 100%
- 🛡️ **ระบบป้องกันเกมค้างและเสถียรภาพการเชื่อมต่อ (High Resilience)**:  
  - **Auto-Bot Fill**: เติมบอทอัตโนมัติให้ครบ 10 คนต่อเขต หากมีผู้เล่นเข้าร่วมไม่เต็ม
  - **Auto-Bot Takeover on Disconnect**: หากมีผู้เล่นหลุดการเชื่อมต่อกลางคัน บอทจะเข้าสุ่มแผนงานและทอยเต๋าแทนทันทีเมื่อเพื่อนร่วมกลุ่มทอยครบ ป้องกันปัญหายอดทอยไม่ครบ 10/10 คนและเกมไม่ค้าง
  - **Emergency Bot Button**: ผู้เล่นในกลุ่มมีปุ่มฉุกเฉิน `🤖 ให้บอทช่วยเล่นแทนคนที่หลุดทันที`
  - **Seamless Reconnect**: รีเฟรชหน้าเบราว์เซอร์หรือเน็ตหลุด สามารถเชื่อมต่อกลับเข้ามาเล่นต่อในรอบปัจจุบันได้ทันที ไม่สูญเสียความคืบหน้า

---

## 3. ชนชั้นและบทบาทตัวละคร (4 Socioeconomic Classes)

ในแต่ละเขตเศรษฐกิจ (10 ผู้เล่น) ประกอบด้วย 4 ชนชั้นที่มีโครงสร้างรายได้ ต้นทุน และแต้มทักษะต่างกัน:

| ชนชั้น / บทบาท | จำนวนในเขต | เงินเริ่มต้น | สภาพคล่อง / รอบ | ค่าใช้จ่ายคงที่ | สเตตัสหลัก (Primary Stat) | สิทธิประโยชน์และกลไกพิเศษ |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| 👑 **นายทุน / ธุรกิจใหญ่ (Capitalist)** | 1 คน | 500,000 บ. | 50,000 บ. | 15,000 บ. | **CAP (Capital & Assets)** | ขยายสาขาห้างค้าปลีก, ลงทุน e-Tax ซัพพลายเชน, ผลตอบแทนพอร์ตลงทุน |
| 🏪 **ผู้ประกอบการ SME (SME Vendor)** | 2 คน | 50,000 บ. | 18,000 บ. | 8,000 บ. | **DIG (Digital Capability)** | รับสแกนแอปถุงเงิน 60/40, สะสม Digital Footprint ยื่นกู้สินเชื่อดอกเบี้ยต่ำ |
| 💼 **พนักงาน / แรงงานทั่วไป (General Citizen)** | 4 คน | 15,000 บ. | 12,000 บ. | 6,000 บ. | **LAB (Labor & Work)** | ใช้สิทธิ 60/40 อุดหนุนร้านค้าชุมชน, ทำงานล่วงเวลา, อบรมอัปสกิล (Skill Level 1-5) |
| 🌾 **กลุ่มเปราะบาง (Vulnerable Group)** | 3 คน | 3,000 บ. | 5,000 บ. | 4,000 บ. | **INF (Influence & Community)** | เบิกรับเงินโอนสวัสดิการแห่งรัฐ 1,000 บ., รูดบัตรซื้อของร้านธงฟ้า, ขอความช่วยเหลือชุมชน |

---

## 4. วงจรการเล่นและระบบเศรษฐกิจ (Gameplay Loop & Economics)

เกมแบ่งออกเป็น **6 ไตรมาส (6 Rounds)** แต่ละรอบมีบริบททางเศรษฐกิจที่ท้าทาย:

```
[รอบที่ 1: ฐานรากก่อนมีมาตรการ] ➔ [รอบที่ 2: วิกฤตค่าครองชีพ & เงินเฟ้อ] ➔ [รอบที่ 3: เปิดใช้นโยบาย 60/40]
                                                                                   ↓
[รอบที่ 6: ดุลยภาพใหม่ & สรุปผล] 🠔 [รอบที่ 5: หนี้สาธารณะ & ดอกเบี้ย] 🠔 [รอบที่ 4: แรงขับเคลื่อนเศรษฐกิจ]
```

### ขั้นตอนการเล่น 3 สเต็ปในแต่ละรอบ (Player 3-Stage Flow)
1. **ขั้นตอนที่ 1 (วิเคราะห์สถานการณ์)**: อ่านเรื่องราวประจำไตรมาส ดัชนีค่าครองชีพ เงินเฟ้อพลังงาน และข่าวสารเหตุการณ์สำคัญ
2. **ขั้นตอนที่ 2 (เลือกแผนการทำงาน)**: เลือก 1 ทางเลือกจาก Action Cards ประจำรอบที่ AI วิเคราะห์และสุ่มสร้างขึ้นตามบทบาท
3. **ขั้นตอนที่ 3 (ทอยลูกเต๋าตัดสินผล)**: กดทอย D20 ระบบจะคำนวณผลสัมฤทธิ์ สภาพคล่อง สุขภาวะชีวิต (QoL) ภาษี VAT และส่งผลต่อ GDP ของประเทศ จากนั้น AI จะบรรยายผลกระทบชีวิตของตัวละคร

---

## 5. หน้าจอและการเข้าใช้งาน (System Views & Access URLs)

| มุมมอง (View) | URL เข้าใช้งาน | เหมาะสำหรับ | รายละเอียด |
| :--- | :--- | :--- | :--- |
| 🖥️ **Master Screen** | `http://localhost:3005/?view=master` | ผู้ดำเนินเกม / วิทยากร / อาจารย์ | แผงควบคุมใหญ่ 200 คน, แสดง Lorenz Curve, Gini, Live Ticker, สั่งเริ่มเกมและข้ามรอบ (Admin PIN: `2026`) |
| 📱 **Mobile Player** | `http://<IP-เครื่อง>:3005/?view=player` | ผู้เล่นทุกคน (สแกนผ่านมือถือ) | สุ่มบทบาทตัวละคร, วิเคราะห์สถานการณ์, เลือก Action Card, ทอยเต๋า D20 และอ่าน AI Lore |
| 📽️ **Projector View** | `http://localhost:3005/?view=projector` | จอฉายสถิติในห้องประชุม | แสดงสถิติและสถานะรวมของแต่ละเขตแบบสะอาดตา |

---

## 6. ข้อกำหนดเบื้องต้นและการติดตั้ง (Quick Start & Installation)

### ข้อกำหนดของระบบ (Prerequisites)
- **Node.js**: เวอร์ชัน 18.0.0 ขึ้นไป (แนะนำ Node.js 20 LTS)
- **npm**: เวอร์ชัน 9.0.0 ขึ้นไป
- คอมพิวเตอร์และมือถือของผู้เล่นต้องเชื่อมต่อ **Wi-Fi วง LAN เดียวกัน** (หรือนำขึ้น Cloud Server / Domain)

### ขั้นตอนการติดตั้ง
1. **โคลนคลังโค้ดหรือดาวน์โหลดโฟลเดอร์โปรเจกต์**:
   ```bash
   git clone https://github.com/your-username/inequality-tycoon-game.git
   cd inequality-tycoon-game
   ```

2. **ติดตั้งไลบรารีที่จำเป็น (Dependencies)**:
   ```bash
   npm install
   ```

3. **สร้างไฟล์ตั้งค่า `.env`**:
   คัดลอกไฟล์ตัวอย่าง `.env.example` เป็น `.env`:
   ```bash
   cp .env.example .env
   ```
   *(แก้ไขคีย์ `GEMINI_API_KEY` หากต้องการใช้งาน AI Dungeon Master เต็มรูปแบบ)*

4. **เริ่มรันเซิร์ฟเวอร์**:
   ```bash
   npm start
   # หรือรันในโหมดพัฒนา
   npm run dev
   ```

5. **เข้าใช้งาน**:
   - เปิดเบราว์เซอร์บนเครื่องแม่ข่าย: `http://localhost:3005/?view=master`
   - ระบบจะตรวจจับ IP ในวงแลนและสร้าง QR Code ให้ผู้เล่นนำมือถือมาสแกนเล่นได้ทันที

---

## 7. การตั้งค่าสิ่งแวดล้อม (Environment Variables)

กำหนดค่าในไฟล์ `.env` ดังนี้:

```env
# 1. Google Gemini AI Studio API Key (ขอรับฟรีได้ที่ https://aistudio.google.com/app/apikey)
# หากไม่ระบุ ระบบจะใช้ Thematic Fallback Generator อัตโนมัติ
GEMINI_API_KEY=AIzaSy...your_gemini_api_key

# 2. พอร์ตของเซิร์ฟเวอร์ (ค่าเริ่มต้น: 3005)
PORT=3005

# 3. รหัส PIN สำหรับปลดล็อกแผงควบคุม Master Screen (ค่าเริ่มต้น: 2026)
ADMIN_PIN=2026

# 4. Public URL (ทางเลือก: เมื่อนำขึ้น Cloud VPS, ngrok, หรือจด Domain Name)
# หากเว้นว่างไว้ ระบบจะคำนวณจาก IP ของวง Wi-Fi ในเครื่องให้อัตโนมัติ
PUBLIC_URL=
```

---

## 8. การเปิดใช้งานด้วย Docker & Docker Compose

ระบบมีไฟล์คอนฟิก Docker ที่เบาและปลอดภัยบนฐาน **Alpine Linux** พร้อมใช้งานทันที:

### รันด้วย Docker Compose (แนะนำ)
```bash
docker compose up -d --build
```
ตรวจสอบสถานะคอนเทนเนอร์:
```bash
docker compose ps
docker compose logs -f
```
หยุดการทำงาน:
```bash
docker compose down
```

### รันด้วย Docker CLI โดยตรง
```bash
# บิลด์อิมเมจ
docker build -t inequality-tycoon:latest .

# รันคอนเทนเนอร์
docker run -d \
  --name inequality-game \
  -p 3005:3005 \
  --env-file .env \
  --restart unless-stopped \
  inequality-tycoon:latest
```

---

## 9. โครงสร้างซอร์สโค้ด (Project Architecture)

```text
makeGameV2/
├── aiEngine.js                  # ระบบ AI Dungeon Master (Gemini 3.7 Flash + Safe Fallback)
├── server.js                    # จุดเริ่มระบบ Express HTTP + Socket.IO Server
├── Dockerfile                   # Dockerfile Multi-stage build (Node 20 Alpine)
├── docker-compose.yml           # คอนฟิก Docker Compose สำหรับ Production
├── package.json                 # รายการ Dependencies และ Scripts
├── .env.example                 # แม่แบบไฟล์ Environment Variables
│
├── src/                         # แกนหลักระบบเกมฝั่งเซิร์ฟเวอร์ (Modular Backend)
│   ├── constants/
│   │   └── gameData.js          # ข้อมูล 6 ไตรมาส, ค่าตั้งต้น 4 ชนชั้น, สูตรคำนวณ D&D
│   ├── engine/
│   │   ├── economicsEngine.js   # เอนจินคำนวณ Lorenz Curve, Gini, GDP, หนี้สาธารณะ
│   │   └── settlementEngine.js  # เอนจินประมวลผล D20, การตัดยอดรอบ, Bot Takeover
│   ├── services/
│   │   └── roomManager.js       # จัดสรร 20 เขตเศรษฐกิจ, Auto-Matchmaking, Bot Filling
│   ├── socket/
│   │   └── socketHandlers.js    # จัดการ Realtime Socket.IO Events และ Reconnect
│   └── utils/
│       └── security.js          # เครื่องมือความปลอดภัย, Rate Limiter, Crypto Random D20
│
└── public/                      # ระบบฝั่งไคลเอนต์ (Modular Frontend SPA)
    ├── index.html               # หน้าหลักที่โหลด Layout และ CSS Tokens
    ├── style.css                # ดีไซน์ระบบ Glassmorphism, Theme Tokens, Responsive CSS
    ├── partials/                # ชิ้นส่วน HTML Modular Templates
    │   ├── header.html          # ส่วนหัวและแถบสถานะการเชื่อมต่อ
    │   ├── modals.html          # หน้าต่าง Reveal บทบาท, รายชื่อกลุ่ม, ยืนยัน Admin PIN
    │   ├── view-lobby.html      # หน้าจอกรอกชื่อผู้เล่นก่อนเริ่ม
    │   ├── view-master.html     # แดชบอร์ดศูนย์บัญชาการจอใหญ่ 200 คน
    │   ├── view-player.html     # หน้าต่างสเต็ป 1-2-3 สำหรับผู้เล่น
    │   └── view-gameover.html   # หน้าจอสรุปผลคะแนนและผู้ชนะเมื่อจบเกม
    └── js/
        ├── state.js             # สถานะผู้เล่นและห้องเกมฝั่ง Client
        ├── charts/              # กราฟิก Canvas Lorenz Curve
        ├── events/              # รับฟังและส่ง Socket Events ฝั่ง Client
        ├── ui/                  # ระบบเสียง Audio, Toast Notifications
        └── views/               # ตัวเรนเดอร์หน้า Master, Player, Projector, GameOver
```

---

## 10. การทดสอบระบบ (Automated Tests)

โปรเจกต์มีชุดทดสอบอัตโนมัติครอบคลุมทั้งตรรกะเศรษฐศาสตร์, การจัดสรร 200 ผู้เล่น, AI Engine, และการทำงานของบอทเมื่อมีคนหลุด:

```bash
# 1. ทดสอบระบบเศรษฐศาสตร์และสูตรคำนวณ Gini / Lorenz
node test_economics.js

# 2. ทดสอบการ Matchmaking และกระจายผู้เล่น 200 คนลง 20 เขต
node test_200_players_dnd.js

# 3. ทดสอบการทำงานของ AI Engine (Gemini และ Fallback)
node test_ai.js

# 4. ทดสอบระบบ Auto-Bot Takeover เมื่อผู้เล่นหลุดการเชื่อมต่อ
node test_bot_allocation.js
```

---

## 📜 สัญญาอนุญาต (License)
ซอฟต์แวร์นี้เผยแพร่ภายใต้สัญญาอนุญาต **MIT License** สามารถนำไปประยุกต์ใช้เพื่อการศึกษา การวิจัย และการจัดกิจกรรมการเรียนรู้ได้อย่างอิสระ.
