import { describe, expect, it } from 'bun:test'
import { optimizeText, strategies, truncateTail } from '../src/optimizer.js'
import { estimateTokens } from '../src/tokenizer.js'

function applyStrategy(name: string, text: string): string {
  const strategy = strategies.find((s) => s.name === name)
  if (!strategy) throw new Error(`Unknown strategy: ${name}`)
  return strategy.apply(text)
}

describe('optimizeText strategies', () => {
  it('normalize-whitespace trims trailing spaces and collapses blank lines', () => {
    const input = '  hello   \n\n\nworld  '
    const output = applyStrategy('normalize-whitespace', input)
    expect(output).toBe('hello\n\nworld')
    expect(estimateTokens(output)).toBeLessThanOrEqual(estimateTokens(input))
  })

  it('remove-filler strips polite phrases', () => {
    const input = 'please could you help me fix this bug'
    const result = optimizeText(input)
    expect(result.text.toLowerCase()).not.toContain('please')
    expect(result.strategiesApplied).toContain('remove-filler')
    expect(estimateTokens(result.text)).toBeLessThan(estimateTokens(input))
  })

  it('dedupes consecutive lines', () => {
    const input = 'line one\nline one\nline two'
    const result = optimizeText(input)
    expect(result.text).toBe('line one\nline two')
    expect(estimateTokens(result.text)).toBeLessThan(estimateTokens(input))
  })

  it('compress-code-comments strips comments inside fenced blocks only', () => {
    const input = [
      'Review this:',
      '```ts',
      '// setup',
      'const x = 1',
      '/* block */',
      '```',
      '// prose comment stays',
    ].join('\n')
    const output = applyStrategy('compress-code-comments', input)
    expect(output).not.toContain('// setup')
    expect(output).not.toContain('/* block */')
    expect(output).toContain('// prose comment stays')
    expect(estimateTokens(output)).toBeLessThan(estimateTokens(input))
  })

  it('collapse-lists shortens bullets with long common prefix', () => {
    const input = [
      '- implement user authentication flow',
      '- implement user profile management',
    ].join('\n')
    const output = applyStrategy('collapse-lists', input)
    expect(output).toContain('profile management')
    expect(output.split('\n')[1].length).toBeLessThan(input.split('\n')[1].length)
    expect(estimateTokens(output)).toBeLessThanOrEqual(estimateTokens(input))
  })
})

describe('truncateTail', () => {
  it('pops lines and adds suffix for plain text', () => {
    const input = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')
    const maxTokens = 5
    const result = truncateTail(input, maxTokens)
    expect(result).toContain('...[truncated]')
    expect(estimateTokens(result)).toBeLessThanOrEqual(maxTokens + 5)
  })

  it('keeps early markdown sections before truncating', () => {
    const input = [
      '## Intro',
      'short intro text',
      '## Details',
      Array.from({ length: 30 }, (_, i) => `detail line ${i}`).join('\n'),
    ].join('\n')
    const maxTokens = 15
    const result = truncateTail(input, maxTokens)
    expect(result).toContain('## Intro')
    expect(result).not.toContain('detail line 29')
  })

  it('fits within maxTokens budget', () => {
    const input = Array.from({ length: 50 }, (_, i) => `word line ${i}`).join('\n')
    const maxTokens = 20
    const result = truncateTail(input, maxTokens)
    expect(estimateTokens(result)).toBeLessThanOrEqual(maxTokens + 5)
  })
})

describe('optimizeText with maxTokens', () => {
  it('applies truncate-tail when over budget', () => {
    const input = Array.from({ length: 40 }, (_, i) => `please explain line ${i}`).join('\n')
    const maxTokens = 15
    const result = optimizeText(input, maxTokens)
    expect(result.strategiesApplied).toContain('truncate-tail')
    expect(estimateTokens(result.text)).toBeLessThanOrEqual(maxTokens + 5)
  })

  it('records non-increasing token counts in explain steps', () => {
    const input = 'please   could you\n\n\nhelp me fix this bug kindly'
    const result = optimizeText(input)
    for (const step of result.explain) {
      expect(step.tokensAfter).toBeLessThanOrEqual(step.tokensBefore)
    }
  })
})
