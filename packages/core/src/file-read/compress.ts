import { estimateTokens, tokenSavingsPercent } from '../tokenizer.js'
import { compressGeneric } from '../shell-output/filters/generic.js'
import { trimToTokenBudget } from '../shell-output/budget-trim.js'

export interface ReadCompressOptions {
  maxTokens?: number
  maxLines?: number
}

export interface ReadCompressResult {
  text: string
  strategiesApplied: string[]
  originalTokens: number
  compressedTokens: number
  savingsPercent: number
}

const CODE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|swift|rb|php|cs|vue|svelte)$/i

function stripCodeComments(text: string): string {
  return text
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*#(?!!).*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function trimLines(text: string, maxLines: number): string {
  const lines = text.split('\n')
  if (lines.length <= maxLines) return text
  return `${lines.slice(0, maxLines).join('\n')}\n...[truncated ${lines.length - maxLines} lines]`
}

export function compressReadContent(
  content: string,
  options: ReadCompressOptions = {},
  filePath?: string,
): ReadCompressResult {
  const originalTokens = estimateTokens(content)
  const strategiesApplied: string[] = []
  let text = content

  const generic = compressGeneric(text)
  if (generic !== text) {
    text = generic
    strategiesApplied.push('generic')
  }

  if (!filePath || CODE_EXTENSIONS.test(filePath)) {
    const stripped = stripCodeComments(text)
    if (stripped !== text) {
      text = stripped
      strategiesApplied.push('strip-comments')
    }
  }

  if (options.maxLines) {
    const trimmed = trimLines(text, options.maxLines)
    if (trimmed !== text) {
      text = trimmed
      strategiesApplied.push('line-cap')
    }
  }

  if (options.maxTokens) {
    const trimmed = trimToTokenBudget(text, options.maxTokens)
    if (trimmed !== text) {
      text = trimmed
      strategiesApplied.push('budget-trim')
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
