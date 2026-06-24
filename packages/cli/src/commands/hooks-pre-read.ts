import { defineCommand } from 'citty'
import {
  appendHookLog,
  buildPreReadLogEntry,
  extractReadPath,
  findProjectRoot,
  inferHookAgent,
  loadConfig,
  mergeHooksConfig,
  mergeReadConfig,
  resolvePreRead,
} from '@rimping/core'
import type { AgentId } from '@rimping/core'

interface PreReadHookInput {
  tool_name?: string
  tool_input?: Record<string, unknown>
  cwd?: string
  [key: string]: unknown
}

export async function runPreReadHook(): Promise<void> {
  const raw = await Bun.stdin.text()
  let input: PreReadHookInput = {}

  try {
    input = JSON.parse(raw) as PreReadHookInput
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

    if (!read.enabled || !read.autoLimit) {
      console.log(JSON.stringify({}))
      return
    }

    const result = await resolvePreRead(
      {
        tool_name: input.tool_name,
        tool_input: input.tool_input,
        cwd,
      },
      read,
    )

    if (!result.updated_input) {
      console.log(JSON.stringify({}))
      return
    }

    if (hooks.logStats) {
      if (result.detail) {
        console.error(`[rimping:read] ${result.detail}`)
      }
      const filePath =
        result.filePath ?? extractReadPath(input.tool_input) ?? 'unknown'
      if (result.lineCount !== undefined && result.limit !== undefined) {
        await appendHookLog(
          cwd,
          buildPreReadLogEntry({
            cwd,
            hooks,
            config,
            filePath,
            lineCount: result.lineCount,
            limit: result.limit,
            hookInput: input,
            detail: result.detail,
          }),
        )
      }
    }

    console.log(
      JSON.stringify({
        updated_input: result.updated_input,
      }),
    )
  } catch {
    console.log(JSON.stringify({}))
  }
}

export const hooksPreReadCommand = defineCommand({
  meta: {
    description: 'Cursor preToolUse hook — cap Read tool line limits for large files',
  },
  async run() {
    await runPreReadHook()
  },
})
