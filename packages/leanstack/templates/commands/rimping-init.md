---
name: rimping-init
description: Create .agents Leanstack instructions without overwriting existing files.
---

Initialize the Rimping engineering workflow for this repository. Do not run a leanstack CLI. Do not modify application source code.

## Inspect first

Detect before changing anything:

- language / framework / package manager
- monorepo layout
- existing `AGENTS.md`, Cursor rules, agent skills
- existing `.agents`, Claude/Codex configuration

## Then install

1. Source: `packages/leanstack/templates/` (`AGENTS.md`, `budgets.yaml`, `core/`, `principles/`, `skills/`, `agents/`, `adapters/`).
2. Destination: `.agents/` in the project root. Create missing directories.
3. Preserve existing user configuration. Copy only files that do not already exist.
4. Never overwrite existing `.agents` files unless the user explicitly asked to force.
5. Do not create or overwrite root `AGENTS.md` or `CLAUDE.md`.
6. Do not duplicate instructions that already exist elsewhere.
7. Adapt Rimping to the repository; create the minimal configuration only.

## Report

At the end report:

- detected stack
- files created
- files updated
- files preserved / skipped
- potential instruction conflicts

Offer `/rimping-doctor` if the user wants a check.
