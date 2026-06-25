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

### 1. สร้าง config และ hooks โปรเจกต์

```bash
rimping init
```

สร้าง `.rimping/config.json` พร้อมค่าเริ่มต้นและตรวจจับ AI agent อัตโนมัติ จากนั้นสร้างไฟล์ hook สำหรับ agent ที่รองรับ (Cursor, Claude Code, Codex, Gemini, Copilot, Windsurf, Antigravity) รีสตาร์ท agent หลังติดตั้ง

| Flag | คำอธิบาย |
|------|----------|
| `--force` | เขียนทับ config และไฟล์ hook ที่มีอยู่ |
| `--dry-run` | แสดงผลลัพธ์โดยไม่เขียนไฟล์ |
| `--no-detect` | ข้ามการตรวจจับ agent |
| `--no-hooks` | สร้างเฉพาะ config — ข้ามการสร้าง hook |
| `-g`, `--global` | เขียน `~/.rimping/config.json` และ hook ระดับ global แทน project-local |
| `--json` | แสดงผลเป็น JSON |
| `--cwd <path>` | ไดเรกทอรีเป้าหมาย (ค่าเริ่มต้น: ปัจจุบัน) |

### 2. ตรวจสอบสุขภาพโปรเจกต์

```bash
rimping doctor
```

ตรวจจับ AI coding agent ที่ติดตั้งและตรวจสอบการตั้งค่า Rimping: config, agent skills และการลงทะเบียน hook ของ Cursor (pre-send, pre-shell, pre-read, post-read) ออกด้วย exit code `1` เมื่อพบปัญหา

| Flag | คำอธิบาย |
|------|----------|
| `--json` | รายงาน doctor แบบ JSON เต็ม |
| `--cwd <path>` | ไดเรกทอรีเป้าหมาย |

### 3. สร้างแนวทางสำหรับ agent (ไม่บังคับ)

```bash
rimping skills init
```

สร้าง `.agents/skills/rimping-guidelines/SKILL.md` — วินัยทางวิศวกรรมสำหรับ AI assistant (คิดก่อนเขียนโค้ด, โซลูชันขั้นต่ำ, แก้ไขเฉพาะจุด, ตรวจสอบด้วยเทสต์)

### 4. ติดตั้ง hook ใหม่ (ไม่บังคับ)

ถ้าใช้ `--no-hooks` หรือต้องการรีเฟรชไฟล์ hook โดยไม่แตะ config:

```bash
rimping hooks init          # hook ระดับโปรเจกต์
rimping hooks init -g       # hook ระดับ global (~/.cursor, ~/.claude, ฯลฯ)
```

## คำสั่ง

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `init` | สร้าง config และ scaffold hook สำหรับ agent |
| `doctor` | ตรวจ agent, config และการลงทะเบียน hook |
| `optimize` | รัน pipeline ปรับ prompt |
| `stats` | สถิติ cache, ประวัติ hook, การปรับครั้งล่าสุด |
| `explain` | รายละเอียด pipeline จาก `optimize` ครั้งล่าสุด |
| `skills init` | ติดตั้ง agent skill `rimping-guidelines` |
| `hooks init` | สร้างไฟล์ hook อย่างเดียว |
| `hooks log` | ดูหรือล้าง `.rimping/hooks.log` |
| `shell run` | รันคำสั่งแล้วพิมพ์ output ที่บีบอัด |
| `update` | ตรวจและติดตั้งอัปเดต CLI |

### `optimize [prompt]`

ส่ง prompt ผ่าน pipeline การปรับให้กระชับทั้งหมด

```bash
# การใช้งานพื้นฐาน
rimping optimize "please could you help me refactor this typescript code"

# รวม git diff
rimping optimize --diff "review my changes"

# ใช้ skill เฉพาะ
rimping optimize --skills my-skill "refactor types"

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
| `--provider <name>` | รูปแบบผลลัพธ์: `openai`, `claude`, `gemini`, `copilot`, `mock` |
| `--stdin` | อ่าน prompt จาก stdin |
| `--json` | ผลลัพธ์ JSON เต็ม |
| `--no-cache` | ข้าม cache |
| `--explain` | แสดงขั้นตอน pipeline บน stderr |
| `--cwd <path>` | รากโปรเจกต์สำหรับ config และ skills (ค่าเริ่มต้น: ตรวจจับอัตโนมัติ) |

### `stats`

แสดงสถิติ cache, สรุปรายวันของ cache และ hook และรายละเอียดการปรับ prompt ครั้งล่าสุด

```bash
rimping stats
```

รายงาน: ไดเรกทอรี cache, จำนวน entry, การประหยัด token, สรุปรายวัน และการรันครั้งล่าสุด (skills, กลยุทธ์, budget guard)

### `explain`

แสดงรายละเอียด pipeline จากการรัน `optimize` ครั้งล่าสุด (ขั้นตอน, จำนวน token, กลยุทธ์ที่ใช้)

```bash
rimping explain
```

### `skills init`

สร้างเทมเพลต agent skill `rimping-guidelines` ใน `.agents/skills/`

| Flag | คำอธิบาย |
|------|----------|
| `--force` | เขียนทับ `SKILL.md` ที่มีอยู่ |
| `--dry-run` | แสดงผลโดยไม่เขียนไฟล์ |
| `--json` | แสดงผลเป็น JSON |
| `--cwd <path>` | ไดเรกทอรีเป้าหมาย |

### `hooks init`

สร้างไฟล์ hook สำหรับ agent ที่รองรับ แต่ละ template เชื่อมสี่จุดเข้า hook:

| คำสั่ง hook | เมื่อไหร่ทำงาน |
|-------------|----------------|
| `rimping hooks pre-send` | ก่อนส่ง prompt — รัน pipeline ปรับ prompt |
| `rimping hooks pre-shell` | ก่อนใช้ shell/bash — rewrite เป็น `rimping shell run` |
| `rimping hooks pre-read` | ก่อนอ่านไฟล์ — ใส่ขีดจำกัดบรรทัด |
| `rimping hooks post-read` | หลังอ่านไฟล์ — บีบอัดเนื้อหาไฟล์ |

Agent ที่รองรับและตำแหน่งไฟล์ hook:

| Agent | ตำแหน่งโปรเจกต์ | ตำแหน่ง global (`-g`) |
|-------|----------------|----------------------|
| Cursor | `.cursor/hooks.json` | `~/.cursor/hooks.json` |
| Claude Code | `.claude/settings.local.json` | `~/.claude/settings.json` |
| OpenAI Codex | `.codex/hooks.json` | `~/.codex/hooks.json` |
| Gemini CLI | `.gemini/settings.json` | `~/.gemini/settings.json` |
| GitHub Copilot | `.github/hooks/lek-optimize.json` | — |
| Windsurf | `.windsurf/hooks.json` | — |
| Antigravity | `.agents/hooks.json` | — |

| Flag | คำอธิบาย |
|------|----------|
| `--force` | เขียนทับไฟล์ hook ที่มีอยู่ |
| `--dry-run` | แสดงผลโดยไม่เขียนไฟล์ |
| `-g`, `--global` | เขียน hook ระดับ global แทน project-local |
| `--json` | แสดงผลเป็น JSON |
| `--cwd <path>` | ไดเรกทอรีเป้าหมาย |

### `hooks log`

ดู log การรัน hook แบบละเอียด ต้องตั้ง `hooks.logStats: true` ใน config

```bash
rimping hooks log
rimping hooks log --last 20
rimping hooks log --json
rimping hooks log --clear
```

| Flag | คำอธิบาย |
|------|----------|
| `--last <n>` | จำนวน entry ล่าสุด (ค่าเริ่มต้น: `10`) |
| `--json` | พิมพ์ JSON ดิบ (หนึ่งบรรทัดต่อ entry) |
| `--clear` | ล้าง `.rimping/hooks.log` |

### `shell run <command>`

รันคำสั่ง shell แล้วพิมพ์ output ที่บีบอัดแล้ว

```bash
rimping shell run "git status"
rimping shell run "cargo test" --explain
```

| Flag | คำอธิบาย |
|------|----------|
| `--json` | ผลลัพธ์ JSON เต็ม |
| `--explain` | แสดงสถิติบน stderr |
| `--max-tokens <n>` | งบ token สำหรับ output |
| `--stdin` | อ่าน output จาก stdin แทนการรันคำสั่ง |
| `--cwd <path>` | ไดเรกทอรีเป้าหมาย |

### `update`

ตรวจและติดตั้ง rimping CLI เวอร์ชันล่าสุดจาก GitHub หรือ npm

```bash
rimping update --check    # เปรียบเทียบเวอร์ชันอย่างเดียว
rimping update            # ติดตั้งล่าสุด
rimping update --dry-run  # แสดงคำสั่งติดตั้งโดยไม่รัน
```

| Flag | คำอธิบาย |
|------|----------|
| `-c`, `--check` | ตรวจว่ามีเวอร์ชันใหม่หรือไม่ |
| `--dry-run` | แสดงคำสั่งอัปเดตโดยไม่รัน |
| `--json` | แสดงผลเป็น JSON |

## การตั้งค่าโปรเจกต์

ไฟล์ config: `.rimping/config.json` (โปรเจกต์) หรือ `~/.rimping/config.json` (global ผ่าน `rimping init -g`) ตอน runtime จะรวม config โปรเจกต์ทับ global (`loadConfig`)

```json
{
  "version": 1,
  "maxTokens": 8000,
  "defaultSkills": [],
  "diff": false,
  "hooks": {
    "enabled": true,
    "optimizeOnSubmit": true,
    "injectDiff": false,
    "minPromptLength": 80,
    "minSavingsPercent": 5,
    "logStats": false
  },
  "shell": {
    "enabled": true,
    "minSavingsPercent": 10,
    "maxTokens": 4000
  },
  "read": {
    "enabled": true,
    "autoLimit": true,
    "compressOutput": false,
    "maxLines": 200,
    "minSavingsPercent": 10,
    "maxTokens": 4000
  },
  "agents": {
    "cursor": { "enabled": true },
    "claude": { "enabled": true },
    "chatgpt": { "enabled": false }
  }
}
```

| ฟิลด์ | คำอธิบาย |
|-------|----------|
| `version` | เวอร์ชัน schema ของ config (ปัจจุบัน `1`) |
| `provider` | adapter เริ่มต้น: `openai`, `claude`, `gemini`, `copilot`, `mock` |
| `maxTokens` | ขีดจำกัด token เริ่มต้น |
| `defaultSkills` | ID skill ที่ใช้ทุกครั้งที่ optimize |
| `diff` | รวม git diff เป็นค่าเริ่มต้น |
| `hooks` | พฤติกรรม hook เริ่มต้นสำหรับทุก agent (ดูด้านล่าง) |
| `shell` | การตั้งค่าบีบอัด shell output |
| `read` | การตั้งค่าบีบอัดการอ่านไฟล์ |
| `agents` | เปิด/ปิด agent แต่ละตัว และ override hook (ถ้าจำเป็น) |

### การตั้งค่า agents

`hooks` ระดับบนสุดใช้กับทุก agent ส่วน `agents.<id>` ส่วนใหญ่ใส่แค่ `enabled` — ไม่ต้องซ้ำฟิลด์ hook ในแต่ละ agent เว้นแต่ต้องการ override

| ฟิลด์ | คำอธิบาย |
|-------|----------|
| `enabled` | เปิด/ปิด hook ของ agent นี้ ถ้า `false` จะปิดการปรับ prompt แม้ `hooks.enabled` ระดับบนจะเป็น `true` |
| `hooks` | ไม่บังคับ ใส่เฉพาะฟิลด์ที่ต่างจาก `hooks` ระดับบน |

รายการ agent ID: `cursor`, `claude`, `codex`, `chatgpt`, `gemini`, `antigravity`, `windsurf`, `copilot`, `continue`, `cline`, `aider`

`rimping init` เขียน config แบบกระชับ: agent ที่ตรวจพบเป็น `enabled: true` ที่เหลือเป็น `false` init โปรเจกต์จะลิสต์ agent ที่รู้จักทั้งหมด ส่วน global (`-g`) ลิสต์เฉพาะที่ตรวจพบ รัน `init` ซ้ำจะลบฟิลด์ hook ต่อ agent ที่ซ้ำกับค่าเริ่มต้นระดับบน

ตัวอย่าง override — กำหนด `minPromptLength` สูงกว่าเฉพาะ Cursor:

```json
{
  "hooks": { "minPromptLength": 80 },
  "agents": {
    "cursor": { "enabled": true, "hooks": { "minPromptLength": 120 } },
    "claude": { "enabled": true }
  }
}
```

ตอน runtime `mergeHooksConfig(config, agentId)` รวม `hooks` ระดับบน → `agents.<id>.hooks` → ใช้ `agents.<id>.enabled`

### การตั้งค่า hooks

ฟิลด์เหล่านี้อยู่ใต้ `hooks` ระดับบน และเป็นค่าเริ่มต้นสำหรับทุก agent เว้นแต่จะ override ใน `agents.<id>.hooks`

| ฟิลด์ | ค่าเริ่มต้น | คำอธิบาย |
|-------|-------------|----------|
| `enabled` | `true` | สวิตช์หลักสำหรับการปรับ prompt ผ่าน hook |
| `optimizeOnSubmit` | `true` | ปรับ prompt เมื่อส่ง |
| `injectDiff` | `false` | รวม git diff เมื่อปรับผ่าน hook |
| `minPromptLength` | `80` | ข้าม prompt ที่สั้นกว่านี้ |
| `minSavingsPercent` | `5` | ข้ามถ้าประหยัดได้น้อยกว่าเปอร์เซ็นต์นี้ |
| `logStats` | `false` | บันทึกสถิติลง `.rimping/hooks.log` |

Hook ทั้งหมด **fail open** — ถ้าการปรับหรือบีบอัดล้มเหลว จะส่งข้อมูลเดิมโดยไม่เปลี่ยนแปลง

### การตั้งค่า shell

| ฟิลด์ | ค่าเริ่มต้น | คำอธิบาย |
|-------|-------------|----------|
| `enabled` | `true` | rewrite คำสั่ง shell/bash ผ่าน hook `pre-shell` |
| `minSavingsPercent` | `10` | ข้ามถ้าประหยัดต่ำกว่าเกณฑ์ |
| `maxTokens` | `4000` | งบ token สำหรับ shell output |

### การตั้งค่า read

| ฟิลด์ | ค่าเริ่มต้น | คำอธิบาย |
|-------|-------------|----------|
| `enabled` | `true` | เปิดใช้ hook `pre-read` / `post-read` สำหรับการอ่านไฟล์ |
| `autoLimit` | `true` | ใส่ขีดจำกัดบรรทัดก่อน agent อ่านไฟล์ใหญ่ |
| `compressOutput` | `false` | บีบอัดเนื้อหาไฟล์หลังอ่าน (ตัด comment, จำกัดบรรทัด) |
| `maxLines` | `200` | ขีดจำกัดบรรทัดเริ่มต้นสำหรับ `autoLimit` |
| `minSavingsPercent` | `10` | ข้ามการบีบอัดหลังอ่านถ้าประหยัดต่ำกว่าเกณฑ์ |
| `maxTokens` | `4000` | งบ token สำหรับ output หลังอ่านไฟล์ |

## Prompt Skills

Prompt skills เป็นไฟล์ Markdown ที่ผู้ใช้สร้างเอง พร้อม YAML frontmatter Rimping ไม่มี prompt skills มาให้ในตัว — สร้างเองต่อโปรเจกต์หรือในไดเรกทอรีผู้ใช้

Rimping โหลด prompt skills จาก:

1. `./skills/` (รากโปรเจกต์)
2. `~/.rimping/skills/` (ระดับผู้ใช้ — `id` เดียวกันจะ override โปรเจกต์)

**ลำดับการเลือก:** `--skills` หรือ `defaultSkills` ใน config → ตรวจจับอัตโนมัติจาก `triggers` → ไม่ใช้ skill ถ้าไม่มีอะไรตรง จะข้ามขั้นตอน skill transform

### สร้าง skill

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
| Claude Code | `.claude/`, `.agents/`, `CLAUDE.md`, `claude` CLI |
| OpenAI Codex | `.codex/hooks.json`, `~/.codex/`, `codex` CLI |
| ChatGPT | ตรวจจับในเครื่องไม่ได้ |
| Gemini CLI | `.gemini/`, `~/.gemini/`, `gemini` CLI |
| Antigravity | `.agents/hooks.json`, `~/.antigravity/`, `~/.antigravity-ide/` |
| Windsurf | `.windsurf/`, `~/.codeium/windsurf/` |
| GitHub Copilot | `.copilot/`, `.github/copilot-instructions.md`, `gh copilot` |
| Continue | `.continue/`, `~/.continue/` |
| Cline | `.cline/` |
| Aider | `.aider.conf.yml`, `~/.aider/`, `aider` CLI |

## ที่เก็บข้อมูลและ Log

| ตำแหน่ง | หน้าที่ |
|---------|---------|
| `.rimping/config.json` | Config โปรเจกต์ |
| `~/.rimping/config.json` | Config global (`rimping init -g`) |
| `~/.rimping/cache/` | Cache prompt ที่ปรับแล้ว (อายุ 24 ชม.) |
| `~/.rimping/last-run.json` | ผลลัพธ์ `optimize` ล่าสุดสำหรับ `stats` / `explain` |
| `.rimping/hooks.log` | Log การรัน hook ต่อโปรเจกต์ (`hooks.logStats: true`) |

## Cache

Prompt ที่ปรับแล้วถูก cache ใน `~/.rimping/cache/` อายุ 24 ชั่วโมง ใช้ `--no-cache` เพื่อข้าม

ดูสถิติ cache และ hook ด้วย `rimping stats` ดูรายละเอียด hook ต่อครั้งด้วย `rimping hooks log`

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
| Hook ไม่ปรับ prompt | ตรวจ `hooks.enabled` และ `minPromptLength`; รัน `rimping doctor` |
| ไม่มี log hook | ตั้ง `hooks.logStats: true` ใน config แล้วส่ง prompt |
| Shell output ไม่ถูกบีบอัด | ตรวจ `shell.enabled`; ตรวจว่า hook `pre-shell` ลงทะเบียนแล้ว (`rimping doctor`) |
| เนื้อหาไฟล์ไม่ถูกบีบอัด | ตรวจ `read.enabled` และ `read.compressOutput`; ตรวจว่า hook `post-read` ลงทะเบียนแล้ว |
| ไม่มี git diff | ต้องอยู่ใน git repo ใช้ `--diff` หรือตั้ง `diff: true` |
| Skill ไม่ถูกใช้ | สร้าง skill ใน `skills/` หรือ `~/.rimping/skills/` ตรวจว่า triggers ตรงกับ prompt หรือระบุ `--skills <id>` |
