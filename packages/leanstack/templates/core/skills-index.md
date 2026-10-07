# Skills index

Curated catalog of Rimping mode skills. Read this during discovery. Do not open skill bodies here.

Merge with any other `SKILL.md` found under discovery roots (see `core/router.md`). For each extra skill, read only frontmatter `name`, `description`, and optional `triggers`. Never treat `guidelines` or `rimping-guidelines` as a route target.

After `rimping init`, mode paths live under `skills/rimping/`. In the pack or Cursor plugin they are `skills/<name>/SKILL.md`.

| Name | Path | Description | Triggers |
|------|------|-------------|----------|
| implement | `skills/implement/SKILL.md` | Add or change behavior for a feature, API, CLI, or UI task. | feature, add, implement, endpoint, api, ui, cli, behavior |
| debug | `skills/debug/SKILL.md` | Reproduce a failure, find the cause, and fix that cause. | bug, fail, error, broken, crash, reproduce, fix, regression |
| refactor | `skills/refactor/SKILL.md` | Change structure without changing observable behavior. | refactor, rename, extract, restructure, cleanup structure |
| architect | `skills/architect/SKILL.md` | Choose boundaries and an approach for a hard design problem. | architecture, design, boundary, migration, approach, options |
| review | `skills/review/SKILL.md` | Read-only review of the current diff and nearby behavior. | review, audit, security review, read-only, critique |

Project skills (examples only — discover if present): `frontend`, `testing`, domain packs under `.agents/skills/**/SKILL.md`.
