# Context Loading

Use progressive disclosure.

Never load the entire `.agents` directory or this pack at once.

## Always load

- `AGENTS.md`

## Then load by class

| Class | Load |
| --- | --- |
| Tiny | nothing else from the harness |
| Normal | `core/router.md`, then ranked skill bodies (≤ `max_skills`) |
| Hard | `core/router.md`, ranked skill bodies (≤ `max_skills`), 2–3 relevant principles |

Discovery reads `core/skills-index.md` and frontmatter only — not every skill body.

## Load only when needed

- agent definitions
- architecture skill (unless ranked in)
- review skill (unless ranked in or user asked)
- additional repository documentation
- `budgets.yaml` (Hard, or when reporting caps)

## Repository context

Prefer targeted inspection.

Start with:

1. project structure
2. relevant package
3. relevant module
4. relevant tests
5. relevant configuration

Do not read the entire repository unless the task requires it.

## Avoid

- duplicate file reads
- reading generated files
- reading dependencies
- reading unrelated packages
- loading all skills
- loading all principles

## Priority

```text
task
→ classify
→ discover / rank skills
→ load selected skills
→ relevant files
→ relevant principles (Hard only)
→ execute
→ verification
```

Context is a budget.

Do not spend context on information that cannot affect the decision.
