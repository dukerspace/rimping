import { estimateTokens, tokenSavingsPercent } from '../tokenizer.js'
import { compressGeneric } from '../shell-output/filters/generic.js'
import { trimToTokenBudget } from '../shell-output/budget-trim.js'
import { compressContent } from '../content-compression/index.js'

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
  const lines = text.split('\n')
  const out: string[] = []
  const importantComment = /(?:\bTODO\b|\bFIXME\b|\bHACK\b|\bNOTE\b|\bLICENSE\b|\beslint\b|\btslint\b|\bistanbul\b|\bcoverage\b|@ts-)/i

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (/^\s*\/\*.*\*\//.test(line)) {
      if (importantComment.test(line)) out.push(line)
      continue
    }

    if (/^\s*\/\//.test(line) && !/^\s*\/\/\s*(?:TODO|FIXME|HACK|NOTE|@ts-|eslint|istanbul|coverage|# sourceMappingURL)/i.test(line)) continue
    if (/^\s*#/.test(line) && !/^\s*#!/.test(line) && !/^\s*#\s*(?:TODO|FIXME|HACK|NOTE)/i.test(line)) continue
    out.push(line)
  }

  return out.join('\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim()
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

  const isCode = Boolean(filePath && CODE_EXTENSIONS.test(filePath))
  if (isCode) {
    const stripped = stripCodeComments(text)
    if (stripped !== text) {
      text = stripped
      strategiesApplied.push('strip-comments')
    }
  } else {
    const generic = compressGeneric(text)
    if (generic !== text) {
      text = generic
      strategiesApplied.push('generic')
    }
  }

  const routed = compressContent(content, { type: isCode ? 'code' : 'auto' })
  if (
    routed.compressedTokens < estimateTokens(text) ||
    ((routed.type === 'json' || routed.type === 'logs') && routed.compressedTokens < originalTokens)
  ) {
    text = routed.text
    strategiesApplied.push(...routed.strategiesApplied)
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
