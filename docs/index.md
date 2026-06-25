---
layout: home

hero:
  name: Rimping
  image:
    src: /ping-river.png
    alt: Rimping — Ping River pixel art
  text: Skill-based token optimization
  tagline: Reduce LLM prompt tokens intelligently while preserving semantic meaning
  actions:
    - theme: brand
      text: Get Started
      link: /user-guide
    - theme: alt
      text: Architecture
      link: /architecture
    - theme: alt
      text: View on GitHub
      link: https://github.com/dukerspace/rimping

features:
  - icon: ⚡
    title: Token savings
    details: Remove filler words, dedupe lines, and compress code blocks — without losing intent.
  - icon: 🧩
    title: Skill plugins
    details: User-authored prompt skills and agent skills for domain-specific optimization.
  - icon: 🔀
    title: Git diff context
    details: Inject and compress modified hunks with tree-sitter symbol enrichment.
  - icon: 🪝
    title: Multi-agent hooks
    details: Auto-optimize prompts, compress shell output, and limit file reads — fails open on errors.
  - icon: 📖
    title: Read compression
    details: Intercept file reads to inject line limits and strip comments from large files.
  - icon: 🐚
    title: Shell compression
    details: Rewrite shell tool calls and compress git status, test output, and grep results.
  - icon: 🌐
    title: Multi-provider
    details: Output adapters for OpenAI, Claude, Gemini, Copilot, and mock testing.
  - icon: 📦
    title: Programmatic API
    details: Use optimize() and preSend() from @rimping/core in your own tools.
---

## Quick Start

```bash
bun install && bun run build
bunx rimping init
bunx rimping doctor
bunx rimping optimize "please could you help me refactor this typescript code"
```

## Pipeline

```
Input Prompt
  → Skill Engine        (domain-specific compression rules)
  → Context Builder     (git diff, files, memory)
  → Token Optimizer     (filler removal, dedupe, compress)
  → Budget Planner      (max token cap)
  → Provider Adapter    (OpenAI, Claude, Gemini, Copilot)

Agent hooks (parallel):
  pre-send   → optimize prompts
  pre-shell  → compress shell output
  pre-read   → limit file reads
  post-read  → compress file content
```

## Documentation

| Guide | Description |
|-------|-------------|
| [User Guide](./user-guide) | Installation, commands, config, skills, hooks |
| [Architecture](./architecture) | Pipeline stages, modules, data flow |
| [Developer Guide](./developer-guide) | API, extending skills, testing |
