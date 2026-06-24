# คู่มือนักพัฒนา

คู่มือนี้สำหรับผู้มีส่วนร่วมและผู้ที่ต้องการขยาย ฝัง หรือดูแล Rimping

## ตั้งค่าสภาพแวดล้อมพัฒนา

### สิ่งที่ต้องมี

- [Bun](https://bun.sh) >= 1.0
- Git

### Clone และ build

```bash
git clone <repo-url> rimping
cd rimping
bun install
bun run build
```

### คำสั่งพัฒนา

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `bun run build` | Build ทุกแพ็กเกจผ่าน Turbo |
| `bun run dev` | รัน dev watcher |
| `bun run typecheck` | ตรวจ type ทุกแพ็กเกจ |
| `bun run rimping` | รัน CLI โหมดพัฒนา |
| `bun test` | รันเทสต์ (จากไดเรกทอรีแพ็กเกจ) |

### โครงสร้างแพ็กเกจ

```
packages/
├── cli/
│   ├── src/
│   │   ├── index.ts              จุดเข้า CLI (citty)
│   │   └── commands/             หนึ่งไฟล์ต่อคำสั่ง
│   └── templates/
│       └── cursor-hooks/         template hook สำหรับ `hooks init`
└── core/
    └── src/
        ├── index.ts              export API สาธารณะ
        ├── pipeline.ts           ตัว orchestrate optimize()
        ├── skill-engine.ts       โหลดและประกอบ skill
        ├── context-builder.ts    ใส่ diff / ไฟล์ / memory
        ├── optimizer.ts          กลยุทธ์แปลงข้อความ
        ├── budget-planner.ts     บังคับขีดจำกัด token
        ├── cache.ts              cache ผลลัพธ์ prompt
        ├── config.ts             schema และ validate config
        ├── agent-detect.ts       ตรวจจับ AI agent
        ├── hooks/
        │   └── pre-send.ts       จุดเข้า hook
        ├── adapters/             formatter ตาม provider
        ├── git-diff/             ดึง, แยกวิเคราะห์, บีบอัด diff
        └── memory/               memory store (mock เป็นค่าเริ่มต้น)
```

## Public API

import จาก `@rimping/core`:

```typescript
import {
  optimize,
  preSend,
  loadSkills,
  selectSkills,
  composeSkills,
  buildContext,
  optimizeText,
  applyBudget,
  loadConfig,
  initConfig,
  runDoctor,
  detectAgents,
  initAgentSkills,
  initCursorHooks,
  getCacheStats,
  estimateTokens,
} from '@rimping/core'
```

### `optimize(options)`

จุดเข้า pipeline หลัก คืน `OptimizeResult` พร้อมข้อความ `optimized`, `stats` และขั้นตอน `explain`

```typescript
const result = await optimize({
  prompt: 'please help me fix this bug in auth.ts',
  diff: true,
  maxTokens: 4000,
  provider: 'openai',
  skills: ['software-engineer'],
  cwd: process.cwd(),
  useCache: true,
})
```

### `preSend(prompt, options?)`

Wrapper สำหรับ hook เคารพ `.rimping/config.json` และการตั้งค่า hooks fail open เมื่อ error

```typescript
import { preSend } from '@rimping/core/hooks'

const { text, optimized, stats, skipped } = await preSend(userPrompt, {
  cwd: '/path/to/project',
})
```

เหตุผลที่ข้าม: `disabled`, `too-short`, `low-savings`, `error`

## เพิ่ม Prompt Skill

1. สร้าง `skills/my-skill.md` ที่รากโปรเจกต์ (หรือ `~/.rimping/skills/` สำหรับ global):

```markdown
---
id: my-skill
name: My Skill
tags: [custom]
priority: 20
triggers: [deploy, kubernetes, k8s]
---

## Goal
บีบอัด prompt ด้าน infrastructure

## Rules
- เก็บชื่อ resource ตามเดิม
- ใช้คำสั่ง (imperative)

## Transformation
ตัดคำสุภาพด้าน deployment ระบุสถานะเป้าหมายตรงๆ

## Output Style
กระชับ, ใช้คำสั่ง
```

2. ทดสอบ:

```bash
rimping optimize --skills my-skill "please could you help me deploy to kubernetes"
rimping optimize --explain "deploy my app to k8s cluster prod"
```

### รายละเอียดการ parse skill

- Frontmatter แยกวิเคราะห์โดย `packages/core/src/utils/markdown.ts`
- ส่วนที่ดึง: `Goal`, `Rules`, `Transformation`, `Output Style`
- `autoDetectSkills()` นับคำ trigger ที่ตรงกัน threshold เริ่มต้น 2
- `selectSkills()` รวม ID ที่ระบุ, `defaultSkills` จาก config และที่ตรวจจับอัตโนมัติ

## เพิ่มกลยุทธ์ Optimizer

แก้ `packages/core/src/optimizer.ts`:

```typescript
export const strategies: Strategy[] = [
  // ... กลยุทธ์เดิม
  {
    name: 'my-strategy',
    apply(text) {
      return text.replace(/some-pattern/g, 'replacement')
    },
  },
]
```

กลยุทธ์ใช้ตามลำดับ จะข้ามถ้าไม่ลด token เพิ่มเทสต์ใน `test/optimizer.test.ts`

## เพิ่ม Provider Adapter

1. implement `LLMProvider` ใน `packages/core/src/adapters/`:

```typescript
import type { LLMProvider, OptimizeResult } from '../types.js'

export class MyAdapter implements LLMProvider {
  formatPrompt(result: OptimizeResult): string {
    return result.optimized
  }
}
```

2. ลงทะเบียนใน `getAdapter()` ที่ `adapters/index.ts`
3. เพิ่มชื่อ provider ใน type `ProviderName` ที่ `types.ts`
4. เพิ่ม validation ใน `VALID_PROVIDERS` ที่ `config.ts`

## เพิ่มคำสั่ง CLI

1. สร้าง `packages/cli/src/commands/my-command.ts`:

```typescript
import { defineCommand } from 'citty'

export const myCommand = defineCommand({
  meta: { description: 'คำสั่งใหม่ของฉัน' },
  args: {
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    // เรียกฟังก์ชันจาก @rimping/core
  },
})
```

2. ลงทะเบียนใน `subCommands` ที่ `packages/cli/src/index.ts`
3. export logic core ใหม่จาก `packages/core/src/index.ts` ถ้าจำเป็น

## การเชื่อมต่อ Hook (นอก Cursor)

 editor หรือ agent ที่รองรับ pre-submit hook สามารถเรียก `preSend()`:

```typescript
#!/usr/bin/env bun
import { preSend } from '@rimping/core/hooks'

const input = await Bun.stdin.text()
const { text, optimized, stats } = await preSend(input)

if (optimized && stats) {
  console.error(`ประหยัด ${stats.savingsPercent}% token`)
}

console.log(text)
```

อ่าน prompt จาก stdin เขียน prompt ที่ปรับแล้วไป stdout hook ควร fail open — คืน prompt เดิมเมื่อ error

## การทดสอบ

เทสต์ใช้ Bun test runner วางไว้ใน `packages/core/test/` ให้สะท้อนโครงสร้าง `src/`

```bash
# รันเทสต์ core ทั้งหมด
cd packages/core && bun test

# รันไฟล์เดียว
bun test test/pipeline.test.ts
```

### แนวทางการทดสอบ

- ทดสอบพฤติกรรมผ่าน public interface ไม่ใช่ internals
- ใช้ vertical slice: เขียนเทสต์ → ให้ผ่าน → เทสต์ถัดไป
- mock filesystem/git เฉพาะเมื่อจำเป็น ชอบเทสต์แบบ integration สำหรับ pipeline

### ตัวอย่างรูปแบบเทสต์

```typescript
import { describe, expect, test } from 'bun:test'
import { optimizeText } from './optimizer.js'

describe('optimizeText', () => {
  test('ลบคำฟุ่มเฟือย', () => {
    const result = optimizeText('please could you fix this bug')
    expect(result.text).not.toContain('please')
    expect(result.strategiesApplied).toContain('remove-filler')
  })
})
```

## แนวปฏิบัติโค้ด

ปฏิบัติตาม skill `rimping-guidelines` (`.agents/skills/rimping-guidelines/SKILL.md`):

1. **คิดก่อน** — ระบุสมมติฐาน ถามเมื่อไม่ชัด
2. **โซลูชันขั้นต่ำ** — reuse โค้ดเดิม ไม่ abstract เกินจำเป็น
3. **แก้ไขเฉพาะจุด** — แตะเฉพาะสิ่งที่งานต้องการ
4. **ตรวจสอบ** — เพิ่มเทสต์สำหรับ logic ที่ไม่ trivial
5. **ภาษา domain ร่วมกัน** — ใช้คำศัพท์สม่ำเสมอ (`skill`, `pipeline`, `hunk` ฯลฯ)

### TypeScript

- ESM พร้อมนามสกุล `.js` ใน import
- TypeScript เข้มงวด — รัน `bun run typecheck` ก่อน commit
- export type คู่กับฟังก์ชันจาก `index.ts`

## Checklist ก่อน Release

1. `bun run typecheck` — ไม่มี error
2. `bun test` — เทสต์ผ่านทั้งหมด
3. `bun run build` — build สะอาด
4. อัปเดตเวอร์ชันใน `packages/core/src/types.ts` (`CLI_VERSION`) ถ้า release
5. อัปเดต docs ถ้า CLI หรือ schema config เปลี่ยน

## การดีบัก

```bash
# รายละเอียด pipeline
rimping optimize --explain "your prompt here"

# ดูการรันล่าสุด
rimping explain

# ข้าม cache ระหว่างพัฒนา
rimping optimize --no-cache "prompt"

# ผลลัพธ์ JSON สำหรับสคริปต์
rimping optimize --json "prompt" | jq '.stats'
rimping doctor --json | jq '.issues'
```

## รูปแบบการเชื่อมต่อที่พบบ่อย

### ตรวจ prompt ใน CI

```bash
#!/bin/bash
SAVINGS=$(rimping optimize --json "$PROMPT" | jq '.stats.savingsPercent')
if (( $(echo "$SAVINGS < 10" | bc -l) )); then
  echo "Prompt สามารถสั้นลงได้ $SAVINGS% — พิจารณาปรับให้กระชับ"
fi
```

### Memory store แบบกำหนดเอง

implement `MemoryStore` จาก `types.ts` และส่งให้ `buildContext` (ต้องขยาย context builder ให้รับ store กำหนดเอง — ปัจจุบันใช้ `defaultMemoryStore`)

### Skills แยกต่อแอปใน monorepo

วาง skills ใน `skills/` ของแต่ละแอป รัน `rimping optimize --cwd apps/api "prompt"` เพื่อใช้ skill ในโปรเจกต์นั้น
