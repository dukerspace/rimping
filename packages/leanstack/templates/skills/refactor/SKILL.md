---
name: refactor
description: Change structure without changing observable behavior.
triggers:
  - refactor
  - rename
  - extract
  - restructure
  - cleanup structure
---

# Refactor

May load with other ranked skills (see `core/router.md`). Prefer this procedure for structure-only work; other loaded skills constrain domain steps.

1. Understand the invariant — name the behavior that must stay the same and cover it with the existing check.
2. Small transformation — change structure only. Callers should observe the same results.
3. Verify — re-run the check.
4. Remove legacy only when the check still passes. Stop. Do not mix a feature into the refactor.

If the result changes, it is not a refactor.
