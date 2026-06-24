import type { DiffHunk } from '../../types.js'

const SKIP_PATTERNS = [
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /bun\.lockb$/,
  /pnpm-lock\.yaml$/,
  /^dist\//,
  /^node_modules\//,
  /^\.turbo\//,
  /\.min\.(js|css)$/,
  /\.map$/,
]

export function shouldSkipFile(file: string): boolean {
  if (!file) return true
  return SKIP_PATTERNS.some((p) => p.test(file))
}

export function filterHunks(hunks: DiffHunk[]): DiffHunk[] {
  return hunks.filter((h) => !shouldSkipFile(h.file))
}
