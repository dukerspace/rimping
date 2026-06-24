import type { DiffHunk } from '../../types.js'

export function stripContextLines(hunks: DiffHunk[]): DiffHunk[] {
  return hunks.map((hunk) => ({
    ...hunk,
    lines: hunk.lines.filter((line) => {
      if (line.startsWith('@@')) return true
      return line.startsWith('+') || line.startsWith('-')
    }),
  }))
}
