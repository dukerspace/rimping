# Router

Load for Normal and Hard. Tiny skips this file.

Do not call a model just to classify or rank. If the user names a mode or skill, prefer it.

```text
USER TASK
    │
    ▼
CLASSIFY ── complexity + task-type hint
    │
    ▼
SKILL DISCOVERY ── skills-index + project scan
    │
    ▼
MATCH / RANK ── score 0–100
    │
    ▼
LOAD SKILLS ── score ≥ 50, up to max_skills
    │
    ▼
EXECUTE → VERIFY → STOP
```

## Step 1 — Classify

### Complexity

#### Tiny

Use when: typo, rename, formatting, obvious one-line fix, isolated local change, trivial configuration.

Workflow: understand → change → verify → stop. Do not open this router, skills, or principles.

#### Normal

Use when: normal feature, normal bug, API endpoint, UI change, database query change, local refactor, multiple related files.

#### Hard

Use when: architecture changes, database migrations, security-sensitive changes, concurrency, distributed systems, cross-domain refactors, difficult production bugs, large changes with significant regression risk.

### Task-type hint

Pick a hint (not a final skill pick): implement · debug · refactor · architect · review.

| Hint | When |
|------|------|
| debug | Bug or failure that is not Hard (Hard bugs still hint debug) |
| refactor | Behavior-preserving structure (single-file rename → Tiny) |
| architect | Boundaries undecided, design options, or Hard shape unknown |
| review | User asked for review / audit only |
| implement | Feature or behavior change when no stronger hint fits |

User-named mode overrides the hint.

## Step 2 — Discover

1. Read `core/skills-index.md`.
2. Scan discovery roots for other `SKILL.md` files:
   - Project installed: `.agents/skills/**/SKILL.md`
   - Else pack or plugin: `skills/*/SKILL.md` (and nested under `skills/rimping/` if present)
3. Exclude `guidelines` and `rimping-guidelines`.
4. For each candidate, take only frontmatter `name`, `description`, optional `triggers`. Do not open skill bodies yet.
5. Merge index rows with scanned skills (same `name` → one entry; prefer the path that exists on disk).

## Step 3 — Rank

Score each candidate 0–100. Deterministic heuristics only:

1. **Keyword overlap** — task text vs name, description, and triggers (strong match → high band, weak → low).
2. **Task-type affinity** — boost the mode skill that matches the hint (e.g. debug hint → debug ≈ 85–95).
3. **Implement fallback** — give `implement` a baseline ≈ 60 when the hint is implement or no stronger mode match exists. Implement is a scored candidate, not an automatic winner.
4. **Project / domain skills** — score from description and triggers only (e.g. frontend UI task may outrank implement).

Example:

```text
implement  90
frontend   95
testing    20
```

Sort by score descending. Drop scores below **50**.

## Step 4 — Load

Open skill bodies for the remaining list, highest score first, capped by `budgets.yaml` `max_skills` (normal ≤ 2, hard ≤ 4).

- Normal: ranked skills only. Do not open principle files.
- Hard: ranked skills + 2–3 relevant principles from the map below (or closest match).
- Primary skill = highest score. Follow it for the main procedure; other loaded skills constrain domain steps.

Principle paths: `principles/<name>.md`.

| Mode affinity | Principles (Hard / contested only) |
|---------------|-------------------------------------|
| Implement | minimal-change, understand-before-change, verify |
| Debug | root-cause, behavior-over-implementation, verify |
| Refactor | minimal-change, no-premature-abstraction, verify |
| Architect | understand-before-change, no-premature-abstraction, context-budget |
| Review | minimal-change, verify |

If nothing scores ≥ 50, load `implement` alone (or the user-named skill).

## Step 5 — Escalate

Stay in the current agent. Defaults: subagents 0, reviewers 0.

1. Failed verify on a bug → re-rank toward debug; same agent, follow debug skill.
2. Debugger subagent only if Hard and the trace is large (long logs or >1 package).
3. Architect skill in-session before edits when Hard and shape is undecided. One explorer only to compare a second concrete option.
4. Review skill after a Hard diff, or when the user asked for a review. Never for Tiny/Normal by default.

Caps: see `budgets.yaml` (open on Hard, or when reporting caps). Tiny: 1 agent, 0 escalations. Normal: 1 agent, ≤1 escalation. Hard: ≤3 agents, ≤2 escalations.

Subagent brief: goal, files, check. Do not paste this harness.

## Force Hard

Failed check, security hint, or second package → Hard. Keep discovery/rank; open principles as above.

## Forced commands

`/rimping-debug`, `/rimping-architect`, `/rimping-review` skip discovery and open the named skill only (plus router/principles when that command says so).
