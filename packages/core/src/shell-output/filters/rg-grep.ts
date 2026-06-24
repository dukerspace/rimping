export function compressRgGrep(raw: string): string {
  const byFile = new Map<string, string[]>()
  let currentFile = ''

  for (const line of raw.split('\n')) {
    const trimmed = line.trimEnd()
    if (!trimmed) continue

    const lineMatch = trimmed.match(/^\s*(\d+):\s*(.*)$/)
    if (lineMatch && currentFile) {
      const list = byFile.get(currentFile) ?? []
      list.push(`${lineMatch[1]}: ${lineMatch[2].trim()}`)
      byFile.set(currentFile, list)
      continue
    }

    if (!trimmed.includes(':') || trimmed.match(/^[^:]+:\d+:/)) {
      const inline = trimmed.match(/^(.+?):(\d+):(.*)$/)
      if (inline) {
        const file = inline[1]
        const list = byFile.get(file) ?? []
        list.push(`${inline[2]}: ${inline[3].trim()}`)
        byFile.set(file, list)
        currentFile = file
        continue
      }
    }

    if (!trimmed.startsWith(' ') && !/^\d/.test(trimmed)) {
      currentFile = trimmed
      if (!byFile.has(currentFile)) byFile.set(currentFile, [])
    }
  }

  if (byFile.size === 0) return raw.trim()

  const out: string[] = []
  for (const [file, matches] of byFile) {
    out.push(`${file} (${matches.length})`)
    const preview = matches.slice(0, 5)
    for (const m of preview) out.push(`  ${m}`)
    if (matches.length > 5) out.push(`  ... +${matches.length - 5} more`)
  }
  return out.join('\n')
}
