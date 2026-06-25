import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { defaultConfig, loadProjectConfig, validateConfig } from '../src/config.js'
import {
  buildAgentHooksConfig,
  buildAgentsConfig,
  buildInitConfig,
  compactAgentConfig,
  initConfig,
  mergeAgentsConfig,
  mergeAgentsConfigAdditive,
  mergeInitConfig,
  mergeInitConfigAdditive,
} from '../src/config-init.js'
import { KNOWN_AGENT_IDS } from '../src/agent-detect.js'
import { mergeHooksConfig } from '../src/resolve-options.js'

describe('defaultConfig', () => {
  it('returns v1 defaults with hooks', () => {
    const config = defaultConfig()
    expect(config.version).toBe(1)
    expect(config.provider).toBeUndefined()
    expect(config.maxTokens).toBe(8000)
    expect(config.hooks?.enabled).toBe(true)
    expect(config.agents).toBeUndefined()
  })
})

describe('validateConfig', () => {
  it('accepts valid config', () => {
    const config = validateConfig({ version: 1, provider: 'claude' })
    expect(config.provider).toBe('claude')
  })

  it('rejects invalid version', () => {
    expect(() => validateConfig({ version: 2 })).toThrow('Unsupported config version')
  })

  it('rejects invalid provider', () => {
    expect(() => validateConfig({ version: 1, provider: 'invalid' })).toThrow('Invalid provider')
  })
})

describe('buildAgentHooksConfig', () => {
  it('inherits top-level logStats false', () => {
    const hooks = buildAgentHooksConfig(true, { logStats: false })
    expect(hooks.logStats).toBe(false)
  })
})

describe('compactAgentConfig', () => {
  it('drops hooks that match top-level defaults', () => {
    const compact = compactAgentConfig(
      {
        enabled: true,
        hooks: {
          enabled: true,
          optimizeOnSubmit: true,
          injectDiff: false,
          minPromptLength: 80,
          minSavingsPercent: 5,
          logStats: false,
        },
      },
      defaultConfig().hooks,
    )
    expect(compact).toEqual({ enabled: true })
  })

  it('keeps only differing hook overrides', () => {
    const compact = compactAgentConfig(
      { enabled: true, hooks: { minPromptLength: 120 } },
      defaultConfig().hooks,
    )
    expect(compact).toEqual({ enabled: true, hooks: { minPromptLength: 120 } })
  })
})

describe('buildAgentsConfig', () => {
  it('lists all known agents with detected ones enabled', () => {
    const agents = buildAgentsConfig(['cursor', 'claude'])
    expect(Object.keys(agents)).toHaveLength(KNOWN_AGENT_IDS.length)
    expect(agents.cursor?.enabled).toBe(true)
    expect(agents.cursor?.hooks).toBeUndefined()
    expect(agents.claude?.enabled).toBe(true)
    expect(agents.chatgpt?.enabled).toBe(false)
    expect(agents.codex?.enabled).toBe(false)
  })

  it('disables all agents when none detected', () => {
    const agents = buildAgentsConfig()
    for (const id of KNOWN_AGENT_IDS) {
      expect(agents[id]?.enabled).toBe(false)
      expect(agents[id]?.hooks).toBeUndefined()
    }
  })

  it('merges missing providers into existing agents', () => {
    const merged = mergeAgentsConfig(
      { cursor: { enabled: true } },
      ['cursor', 'claude'],
    )
    expect(merged.cursor?.hooks).toBeUndefined()
    expect(merged.claude?.enabled).toBe(true)
    expect(merged.chatgpt?.enabled).toBe(false)
    expect(Object.keys(merged)).toHaveLength(KNOWN_AGENT_IDS.length)
  })

  it('preserves custom per-agent hook settings when merging', () => {
    const merged = mergeAgentsConfig(
      { cursor: { enabled: true, hooks: { minPromptLength: 120 } } },
      ['cursor'],
    )
    expect(merged.cursor?.hooks?.minPromptLength).toBe(120)
    expect(merged.cursor?.hooks?.optimizeOnSubmit).toBeUndefined()
  })

  it('adds only detected missing providers without updating existing ones', () => {
    const merged = mergeAgentsConfigAdditive(
      {
        cursor: {
          enabled: true,
          hooks: { enabled: true, minPromptLength: 120, optimizeOnSubmit: false },
        },
      },
      ['claude'],
    )
    expect(merged.cursor?.enabled).toBe(true)
    expect(merged.cursor?.hooks?.minPromptLength).toBe(120)
    expect(merged.cursor?.hooks?.optimizeOnSubmit).toBe(false)
    expect(merged.claude?.enabled).toBe(true)
    expect(merged.chatgpt).toBeUndefined()
    expect(Object.keys(merged)).toHaveLength(2)
  })

  it('keeps existing agent without adding redundant hooks block', () => {
    const merged = mergeAgentsConfigAdditive({ cursor: { enabled: false } }, ['cursor'])
    expect(merged.cursor?.enabled).toBe(false)
    expect(merged.cursor?.hooks).toBeUndefined()
  })
})

describe('buildInitConfig', () => {
  it('includes hooks and all agent providers with compact per-agent config', () => {
    const config = buildInitConfig(['cursor'])
    expect(config.hooks?.enabled).toBe(true)
    expect(config.agents?.cursor?.enabled).toBe(true)
    expect(config.agents?.cursor?.hooks).toBeUndefined()
    expect(mergeHooksConfig(config, 'cursor').optimizeOnSubmit).toBe(true)
    expect(config.agents?.chatgpt?.enabled).toBe(false)
    expect(mergeHooksConfig(config, 'chatgpt').enabled).toBe(false)
    expect(Object.keys(config.agents ?? {})).toHaveLength(KNOWN_AGENT_IDS.length)
  })

  it('detectedOnly includes only detected agents for global init', () => {
    const config = buildInitConfig(['cursor', 'claude'], undefined, { detectedOnly: true })
    expect(Object.keys(config.agents ?? {})).toEqual(['cursor', 'claude'])
    expect(config.agents?.chatgpt).toBeUndefined()
  })
})

describe('mergeInitConfigAdditive', () => {
  it('fills only missing top-level sections and agents', () => {
    const merged = mergeInitConfigAdditive(
      {
        version: 1,
        hooks: { enabled: false },
        agents: { cursor: { enabled: true, hooks: { enabled: true, minPromptLength: 42 } } },
      },
      ['claude'],
    )
    expect(merged.hooks?.enabled).toBe(false)
    expect(merged.shell?.enabled).toBe(true)
    expect(merged.agents?.cursor?.hooks?.minPromptLength).toBe(42)
    expect(merged.agents?.claude?.enabled).toBe(true)
    expect(merged.agents?.chatgpt).toBeUndefined()
  })
})

describe('mergeInitConfig', () => {
  it('fills missing top-level hooks and agents from defaults', () => {
    const merged = mergeInitConfig({ version: 1, agents: { cursor: { enabled: true } } }, ['cursor'])
    expect(merged.hooks?.enabled).toBe(true)
    expect(merged.shell?.enabled).toBe(true)
    expect(merged.read?.enabled).toBe(true)
    expect(mergeHooksConfig(merged, 'claude').enabled).toBe(false)
  })
})

describe('initConfig', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('creates config.json on first run', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-'))
    const result = await initConfig({ cwd: tempDir, detectedAgents: ['cursor'] })

    expect(result.created).toHaveLength(1)
    expect(result.skipped).toHaveLength(0)
    expect(result.path).toEndWith('.rimping/config.json')

    const loaded = await loadProjectConfig(tempDir)
    expect(loaded?.version).toBe(1)
    expect(loaded?.agents?.cursor?.enabled).toBe(true)
    expect(loaded?.agents?.cursor?.hooks).toBeUndefined()
    expect(mergeHooksConfig(loaded, 'cursor').enabled).toBe(true)
    expect(loaded?.hooks?.enabled).toBe(true)
    expect(loaded?.agents?.chatgpt?.enabled).toBe(false)
    expect(Object.keys(loaded?.agents ?? {})).toHaveLength(KNOWN_AGENT_IDS.length)
  })

  it('updates agents on re-run without force', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-'))
    await initConfig({ cwd: tempDir, detectedAgents: ['cursor'] })
    const result = await initConfig({ cwd: tempDir, detectedAgents: ['claude'] })

    expect(result.created).toHaveLength(0)
    expect(result.updated).toHaveLength(1)
    expect(result.skipped).toHaveLength(0)

    const loaded = await loadProjectConfig(tempDir)
    expect(loaded?.agents?.cursor?.enabled).toBe(false)
    expect(loaded?.agents?.claude?.enabled).toBe(true)
    expect(mergeHooksConfig(loaded, 'claude').enabled).toBe(true)
    expect(mergeHooksConfig(loaded, 'cursor').enabled).toBe(false)
  })

  it('skips when config is already up to date', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-'))
    await initConfig({ cwd: tempDir, detectedAgents: ['cursor'] })
    const result = await initConfig({ cwd: tempDir, detectedAgents: ['cursor'] })

    expect(result.created).toHaveLength(0)
    expect(result.updated).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)
  })

  it('overwrites with force', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-'))
    await initConfig({ cwd: tempDir })
    const result = await initConfig({
      cwd: tempDir,
      force: true,
      templateConfig: { version: 1, provider: 'gemini' },
    })

    expect(result.created).toHaveLength(1)
    const loaded = await loadProjectConfig(tempDir)
    expect(loaded?.provider).toBe('gemini')
  })

  it('dry-run does not write files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-'))
    const result = await initConfig({ cwd: tempDir, dryRun: true })

    expect(result.created).toHaveLength(1)
    const loaded = await loadProjectConfig(tempDir)
    expect(loaded).toBeNull()
  })

  it('creates global config at ~/.rimping/config.json', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-global-'))
    const { getGlobalConfigPath } = await import('../src/config.js')
    const globalPath = getGlobalConfigPath()
    const backup = await Bun.file(globalPath).text().catch(() => null)

    try {
      const result = await initConfig({
        global: true,
        cwd: tempDir,
        force: true,
        detectedAgents: ['cursor', 'claude'],
      })

      expect(result.path).toBe(globalPath)
      expect(result.created).toContain(globalPath)

      const content = JSON.parse(await Bun.file(globalPath).text())
      expect(content.agents?.cursor?.enabled).toBe(true)
      expect(content.agents?.cursor?.hooks).toBeUndefined()
      expect(content.agents?.claude?.enabled).toBe(true)
      expect(content.agents?.chatgpt).toBeUndefined()
      expect(Object.keys(content.agents)).toHaveLength(2)
    } finally {
      if (backup !== null) {
        await Bun.write(globalPath, backup)
      } else {
        const { rm } = await import('node:fs/promises')
        await rm(globalPath, { force: true })
      }
    }
  })

  it('adds missing global agents without updating existing ones on re-run', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-global-update-'))
    const { getGlobalConfigPath } = await import('../src/config.js')
    const globalPath = getGlobalConfigPath()
    const backup = await Bun.file(globalPath).text().catch(() => null)

    try {
      await initConfig({
        global: true,
        cwd: tempDir,
        force: true,
        templateConfig: {
          version: 1,
          agents: {
            cursor: {
              enabled: true,
              hooks: { enabled: true, minPromptLength: 120, optimizeOnSubmit: true },
            },
          },
        },
      })

      const result = await initConfig({
        global: true,
        cwd: tempDir,
        detectedAgents: ['claude', 'gemini'],
      })

      expect(result.updated).toHaveLength(1)
      const content = JSON.parse(await Bun.file(globalPath).text())
      expect(content.agents?.cursor?.enabled).toBe(true)
      expect(content.agents?.cursor?.hooks?.minPromptLength).toBe(120)
      expect(content.agents?.claude?.enabled).toBe(true)
      expect(content.agents?.gemini?.enabled).toBe(true)
      expect(content.agents?.chatgpt).toBeUndefined()
      expect(Object.keys(content.agents)).toHaveLength(3)
    } finally {
      if (backup !== null) {
        await Bun.write(globalPath, backup)
      } else {
        const { rm } = await import('node:fs/promises')
        await rm(globalPath, { force: true })
      }
    }
  })

  it('skips global config when detected agents already present', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-global-skip-'))
    const { getGlobalConfigPath } = await import('../src/config.js')
    const globalPath = getGlobalConfigPath()
    const backup = await Bun.file(globalPath).text().catch(() => null)

    try {
      await initConfig({ global: true, cwd: tempDir, force: true, detectedAgents: ['cursor', 'claude'] })
      const result = await initConfig({
        global: true,
        cwd: tempDir,
        detectedAgents: ['cursor', 'claude'],
      })

      expect(result.updated).toHaveLength(0)
      expect(result.skipped).toHaveLength(1)
    } finally {
      if (backup !== null) {
        await Bun.write(globalPath, backup)
      } else {
        const { rm } = await import('node:fs/promises')
        await rm(globalPath, { force: true })
      }
    }
  })
})
