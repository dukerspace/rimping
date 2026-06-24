import { describe, expect, it } from 'bun:test'
import { preSend } from '../../src/hooks/pre-send.js'
import type { RimpingConfig } from '../../src/config.js'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..', '..', '..', '..')

const disabledConfig: RimpingConfig = {
  version: 1,
  hooks: { enabled: false },
}

const strictConfig: RimpingConfig = {
  version: 1,
  hooks: { enabled: true, optimizeOnSubmit: true, minPromptLength: 10, minSavingsPercent: 0 },
}

describe('preSend', () => {
  it('passes through when hooks disabled', async () => {
    const prompt = 'please could you help me with a very long refactoring task here'
    const result = await preSend(prompt, { config: disabledConfig, useCache: false })
    expect(result.text).toBe(prompt)
    expect(result.optimized).toBe(false)
    expect(result.skipped).toBe('disabled')
  })

  it('skips short prompts', async () => {
    const result = await preSend('short', {
      config: { version: 1, hooks: { enabled: true, minPromptLength: 80 } },
    })
    expect(result.skipped).toBe('too-short')
  })

  it('optimizes verbose prompts', async () => {
    const prompt =
      'please could you kindly help me refactor this typescript service to use dependency injection'
    const result = await preSend(prompt, { config: strictConfig, useCache: false, cwd: root })
    expect(result.optimized).toBe(true)
    expect(result.text.length).toBeLessThan(prompt.length)
    expect(result.stats).toBeDefined()
  })
})
