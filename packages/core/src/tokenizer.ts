const CODE_BLOCK_RE = /```[\s\S]*?```/g
const CHARS_PER_TOKEN = 3.5
const CODE_BOOST = 1.2

export function estimateTokens(text: string): number {
  if (!text) return 0

  const codeBlocks = text.match(CODE_BLOCK_RE) ?? []
  const codeChars = codeBlocks.reduce((sum, block) => sum + block.length, 0)
  const proseChars = text.length - codeChars

  const proseTokens = Math.ceil(proseChars / CHARS_PER_TOKEN)
  const codeTokens = Math.ceil((codeChars / CHARS_PER_TOKEN) * CODE_BOOST)

  return proseTokens + codeTokens
}

export function tokenSavingsPercent(before: number, after: number): number {
  if (before === 0) return 0
  return Math.round(((before - after) / before) * 100)
}
