import { describe, expect, it } from 'bun:test'
import { formatAgentLine } from '../../src/commands/doctor.js'

describe('formatAgentLine', () => {
  it('formats detected agents with evidence', () => {
    const line = formatAgentLine({
      id: 'cursor',
      name: 'Cursor',
      status: 'detected',
      evidence: ['.cursor/hooks.json'],
    })
    expect(line).toContain('✓')
    expect(line).toContain('Cursor')
    expect(line).toContain('.cursor/hooks.json')
  })

  it('formats unknown agents with notes', () => {
    const line = formatAgentLine({
      id: 'chatgpt',
      name: 'ChatGPT',
      status: 'unknown',
      evidence: [],
      notes: 'No reliable local install marker',
    })
    expect(line).toContain('?')
    expect(line).toContain('No reliable local install marker')
  })

  it('formats not_found agents', () => {
    const line = formatAgentLine({
      id: 'cline',
      name: 'Cline',
      status: 'not_found',
      evidence: [],
    })
    expect(line).toContain('✗')
    expect(line).toContain('not found')
  })
})
