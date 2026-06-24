import type { ReadConfig } from '../config.js'
import { compressReadContent } from './compress.js'
import { extractReadContent, extractReadPath } from './parse.js'

export interface PostReadInput {
  tool_name?: string
  tool_input?: Record<string, unknown>
  tool_output?: string
}

export type PostReadSkipReason = 'disabled' | 'no-output' | 'low-savings' | 'error'

export interface PostReadResult {
  additional_context?: string
  optimized: boolean
  skipped?: PostReadSkipReason
  originalTokens?: number
  compressedTokens?: number
  savingsPercent?: number
  strategiesApplied?: string[]
  filePath?: string
}

export function resolvePostRead(input: PostReadInput, config: Required<ReadConfig>): PostReadResult {
  if (!config.enabled || !config.compressOutput) {
    return { optimized: false, skipped: 'disabled' }
  }

  if (input.tool_name !== 'Read') {
    return { optimized: false, skipped: 'disabled' }
  }

  const filePath = extractReadPath(input.tool_input) ?? undefined
  const content = extractReadContent(input.tool_output)
  if (!content?.trim()) {
    return { optimized: false, skipped: 'no-output', filePath }
  }

  try {
    const compressed = compressReadContent(content, {
      maxTokens: config.maxTokens,
      maxLines: config.maxLines,
    }, filePath)

    if (compressed.savingsPercent < config.minSavingsPercent) {
      return {
        optimized: false,
        skipped: 'low-savings',
        filePath,
        originalTokens: compressed.originalTokens,
        compressedTokens: compressed.originalTokens,
        savingsPercent: compressed.savingsPercent,
        strategiesApplied: compressed.strategiesApplied,
      }
    }

    const header = filePath ? `[rimping] Compressed read: ${filePath}` : '[rimping] Compressed read'
    const stats = `(${compressed.originalTokens}→${compressed.compressedTokens} tokens, -${compressed.savingsPercent}%)`

    return {
      optimized: true,
      additional_context: `${header} ${stats}\n\n${compressed.text}`,
      originalTokens: compressed.originalTokens,
      compressedTokens: compressed.compressedTokens,
      savingsPercent: compressed.savingsPercent,
      strategiesApplied: compressed.strategiesApplied,
      filePath,
    }
  } catch {
    return { optimized: false, skipped: 'error', filePath }
  }
}
