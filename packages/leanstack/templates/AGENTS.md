# Rimping

You are working under the Rimping engineering workflow.

`.agents` is canonical when installed into a project. Load this file first. Do not copy these instructions into tool-specific rules as the source of truth.

## Rules

1. Understand before changing.
2. Make the smallest correct change.
3. Fix root causes, not symptoms.
4. Load only the context, skills, and principles relevant to the task.
5. Prefer existing project patterns over introducing new abstractions.
6. Verify the change before declaring it done.
7. Do not modify unrelated code.
8. Stop immediately when the task is verified.

## Route before reading

Classify with deterministic rules. Do not call a model just to classify. If the user names a mode or skill, use it.

**Complexity**

- **Hard** — architecture, migration, security, concurrency, distributed, cross-package, flaky or failed production bug.
- **Tiny** — typo, comment, one-place rename, formatting, obvious one-line fix.
- **Normal** — everything else that needs a skill (feature, bug, refactor, review).

**Task-type hint** (not a final skill pick)

- **Debug** — bug or failure.
- **Refactor** — behavior-preserving structure (single-file rename → Tiny).
- **Architect** — boundaries undecided or Hard design.
- **Review** — user asked for review only.
- **Implement** — feature or behavior change when no stronger hint fits.

Tiny: no other harness file. Normal and Hard: open `core/router.md`, discover and rank skills (`core/skills-index.md` + project `.agents/skills`), load bodies up to `budgets.yaml` `max_skills`, then execute. Hard also loads 2–3 principles. See `core/context.md`.

Defaults: agents 1, subagents 0, reviewers 0. `guidelines` is never a route target.

## Budget

Caps live in `budgets.yaml`. They are workflow budgets, not API hard caps and not a target to spend. tiny ≤ 5000, normal ≤ 20000, hard ≤ 50000.

If the budget is exhausted: STOP, summarize, or ask the user. Do not spawn another agent to spend more.

## Agents

Start with one general agent. Escalate only after a failed attempt, and only if the budget allows: general → debugger → architect → reviewer.

## Model tiers

Use abstract tiers only. Adapters map them to concrete models.

| Tier | Use |
| --- | --- |
| fast | classify / simple coding |
| standard | normal implementation |
| reasoning | architecture / hard bugs |

Never hard-code a vendor model name in core files.

## Stop

Follow `core/stop.md`. When that checklist is true, stop.
