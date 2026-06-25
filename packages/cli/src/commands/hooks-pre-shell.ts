import { defineCommand } from 'citty'
import {
  findProjectRoot,
  isCompressibleShellCommand,
  loadConfig,
  mergeShellConfig,
} from '@rimping/core'

interface PreShellInput {
  tool_name?: string
  tool_input?: { command?: string; working_directory?: string }
  [key: string]: unknown
}

function shellQuote(command: string): string {
  return `'${command.replace(/'/g, `'\\''`)}'`
}

export async function runPreShellHook(): Promise<void> {
  const raw = await Bun.stdin.text()
  let input: PreShellInput = {}

  try {
    input = JSON.parse(raw) as PreShellInput
  } catch {
    console.log(JSON.stringify({}))
    return
  }

  const command = input.tool_input?.command?.trim()
  if (!command || input.tool_name !== 'Shell') {
    console.log(JSON.stringify({}))
    return
  }

  const cwd = findProjectRoot(process.cwd())

  try {
    const config = await loadConfig(cwd)
    const shell = mergeShellConfig(config)

    if (!shell.enabled || !isCompressibleShellCommand(command)) {
      console.log(JSON.stringify({}))
      return
    }

    const wrapped = `rimping shell run ${shellQuote(command)}`
    console.log(
      JSON.stringify({
        updated_input: {
          ...input.tool_input,
          command: wrapped,
        },
      }),
    )
  } catch {
    console.log(JSON.stringify({}))
  }
}

export const hooksPreShellCommand = defineCommand({
  meta: {
    description: 'Cursor preToolUse hook — rewrite Shell commands through rimping shell run',
  },
  async run() {
    await runPreShellHook()
  },
})
