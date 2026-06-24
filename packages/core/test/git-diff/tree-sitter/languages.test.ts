import { describe, expect, it } from 'bun:test'
import { isTreeSitterSupported, languageFromPath } from '../../../src/git-diff/tree-sitter/languages.js'

describe('languages', () => {
  it('maps typescript extensions', () => {
    expect(languageFromPath('src/a.ts')).toBe('typescript')
    expect(languageFromPath('src/a.tsx')).toBe('tsx')
    expect(languageFromPath('src/a.js')).toBe('javascript')
  })

  it('returns null for unknown extensions', () => {
    expect(languageFromPath('README')).toBeNull()
    expect(languageFromPath('file.md')).toBeNull()
  })

  it('detects tree-sitter supported languages', () => {
    expect(isTreeSitterSupported('a.ts')).toBe(true)
    expect(isTreeSitterSupported('a.py')).toBe(false)
  })
})
