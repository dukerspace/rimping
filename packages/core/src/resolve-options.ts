import type { OptimizeOptions } from './types.js'
import type { HooksConfig, RimpingConfig } from './config.js'
import { resolveInitCwd } from './agent-skills-init.js'

export const DEFAULT_HOOKS: Required<HooksConfig> = {
  enabled: true,
  optimizeOnSubmit: true,
  injectDiff: false,
  minPromptLength: 80,
  minSavingsPercent: 5,
  logStats: true,
}

export function mergeHooksConfig(config: RimpingConfig | null): Required<HooksConfig> {
  return { ...DEFAULT_HOOKS, ...config?.hooks }
}

export function resolveOptimizeOptions(
  cwd: string,
  config: RimpingConfig | null,
  overrides: Partial<OptimizeOptions> = {},
): OptimizeOptions {
  const resolvedCwd = overrides.cwd ?? cwd
  const injectDiff = config?.hooks?.injectDiff ?? config?.diff ?? false

  return {
    ...overrides,
    cwd: resolvedCwd,
    prompt: overrides.prompt ?? '',
    diff: overrides.diff ?? injectDiff,
    maxTokens: overrides.maxTokens ?? config?.maxTokens,
    provider: overrides.provider ?? config?.provider,
    skills:
      overrides.skills ??
      (config?.defaultSkills && config.defaultSkills.length > 0
        ? config.defaultSkills
        : undefined),
    autoDetectSkills: overrides.autoDetectSkills ?? true,
    useCache: overrides.useCache ?? true,
  }
}

export function resolveOptimizeCwd(explicit?: string): string {
  return resolveInitCwd(explicit)
}
