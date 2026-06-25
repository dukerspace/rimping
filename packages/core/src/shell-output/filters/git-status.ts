const HINT_RE = /^\s*\(use "git /
const NO_CHANGES_RE = /^no changes added to commit/

const SECTION_MARKERS = [
  'Changes not staged for commit:',
  'Changes to be committed:',
  'Untracked files:',
] as const

const STATUS_PREFIX: Record<string, string> = {
  modified: 'M',
  'new file': 'A',
  deleted: 'D',
  renamed: 'R',
  added: 'A',
}

export function compressGitStatus(raw: string): string {
  const lines = raw.split('\n')
  const out: string[] = []
  let currentSection = ''
  const files: string[] = []

  function flushFiles() {
    if (files.length === 0) return
    for (const f of files) out.push(f)
    files.length = 0
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || HINT_RE.test(line) || NO_CHANGES_RE.test(trimmed)) continue

    if (trimmed.startsWith('On branch ')) {
      out.push(trimmed)
      continue
    }
    if (trimmed.startsWith('Your branch is ')) continue

    const section = SECTION_MARKERS.find((s) => trimmed === s)
    if (section) {
      flushFiles()
      currentSection = section
      out.push(section)
      continue
    }

    const statusMatch = trimmed.match(/^(modified|new file|deleted|renamed|added):\s+(.+)$/)
    if (statusMatch && currentSection) {
      const prefix = STATUS_PREFIX[statusMatch[1]] ?? '?'
      files.push(`${prefix} ${statusMatch[2].trim()}`)
      continue
    }

    if (currentSection === 'Untracked files:' && !trimmed.includes(':')) {
      files.push(`? ${trimmed}`)
    }
  }

  flushFiles()

  if (out.length === 0) return raw.trim()
  return out.join('\n')
}
