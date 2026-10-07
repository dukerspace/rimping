import { describe, expect, it } from 'bun:test'
import { compressReadContent } from '../../src/file-read/compress.js'
import { extractReadContent, extractReadLimit, extractReadPath } from '../../src/file-read/parse.js'
import { resolvePostRead } from '../../src/file-read/post-read.js'
import { DEFAULT_READ } from '../../src/resolve-options.js'
import { expandContent } from '../../src/content-compression/index.js'

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

  it('preserves code strings, diagnostics, and compiler directives', () => {
    const raw = [
      'const url = "https://example.com/path"; // keep the URL intact',
      '// @ts-ignore -- required for this generated type',
      '// TODO: preserve this implementation note',
      'throw new Error("failure");',
    ].join('\n')
    const result = compressReadContent(raw, {}, 'src/foo.ts')
    expect(result.text).toContain('https://example.com/path')
    expect(result.text).toContain('// @ts-ignore')
    expect(result.text).toContain('// TODO:')
    expect(result.text).toContain('throw new Error("failure")')
  })

  it('does not rewrite repeated source lines into invalid counted lines', () => {
    const raw = 'const value = 1;\nconst value = 1;'
    const result = compressReadContent(raw, {}, 'src/foo.ts')
    expect(result.text).toBe(raw)
  })

  it('caps lines when maxLines is set', () => {
    const raw = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n')
    const result = compressReadContent(raw, { maxLines: 10 })
    expect(result.strategiesApplied).toContain('line-cap')
    expect(result.text).toContain('...[truncated')
  })

  it('compresses structured JSON reads while preserving every record', () => {
    const records = Array.from({ length: 35 }, (_, id) => ({
      record_identifier: id,
      response_status_code: id === 34 ? 500 : 200,
      message_detail: id === 34 ? 'database unavailable' : 'ok',
    }))
    const raw = JSON.stringify(records, null, 2)
    const result = compressReadContent(raw, {}, 'responses.json')

    expect(result.strategiesApplied).toContain('json-row-table')
    expect(JSON.parse(expandContent(result.text))).toEqual(records)
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
    const content = `// comment\n${'// This explanation is obsolete and repeats across generated source files.\nconst x = 1;\n'.repeat(40)}`
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
