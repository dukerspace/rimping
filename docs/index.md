---
layout: home

hero:
  name: Rimping
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
    details: Markdown-based prompt skills and agent skills for domain-specific optimization.
  - icon: 🔀
    title: Git diff context
    details: Inject and compress modified hunks with tree-sitter symbol enrichment.
  - icon: 🪝
    title: Cursor hooks
    details: Optimize prompts automatically before submit — fails open on errors.
  - icon: 🌐
    title: Multi-provider
    details: Output adapters for OpenAI, Claude, Gemini, and mock testing.
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
  → Provider Adapter    (OpenAI, Claude, Gemini)
```

## Documentation

| Guide | Description |
|-------|-------------|
| [User Guide](./user-guide) | Installation, commands, config, skills, hooks |
| [Architecture](./architecture) | Pipeline stages, modules, data flow |
| [Developer Guide](./developer-guide) | API, extending skills, testing |
