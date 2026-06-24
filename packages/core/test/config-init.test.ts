import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { defaultConfig, loadConfig, validateConfig } from '../src/config.js'
import { buildAgentsConfig, buildInitConfig, initConfig } from '../src/config-init.js'
import { KNOWN_AGENT_IDS } from '../src/agent-detect.js'

describe('defaultConfig', () => {
  it('returns v1 defaults with hooks', () => {
    const config = defaultConfig()
    expect(config.version).toBe(1)
    expect(config.provider).toBe('openai')
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

describe('buildAgentsConfig', () => {
  it('lists all known agents with detected ones enabled', () => {
    const agents = buildAgentsConfig(['cursor', 'claude'])
    expect(Object.keys(agents)).toHaveLength(KNOWN_AGENT_IDS.length)
    expect(agents.cursor?.enabled).toBe(true)
    expect(agents.claude?.enabled).toBe(true)
    expect(agents.chatgpt?.enabled).toBe(false)
    expect(agents.codex?.enabled).toBe(false)
  })

  it('disables all agents when none detected', () => {
    const agents = buildAgentsConfig()
    for (const id of KNOWN_AGENT_IDS) {
      expect(agents[id]?.enabled).toBe(false)
    }
  })
})

describe('buildInitConfig', () => {
  it('includes hooks and all agent providers', () => {
    const config = buildInitConfig(['cursor'])
    expect(config.hooks?.enabled).toBe(true)
    expect(config.agents?.cursor?.enabled).toBe(true)
    expect(config.agents?.chatgpt?.enabled).toBe(false)
    expect(Object.keys(config.agents ?? {})).toHaveLength(KNOWN_AGENT_IDS.length)
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

    const loaded = await loadConfig(tempDir)
    expect(loaded?.version).toBe(1)
    expect(loaded?.agents?.cursor?.enabled).toBe(true)
    expect(loaded?.hooks?.enabled).toBe(true)
    expect(loaded?.agents?.chatgpt?.enabled).toBe(false)
    expect(Object.keys(loaded?.agents ?? {})).toHaveLength(KNOWN_AGENT_IDS.length)
  })

  it('skips existing file without force', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-'))
    await initConfig({ cwd: tempDir, detectedAgents: ['cursor'] })
    const result = await initConfig({ cwd: tempDir, detectedAgents: ['claude'] })

    expect(result.created).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)

    const loaded = await loadConfig(tempDir)
    expect(loaded?.agents?.cursor?.enabled).toBe(true)
    expect(loaded?.agents?.claude?.enabled).toBe(false)
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
    const loaded = await loadConfig(tempDir)
    expect(loaded?.provider).toBe('gemini')
  })

  it('dry-run does not write files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-'))
    const result = await initConfig({ cwd: tempDir, dryRun: true })

    expect(result.created).toHaveLength(1)
    const loaded = await loadConfig(tempDir)
    expect(loaded).toBeNull()
  })
})
