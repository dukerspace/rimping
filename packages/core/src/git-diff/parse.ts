import type { DiffHunk, ParsedDiff } from '../types.js'

export function parseUnifiedDiff(diffText: string): ParsedDiff {
  const hunks: DiffHunk[] = []
  const lines = diffText.split('\n')
  let currentFile = ''
  let currentHunk: DiffHunk | null = null

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/(.+)$/)
      currentFile = match ? match[1] : ''
      continue
    }
    if (line.startsWith('+++')) {
      const match = line.match(/\+\+\+ b\/(.+)/)
      if (match) currentFile = match[1]
      continue
    }
    if (line.startsWith('@@')) {
      if (currentHunk) hunks.push(currentHunk)
      const match = line.match(/@@ -(\d+)[^+]*\+(\d+)/)
      currentHunk = {
        file: currentFile,
        oldStart: match ? Number(match[1]) : 0,
        newStart: match ? Number(match[2]) : 0,
        lines: [line],
      }
      continue
    }
    if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
      currentHunk.lines.push(line)
    }
  }
  if (currentHunk) hunks.push(currentHunk)

  return { hunks }
}
