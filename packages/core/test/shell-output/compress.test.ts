import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { compressShellOutput } from '../../src/shell-output/index.js'
import { estimateTokens, tokenSavingsPercent } from '../../src/tokenizer.js'

const FIXTURES = join(import.meta.dirname, '..', '..', '..', '..', 'benchmarks', 'corpus', 'shell-output')

describe('compressShellOutput', () => {
  it('compresses git status with meaningful savings', async () => {
    const raw = await readFile(join(FIXTURES, 'git-status.raw.txt'), 'utf-8')
    const result = compressShellOutput('git status', raw)
    expect(result.strategiesApplied).toContain('git-status')
    expect(result.compressedTokens).toBeLessThan(result.originalTokens)
    expect(result.savingsPercent).toBeGreaterThanOrEqual(40)
    expect(result.text).not.toContain('use "git add"')
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
})

describe('tokenSavingsPercent', () => {
  it('matches estimateTokens delta', () => {
    const before = estimateTokens('hello world test')
    const after = estimateTokens('hello')
    expect(tokenSavingsPercent(before, after)).toBeGreaterThan(0)
  })
})
