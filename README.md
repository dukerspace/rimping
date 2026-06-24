# rimping

Skill-based token optimization CLI for LLM prompts. Reduces token usage intelligently while preserving semantic meaning.

Built with [Bun](https://bun.sh), TypeScript, and a modular skill plugin system.

## Documentation

**Docs website** (VitePress): run `bun run docs:dev` then open [http://localhost:5173](http://localhost:5173)

| | English | ไทย |
|---|---------|-----|
| Overview | [docs/](docs/index.md) | [docs/th/](docs/th/index.md) |
| User Guide | [docs/user-guide.md](docs/user-guide.md) | [docs/th/user-guide.md](docs/th/user-guide.md) |
| Architecture | [docs/architecture.md](docs/architecture.md) | [docs/th/architecture.md](docs/th/architecture.md) |
| Developer Guide | [docs/developer-guide.md](docs/developer-guide.md) | [docs/th/developer-guide.md](docs/th/developer-guide.md) |

## Pipeline

```
Input Prompt
  → Skill Engine
  → Context Builder (Git / Memory / Diff)
  → Token Optimizer
  → Budget Planner
  → Provider Adapter Output
```

## Structure

```
rimping/
├── packages/
│   ├── cli/       # CLI entry point (@rimping/cli)
│   └── core/      # Optimization engine (@rimping/core)
├── skills/        # Bundled skill plugins (Markdown)
├── .cursor/       # Cursor hook integration
└── turbo.json
```

## Prerequisites

- [Bun](https://bun.sh) >= 1.0

## Setup

```bash
bun install
bun run build
```

## CLI Usage

```bash
# Optimize a prompt
bun run rimping -- optimize "please could you help me refactor this typescript code"

# Include git diff context
bun run rimping -- optimize --diff "review my changes"

# Use specific skills
bun run rimping -- optimize --skills typescript-refactor,git-diff-analyzer "refactor types"

# Set token budget
bun run rimping -- optimize --max-tokens 4000 "long prompt..."

# Read from stdin
echo "my prompt" | bun run rimping -- optimize --stdin

# JSON output with full stats
bun run rimping -- optimize --json "optimize this"

# Show explain steps
bun run rimping -- optimize --explain "verbose prompt with filler words"

# Cache and session stats
bun run rimping -- stats

# Pipeline breakdown from last run
bun run rimping -- explain

# Initialize project config
bun run rimping -- init
bun run rimping -- init --force

# Check AI agent setup and project health
bun run rimping -- doctor
bun run rimping -- doctor --json

# Initialize agent guidelines skill
bun run rimping -- skills init
bun run rimping -- skills init --force
```

### After build

```bash
bunx rimping init
bunx rimping doctor
bunx rimping optimize "your prompt here"
bunx rimping stats
bunx rimping explain
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create `.rimping/config.json` with defaults and detected agents |
| `doctor` | Detect AI coding agents and validate rimping project setup |
| `optimize [prompt]` | Optimize a prompt through the full pipeline |
| `stats` | Show cache statistics and last-run summary |
| `explain` | Show pipeline steps from the last optimization |
| `skills init` | Create `rimping-guidelines` agent skill in `.agents/skills/` |

### Init flags

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing `config.json` |
| `--dry-run` | Show what would be created without writing files |
| `--no-detect` | Skip agent detection when generating config |
| `--json` | Output result as JSON |
| `--cwd <path>` | Working directory (default: current) |

### Doctor flags

| Flag | Description |
|------|-------------|
| `--json` | Output full doctor report as JSON |
| `--cwd <path>` | Working directory (default: current) |

Exits with code `1` when issues are found (missing config, invalid config, missing agent skill).

### Skills init flags

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing `SKILL.md` |
| `--dry-run` | Show what would be created without writing files |
| `--json` | Output result as JSON |
| `--cwd <path>` | Working directory (default: current) |

### Optimize flags

| Flag | Description |
|------|-------------|
| `--diff` | Inject git diff context (modified hunks only) |
| `--skills <ids>` | Comma-separated skill IDs |
| `--max-tokens <n>` | Token budget cap |
| `--provider <name>` | Output format: `openai`, `claude`, `gemini`, `mock` |
| `--stdin` | Read prompt from stdin |
| `--json` | Output full JSON result |
| `--no-cache` | Bypass prompt cache |
| `--explain` | Print pipeline steps to stderr |

## Project config

Initialize a project config at `.rimping/config.json`:

```bash
rimping init
```

Example config:

```json
{
  "version": 1,
  "provider": "openai",
  "maxTokens": 8000,
  "defaultSkills": [],
  "diff": false,
  "agents": {
    "cursor": { "enabled": true },
    "claude": { "enabled": true }
  }
}
```

| Field | Description |
|-------|-------------|
| `version` | Config schema version (currently `1`) |
| `provider` | Default provider adapter: `openai`, `claude`, `gemini`, `mock` |
| `maxTokens` | Default token budget cap |
| `defaultSkills` | Skill IDs to apply by default |
| `diff` | Include git diff context by default |
| `agents` | Detected AI agents enabled for this project |

Run `rimping doctor` to detect installed agents:

| Agent | Detection |
|-------|-----------|
| Cursor | `.cursor/`, `~/.cursor/` |
| Claude Code | `.claude/`, `CLAUDE.md`, `claude` CLI |
| OpenAI Codex | `~/.codex/`, `codex` CLI |
| ChatGPT | Not locally detectable |
| Gemini CLI | `.gemini/`, `gemini` CLI |
| Antigravity | `~/.antigravity/`, `~/.antigravity-ide/` |
| Windsurf | `.windsurf/`, `~/.codeium/windsurf/` |
| GitHub Copilot | `.github/copilot-instructions.md`, `gh copilot` |
| Continue | `.continue/`, `~/.continue/` |
| Cline | `.cline/` |
| Aider | `.aider.conf.yml`, `aider` CLI |

## Skills

Rimping has two skill systems:

| System | Path | Purpose |
|--------|------|---------|
| Prompt skills | `skills/`, `~/.rimping/skills/` | Compress prompts via the optimization pipeline |
| Agent skills | `.agents/skills/` | Guide AI coding assistant behavior |

### Agent skills

Initialize the bundled `rimping-guidelines` skill in your project:

```bash
rimping skills init
```

Creates `.agents/skills/rimping-guidelines/SKILL.md` — engineering discipline synthesized from proven agent skill patterns (think first, align before coding, minimal solutions, surgical changes, verify with tests, shared domain language).

### Prompt skills

Prompt skills are Markdown files with YAML frontmatter stored in:

1. `./skills/` (project root)
2. `~/.rimping/skills/` (user overrides)

### Bundled skills

| Skill | Focus |
|-------|-------|
| `software-engineer` | General dev prompt compression |
| `typescript-refactor` | TypeScript/type-preserving compression |
| `backend-architecture` | API/service context trimming |
| `git-diff-analyzer` | Diff-focused context reduction |

### Authoring a skill

```markdown
---
id: my-skill
name: My Skill
tags: [tag1, tag2]
priority: 15
triggers: [keyword1, keyword2]
---

## Goal
What this skill optimizes for.

## Rules
- Rule one
- Rule two

## Transformation
How to transform matching prompts.

## Output Style
Terse, imperative, etc.
```

Skills are auto-detected from prompt keywords when `--skills` is not specified.

## Cursor Hook

The project includes a `beforeSubmitPrompt` hook that optimizes prompts before they are sent to the agent.

Config: [`.cursor/hooks.json`](.cursor/hooks.json)

Hook script: [`.cursor/hooks/pre-send.ts`](.cursor/hooks/pre-send.ts)

The hook fails open — if optimization fails, the original prompt is sent unchanged.

## Programmatic API

```typescript
import { optimize } from '@rimping/core'
import { preSend } from '@rimping/core/hooks'

const result = await optimize({
  prompt: 'please help me fix this bug',
  diff: true,
  maxTokens: 4000,
})

const optimized = await preSend('my prompt')
```

## Cache

Optimized prompts are cached in `~/.rimping/cache/` with a 24-hour TTL. Use `--no-cache` to bypass.

## Development

| Command | Description |
|---------|-------------|
| `bun run build` | Build all packages |
| `bun run dev` | Run dev watchers |
| `bun run typecheck` | Type-check all packages |
| `bun run rimping` | Run CLI in dev mode |

## License

MIT
