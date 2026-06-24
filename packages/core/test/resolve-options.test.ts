import { describe, expect, it } from 'bun:test'
import { DEFAULT_HOOKS, mergeHooksConfig, resolveOptimizeOptions } from '../src/resolve-options.js'
import type { RimpingConfig } from '../src/config.js'

describe('mergeHooksConfig', () => {
  it('returns defaults when config is null', () => {
    expect(mergeHooksConfig(null)).toEqual(DEFAULT_HOOKS)
  })

  it('merges partial hooks config', () => {
    const merged = mergeHooksConfig({
      version: 1,
      hooks: { minPromptLength: 120, enabled: false },
    })
    expect(merged.minPromptLength).toBe(120)
    expect(merged.enabled).toBe(false)
    expect(merged.optimizeOnSubmit).toBe(true)
  })
})

describe('resolveOptimizeOptions', () => {
  const config: RimpingConfig = {
    version: 1,
    provider: 'claude',
    maxTokens: 4000,
    defaultSkills: ['software-engineer'],
    diff: true,
    hooks: { injectDiff: true },
  }

  it('merges config defaults with overrides', () => {
    const resolved = resolveOptimizeOptions('/tmp/project', config, {
      prompt: 'fix bug',
      skills: ['custom-skill'],
      useCache: false,
    })

    expect(resolved.cwd).toBe('/tmp/project')
    expect(resolved.prompt).toBe('fix bug')
    expect(resolved.provider).toBe('claude')
    expect(resolved.maxTokens).toBe(4000)
    expect(resolved.skills).toEqual(['custom-skill'])
    expect(resolved.diff).toBe(true)
    expect(resolved.useCache).toBe(false)
    expect(resolved.autoDetectSkills).toBe(true)
  })

  it('uses injectDiff from hooks when diff override is absent', () => {
    const resolved = resolveOptimizeOptions('/tmp/project', config, { prompt: 'x' })
    expect(resolved.diff).toBe(true)
  })

  it('omits defaultSkills when config list is empty', () => {
    const resolved = resolveOptimizeOptions('/tmp/project', { version: 1, defaultSkills: [] }, {
      prompt: 'x',
    })
    expect(resolved.skills).toBeUndefined()
  })
})
