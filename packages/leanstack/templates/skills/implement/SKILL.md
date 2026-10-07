---
name: implement
description: Add or change behavior for a feature, API, CLI, or UI task.
triggers:
  - feature
  - add
  - implement
  - endpoint
  - api
  - ui
  - cli
  - behavior
---

# Implement

May load with other ranked skills (see `core/router.md`). Follow this procedure for the main change; other loaded skills constrain domain steps.

1. Understand — read the code that owns the behavior and its callers.
2. Change — choose the smallest fix: skip, reuse, standard library, platform, installed dependency, then new code. Edit only required files.
3. Verify — run the smallest relevant check.
4. Stop when `core/stop.md` is true.

Do not add a factory, manager, registry, or new dependency for a single caller.
