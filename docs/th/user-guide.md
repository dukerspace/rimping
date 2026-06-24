# คู่มือผู้ใช้

คู่มือนี้ครอบคลุมทุกอย่างที่คุณต้องการเพื่อติดตั้ง ตั้งค่า และใช้งาน Rimping ในชีวิตประจำวัน

## สิ่งที่ต้องมี

- [Bun](https://bun.sh) >= 1.0

## การติดตั้ง

### จากซอร์สโค้ด (repo นี้)

```bash
git clone <repo-url> rimping
cd rimping
bun install
bun run build
```

หลัง build แล้ว ใช้ CLI ผ่าน:

```bash
bunx rimping <command>
# หรือระหว่างพัฒนา:
bun run rimping -- <command>
```

## เริ่มต้นใช้งาน

### 1. สร้าง config โปรเจกต์

```bash
rimping init
```

สร้าง `.rimping/config.json` พร้อมค่าเริ่มต้นและตรวจจับ AI agent อัตโนมัติ

| Flag | คำอธิบาย |
|------|----------|
| `--force` | เขียนทับ config ที่มีอยู่ |
| `--dry-run` | แสดงผลลัพธ์โดยไม่เขียนไฟล์ |
| `--no-detect` | ข้ามการตรวจจับ agent |
| `--json` | แสดงผลเป็น JSON |
| `--cwd <path>` | ไดเรกทอรีเป้าหมาย (ค่าเริ่มต้น: ปัจจุบัน) |

### 2. ตรวจสอบสุขภาพโปรเจกต์

```bash
rimping doctor
```

ตรวจจับ AI coding agent ที่ติดตั้งและตรวจสอบการตั้งค่า Rimping ออกด้วย exit code `1` เมื่อพบปัญหา (ไม่มี config, config ไม่ถูกต้อง, ไม่มี agent skill)

| Flag | คำอธิบาย |
|------|----------|
| `--json` | รายงาน doctor แบบ JSON เต็ม |
| `--cwd <path>` | ไดเรกทอรีเป้าหมาย |

### 3. สร้างแนวทางสำหรับ agent (ไม่บังคับ)

```bash
rimping skills init
```

สร้าง `.agents/skills/rimping-guidelines/SKILL.md` — วินัยทางวิศวกรรมสำหรับ AI assistant (คิดก่อนเขียนโค้ด, โซลูชันขั้นต่ำ, แก้ไขเฉพาะจุด, ตรวจสอบด้วยเทสต์)

### 4. ตั้งค่า Cursor hooks (ไม่บังคับ)

```bash
rimping hooks init
```

ติดตั้ง hook `beforeSubmitPrompt` ที่ปรับ prompt ก่อนส่งไปยัง agent รีสตาร์ท Cursor หลังติดตั้ง

## คำสั่ง

### `optimize [prompt]`

ส่ง prompt ผ่าน pipeline การปรับให้กระชับทั้งหมด

```bash
# การใช้งานพื้นฐาน
rimping optimize "please could you help me refactor this typescript code"

# รวม git diff
rimping optimize --diff "review my changes"

# ใช้ skill เฉพาะ
rimping optimize --skills typescript-refactor,git-diff-analyzer "refactor types"

# กำหนดงบ token
rimping optimize --max-tokens 4000 "long prompt..."

# อ่านจาก stdin
echo "my prompt" | rimping optimize --stdin

# ผลลัพธ์ JSON พร้อมสถิติ
rimping optimize --json "optimize this"

# แสดงขั้นตอน pipeline บน stderr
rimping optimize --explain "verbose prompt with filler words"
```

| Flag | คำอธิบาย |
|------|----------|
| `--diff` | ใส่ git diff (เฉพาะ hunk ที่แก้ไข) |
| `--skills <ids>` | ID ของ skill คั่นด้วย comma |
| `--max-tokens <n>` | ขีดจำกัด token |
| `--provider <name>` | รูปแบบผลลัพธ์: `openai`, `claude`, `gemini`, `mock` |
| `--stdin` | อ่าน prompt จาก stdin |
| `--json` | ผลลัพธ์ JSON เต็ม |
| `--no-cache` | ข้าม cache |
| `--explain` | แสดงขั้นตอน pipeline บน stderr |

### `stats`

แสดงสถิติ cache และสรุปการปรับ prompt ครั้งล่าสุด

```bash
rimping stats
```

### `explain`

แสดงรายละเอียด pipeline จากการรัน `optimize` ครั้งล่าสุด (ขั้นตอน, จำนวน token, กลยุทธ์ที่ใช้)

```bash
rimping explain
```

### `skills init`

สร้าง agent skill `rimping-guidelines` ที่มาพร้อม

| Flag | คำอธิบาย |
|------|----------|
| `--force` | เขียนทับ `SKILL.md` ที่มีอยู่ |
| `--dry-run` | แสดงผลโดยไม่เขียนไฟล์ |
| `--json` | แสดงผลเป็น JSON |
| `--cwd <path>` | ไดเรกทอรีเป้าหมาย |

### `hooks init`

สร้างไฟล์ hook `beforeSubmitPrompt` สำหรับ Cursor

| Flag | คำอธิบาย |
|------|----------|
| `--force` | เขียนทับไฟล์ hook ที่มีอยู่ |
| `--dry-run` | แสดงผลโดยไม่เขียนไฟล์ |
| `--json` | แสดงผลเป็น JSON |
| `--cwd <path>` | ไดเรกทอรีเป้าหมาย |

## การตั้งค่าโปรเจกต์

ไฟล์ config: `.rimping/config.json`

```json
{
  "version": 1,
  "provider": "openai",
  "maxTokens": 8000,
  "defaultSkills": [],
  "diff": false,
  "hooks": {
    "enabled": true,
    "optimizeOnSubmit": true,
    "injectDiff": false,
    "minPromptLength": 80,
    "minSavingsPercent": 5,
    "logStats": true
  },
  "agents": {
    "cursor": { "enabled": true },
    "claude": { "enabled": true }
  }
}
```

| ฟิลด์ | คำอธิบาย |
|-------|----------|
| `version` | เวอร์ชัน schema ของ config (ปัจจุบัน `1`) |
| `provider` | adapter เริ่มต้น: `openai`, `claude`, `gemini`, `mock` |
| `maxTokens` | ขีดจำกัด token เริ่มต้น |
| `defaultSkills` | ID skill ที่ใช้ทุกครั้งที่ optimize |
| `diff` | รวม git diff เป็นค่าเริ่มต้น |
| `hooks` | พฤติกรรม Cursor hook (ดูด้านล่าง) |
| `agents` | AI agent ที่ตรวจพบและเปิดใช้งาน |

### การตั้งค่า hooks

| ฟิลด์ | ค่าเริ่มต้น | คำอธิบาย |
|-------|-------------|----------|
| `enabled` | `true` | สวิตช์หลักสำหรับการปรับ prompt ผ่าน hook |
| `optimizeOnSubmit` | `true` | ปรับ prompt เมื่อส่ง |
| `injectDiff` | `false` | รวม git diff เมื่อปรับผ่าน hook |
| `minPromptLength` | `80` | ข้าม prompt ที่สั้นกว่านี้ |
| `minSavingsPercent` | `5` | ข้ามถ้าประหยัดได้น้อยกว่าเปอร์เซ็นต์นี้ |
| `logStats` | `true` | บันทึกสถิติการปรับจาก hook |

Hook **fail open** — ถ้าการปรับล้มเหลว จะส่ง prompt เดิมโดยไม่เปลี่ยนแปลง

## Prompt Skills

Prompt skills เป็นไฟล์ Markdown พร้อม YAML frontmatter Rimping โหลดจาก:

1. `./skills/` (รากโปรเจกต์)
2. `~/.rimping/skills/` (ระดับผู้ใช้ — `id` เดียวกันจะ override โปรเจกต์)

### Skills ที่มาพร้อม

| Skill ID | จุดเน้น |
|----------|---------|
| `software-engineer` | บีบอัด prompt พัฒนาทั่วไป |
| `typescript-refactor` | บีบอัด TypeScript โดยรักษา type |
| `backend-architecture` | ตัด context API และ service |
| `git-diff-analyzer` | ลด context ที่เน้น diff |

Skills จะถูกตรวจจับอัตโนมัติจากคำสำคัญใน prompt เมื่อไม่ได้ระบุ `--skills`

### สร้าง skill เอง

สร้าง `skills/my-skill.md`:

```markdown
---
id: my-skill
name: My Skill
tags: [tag1, tag2]
priority: 15
triggers: [keyword1, keyword2]
---

## Goal
สิ่งที่ skill นี้มุ่งปรับให้กระชับ

## Rules
- กฎข้อหนึ่ง
- กฎข้อสอง

## Transformation
วิธีแปลง prompt ที่ตรงกับ skill

## Output Style
กระชับ, ใช้คำสั่ง, ฯลฯ
```

| ฟิลด์ frontmatter | คำอธิบาย |
|-------------------|----------|
| `id` | ตัวระบุ skill ที่ไม่ซ้ำ |
| `name` | ชื่อที่อ่านง่าย |
| `tags` | แท็กจัดหมวด |
| `priority` | skill ที่ priority สูงกว่าจะถูกใช้ก่อน |
| `triggers` | คำสำคัญสำหรับตรวจจับอัตโนมัติ |

## Agent Skills

Agent skills อยู่ใน `.agents/skills/` และกำหนดพฤติกรรม AI coding assistant — **ไม่** เป็นส่วนของ pipeline ปรับ token

รัน `rimping skills init` เพื่อติดตั้ง `rimping-guidelines` ซึ่งกำหนดวินัยทางวิศวกรรม: คิดก่อน, ตกลงก่อนเขียนโค้ด, โซลูชันขั้นต่ำ, แก้ไขเฉพาะจุด, ตรวจสอบด้วยเทสต์, ใช้ภาษา domain ร่วมกัน

## AI Agent ที่รองรับ

`rimping doctor` ตรวจจับ agent เหล่านี้:

| Agent | สัญญาณการตรวจจับ |
|-------|------------------|
| Cursor | `.cursor/`, `~/.cursor/` |
| Claude Code | `.claude/`, `CLAUDE.md`, `claude` CLI |
| OpenAI Codex | `~/.codex/`, `codex` CLI |
| ChatGPT | ตรวจจับในเครื่องไม่ได้ |
| Gemini CLI | `.gemini/`, `gemini` CLI |
| Antigravity | `~/.antigravity/`, `~/.antigravity-ide/` |
| Windsurf | `.windsurf/`, `~/.codeium/windsurf/` |
| GitHub Copilot | `.github/copilot-instructions.md`, `gh copilot` |
| Continue | `.continue/`, `~/.continue/` |
| Cline | `.cline/` |
| Aider | `.aider.conf.yml`, `aider` CLI |

## Cache

Prompt ที่ปรับแล้วถูก cache ใน `~/.rimping/cache/` อายุ 24 ชั่วโมง ใช้ `--no-cache` เพื่อข้าม

ดูสถิติ cache ด้วย `rimping stats`

## การใช้งานแบบโปรแกรม

```typescript
import { optimize } from '@rimping/core'
import { preSend } from '@rimping/core/hooks'

const result = await optimize({
  prompt: 'please help me fix this bug',
  diff: true,
  maxTokens: 4000,
})

console.log(result.optimized)
console.log(result.stats.savingsPercent)

// wrapper สำหรับ hook (เคารพ config + hooks)
const { text, optimized, stats } = await preSend('my prompt')
```

## แก้ปัญหา

| ปัญหา | วิธีแก้ |
|-------|---------|
| `doctor` รายงานว่าไม่มี config | รัน `rimping init` |
| ไม่มีการประหยัด token | prompt อาจสั้นเกินไป ลองใช้ prompt ที่ยาวและมีคำฟุ่มเฟือย |
| Hook ไม่ปรับ prompt | ตรวจ `hooks.enabled` และ `minPromptLength` ใน config |
| ไม่มี git diff | ต้องอยู่ใน git repo ใช้ `--diff` หรือตั้ง `diff: true` |
| Skill ไม่ถูกใช้ | ตรวจว่า triggers ตรงกับ prompt หรือระบุ `--skills <id>` โดยตรง |
