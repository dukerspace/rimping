import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ExplainStep, OptimizationStats } from '../types.js'
import type { HooksConfig, RimpingConfig } from '../config.js'
import { CONFIG_DIR } from '../config.js'
import type { PreSendSkipReason } from './pre-send.js'

export const HOOKS_LOG_FILE = 'hooks.log'
const PREVIEW_LENGTH = 200

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

export interface HookLogEntry {
  timestamp: string
  event: 'pre-send'
  cwd: string
  hooks: Required<HooksConfig>
  config: Pick<RimpingConfig, 'provider' | 'maxTokens' | 'diff' | 'defaultSkills'>
  input: HookLogInput
  result: HookLogResult
  error?: string
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
  extraKeys: string[]
  result: HookLogResult
  error?: string
}): HookLogEntry {
  const { cwd, hooks, config, prompt, extraKeys, result, error } = options

  return {
    timestamp: new Date().toISOString(),
    event: 'pre-send',
    cwd,
    hooks,
    config: {
      provider: config?.provider,
      maxTokens: config?.maxTokens,
      diff: config?.diff,
      defaultSkills: config?.defaultSkills,
    },
    input: {
      promptLength: prompt.length,
      promptPreview: previewPrompt(prompt),
      extraKeys,
    },
    result,
    ...(error ? { error } : {}),
  }
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

export function formatHookLogSummary(entry: HookLogEntry): string {
  const { result, input, hooks } = entry
  const parts = [entry.timestamp]

  if (result.skipped) {
    parts.push(`skipped:${result.skipped}`)
  } else if (result.optimized) {
    parts.push('optimized')
  } else {
    parts.push('unchanged')
  }

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
    if (result.stats.cacheHit) {
      parts.push('cache-hit')
    }
  }

  if (entry.error) {
    parts.push(`error:${entry.error}`)
  }

  if (!hooks.enabled) {
    parts.push('hooks:disabled')
  }

  return parts.join(' | ')
}
