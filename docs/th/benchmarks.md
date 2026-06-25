# Benchmark

Rimping มี **benchmark harness แบบ full-matrix** สำหรับเทียบกับโปรเจกต์ agent guidelines และ token optimization ยอดนิยม

## คู่แข่ง

| โปรเจกต์ | ประเภท | Tier ที่ใช้ |
|----------|--------|-------------|
| [karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | Behavioral guidelines | Tier 2, 3 |
| [ponytail](https://github.com/DietrichGebert/ponytail) | Lazy ladder + guidelines | Tier 2, 3 |
| [mattpocock/skills](https://github.com/mattpocock/skills) | Workflow skills (TDD, grill) | Tier 2, 3 |
| [rtk](https://github.com/rtk-ai/rtk) | Shell output proxy | Tier 1b |
| **rimping** | Prompt optimizer + guidelines + hooks | ทุก tier |

## รันในเครื่อง

```bash
bun run benchmark          # Tier 1 + 1b + 3 + report (ไม่ต้องใช้ API key)
bun run benchmark:tier1    # บีบอัด prompt อย่างเดียว
bun run benchmark:tier1b   # บีบอัด shell output อย่างเดียว
bun run benchmark:tier2    # คุณภาพโค้ดแบบ agentic (รัน Cursor เอง)
bun run benchmark:tier3    # Behavioral rubric
bun run benchmark:report   # สร้าง report ใหม่จาก results/
bun run benchmark:test     # รันเทสต์ harness
```

ผลลัพธ์อยู่ที่ `benchmarks/results/<date>/report.md`

## ภาพรวมแต่ละ Tier

### Tier 1 — Offline prompt compression

วัด `rimping optimize` บน corpus 25 prompts (verbose, code-heavy, diff-review, error logs ฯลฯ)

Arms: `baseline`, `rimping-optimizer`, `rimping-full` (มี guidelines prefix)

### Tier 1b — Shell output compression

เทียบ output ดิบกับ **rimping** `compressShellOutput()` และ baseline **RTK** (อ้างอิงเท่านั้น — rimping ไม่เรียกใช้ RTK)

### Tier 2 — Agentic code quality

12 tasks บน [tiangolo/full-stack-fastapi-template](https://github.com/tiangolo/full-stack-fastapi-template) (ชุดเดียวกับ ponytail agentic tier)

เมตริก: LOC ที่เพิ่ม (`git diff`), เวลา, safety checks

ต้องรัน session ใน Cursor ดู workflow เต็มที่ [benchmarks/README.md](https://github.com/dukerspace/rimping/blob/main/benchmarks/README.md)

### Tier 3 — Behavioral rubric

5 micro-tasks คะแนน 0–2: alignment, surgical edits, minimal solutions, test verification, safety

## จุดต่างของ Rimping

**complementary stack**:

- **rimping** — บีบอัด prompt (hooks) และ shell output (`rimping shell run`, hook `preToolUse`)
- **rtk** — baseline เปรียบเทียบ shell output (ไม่ใช่ dependency)
- **rimping-guidelines** — รวมแนวทางจาก karpathy, ponytail และ matt pocock ใน skill เดียว

## ข้อจำกัด

- Tier 2 ไม่รัน headless agent อัตโนมัติ — รัน task ใน Cursor แล้ววาง diff artifacts
- ไม่ lock model — บันทึกชื่อ model ของ Cursor ต่อ session ใน `meta.json`
- เวอร์ชันคู่แข่ง pin ไว้ที่ `benchmarks/arms/*/LOCK` sync ได้ด้วย `benchmarks/arms/sync-upstream.ts`

รายละเอียด methodology: [benchmarks/README.md](https://github.com/dukerspace/rimping/blob/main/benchmarks/README.md)
