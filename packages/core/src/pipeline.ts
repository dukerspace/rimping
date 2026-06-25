import type { OptimizeOptions, OptimizeResult } from './types.js'
import { loadSkills, selectSkills, composeSkills, reconcileSkillsUsed } from './skill-engine.js'
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

export async function loadLastResult(cwd = process.cwd()): Promise<OptimizeResult | null> {
  if (!lastResult && existsSync(LAST_RUN_PATH)) {
    try {
      const content = await readFile(LAST_RUN_PATH, 'utf-8')
      lastResult = JSON.parse(content) as OptimizeResult
    } catch {
      return null
    }
  }
  if (!lastResult) return null

  const reconciled = await reconcileResultSkills(cwd, lastResult)
  if (reconciled.stats.skillsUsed.length !== lastResult.stats.skillsUsed.length) {
    await setLastResult(reconciled, cwd)
    return reconciled
  }

  lastResult = reconciled
  return reconciled
}

export function getLastResult(): OptimizeResult | null {
  return lastResult
}

async function reconcileResultSkills(cwd: string, result: OptimizeResult): Promise<OptimizeResult> {
  const skillsUsed = await reconcileSkillsUsed(cwd, result.stats.skillsUsed)
  if (skillsUsed.length === result.stats.skillsUsed.length) return result

  return {
    ...result,
    stats: { ...result.stats, skillsUsed },
    explain: result.explain.map((step) =>
      step.stage === 'skill-engine'
        ? { ...step, detail: `Applied skills: ${skillsUsed.join(', ') || 'none'}` }
        : step,
    ),
  }
}

export async function setLastResult(result: OptimizeResult, cwd = process.cwd()): Promise<void> {
  const reconciled = await reconcileResultSkills(cwd, result)
  lastResult = reconciled
  await persistLastResult(reconciled)
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
      const reconciled = await reconcileResultSkills(cwd, cached)
      await setLastResult(reconciled, cwd)
      return reconciled
    }
  }

  const promptTokens = estimateTokens(options.prompt)
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
    tokensBefore: promptTokens,
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

  const inputTokens = estimateTokens(context.text)
  const contextTokens = Math.max(0, inputTokens - estimateTokens(skilledText))

  const optimized = optimizeText(context.text)
  explain.push(...optimized.explain)

  const budgeted = applyBudget(optimized.text, options.maxTokens)
  explain.push(...budgeted.explain)

  const finalTokens = estimateTokens(budgeted.text)
  const durationMs = Math.round(performance.now() - start)

  const result: OptimizeResult = {
    optimized: budgeted.text,
    stats: {
      originalTokens: inputTokens,
      optimizedTokens: finalTokens,
      promptTokens,
      contextTokens,
      savingsPercent: tokenSavingsPercent(inputTokens, finalTokens),
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

  await setLastResult(result, cwd)
  return result
}
