# Router

Load only for Hard, or when class is ambiguous and the wrong choice changes design.

Classify with the heuristic in `AGENTS.md`. Do not call a model just to classify.

## Step 1 — Complexity

### Tiny

Use when: typo, rename, formatting, obvious one-line fix, isolated local change, trivial configuration.

Workflow: understand → change → verify → stop.

Do not use: architect, reviewer, subagent, extensive planning.

### Normal

Use when: normal feature, normal bug, API endpoint, UI change, database query change, local refactor, multiple related files.

Workflow: understand → select skill → implement → verify → stop.

Normally use one agent.

### Hard

Use when: architecture changes, database migrations, security-sensitive changes, concurrency, distributed systems, cross-domain refactors, difficult production bugs, large changes with significant regression risk.

Workflow: investigate → architect if needed → implement → review if high-risk → verify → stop.

## Step 2 — Task type

| Mode | Skill | Principles (Hard / contested only) |
|------|-------|-------------------------------------|
| Implement | `skills/implement/SKILL.md` | minimal-change, understand-before-change, verify |
| Debug | `skills/debug/SKILL.md` | root-cause, behavior-over-implementation, verify |
| Refactor | `skills/refactor/SKILL.md` | minimal-change, no-premature-abstraction, verify |
| Architect | `skills/architect/SKILL.md` | understand-before-change, no-premature-abstraction, context-budget |
| Review | `skills/review/SKILL.md` | minimal-change, verify |

Principle paths: `principles/<name>.md`. Normal work: open one skill body; do not open principle files. Do not load multiple skills unless required.

## Step 3 — Escalation

Stay in the current agent. Defaults: subagents 0, reviewers 0.

1. Failed verify on a bug → same agent, follow debug skill.
2. Debugger subagent only if Hard and the trace is large (long logs or >1 package).
3. Architect skill in-session before edits when Hard and shape is undecided. One explorer only to compare a second concrete option.
4. Review skill after a Hard diff, or when the user asked for a review. Never for Tiny/Normal by default.

Caps: see `budgets.yaml` (open only on Hard). Tiny: 1 agent, 0 escalations. Normal: 1 agent, ≤1 escalation. Hard: ≤3 agents, ≤2 escalations.

Subagent brief: goal, files, check. Do not paste this harness.

## Force Hard

Failed check, security hint, or second package → Hard. Open this file and the matching skill.
