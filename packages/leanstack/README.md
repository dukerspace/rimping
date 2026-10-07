# Leanstack

Lean Pstack file pack: maximum engineering quality per token. Not a CLI.

Source of truth lives under `templates/`. Agents read those files (or a copy under a project's `.agents/`). There is no `leanstack` binary.

Docs → [Leanstack](../../docs/leanstack.md)

## Layout

```text
templates/
├── AGENTS.md
├── budgets.yaml
├── core/
│   ├── router.md
│   ├── context.md
│   ├── skills-index.md
│   └── stop.md
├── principles/          # 7 short principles
├── skills/              # implement, debug, refactor, architect, review (+ guidelines)
├── agents/              # general, debugger, architect, reviewer
├── adapters/            # cursor, claude, codex, chatgpt
└── commands/            # Cursor slash-command sources
```

## Workflow

```text
TASK → classify → discover → rank → load (≤ max_skills) → execute → verify → STOP
```

Progressive context (`core/context.md`):

- Tiny: `AGENTS.md` only.
- Normal: `AGENTS.md` + `core/router.md` + ranked skill bodies (≤ `max_skills`).
- Hard: same as Normal + 2–3 principles; escalate only within budget.

Discovery reads `core/skills-index.md` and merges project `.agents/skills/**/SKILL.md` (frontmatter only). Implement is a scored fallback, not an automatic winner.

Budgets in `budgets.yaml` are workflow limits (including `max_skills` / `max_principles`), not API hard caps.

`skills/guidelines/` (`rimping-guidelines`) is not a route target and is not copied into the Cursor plugin.

## Cursor plugin

```bash
bun run plugin:install
```

Assembles `~/.cursor/plugins/local/rimping` from `.cursor-plugin/plugin.json`, the five mode skills under `templates/skills/`, and `templates/commands/`. Slash commands instruct the agent to follow this pack; they do not invoke a CLI.

```bash
bun run plugin:validate
```

| Command | What it does |
|---------|--------------|
| `/rimping-init` | Inspect repo; copy pack into `.agents/` without overwriting |
| `/rimping-run` | Classify, discover/rank skills, load, verify, stop |
| `/rimping-plan` | Plan only (includes ranked skills); no edits |
| `/rimping-debug` | Force debug skill (skip discovery) |
| `/rimping-architect` | Force architect skill (skip discovery) |
| `/rimping-review` | Read-only review (skip discovery) |
| `/rimping-status` | List pack files and budgets |
| `/rimping-doctor` | Check required files |

The shared design recommends four primary UX commands (`init`, `plan`, `debug`, `review`). This pack keeps the extended set above for operability; normal work can still use Cursor directly with `AGENTS.md`.

## Adapters

| Harness | Notes |
|---------|-------|
| Cursor | `AGENTS.md` baseline; do not make `.cursor/rules` source of truth |
| Claude Code | Prefer `AGENTS.md`; optional `CLAUDE.md` with `@AGENTS.md` only |
| Codex | Native `AGENTS.md` hierarchy |
| ChatGPT | Paste `AGENTS.md` + ranked skills; no second maintained copy |
