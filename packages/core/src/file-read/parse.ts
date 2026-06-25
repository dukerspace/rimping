const READ_PATH_KEYS = ['path', 'target_file', 'file_path', 'filePath', 'file'] as const

export function extractReadPath(toolInput: Record<string, unknown> | undefined): string | null {
  if (!toolInput) return null
  for (const key of READ_PATH_KEYS) {
    const value = toolInput[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export function extractReadLimit(toolInput: Record<string, unknown> | undefined): number | null {
  if (!toolInput || toolInput.limit === undefined) return null
  const limit = Number(toolInput.limit)
  return Number.isFinite(limit) && limit > 0 ? limit : null
}

export function extractReadContent(toolOutput: string | undefined): string | null {
  if (!toolOutput?.trim()) return null

  try {
    const parsed = JSON.parse(toolOutput) as unknown
    if (typeof parsed === 'string') return parsed
    if (!parsed || typeof parsed !== 'object') return toolOutput

    const obj = parsed as Record<string, unknown>
    for (const key of ['content', 'text', 'body', 'data']) {
      const value = obj[key]
      if (typeof value === 'string') return value
    }
  } catch {
    return toolOutput
  }

  return toolOutput
}
