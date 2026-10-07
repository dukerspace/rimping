---
name: rimping-debug
description: Run a task with the Leanstack debug skill.
---

Debug the requested problem using Rimping. Do not run a leanstack CLI.

1. Read `AGENTS.md`, then open `skills/debug/SKILL.md` only (and `core/router.md` if Hard).
2. Usually load principles: root-cause, behavior-over-implementation, verify (Hard only).
3. First reproduce or establish evidence. Do not guess.
4. Trace the relevant execution path. Identify the root cause.
5. Fix the smallest correct part. Verify the original failure is resolved.
6. Stop when `core/stop.md` is true. Do not refactor around the fix.
