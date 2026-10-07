# Leanstack

Leanstack is a file pack under `packages/leanstack/templates/`. Agents classify a task with deterministic rules, load one skill (and principles only when Hard), verify, and stop.

There is no `leanstack` CLI. It does not call `rimping optimize` or a private agent API. Agents read the templates (or a copy under a project's `.agents/`).

Narrative how-it-works → [Working guide](./leanstack-guide)

Package summary: [packages/leanstack/README.md](https://github.com/dukerspace/rimping/blob/main/packages/leanstack/README.md)

## Layout

```text
packages/leanstack/templates/
├── AGENTS.md
├── budgets.yaml
├── core/          # router.md, context.md, stop.md
├── principles/    # 7 short principles
├── skills/        # implement, debug, refactor, architect, review (+ guidelines)
├── agents/        # general, debugger, architect, reviewer
├── adapters/      # cursor, claude, codex, chatgpt
└── commands/      # Cursor slash-command sources
```

## Workflow

```text
TASK → classify (rules, not LLM) → budget → one skill → verify → STOP
```

### Classify

Classify with deterministic rules. Do not call a model just to classify. If the user names a mode, use it.

| Class | When |
|-------|------|
| **Hard** | Architecture, migration, security, concurrency, distributed, cross-package, flaky or failed production bug |
| **Tiny** | Typo, comment, one-place rename, formatting, obvious one-line fix |
| **Debug + Normal** | Bug or failure that is not Hard |
| **Refactor + Normal** | Behavior-preserving structure (single-file rename → Tiny) |
| **Implement + Normal** | Everything else |

### Progressive context

Never load the entire pack. See `core/context.md`:

| Class | Load |
|-------|------|
| Tiny | `AGENTS.md` only |
| Normal | `AGENTS.md` + one skill body |
| Hard | `AGENTS.md` + `core/router.md` + named skill + 2–3 principles |

Open `budgets.yaml` on Hard, or when reporting caps. Principle files open only on Hard (or contested design).

### Budgets

Workflow limits from `budgets.yaml` — not an API hard cap and not a spend target:

| Class | Tokens | Agents | Skills | Principles | Escalations |
|-------|--------|--------|--------|------------|-------------|
| tiny | 5K | 1 | 1 | 2 | 0 |
| normal | 20K | 1 | 2 | 3 | 1 |
| hard | 50K | 3 | 4 | 5 | 2 |

If the budget is exhausted: STOP, summarize, or ask the user. Do not spawn another agent to spend more.

### Skills, agents, escalation

Mode skills: `skills/{implement,debug,refactor,architect,review}/SKILL.md`.

`skills/guidelines/` (`rimping-guidelines`) is the Rimping coding guide. It is not a classify target and is not copied into the Cursor plugin.

Defaults: 1 agent, 0 subagents, 0 reviewers. Escalate only after a failed attempt, and only if the budget allows:

```text
general → debugger → architect → reviewer
```

Model tiers (adapters map them to concrete models): **fast** (classify / simple coding), **standard** (normal implementation), **reasoning** (architecture / hard bugs). Never hard-code a vendor model name in core files.

### Stop

When `core/stop.md` is true — requested behavior works, verification passes, no known regression, minimal diff, no unnecessary abstraction — stop. Do not add unrelated refactors, cleanup, speculative abstractions, docs, or tests after that.

## Install into a project

After installing the Cursor plugin (below), use `/rimping-init`:

1. Inspect the repo (stack, existing agent config) before changing anything.
2. Copy from `packages/leanstack/templates/` into `.agents/` — `AGENTS.md`, `budgets.yaml`, `core/`, `principles/`, `skills/`, `agents/`, `adapters/`.
3. Copy only files that do not already exist. Never overwrite unless the user asked to force.
4. Do not create or overwrite root `AGENTS.md` or `CLAUDE.md`.
5. Do not copy `commands/` (those stay in the Cursor plugin).

Use `/rimping-doctor` to check required files (including `core/context.md`). Use `/rimping-status` to list pack files and budgets.

## Cursor plugin

The local Cursor plugin adds slash commands and the five mode skills. It does not add token-optimization hooks.

```bash
bun run plugin:install
```

Writes `~/.cursor/plugins/local/rimping` from:

- `packages/leanstack/.cursor-plugin/plugin.json`
- five mode skills under `packages/leanstack/templates/skills/` (not `guidelines`)
- `packages/leanstack/templates/commands/`

Cursor ignores a symlink that points outside `~/.cursor/plugins/local`. Reload Cursor afterward (`Developer: Reload Window`).

```bash
bun run plugin:validate
```

| Command | What it does |
|---------|--------------|
| `/rimping-init` | Inspect repo; copy pack into `.agents/` without overwriting |
| `/rimping-run` | Classify, load one skill, verify, stop |
| `/rimping-plan` | Plan only; no edits |
| `/rimping-debug` | Force debug skill |
| `/rimping-architect` | Force architect skill |
| `/rimping-review` | Read-only review |
| `/rimping-status` | List pack files and budgets |
| `/rimping-doctor` | Check required files |

There is no `/rimping-implement` command; use `/rimping-run` for implement-style work. The shared design recommends four primary UX commands (`init`, `plan`, `debug`, `review`); this pack keeps the extended set above for operability. Normal work can still use Cursor directly with `AGENTS.md`.

Token compression remains `rimping init` and `rimping hooks init`. The plugin does not ship `hooks/hooks.json`.

## Adapters

Harness notes live in `templates/adapters/`:

| Harness | Notes |
|---------|-------|
| Cursor | `AGENTS.md` baseline; do not make `.cursor/rules` source of truth |
| Claude Code | Prefer `AGENTS.md`; optional `CLAUDE.md` with `@AGENTS.md` only |
| Codex | Native `AGENTS.md` hierarchy |
| ChatGPT | Paste `AGENTS.md` + one skill; no second maintained copy |
