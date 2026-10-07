---
name: rimping-run
description: Classify a task, discover and rank skills, load selected skills, verify, and stop.
---

Treat the user's message after this command as the task. Do not run a leanstack CLI.

1. Read `AGENTS.md` from the Leanstack pack (project `.agents/AGENTS.md` if installed, else `packages/leanstack/templates/AGENTS.md`).
2. Classify tiny / normal / hard with the rules there. Do not call a model just to classify.
3. Follow `core/context.md`: Tiny loads no other harness file; Normal and Hard open `core/router.md`.
4. For Normal/Hard: discover and rank via `core/router.md` and `core/skills-index.md` (merge project `.agents/skills/**/SKILL.md`). Load skill bodies with score ≥ 50, highest first, up to `budgets.yaml` `max_skills`. Hard also opens 2–3 relevant principles.
5. Do the work. Verify with the smallest relevant check.
6. Stop when `core/stop.md` is true.
