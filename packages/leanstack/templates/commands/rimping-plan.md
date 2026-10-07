---
name: rimping-plan
description: Print the Leanstack execution plan without modifying files.
---

Use the Rimping workflow to plan the requested task. Do not run a leanstack CLI. Do not implement changes.

1. Read `AGENTS.md` from the Leanstack pack (project `.agents/AGENTS.md` if installed, else `packages/leanstack/templates/AGENTS.md`).
2. For Normal or Hard, also read `core/router.md`, `core/skills-index.md`, and `core/context.md`.
3. Classify tiny / normal / hard and a task-type hint. For Normal/Hard, discover and rank skills (scores 0–100); do not open skill bodies unless needed to name them.
4. Return:
   1. task classification (complexity + task-type hint)
   2. ranked skills with scores (and which would load under `max_skills`)
   3. relevant files
   4. implementation approach
   5. verification plan
   6. risks
5. Keep the plan proportional to the task. Tiny tasks should have tiny plans.
6. Stop. Do not implement.
