import type { CommandDef } from 'citty'

type CommandArgs = Record<string, string | boolean | number | undefined>

export async function runCommand(
  command: CommandDef,
  args: CommandArgs = {},
): Promise<void> {
  if (!command.run) throw new Error('Command has no run handler')
  await command.run({ args, rawArgs: [], cmd: command } as Parameters<NonNullable<CommandDef['run']>>[0])
}

export function captureConsole(): {
  logs: string[]
  errors: string[]
  restore: () => void
} {
  const logs: string[] = []
  const errors: string[] = []
  const logSpy = console.log
  const errorSpy = console.error

  console.log = (...parts: unknown[]) => {
    logs.push(parts.map(String).join(' '))
  }
  console.error = (...parts: unknown[]) => {
    errors.push(parts.map(String).join(' '))
  }

  return {
    logs,
    errors,
    restore: () => {
      console.log = logSpy
      console.error = errorSpy
    },
  }
}
