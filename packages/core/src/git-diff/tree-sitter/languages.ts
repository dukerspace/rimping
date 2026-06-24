const EXTENSION_LANG: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
}

export function languageFromPath(filePath: string): string | null {
  const dot = filePath.lastIndexOf('.')
  if (dot === -1) return null
  return EXTENSION_LANG[filePath.slice(dot)] ?? null
}

export function isTreeSitterSupported(filePath: string): boolean {
  const lang = languageFromPath(filePath)
  return lang === 'typescript' || lang === 'tsx' || lang === 'javascript'
}
