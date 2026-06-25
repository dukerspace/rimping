#!/usr/bin/env bun
import {
  preSend,
  findProjectRoot,
  inferHookAgent,
  loadConfig,
  mergeHooksConfig,
  resolveOptimizeOptions,
} from '@rimping/core'
import type { AgentId } from '@rimping/core'

interface HookInput {
  prompt?: string
  user_message?: string
  [key: string]: unknown
}

async function main() {
  const raw = await Bun.stdin.text()
  let input: HookInput = {}

  try {
    input = JSON.parse(raw) as HookInput
  } catch {
    console.log(JSON.stringify({ prompt: raw }))
    process.exit(0)
  }

  const original = input.prompt ?? input.user_message ?? ''

  if (!original.trim()) {
    console.log(JSON.stringify(input))
    process.exit(0)
  }

  try {
    const cwd = findProjectRoot(process.cwd())
    const config = await loadConfig(cwd)
    const agent = inferHookAgent(input)
    const agentId: AgentId | undefined = agent.id === 'unknown' ? undefined : agent.id
    const hooks = mergeHooksConfig(config, agentId)
    const opts = resolveOptimizeOptions(cwd, config, {
      autoDetectSkills: true,
      useCache: true,
      cwd,
      forHook: true,
    })

    const result = await preSend(original, { ...opts, config, agentId })

    if (hooks.logStats && result.stats) {
      console.error(
        `[rimping] ${result.stats.originalTokens}→${result.stats.optimizedTokens} (-${result.stats.savingsPercent}%) ${result.stats.durationMs}ms`,
      )
    }

    console.log(
      JSON.stringify({
        ...input,
        prompt: result.text,
        user_message: result.text,
      }),
    )
  } catch {
    console.log(JSON.stringify(input))
  }
}

main()
