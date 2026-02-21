# คู่มือระบบ Template — LP Factory V2

> อธิบาย Flow ทั้งหมดของระบบ Template ตั้งแต่การสร้าง → บันทึก → โหลด → Preview → ใช้งาน

---

## ภาพรวม

ระบบ Template ใน LP Factory V2 ช่วยให้สร้าง Landing Page template ได้ 4 วิธี แล้วบันทึกลง Database เพื่อให้ LP Wizard ดึงมาใช้ได้ทันที

```
สร้าง Template (4 วิธี)
        │
        ▼
POST /api/templates → D1 Database
        │
        ▼
GET /api/templates → Cache ใน Browser
        │
        ▼
LP Wizard → เลือก Template → Preview → Deploy LP
```

---

## 1. วิธีสร้าง Template (4 เส้นทาง)

### วิธีที่ 1 — Start from Scratch (สร้างใหม่ด้วย Wizard)

```
ผู้ใช้กรอกข้อมูลใน Template Wizard
    │
    ├─ Step 1: ชื่อ Template, คำอธิบาย, หมวดหมู่
    ├─ Step 2: เลือก Color Scheme + Font
    ├─ Step 3: เลือก Features (Hero Form, FAQ, Calculator…)
    └─ Step 4: กด "Generate Code"
                    │
                    ▼
        generateTemplateCode(state)
        ← src/components/TemplateGenerator/generateTemplateCode.js
                    │
                    │  สร้างไฟล์ Astro project:
                    │  • package.json
                    │  • astro.config.mjs
                    │  • src/pages/index.astro  ← HTML + CSS + JS
                    ▼
        [Review Step] → กด "Save Template"
                    │
                    ▼
        POST /api/templates → บันทึกลง D1 ✅
```

### วิธีที่ 2 — Clone Existing (คัดลอกจาก Template ที่มีอยู่)

```
ผู้ใช้เลือก Template ต้นแบบ + ตั้งชื่อ Folder ใหม่
    │
    ▼
tmpl.generate(SAMPLE_SITE)
← packages/lp-template-generator/src/templates/<id>/index.js
    │
    │  ได้ไฟล์จริงของ Template นั้น:
    │  • src/pages/index.astro (HTML จริง)
    │  • astro.config.mjs
    │  • src/styles/, src/components/ ฯลฯ
    ▼
[Review Step] → กด "Save Template"
    │
    ▼
POST /api/templates → บันทึกลง D1 ✅
```

### วิธีที่ 3 — Upload ZIP (อัปโหลดไฟล์ .zip จาก Astro project)

```
ผู้ใช้ลาก .zip file วางในช่อง Upload
    │
    ▼
JSZip.loadAsync(file)
← src/components/TemplateGenerator/steps/StepTemplateFromZip.jsx
    │
    │  แตกไฟล์ออกมา (ข้าม node_modules/, dist/, .git/)
    │  ตรวจสอบว่ามี src/pages/index.astro ✓
    │
    ▼
[Review Step] → กด "Save Template"
    │
    ▼
POST /api/templates → บันทึกลง D1 ✅
```

### วิธีที่ 4 — CLI Script (แปลง Folder → JSON แล้ว Upload)

```bash
# แปลงเป็น JSON ไฟล์ก่อน
node scripts/folder-to-template-json.js ./my-astro-project \
  --id my-lp \
  --name "My LP Template" \
  --desc "คำอธิบาย"

# หรือ Upload ตรงเข้า API เลย
node scripts/folder-to-template-json.js ./my-astro-project \
  --id my-lp \
  --name "My LP Template" \
  --upload \
  --api-url http://localhost:8787
```

```
./my-astro-project/
    │
    ▼
scripts/folder-to-template-json.js
    │
    │  รวบรวมไฟล์ทุกไฟล์ (.astro, .js, .ts, .css, .json…)
    │  ข้าม: node_modules/, dist/, .git/, package-lock.json
    │  ตรวจสอบ: src/pages/index.astro ต้องมี
    │
    ├─ บันทึกเป็น my-lp.template.json  (ถ้าไม่ใช้ --upload)
    │
    └─ POST /api/templates  (ถ้าใช้ --upload)
              │
              ▼
        D1 Database ✅
```

---

## 2. โครงสร้าง Payload ที่ส่งไป API

```json
{
  "templateId": "my-lp",
  "name": "My LP Template",
  "description": "คำอธิบาย Template",
  "category": "general",
  "badge": "New",
  "sourceCode": "// โค้ด generator (สำหรับ Clone mode)",
  "files": {
    "src/pages/index.astro": "<!doctype html>...",
    "astro.config.mjs": "import { defineConfig }...",
    "src/styles/global.css": "* { margin: 0; }",
    "package.json": "{ \"name\": \"my-lp\" ... }"
  }
}
```

---

## 3. การบันทึกลง Database

```
POST /api/templates
← apps/api-worker/src/worker.js
    │
    ▼
Cloudflare D1 (ตาราง templates)
┌────────────────────────────────────────────────────┐
│  id          │ UUID อัตโนมัติ                       │
│  template_id │ "my-lp"                             │
│  name        │ "My LP Template"                    │
│  description │ "คำอธิบาย"                          │
│  category    │ "general"                           │
│  badge       │ "New"                               │
│  source_code │ "// generator code..."              │
│  files       │ JSON string ของ files object        │
│  created_at  │ timestamp                           │
└────────────────────────────────────────────────────┘
```

---

## 4. การโหลด Template เข้า LP Wizard

```
ผู้ใช้เปิด LP Wizard → Step Design
    │
    ▼
StepDesign.jsx เรียก refreshCustomTemplates()
← src/components/Wizard/StepDesign.jsx
    │
    ▼
GET /api/templates
← apps/api-worker/src/worker.js
    │
    ▼
template-registry.js แคชผลลัพธ์ไว้ใน Memory
← src/utils/template-registry.js
    │
    │  customTemplatesCache = [
    │    { id, template_id, name, files: {...} },
    │    ...
    │  ]
    │
    ▼
รวมกับ Built-in Templates (classic, pdl-loans-v1, ฯลฯ)
    │
    ▼
แสดงใน Template Selector Grid ✅
```

---

## 5. การ Preview Template (iframe แบบ Real-time)

```
ผู้ใช้เลือก Template + Color + Font ใน LP Wizard
    │
    ▼
useMemo → generateHtmlByTemplate(config)
← src/utils/template-router.js
    │
    ├─ Template ใน Built-in?
    │    └─ generateFromModule(templateId, site)
    │         └─ packages/lp-template-generator/src/templates/<id>/index.js
    │
    ├─ Template จาก API (Custom)?
    │    └─ customTemplatesCache.find(t => t.id === templateId)
    │         └─ ดึง files จาก Cache ที่โหลดไว้แล้ว
    │
    └─ ทั้งสองเส้นทาง → astroToHtmlPreview(files, site)
                │
                │  ขั้นตอนการแปลง:
                │  1. ตรวจว่ามี Astro frontmatter (---) ไหม
                │  2. ถ้าไม่มี → return HTML ตรงๆ (ป้องกัน JS เสียหาย)
                │  3. ถ้ามี → ลบ frontmatter ออก
                │  4. Strip: define:vars={{}}, is:inline, is:global
                │  5. Inject fallback vars: conversionId, formStartLabel ฯลฯ
                │  6. Replace: ${brand}, ${h1}, ${c.primary} ด้วยข้อมูลจริง
                ▼
           HTML string สมบูรณ์
                │
                ▼
        <iframe srcDoc={html} />  ← แสดงใน LP Wizard ✅
```

---

## 6. การใช้ Template สร้าง LP จริง

```
ผู้ใช้กรอกข้อมูล LP ครบทุก Step
    │  • Brand name, Domain
    │  • Headline, Subheadline, CTA
    │  • Color, Font
    │  • Template ที่เลือก
    ▼
generateHtmlByTemplate(site)  ← เหมือน Preview แต่ใช้ข้อมูลจริง
    │
    ▼
POST /api/sites → บันทึก LP ลง Database
    │
    ▼
Deploy → Cloudflare Pages / Netlify
    │
    ▼
LP ออนไลน์ ✅  https://mybrand.com
```

---

## 7. ตารางไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|------|---------|
| `src/components/TemplateGenerator/TemplateGeneratorModal.jsx` | Wizard หลัก — จัดการ 3 modes และ step navigation |
| `src/components/TemplateGenerator/generateTemplateCode.js` | สร้างโค้ด Astro สำหรับ "Start from Scratch" mode |
| `src/components/TemplateGenerator/steps/StepTemplateFromDir.jsx` | UI สำหรับ Clone Existing mode |
| `src/components/TemplateGenerator/steps/StepTemplateFromZip.jsx` | UI สำหรับ Upload ZIP mode (ใช้ JSZip) |
| `src/components/TemplateGenerator/steps/StepTemplateReview.jsx` | หน้าสรุปก่อน Save — แสดงข้อมูล Template |
| `src/utils/template-router.js` | แปลง Astro files → HTML สำหรับ iframe preview |
| `src/utils/template-registry.js` | โหลดและแคช Custom Templates จาก API |
| `apps/api-worker/src/worker.js` | API endpoint: `POST/GET /api/templates` |
| `packages/lp-template-generator/src/templates/` | Built-in template generators (classic, pdl-loans-v1 ฯลฯ) |
| `scripts/folder-to-template-json.js` | CLI script: แปลง Astro folder → JSON → upload |

---

## 8. วิธีใช้ CLI Script

```bash
# ดู help
node scripts/folder-to-template-json.js

# แปลงเป็นไฟล์ JSON (ไม่ upload)
node scripts/folder-to-template-json.js ./templates/elastic-credits-v4 \
  --id elastic-v4 \
  --name "Elastic Credits V4" \
  --desc "Credit template with calculator" \
  --category general \
  --badge Stable

# ผลลัพธ์: elastic-v4.template.json

# Upload ตรงเข้า API (dev)
node scripts/folder-to-template-json.js ./templates/elastic-credits-v4 \
  --id elastic-v4 \
  --name "Elastic Credits V4" \
  --upload \
  --api-url http://localhost:8787

# Upload ตรงเข้า API (production)
node scripts/folder-to-template-json.js ./templates/elastic-credits-v4 \
  --id elastic-v4 \
  --name "Elastic Credits V4" \
  --upload \
  --api-url https://api.yourdomain.com
```

### ไฟล์ที่ script รับ / ข้ามอัตโนมัติ

| รับ | ข้าม |
|-----|------|
| `.astro` `.js` `.ts` `.jsx` `.tsx` `.mjs` `.css` `.json` `.html` `.md` `.env` `.toml` | `node_modules/` `dist/` `.git/` `.astro/` `.cache/` `package-lock.json` `bun.lock` |

---

## 9. Event Flow เมื่อ Save Template สำเร็จ

```
กด "Save Template"
    │
    ▼
App.jsx → onSave(state)
    │
    ▼
POST /api/templates ← ส่ง payload ไป API
    │
    ├─ สำเร็จ → notify("Template saved successfully!", "success")
    │              │
    │              ├─ refreshCustomTemplates()  ← โหลด Cache ใหม่
    │              │
    │              └─ window.dispatchEvent(TEMPLATE_REFRESH_EVENT)
    │                      │
    │                      ▼
    │              StepDesign.jsx รับ event → reload template list
    │              Template ปรากฏใน LP Wizard ทันที ✅
    │
    └─ ล้มเหลว → notify("Error saving template", "error")
```
