import { describe, expect, it } from 'bun:test'
import { inferHookAgent, inferProviderFromAgent, isPopularAiAgent } from '../../src/hooks/agent.js'
import { POPULAR_AI_AGENTS } from '../../src/agent-detect.js'

describe('inferHookAgent', () => {
  it('detects Cursor from hook payload keys', () => {
    const agent = inferHookAgent({
      prompt: 'hello',
      cursor_version: '1.2.3',
      composer_mode: 'agent',
      model: 'claude-4-sonnet',
    })

    expect(agent).toEqual({
      id: 'cursor',
      name: 'Cursor',
      model: 'claude-4-sonnet',
      version: '1.2.3',
    })
  })

  it('detects GitHub Copilot from hook payload keys', () => {
    const agent = inferHookAgent({
      prompt: 'hello',
      copilot_version: '2.0.0',
      model_id: 'gpt-4.1',
    })

    expect(agent).toEqual({
      id: 'copilot',
      name: 'GitHub Copilot',
      model: 'gpt-4.1',
      version: '2.0.0',
    })
  })

  it('detects Claude Code from hook payload keys', () => {
    const agent = inferHookAgent({
      prompt: 'hello',
      claude_session_id: 'sess-1',
      anthropic_version: '0.9.0',
    })

    expect(agent).toEqual({
      id: 'claude',
      name: 'Claude Code',
      version: '0.9.0',
    })
  })

  it('detects Gemini CLI from hook payload keys', () => {
    const agent = inferHookAgent({
      prompt: 'hello',
      gemini_version: '1.0.0',
      model: 'gemini-2.5-pro',
    })

    expect(agent).toEqual({
      id: 'gemini',
      name: 'Gemini CLI',
      model: 'gemini-2.5-pro',
      version: '1.0.0',
    })
  })

  it('detects ChatGPT from hook payload keys', () => {
    const agent = inferHookAgent({
      prompt: 'hello',
      chatgpt_session: 'sess-1',
    })

    expect(agent).toEqual({
      id: 'chatgpt',
      name: 'ChatGPT',
    })
  })

  it('returns unknown when no agent markers are present', () => {
    expect(inferHookAgent({ prompt: 'hello' })).toEqual({
      id: 'unknown',
      name: 'Unknown',
    })
  })
})

describe('inferProviderFromAgent', () => {
  it('maps known agents to provider adapters', () => {
    expect(inferProviderFromAgent('claude')).toBe('claude')
    expect(inferProviderFromAgent('gemini')).toBe('gemini')
    expect(inferProviderFromAgent('cursor')).toBeUndefined()
  })
})

describe('POPULAR_AI_AGENTS', () => {
  it('lists the popular AI agents with display names', () => {
    expect(POPULAR_AI_AGENTS).toEqual([
      { id: 'cursor', name: 'Cursor' },
      { id: 'copilot', name: 'GitHub Copilot' },
      { id: 'claude', name: 'Claude Code' },
      { id: 'chatgpt', name: 'ChatGPT' },
      { id: 'gemini', name: 'Gemini CLI' },
    ])
  })

  it('flags popular agents', () => {
    expect(isPopularAiAgent('cursor')).toBe(true)
    expect(isPopularAiAgent('aider')).toBe(false)
    expect(isPopularAiAgent('unknown')).toBe(false)
  })
})
