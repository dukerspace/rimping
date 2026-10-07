---
name: rimping-review
description: Review current changes with the Leanstack review skill without modifying files.
---

Review the current change using Rimping. Optional task text after this command narrows the review. Do not run a leanstack CLI. Do not modify files.

1. Read `AGENTS.md`, then open `skills/review/SKILL.md` only.
2. Inspect the actual diff.
3. Review for: correctness, security, regression, data integrity, error handling, complexity, unnecessary changes.
4. Prefer specific file and line findings. Report only actionable findings.
5. Stop. Do not rewrite code unless explicitly requested.
