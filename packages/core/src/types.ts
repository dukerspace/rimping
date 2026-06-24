export const CLI_NAME = 'rimping'
export const CLI_VERSION = '0.1.0'

export type ProviderName = 'openai' | 'claude' | 'gemini' | 'copilot' | 'mock'

export interface Skill {
  id: string
  name: string
  tags: string[]
  priority: number
  triggers: string[]
  goal: string
  rules: string[]
  transformation: string
  outputStyle: string
  filePath: string
}

export interface ExplainStep {
  stage: string
  strategy?: string
  tokensBefore: number
  tokensAfter: number
  detail?: string
}

export interface BudgetGuard {
  limit: number
  final: number
  truncated: boolean
}

export interface OptimizationStats {
  originalTokens: number
  optimizedTokens: number
  promptTokens?: number
  contextTokens?: number
  savingsPercent: number
  strategiesApplied: string[]
  skillsUsed: string[]
  durationMs: number
  cacheHit: boolean
  budgetGuard?: BudgetGuard
}

export interface OptimizeOptions {
  prompt: string
  skills?: string[]
  autoDetectSkills?: boolean
  diff?: boolean
  maxTokens?: number
  provider?: ProviderName
  files?: string[]
  useCache?: boolean
  cwd?: string
}

export interface OptimizeResult {
  optimized: string
  stats: OptimizationStats
  explain: ExplainStep[]
}

export interface LLMProvider {
  name: ProviderName
  formatPrompt(result: OptimizeResult): string
  send(prompt: string): Promise<string>
}

export interface MemoryEntry {
  id: string
  content: string
  tags: string[]
  createdAt: Date
}

export interface MemoryStore {
  getRelevant(prompt: string, limit?: number): Promise<MemoryEntry[]>
  add(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<MemoryEntry>
}

export interface DiffHunk {
  file: string
  oldStart: number
  newStart: number
  lines: string[]
}

export interface ParsedDiff {
  hunks: DiffHunk[]
}

export interface CacheEntry {
  key: string
  result: OptimizeResult
  createdAt: number
}
