import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildContext } from '../src/context-builder.js'
import { estimateTokens } from '../src/tokenizer.js'

describe('buildContext', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('returns prompt unchanged when no extras requested', async () => {
    const result = await buildContext({ prompt: 'fix the auth bug' })
    expect(result.text).toBe('fix the auth bug')
    expect(result.explain).toHaveLength(0)
  })

  it('injects file context for existing files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-context-'))
    await writeFile(join(tempDir, 'auth.ts'), 'export const token = 1\n')

    const result = await buildContext({
      prompt: 'review auth',
      files: ['auth.ts'],
      cwd: tempDir,
    })

    expect(result.text).toContain('## Files')
    expect(result.text).toContain('auth.ts')
    expect(result.text).toContain('export const token = 1')
    expect(result.explain.some((s) => s.strategy === 'file-injection')).toBe(true)
    expect(estimateTokens(result.text)).toBeGreaterThan(estimateTokens('review auth'))
  })

  it('compresses repetitive JSON attached as file context', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-context-'))
    const records = Array.from({ length: 25 }, (_, id) => ({
      request_identifier: `request-${id}`,
      status_code: 200,
      message_detail: 'operation completed',
    }))
    await writeFile(join(tempDir, 'results.json'), JSON.stringify(records, null, 2))

    const result = await buildContext({ prompt: 'review these results', files: ['results.json'], cwd: tempDir })
    expect(result.text).toContain('__rimping_row_table_v1__')
    expect(result.text).toContain('request-24')
    expect(result.text).not.toContain('results.json (truncated)')
  })

  it('skips missing files without error', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-context-'))
    const result = await buildContext({
      prompt: 'review',
      files: ['missing.ts'],
      cwd: tempDir,
    })
    expect(result.text).toBe('review')
    expect(result.explain).toHaveLength(0)
  })

  it('truncates very large files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-context-'))
    const lines = Array.from({ length: 250 }, (_, i) => `line ${i}`).join('\n')
    await mkdir(join(tempDir, 'src'), { recursive: true })
    await writeFile(join(tempDir, 'src', 'big.ts'), lines)

    const result = await buildContext({
      prompt: 'review',
      files: ['src/big.ts'],
      cwd: tempDir,
    })

    expect(result.text).toContain('(truncated)')
    expect(result.text).not.toContain('line 249')
  })
})
