import { describe, expect, it } from 'bun:test'
import { runPostReadHook } from '../../src/commands/hooks-post-read.js'
import { runPreReadHook } from '../../src/commands/hooks-pre-read.js'
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

async function withStdin<T>(input: unknown, fn: () => Promise<T>): Promise<T> {
  const original = Bun.stdin.text
  Bun.stdin.text = async () => JSON.stringify(input)
  try {
    return await fn()
  } finally {
    Bun.stdin.text = original
  }
}

async function captureStdout(fn: () => Promise<void>): Promise<string> {
  const chunks: string[] = []
  const original = console.log
  console.log = (value: string) => {
    chunks.push(value)
  }
  try {
    await fn()
    return chunks.join('\n')
  } finally {
    console.log = original
  }
}

describe('hooks pre-read', () => {
  it('returns updated_input for large file reads', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-pre-read-'))
    try {
      await mkdir(join(tempDir, '.rimping'), { recursive: true })
      await writeFile(
        join(tempDir, '.rimping', 'config.json'),
        JSON.stringify({ version: 1, read: { enabled: true, autoLimit: true, maxLines: 50 } }),
      )
      await writeFile(
        join(tempDir, 'big.ts'),
        Array.from({ length: 100 }, (_, i) => `const v${i} = ${i}`).join('\n'),
      )

      const output = await withStdin(
        {
          tool_name: 'Read',
          tool_input: { path: 'big.ts' },
          cwd: tempDir,
        },
        async () => captureStdout(runPreReadHook),
      )

      const parsed = JSON.parse(output) as { updated_input?: { limit?: number } }
      expect(parsed.updated_input?.limit).toBe(50)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })
})

describe('hooks post-read', () => {
  it('returns empty object when compressOutput is disabled', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-post-read-'))
    try {
      await mkdir(join(tempDir, '.rimping'), { recursive: true })
      await writeFile(
        join(tempDir, '.rimping', 'config.json'),
        JSON.stringify({ version: 1, read: { enabled: true, compressOutput: false } }),
      )

      const output = await withStdin(
        {
          tool_name: 'Read',
          tool_input: { path: 'src/foo.ts' },
          tool_output: JSON.stringify({ content: '// x\nconst a = 1;' }),
          cwd: tempDir,
        },
        async () => captureStdout(runPostReadHook),
      )
      expect(output).toBe('{}')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })
})
