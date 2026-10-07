# Leanstack

Leanstack เป็นชุดไฟล์อยู่ใต้ `packages/leanstack/templates/` เอเจนต์จัดประเภทงานด้วยกฎ โหลด skill เดียว (และหลักการเฉพาะงาน Hard) ตรวจผล แล้วหยุด

ไม่มี CLI `leanstack` ไม่เรียก `rimping optimize` และไม่เรียก private agent API เอเจนต์อ่านไฟล์ใน templates (หรือสำเนาใต้ `.agents/` ของโปรเจกต์)

คู่มือการทำงานแบบเล่าเรื่อง → [คู่มือการทำงาน](./leanstack-guide)

สรุปแพ็กเกจ: [packages/leanstack/README.md](https://github.com/dukerspace/rimping/blob/main/packages/leanstack/README.md)

## โครงไฟล์

```text
packages/leanstack/templates/
├── AGENTS.md
├── budgets.yaml
├── core/          # router.md, context.md, stop.md
├── principles/    # หลักการสั้น 7 ข้อ
├── skills/        # implement, debug, refactor, architect, review (+ guidelines)
├── agents/        # general, debugger, architect, reviewer
├── adapters/      # cursor, claude, codex, chatgpt
└── commands/      # แหล่ง slash command ของ Cursor
```

## Workflow

```text
TASK → จัดประเภท (กฎ ไม่ใช่ LLM) → งบ → skill เดียว → ตรวจผล → STOP
```

### จัดประเภท

จัดประเภทด้วยกฎที่กำหนดไว้ อย่าเรียกโมเดลแค่เพื่อจัดประเภท ถ้าผู้ใช้ระบุโหมด ให้ใช้โหมดนั้น

| Class | เมื่อไหร่ |
|-------|----------|
| **Hard** | สถาปัตยกรรม, migration, security, concurrency, distributed, ข้ามแพ็กเกจ, บั๊ก production ที่ flaky หรือล้ม |
| **Tiny** | typo, คอมเมนต์, เปลี่ยนชื่อจุดเดียว, formatting, แก้บรรทัดเดียวที่ชัด |
| **Debug + Normal** | บั๊กหรือความล้มเหลวที่ไม่ใช่ Hard |
| **Refactor + Normal** | ปรับโครงสร้างโดยไม่เปลี่ยนพฤติกรรม (เปลี่ยนชื่อไฟล์เดียว → Tiny) |
| **Implement + Normal** | อย่างอื่นทั้งหมด |

### Context แบบค่อยเป็นค่อยไป

อย่าโหลดทั้งชุดในครั้งเดียว ดู `core/context.md`:

| Class | โหลด |
|-------|------|
| Tiny | แค่ `AGENTS.md` |
| Normal | `AGENTS.md` + skill body เดียว |
| Hard | `AGENTS.md` + `core/router.md` + skill ที่เลือก + หลักการ 2–3 ข้อ |

เปิด `budgets.yaml` ตอน Hard หรือเมื่อรายงานเพดาน ไฟล์หลักการเปิดเฉพาะงาน Hard (หรือเมื่อการออกแบบยังไม่ชัด)

### งบประมาณ (Budget)

เพดาน workflow จาก `budgets.yaml` — ไม่ใช่เพดาน API และไม่ใช่เป้าหมายการใช้จ่าย:

| Class | Tokens | Agents | Skills | Principles | Escalations |
|-------|--------|--------|--------|------------|-------------|
| tiny | 5K | 1 | 1 | 2 | 0 |
| normal | 20K | 1 | 2 | 3 | 1 |
| hard | 50K | 3 | 4 | 5 | 2 |

ถ้างบหมด: STOP สรุป หรือถามผู้ใช้ อย่าสร้างเอเจนต์เพิ่มเพื่อใช้งบต่อ

### Skills, agents, escalation

Mode skills: `skills/{implement,debug,refactor,architect,review}/SKILL.md`

`skills/guidelines/` (`rimping-guidelines`) เป็นแนวทางเขียนโค้ดของ Rimping ไม่ใช่เป้าหมายการจัดประเภท และไม่ถูกคัดลอกเข้า Cursor plugin

ค่าเริ่มต้น: เอเจนต์ 1, subagent 0, reviewer 0 ยกระดับเฉพาะหลังความพยายามล้มเหลว และเฉพาะเมื่องบอนุญาต:

```text
general → debugger → architect → reviewer
```

ระดับโมเดล (adapter แมปเป็นโมเดลจริง): **fast** (จัดประเภท / โค้ดง่าย), **standard** (งานปกติ), **reasoning** (สถาปัตยกรรม / บั๊กยาก) อย่า hard-code ชื่อโมเดลของผู้ขายในไฟล์ core

### หยุด

เมื่อ `core/stop.md` เป็นจริง — พฤติกรรมที่ขอทำงานได้ การตรวจผลผ่าน ไม่มี regression ที่รู้ Diff เล็กสุด ไม่มี abstraction ที่ไม่จำเป็น — ให้หยุด อย่าเพิ่ม refactor ที่ไม่เกี่ยว cleanup abstraction ที่เดาไว้ docs หรือเทสต์หลังเช็คลิสต์เป็นจริง

## ติดตั้งในโปรเจกต์

หลังติดตั้ง Cursor plugin (ด้านล่าง) ใช้ `/rimping-init`:

1. สำรวจ repo (สแต็ก config เอเจนต์ที่มีอยู่) ก่อนแก้ใด ๆ
2. คัดลอกจาก `packages/leanstack/templates/` ไป `.agents/` — `AGENTS.md`, `budgets.yaml`, `core/`, `principles/`, `skills/`, `agents/`, `adapters/`
3. คัดลอกเฉพาะไฟล์ที่ยังไม่มี อย่าเขียนทับเว้นแต่ผู้ใช้ขอ force
4. อย่าสร้างหรือเขียนทับ root `AGENTS.md` หรือ `CLAUDE.md`
5. อย่าคัดลอก `commands/` (อยู่ใน Cursor plugin)

ใช้ `/rimping-doctor` ตรวจไฟล์ที่ต้องมี (รวม `core/context.md`) ใช้ `/rimping-status` แสดงไฟล์ในชุดและงบ

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
| `/rimping-run` | จัดประเภท โหลด skill เดียว ตรวจผล หยุด |
| `/rimping-plan` | แผนอย่างเดียว ไม่แก้ไฟล์ |
| `/rimping-debug` | บังคับ debug skill |
| `/rimping-architect` | บังคับ architect skill |
| `/rimping-review` | รีวิวแบบอ่านอย่างเดียว |
| `/rimping-status` | แสดงไฟล์ในชุดและงบ |
| `/rimping-doctor` | ตรวจไฟล์ที่ต้องมี |

ไม่มีคำสั่ง `/rimping-implement` ใช้ `/rimping-run` สำหรับงานแบบ implement การออกแบบร่วมแนะนำคำสั่ง UX หลักสี่อัน (`init`, `plan`, `debug`, `review`) แพ็กนี้เก็บชุดขยายด้านบนเพื่อใช้งานจริง งานปกติยังใช้ Cursor กับ `AGENTS.md` โดยตรงได้

การบีบอัด token ยังอยู่ที่ `rimping init` และ `rimping hooks init` ปลั๊กอินไม่ส่ง `hooks/hooks.json`

## Adapter

รายละเอียดอยู่ที่ `templates/adapters/`:

| Harness | หมายเหตุ |
|---------|----------|
| Cursor | ใช้ `AGENTS.md` เป็น baseline อย่าให้ `.cursor/rules` เป็น source of truth |
| Claude Code | ใช้ `AGENTS.md` เป็นหลัก; `CLAUDE.md` ที่เลือกได้มีแค่ `@AGENTS.md` |
| Codex | ลำดับชั้น `AGENTS.md` แบบ native |
| ChatGPT | วางข้อความคำสั่งบวก skill เดียว ไม่เก็บสำเนาที่สอง |
