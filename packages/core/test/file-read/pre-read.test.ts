import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolvePreRead } from '../../src/file-read/pre-read.js'
import { DEFAULT_READ } from '../../src/resolve-options.js'

describe('resolvePreRead', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('caps Read limit for large files without limit', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-pre-read-'))
    const filePath = join(tempDir, 'large.ts')
    const lines = Array.from({ length: 300 }, (_, i) => `export const v${i} = ${i};`)
    await writeFile(filePath, lines.join('\n'))

    const result = await resolvePreRead(
      {
        tool_name: 'Read',
        tool_input: { path: filePath },
        cwd: tempDir,
      },
      { ...DEFAULT_READ, maxLines: 200 },
    )

    expect(result.updated_input?.limit).toBe(200)
    expect(result.detail).toContain('Capped Read limit')
  })

  it('passes through when file is within maxLines', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-pre-read-small-'))
    const filePath = join(tempDir, 'small.ts')
    await writeFile(filePath, 'export const x = 1;\n')

    const result = await resolvePreRead(
      {
        tool_name: 'Read',
        tool_input: { path: filePath },
        cwd: tempDir,
      },
      DEFAULT_READ,
    )

    expect(result.updated_input).toBeUndefined()
  })

  it('passes through when limit already within maxLines', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-pre-read-limited-'))
    const filePath = join(tempDir, 'large.ts')
    const lines = Array.from({ length: 300 }, (_, i) => `export const v${i} = ${i};`)
    await writeFile(filePath, lines.join('\n'))

    const result = await resolvePreRead(
      {
        tool_name: 'Read',
        tool_input: { path: filePath, limit: 100 },
        cwd: tempDir,
      },
      { ...DEFAULT_READ, maxLines: 200 },
    )

    expect(result.updated_input).toBeUndefined()
  })
})
