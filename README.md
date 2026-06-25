# rimping

CLI that reduces tokens in 3 layers — prompt, shell output, and file read — before sending to an LLM agent.

## Getting started

```bash
bun install && bun run build
bun run rimping -- init
bun run rimping -- hooks init
bun run rimping -- doctor
```

After building, you can use `bunx rimping` instead.

## 3-layer token optimization

```
Prompt  → beforeSubmitPrompt hook → optimize pipeline
Shell   → pre-shell hook → rimping shell run → compressed output
Read    → pre-read (line cap) → post-read (compress content)
```

| Layer | Hook | What it does |
|-------|------|--------------|
| Prompt | `hooks pre-send` | Strip filler, inject diff, compress prompt |
| Shell | `hooks pre-shell` → `shell run` | Compress git status, test output, rg/grep |
| Read | `hooks pre-read` / `post-read` | Line limit + strip comments after reading files |

## Main commands

| Command | What it does |
|---------|--------------|
| `init` | Create `.rimping/config.json` + hooks for detected agents |
| `init -g` | Create `~/.rimping/config.json` and global hook paths |
| `hooks init` | Create hook files only (when you ran `init --no-hooks`) |
| `doctor` | Check agent + config + hook registration |
| `optimize [prompt]` | Run prompt through the pipeline (CLI) |
| `shell run <cmd>` | Run a command and print compressed output |
| `stats` | Cache + hook savings by event |
| `hooks log` | View `.rimping/hooks.log` (pre-send, shell-run, post-read) |
| `explain` | Pipeline steps from the latest run |
| `skills init` | Create agent guidelines in `.agents/skills/` (not part of the prompt pipeline) |

Examples:

```bash
bun run rimping -- optimize --diff --max-tokens 4000 "review my changes"
bun run rimping -- shell run "git status" --explain
bun run rimping -- init -g && bun run rimping -- hooks init -g
echo "prompt" | bun run rimping -- optimize --stdin --json
```

## Supported hook agents

Cursor, Claude Code, Codex, Gemini CLI, GitHub Copilot, Windsurf, Antigravity

Run `rimping hooks init` to scaffold hook files for detected agents.

## Config

Config files are merged at runtime: `~/.rimping/config.json` (global) + `.rimping/config.json` (project overrides global)

```json
{
  "hooks": { "enabled": true, "logStats": true },
  "shell": { "enabled": true, "maxTokens": 4000 },
  "read": { "enabled": true, "autoLimit": true, "compressOutput": true, "maxLines": 200 },
  "agents": {
    "cursor": { "enabled": true },
    "claude": { "enabled": true },
    "chatgpt": { "enabled": false }
  }
}
```

Top-level `hooks` applies to all agents — `agents.<id>` is usually just `enabled`; use `agents.<id>.hooks` only when you need an override.

Full details → [User Guide](docs/user-guide.md)

## Structure

```
packages/cli   → CLI (@rimping/cli)
packages/core  → engine (@rimping/core)
```

## Documentation

Run `bun run docs:dev` and open http://localhost:5173

| | EN | TH |
|---|----|-----|
| Overview | [docs/](docs/index.md) | [docs/th/](docs/th/index.md) |
| User Guide | [user-guide](docs/user-guide.md) | [user-guide](docs/th/user-guide.md) |
| Architecture | [architecture](docs/architecture.md) | [architecture](docs/th/architecture.md) |
| Developer | [developer-guide](docs/developer-guide.md) | [developer-guide](docs/th/developer-guide.md) |
| Benchmarks | [benchmarks](docs/benchmarks.md) | [benchmarks](docs/th/benchmarks.md) |

## Dev

```bash
bun run build
bun run dev
bun run typecheck
bun run benchmark
```

[MIT](LICENSE)
