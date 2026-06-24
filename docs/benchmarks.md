# Benchmarks

Rimping ships a **full-matrix benchmark harness** to compare against popular agent-guideline and token-optimization projects.

## Competitors

| Project | Type | Benchmark tier |
|---------|------|----------------|
| [karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | Behavioral guidelines | Tier 2, 3 |
| [ponytail](https://github.com/DietrichGebert/ponytail) | Lazy ladder + guidelines | Tier 2, 3 |
| [mattpocock/skills](https://github.com/mattpocock/skills) | Workflow skills (TDD, grill) | Tier 2, 3 |
| [rtk](https://github.com/rtk-ai/rtk) | Shell output proxy | Tier 1b |
| **rimping** | Prompt optimizer + guidelines + hooks | All tiers |

## Run locally

```bash
bun run benchmark          # Tier 1 + 1b + 3 + report (no API key)
bun run benchmark:tier1    # Prompt compression only
bun run benchmark:tier1b   # Shell output compression only
bun run benchmark:tier2    # Agentic code quality (manual Cursor sessions)
bun run benchmark:tier3    # Behavioral rubric
bun run benchmark:report   # Regenerate report from results/
bun run benchmark:test     # Run benchmark harness tests
```

Results land in `benchmarks/results/<date>/report.md`.

## Tier overview

### Tier 1 — Offline prompt compression

Measures `rimping optimize` on a 25-prompt corpus (verbose, code-heavy, diff-review, errors, etc.).

Arms: `baseline`, `rimping-optimizer`, `rimping-full` (with guidelines prefix).

### Tier 1b — Shell output compression

Compares raw command output to **rimping** `compressShellOutput()` and optional **RTK** baseline (reference only — rimping does not call RTK).

### Tier 2 — Agentic code quality

12 tasks on [tiangolo/full-stack-fastapi-template](https://github.com/tiangolo/full-stack-fastapi-template) (same fixture set as ponytail's agentic tier).

Metrics: LOC added (`git diff`), duration, safety checks.

Requires Cursor sessions. See [benchmarks/README.md](https://github.com/dukerspace/rimping/blob/main/benchmarks/README.md) for the full workflow.

### Tier 3 — Behavioral rubric

Five micro-tasks scored 0–2: alignment, surgical edits, minimal solutions, test verification, safety.

## Positioning

Rimping's differentiator is the **complementary stack**:

- **rimping** — compress prompts (hooks) and shell output (`rimping shell run`, `preToolUse` hook)
- **rtk** — external benchmark baseline for shell output (not a runtime dependency)
- **rimping-guidelines** — synthesizes patterns from karpathy, ponytail, and matt pocock in one skill

## Limitations

- Tier 2 does not run headless agents automatically; you run tasks in Cursor and drop diff artifacts.
- Model is not locked — record the Cursor model per session in `meta.json`.
- Competitor versions are pinned in `benchmarks/arms/*/LOCK` but can be synced with `benchmarks/arms/sync-upstream.ts`.

Full methodology: [benchmarks/README.md](https://github.com/dukerspace/rimping/blob/main/benchmarks/README.md).
