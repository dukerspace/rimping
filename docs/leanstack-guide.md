# Leanstack working guide

Treat Leanstack as an operating layer for the Cursor agent — not a second AI that does everything itself.

```text
User asks → Leanstack chooses how → Cursor does the work → Verify → Stop
```

Reference: [Leanstack](./leanstack) · pack: `packages/leanstack/templates/`

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
          Router
       ┌─────┼─────┐
       ▼     ▼     ▼
     Tiny  Normal  Hard
      5K    20K    50K
       │     │      │
       ▼     ▼      ▼
    direct  skill  router + skill
                     (+ principles)
             │
             ▼
         IMPLEMENT
             ▼
          VERIFY
             ▼
           STOP
```

## `/rimping-init`

Bootstrap command. Open a project and run `/rimping-init`.

Cursor inspects the repository first (language, package manager, monorepo layout, existing agent config). Example detections are illustrative — init adapts to the real repo:

```text
Language: TypeScript
Package manager: pnpm (or bun, npm, …)
Monorepo: Turbo
…
```

Then it creates only what is missing under `.agents/`:

```text
.agents/
├── AGENTS.md
├── budgets.yaml
├── core/
├── principles/
├── skills/
├── agents/
└── adapters/
```

Existing `.agents` files are not overwritten unless you ask to force. Root `AGENTS.md` and `CLAUDE.md` are never written by this command. `commands/` stay in the Cursor plugin, not in `.agents/`.

## After init

Suppose you run:

```text
/rimping-run
Add coupon support for booking
```

(There is no `/rimping-implement`; use `/rimping-run` or a normal prompt with `AGENTS.md` loaded.)

Cursor does not read the whole pack. It starts from `.agents/AGENTS.md`, classifies (e.g. implement + normal), then loads only `skills/implement/SKILL.md`.

On Normal it does **not** open principle files. On Hard (or a contested design choice) it also opens `core/router.md` and 2–3 relevant principles. It does not load debug, architect, or review unless the class needs them.

That progressive load is the main token saving.

## Router

The router answers two simple questions — it does not invent magic:

1. **What kind of work?** implement · debug · refactor · architect · review  
2. **How big?** tiny · normal · hard  

Load `core/router.md` only for Hard, or when class is ambiguous and the wrong choice changes design. Classify with the rules in `AGENTS.md`; do not call a model just to classify.

### Tiny — rename

Task: rename `userId` → `customerId` in one place.

```text
type = refactor
complexity = tiny
budget = 5K
```

Workflow: read → change → typecheck (or the smallest check) → stop.  
No architect, reviewer, subagent, or long plan.

### Normal — feature

Task: add a coupon system.

```text
type = implement
complexity = normal
budget = 20K
```

Load: `AGENTS.md` + implement skill. Then: find booking → pricing → promotion → understand flow → edit → test → verify → **STOP**.

### Normal — bug

Task: booking creates duplicate orders.

```text
type = debug
complexity = normal
```

Load: `skills/debug/SKILL.md`. Workflow: reproduce → observe → trace → root cause → fix → test → **STOP**.

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

## Agents

Four roles: `general`, `debugger`, `architect`, `reviewer`. They do not all run at once.

Default: one **general** agent. After a failed attempt, and only if budget allows:

```text
general → debugger → architect → reviewer
```

Use reviewer for high-risk Hard work (payment, migration, security, data integrity) or when the user asked for a review — not for Tiny/Normal by default.

### Why not spawn subagents every time?

A multi-agent fan-out reloads context per agent. Example: six agents × ~5K ≈ 30K when the job might need ~8K.

Leanstack prefers:

```text
one agent → one skill → implement → verify
```

for most work.

## What `.agents` is for

It is a knowledge / workflow layer, not application code:

| Piece | Role |
|-------|------|
| `AGENTS.md` | How we work |
| `core/router.md` | Which workflow |
| `skills/*/SKILL.md` | Steps for that mode |
| `principles/*.md` | How to think (Hard / contested) |
| `agents/*.md` | Which role if escalating |

## Why split principles

A debug task does not need every principle. Load only what the router maps (e.g. root-cause, behavior-over-implementation, verify) — and only when Hard opens principles at all.

```text
Before: AGENTS + 7 principles + 5 skills + 4 agents  → large
After:  AGENTS + one skill (+ 2–3 principles on Hard) → small
```

That is progressive disclosure (`core/context.md`).

## Verify and stop

Done is not “AI finished writing code.” Done is:

```text
IMPLEMENT → VERIFY → pass? → STOP
                 └─ fail → fix → VERIFY
```

Pick the **minimum meaningful** check (`typecheck`, targeted tests, build) — not every script in the repo.

Stop when `core/stop.md` is true:

- Requested behavior works  
- Relevant verification passes  
- No known regression  
- Diff is minimal  
- No unnecessary abstraction  

Do not “while I’m here” refactor neighboring code after the checklist passes. That cuts tokens, time, bugs, and scope creep.

## Commands

| Command | Role |
|---------|------|
| `/rimping-init` | Create / prepare the Leanstack pack in `.agents/` |
| `/rimping-plan` | Understand → classify → inspect → plan → **STOP** (no edits) |
| `/rimping-run` | Classify → one skill → implement → verify → **STOP** |
| `/rimping-debug` | Force debug skill |
| `/rimping-architect` | Force architect skill |
| `/rimping-review` | Read-only review |
| `/rimping-status` / `/rimping-doctor` | Inspect pack health |

For small clear work you do not need `/rimping-plan` first — that burns an extra turn. Normal coding can use Cursor with `AGENTS.md` alone.

`/rimping-init` prepares the system. `/rimping-plan` uses the system to plan a task.

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
