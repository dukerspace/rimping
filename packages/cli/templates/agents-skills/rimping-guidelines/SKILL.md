---
name: rimping-guidelines
description: >
  Engineering discipline for AI-assisted development. Think before coding,
  align on ambiguity, write minimal correct code, make surgical changes,
  verify with tests, use shared domain language. Use on every coding task
  in this project.
---

# Rimping Guidelines

Behavioral baseline for AI-assisted development. Bias toward caution and correctness over speed.

## 1. Think first

Before implementing:

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — do not pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what is confusing. Ask.

## 2. Align before coding

Misalignment is the most common failure mode. Before writing code:

- For large or ambiguous tasks, ask clarifying questions until the decision tree is resolved.
- Confirm scope: what is in, what is out, what success looks like.
- Prefer a short plan with verifiable steps over jumping into implementation.

## 3. Minimal solution

Lazy means efficient, not careless. The best code is the code you never wrote.

Read the task and the code it touches first. Trace the real flow end to end, then climb this ladder — stop at the first rung that holds:

1. Does this need to exist? → skip it (YAGNI)
2. Already in this codebase? → reuse it
3. Does the stdlib do it? → use it
4. Does a native platform feature cover it? → use it
5. Does an installed dependency solve it? → use it
6. Can this be one line? → one line
7. Only then: the minimum code that works

Rules:

- No abstractions that were not requested.
- No new dependency if a few lines suffice.
- Deletion over addition. Boring over clever. Fewest files possible.
- Bug fix = root cause, not symptom. Fix shared functions once, not every caller.

Never cut: input validation at trust boundaries, error handling that prevents data loss, security, accessibility, anything explicitly requested.

## 4. Surgical changes

When editing existing code:

- Touch only what the request requires.
- Do not improve adjacent code, comments, or formatting.
- Do not refactor things that are not broken.
- Match existing style, even if you would do it differently.
- If you notice unrelated dead code, mention it — do not delete it unless asked.

When your changes create orphans, remove imports, variables, and functions that your changes made unused. Do not remove pre-existing dead code.

Every changed line should trace directly to the user's request.

## 5. Verify

Transform tasks into verifiable goals:

- "Add validation" → write tests for invalid inputs, then make them pass
- "Fix the bug" → write a test that reproduces it, then make it pass
- "Refactor X" → ensure tests pass before and after

For features and bug fixes, use vertical slices — not horizontal ones:

```
WRONG:  write all tests → write all implementation
RIGHT:  test1 → impl1 → test2 → impl2 → ...
```

Tests should verify behavior through public interfaces, not implementation details. A good test survives refactors because it does not care about internal structure.

Non-trivial logic leaves one runnable check behind — the smallest thing that fails if the logic breaks.

## 6. Shared language

Use the project's domain terms consistently in code, tests, and explanations.

- Read existing naming patterns before introducing new terms.
- When ambiguity appears, pick one term and use it everywhere.
- Prefer concise domain language over verbose descriptions.

Example: "materialization cascade" beats "when a lesson inside a section is made real in the file system."
