---
name: rimping-guidelines
description: >
  Coding workflow for AI-assisted development in Rimping. Think before coding,
  make the smallest correct change, preserve project conventions, and verify
  behavior. Use on every coding task in this project.
---

# Rimping Guidelines

Coding workflow for Rimping. Prefer correctness, focused changes, and evidence from the codebase over assumptions. Lazy about the solution, never about reading.

## 1. Think before coding

- Read the target code, its callers, and nearby tests or documentation before editing.
- Trace the relevant behavior far enough to find the root cause and the narrowest correct change.
- Check repository instructions and existing naming, formatting, error-handling, and testing patterns.
- State material assumptions explicitly. Resolve routine choices from repository context.
- When a request has several plausible interpretations, list them — do not pick silently.
- Push back when a simpler approach exists.
- When confused, stop and name what is unclear.

## 2. Plan to fit the task

- For a small, clear fix, make the change directly.
- For broad or multi-part work, outline verifiable steps before editing: `1. [Step] → verify: [check]`.
- Turn imperative asks into verifiable goals:
  - "Add validation" → write tests for invalid inputs, then make them pass
  - "Fix the bug" → reproduce it in a test, then make it pass
  - "Refactor X" → tests pass before and after
- For an ambiguous non-trivial request, ask one question at a time until the decisions that matter are settled. Do not build first and ask afterwards.
- If a simpler approach satisfies the request, use it and briefly explain any meaningful tradeoff.

## 3. Minimal solution

Lazy means efficient, not careless. The best code is the code you never wrote. Code is small because it is necessary, not golfed.

Read the task and the code it touches first. Trace the real flow end to end, then climb this ladder — stop at the first rung that holds:

1. Does this need to exist? → skip it (YAGNI)
2. Already in this codebase? → reuse it
3. Does the stdlib do it? → use it
4. Does a native platform feature cover it? → use it
5. Does an installed dependency solve it? → use it
6. Can this be one line? → one line
7. Only then: the minimum code that works

Example: a date picker is `<input type="date">`, not a new dependency plus a wrapper component.

Rules:

- No abstractions that were not requested.
- No new dependency if a few lines suffice.
- Deletion over addition. Boring over clever. Fewest files possible.
- Bug fix = root cause, not symptom. Fix shared functions once, not every caller.
- Would a senior engineer call this overcomplicated? Then simplify.
- Record deferred shortcuts (see §6) so "later" does not become "never".

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

When new structure is genuinely needed, prefer deep modules (a lot of behavior behind a small interface) placed at an existing seam.

## 5. Verify

Choose the smallest check that gives useful evidence for the requested change. Prefer feedback loops: static types, automated tests, and the browser for UI.

- For a bug fix, verify the reported failure or the corrected behavior.
- For a feature, verify the new behavior through its public interface.
- For a refactor, check that the affected behavior remains intact.
- Follow the user's request and repository guidance about whether to run tests or other checks.

For behavior changes, use red-green-refactor. When a change has multiple behaviors, work in small vertical slices:

```
WRONG:  write all tests → write all implementation
RIGHT:  test1 → impl1 → test2 → impl2 → ...
```

Tests should verify behavior through public interfaces, not implementation details. A good test survives refactors because it does not care about internal structure.

Hard bugs: get a reproduction that fails → minimise → hypothesise → instrument → fix the root cause → add a regression test.

For non-trivial logic, leave a runnable check that would catch a regression when appropriate for the project.

## 6. Report the result

- State what changed and why, with links to the relevant files when available.
- Name the checks that ran and their outcome. If a check was not run or could not run, say so plainly.
- List any deferred shortcuts or known limitations explicitly.
- If work remains, identify the next concrete action.
- Keep the report focused on the requested change; include unrelated findings only when they affect correctness or the user's decision.

## 7. Shared language

Use the project's domain terms consistently in code, tests, and explanations.

- If the repo has a glossary (`GLOSSARY.md` or `CONTEXT.md`), use its terms and update it when a new term is settled.
- Read existing naming patterns before introducing new terms.
- When ambiguity appears, pick one term and use it everywhere.
- Prefer concise domain language over verbose descriptions.

Example: "materialization cascade" beats "when a lesson inside a section is made real in the file system."

## Working if

- Every changed line traces to the request.
- No drive-by refactors.
- Clarifying questions come before implementation.
- Verification is named.
