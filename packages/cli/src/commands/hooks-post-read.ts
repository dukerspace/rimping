import { defineCommand } from 'citty'
import {
  appendHookLog,
  buildPostReadLogEntry,
  findProjectRoot,
  inferHookAgent,
  loadConfig,
  mergeHooksConfig,
  mergeReadConfig,
  resolvePostRead,
} from '@rimping/core'
import type { AgentId } from '@rimping/core'

interface PostReadHookInput {
  tool_name?: string
  tool_input?: Record<string, unknown>
  tool_output?: string
  cwd?: string
  [key: string]: unknown
}

export async function runPostReadHook(): Promise<void> {
  const raw = await Bun.stdin.text()
  let input: PostReadHookInput = {}

  try {
    input = JSON.parse(raw) as PostReadHookInput
  } catch {
    console.log(JSON.stringify({}))
    return
  }

  if (input.tool_name !== 'Read') {
    console.log(JSON.stringify({}))
    return
  }

  const cwd = findProjectRoot(input.cwd ?? process.cwd())

  try {
    const config = await loadConfig(cwd)
    const read = mergeReadConfig(config)
    const agent = inferHookAgent(input)
    const agentId: AgentId | undefined = agent.id === 'unknown' ? undefined : agent.id
    const hooks = mergeHooksConfig(config, agentId)

    const result = resolvePostRead(
      {
        tool_name: input.tool_name,
        tool_input: input.tool_input,
        tool_output: input.tool_output,
      },
      read,
    )

    const filePath = result.filePath ?? 'unknown'

    if (hooks.logStats) {
      if (result.originalTokens !== undefined) {
        if (result.optimized) {
          console.error(
            `[rimping:read] compressed ${filePath} ${result.originalTokens}→${result.compressedTokens} (-${result.savingsPercent}%)`,
          )
        } else if (result.skipped === 'low-savings') {
          console.error(`[rimping:read] skipped ${filePath} (low savings)`)
        }
      }

      if (result.skipped !== 'disabled' && result.skipped !== 'no-output') {
        await appendHookLog(
          cwd,
          buildPostReadLogEntry({
            cwd,
            hooks,
            config,
            filePath,
            hookInput: input,
            result: {
              optimized: result.optimized,
              skipped: result.skipped,
              stats:
                result.originalTokens !== undefined &&
                result.compressedTokens !== undefined &&
                result.savingsPercent !== undefined
                  ? {
                      originalTokens: result.originalTokens,
                      compressedTokens: result.compressedTokens,
                      savingsPercent: result.savingsPercent,
                      strategiesApplied: result.strategiesApplied,
                    }
                  : undefined,
            },
          }),
        )
      }
    }

    if (!result.optimized || !result.additional_context) {
      console.log(JSON.stringify({}))
      return
    }

    console.log(
      JSON.stringify({
        additional_context: result.additional_context,
      }),
    )
  } catch {
    console.log(JSON.stringify({}))
  }
}

export const hooksPostReadCommand = defineCommand({
  meta: {
    description: 'Cursor postToolUse hook — compress Read tool output via additional_context',
  },
  async run() {
    await runPostReadHook()
  },
})
