export interface ParsedFrontmatter {
  meta: Record<string, string | string[] | number>
  body: string
}

function parseYamlValue(value: string): string | string[] | number {
  const trimmed = value.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))
  }
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  return trimmed.replace(/^["']|["']$/g, '')
}

export function parseFrontmatter(content: string): ParsedFrontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { meta: {}, body: content }

  const meta: Record<string, string | string[] | number> = {}
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1)
    meta[key] = parseYamlValue(value)
  }

  return { meta, body: match[2] }
}

export function extractSection(body: string, heading: string): string {
  const re = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i')
  const match = body.match(re)
  return match ? match[1].trim() : ''
}

export function extractRules(section: string): string[] {
  return section
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}
