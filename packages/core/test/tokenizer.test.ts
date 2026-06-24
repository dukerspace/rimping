import { describe, expect, it } from 'bun:test'
import { estimateTokens, tokenSavingsPercent } from '../src/tokenizer.js'

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('estimates prose tokens as ceil(chars / 3.5)', () => {
    const text = 'a'.repeat(35)
    expect(estimateTokens(text)).toBe(10)
  })

  it('applies code boost for fenced code blocks', () => {
    const prose = 'x'.repeat(35)
    const withCode = '```\n' + 'x'.repeat(35) + '\n```'
    expect(estimateTokens(withCode)).toBeGreaterThan(estimateTokens(prose))
  })

  it('combines prose and code token estimates', () => {
    const mixed = 'hello world\n```\nconst x = 1\n```'
    const proseOnly = estimateTokens('hello world')
    const codeOnly = estimateTokens('```\nconst x = 1\n```')
    expect(estimateTokens(mixed)).toBe(proseOnly + codeOnly)
  })
})

describe('tokenSavingsPercent', () => {
  it('returns 0 when before is 0', () => {
    expect(tokenSavingsPercent(0, 0)).toBe(0)
    expect(tokenSavingsPercent(0, 10)).toBe(0)
  })

  it('returns 50 for half reduction', () => {
    expect(tokenSavingsPercent(100, 50)).toBe(50)
  })

  it('returns 0 when no savings', () => {
    expect(tokenSavingsPercent(100, 100)).toBe(0)
  })
})
