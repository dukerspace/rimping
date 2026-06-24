import type { ExplainStep } from './types.js'
import { estimateTokens } from './tokenizer.js'

export type StrategyFn = (text: string) => string

export interface Strategy {
  name: string
  apply: StrategyFn
}

const FILLER_PATTERNS = [
  /\bI would like you to\b/gi,
  /\bI would like to\b/gi,
  /\bplease also\b/gi,
  /\bcould you also\b/gi,
  /\bplease\b/gi,
  /\bcould you\b/gi,
  /\bwould you\b/gi,
  /\bI would like\b/gi,
  /\bI want to\b/gi,
  /\bkindly\b/gi,
  /\bjust\b/gi,
  /\bactually\b/gi,
  /\bbasically\b/gi,
  /\bin order to\b/gi,
  /\bhelp me\b/gi,
]

export const strategies: Strategy[] = [
  {
    name: 'normalize-whitespace',
    apply(text) {
      return text
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    },
  },
  {
    name: 'remove-filler',
    apply(text) {
      let result = text
      for (const pattern of FILLER_PATTERNS) {
        result = result.replace(pattern, '')
      }
      return result.replace(/  +/g, ' ').replace(/ +\n/g, '\n')
    },
  },
  {
    name: 'dedupe-lines',
    apply(text) {
      const lines = text.split('\n')
      const deduped: string[] = []
      for (const line of lines) {
        if (deduped.length === 0 || deduped[deduped.length - 1] !== line) {
          deduped.push(line)
        }
      }
      return deduped.join('\n')
    },
  },
  {
    name: 'compress-code-comments',
    apply(text) {
      return text.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
        const stripped = code
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\n{2,}/g, '\n')
        return '```' + (lang || '') + '\n' + stripped.trim() + '\n```'
      })
    },
  },
  {
    name: 'collapse-lists',
    apply(text) {
      const lines = text.split('\n')
      const result: string[] = []
      let prefix = ''
      for (const line of lines) {
        const bulletMatch = line.match(/^(\s*[-*]\s+)(.+)/)
        if (bulletMatch) {
          const content = bulletMatch[2]
          const common = longestCommonPrefix(prefix, content)
          if (common.length > 10 && prefix) {
            result.push(bulletMatch[1] + content.slice(common.length).trim())
          } else {
            result.push(line)
            prefix = content
          }
        } else {
          result.push(line)
          prefix = ''
        }
      }
      return result.join('\n')
    },
  },
]

function longestCommonPrefix(a: string, b: string): string {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return a.slice(0, i)
}

export function truncateTail(text: string, maxTokens: number): string {
  const sections = text.split(/(?=^## )/m)
  if (sections.length <= 1) {
    const lines = text.split('\n')
    while (estimateTokens(lines.join('\n')) > maxTokens && lines.length > 1) {
      lines.pop()
    }
    return lines.join('\n') + '\n...[truncated]'
  }

  let result = sections[0]
  for (const section of sections.slice(1)) {
    const candidate = result + section
    if (estimateTokens(candidate) <= maxTokens) {
      result = candidate
    } else {
      break
    }
  }

  while (estimateTokens(result) > maxTokens && result.length > 100) {
    result = result.slice(0, Math.floor(result.length * 0.9))
  }

  return result.trimEnd() + (estimateTokens(result) < estimateTokens(text) ? '\n...[truncated]' : '')
}

export interface OptimizerResult {
  text: string
  explain: ExplainStep[]
  strategiesApplied: string[]
}

export function optimizeText(text: string, maxTokens?: number): OptimizerResult {
  const explain: ExplainStep[] = []
  const strategiesApplied: string[] = []
  let current = text
  let tokensBefore = estimateTokens(current)

  for (const strategy of strategies) {
    const next = strategy.apply(current)
    if (next !== current) {
      const tokensAfter = estimateTokens(next)
      explain.push({
        stage: 'optimizer',
        strategy: strategy.name,
        tokensBefore,
        tokensAfter,
        detail: `Saved ${tokensBefore - tokensAfter} tokens`,
      })
      strategiesApplied.push(strategy.name)
      current = next
      tokensBefore = tokensAfter
    }
  }

  if (maxTokens && estimateTokens(current) > maxTokens) {
    const truncated = truncateTail(current, maxTokens)
    const tokensAfter = estimateTokens(truncated)
    explain.push({
      stage: 'optimizer',
      strategy: 'truncate-tail',
      tokensBefore,
      tokensAfter,
      detail: `Truncated to fit ${maxTokens} token budget`,
    })
    strategiesApplied.push('truncate-tail')
    current = truncated
  }

  return { text: current, explain, strategiesApplied }
}
