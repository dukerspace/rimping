# Developer Guide

This guide is for contributors and integrators who want to extend, embed, or maintain Rimping.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Git

### Clone and build

```bash
git clone <repo-url> rimping
cd rimping
bun install
bun run build
```

### Dev commands

| Command | Description |
|---------|-------------|
| `bun run build` | Build all packages via Turbo |
| `bun run dev` | Run dev watchers |
| `bun run typecheck` | Type-check all packages |
| `bun run rimping` | Run CLI in dev mode |
| `bun test` | Run tests (from package directory) |
| `bun run docs:dev` | Start VitePress docs dev server |
| `bun run docs:build` | Build documentation site |

### Package structure

```
packages/
├── cli/
│   ├── src/
│   │   ├── index.ts              CLI entry (citty)
│   │   └── commands/             one file per command
│   └── templates/
│       ├── agent-hooks/          per-agent hook templates for `init` / `hooks init`
│       └── config/               default config template
└── core/
    └── src/
        ├── index.ts              public API exports
        ├── pipeline.ts           main optimize() orchestrator
        ├── skill-engine.ts       skill loading & composition
        ├── context-builder.ts    diff / file / memory injection
        ├── optimizer.ts          text transformation strategies
        ├── budget-planner.ts     token cap enforcement
        ├── cache.ts              prompt result caching
        ├── config.ts             config schema & validation
        ├── agent-detect.ts       AI agent probing
        ├── agent-hook-specs.ts   per-agent hook paths and merge strategies
        ├── hooks/
        │   ├── pre-send.ts       prompt hook entry point
        │   ├── agent.ts          per-agent hook config resolution
        │   └── log.ts            hook run logging
        ├── file-read/            read tool interception and compression
        ├── shell-output/         shell command rewrite and output compression
        ├── self-update.ts        CLI version check and install
        ├── adapters/             provider formatters
        ├── git-diff/             diff fetch, parse, compress
        └── memory/               memory store (mock default)
```

## Public API

Import from `@rimping/core`:

```typescript
import {
  optimize,
  preSend,
  loadSkills,
  selectSkills,
  composeSkills,
  buildContext,
  optimizeText,
  applyBudget,
  loadConfig,
  initConfig,
  runDoctor,
  detectAgents,
  initAgentSkills,
  initAgentHooks,
  compressShellOutput,
  compressReadContent,
  resolvePreRead,
  resolvePostRead,
  getCacheStats,
  getCacheStatsByDate,
  readHookLogs,
  appendHookLog,
  checkForUpdate,
  runSelfUpdate,
  estimateTokens,
} from '@rimping/core'
```

### `optimize(options)`

Main pipeline entry. Returns `OptimizeResult` with `optimized` text, `stats`, and `explain` steps.

```typescript
const result = await optimize({
  prompt: 'please help me fix this bug in auth.ts',
  diff: true,
  maxTokens: 4000,
  provider: 'openai',
  skills: ['my-skill'],
  cwd: process.cwd(),
  useCache: true,
})
```

### `preSend(prompt, options?)`

Hook-friendly wrapper. Respects `.rimping/config.json` hooks settings. Fails open on error.

```typescript
import { preSend } from '@rimping/core/hooks'

const { text, optimized, stats, skipped } = await preSend(userPrompt, {
  cwd: '/path/to/project',
})
```

Skip reasons: `disabled`, `too-short`, `low-savings`, `error`.

### Shell and read hooks

```typescript
import { compressShellOutput, resolvePreRead, resolvePostRead } from '@rimping/core'

const shell = compressShellOutput('git status', rawOutput, { maxTokens: 4000 })
const preRead = resolvePreRead({ path: 'src/foo.ts', limit: undefined }, config)
const postRead = resolvePostRead({ path: 'src/foo.ts', content: fileText }, config)
```

## Adding a Prompt Skill

1. Create `skills/my-skill.md` in the project root (or `~/.rimping/skills/` for global):

```markdown
---
id: my-skill
name: My Skill
tags: [custom]
priority: 20
triggers: [deploy, kubernetes, k8s]
---

## Goal
Compress infrastructure prompts.

## Rules
- Keep resource names verbatim
- Use imperative mood

## Transformation
Strip deployment pleasantries; state the target state directly.

## Output Style
Terse, imperative.
```

2. Test:

```bash
rimping optimize --skills my-skill "please could you help me deploy to kubernetes"
rimping optimize --explain "deploy my app to k8s cluster prod"
```

### Skill parsing internals

- Frontmatter parsed by `packages/core/src/utils/markdown.ts`
- Sections extracted: `Goal`, `Rules`, `Transformation`, `Output Style`
- `autoDetectSkills()` counts trigger keyword matches; threshold defaults to 2
- `selectSkills()` resolution order: explicit `--skills` / `defaultSkills` → auto-detected triggers → none

## Adding an Optimizer Strategy

Edit `packages/core/src/optimizer.ts`:

```typescript
export const strategies: Strategy[] = [
  // ... existing strategies
  {
    name: 'my-strategy',
    apply(text) {
      return text.replace(/some-pattern/g, 'replacement')
    },
  },
]
```

Strategies are applied in order. Each is skipped if it does not reduce token count. Add a test in `test/optimizer.test.ts`.

## Adding a Provider Adapter

1. Implement `LLMProvider` in `packages/core/src/adapters/`:

```typescript
import type { LLMProvider, OptimizeResult } from '../types.js'

export class MyAdapter implements LLMProvider {
  formatPrompt(result: OptimizeResult): string {
    return result.optimized // or wrap in provider-specific structure
  }
}
```

2. Register in `adapters/index.ts` `getAdapter()` switch
3. Add provider name to `ProviderName` type in `types.ts`
4. Add validation in `config.ts` `VALID_PROVIDERS`

## Adding a CLI Command

1. Create `packages/cli/src/commands/my-command.ts`:

```typescript
import { defineCommand } from 'citty'

export const myCommand = defineCommand({
  meta: { description: 'My new command' },
  args: {
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    // call @rimping/core functions
  },
})
```

2. Register in `packages/cli/src/index.ts` `subCommands`
3. Export any new core logic from `packages/core/src/index.ts` if needed

## Hook Integration

`rimping init` scaffolds per-agent hook templates that call the CLI hook commands. For custom integrations, call core APIs directly:

```typescript
#!/usr/bin/env bun
import { preSend } from '@rimping/core/hooks'

const input = await Bun.stdin.text()
const { text, optimized, stats } = await preSend(input)

if (optimized && stats) {
  console.error(`Saved ${stats.savingsPercent}% tokens`)
}

console.log(text)
```

Read stdin, write optimized output to stdout. Hooks must fail open — return the original input on any error.

Enable `hooks.logStats` to record runs in `.rimping/hooks.log` for debugging via `rimping hooks log`.

## Testing

Tests use Bun's built-in test runner. Place tests under `packages/core/test/`, mirroring the `src/` layout.

```bash
# Run all core tests
cd packages/core && bun test

# Run a single file
bun test test/pipeline.test.ts
```

### Testing guidelines

- Test behavior through public interfaces, not internals
- Use vertical slices: write test → make it pass → next test
- Mock filesystem/git only when necessary; prefer integration-style tests for pipeline

### Example test pattern

```typescript
import { describe, expect, test } from 'bun:test'
import { optimizeText } from './optimizer.js'

describe('optimizeText', () => {
  test('removes filler words', () => {
    const result = optimizeText('please could you fix this bug')
    expect(result.text).not.toContain('please')
    expect(result.strategiesApplied).toContain('remove-filler')
  })
})
```

## Code Conventions

Follow the project's `rimping-guidelines` skill (`.agents/skills/rimping-guidelines/SKILL.md`):

1. **Think first** — state assumptions, ask when unclear
2. **Minimal solution** — reuse existing code, no unnecessary abstractions
3. **Surgical changes** — touch only what the task requires
4. **Verify** — add tests for non-trivial logic
5. **Shared language** — use consistent domain terms (`skill`, `pipeline`, `hunk`, etc.)

### TypeScript

- ESM modules with `.js` extensions in imports
- Strict TypeScript — run `bun run typecheck` before committing
- Export types alongside functions from `index.ts`

### Prisma (if applicable)

Not used in Rimping core. See workspace Prisma rules if adding database features.

## Release Checklist

1. `bun run typecheck` — no errors
2. `bun test` — all tests pass
3. `bun run build` — clean build
4. Update version in `packages/core/src/types.ts` (`CLI_VERSION`) if releasing
5. Update docs if CLI surface or config schema changed

## Debugging

```bash
# Verbose pipeline breakdown
rimping optimize --explain "your prompt here"

# Inspect last run
rimping explain

# Bypass cache during iteration
rimping optimize --no-cache "prompt"

# Inspect hook logs
rimping hooks log --last 5

# Check for CLI updates
rimping update --check
```

## Common Integration Patterns

### CI prompt linting

```bash
#!/bin/bash
SAVINGS=$(rimping optimize --json "$PROMPT" | jq '.stats.savingsPercent')
if (( $(echo "$SAVINGS < 10" | bc -l) )); then
  echo "Prompt could be $SAVINGS% shorter — consider optimizing"
fi
```

### Custom memory store

Implement `MemoryStore` from `types.ts` and pass to `buildContext` (requires extending the context builder to accept a custom store — currently uses `defaultMemoryStore`).

### Monorepo per-project skills

Place skills in each app's `skills/` directory. Run `rimping optimize --cwd apps/api "prompt"` to use project-local skills.
