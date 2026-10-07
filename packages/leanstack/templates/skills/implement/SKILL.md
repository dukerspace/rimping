---
name: implement
description: Add or change behavior for a feature, API, CLI, or UI task.
---

# Implement

Load this skill alone. Other skills are not in context.

1. Understand — read the code that owns the behavior and its callers.
2. Change — choose the smallest fix: skip, reuse, standard library, platform, installed dependency, then new code. Edit only required files.
3. Verify — run the smallest relevant check.
4. Stop when `core/stop.md` is true.

Do not add a factory, manager, registry, or new dependency for a single caller.
