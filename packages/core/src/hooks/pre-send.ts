import type { ExplainStep, OptimizationStats, OptimizeOptions } from '../types.js'
import type { HooksConfig, RimpingConfig } from '../config.js'
import { loadConfig } from '../config.js'
import { optimize } from '../pipeline.js'
import { mergeHooksConfig, resolveOptimizeOptions } from '../resolve-options.js'
import { findProjectRoot } from '../agent-skills-init.js'

export type PreSendSkipReason = 'disabled' | 'too-short' | 'low-savings' | 'error'

export interface PreSendResult {
  text: string
  optimized: boolean
  stats?: OptimizationStats
  explain?: ExplainStep[]
  skipped?: PreSendSkipReason
}

export interface PreSendOptions extends Partial<OptimizeOptions> {
  hooks?: Partial<HooksConfig>
  config?: RimpingConfig | null
}

export async function preSend(prompt: string, options?: PreSendOptions): Promise<PreSendResult> {
  const cwd = options?.cwd ?? findProjectRoot(process.cwd())
  const config = options?.config !== undefined ? options.config : await loadConfig(cwd)
  const hooks = { ...mergeHooksConfig(config), ...options?.hooks }

  if (!hooks.enabled || !hooks.optimizeOnSubmit) {
    return { text: prompt, optimized: false, skipped: 'disabled' }
  }

  if (prompt.length < hooks.minPromptLength) {
    return { text: prompt, optimized: false, skipped: 'too-short' }
  }

  try {
    const optimizeOpts = resolveOptimizeOptions(cwd, config, {
      ...options,
      prompt,
      cwd,
    })

    const result = await optimize(optimizeOpts)

    if (result.stats.savingsPercent < hooks.minSavingsPercent) {
      return {
        text: prompt,
        optimized: false,
        stats: result.stats,
        explain: result.explain,
        skipped: 'low-savings',
      }
    }

    return {
      text: result.optimized,
      optimized: true,
      stats: result.stats,
      explain: result.explain,
    }
  } catch {
    return { text: prompt, optimized: false, skipped: 'error' }
  }
}
