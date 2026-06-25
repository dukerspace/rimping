import { describe, expect, it } from 'bun:test'
import {
  buildInitConfig,
  formatAgentHooksStatus,
  formatAgentHookStatusLine,
  formatConfigStatus,
  formatHooksBrief,
} from '../src/config-init.js'
import type { AgentProbeResult } from '../src/agent-detect.js'

describe('formatHooksBrief', () => {
  it('describes enabled hook features', () => {
    expect(formatHooksBrief({ enabled: true, optimizeOnSubmit: true, logStats: true })).toBe(
      'hooks: optimizeOnSubmit, logStats',
    )
    expect(formatHooksBrief({ enabled: false })).toBe('hooks disabled')
  })
})

describe('formatAgentHookStatusLine', () => {
  it('includes detection evidence and hook settings', () => {
    const probe: AgentProbeResult = {
      id: 'gemini',
      name: 'Gemini CLI',
      status: 'detected',
      evidence: ['gemini CLI', '~/.gemini/'],
    }
    const line = formatAgentHookStatusLine(probe, {
      enabled: true,
      hooks: { enabled: true, optimizeOnSubmit: true },
    })
    expect(line).toContain('Gemini CLI')
    expect(line).toContain('detected')
    expect(line).toContain('gemini CLI')
    expect(line).toContain('agent on')
    expect(line).toContain('optimizeOnSubmit')
  })
})

describe('formatAgentHooksStatus', () => {
  it('lists all known agents with hook settings', () => {
    const config = buildInitConfig(['cursor', 'claude', 'gemini', 'antigravity'])
    const agents: AgentProbeResult[] = [
      { id: 'cursor', name: 'Cursor', status: 'detected', evidence: ['.cursor/'] },
      { id: 'claude', name: 'Claude Code', status: 'detected', evidence: ['claude CLI'] },
      { id: 'gemini', name: 'Gemini CLI', status: 'detected', evidence: ['gemini CLI'] },
      { id: 'antigravity', name: 'Antigravity', status: 'detected', evidence: ['~/.antigravity/'] },
      { id: 'codex', name: 'OpenAI Codex', status: 'not_found', evidence: [] },
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        status: 'unknown',
        evidence: [],
        notes: 'No reliable local install marker',
      },
    ]

    const lines = formatAgentHooksStatus(config, agents)
    expect(lines.length).toBeGreaterThanOrEqual(10)
    expect(lines.some((line) => line.includes('Cursor') && line.includes('detected'))).toBe(true)
    expect(lines.some((line) => line.includes('Gemini CLI') && line.includes('agent on'))).toBe(true)
    expect(lines.some((line) => line.includes('OpenAI Codex') && line.includes('not found'))).toBe(
      true,
    )
    expect(lines.some((line) => line.includes('ChatGPT') && line.includes('unknown'))).toBe(true)
  })
})

describe('formatConfigStatus', () => {
  it('includes hook settings without default provider', () => {
    const config = buildInitConfig(['cursor', 'claude'])
    const lines = formatConfigStatus(config, { detectedAgents: ['cursor', 'claude'] })

    expect(lines.some((line) => line.startsWith('provider:'))).toBe(false)
    expect(lines.some((line) => line.startsWith('hooks: enabled'))).toBe(true)
    expect(lines.some((line) => line.startsWith('shell: enabled'))).toBe(true)
    expect(lines.some((line) => line.startsWith('read: enabled'))).toBe(true)
    expect(lines.some((line) => line.includes('detected on machine: cursor, claude'))).toBe(true)
    expect(lines.some((line) => line.includes('enabled in config: cursor, claude'))).toBe(true)
  })
})
