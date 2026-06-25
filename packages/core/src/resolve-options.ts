import type { OptimizeOptions } from './types.js'
import type { AgentId, HooksConfig, RimpingConfig, ReadConfig, ShellConfig } from './config.js'
import type { ShellCompressOptions } from './shell-output/index.js'
import type { ReadCompressOptions } from './file-read/index.js'
import { resolveInitCwd } from './agent-skills-init.js'

export interface ResolveOptimizeOptionsOverrides extends Partial<OptimizeOptions> {
  /** Hook paths return plain text to the host agent — never apply provider adapters. */
  forHook?: boolean
}

export const DEFAULT_HOOKS: Required<HooksConfig> = {
  enabled: true,
  optimizeOnSubmit: true,
  injectDiff: false,
  minPromptLength: 80,
  minSavingsPercent: 5,
  logStats: false,
}

export const DEFAULT_SHELL: Required<ShellConfig> = {
  enabled: true,
  minSavingsPercent: 10,
  maxTokens: 4000,
}

export const DEFAULT_READ: Required<ReadConfig> = {
  enabled: true,
  autoLimit: true,
  compressOutput: false,
  maxLines: 200,
  minSavingsPercent: 10,
  maxTokens: 4000,
}

export function mergeHooksConfig(
  config: RimpingConfig | null,
  agentId?: AgentId,
): Required<HooksConfig> {
  const merged: Required<HooksConfig> = { ...DEFAULT_HOOKS, ...config?.hooks }

  if (!agentId || !config?.agents?.[agentId]) {
    return merged
  }

  const agentConfig = config.agents[agentId]!
  if (agentConfig.hooks) {
    Object.assign(merged, agentConfig.hooks)
  }
  if (agentConfig.enabled === false) {
    merged.enabled = false
  }
  if (config.hooks?.logStats === false) {
    merged.logStats = false
  }

  return merged
}

export function mergeShellConfig(config: RimpingConfig | null): Required<ShellConfig> {
  return { ...DEFAULT_SHELL, ...config?.shell }
}

export function mergeReadConfig(config: RimpingConfig | null): Required<ReadConfig> {
  return { ...DEFAULT_READ, ...config?.read }
}

export function resolveShellOptions(
  _cwd: string,
  config: RimpingConfig | null,
  overrides: Partial<ShellCompressOptions> = {},
): ShellCompressOptions {
  const shell = mergeShellConfig(config)
  return {
    ...overrides,
    maxTokens: overrides.maxTokens ?? shell.maxTokens,
  }
}

export function resolveReadOptions(
  _cwd: string,
  config: RimpingConfig | null,
  overrides: Partial<ReadCompressOptions> = {},
): ReadCompressOptions {
  const read = mergeReadConfig(config)
  return {
    ...overrides,
    maxTokens: overrides.maxTokens ?? read.maxTokens,
    maxLines: overrides.maxLines ?? read.maxLines,
  }
}

export function resolveOptimizeOptions(
  cwd: string,
  config: RimpingConfig | null,
  overrides: ResolveOptimizeOptionsOverrides = {},
): OptimizeOptions {
  const { forHook, ...opts } = overrides
  const resolvedCwd = opts.cwd ?? cwd
  const injectDiff = config?.hooks?.injectDiff ?? config?.diff ?? false

  return {
    ...opts,
    cwd: resolvedCwd,
    prompt: opts.prompt ?? '',
    diff: opts.diff ?? injectDiff,
    maxTokens: opts.maxTokens ?? config?.maxTokens,
    provider: forHook ? undefined : (opts.provider ?? config?.provider),
    skills:
      opts.skills ??
      (config?.defaultSkills && config.defaultSkills.length > 0
        ? config.defaultSkills
        : undefined),
    autoDetectSkills: opts.autoDetectSkills ?? true,
    useCache: opts.useCache ?? true,
  }
}

export function resolveOptimizeCwd(explicit?: string): string {
  return resolveInitCwd(explicit)
}
