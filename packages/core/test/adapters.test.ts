import { describe, expect, it } from 'bun:test'
import { getAdapter } from '../src/adapters/index.js'
import type { OptimizeResult } from '../src/types.js'

const sampleResult = (optimized: string): OptimizeResult => ({
  optimized,
  stats: {
    originalTokens: 10,
    optimizedTokens: 5,
    savingsPercent: 50,
    strategiesApplied: [],
    skillsUsed: [],
    durationMs: 1,
    cacheHit: false,
  },
  explain: [],
})

describe('adapters', () => {
  it('formats openai prompt as chat messages JSON', () => {
    const formatted = getAdapter('openai').formatPrompt(sampleResult('hello'))
    expect(formatted).toContain('"role": "user"')
    expect(formatted).toContain('hello')
  })

  it('formats claude prompt with xml tags', () => {
    const formatted = getAdapter('claude').formatPrompt(sampleResult('hello'))
    expect(formatted).toContain('<user>')
    expect(formatted).toContain('hello')
  })

  it('formats gemini prompt as contents JSON', () => {
    const formatted = getAdapter('gemini').formatPrompt(sampleResult('hello'))
    expect(formatted).toContain('"contents"')
    expect(formatted).toContain('hello')
  })

  it('mock adapter returns optimized text unchanged', () => {
    const adapter = getAdapter('mock')
    expect(adapter.formatPrompt(sampleResult('hello'))).toBe('hello')
  })

  it('falls back to mock for unknown provider', () => {
    const adapter = getAdapter('unknown' as 'mock')
    expect(adapter.name).toBe('mock')
  })

  it('send returns provider-specific mock prefix', async () => {
    expect(await getAdapter('openai').send('prompt')).toContain('[mock-openai]')
    expect(await getAdapter('mock').send('prompt')).toBe('prompt')
  })
})
