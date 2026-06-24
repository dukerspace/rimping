import { describe, expect, it } from 'bun:test'
import { extractRules, extractSection, parseFrontmatter } from '../../src/utils/markdown.js'

describe('parseFrontmatter', () => {
  it('parses yaml frontmatter and body', () => {
    const content = `---
id: my-skill
tags: [a, b]
priority: 10
---
## Goal
Do things.
`
    const { meta, body } = parseFrontmatter(content)
    expect(meta.id).toBe('my-skill')
    expect(meta.tags).toEqual(['a', 'b'])
    expect(meta.priority).toBe(10)
    expect(body).toContain('## Goal')
  })

  it('returns empty meta when frontmatter is missing', () => {
    const { meta, body } = parseFrontmatter('plain markdown')
    expect(meta).toEqual({})
    expect(body).toBe('plain markdown')
  })
})

describe('extractSection', () => {
  it('extracts a named section', () => {
    const body = '## Goal\nBuild fast.\n\n## Rules\n- Be terse'
    expect(extractSection(body, 'Goal')).toBe('Build fast.')
    expect(extractSection(body, 'Rules')).toBe('- Be terse')
  })

  it('returns empty string for missing section', () => {
    expect(extractSection('## Goal\nx', 'Missing')).toBe('')
  })
})

describe('extractRules', () => {
  it('strips bullet prefixes', () => {
    expect(extractRules('- one\n* two\nplain')).toEqual(['one', 'two', 'plain'])
  })
})
