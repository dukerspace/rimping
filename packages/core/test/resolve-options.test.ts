import { describe, expect, it } from 'bun:test'
import { DEFAULT_HOOKS, DEFAULT_READ, DEFAULT_SHELL, mergeHooksConfig, mergeReadConfig, mergeShellConfig, resolveOptimizeOptions, resolveShellOptions } from '../src/resolve-options.js'
import type { RimpingConfig } from '../src/config.js'

describe('mergeHooksConfig', () => {
  it('returns defaults when config is null', () => {
    expect(mergeHooksConfig(null)).toEqual(DEFAULT_HOOKS)
    expect(DEFAULT_HOOKS.logStats).toBe(false)
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

  it('respects top-level logStats false over per-agent true', () => {
    const merged = mergeHooksConfig(
      {
        version: 1,
        hooks: { logStats: false },
        agents: {
          cursor: { enabled: true, hooks: { logStats: true } },
        },
      },
      'cursor',
    )
    expect(merged.logStats).toBe(false)
  })

  it('allows per-agent logStats true when top-level is unset', () => {
    const merged = mergeHooksConfig(
      {
        version: 1,
        agents: {
          cursor: { enabled: true, hooks: { logStats: true } },
        },
      },
      'cursor',
    )
    expect(merged.logStats).toBe(true)
  })

  it('allows per-agent logStats false when top-level is true', () => {
    const merged = mergeHooksConfig(
      {
        version: 1,
        hooks: { logStats: true },
        agents: {
          cursor: { enabled: true, hooks: { logStats: false } },
        },
      },
      'cursor',
    )
    expect(merged.logStats).toBe(false)
  })

  it('inherits top-level logStats false without agent id', () => {
    const merged = mergeHooksConfig({
      version: 1,
      hooks: { logStats: false },
    })
    expect(merged.logStats).toBe(false)
  })
})

describe('resolveOptimizeOptions', () => {
  const config: RimpingConfig = {
    version: 1,
    provider: 'claude',
    maxTokens: 4000,
    defaultSkills: ['my-skill'],
    diff: true,
    hooks: { injectDiff: true },
  }

  it('forHook skips provider even when config sets one', () => {
    const resolved = resolveOptimizeOptions(
      '/tmp/project',
      { version: 1, provider: 'openai' },
      { prompt: 'x', forHook: true },
    )
    expect(resolved.provider).toBeUndefined()
  })

  it('uses config provider for CLI optimize', () => {
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

  it('omits provider when unset in config', () => {
    const resolved = resolveOptimizeOptions('/tmp/project', { version: 1 }, { prompt: 'x' })
    expect(resolved.provider).toBeUndefined()
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

describe('mergeShellConfig', () => {
  it('returns defaults when config is null', () => {
    expect(mergeShellConfig(null)).toEqual(DEFAULT_SHELL)
  })
})

describe('mergeReadConfig', () => {
  it('returns defaults when config is null', () => {
    expect(mergeReadConfig(null)).toEqual(DEFAULT_READ)
  })
})

describe('resolveShellOptions', () => {
  it('uses shell.maxTokens from config', () => {
    const resolved = resolveShellOptions('/tmp', {
      version: 1,
      shell: { maxTokens: 2000 },
    })
    expect(resolved.maxTokens).toBe(2000)
  })
})
