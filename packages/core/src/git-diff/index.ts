import type { ExplainStep } from '../types.js'
import { estimateTokens } from '../tokenizer.js'
import { fetchGitDiff } from './fetch.js'
import { parseUnifiedDiff } from './parse.js'
import { compressHunks } from './compression/index.js'
import { extractSymbolForHunk } from './tree-sitter/index.js'
import type { EnrichGitDiffOptions, EnrichedDiffResult, EnrichedHunk } from './types.js'

function formatHunkSection(hunk: EnrichedHunk): string {
  const header = hunk.symbol ? `${hunk.file} (${hunk.symbol})` : hunk.file
  const content = hunk.lines.filter((l) => !l.startsWith('@@')).join('\n')
  return `### ${header}\n${content}`
}

export async function enrichGitDiff(
  cwd: string,
  options: EnrichGitDiffOptions = {},
): Promise<EnrichedDiffResult> {
  const explain: ExplainStep[] = []
  const tokensBefore = 0

  const rawDiff = await fetchGitDiff(cwd, options.staged)
  if (!rawDiff.trim()) {
    return { text: '', hunks: [], explain }
  }

  const parsed = parseUnifiedDiff(rawDiff)
  const compressed = compressHunks(parsed.hunks, { maxTokens: options.maxTokens })

  const enriched: EnrichedHunk[] = []
  for (const hunk of compressed) {
    const symbol = await extractSymbolForHunk(hunk.file, cwd, hunk.lines, hunk.newStart)
    enriched.push({ ...hunk, symbol: symbol ?? undefined })
  }

  const text = enriched.map(formatHunkSection).join('\n\n')
  const tokensAfter = estimateTokens(text)

  explain.push({
    stage: 'context-builder',
    strategy: 'git-diff',
    tokensBefore,
    tokensAfter,
    detail: `Enriched ${enriched.length} hunks from git diff`,
  })

  return { text, hunks: enriched, explain }
}

export { fetchGitDiff, isGitRepo } from './fetch.js'
export { parseUnifiedDiff } from './parse.js'
export { compressHunks } from './compression/index.js'
