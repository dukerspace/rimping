---
name: review
description: Read-only review of the current diff and nearby behavior.
triggers:
  - review
  - audit
  - security review
  - read-only
  - critique
---

# Review

May load with other ranked skills (see `core/router.md`). Do not modify files. Prefer this procedure for review; other loaded skills constrain domain checks.

Check, in order:

1. Correctness — behavior bugs in the diff and code it touches.
2. Security — trust boundaries, secrets, auth, injection.
3. Regression — likely breakage of existing callers.
4. Complexity — extra abstraction or unnecessary surface.
5. Slop — drive-by changes that do not serve the request.

Prefer a specific file and line over a general concern. Ignore style nits that do not change behavior. Stop. Do not rewrite the change.

Verification for a review is the diff itself.
