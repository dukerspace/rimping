import { defineCommand } from 'citty'
import {
  appendHookLog,
  buildHookLogEntry,
  findProjectRoot,
  loadConfig,
  mergeHooksConfig,
  preSend,
  resolveOptimizeOptions,
} from '@rimping/core'

interface HookInput {
  prompt?: string
  user_message?: string
  [key: string]: unknown
}

export function formatStatsLine(stats: {
  originalTokens: number
  optimizedTokens: number
  savingsPercent: number
  durationMs: number
}): string {
  return `[rimping] ${stats.originalTokens}→${stats.optimizedTokens} (-${stats.savingsPercent}%) ${stats.durationMs}ms`
}

async function maybeLogHookRun(options: {
  cwd: string
  hooks: ReturnType<typeof mergeHooksConfig>
  config: Awaited<ReturnType<typeof loadConfig>>
  prompt: string
  input: HookInput
  result: Awaited<ReturnType<typeof preSend>>
  error?: string
}): Promise<void> {
  const { cwd, hooks, config, prompt, input, result, error } = options
  if (!hooks.logStats) return

  const extraKeys = Object.keys(input).filter((key) => key !== 'prompt' && key !== 'user_message')

  const entry = buildHookLogEntry({
    cwd,
    hooks,
    config,
    prompt,
    extraKeys,
    result: {
      optimized: result.optimized,
      skipped: result.skipped,
      outputLength: result.text.length,
      stats: result.stats,
      explain: result.explain,
    },
    error,
  })

  await appendHookLog(cwd, entry)

  if (result.stats) {
    console.error(formatStatsLine(result.stats))
  } else if (result.skipped) {
    console.error(`[rimping] skipped: ${result.skipped}`)
  } else if (error) {
    console.error(`[rimping] error: ${error}`)
  }
}

export async function runCursorPreSendHook(): Promise<void> {
  const raw = await Bun.stdin.text()
  let input: HookInput = {}

  try {
    input = JSON.parse(raw) as HookInput
  } catch {
    console.log(JSON.stringify({ prompt: raw }))
    return
  }

  const original = input.prompt ?? input.user_message ?? ''

  if (!original.trim()) {
    console.log(JSON.stringify(input))
    return
  }

  const cwd = findProjectRoot(process.cwd())

  try {
    const config = await loadConfig(cwd)
    const hooks = mergeHooksConfig(config)
    const opts = resolveOptimizeOptions(cwd, config, {
      autoDetectSkills: true,
      useCache: true,
      cwd,
    })

    const result = await preSend(original, { ...opts, config })

    await maybeLogHookRun({
      cwd,
      hooks,
      config,
      prompt: original,
      input,
      result,
    })

    console.log(
      JSON.stringify({
        ...input,
        prompt: result.text,
        user_message: result.text,
      }),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const config = await loadConfig(cwd)
    const hooks = mergeHooksConfig(config)

    await maybeLogHookRun({
      cwd,
      hooks,
      config,
      prompt: original,
      input,
      result: {
        text: original,
        optimized: false,
        skipped: 'error',
      },
      error: message,
    })

    console.log(JSON.stringify(input))
  }
}

export const hooksPreSendCommand = defineCommand({
  meta: {
    description: 'Cursor beforeSubmitPrompt hook entry point (reads JSON from stdin)',
  },
  async run() {
    await runCursorPreSendHook()
  },
})
