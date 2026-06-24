import type { CacheEntry, OptimizeResult } from './types.js'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { sha256, cacheKey } from './utils/hash.js'

const CACHE_DIR = join(homedir(), '.rimping', 'cache')
const TTL_MS = 24 * 60 * 60 * 1000

export async function ensureCacheDir(): Promise<string> {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true })
  }
  return CACHE_DIR
}

export async function buildCacheHash(options: {
  prompt: string
  skills?: string[]
  diff?: boolean
  maxTokens?: number
  cwd?: string
}): Promise<string> {
  const key = cacheKey({
    prompt: options.prompt,
    skills: options.skills?.sort().join(',') ?? '',
    diff: options.diff ?? false,
    maxTokens: options.maxTokens ?? 0,
    cwd: options.cwd ?? process.cwd(),
  })
  return sha256(key)
}

export async function getCached(hash: string): Promise<OptimizeResult | null> {
  const path = join(CACHE_DIR, `${hash}.json`)
  if (!existsSync(path)) return null

  try {
    const content = await readFile(path, 'utf-8')
    const entry: CacheEntry = JSON.parse(content)
    if (Date.now() - entry.createdAt > TTL_MS) return null
    return { ...entry.result, stats: { ...entry.result.stats, cacheHit: true } }
  } catch {
    return null
  }
}

export async function setCached(hash: string, result: OptimizeResult): Promise<void> {
  await ensureCacheDir()
  const entry: CacheEntry = { key: hash, result, createdAt: Date.now() }
  await writeFile(join(CACHE_DIR, `${hash}.json`), JSON.stringify(entry, null, 2))
}

export interface CacheStats {
  totalEntries: number
  totalSavings: number
  avgSavingsPercent: number
}

export interface DailyCacheStats {
  date: string
  entries: number
  tokensSaved: number
  avgSavingsPercent: number
}

async function listValidCacheEntries(): Promise<CacheEntry[]> {
  if (!existsSync(CACHE_DIR)) return []

  const files = await readdir(CACHE_DIR)
  const entries: CacheEntry[] = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const content = await readFile(join(CACHE_DIR, file), 'utf-8')
      const entry: CacheEntry = JSON.parse(content)
      if (Date.now() - entry.createdAt > TTL_MS) continue
      entries.push(entry)
    } catch {
      continue
    }
  }

  return entries
}

export async function getCacheStats(): Promise<CacheStats> {
  const entries = await listValidCacheEntries()
  let totalSavings = 0
  let totalPercent = 0

  for (const entry of entries) {
    const { originalTokens, optimizedTokens, savingsPercent } = entry.result.stats
    totalSavings += originalTokens - optimizedTokens
    totalPercent += savingsPercent
  }

  const count = entries.length
  return {
    totalEntries: count,
    totalSavings,
    avgSavingsPercent: count ? Math.round(totalPercent / count) : 0,
  }
}

export async function getCacheStatsByDate(): Promise<DailyCacheStats[]> {
  const byDate = new Map<string, { entries: number; tokensSaved: number; totalPercent: number }>()

  for (const entry of await listValidCacheEntries()) {
    const date = new Date(entry.createdAt).toISOString().slice(0, 10)
    const bucket = byDate.get(date) ?? { entries: 0, tokensSaved: 0, totalPercent: 0 }
    const { originalTokens, optimizedTokens, savingsPercent } = entry.result.stats
    bucket.entries++
    bucket.tokensSaved += originalTokens - optimizedTokens
    bucket.totalPercent += savingsPercent
    byDate.set(date, bucket)
  }

  return [...byDate.entries()]
    .map(([date, bucket]) => ({
      date,
      entries: bucket.entries,
      tokensSaved: bucket.tokensSaved,
      avgSavingsPercent: Math.round(bucket.totalPercent / bucket.entries),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getCacheDir(): string {
  return CACHE_DIR
}

export async function getCacheDirSize(): Promise<number> {
  if (!existsSync(CACHE_DIR)) return 0
  const files = await readdir(CACHE_DIR)
  let size = 0
  for (const file of files) {
    const s = await stat(join(CACHE_DIR, file))
    size += s.size
  }
  return size
}
