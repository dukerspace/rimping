import { describe, expect, it } from 'bun:test'
import { findNearestSymbol, findSymbolInDiffLines } from '../../../src/git-diff/tree-sitter/fallback.js'

describe('fallback symbol extraction', () => {
  it('finds function name above hunk', () => {
    const lines = [' export function myHelper() {', '   return 1', '-  return 2']
    expect(findSymbolInDiffLines(lines)).toBe('myHelper')
  })

  it('finds class name', () => {
    const lines = [' class MyService {', '   run() {}', '+  stop() {}']
    expect(findNearestSymbol(lines, 2)).toBe('MyService')
  })

  it('returns null when no symbol', () => {
    const lines = ['+const x = 1']
    expect(findSymbolInDiffLines(lines)).toBeNull()
  })
})
