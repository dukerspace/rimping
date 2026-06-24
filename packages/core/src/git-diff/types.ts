import type { DiffHunk, ExplainStep } from '../types.js'

export interface SymbolInfo {
  name: string
  kind: string
  line: number
}

export interface EnrichedHunk extends DiffHunk {
  symbol?: string
}

export interface EnrichGitDiffOptions {
  maxTokens?: number
  staged?: boolean
}

export interface EnrichedDiffResult {
  text: string
  hunks: EnrichedHunk[]
  explain: ExplainStep[]
}

export type { DiffHunk }
