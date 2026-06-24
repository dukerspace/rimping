const SYMBOL_RE =
  /^(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|class\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*[:=]\s*(?:async\s*)?\()/

export function findNearestSymbol(lines: string[], hunkStart: number): string | null {
  const searchStart = Math.max(0, hunkStart - 30)
  for (let i = hunkStart; i >= searchStart; i--) {
    const line = lines[i]
    if (!line || line.startsWith('+') || line.startsWith('-')) continue
    const content = line.replace(/^[ +-]/, '')
    const match = content.match(SYMBOL_RE)
    if (match) return match[1] ?? match[2] ?? match[3] ?? match[4] ?? null
  }
  return null
}

export function findSymbolInDiffLines(lines: string[]): string | null {
  return findNearestSymbol(lines, lines.length - 1)
}
