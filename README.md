# rimping

CLI ลด token ใน 3 ชั้น — prompt, shell output, และ file read — ก่อนส่งให้ LLM agent

## เริ่มต้น

```bash
bun install && bun run build
bun run rimping -- init
bun run rimping -- hooks init
bun run rimping -- doctor
```

หลัง build แล้วใช้ `bunx rimping` แทนได้

## Token optimization 3 ชั้น

```
Prompt  → beforeSubmitPrompt hook → optimize pipeline
Shell   → pre-shell hook → rimping shell run → compressed output
Read    → pre-read (line cap) → post-read (compress content)
```

| ชั้น | Hook | ทำอะไร |
|------|------|--------|
| Prompt | `hooks pre-send` | ตัด filler, inject diff, บีบอัด prompt |
| Shell | `hooks pre-shell` → `shell run` | บีบอัด git status, test output, rg/grep |
| Read | `hooks pre-read` / `post-read` | จำกัดบรรทัด + strip comments หลังอ่านไฟล์ |

## คำสั่งหลัก

| คำสั่ง | ทำอะไร |
|--------|--------|
| `init` | สร้าง `.rimping/config.json` + hook สำหรับ agent ที่ตรวจพบ |
| `init -g` | สร้าง `~/.rimping/config.json` และ global hook paths |
| `hooks init` | สร้างเฉพาะไฟล์ hook (เมื่อรัน `init --no-hooks` แล้ว) |
| `doctor` | ตรวจ agent + config + hook registration |
| `optimize [prompt]` | ปรับ prompt ผ่าน pipeline (CLI) |
| `shell run <cmd>` | รัน command แล้วพิมพ์ output ที่บีบอัด |
| `stats` | cache + hook savings แยกตาม event |
| `hooks log` | ดู `.rimping/hooks.log` (pre-send, shell-run, post-read) |
| `explain` | ขั้นตอน pipeline จากรอบล่าสุด |
| `skills init` | สร้าง agent guidelines ใน `.agents/skills/` (ไม่เกี่ยวกับ prompt pipeline) |

ตัวอย่าง:

```bash
bun run rimping -- optimize --diff --max-tokens 4000 "review my changes"
bun run rimping -- shell run "git status" --explain
bun run rimping -- init -g && bun run rimping -- hooks init -g
echo "prompt" | bun run rimping -- optimize --stdin --json
```

## Agent ที่รองรับ hooks

Cursor, Claude Code, Codex, Gemini CLI, GitHub Copilot, Windsurf, Antigravity

รัน `rimping hooks init` เพื่อ scaffold hook files ให้ agent ที่ตรวจพบ

## Config

ไฟล์ config รวมกันตอน runtime: `~/.rimping/config.json` (global) + `.rimping/config.json` (project, ชนะ global)

```json
{
  "hooks": { "enabled": true, "logStats": true },
  "shell": { "enabled": true, "maxTokens": 4000 },
  "read": { "enabled": true, "autoLimit": true, "compressOutput": true, "maxLines": 200 },
  "agents": {
    "cursor": { "enabled": true },
    "claude": { "enabled": true },
    "chatgpt": { "enabled": false }
  }
}
```

`hooks` ระดับบนใช้กับทุก agent — `agents.<id>` ส่วนใหญ่ใส่แค่ `enabled` ใส่ `agents.<id>.hooks` เฉพาะเมื่อต้องการ override

รายละเอียดเต็ม → [User Guide](docs/user-guide.md)

## โครงสร้าง

```
packages/cli   → CLI (@rimping/cli)
packages/core  → engine (@rimping/core)
```

## เอกสาร

รัน `bun run docs:dev` แล้วเปิด http://localhost:5173

| | EN | ไทย |
|---|----|-----|
| Overview | [docs/](docs/index.md) | [docs/th/](docs/th/index.md) |
| User Guide | [user-guide](docs/user-guide.md) | [user-guide](docs/th/user-guide.md) |
| Architecture | [architecture](docs/architecture.md) | [architecture](docs/th/architecture.md) |
| Developer | [developer-guide](docs/developer-guide.md) | [developer-guide](docs/th/developer-guide.md) |
| Benchmarks | [benchmarks](docs/benchmarks.md) | [benchmarks](docs/th/benchmarks.md) |

## Dev

```bash
bun run build
bun run dev
bun run typecheck
bun run benchmark
```

[MIT](LICENSE)
