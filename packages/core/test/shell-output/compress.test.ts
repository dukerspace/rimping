import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { compressShellOutput } from '../../src/shell-output/index.js'
import { expandContent } from '../../src/content-compression/index.js'
import { runShellCommand } from '../../src/shell-output/run.js'
import { estimateTokens, tokenSavingsPercent } from '../../src/tokenizer.js'

const FIXTURES = join(import.meta.dirname, '..', '..', '..', '..', 'benchmarks', 'corpus', 'shell-output')

describe('compressShellOutput', () => {
  it('leaves short shell output unchanged', async () => {
    const result = await runShellCommand("printf 'critical value'", {
      config: { version: 1, shell: { enabled: true, minSavingsPercent: 10 } },
    })
    expect(result.text).toBe('critical value')
    expect(result.optimized).toBe(false)
  })

  it('compresses git status with meaningful savings', async () => {
    const raw = await readFile(join(FIXTURES, 'git-status.raw.txt'), 'utf-8')
    const result = compressShellOutput('git status', raw)
    expect(result.strategiesApplied).toContain('git-status')
    expect(result.compressedTokens).toBeLessThan(result.originalTokens)
    expect(result.savingsPercent).toBeGreaterThan(0)
    expect(result.text).not.toContain('use "git add"')
    expect(result.text).toContain('packages/core/src')
  })

  it('compresses cargo test output keeping failures', async () => {
    const raw = await readFile(join(FIXTURES, 'cargo-test-failure.raw.txt'), 'utf-8')
    const result = compressShellOutput('cargo test', raw)
    expect(result.strategiesApplied).toContain('test-output')
    expect(result.text).toContain('FAILED')
    expect(result.text).toContain('edge_case::test_empty_input')
    expect(result.compressedTokens).toBeLessThan(result.originalTokens)
    expect(result.savingsPercent).toBeGreaterThanOrEqual(50)
  })

  it('summarizes long passing test output without losing the count', () => {
    const raw = [
      'running 100 tests',
      ...Array.from({ length: 100 }, (_, i) => `test module_${i + 1}::test_case ... ok`),
      'test result: ok. 100 passed; 0 failed; finished in 1.20s',
    ].join('\n')
    const result = compressShellOutput('cargo test', raw)
    expect(result.text).toContain('100 tests passed')
    expect(result.text).toContain('100 passed')
    expect(result.compressedTokens).toBeLessThan(result.originalTokens)
  })

  it('compresses rg output grouped by file', async () => {
    const raw = await readFile(join(FIXTURES, 'rg-results.raw.txt'), 'utf-8')
    const result = compressShellOutput('rg optimize benchmarks/', raw)
    expect(result.strategiesApplied).toContain('rg-grep')
    expect(result.text).toContain('packages/core/src/optimizer.ts (')
    expect(result.compressedTokens).toBeLessThanOrEqual(result.originalTokens)
  })

  it('applies budget-trim when maxTokens is set', () => {
    const raw = Array.from({ length: 200 }, (_, i) => `line ${i} ${'x'.repeat(40)}`).join('\n')
    const result = compressShellOutput('echo hello', raw, { maxTokens: 50 })
    expect(result.strategiesApplied).toContain('budget-trim')
    expect(result.compressedTokens).toBeLessThanOrEqual(55)
  })

  it('returns zero savings for empty input', () => {
    const result = compressShellOutput('git status', '')
    expect(result.savingsPercent).toBe(0)
    expect(result.text).toBe('')
  })

  it('compresses repetitive JSON tool output without losing records', () => {
    const records = Array.from({ length: 30 }, (_, id) => ({
      request_identifier: `req-${id}`,
      response_status_code: id === 29 ? 503 : 200,
      diagnostic_message: id === 29 ? 'upstream timeout' : 'ok',
    }))
    const raw = JSON.stringify(records, null, 2)
    const result = compressShellOutput('tool output', raw)

    expect(result.strategiesApplied).toContain('json-row-table')
    expect(JSON.parse(expandContent(result.text))).toEqual(records)
  })

  it('compresses repeated log output and can expand it exactly', () => {
    const raw = Array.from({ length: 60 }, () => 'WARN retrying request to upstream after transient failure').join('\n')
    const result = compressShellOutput('tool output', raw)
    expect(result.strategiesApplied).toContain('log-run-length')
    expect(expandContent(result.text)).toBe(raw)
  })
})

describe('tokenSavingsPercent', () => {
  it('matches estimateTokens delta', () => {
    const before = estimateTokens('hello world test')
    const after = estimateTokens('hello')
    expect(tokenSavingsPercent(before, after)).toBeGreaterThan(0)
  })
})
