---
name: rimping-doctor
description: Check the Leanstack toolchain, instructions, and configuration.
---

Check the Leanstack file pack. Do not run a leanstack CLI. Fix only what the user asks to fix.

1. Prefer project `.agents/` if present; else check `packages/leanstack/templates/`.
2. Required: `AGENTS.md`, `budgets.yaml`, `core/router.md`, `core/context.md`, `core/skills-index.md`, `core/stop.md`, principles (7), skills (implement/debug/refactor/architect/review each with `SKILL.md` frontmatter `name` + `description`), agents (general/debugger/architect/reviewer), adapters (cursor/claude/codex/chatgpt).
3. Report each check as pass or fail with the path. Exit mentally fail if any required file is missing.
4. Stop.
