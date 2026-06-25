import { estimateTokens, tokenSavingsPercent } from '../tokenizer.js'
import { trimToTokenBudget } from './budget-trim.js'
import { compressGeneric } from './filters/generic.js'
import { resolveShellFilter } from './registry.js'

export interface ShellCompressOptions {
  maxTokens?: number
}

export interface ShellCompressResult {
  text: string
  strategiesApplied: string[]
  originalTokens: number
  compressedTokens: number
  savingsPercent: number
}

export function compressShellOutput(
  command: string,
  raw: string,
  options: ShellCompressOptions = {},
): ShellCompressResult {
  const originalTokens = estimateTokens(raw)
  const strategiesApplied: string[] = []

  const entry = resolveShellFilter(command)
  let text: string

  if (entry) {
    text = entry.compress(raw)
    strategiesApplied.push(entry.id)
  } else {
    text = compressGeneric(raw)
    strategiesApplied.push('generic')
  }

  if (options.maxTokens) {
    const trimmed = trimToTokenBudget(text, options.maxTokens)
    if (trimmed !== text) {
      strategiesApplied.push('budget-trim')
      text = trimmed
    }
  }

  const compressedTokens = estimateTokens(text)
  return {
    text,
    strategiesApplied,
    originalTokens,
    compressedTokens,
    savingsPercent: tokenSavingsPercent(originalTokens, compressedTokens),
  }
}

export { compressGeneric } from './filters/generic.js'
export { compressGitStatus } from './filters/git-status.js'
export { compressTestOutput } from './filters/test-output.js'
export { compressRgGrep } from './filters/rg-grep.js'
export { isCompressibleShellCommand, resolveShellFilter } from './registry.js'
export { stripAnsi } from './ansi.js'
