# User Guide

This guide covers everything you need to install, configure, and use Rimping day to day.

## Prerequisites

- [Bun](https://bun.sh) >= 1.0

## Installation

### From source (this repo)

```bash
git clone <repo-url> rimping
cd rimping
bun install
bun run build
```

After build, use the CLI via:

```bash
bunx rimping <command>
# or during development:
bun run rimping -- <command>
```

## Getting Started

### 1. Initialize project config

```bash
rimping init
```

Creates `.rimping/config.json` with defaults and auto-detected AI agents.

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing config |
| `--dry-run` | Preview without writing files |
| `--no-detect` | Skip agent detection |
| `--json` | Output result as JSON |
| `--cwd <path>` | Target directory (default: current) |

### 2. Check project health

```bash
rimping doctor
```

Detects installed AI coding agents and validates your Rimping setup. Exits with code `1` when issues are found (missing config, invalid config, missing agent skill).

| Flag | Description |
|------|-------------|
| `--json` | Full doctor report as JSON |
| `--cwd <path>` | Target directory |

### 3. Initialize agent guidelines (optional)

```bash
rimping skills init
```

Creates `.agents/skills/rimping-guidelines/SKILL.md` — engineering discipline for AI assistants (think first, minimal solutions, surgical changes, verify with tests).

### 4. Set up Cursor hooks (optional)

```bash
rimping hooks init
```

Installs a `beforeSubmitPrompt` hook that optimizes prompts before they reach the agent. Restart Cursor after setup.

## Commands

### `optimize [prompt]`

Run a prompt through the full optimization pipeline.

```bash
# Basic usage
rimping optimize "please could you help me refactor this typescript code"

# Include git diff context
rimping optimize --diff "review my changes"

# Use specific skills
rimping optimize --skills typescript-refactor,git-diff-analyzer "refactor types"

# Set token budget
rimping optimize --max-tokens 4000 "long prompt..."

# Read from stdin
echo "my prompt" | rimping optimize --stdin

# JSON output with full stats
rimping optimize --json "optimize this"

# Show pipeline steps on stderr
rimping optimize --explain "verbose prompt with filler words"
```

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

### `stats`

Show cache statistics and a summary of the last optimization run.

```bash
rimping stats
```

### `explain`

Show the pipeline breakdown from the last `optimize` run (stages, token counts, strategies applied).

```bash
rimping explain
```

### `skills init`

Initialize the bundled `rimping-guidelines` agent skill.

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing `SKILL.md` |
| `--dry-run` | Preview without writing |
| `--json` | Output as JSON |
| `--cwd <path>` | Target directory |

### `hooks init`

Initialize Cursor `beforeSubmitPrompt` hook files.

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing hook files |
| `--dry-run` | Preview without writing |
| `--json` | Output as JSON |
| `--cwd <path>` | Target directory |

## Project Configuration

Config file: `.rimping/config.json`

```json
{
  "version": 1,
  "provider": "openai",
  "maxTokens": 8000,
  "defaultSkills": [],
  "diff": false,
  "hooks": {
    "enabled": true,
    "optimizeOnSubmit": true,
    "injectDiff": false,
    "minPromptLength": 80,
    "minSavingsPercent": 5,
    "logStats": true
  },
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
| `defaultSkills` | Skill IDs applied by default on every optimize |
| `diff` | Include git diff context by default |
| `hooks` | Cursor hook behavior (see below) |
| `agents` | Detected AI agents enabled for this project |

### Hooks config

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Master switch for hook optimization |
| `optimizeOnSubmit` | `true` | Run optimization on prompt submit |
| `injectDiff` | `false` | Include git diff when optimizing via hook |
| `minPromptLength` | `80` | Skip optimization for shorter prompts |
| `minSavingsPercent` | `5` | Skip if savings below this threshold |
| `logStats` | `true` | Log optimization stats from the hook |

The hook **fails open** — if optimization fails, the original prompt is sent unchanged.

## Prompt Skills

Prompt skills are Markdown files with YAML frontmatter. Rimping loads them from:

1. `./skills/` (project root)
2. `~/.rimping/skills/` (user overrides — same `id` wins over project)

### Bundled skills

| Skill ID | Focus |
|----------|-------|
| `software-engineer` | General development prompt compression |
| `typescript-refactor` | TypeScript / type-preserving compression |
| `backend-architecture` | API and service context trimming |
| `git-diff-analyzer` | Diff-focused context reduction |

Skills are auto-detected from prompt keywords when `--skills` is not specified.

### Authoring a custom skill

Create `skills/my-skill.md`:

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

| Frontmatter field | Description |
|-------------------|-------------|
| `id` | Unique skill identifier |
| `name` | Human-readable name |
| `tags` | Categorization tags |
| `priority` | Higher priority skills are applied first |
| `triggers` | Keywords for auto-detection |

## Agent Skills

Agent skills live in `.agents/skills/` and guide AI coding assistant behavior — they are **not** part of the token optimization pipeline.

Run `rimping skills init` to install `rimping-guidelines`, which encodes engineering discipline: think first, align before coding, minimal solutions, surgical changes, verify with tests, shared domain language.

## Supported AI Agents

`rimping doctor` detects these agents:

| Agent | Detection signals |
|-------|-------------------|
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

## Cache

Optimized prompts are cached in `~/.rimping/cache/` with a 24-hour TTL. Use `--no-cache` to bypass.

View cache stats with `rimping stats`.

## Programmatic Usage

```typescript
import { optimize } from '@rimping/core'
import { preSend } from '@rimping/core/hooks'

const result = await optimize({
  prompt: 'please help me fix this bug',
  diff: true,
  maxTokens: 4000,
})

console.log(result.optimized)
console.log(result.stats.savingsPercent)

// Hook-friendly wrapper (respects config + hooks settings)
const { text, optimized, stats } = await preSend('my prompt')
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `doctor` reports missing config | Run `rimping init` |
| No token savings | Prompt may be too short; try a longer, wordier prompt |
| Hook not optimizing | Check `hooks.enabled` and `minPromptLength` in config |
| Git diff not injected | Ensure you are in a git repo; use `--diff` or set `diff: true` |
| Skill not applied | Check triggers match your prompt, or pass `--skills <id>` explicitly |
