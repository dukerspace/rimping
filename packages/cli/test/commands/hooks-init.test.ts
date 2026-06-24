import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runHooksInit } from '../../src/commands/hooks-init.js'
import { loadConfig } from '@rimping/core'

describe('runHooksInit', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('creates config and cursor hooks on first run', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-hooks-project-init-'))
    const result = await runHooksInit({ cwd: tempDir, detectedAgents: ['cursor'] })

    expect(result.config.created.some((p) => p.endsWith('.rimping/config.json'))).toBe(true)
    expect(result.hooks.created).toContain('.cursor/hooks.json')
    expect(result.hooks.created).toContain('.claude/settings.local.json')
    expect(result.hooks.created).toContain('.github/hooks/lek-optimize.json')
    expect(result.config.config.provider).toBeUndefined()
    expect(result.config.config.agents?.cursor?.enabled).toBe(true)

    const loaded = await loadConfig(tempDir)
    expect(loaded?.read?.autoLimit).toBe(true)
    expect(result.agents.length).toBeGreaterThanOrEqual(10)
  })

  it('updates config agents on re-run', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-hooks-project-update-'))
    await runHooksInit({ cwd: tempDir, detectedAgents: ['cursor'] })
    const result = await runHooksInit({ cwd: tempDir, detectedAgents: ['claude'] })

    expect(result.config.updated.some((p) => p.endsWith('.rimping/config.json'))).toBe(true)
    expect(result.config.config.agents?.claude?.enabled).toBe(true)
    expect(result.config.config.agents?.cursor?.enabled).toBe(false)
    expect(result.agents.some((a) => a.id === 'claude')).toBe(true)
  })
})
