import { afterEach, describe, expect, it } from 'bun:test'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { buildCacheHash, getCached, getCacheDir, getCacheStatsByDate, setCached } from '../src/cache.js'
import type { OptimizeResult } from '../src/types.js'

const sampleResult = (): OptimizeResult => ({
  optimized: 'optimized text',
  stats: {
    originalTokens: 20,
    optimizedTokens: 10,
    savingsPercent: 50,
    strategiesApplied: ['remove-filler'],
    skillsUsed: [],
    durationMs: 2,
    cacheHit: false,
  },
  explain: [],
})

describe('cache', () => {
  let cachePath: string | null = null

  afterEach(async () => {
    if (cachePath && existsSync(cachePath)) {
      await unlink(cachePath)
    }
  })

  it('buildCacheHash is stable for identical options', async () => {
    const options = { prompt: 'hello', skills: ['a', 'b'], diff: true, maxTokens: 100, cwd: '/tmp' }
    const a = await buildCacheHash(options)
    const b = await buildCacheHash({ ...options, skills: ['b', 'a'] })
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('buildCacheHash changes when prompt changes', async () => {
    const a = await buildCacheHash({ prompt: 'one' })
    const b = await buildCacheHash({ prompt: 'two' })
    expect(a).not.toBe(b)
  })

  it('getCached returns null for missing entry', async () => {
    const hash = await buildCacheHash({ prompt: `missing-${Date.now()}` })
    expect(await getCached(hash)).toBeNull()
  })

  it('setCached and getCached round-trip', async () => {
    const hash = await buildCacheHash({ prompt: `roundtrip-${Date.now()}-${Math.random()}` })
    cachePath = join(getCacheDir(), `${hash}.json`)
    const result = sampleResult()

    await setCached(hash, result)
    const cached = await getCached(hash)

    expect(cached).not.toBeNull()
    expect(cached!.optimized).toBe('optimized text')
    expect(cached!.stats.cacheHit).toBe(true)
  })

  it('getCacheStatsByDate groups valid entries by UTC date', async () => {
    const hash = await buildCacheHash({ prompt: `by-date-${Date.now()}-${Math.random()}` })
    cachePath = join(getCacheDir(), `${hash}.json`)
    await setCached(hash, sampleResult())

    const byDate = await getCacheStatsByDate()
    const today = new Date().toISOString().slice(0, 10)
    const todayStats = byDate.find((day) => day.date === today)

    expect(todayStats).toBeDefined()
    expect(todayStats!.entries).toBeGreaterThanOrEqual(1)
    expect(todayStats!.tokensSaved).toBeGreaterThanOrEqual(10)
    expect(todayStats!.avgSavingsPercent).toBeGreaterThan(0)
  })
})
