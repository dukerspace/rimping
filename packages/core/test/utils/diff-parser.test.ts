import { describe, expect, it } from 'bun:test'
import type { DiffHunk } from '../../src/types.js'
import { reduceDiffHunks } from '../../src/utils/diff-parser.js'

const hunk = (file: string, lines: string[]): DiffHunk => ({
  file,
  oldStart: 1,
  newStart: 1,
  lines,
})

describe('reduceDiffHunks', () => {
  it('groups hunks by file and skips lock suffix files', () => {
    const result = reduceDiffHunks([
      hunk('src/a.ts', ['@@ -1 +1 @@', ' function foo() {', '-old', '+new']),
      hunk('yarn.lock', ['+x']),
    ])
    expect(result).toContain('### src/a.ts (foo)')
    expect(result).not.toContain('yarn.lock')
  })

  it('omits hunk headers from content', () => {
    const result = reduceDiffHunks([hunk('a.ts', ['@@ -1 +1 @@', '-old', '+new'])])
    expect(result).not.toContain('@@ -1 +1 @@')
    expect(result).toContain('-old')
    expect(result).toContain('+new')
  })
})
