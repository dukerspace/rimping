import { describe, expect, it } from 'bun:test'
import { applyBudget } from '../src/budget-planner.js'
import { estimateTokens } from '../src/tokenizer.js'

describe('applyBudget', () => {
  it('passes through when maxTokens is omitted', () => {
    const text = 'please could you help me refactor this code'
    const result = applyBudget(text)
    expect(result.text).toBe(text)
    expect(result.explain).toHaveLength(0)
    expect(result.strategiesApplied).toHaveLength(0)
    expect(result.budgetGuard).toBeUndefined()
  })

  it('keeps text when within budget', () => {
    const text = 'short prompt'
    const maxTokens = estimateTokens(text) + 10
    const result = applyBudget(text, maxTokens)
    expect(result.text).toBe(text)
    expect(result.explain).toHaveLength(0)
    expect(result.budgetGuard).toEqual({
      limit: maxTokens,
      final: estimateTokens(text),
      truncated: false,
    })
  })

  it('truncates when slightly over budget', () => {
    const text = 'please could you help me refactor this typescript service with dependency injection'
    const maxTokens = Math.max(5, estimateTokens(text) - 3)
    const result = applyBudget(text, maxTokens)
    expect(estimateTokens(result.text)).toBeLessThanOrEqual(maxTokens)
    expect(result.budgetGuard?.truncated).toBe(true)
    expect(result.budgetGuard?.final).toBeLessThanOrEqual(maxTokens)
  })

  it('enforces budget with truncate-tail when far over budget', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i}: verbose content here`).join('\n')
    const maxTokens = 10
    const result = applyBudget(lines, maxTokens)
    expect(estimateTokens(result.text)).toBeLessThanOrEqual(maxTokens + 5)
    expect(result.strategiesApplied).toContain('truncate-tail')
    expect(result.budgetGuard?.truncated).toBe(true)
    expect(result.budgetGuard?.limit).toBe(maxTokens)
  })
})
