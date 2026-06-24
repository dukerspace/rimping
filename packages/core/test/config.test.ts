import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { getConfigPath, loadConfig } from '../src/config.js'

describe('config', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('getConfigPath points to .rimping/config.json', () => {
    expect(getConfigPath('/project')).toBe(join('/project', '.rimping', 'config.json'))
  })

  it('loadConfig returns null when file is missing', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-load-'))
    expect(await loadConfig(tempDir)).toBeNull()
  })

  it('loadConfig reads and validates config file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-config-load-'))
    const configDir = join(tempDir, '.rimping')
    const { mkdir } = await import('node:fs/promises')
    await mkdir(configDir, { recursive: true })
    await writeFile(
      join(configDir, 'config.json'),
      JSON.stringify({ version: 1, provider: 'gemini', maxTokens: 2000 }),
    )

    const loaded = await loadConfig(tempDir)
    expect(loaded?.provider).toBe('gemini')
    expect(loaded?.maxTokens).toBe(2000)
  })
})
