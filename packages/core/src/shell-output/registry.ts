import { compressGitStatus } from './filters/git-status.js'
import { compressGeneric } from './filters/generic.js'
import { compressRgGrep } from './filters/rg-grep.js'
import { compressTestOutput } from './filters/test-output.js'

export type ShellFilterFn = (raw: string) => string

interface ShellFilterEntry {
  id: string
  match: (command: string) => boolean
  compress: ShellFilterFn
}

const FILTERS: ShellFilterEntry[] = [
  {
    id: 'git-status',
    match: (cmd) => /\bgit\s+status\b/.test(cmd),
    compress: compressGitStatus,
  },
  {
    id: 'git-diff',
    match: (cmd) => /\bgit\s+diff\b/.test(cmd),
    compress: (raw) => compressGeneric(raw),
  },
  {
    id: 'test-output',
    match: (cmd) =>
      /\b(cargo\s+test|pytest|npm\s+test|pnpm\s+test|bun\s+test|go\s+test)\b/.test(cmd),
    compress: compressTestOutput,
  },
  {
    id: 'rg-grep',
    match: (cmd) => /\b(rg|grep|git\s+grep)\b/.test(cmd),
    compress: compressRgGrep,
  },
]

export function resolveShellFilter(command: string): ShellFilterEntry | null {
  const normalized = command.trim()
  for (const entry of FILTERS) {
    if (entry.match(normalized)) return entry
  }
  return null
}

export function isCompressibleShellCommand(command: string): boolean {
  return resolveShellFilter(command) !== null
}

export { FILTERS }
