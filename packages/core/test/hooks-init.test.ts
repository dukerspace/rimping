import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { checkCursorHooks, initCursorHooks } from '../src/hooks-init.js'

describe('initCursorHooks', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('creates hooks.json', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-hooks-'))
    const result = await initCursorHooks({
      cwd: tempDir,
      hooksJsonTemplate: '{"version":1,"hooks":{}}',
    })

    expect(result.created).toEqual(['.cursor/hooks.json'])

    const hooksJson = await readFile(join(tempDir, '.cursor/hooks.json'), 'utf-8')
    expect(hooksJson).toContain('version')
  })

  it('skips existing hooks.json without force', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-hooks-'))
    await initCursorHooks({
      cwd: tempDir,
      hooksJsonTemplate: 'v1',
    })
    const result = await initCursorHooks({
      cwd: tempDir,
      hooksJsonTemplate: 'v2',
    })
    expect(result.skipped).toContain('.cursor/hooks.json')
    const content = await readFile(join(tempDir, '.cursor/hooks.json'), 'utf-8')
    expect(content).toBe('v1')
  })
})

describe('checkCursorHooks', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('detects rimping cli hook command', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-hooks-check-'))
    await mkdir(join(tempDir, '.cursor'), { recursive: true })
    await writeFile(
      join(tempDir, '.cursor/hooks.json'),
      JSON.stringify({
        version: 1,
        hooks: {
          beforeSubmitPrompt: [{ command: 'rimping hooks pre-send', timeout: 5 }],
        },
      }),
    )

    const status = await checkCursorHooks(tempDir)
    expect(status.hooksJson).toBe(true)
    expect(status.beforeSubmitRegistered).toBe(true)
    expect(status.preSend).toBe(true)
  })
})
