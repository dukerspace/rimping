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

### 1. Initialize project config and hooks

```bash
rimping init
```

Creates `.rimping/config.json` with defaults and auto-detected AI agents, then scaffolds hook files for supported agents (Cursor, Claude Code, Codex, Gemini, Copilot, Windsurf, Antigravity). Restart your agents after setup.

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing config and hook files |
| `--dry-run` | Preview without writing files |
| `--no-detect` | Skip agent detection |
| `--no-hooks` | Create config only — skip hook scaffolding |
| `-g`, `--global` | Write `~/.rimping/config.json` and global hook paths instead of project-local |
| `--json` | Output result as JSON |
| `--cwd <path>` | Target directory (default: current) |

### 2. Check project health

```bash
rimping doctor
```

Detects installed AI coding agents and validates your Rimping setup: config, agent skills, and Cursor hook registration (pre-send, pre-shell, pre-read, post-read). Exits with code `1` when issues are found.

| Flag | Description |
|------|-------------|
| `--json` | Full doctor report as JSON |
| `--cwd <path>` | Target directory |

### 3. Initialize agent guidelines (optional)

```bash
rimping skills init
```

Creates `.agents/skills/rimping-guidelines/SKILL.md` — engineering discipline for AI assistants (think first, minimal solutions, surgical changes, verify with tests).

### 4. Re-run hook setup (optional)

If you used `--no-hooks` or need to refresh hook files without touching config:

```bash
rimping hooks init          # project-local hooks
rimping hooks init -g       # global hooks (~/.cursor, ~/.claude, etc.)
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create config and scaffold agent hooks |
| `doctor` | Check agents, config, and hook registration |
| `optimize` | Run the optimization pipeline on a prompt |
| `stats` | Cache stats, hook run history, last optimization |
| `explain` | Pipeline breakdown from the last `optimize` run |
| `skills init` | Install `rimping-guidelines` agent skill |
| `hooks init` | Scaffold agent hook files only |
| `hooks log` | View or clear `.rimping/hooks.log` |
| `shell run` | Run a command and print compressed output |
| `update` | Check for and install CLI updates |

### `optimize [prompt]`

Run a prompt through the full optimization pipeline.

```bash
# Basic usage
rimping optimize "please could you help me refactor this typescript code"

# Include git diff context
rimping optimize --diff "review my changes"

# Use specific skills
rimping optimize --skills my-skill "refactor types"

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
| `--provider <name>` | Output format: `openai`, `claude`, `gemini`, `copilot`, `mock` |
| `--stdin` | Read prompt from stdin |
| `--json` | Output full JSON result |
| `--no-cache` | Bypass prompt cache |
| `--explain` | Print pipeline steps to stderr |
| `--cwd <path>` | Project root for config and skills (default: auto-detect) |

### `stats`

Show cache statistics, per-day cache and hook summaries, and details from the last optimization run.

```bash
rimping stats
```

Reports: cache directory, total entries, token savings, daily breakdowns, and last run (skills, strategies, budget guard).

### `explain`

Show the pipeline breakdown from the last `optimize` run (stages, token counts, strategies applied).

```bash
rimping explain
```

### `skills init`

Initialize the `rimping-guidelines` agent skill template in `.agents/skills/`.

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing `SKILL.md` |
| `--dry-run` | Preview without writing |
| `--json` | Output as JSON |
| `--cwd <path>` | Target directory |

### `hooks init`

Scaffold agent hook files for detected tools. Each template wires four hook entry points:

| Hook command | When it runs |
|--------------|--------------|
| `rimping hooks pre-send` | Before prompt submit — runs the optimize pipeline |
| `rimping hooks pre-shell` | Before shell/bash tool use — rewrites to `rimping shell run` |
| `rimping hooks pre-read` | Before read tool use — injects line limits |
| `rimping hooks post-read` | After read tool use — compresses file content |

Supported agents and hook file paths:

| Agent | Project path | Global path (`-g`) |
|-------|--------------|-------------------|
| Cursor | `.cursor/hooks.json` | `~/.cursor/hooks.json` |
| Claude Code | `.claude/settings.local.json` | `~/.claude/settings.json` |
| OpenAI Codex | `.codex/hooks.json` | `~/.codex/hooks.json` |
| Gemini CLI | `.gemini/settings.json` | `~/.gemini/settings.json` |
| GitHub Copilot | `.github/hooks/lek-optimize.json` | — |
| Windsurf | `.windsurf/hooks.json` | — |
| Antigravity | `.agents/hooks.json` | — |

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing hook files |
| `--dry-run` | Preview without writing |
| `-g`, `--global` | Write global hook paths instead of project-local |
| `--json` | Output as JSON |
| `--cwd <path>` | Target directory |

### `hooks log`

View detailed hook run logs. Requires `hooks.logStats: true` in config.

```bash
rimping hooks log
rimping hooks log --last 20
rimping hooks log --json
rimping hooks log --clear
```

| Flag | Description |
|------|-------------|
| `--last <n>` | Number of recent entries (default: `10`) |
| `--json` | Print raw JSON log entries (one per line) |
| `--clear` | Clear `.rimping/hooks.log` |

### `shell run <command>`

Run a shell command and print compressed output (for agent context).

```bash
rimping shell run "git status"
rimping shell run "cargo test" --explain
cat output.txt | rimping shell run "cargo test" --stdin
```

| Flag | Description |
|------|-------------|
| `--json` | Full JSON result |
| `--explain` | Print compression stats on stderr |
| `--max-tokens <n>` | Token budget for compressed output |
| `--stdin` | Compress stdin instead of running command |
| `--cwd <path>` | Working directory |

### `update`

Check for and install the latest rimping CLI from GitHub or npm.

```bash
rimping update --check    # compare versions only
rimping update            # install latest
rimping update --dry-run  # show install command without running
```

| Flag | Description |
|------|-------------|
| `-c`, `--check` | Only check whether a newer version is available |
| `--dry-run` | Show the update command without running it |
| `--json` | Output result as JSON |

## Project Configuration

Config file: `.rimping/config.json` (project) or `~/.rimping/config.json` (global, via `rimping init -g`). At runtime, project config is merged over global (`loadConfig`).

```json
{
  "version": 1,
  "maxTokens": 8000,
  "defaultSkills": [],
  "diff": false,
  "hooks": {
    "enabled": true,
    "optimizeOnSubmit": true,
    "injectDiff": false,
    "minPromptLength": 80,
    "minSavingsPercent": 5,
    "logStats": false
  },
  "shell": {
    "enabled": true,
    "minSavingsPercent": 10,
    "maxTokens": 4000
  },
  "read": {
    "enabled": true,
    "autoLimit": true,
    "compressOutput": false,
    "maxLines": 200,
    "minSavingsPercent": 10,
    "maxTokens": 4000
  },
  "agents": {
    "cursor": { "enabled": true },
    "claude": { "enabled": true },
    "chatgpt": { "enabled": false }
  }
}
```

| Field | Description |
|-------|-------------|
| `version` | Config schema version (currently `1`) |
| `provider` | Default provider adapter: `openai`, `claude`, `gemini`, `copilot`, `mock` |
| `maxTokens` | Default token budget cap |
| `defaultSkills` | Skill IDs applied by default on every optimize |
| `diff` | Include git diff context by default |
| `hooks` | Default hook behavior for all agents (see below) |
| `shell` | Shell output compression settings |
| `read` | File read compression settings |
| `agents` | Per-agent enable flags and optional hook overrides |

### Agents config

Top-level `hooks` applies to every agent. Each `agents.<id>` entry only needs an `enabled` flag in most cases — you do not repeat hook fields per agent unless you want an override.

| Field | Description |
|-------|-------------|
| `enabled` | Turn this agent's hooks on or off. When `false`, hook optimization is disabled for that agent even if top-level `hooks.enabled` is `true`. |
| `hooks` | Optional. Only include fields that differ from top-level `hooks` for this agent. |

Known agent IDs: `cursor`, `claude`, `codex`, `chatgpt`, `gemini`, `antigravity`, `windsurf`, `copilot`, `continue`, `cline`, `aider`.

`rimping init` writes a compact config: detected agents are `enabled: true`, others `enabled: false`. Project init lists all known agents; global init (`-g`) lists only detected agents. Re-running `init` strips redundant per-agent hook fields that match the top-level defaults.

Override example — stricter prompt threshold for Cursor only:

```json
{
  "hooks": { "minPromptLength": 80 },
  "agents": {
    "cursor": { "enabled": true, "hooks": { "minPromptLength": 120 } },
    "claude": { "enabled": true }
  }
}
```

At runtime, `mergeHooksConfig(config, agentId)` merges top-level `hooks`, then `agents.<id>.hooks`, then applies `agents.<id>.enabled`.

### Hooks config

These fields live under top-level `hooks` and serve as defaults for every agent unless overridden in `agents.<id>.hooks`.

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Master switch for hook optimization |
| `optimizeOnSubmit` | `true` | Run optimization on prompt submit |
| `injectDiff` | `false` | Include git diff when optimizing via hook |
| `minPromptLength` | `80` | Skip optimization for shorter prompts |
| `minSavingsPercent` | `5` | Skip if savings below this threshold |
| `logStats` | `false` | Append optimization stats to `.rimping/hooks.log` |

All hooks **fail open** — if optimization or compression fails, the original input is passed through unchanged.

### Shell config

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Rewrite shell/bash tool calls via `pre-shell` hook |
| `minSavingsPercent` | `10` | Skip compression if savings below threshold |
| `maxTokens` | `4000` | Token budget for compressed shell output |

### Read config

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Enable read tool interception via `pre-read` / `post-read` hooks |
| `autoLimit` | `true` | Inject line limits before the agent reads large files |
| `compressOutput` | `false` | Compress file content after read (strip comments, trim lines) |
| `maxLines` | `200` | Default line cap for `autoLimit` |
| `minSavingsPercent` | `10` | Skip post-read compression if savings below threshold |
| `maxTokens` | `4000` | Token budget for compressed read output |

## Prompt Skills

Prompt skills are user-authored Markdown files with YAML frontmatter. Rimping does not ship built-in prompt skills — create your own per project or in your user directory.

Rimping loads prompt skills from:

1. `./skills/` (project root)
2. `~/.rimping/skills/` (user overrides — same `id` wins over project)

**Selection order:** explicit `--skills` or `defaultSkills` in config → auto-detection from `triggers` → no skills. If nothing matches, the pipeline continues without skill transforms.

### Authoring a skill

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
| Claude Code | `.claude/`, `.agents/`, `CLAUDE.md`, `claude` CLI |
| OpenAI Codex | `.codex/hooks.json`, `~/.codex/`, `codex` CLI |
| ChatGPT | Not locally detectable |
| Gemini CLI | `.gemini/`, `~/.gemini/`, `gemini` CLI |
| Antigravity | `.agents/hooks.json`, `~/.antigravity/`, `~/.antigravity-ide/` |
| Windsurf | `.windsurf/`, `~/.codeium/windsurf/` |
| GitHub Copilot | `.copilot/`, `.github/copilot-instructions.md`, `gh copilot` |
| Continue | `.continue/`, `~/.continue/` |
| Cline | `.cline/` |
| Aider | `.aider.conf.yml`, `~/.aider/`, `aider` CLI |

## Storage & Logs

| Path | Purpose |
|------|---------|
| `.rimping/config.json` | Project config |
| `~/.rimping/config.json` | Global config (`rimping init -g`) |
| `~/.rimping/cache/` | Optimized prompt cache (24-hour TTL) |
| `~/.rimping/last-run.json` | Last `optimize` result for `stats` / `explain` |
| `.rimping/hooks.log` | Per-project hook run log (`hooks.logStats: true`) |

## Cache

Optimized prompts are cached in `~/.rimping/cache/` with a 24-hour TTL. Use `--no-cache` to bypass.

View cache and hook stats with `rimping stats`. View per-run hook details with `rimping hooks log`.

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
| Hook not optimizing | Check `hooks.enabled` and `minPromptLength`; run `rimping doctor` |
| No hook log entries | Set `hooks.logStats: true` in config, then submit a prompt |
| Shell output not compressed | Check `shell.enabled`; verify `pre-shell` hook is registered (`rimping doctor`) |
| Read output not compressed | Check `read.enabled` and `read.compressOutput`; verify `post-read` hook is registered |
| Git diff not injected | Ensure you are in a git repo; use `--diff` or set `diff: true` |
| Skill not applied | Create a skill in `skills/` or `~/.rimping/skills/`, check triggers match your prompt, or pass `--skills <id>` |
