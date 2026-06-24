import type { DiffHunk } from '../../types.js'

export function mergeAdjacentHunks(hunks: DiffHunk[]): DiffHunk[] {
  if (hunks.length === 0) return []

  const byFile = new Map<string, DiffHunk[]>()
  for (const hunk of hunks) {
    const list = byFile.get(hunk.file) ?? []
    list.push(hunk)
    byFile.set(hunk.file, list)
  }

  const merged: DiffHunk[] = []
  for (const [, fileHunks] of byFile) {
    const sorted = [...fileHunks].sort((a, b) => a.newStart - b.newStart)
    let current = { ...sorted[0], lines: [...sorted[0].lines] }

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i]
      const gap = next.newStart - (current.newStart + current.lines.length)
      if (gap <= 5 && current.file === next.file) {
        current.lines.push(...next.lines.filter((l) => !l.startsWith('@@')))
        current = { ...current, lines: current.lines }
      } else {
        merged.push(current)
        current = { ...next, lines: [...next.lines] }
      }
    }
    merged.push(current)
  }

  return merged
}
