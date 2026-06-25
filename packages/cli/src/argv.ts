export function normalizeCliArgs(rawArgs: string[]): string[] {
  if (rawArgs.length === 1 && rawArgs[0] === '-v') return ['--version']
  return rawArgs
}
