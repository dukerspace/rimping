# cursor

`.agents` (or this pack) is the source of truth. Cursor reads `AGENTS.md` as a baseline. Do not make `.cursor/rules` the source of truth.

Optional thin pointers in `.cursor/rules/` may name paths into `.agents` for scoped rules. Do not copy the full harness into those files.

In Rimping: do not enable poteto-mode with this harness; its index cancels the savings. Do not run `rimping skills init --force` in a repo that already uses Lean skills; it reinstalls the fat `rimping-guidelines` skill beside them. Existing `.cursor/hooks.json` is Rimping token compression — leave it.
