# คู่มือการทำงาน Leanstack

มอง Leanstack เป็น “Operating System สำหรับ Cursor Agent” มากกว่าเป็น AI agent ตัวใหม่ที่ทำทุกอย่างเอง

```text
User สั่งงาน → Leanstack เลือกวิธีทำ → Cursor ลงมือ → Verify → Stop
```

อ้างอิง: [Leanstack](./leanstack) · ชุดไฟล์: `packages/leanstack/templates/`

## ภาพรวม

```text
           USER
             │
   /rimping-init | /rimping-plan | /rimping-debug
   /rimping-run  | หรือพิมพ์งานปกติ
             ▼
        Cursor Agent
             ▼
     .agents/AGENTS.md
             ▼
          Router
       ┌─────┼─────┐
       ▼     ▼     ▼
     Tiny  Normal  Hard
      5K    20K    50K
       │     │      │
       ▼     ▼      ▼
    direct  skill  router + skill
                     (+ principles)
             │
             ▼
         IMPLEMENT
             ▼
          VERIFY
             ▼
           STOP
```

## `/rimping-init` ทำอะไร?

คำสั่ง bootstrap เปิดโปรเจกต์แล้วพิมพ์ `/rimping-init`

Cursor อ่าน repository ก่อน (ภาษา, package manager, โครง monorepo, config เอเจนต์ที่มีอยู่) ตัวอย่างการ detect เป็นภาพประกอบ — init ปรับตาม repo จริง:

```text
Language: TypeScript
Package manager: pnpm (หรือ bun, npm, …)
Monorepo: Turbo
…
```

จากนั้นสร้างเฉพาะของที่ขาดใต้ `.agents/`:

```text
.agents/
├── AGENTS.md
├── budgets.yaml
├── core/
├── principles/
├── skills/
├── agents/
└── adapters/
```

ถ้ามีไฟล์ใน `.agents` อยู่แล้ว จะไม่เขียนทับเว้นแต่คุณขอ force Root `AGENTS.md` และ `CLAUDE.md` จะไม่ถูกเขียนโดยคำสั่งนี้ `commands/` อยู่ใน Cursor plugin ไม่ได้อยู่ใน `.agents/`

## หลัง Init แล้วเกิดอะไรขึ้น?

สมมติคุณสั่ง:

```text
/rimping-run
เพิ่ม coupon ที่สามารถใช้ได้กับ booking
```

(ไม่มีคำสั่ง `/rimping-implement` ใช้ `/rimping-run` หรือพิมพ์งานปกติเมื่อโหลด `AGENTS.md` แล้ว)

Cursor จะไม่ได้อ่านทุกอย่าง มันเริ่มจาก `.agents/AGENTS.md` จัดประเภท (เช่น implement + normal) แล้วโหลดแค่ `skills/implement/SKILL.md`

งาน Normal **ไม่เปิด** ไฟล์หลักการ งาน Hard (หรือเมื่อการออกแบบยังไม่ชัด) จึงเปิด `core/router.md` และหลักการที่เกี่ยวข้อง 2–3 ข้อ ไม่โหลด debug / architect / review ถ้าไม่จำเป็น

นี่คือจุดประหยัด token สำคัญ

## Router คือหัวใจ

Router ไม่ได้ทำ AI magic แค่ตอบคำถามง่าย ๆ:

1. **งานนี้คืออะไร?** implement · debug · refactor · architect · review  
2. **งานนี้ใหญ่แค่ไหน?** tiny · normal · hard  

โหลด `core/router.md` เฉพาะงาน Hard หรือเมื่อ class คลุมเครือและเลือกผิดแล้วเปลี่ยนดีไซน์ จัดประเภทด้วยกฎใน `AGENTS.md` อย่าเรียกโมเดลแค่เพื่อจัดประเภท

### Tiny — เปลี่ยนชื่อ

งาน: เปลี่ยนชื่อ `userId` เป็น `customerId` จุดเดียว

```text
type = refactor
complexity = tiny
budget = 5K
```

workflow: อ่าน → แก้ → typecheck (หรือเช็คที่เล็กสุด) → stop  
ไม่ต้อง: architect, reviewer, subagent, แผนยาว

### Normal — Feature

งาน: เพิ่มระบบ coupon

```text
type = implement
complexity = normal
budget = 20K
```

โหลด: `AGENTS.md` + implement skill จากนั้น: ค้นหา booking → pricing → promotion → เข้าใจ flow → แก้โค้ด → test → verify → **STOP**

### Normal — Bug

งาน: booking สร้าง order ซ้ำ

```text
type = debug
complexity = normal
```

โหลด: `skills/debug/SKILL.md` workflow: reproduce → observe → trace → หา root cause → fix → test → **STOP**

จุดสำคัญ: ห้ามเริ่มด้วยการเดา (เช่น “น่าจะเป็น race งั้นใส่ mutex”) ก่อนมีหลักฐาน

### Hard — สถาปัตยกรรม

งาน: ออกแบบระบบ booking availability ใหม่ รองรับ hotel / spa / car rental / concert

```text
complexity = hard
```

escalation เฉพาะเมื่อจำเป็น:

```text
general → architect → implement → reviewer → verification
```

ไม่ใช่ทุกงาน

## Agent ทำงานอย่างไร?

มี 4 roles: `general`, `debugger`, `architect`, `reviewer` แต่ไม่ได้ทำงานพร้อมกันทั้งสี่

ปกติ: **general** ตัวเดียว หลังความพยายามล้มเหลว และเมื่องบอนุญาต:

```text
general → debugger → architect → reviewer
```

ใช้ reviewer กับงาน Hard ความเสี่ยงสูง (payment, migration, security, data integrity) หรือเมื่อผู้ใช้ขอดูรีวิว — ไม่ใช้กับ Tiny/Normal โดยค่าเริ่มต้น

### ทำไมไม่ spawn subagent ทุกครั้ง?

workflow แบบหลายเอเจนต์มักกิน token เยอะ แต่ละตัวต้องอ่าน context ใหม่ เช่น 6 ตัว × ~5K ≈ 30K ทั้งที่งานอาจใช้จริงแค่ ~8K

Leanstack จึงใช้:

```text
เอเจนต์เดียว → skill เดียว → implement → verify
```

สำหรับงานส่วนใหญ่

## `.agents` ทำหน้าที่อะไร?

เป็น knowledge / workflow layer ไม่ใช่ application code

| ส่วน | หน้าที่ |
|------|---------|
| `AGENTS.md` | เราทำงานอย่างไร |
| `core/router.md` | งานนี้ควรใช้ workflow ไหน |
| `skills/*/SKILL.md` | workflow นี้ต้องทำอย่างไร |
| `principles/*.md` | ต้องคิดอย่างไร (Hard / เมื่อดีไซน์ไม่ชัด) |
| `agents/*.md` | ถ้าต้อง delegate ให้ role ไหน |

## ทำไมต้องแยก Principle?

งาน bug ไม่จำเป็นต้องโหลดหลักการทั้งหมด เลือกตามที่ router แมป (เช่น root-cause, behavior-over-implementation, verify) — และเปิดไฟล์หลักการเมื่อเป็น Hard เท่านั้น

```text
Before: AGENTS + หลักการ 7 + skill 5 + agent 4  → เยอะ
After:  AGENTS + skill เดียว (+ หลักการ 2–3 ตอน Hard) → เล็ก
```

นี่คือ Progressive Disclosure (`core/context.md`)

## Verification และ Stop

Rimping / Leanstack ไม่ถือว่า “AI เขียนโค้ดเสร็จ” เท่ากับ DONE

```text
IMPLEMENT → VERIFY → ผ่าน? → STOP
                 └─ ไม่ผ่าน → FIX → VERIFY
```

เลือก **minimum meaningful verification** (`typecheck`, เทสต์ที่เกี่ยว, build) — ไม่รันทุกอย่างแบบบ้าพลัง

หยุดเมื่อ `core/stop.md` เป็นจริง:

- Requested behavior works  
- Relevant verification passes  
- No known regression  
- Diff is minimal  
- No unnecessary abstraction  

ห้าม “ไหน ๆ แล้ว refactor service อื่นดีกว่า” หลังเช็คลิสต์ผ่านแล้ว ช่วยลดทั้ง token เวลา bugs และ scope creep

## คำสั่ง

| คำสั่ง | บทบาท |
|--------|--------|
| `/rimping-init` | สร้าง/เตรียมชุด Leanstack ใน `.agents/` |
| `/rimping-plan` | Understand → classify → inspect → plan → **STOP** (ไม่แก้โค้ด) |
| `/rimping-run` | Classify → skill เดียว → implement → verify → **STOP** |
| `/rimping-debug` | บังคับ debug skill |
| `/rimping-architect` | บังคับ architect skill |
| `/rimping-review` | รีวิวแบบอ่านอย่างเดียว |
| `/rimping-status` / `/rimping-doctor` | ตรวจสุขภาพชุดไฟล์ |

งานเล็กชัดเจนไม่ต้อง `/rimping-plan` ก่อนทุกครั้ง — เสีย turn/token โดยไม่จำเป็น งานปกติใช้ Cursor กับ `AGENTS.md` ได้เลย

`/rimping-init` = เตรียมระบบ · `/rimping-plan` = ใช้ระบบเพื่อวางแผนงาน

## ตัวอย่างจริง: `/rimping-debug`

โครงประมาณ `apps/web`, `apps/api`, `packages/db`, `packages/shared` สั่ง:

```text
/rimping-debug
หลังจาก refresh token หมดอายุ React Query ยังยิง API ต่อ
```

เส้นทาง: task → debug → normal → debug skill (หลักการเฉพาะเมื่อ Hard)

Cursor ตรวจ: Axios interceptor → refresh endpoint → auth store → React Query → logout state พบว่า: refresh fail → cookie expired → interceptor คืน error → user store ไม่ถูก clear แก้จุดเดียว แล้ว typecheck/test ดู diff แล้ว **STOP**

## Token optimization จริง ๆ เกิดตรงไหน?

ไม่ใช่แค่ไฟล์เล็ก แต่เกิดจาก **ไม่ทำสิ่งที่ไม่จำเป็น**

```text
              LEANSTACK
                 │
    ┌────────────┼────────────┐
    │            │            │
 Context      Agents      Planning
 progressive  default 0   minimal
 disclosure
    └────────────┼────────────┘
                 ▼
              VERIFY → STOP
```

เป้าหมาย (workflow budget ไม่ใช่เป้าหมายการใช้จ่าย): Tiny ~1–5K · Normal ~5–20K · Hard ~20–50K อย่าบังคับทุกงานให้เดิน workflow ระดับ Hard

Leanstack ไม่แทนที่ `rimping optimize` / hook บีบอัด token อย่าเปิด poteto-mode คู่กับ harness นี้ — index ของมันหักล้างการประหยัด

## สรุปเป็นประโยคเดียว

Leanstack ไม่ได้พยายามทำให้ AI ฉลาดขึ้น แต่พยายามทำให้ AI “ไม่ทำงานเกินความจำเป็น”

```text
engineering discipline
  + progressive context
  + budget
  + minimal orchestration
  + aggressive STOP
```

Cursor ยังมีความสามารถเต็ม แต่ Leanstack คอยบังคับว่า **เมื่อไหร่ควรคิดเยอะ** และ **เมื่อไหร่ควรหยุด**
