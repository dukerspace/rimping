# Leanstack

Leanstack is a file pack under `packages/leanstack/templates/`. Treat it as an operating layer for the Cursor agent — not a second AI that does everything itself.

```text
User asks → Leanstack chooses how → Cursor does the work → Verify → Stop
```

Agents classify a task with deterministic rules, discover and rank relevant skills (including project skills), load up to the budget, verify, and stop. There is no `leanstack` CLI. It does not call `rimping optimize` or a private agent API. Agents read the templates (or a copy under a project's `.agents/`).

Package summary: [packages/leanstack/README.md](https://github.com/dukerspace/rimping/blob/main/packages/leanstack/README.md)

## Overview

```text
           USER
             │
   /rimping-init | /rimping-plan | /rimping-debug
   /rimping-run  | or a normal prompt
             ▼
        Cursor Agent
             ▼
     .agents/AGENTS.md
             ▼
          CLASSIFY
       ┌─────┼─────┐
       ▼     ▼     ▼
     Tiny  Normal  Hard
      5K    20K    50K
       │     │      │
       ▼     ▼      ▼
    direct  router  router
            discover + rank
            load skills
            (+ principles on Hard)
             │
             ▼
          EXECUTE
             ▼
          VERIFY
             ▼
           STOP
```

## Layout

```text
packages/leanstack/templates/
├── AGENTS.md
├── budgets.yaml
├── core/          # router.md, context.md, skills-index.md, stop.md
├── principles/    # 7 short principles
├── skills/        # implement, debug, refactor, architect, review (+ guidelines)
├── agents/        # general, debugger, architect, reviewer
├── adapters/      # cursor, claude, codex, chatgpt
└── commands/      # Cursor slash-command sources
```

## Workflow

```text
TASK → classify → discover skills → rank → load (≤ max_skills) → execute → verify → STOP
```

### Classify

Classify with deterministic rules. Do not call a model just to classify. If the user names a mode or skill, use it.

**Complexity**

| Class | When |
|-------|------|
| **Hard** | Architecture, migration, security, concurrency, distributed, cross-package, flaky or failed production bug |
| **Tiny** | Typo, comment, one-place rename, formatting, obvious one-line fix |
| **Normal** | Everything else that needs a skill |

**Task-type hint** (not a final skill pick): debug · refactor · architect · review · implement.

### Discover and rank

For Normal and Hard, open `core/router.md`:

1. Read `core/skills-index.md` (mode catalog).
2. Scan `.agents/skills/**/SKILL.md` (or pack/plugin `skills/*/SKILL.md`) — frontmatter only. Exclude `guidelines`.
3. Score candidates 0–100 (keywords, triggers, task-type affinity). Implement is a scored fallback (~60 baseline), not an automatic winner.
4. Load bodies with score ≥ 50, highest first, up to `budgets.yaml` `max_skills`.

### Progressive context

Never load the entire pack. See `core/context.md`:

| Class | Load |
|-------|------|
| Tiny | `AGENTS.md` only |
| Normal | `AGENTS.md` + `core/router.md` + ranked skill bodies (≤ `max_skills`) |
| Hard | Same as Normal + 2–3 principles |

Open `budgets.yaml` on Hard, or when reporting caps. Principle files open only on Hard.

### Budgets

Workflow limits from `budgets.yaml` — not an API hard cap and not a spend target:

| Class | Tokens | Agents | Skills | Principles | Escalations |
|-------|--------|--------|--------|------------|-------------|
| tiny | 5K | 1 | 1 | 2 | 0 |
| normal | 20K | 1 | 2 | 3 | 1 |
| hard | 50K | 3 | 4 | 5 | 2 |

If the budget is exhausted: STOP, summarize, or ask the user. Do not spawn another agent to spend more.

## Router

Load `core/router.md` for Normal and Hard. Tiny skips it.

The router:

1. Classifies complexity and a task-type hint.
2. Discovers skills from the index + project scan.
3. Ranks and loads up to budget.
4. Escalates only within caps.

Forced commands (`/rimping-debug`, `/rimping-architect`, `/rimping-review`) skip discovery and open the named skill only.

### Tiny — rename

Task: rename `userId` → `customerId` in one place.

```text
hint = refactor
complexity = tiny
budget = 5K
```

Workflow: read → change → typecheck (or the smallest check) → stop.
No router, skills, architect, reviewer, or long plan.

### Normal — feature

Task: add a coupon system.

```text
hint = implement
complexity = normal
budget = 20K
```

Load: `AGENTS.md` + router → discover/rank (e.g. implement 90; project `frontend` 95 if present) → load top skills ≤ 2. Then: find booking → pricing → promotion → understand flow → edit → test → verify → **STOP**.

### Normal — bug

Task: booking creates duplicate orders.

```text
hint = debug
complexity = normal
```

Rank boosts debug; load `skills/debug/SKILL.md` (and any domain skill ≥ 50). Workflow: reproduce → observe → trace → root cause → fix → test → **STOP**.

Do not start by guessing (e.g. “probably a race, add a mutex”) before evidence.

### Hard — architecture

Task: redesign booking availability for hotel / spa / car rental / concert.

```text
complexity = hard
```

Escalation only when needed:

```text
general → architect → implement → reviewer → verification
```

Not every task gets this path.

## Skills, agents, escalation

Mode skills (indexed in `core/skills-index.md`): `skills/{implement,debug,refactor,architect,review}/SKILL.md`. Project skills under `.agents/skills/**` are discovered and ranked with them.

`skills/guidelines/` (`rimping-guidelines`) is the Rimping coding guide. It is not a route target and is not copied into the Cursor plugin.

Defaults: 1 agent, 0 subagents, 0 reviewers. Escalate only after a failed attempt, and only if the budget allows:

```text
general → debugger → architect → reviewer
```

Four roles: `general`, `debugger`, `architect`, `reviewer`. They do not all run at once. Use reviewer for high-risk Hard work (payment, migration, security, data integrity) or when the user asked for a review — not for Tiny/Normal by default.

A multi-agent fan-out reloads context per agent. Example: six agents × ~5K ≈ 30K when the job might need ~8K. Prefer:

```text
one agent → ranked skills (≤ max_skills) → execute → verify
```

Model tiers (adapters map them to concrete models): **fast** (classify / simple coding), **standard** (normal implementation), **reasoning** (architecture / hard bugs). Never hard-code a vendor model name in core files.

## What `.agents` is for

It is a knowledge / workflow layer, not application code:

| Piece | Role |
|-------|------|
| `AGENTS.md` | How we work |
| `core/router.md` | Classify, discover, rank, load |
| `core/skills-index.md` | Mode skill catalog for discovery |
| `skills/*/SKILL.md` | Steps for selected skills |
| `principles/*.md` | How to think (Hard only) |
| `agents/*.md` | Which role if escalating |

A debug task does not need every principle. Load only what the router maps (e.g. root-cause, behavior-over-implementation, verify) — and only when Hard opens principles at all.

```text
Before: AGENTS + 7 principles + all skills + 4 agents  → large
After:  AGENTS + router + ranked skills (+ 2–3 principles on Hard) → small
```

That is progressive disclosure (`core/context.md`).

## Verify and stop

Done is not “AI finished writing code.” Done is:

```text
EXECUTE → VERIFY → pass? → STOP
              └─ fail → fix → VERIFY
```

Pick the **minimum meaningful** check (`typecheck`, targeted tests, build) — not every script in the repo.

Stop when `core/stop.md` is true:

- Requested behavior works
- Relevant verification passes
- No known regression
- Diff is minimal
- No unnecessary abstraction

Do not add unrelated refactors, cleanup, speculative abstractions, docs, or tests after that.

## Install into a project

Primary: `rimping init` (project-local) copies the Leanstack pack into `.agents/` from `packages/leanstack/templates/` (or a bundled CLI mirror). Use `--no-agents` to skip the pack; `--force` overwrites existing pack files. Global init (`-g`) does not install `.agents/`.

Agent-side alternative after the Cursor plugin: `/rimping-init` (same copy rules):

1. Inspect the repo (stack, existing agent config) before changing anything.
2. Copy into `.agents/` — `AGENTS.md`, `budgets.yaml`, `core/`, `principles/`, `skills/rimping/` (mode skills), `agents/`, `adapters/`.
3. Copy only files that do not already exist. Never overwrite unless the user asked to force.
4. Do not create or overwrite root `AGENTS.md` or `CLAUDE.md`.
5. Do not copy `commands/` (those stay in the Cursor plugin).

Creates only what is missing under `.agents/`:

```text
.agents/
├── AGENTS.md
├── budgets.yaml
├── core/
├── principles/
├── skills/
│   └── rimping/          # implement, debug, refactor, architect, review, guidelines
├── agents/
└── adapters/
```

Use `/rimping-doctor` or `rimping doctor` to check required files (including `core/context.md`). Use `/rimping-status` to list pack files and budgets.

### After init

Suppose you run:

```text
/rimping-run
Add coupon support for booking
```

(There is no `/rimping-implement`; use `/rimping-run` or a normal prompt with `AGENTS.md` loaded.)

Cursor does not read the whole pack. It starts from `.agents/AGENTS.md`, classifies (e.g. normal + implement hint), opens `core/router.md`, discovers/ranks skills, then loads only the selected bodies (e.g. `skills/rimping/implement/SKILL.md` plus a high-scoring project skill).

On Normal it does **not** open principle files. On Hard it also opens 2–3 relevant principles. It does not load every mode skill — only those that rank above the threshold within `max_skills`.

That progressive load is the main token saving.

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
| `/rimping-run` | Classify, discover/rank skills, load, verify, stop |
| `/rimping-plan` | Plan only; no edits |
| `/rimping-debug` | Force debug skill |
| `/rimping-architect` | Force architect skill |
| `/rimping-review` | Read-only review |
| `/rimping-status` | List pack files and budgets |
| `/rimping-doctor` | Check required files |

There is no `/rimping-implement` command; use `/rimping-run` for implement-style work. The shared design recommends four primary UX commands (`init`, `plan`, `debug`, `review`); this pack keeps the extended set above for operability. Normal work can still use Cursor directly with `AGENTS.md`.

For small clear work you do not need `/rimping-plan` first — that burns an extra turn. `/rimping-init` prepares the system; `/rimping-plan` uses the system to plan a task.

Token compression remains `rimping init` and `rimping hooks init`. The plugin does not ship `hooks/hooks.json`.

## Worked example: `/rimping-debug`

Monorepo layout like `apps/web`, `apps/api`, `packages/db`, `packages/shared`. You run:

```text
/rimping-debug
After refresh token expires, React Query still hits the API
```

Leanstack path: task → debug → normal → debug skill (principles only if Hard).

Cursor traces: Axios interceptor → refresh endpoint → auth store → React Query → logout state. Finds: refresh fails → cookie expired → interceptor returns error → user store not cleared. Fixes that one cause, runs typecheck/test, checks the diff, **STOP**.

## Where token savings come from

Not only smaller files — avoiding unnecessary work:

```text
              LEANSTACK
                 │
    ┌────────────┼────────────┐
    │            │            │
 Context      Agents      Planning
 progressive  default 0   minimal
 disclosure
    └────────────┼────────────┘
                 ▼
              VERIFY → STOP
```

Targets (workflow budgets, not spend goals): Tiny ~1–5K · Normal ~5–20K · Hard ~20–50K. Do not force every task through a Hard workflow.

Leanstack does not replace `rimping optimize` / hook token compression. Do not enable poteto-mode alongside this harness — its index cancels the savings.

## Adapters

Harness notes live in `templates/adapters/`:

| Harness | Notes |
|---------|-------|
| Cursor | `AGENTS.md` baseline; do not make `.cursor/rules` source of truth |
| Claude Code | Prefer `AGENTS.md`; optional `CLAUDE.md` with `@AGENTS.md` only |
| Codex | Native `AGENTS.md` hierarchy |
| ChatGPT | Paste `AGENTS.md` + ranked skills; no second maintained copy |

## One-line summary

Leanstack does not try to make the AI “smarter.” It tries to keep the AI from doing more than the task needs:

```text
engineering discipline
  + progressive context
  + budget
  + minimal orchestration
  + aggressive STOP
```

Cursor keeps full capability; Leanstack constrains **when to think hard** and **when to stop**.
