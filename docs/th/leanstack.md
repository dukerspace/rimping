# Leanstack

Leanstack เป็นชุดไฟล์อยู่ใต้ `packages/leanstack/templates/` มองเป็น operating layer สำหรับ Cursor agent — ไม่ใช่ AI ตัวที่สองที่ทำทุกอย่างเอง

```text
User สั่งงาน → Leanstack เลือกวิธีทำ → Cursor ลงมือ → Verify → Stop
```

เอเจนต์จัดประเภทงานด้วยกฎ ค้นหาและจัดอันดับ skill ที่เกี่ยวข้อง (รวม skill ในโปรเจกต์) โหลดตามงบ ตรวจผล แล้วหยุด ไม่มี CLI `leanstack` ไม่เรียก `rimping optimize` และไม่เรียก private agent API เอเจนต์อ่านไฟล์ใน templates (หรือสำเนาใต้ `.agents/` ของโปรเจกต์)

สรุปแพ็กเกจ: [packages/leanstack/README.md](https://github.com/dukerspace/rimping/blob/main/packages/leanstack/README.md)

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
          CLASSIFY
       ┌─────┼─────┐
       ▼     ▼     ▼
     Tiny  Normal  Hard
      5K    20K    50K
       │     │      │
       ▼     ▼      ▼
    direct  router  router
            discover + rank
            load skills
            (+ principles ตอน Hard)
             │
             ▼
          EXECUTE
             ▼
          VERIFY
             ▼
           STOP
```

## โครงไฟล์

```text
packages/leanstack/templates/
├── AGENTS.md
├── budgets.yaml
├── core/          # router.md, context.md, skills-index.md, stop.md
├── principles/    # หลักการสั้น 7 ข้อ
├── skills/        # implement, debug, refactor, architect, review (+ guidelines)
├── agents/        # general, debugger, architect, reviewer
├── adapters/      # cursor, claude, codex, chatgpt
└── commands/      # แหล่ง slash command ของ Cursor
```

## Workflow

```text
TASK → จัดประเภท → ค้นหา skill → จัดอันดับ → โหลด (≤ max_skills) → ลงมือ → ตรวจผล → STOP
```

### จัดประเภท

จัดประเภทด้วยกฎที่กำหนดไว้ อย่าเรียกโมเดลแค่เพื่อจัดประเภท ถ้าผู้ใช้ระบุโหมดหรือ skill ให้ใช้ค่านั้น

**ความซับซ้อน**

| Class | เมื่อไหร่ |
|-------|----------|
| **Hard** | สถาปัตยกรรม, migration, security, concurrency, distributed, ข้ามแพ็กเกจ, บั๊ก production ที่ flaky หรือล้ม |
| **Tiny** | typo, คอมเมนต์, เปลี่ยนชื่อจุดเดียว, formatting, แก้บรรทัดเดียวที่ชัด |
| **Normal** | งานอื่นที่ต้องใช้ skill |

**Task-type hint** (ยังไม่ใช่การเลือก skill สุดท้าย): debug · refactor · architect · review · implement

### ค้นหาและจัดอันดับ

งาน Normal และ Hard เปิด `core/router.md`:

1. อ่าน `core/skills-index.md` (แคตตาล็อก mode skills)
2. สแกน `.agents/skills/**/SKILL.md` (หรือ pack/plugin `skills/*/SKILL.md`) — อ่านแค่ frontmatter ไม่รวม `guidelines`
3. ให้คะแนน 0–100 (keywords, triggers, affinity กับ hint) — implement เป็น fallback ที่ให้คะแนน (~60) ไม่ใช่ผู้ชนะอัตโนมัติ
4. โหลด body ที่คะแนน ≥ 50 เรียงจากสูงสุด ตามเพดาน `max_skills` ใน `budgets.yaml`

### Context แบบค่อยเป็นค่อยไป

อย่าโหลดทั้งชุดในครั้งเดียว ดู `core/context.md`:

| Class | โหลด |
|-------|------|
| Tiny | แค่ `AGENTS.md` |
| Normal | `AGENTS.md` + `core/router.md` + skill body ที่จัดอันดับแล้ว (≤ `max_skills`) |
| Hard | เหมือน Normal + หลักการ 2–3 ข้อ |

เปิด `budgets.yaml` ตอน Hard หรือเมื่อรายงานเพดาน ไฟล์หลักการเปิดเฉพาะงาน Hard

### งบประมาณ (Budget)

เพดาน workflow จาก `budgets.yaml` — ไม่ใช่เพดาน API และไม่ใช่เป้าหมายการใช้จ่าย:

| Class | Tokens | Agents | Skills | Principles | Escalations |
|-------|--------|--------|--------|------------|-------------|
| tiny | 5K | 1 | 1 | 2 | 0 |
| normal | 20K | 1 | 2 | 3 | 1 |
| hard | 50K | 3 | 4 | 5 | 2 |

ถ้างบหมด: STOP สรุป หรือถามผู้ใช้ อย่าสร้างเอเจนต์เพิ่มเพื่อใช้งบต่อ

## Router

โหลด `core/router.md` สำหรับ Normal และ Hard Tiny ข้ามไฟล์นี้

Router:

1. จัดประเภทความซับซ้อนและ task-type hint
2. ค้นหา skill จาก index + สแกนโปรเจกต์
3. จัดอันดับแล้วโหลดตามงบ
4. escalate เฉพาะในเพดาน

คำสั่งบังคับ (`/rimping-debug`, `/rimping-architect`, `/rimping-review`) ข้าม discovery และเปิด skill ที่ระบุเท่านั้น

### Tiny — เปลี่ยนชื่อ

งาน: เปลี่ยนชื่อ `userId` เป็น `customerId` จุดเดียว

```text
hint = refactor
complexity = tiny
budget = 5K
```

workflow: อ่าน → แก้ → typecheck (หรือเช็คที่เล็กสุด) → stop
ไม่ต้อง: router, skills, architect, reviewer, แผนยาว

### Normal — Feature

งาน: เพิ่มระบบ coupon

```text
hint = implement
complexity = normal
budget = 20K
```

โหลด: `AGENTS.md` + router → discover/rank (เช่น implement 90; `frontend` ในโปรเจกต์ 95 ถ้ามี) → โหลด skill สูงสุด ≤ 2 จากนั้น: ค้นหา booking → pricing → promotion → เข้าใจ flow → แก้โค้ด → test → verify → **STOP**

### Normal — Bug

งาน: booking สร้าง order ซ้ำ

```text
hint = debug
complexity = normal
```

rank ดัน debug; โหลด `skills/debug/SKILL.md` (และ domain skill ที่ ≥ 50) workflow: reproduce → observe → trace → หา root cause → fix → test → **STOP**

ห้ามเริ่มด้วยการเดา (เช่น “น่าจะเป็น race งั้นใส่ mutex”) ก่อนมีหลักฐาน

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

## Skills, agents, escalation

Mode skills (ใน `core/skills-index.md`): `skills/{implement,debug,refactor,architect,review}/SKILL.md` skill ในโปรเจกต์ใต้ `.agents/skills/**` ถูกค้นหาและจัดอันดับด้วย

`skills/guidelines/` (`rimping-guidelines`) เป็นแนวทางเขียนโค้ดของ Rimping ไม่ใช่เป้าหมาย route และไม่ถูกคัดลอกเข้า Cursor plugin

ค่าเริ่มต้น: เอเจนต์ 1, subagent 0, reviewer 0 ยกระดับเฉพาะหลังความพยายามล้มเหลว และเฉพาะเมื่องบอนุญาต:

```text
general → debugger → architect → reviewer
```

มี 4 roles: `general`, `debugger`, `architect`, `reviewer` แต่ไม่ได้ทำงานพร้อมกันทั้งสี่ ใช้ reviewer กับงาน Hard ความเสี่ยงสูง (payment, migration, security, data integrity) หรือเมื่อผู้ใช้ขอดูรีวิว — ไม่ใช้กับ Tiny/Normal โดยค่าเริ่มต้น

workflow แบบหลายเอเจนต์มักกิน token เยอะ แต่ละตัวต้องอ่าน context ใหม่ เช่น 6 ตัว × ~5K ≈ 30K ทั้งที่งานอาจใช้จริงแค่ ~8K จึงใช้:

```text
เอเจนต์เดียว → skill ที่จัดอันดับแล้ว (≤ max_skills) → ลงมือ → verify
```

ระดับโมเดล (adapter แมปเป็นโมเดลจริง): **fast** (จัดประเภท / โค้ดง่าย), **standard** (งานปกติ), **reasoning** (สถาปัตยกรรม / บั๊กยาก) อย่า hard-code ชื่อโมเดลของผู้ขายในไฟล์ core

## `.agents` ทำหน้าที่อะไร?

เป็น knowledge / workflow layer ไม่ใช่ application code

| ส่วน | หน้าที่ |
|------|---------|
| `AGENTS.md` | เราทำงานอย่างไร |
| `core/router.md` | จัดประเภท ค้นหา จัดอันดับ โหลด |
| `core/skills-index.md` | แคตตาล็อก mode skills สำหรับ discovery |
| `skills/*/SKILL.md` | ขั้นตอนของ skill ที่เลือก |
| `principles/*.md` | ต้องคิดอย่างไร (Hard เท่านั้น) |
| `agents/*.md` | ถ้าต้อง delegate ให้ role ไหน |

งาน bug ไม่จำเป็นต้องโหลดหลักการทั้งหมด เลือกตามที่ router แมป (เช่น root-cause, behavior-over-implementation, verify) — และเปิดไฟล์หลักการเมื่อเป็น Hard เท่านั้น

```text
Before: AGENTS + หลักการ 7 + skill ทั้งหมด + agent 4  → เยอะ
After:  AGENTS + router + skill ที่จัดอันดับแล้ว (+ หลักการ 2–3 ตอน Hard) → เล็ก
```

นี่คือ Progressive Disclosure (`core/context.md`)

## Verification และ Stop

Done ไม่ใช่ “AI เขียนโค้ดเสร็จ” แต่คือ:

```text
EXECUTE → VERIFY → ผ่าน? → STOP
              └─ ไม่ผ่าน → FIX → VERIFY
```

เลือก **minimum meaningful verification** (`typecheck`, เทสต์ที่เกี่ยว, build) — ไม่รันทุกอย่างแบบบ้าพลัง

หยุดเมื่อ `core/stop.md` เป็นจริง:

- Requested behavior works
- Relevant verification passes
- No known regression
- Diff is minimal
- No unnecessary abstraction

อย่าเพิ่ม refactor ที่ไม่เกี่ยว cleanup abstraction ที่เดาไว้ docs หรือเทสต์หลังเช็คลิสต์เป็นจริง

## ติดตั้งในโปรเจกต์

หลัก: `rimping init` (โปรเจกต์โลคัล) คัดลอกชุด Leanstack ไป `.agents/` จาก `packages/leanstack/templates/` (หรือสำเนาใน CLI) ใช้ `--no-agents` เพื่อข้ามชุดไฟล์ ใช้ `--force` เพื่อเขียนทับไฟล์ที่มีอยู่ Init แบบ global (`-g`) ไม่ติดตั้ง `.agents/`

ทางเลือกฝั่งเอเจนต์หลังติดตั้ง Cursor plugin: `/rimping-init` (กฎคัดลอกเดียวกัน):

1. สำรวจ repo (สแต็ก config เอเจนต์ที่มีอยู่) ก่อนแก้ใด ๆ
2. คัดลอกไป `.agents/` — `AGENTS.md`, `budgets.yaml`, `core/`, `principles/`, `skills/rimping/` (mode skills), `agents/`, `adapters/`
3. คัดลอกเฉพาะไฟล์ที่ยังไม่มี อย่าเขียนทับเว้นแต่ผู้ใช้ขอ force
4. อย่าสร้างหรือเขียนทับ root `AGENTS.md` หรือ `CLAUDE.md`
5. อย่าคัดลอก `commands/` (อยู่ใน Cursor plugin)

สร้างเฉพาะของที่ขาดใต้ `.agents/`:

```text
.agents/
├── AGENTS.md
├── budgets.yaml
├── core/
├── principles/
├── skills/
│   └── rimping/          # implement, debug, refactor, architect, review, guidelines
├── agents/
└── adapters/
```

ใช้ `/rimping-doctor` หรือ `rimping doctor` ตรวจไฟล์ที่ต้องมี (รวม `core/context.md`) ใช้ `/rimping-status` แสดงไฟล์ในชุดและงบ

### หลัง Init

สมมติคุณสั่ง:

```text
/rimping-run
เพิ่ม coupon ที่สามารถใช้ได้กับ booking
```

(ไม่มีคำสั่ง `/rimping-implement` ใช้ `/rimping-run` หรือพิมพ์งานปกติเมื่อโหลด `AGENTS.md` แล้ว)

Cursor จะไม่ได้อ่านทุกอย่าง มันเริ่มจาก `.agents/AGENTS.md` จัดประเภท (เช่น normal + hint implement) เปิด `core/router.md` ค้นหา/จัดอันดับ skill แล้วโหลดเฉพาะ body ที่เลือก (เช่น `skills/rimping/implement/SKILL.md` บวก project skill ที่คะแนนสูง)

งาน Normal **ไม่เปิด** ไฟล์หลักการ งาน Hard เปิดหลักการที่เกี่ยวข้อง 2–3 ข้อ ไม่โหลด mode skill ทั้งหมด — เฉพาะที่คะแนนเกินเกณฑ์ภายใน `max_skills`

นี่คือจุดประหยัด token สำคัญ

## Cursor plugin

ปลั๊กอิน Cursor ในเครื่องเพิ่ม slash commands และ mode skills ห้าอัน ไม่เพิ่ม token-optimization hooks

```bash
bun run plugin:install
```

เขียน `~/.cursor/plugins/local/rimping` จาก:

- `packages/leanstack/.cursor-plugin/plugin.json`
- mode skills ห้าอันใต้ `packages/leanstack/templates/skills/` (ไม่รวม `guidelines`)
- `packages/leanstack/templates/commands/`

Cursor จะไม่โหลด symlink ที่ชี้ไปนอก `~/.cursor/plugins/local` หลังติดตั้งให้ Reload Cursor (`Developer: Reload Window`)

```bash
bun run plugin:validate
```

| คำสั่ง | ทำอะไร |
|--------|--------|
| `/rimping-init` | สำรวจ repo; ก๊อปปี้ชุดไฟล์ไป `.agents/` โดยไม่เขียนทับ |
| `/rimping-run` | จัดประเภท ค้นหา/จัดอันดับ skill โหลด ตรวจผล หยุด |
| `/rimping-plan` | แผนอย่างเดียว ไม่แก้ไฟล์ |
| `/rimping-debug` | บังคับ debug skill |
| `/rimping-architect` | บังคับ architect skill |
| `/rimping-review` | รีวิวแบบอ่านอย่างเดียว |
| `/rimping-status` | แสดงไฟล์ในชุดและงบ |
| `/rimping-doctor` | ตรวจไฟล์ที่ต้องมี |

ไม่มีคำสั่ง `/rimping-implement` ใช้ `/rimping-run` สำหรับงานแบบ implement การออกแบบร่วมแนะนำคำสั่ง UX หลักสี่อัน (`init`, `plan`, `debug`, `review`) แพ็กนี้เก็บชุดขยายด้านบนเพื่อใช้งานจริง งานปกติยังใช้ Cursor กับ `AGENTS.md` โดยตรงได้

งานเล็กชัดเจนไม่ต้อง `/rimping-plan` ก่อนทุกครั้ง — เสีย turn/token โดยไม่จำเป็น `/rimping-init` = เตรียมระบบ · `/rimping-plan` = ใช้ระบบเพื่อวางแผนงาน

การบีบอัด token ยังอยู่ที่ `rimping init` และ `rimping hooks init` ปลั๊กอินไม่ส่ง `hooks/hooks.json`

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

## Adapter

รายละเอียดอยู่ที่ `templates/adapters/`:

| Harness | หมายเหตุ |
|---------|----------|
| Cursor | ใช้ `AGENTS.md` เป็น baseline อย่าให้ `.cursor/rules` เป็น source of truth |
| Claude Code | ใช้ `AGENTS.md` เป็นหลัก; `CLAUDE.md` ที่เลือกได้มีแค่ `@AGENTS.md` |
| Codex | ลำดับชั้น `AGENTS.md` แบบ native |
| ChatGPT | วางข้อความคำสั่งบวก skill ที่จัดอันดับแล้ว ไม่เก็บสำเนาที่สอง |

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
