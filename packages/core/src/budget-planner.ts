import type { BudgetGuard, ExplainStep } from './types.js'
import { estimateTokens } from './tokenizer.js'
import { optimizeText, truncateTail } from './optimizer.js'

export interface BudgetPlannerResult {
  text: string
  explain: ExplainStep[]
  strategiesApplied: string[]
  budgetGuard?: BudgetGuard
}

export function applyBudget(text: string, maxTokens?: number): BudgetPlannerResult {
  if (!maxTokens) {
    return { text, explain: [], strategiesApplied: [] }
  }

  const currentTokens = estimateTokens(text)
  if (currentTokens <= maxTokens) {
    return {
      text,
      explain: [],
      strategiesApplied: [],
      budgetGuard: { limit: maxTokens, final: currentTokens, truncated: false },
    }
  }

  const optimized = optimizeText(text, maxTokens)
  let result = optimized.text
  let tokens = estimateTokens(result)

  if (tokens > maxTokens) {
    result = truncateTail(result, maxTokens)
    tokens = estimateTokens(result)
    optimized.explain.push({
      stage: 'budget-planner',
      strategy: 'truncate-tail',
      tokensBefore: tokens,
      tokensAfter: estimateTokens(result),
      detail: 'Final budget enforcement',
    })
    optimized.strategiesApplied.push('truncate-tail')
  }

  return {
    text: result,
    explain: optimized.explain,
    strategiesApplied: optimized.strategiesApplied,
    budgetGuard: {
      limit: maxTokens,
      final: estimateTokens(result),
      truncated: estimateTokens(result) < currentTokens,
    },
  }
}
