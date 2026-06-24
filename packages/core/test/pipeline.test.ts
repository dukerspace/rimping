import { afterEach, describe, expect, it } from 'bun:test'
import { optimize } from '../src/pipeline.js'
import { clearSkillCache } from '../src/skill-engine.js'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..', '..', '..')

describe('pipeline', () => {
  afterEach(() => {
    clearSkillCache()
  })

  it('optimizes a verbose prompt end-to-end', async () => {
    const prompt = 'please could you help me refactor this typescript code'
    const result = await optimize({
      prompt,
      cwd: root,
      useCache: false,
      autoDetectSkills: false,
    })

    expect(result.optimized.length).toBeLessThan(prompt.length)
    expect(result.stats.optimizedTokens).toBeLessThanOrEqual(result.stats.originalTokens)
    expect(result.stats.originalTokens).toBeGreaterThan(result.stats.optimizedTokens)
  })

  it('enforces maxTokens and sets budgetGuard when truncated', async () => {
    const prompt = Array.from(
      { length: 30 },
      (_, i) => `please could you help me refactor module ${i} with dependency injection`,
    ).join('\n')
    const maxTokens = 20

    const result = await optimize({
      prompt,
      cwd: root,
      useCache: false,
      autoDetectSkills: false,
      maxTokens,
    })

    expect(result.stats.optimizedTokens).toBeLessThanOrEqual(maxTokens + 5)
    expect(result.stats.budgetGuard?.truncated).toBe(true)
    expect(result.stats.budgetGuard?.limit).toBe(maxTokens)
  })

  it('does not truncate when maxTokens is omitted', async () => {
    const result = await optimize({
      prompt: 'please could you help me fix this bug',
      cwd: root,
      useCache: false,
      autoDetectSkills: false,
    })

    expect(result.stats.budgetGuard).toBeUndefined()
  })

  it('includes optimizer explain steps when over budget', async () => {
    const prompt = Array.from({ length: 25 }, (_, i) => `please kindly explain step ${i}`).join('\n')
    const maxTokens = 15

    const result = await optimize({
      prompt,
      cwd: root,
      useCache: false,
      autoDetectSkills: false,
      maxTokens,
    })

    const stages = result.explain.map((step) => step.stage)
    expect(stages.some((s) => s === 'optimizer' || s === 'budget-planner')).toBe(true)
  })
})
