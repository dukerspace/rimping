import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import type { ReadConfig } from '../config.js'
import { extractReadLimit, extractReadPath } from './parse.js'

const MAX_STAT_BYTES = 8 * 1024 * 1024

const SKIP_PATTERNS = [
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /bun\.lockb$/,
  /pnpm-lock\.yaml$/,
  /^node_modules\//,
  /^dist\//,
  /^\.turbo\//,
  /\.min\.(js|css)$/,
  /\.map$/,
  /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|wasm)$/i,
]

export interface PreReadInput {
  tool_name?: string
  tool_input?: Record<string, unknown>
  cwd?: string
}

export interface PreReadResult {
  updated_input?: Record<string, unknown>
  detail?: string
  filePath?: string
  lineCount?: number
  limit?: number
}

function shouldSkipFile(filePath: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(filePath))
}

function resolveAbsolutePath(filePath: string, cwd: string): string {
  return isAbsolute(filePath) ? filePath : join(cwd, filePath)
}

async function countFileLines(absPath: string): Promise<number | null> {
  try {
    const info = await stat(absPath)
    if (!info.isFile() || info.size > MAX_STAT_BYTES) return null
    const content = await readFile(absPath, 'utf-8')
    if (content.includes('\u0000')) return null
    return content.split('\n').length
  } catch {
    return null
  }
}

export async function resolvePreRead(
  input: PreReadInput,
  config: Required<ReadConfig>,
): Promise<PreReadResult> {
  if (!config.enabled || !config.autoLimit) return {}

  if (input.tool_name !== 'Read') return {}

  const filePath = extractReadPath(input.tool_input)
  if (!filePath || shouldSkipFile(filePath)) return {}

  const cwd = input.cwd ?? process.cwd()
  const absPath = resolveAbsolutePath(filePath, cwd)
  if (!existsSync(absPath)) return {}

  const lineCount = await countFileLines(absPath)
  if (lineCount === null || lineCount <= config.maxLines) return {}

  const currentLimit = extractReadLimit(input.tool_input)
  if (currentLimit !== null && currentLimit <= config.maxLines) return {}

  const updatedLimit = currentLimit === null ? config.maxLines : Math.min(currentLimit, config.maxLines)

  return {
    updated_input: {
      ...input.tool_input,
      limit: updatedLimit,
    },
    detail: `Capped Read limit to ${updatedLimit} lines (${lineCount} total in ${filePath})`,
    filePath,
    lineCount,
    limit: updatedLimit,
  }
}
