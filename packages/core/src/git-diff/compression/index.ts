import type { DiffHunk } from '../../types.js'
import { filterHunks } from './filter-files.js'
import { stripContextLines } from './strip-context.js'
import { mergeAdjacentHunks } from './merge-hunks.js'
import { trimHunksToBudget } from './budget-trim.js'

export interface CompressOptions {
  maxTokens?: number
}

export function compressHunks(hunks: DiffHunk[], options: CompressOptions = {}): DiffHunk[] {
  let result = filterHunks(hunks)
  result = stripContextLines(result)
  result = mergeAdjacentHunks(result)
  result = trimHunksToBudget(result, options.maxTokens)
  return result
}

export { filterHunks, stripContextLines, mergeAdjacentHunks, trimHunksToBudget }
