import { estimateTokens } from '../tokenizer.js'

export function trimToTokenBudget(text: string, maxTokens?: number): string {
  if (!maxTokens || estimateTokens(text) <= maxTokens) return text

  const lines = text.split('\n')
  const kept: string[] = []
  let tokens = 0

  for (const line of lines) {
    const lineTokens = estimateTokens(line + '\n')
    if (tokens + lineTokens > maxTokens) break
    kept.push(line)
    tokens += lineTokens
  }

  if (kept.length === 0) return text.slice(0, Math.floor(maxTokens * 3.5)) + '\n...[truncated]'

  const truncated = kept.join('\n')
  return estimateTokens(truncated) < estimateTokens(text)
    ? truncated + '\n...[truncated]'
    : text
}
