---
layout: home

hero:
  name: Rimping
  text: ลด token แบบอิง skill
  tagline: ลดการใช้ token ใน prompt ของ LLM อย่างชาญฉลาดโดยยังคงความหมายเดิม
  actions:
    - theme: brand
      text: เริ่มต้นใช้งาน
      link: /th/user-guide
    - theme: alt
      text: สถาปัตยกรรม
      link: /th/architecture
    - theme: alt
      text: ดูบน GitHub
      link: https://github.com/dukerspace/rimping

features:
  - icon: ⚡
    title: ประหยัด token
    details: ตัดคำฟุ่มเฟือย ลบบรรทัดซ้ำ และบีบอัด code block โดยไม่เสียความหมาย
  - icon: 🧩
    title: Skill plugins
    details: prompt skills ที่ผู้ใช้สร้างเอง และ agent skills สำหรับ domain เฉพาะ
  - icon: 🔀
    title: Git diff context
    details: ใส่และบีบอัด hunk ที่แก้ไข พร้อมเสริม symbol จาก tree-sitter
  - icon: 🪝
    title: Multi-agent hooks
    details: ปรับ prompt บีบอัด shell output และจำกัดการอ่านไฟล์อัตโนมัติ — fail open เมื่อเกิด error
  - icon: 📖
    title: Read compression
    details: ดักจับการอ่านไฟล์เพื่อใส่ขีดจำกัดบรรทัดและตัด comment จากไฟล์ใหญ่
  - icon: 🐚
    title: บีบอัด shell
    details: Rewrite คำสั่ง shell และบีบอัด git status, test output และผล grep
  - icon: 🌐
    title: หลาย provider
    details: adapter สำหรับ OpenAI, Claude, Gemini, Copilot และ mock สำหรับทดสอบ
  - icon: 📦
    title: Programmatic API
    details: ใช้ optimize() และ preSend() จาก @rimping/core ในเครื่องมือของคุณ
---

## เริ่มต้นอย่างรวดเร็ว

```bash
bun install && bun run build
bunx rimping init
bunx rimping doctor
bunx rimping optimize "please could you help me refactor this typescript code"
```

## Pipeline

```
Prompt ที่ป้อนเข้า
  → Skill Engine        (กฎบีบอัดตาม domain)
  → Context Builder     (git diff, ไฟล์, memory)
  → Token Optimizer     (ตัดคำฟุ่มเฟือย, ลบซ้ำ, บีบอัด)
  → Budget Planner      (ขีดจำกัด token)
  → Provider Adapter    (OpenAI, Claude, Gemini, Copilot)

Agent hooks (คู่ขนาน):
  pre-send   → ปรับ prompt
  pre-shell  → บีบอัด shell output
  pre-read   → จำกัดการอ่านไฟล์
  post-read  → บีบอัดเนื้อหาไฟล์
```

## เอกสาร

| คู่มือ | คำอธิบาย |
|-------|----------|
| [คู่มือผู้ใช้](./user-guide) | การติดตั้ง, คำสั่ง, config, skills, hooks |
| [สถาปัตยกรรม](./architecture) | ขั้นตอน pipeline, โมดูล, data flow |
| [คู่มือนักพัฒนา](./developer-guide) | API, ขยาย skills, การทดสอบ |
| [Benchmark](./benchmarks) | เทียบกับเครื่องมือลด token อื่น |
