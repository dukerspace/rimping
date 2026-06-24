import { describe, expect, it } from 'bun:test'
import type { DiffHunk } from '../../../src/types.js'
import { filterHunks } from '../../../src/git-diff/compression/filter-files.js'
import { stripContextLines } from '../../../src/git-diff/compression/strip-context.js'
import { mergeAdjacentHunks } from '../../../src/git-diff/compression/merge-hunks.js'
import { trimHunksToBudget } from '../../../src/git-diff/compression/budget-trim.js'
import { compressHunks } from '../../../src/git-diff/compression/index.js'

const hunk = (file: string, lines: string[]): DiffHunk => ({
  file,
  oldStart: 1,
  newStart: 1,
  lines,
})

describe('compression', () => {
  it('filters lock files', () => {
    const hunks = [
      hunk('src/a.ts', ['+x']),
      hunk('package-lock.json', ['+y']),
    ]
    expect(filterHunks(hunks)).toHaveLength(1)
    expect(filterHunks(hunks)[0].file).toBe('src/a.ts')
  })

  it('strips context lines', () => {
    const hunks = [
      hunk('a.ts', ['@@ -1 +1 @@', ' context', '-old', '+new']),
    ]
    const stripped = stripContextLines(hunks)
    expect(stripped[0].lines).toEqual(['@@ -1 +1 @@', '-old', '+new'])
  })

  it('compresses through pipeline', () => {
    const hunks = [
      hunk('dist/out.js', ['+x']),
      hunk('src/a.ts', ['@@ -1 +1 @@', ' ctx', '-a', '+b']),
    ]
    const result = compressHunks(hunks)
    expect(result).toHaveLength(1)
    expect(result[0].file).toBe('src/a.ts')
  })

  it('merges adjacent hunks in same file', () => {
    const hunks = [
      hunk('a.ts', ['@@ -1 +1 @@', '-a', '+b']),
      hunk('a.ts', ['@@ -5 +5 @@', '-c', '+d']),
    ]
    const merged = mergeAdjacentHunks(hunks)
    expect(merged).toHaveLength(1)
  })

  it('trims hunks to token budget', () => {
    const hunks = [
      hunk('src/a.ts', ['@@ -1 +1 @@', '+small']),
      hunk('src/b.ts', ['@@ -1 +1 @@', ...Array.from({ length: 20 }, (_, i) => `+line ${i}`)]),
    ]
    const trimmed = trimHunksToBudget(hunks, 8)
    expect(trimmed).toHaveLength(1)
    expect(trimmed[0].file).toBe('src/a.ts')
  })

  it('returns all hunks when no budget is set', () => {
    const hunks = [hunk('a.ts', ['+x']), hunk('b.ts', ['+y'])]
    expect(trimHunksToBudget(hunks)).toHaveLength(2)
  })
})
