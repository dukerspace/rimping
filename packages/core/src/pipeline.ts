import type { OptimizeOptions, OptimizeResult } from './types.js'
import { loadSkills, selectSkills, composeSkills } from './skill-engine.js'
import { buildContext } from './context-builder.js'
import { optimizeText } from './optimizer.js'
import { applyBudget } from './budget-planner.js'
import { estimateTokens, tokenSavingsPercent } from './tokenizer.js'
import { buildCacheHash, getCached, setCached } from './cache.js'
import { getAdapter } from './adapters/index.js'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const LAST_RUN_PATH = join(homedir(), '.rimping', 'last-run.json')

let lastResult: OptimizeResult | null = null

async function persistLastResult(result: OptimizeResult): Promise<void> {
  const dir = join(homedir(), '.rimping')
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(LAST_RUN_PATH, JSON.stringify(result, null, 2))
}

export async function loadLastResult(): Promise<OptimizeResult | null> {
  if (lastResult) return lastResult
  if (!existsSync(LAST_RUN_PATH)) return null
  try {
    const content = await readFile(LAST_RUN_PATH, 'utf-8')
    lastResult = JSON.parse(content) as OptimizeResult
    return lastResult
  } catch {
    return null
  }
}

export function getLastResult(): OptimizeResult | null {
  return lastResult
}

export async function setLastResult(result: OptimizeResult): Promise<void> {
  lastResult = result
  await persistLastResult(result)
}

export async function optimize(options: OptimizeOptions): Promise<OptimizeResult> {
  const start = performance.now()
  const cwd = options.cwd ?? process.cwd()
  const useCache = options.useCache !== false

  if (useCache) {
    const hash = await buildCacheHash({
      prompt: options.prompt,
      skills: options.skills,
      diff: options.diff,
      maxTokens: options.maxTokens,
      cwd,
    })
    const cached = await getCached(hash)
    if (cached) {
      await setLastResult(cached)
      return cached
    }
  }

  const originalTokens = estimateTokens(options.prompt)
  const explain: OptimizeResult['explain'] = []

  const allSkills = await loadSkills(cwd)
  const selected = selectSkills(allSkills, {
    ids: options.skills,
    prompt: options.prompt,
    autoDetect: options.autoDetectSkills,
  })

  const { text: skilledText, skillIds } = composeSkills(selected, options.prompt)
  explain.push({
    stage: 'skill-engine',
    tokensBefore: originalTokens,
    tokensAfter: estimateTokens(skilledText),
    detail: `Applied skills: ${skillIds.join(', ') || 'none'}`,
  })

  const context = await buildContext({
    prompt: skilledText,
    diff: options.diff,
    files: options.files,
    cwd,
  })
  explain.push(...context.explain)

  const optimized = optimizeText(context.text)
  explain.push(...optimized.explain)

  const budgeted = applyBudget(optimized.text, options.maxTokens)
  explain.push(...budgeted.explain)

  const finalTokens = estimateTokens(budgeted.text)
  const durationMs = Math.round(performance.now() - start)

  const result: OptimizeResult = {
    optimized: budgeted.text,
    stats: {
      originalTokens,
      optimizedTokens: finalTokens,
      savingsPercent: tokenSavingsPercent(originalTokens, finalTokens),
      strategiesApplied: [...optimized.strategiesApplied, ...budgeted.strategiesApplied],
      skillsUsed: skillIds,
      durationMs,
      cacheHit: false,
      budgetGuard: budgeted.budgetGuard,
    },
    explain,
  }

  if (options.provider && options.provider !== 'mock') {
    const adapter = getAdapter(options.provider)
    result.optimized = adapter.formatPrompt(result)
  }

  if (useCache) {
    const hash = await buildCacheHash({
      prompt: options.prompt,
      skills: options.skills,
      diff: options.diff,
      maxTokens: options.maxTokens,
      cwd,
    })
    await setCached(hash, result)
  }

  await setLastResult(result)
  return result
}
