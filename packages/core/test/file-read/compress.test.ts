import { describe, expect, it } from 'bun:test'
import { compressReadContent } from '../../src/file-read/compress.js'
import { extractReadContent, extractReadLimit, extractReadPath } from '../../src/file-read/parse.js'
import { resolvePostRead } from '../../src/file-read/post-read.js'
import { DEFAULT_READ } from '../../src/resolve-options.js'

describe('extractReadPath', () => {
  it('reads path from common tool_input keys', () => {
    expect(extractReadPath({ path: 'src/foo.ts' })).toBe('src/foo.ts')
    expect(extractReadPath({ target_file: 'src/bar.ts' })).toBe('src/bar.ts')
  })
})

describe('extractReadContent', () => {
  it('parses JSON tool_output with content field', () => {
    const output = JSON.stringify({ content: 'hello\nworld' })
    expect(extractReadContent(output)).toBe('hello\nworld')
  })

  it('returns raw string when JSON parse fails', () => {
    expect(extractReadContent('plain text')).toBe('plain text')
  })
})

describe('compressReadContent', () => {
  it('strips comments and blank lines from code', () => {
    const raw = `// header\nconst x = 1;\n\n\n/* block */\nconst y = 2;`
    const result = compressReadContent(raw, {}, 'src/foo.ts')
    expect(result.text).not.toContain('// header')
    expect(result.text).not.toContain('/* block */')
    expect(result.compressedTokens).toBeLessThan(result.originalTokens)
    expect(result.savingsPercent).toBeGreaterThan(0)
  })

  it('caps lines when maxLines is set', () => {
    const raw = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n')
    const result = compressReadContent(raw, { maxLines: 10 })
    expect(result.strategiesApplied).toContain('line-cap')
    expect(result.text).toContain('...[truncated')
  })
})

describe('resolvePostRead', () => {
  it('skips when compressOutput is disabled', () => {
    const result = resolvePostRead(
      {
        tool_name: 'Read',
        tool_input: { path: 'src/foo.ts' },
        tool_output: JSON.stringify({ content: '// comment\nconst x = 1;' }),
      },
      { ...DEFAULT_READ, compressOutput: false },
    )
    expect(result.optimized).toBe(false)
    expect(result.skipped).toBe('disabled')
  })

  it('returns compressed additional_context when enabled', () => {
    const content = `// comment\n${'const x = 1;\n'.repeat(40)}`
    const result = resolvePostRead(
      {
        tool_name: 'Read',
        tool_input: { path: 'src/foo.ts' },
        tool_output: JSON.stringify({ content }),
      },
      { ...DEFAULT_READ, compressOutput: true, minSavingsPercent: 5 },
    )
    expect(result.optimized).toBe(true)
    expect(result.additional_context).toContain('[rimping] Compressed read: src/foo.ts')
    expect(result.savingsPercent).toBeGreaterThan(0)
  })
})

describe('extractReadLimit', () => {
  it('returns positive numeric limits', () => {
    expect(extractReadLimit({ limit: 100 })).toBe(100)
    expect(extractReadLimit({})).toBeNull()
  })
})
