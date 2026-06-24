export function dedupeLines(text: string): string {
  const lines = text.split('\n')
  const groups = new Map<string, number>()
  const order: string[] = []

  for (const line of lines) {
    const key = line.trimEnd()
    if (!key) continue
    if (!groups.has(key)) {
      order.push(key)
      groups.set(key, 1)
    } else {
      groups.set(key, (groups.get(key) ?? 1) + 1)
    }
  }

  return order.map((line) => {
    const count = groups.get(line) ?? 1
    return count > 1 ? `${line} (×${count})` : line
  }).join('\n')
}
