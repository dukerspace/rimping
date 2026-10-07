---
name: architect
description: Choose boundaries and an approach for a hard design problem.
---

# Architect

Load this skill alone.

1. Requirements — state the problem, constraints, and non-goals.
2. Constraints — name what must stay true and what is out of scope.
3. Options — name the current boundary that already owns the behavior and at most a few concrete alternatives.
4. Decision — choose the smallest structure that fits.
5. Boundaries — say which files or packages change and which stay put. Stop at the decision unless the task also asks to implement it.

Do not introduce a new package, service, or abstraction without a concrete caller.
