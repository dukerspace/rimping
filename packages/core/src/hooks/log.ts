import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ExplainStep, OptimizationStats } from '../types.js'
import type { HooksConfig, RimpingConfig } from '../config.js'
import { CONFIG_DIR } from '../config.js'
import type { PreSendSkipReason } from './pre-send.js'
import type { PostReadSkipReason } from '../file-read/post-read.js'
import { inferHookAgent, type HookAgentInfo } from './agent.js'

export const HOOKS_LOG_FILE = 'hooks.log'
const PREVIEW_LENGTH = 200

export type HookLogEvent = 'pre-send' | 'shell-run' | 'pre-read' | 'post-read'

export interface HookLogInput {
  promptLength: number
  promptPreview: string
  extraKeys: string[]
}

export interface HookLogResult {
  optimized: boolean
  skipped?: PreSendSkipReason
  outputLength: number
  stats?: OptimizationStats
  explain?: ExplainStep[]
}

export interface TokenHookStats {
  originalTokens: number
  compressedTokens: number
  savingsPercent: number
  strategiesApplied?: string[]
}

interface HookLogConfigSnapshot {
  provider?: RimpingConfig['provider']
  maxTokens?: number
  diff?: boolean
  defaultSkills?: string[]
}

interface HookLogBase {
  timestamp: string
  cwd: string
  agent: HookAgentInfo
  hooks: Required<HooksConfig>
  config: HookLogConfigSnapshot
  error?: string
}

export interface PreSendHookLogEntry extends HookLogBase {
  event: 'pre-send'
  input: HookLogInput
  result: HookLogResult
}

export interface ShellRunHookLogEntry extends HookLogBase {
  event: 'shell-run'
  input: { command: string; exitCode: number }
  result: {
    optimized: boolean
    skipped?: 'disabled' | 'low-savings' | 'error'
    stats?: TokenHookStats
  }
}

export interface PreReadHookLogEntry extends HookLogBase {
  event: 'pre-read'
  input: { filePath: string; lineCount: number; limit: number }
  result: { optimized: boolean; detail?: string }
}

export interface PostReadHookLogEntry extends HookLogBase {
  event: 'post-read'
  input: { filePath: string }
  result: {
    optimized: boolean
    skipped?: PostReadSkipReason
    stats?: TokenHookStats
  }
}

export type HookLogEntry =
  | PreSendHookLogEntry
  | ShellRunHookLogEntry
  | PreReadHookLogEntry
  | PostReadHookLogEntry

function configSnapshot(config: RimpingConfig | null): HookLogConfigSnapshot {
  return {
    provider: config?.provider,
    maxTokens: config?.maxTokens,
    diff: config?.diff,
    defaultSkills: config?.defaultSkills,
  }
}

export function getHooksLogPath(cwd: string): string {
  return join(cwd, CONFIG_DIR, HOOKS_LOG_FILE)
}

export function previewPrompt(prompt: string, maxLength = PREVIEW_LENGTH): string {
  const trimmed = prompt.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength)}…`
}

export function buildHookLogEntry(options: {
  cwd: string
  hooks: Required<HooksConfig>
  config: RimpingConfig | null
  prompt: string
  hookInput?: Record<string, unknown>
  extraKeys?: string[]
  result: HookLogResult
  error?: string
}): PreSendHookLogEntry {
  const { cwd, hooks, config, prompt, hookInput, result, error } = options
  const extraKeys =
    options.extraKeys ??
    Object.keys(hookInput ?? {}).filter((key) => key !== 'prompt' && key !== 'user_message')
  const agent = inferHookAgent(hookInput)

  return {
    timestamp: new Date().toISOString(),
    event: 'pre-send',
    cwd,
    agent,
    hooks,
    config: configSnapshot(config),
    input: {
      promptLength: prompt.length,
      promptPreview: previewPrompt(prompt),
      extraKeys,
    },
    result,
    ...(error ? { error } : {}),
  }
}

export function buildShellRunLogEntry(options: {
  cwd: string
  hooks: Required<HooksConfig>
  config: RimpingConfig | null
  command: string
  exitCode: number
  hookInput?: Record<string, unknown>
  result: ShellRunHookLogEntry['result']
  error?: string
}): ShellRunHookLogEntry {
  const agent = inferHookAgent(options.hookInput)
  return {
    timestamp: new Date().toISOString(),
    event: 'shell-run',
    cwd: options.cwd,
    agent,
    hooks: options.hooks,
    config: configSnapshot(options.config),
    input: { command: options.command, exitCode: options.exitCode },
    result: options.result,
    ...(options.error ? { error: options.error } : {}),
  }
}

export function buildPreReadLogEntry(options: {
  cwd: string
  hooks: Required<HooksConfig>
  config: RimpingConfig | null
  filePath: string
  lineCount: number
  limit: number
  hookInput?: Record<string, unknown>
  detail?: string
}): PreReadHookLogEntry {
  return {
    timestamp: new Date().toISOString(),
    event: 'pre-read',
    cwd: options.cwd,
    agent: inferHookAgent(options.hookInput),
    hooks: options.hooks,
    config: configSnapshot(options.config),
    input: {
      filePath: options.filePath,
      lineCount: options.lineCount,
      limit: options.limit,
    },
    result: { optimized: true, detail: options.detail },
  }
}

export function buildPostReadLogEntry(options: {
  cwd: string
  hooks: Required<HooksConfig>
  config: RimpingConfig | null
  filePath: string
  hookInput?: Record<string, unknown>
  result: PostReadHookLogEntry['result']
  error?: string
}): PostReadHookLogEntry {
  return {
    timestamp: new Date().toISOString(),
    event: 'post-read',
    cwd: options.cwd,
    agent: inferHookAgent(options.hookInput),
    hooks: options.hooks,
    config: configSnapshot(options.config),
    input: { filePath: options.filePath },
    result: options.result,
    ...(options.error ? { error: options.error } : {}),
  }
}

export function getEntryTokenStats(
  entry: HookLogEntry,
): { originalTokens: number; compressedTokens: number; savingsPercent: number } | null {
  if (entry.event === 'pre-send' && entry.result.stats) {
    return {
      originalTokens: entry.result.stats.originalTokens,
      compressedTokens: entry.result.stats.optimizedTokens,
      savingsPercent: entry.result.stats.savingsPercent,
    }
  }
  if (entry.event === 'shell-run' && entry.result.stats) {
    return {
      originalTokens: entry.result.stats.originalTokens,
      compressedTokens: entry.result.stats.compressedTokens,
      savingsPercent: entry.result.stats.savingsPercent,
    }
  }
  if (entry.event === 'post-read' && entry.result.stats) {
    return {
      originalTokens: entry.result.stats.originalTokens,
      compressedTokens: entry.result.stats.compressedTokens,
      savingsPercent: entry.result.stats.savingsPercent,
    }
  }
  return null
}

export async function appendHookLog(cwd: string, entry: HookLogEntry): Promise<void> {
  const logPath = getHooksLogPath(cwd)
  const dir = join(cwd, CONFIG_DIR)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await appendFile(logPath, `${JSON.stringify(entry)}\n`, { mode: 0o644 })
}

export async function readHookLogs(cwd: string, options?: { last?: number }): Promise<HookLogEntry[]> {
  const logPath = getHooksLogPath(cwd)
  if (!existsSync(logPath)) return []

  const content = await readFile(logPath, 'utf-8')
  const entries = content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as HookLogEntry)

  const last = options?.last
  if (last !== undefined && last >= 0) {
    return entries.slice(-last)
  }

  return entries
}

export async function clearHookLogs(cwd: string): Promise<void> {
  const logPath = getHooksLogPath(cwd)
  if (!existsSync(logPath)) return
  await writeFile(logPath, '', { mode: 0o644 })
}

export interface DailyHookStats {
  date: string
  runs: number
  tokensSaved: number
  avgSavingsPercent: number
}

export interface DailyHookStatsByEvent extends DailyHookStats {
  event: HookLogEvent
}

export function aggregateHookStatsByDate(entries: HookLogEntry[]): DailyHookStats[] {
  const byDate = new Map<string, { runs: number; tokensSaved: number; totalPercent: number }>()

  for (const entry of entries) {
    const stats = getEntryTokenStats(entry)
    if (!stats) continue

    const date = entry.timestamp.slice(0, 10)
    const bucket = byDate.get(date) ?? { runs: 0, tokensSaved: 0, totalPercent: 0 }
    bucket.runs++
    bucket.tokensSaved += stats.originalTokens - stats.compressedTokens
    bucket.totalPercent += stats.savingsPercent
    byDate.set(date, bucket)
  }

  return [...byDate.entries()]
    .map(([date, bucket]) => ({
      date,
      runs: bucket.runs,
      tokensSaved: bucket.tokensSaved,
      avgSavingsPercent: Math.round(bucket.totalPercent / bucket.runs),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function aggregateHookStatsByDateAndEvent(
  entries: HookLogEntry[],
): DailyHookStatsByEvent[] {
  const byKey = new Map<string, { runs: number; tokensSaved: number; totalPercent: number }>()

  for (const entry of entries) {
    const stats = getEntryTokenStats(entry)
    if (!stats) continue

    const date = entry.timestamp.slice(0, 10)
    const key = `${date}:${entry.event}`
    const bucket = byKey.get(key) ?? { runs: 0, tokensSaved: 0, totalPercent: 0 }
    bucket.runs++
    bucket.tokensSaved += stats.originalTokens - stats.compressedTokens
    bucket.totalPercent += stats.savingsPercent
    byKey.set(key, bucket)
  }

  return [...byKey.entries()]
    .map(([key, bucket]) => {
      const [date, event] = key.split(':') as [string, HookLogEvent]
      return {
        date,
        event,
        runs: bucket.runs,
        tokensSaved: bucket.tokensSaved,
        avgSavingsPercent: Math.round(bucket.totalPercent / bucket.runs),
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.event.localeCompare(b.event))
}

export function countHookEventsByType(entries: HookLogEntry[]): Partial<Record<HookLogEvent, number>> {
  const counts: Partial<Record<HookLogEvent, number>> = {}
  for (const entry of entries) {
    counts[entry.event] = (counts[entry.event] ?? 0) + 1
  }
  return counts
}

export function formatHookLogSummary(entry: HookLogEntry): string {
  const parts = [entry.timestamp, `event:${entry.event}`, `agent:${entry.agent.name}`]

  if (entry.agent.model) parts.push(`model:${entry.agent.model}`)
  if (entry.agent.version) parts.push(`version:${entry.agent.version}`)

  switch (entry.event) {
    case 'pre-send': {
      const { result, input } = entry
      if (result.skipped) parts.push(`skipped:${result.skipped}`)
      else if (result.optimized) parts.push('optimized')
      else parts.push('unchanged')
      parts.push(`in:${input.promptLength}`)
      parts.push(`out:${result.outputLength}`)
      if (result.stats) {
        parts.push(
          `tokens:${result.stats.originalTokens}→${result.stats.optimizedTokens} (-${result.stats.savingsPercent}%)`,
        )
        parts.push(`${result.stats.durationMs}ms`)
        if (result.stats.skillsUsed.length > 0) {
          parts.push(`skills:${result.stats.skillsUsed.join(',')}`)
        }
        if (result.stats.cacheHit) parts.push('cache-hit')
      }
      break
    }
    case 'shell-run': {
      const { result, input } = entry
      parts.push(`cmd:${input.command.slice(0, 60)}`)
      parts.push(`exit:${input.exitCode}`)
      if (result.skipped) parts.push(`skipped:${result.skipped}`)
      else if (result.optimized) parts.push('optimized')
      if (result.stats) {
        parts.push(
          `tokens:${result.stats.originalTokens}→${result.stats.compressedTokens} (-${result.stats.savingsPercent}%)`,
        )
      }
      break
    }
    case 'pre-read': {
      const { input, result } = entry
      parts.push(`file:${input.filePath}`)
      parts.push(`lines:${input.lineCount}→${input.limit}`)
      if (result.detail) parts.push(result.detail)
      break
    }
    case 'post-read': {
      const { input, result } = entry
      parts.push(`file:${input.filePath}`)
      if (result.skipped) parts.push(`skipped:${result.skipped}`)
      else if (result.optimized) parts.push('optimized')
      if (result.stats) {
        parts.push(
          `tokens:${result.stats.originalTokens}→${result.stats.compressedTokens} (-${result.stats.savingsPercent}%)`,
        )
      }
      break
    }
  }

  if (entry.error) parts.push(`error:${entry.error}`)
  if (!entry.hooks.enabled) parts.push('hooks:disabled')

  return parts.join(' | ')
}
