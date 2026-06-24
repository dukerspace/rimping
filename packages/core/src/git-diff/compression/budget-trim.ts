import type { DiffHunk } from '../../types.js'
import { estimateTokens } from '../../tokenizer.js'
import { shouldSkipFile } from './filter-files.js'

export function trimHunksToBudget(hunks: DiffHunk[], maxTokens?: number): DiffHunk[] {
  if (!maxTokens) return hunks

  const prioritized = [...hunks].sort((a, b) => {
    const aSkip = shouldSkipFile(a.file) ? 1 : 0
    const bSkip = shouldSkipFile(b.file) ? 1 : 0
    return aSkip - bSkip
  })

  const kept: DiffHunk[] = []
  let tokens = 0

  for (const hunk of prioritized) {
    const hunkText = hunk.lines.join('\n')
    const hunkTokens = estimateTokens(hunkText)
    if (tokens + hunkTokens > maxTokens) break
    kept.push(hunk)
    tokens += hunkTokens
  }

  return kept
}
