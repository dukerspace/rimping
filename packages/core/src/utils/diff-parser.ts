import type { DiffHunk } from '../types.js'
import { findSymbolInDiffLines } from '../git-diff/tree-sitter/fallback.js'

/** @deprecated Import from git-diff module */
export { parseUnifiedDiff } from '../git-diff/parse.js'
export { findNearestSymbol, findSymbolInDiffLines } from '../git-diff/tree-sitter/fallback.js'

export function reduceDiffHunks(hunks: DiffHunk[]): string {
  const byFile = new Map<string, DiffHunk[]>()
  for (const hunk of hunks) {
    if (!hunk.file || hunk.file.endsWith('.lock')) continue
    const list = byFile.get(hunk.file) ?? []
    list.push(hunk)
    byFile.set(hunk.file, list)
  }

  const sections: string[] = []
  for (const [file, fileHunks] of byFile) {
    const allLines = fileHunks.flatMap((h) => h.lines)
    const symbol = findSymbolInDiffLines(allLines)
    const header = symbol ? `${file} (${symbol})` : file
    const content = fileHunks
      .map((h) => h.lines.filter((l) => !l.startsWith('@@')).join('\n'))
      .join('\n')
    sections.push(`### ${header}\n${content}`)
  }

  return sections.join('\n\n')
}

export type { ParsedDiff, DiffHunk } from '../types.js'
