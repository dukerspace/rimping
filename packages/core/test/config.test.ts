import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  defaultConfig,
  getConfigPath,
  getGlobalConfigPath,
  GLOBAL_CONFIG_DIR,
  loadConfig,
  loadProjectConfig,
  mergeConfigs,
  readConfigFile,
} from '../src/config.js'

describe('config', () => {
  let tempDir: string
  let globalBackup: string | null = null

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
    const globalPath = getGlobalConfigPath()
    if (globalBackup !== null) {
      await writeFile(globalPath, globalBackup)
      globalBackup = null
    } else {
      await rm(globalPath, { force: true })
    }
  })

  it('getConfigPath points to .rimping/config.json', () => {
    expect(getConfigPath('/project')).toBe(join('/project', '.rimping', 'config.json'))
  })

  it('loadConfig returns null when no config files exist', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-load-'))
    const globalPath = getGlobalConfigPath()
    globalBackup = await Bun.file(globalPath).text().catch(() => null)
    await rm(globalPath, { force: true })

    expect(await loadConfig(tempDir)).toBeNull()
  })

  it('loadConfig reads and validates config file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-load-'))
    const configDir = join(tempDir, '.rimping')
    await mkdir(configDir, { recursive: true })
    await writeFile(
      join(configDir, 'config.json'),
      JSON.stringify({ version: 1, provider: 'gemini', maxTokens: 2000 }),
    )

    const loaded = await loadConfig(tempDir)
    expect(loaded?.provider).toBe('gemini')
    expect(loaded?.maxTokens).toBe(2000)
  })

  it('defaultConfig enables read.compressOutput', () => {
    expect(defaultConfig().read?.compressOutput).toBe(true)
  })

  it('mergeConfigs lets project override top-level and nested fields', () => {
    const global = {
      version: 1 as const,
      maxTokens: 8000,
      hooks: { logStats: false, injectDiff: false },
      read: { compressOutput: false, maxLines: 200 },
      agents: {
        cursor: { enabled: true, hooks: { logStats: false } },
      },
    }
    const project = {
      version: 1 as const,
      maxTokens: 4000,
      hooks: { logStats: true },
      read: { compressOutput: true },
      agents: {
        cursor: { hooks: { injectDiff: true } },
      },
    }

    const merged = mergeConfigs(global, project)
    expect(merged.maxTokens).toBe(4000)
    expect(merged.hooks?.logStats).toBe(true)
    expect(merged.hooks?.injectDiff).toBe(false)
    expect(merged.read?.compressOutput).toBe(true)
    expect(merged.agents?.cursor?.enabled).toBe(true)
    expect(merged.agents?.cursor?.hooks?.logStats).toBe(false)
    expect(merged.agents?.cursor?.hooks?.injectDiff).toBe(true)
  })

  it('loadConfig merges global and project configs', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-merge-'))
    const globalPath = getGlobalConfigPath()
    globalBackup = await Bun.file(globalPath).text().catch(() => null)

    await mkdir(GLOBAL_CONFIG_DIR, { recursive: true })
    await writeFile(
      globalPath,
      JSON.stringify({
        version: 1,
        maxTokens: 9000,
        hooks: { logStats: false },
      }),
    )

    const projectDir = join(tempDir, '.rimping')
    await mkdir(projectDir, { recursive: true })
    await writeFile(
      join(projectDir, 'config.json'),
      JSON.stringify({
        version: 1,
        maxTokens: 5000,
        read: { compressOutput: true },
      }),
    )

    const loaded = await loadConfig(tempDir)
    expect(loaded?.maxTokens).toBe(5000)
    expect(loaded?.hooks?.logStats).toBe(false)
    expect(loaded?.read?.compressOutput).toBe(true)
  })

  it('loadConfig returns global when project config is missing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-global-only-'))
    const globalPath = getGlobalConfigPath()
    globalBackup = await Bun.file(globalPath).text().catch(() => null)

    await mkdir(GLOBAL_CONFIG_DIR, { recursive: true })
    await writeFile(
      globalPath,
      JSON.stringify({ version: 1, maxTokens: 6000 }),
    )

    const loaded = await loadConfig(tempDir)
    expect(loaded?.maxTokens).toBe(6000)
  })

  it('loadProjectConfig does not merge global config', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-project-only-'))
    const globalPath = getGlobalConfigPath()
    globalBackup = await Bun.file(globalPath).text().catch(() => null)

    await mkdir(GLOBAL_CONFIG_DIR, { recursive: true })
    await writeFile(
      globalPath,
      JSON.stringify({ version: 1, maxTokens: 9000 }),
    )

    const projectDir = join(tempDir, '.rimping')
    await mkdir(projectDir, { recursive: true })
    await writeFile(
      join(projectDir, 'config.json'),
      JSON.stringify({ version: 1, maxTokens: 1000 }),
    )

    const project = await loadProjectConfig(tempDir)
    expect(project?.maxTokens).toBe(1000)
    expect(await readConfigFile(globalPath)).toMatchObject({ maxTokens: 9000 })
  })
})
