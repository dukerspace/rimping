---
name: rimping-run
description: Classify a task, load one Leanstack skill, verify, and stop.
---

Treat the user's message after this command as the task. Do not run a leanstack CLI.

1. Read `AGENTS.md` from the Leanstack pack (project `.agents/AGENTS.md` if installed, else `packages/leanstack/templates/AGENTS.md`).
2. Classify tiny / normal / hard with the rules there. Do not call a model just to classify.
3. Follow `core/context.md`: Tiny loads no other harness file; Normal opens one skill; Hard also opens `core/router.md` and 2–3 relevant principles.
4. Open exactly one skill under `skills/{implement,debug,refactor,architect,review}/SKILL.md`.
5. Do the work. Verify with the smallest relevant check.
6. Stop when `core/stop.md` is true.
