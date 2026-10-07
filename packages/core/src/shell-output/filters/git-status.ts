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
  let branch = ''
  let staged = 0
  let unstaged = 0
  let untracked = 0
  const files: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || HINT_RE.test(line) || NO_CHANGES_RE.test(trimmed)) continue

    if (trimmed.startsWith('On branch ')) {
      branch = trimmed.slice('On branch '.length).trim()
      continue
    }
    if (trimmed.startsWith('Your branch is ')) continue

    const section = SECTION_MARKERS.find((s) => trimmed === s)
    if (section) {
      currentSection = section
      continue
    }

    const statusMatch = trimmed.match(/^(modified|new file|deleted|renamed|added):\s+(.+)$/)
    if (statusMatch && currentSection) {
      if (currentSection === 'Changes to be committed:') {
        staged += 1
      } else if (currentSection === 'Changes not staged for commit:') {
        unstaged += 1
      }
      const prefix = STATUS_PREFIX[statusMatch[1]!] ?? '?'
      files.push(`${prefix} ${statusMatch[2]!.trim()}`)
      continue
    }

    if (currentSection === 'Untracked files:' && !trimmed.includes(':')) {
      untracked += 1
      files.push(`? ${trimmed}`)
    }
  }

  const total = staged + unstaged + untracked
  if (branch) out.push(`branch:${branch}`)
  if (total === 0) {
    if (out.length === 0) return raw.trim()
    out.push('clean')
    return out.join('\n')
  }

  if (staged > 0) out.push(`staged:${staged}`)
  if (unstaged > 0) out.push(`unstaged:${unstaged}`)
  if (untracked > 0) out.push(`untracked:${untracked}`)
  out.push(...files)

  if (out.length === 0) return raw.trim()
  return out.join('\n')
}
