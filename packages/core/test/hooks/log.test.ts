import { describe, expect, it } from 'bun:test'
import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  appendHookLog,
  buildHookLogEntry,
  clearHookLogs,
  formatHookLogSummary,
  getHooksLogPath,
  previewPrompt,
  readHookLogs,
} from '../../src/hooks/log.js'
import { DEFAULT_HOOKS } from '../../src/resolve-options.js'

describe('hooks log', () => {
  it('previewPrompt truncates long text', () => {
    const long = 'a'.repeat(250)
    expect(previewPrompt(long)).toHaveLength(201)
    expect(previewPrompt(long).endsWith('…')).toBe(true)
    expect(previewPrompt('short')).toBe('short')
  })

  it('appends and reads JSONL entries', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'rimping-hook-log-'))
    const entry = buildHookLogEntry({
      cwd,
      hooks: DEFAULT_HOOKS,
      config: { version: 1, provider: 'openai', maxTokens: 8000 },
      prompt: 'please help me refactor this service',
      extraKeys: ['conversation_id'],
      result: {
        optimized: true,
        outputLength: 20,
        stats: {
          originalTokens: 10,
          optimizedTokens: 7,
          savingsPercent: 30,
          strategiesApplied: ['filler-removal'],
          skillsUsed: ['software-engineer'],
          durationMs: 12,
          cacheHit: false,
        },
        explain: [
          {
            stage: 'skill-engine',
            tokensBefore: 10,
            tokensAfter: 9,
            detail: 'Applied skills: software-engineer',
          },
        ],
      },
    })

    await appendHookLog(cwd, entry)
    await appendHookLog(cwd, { ...entry, timestamp: '2026-01-02T00:00:00.000Z' })

    const all = await readHookLogs(cwd)
    expect(all).toHaveLength(2)

    const last = await readHookLogs(cwd, { last: 1 })
    expect(last).toHaveLength(1)
    expect(last[0]?.timestamp).toBe('2026-01-02T00:00:00.000Z')

    const raw = await readFile(getHooksLogPath(cwd), 'utf-8')
    expect(raw.split('\n').filter(Boolean)).toHaveLength(2)

    await clearHookLogs(cwd)
    expect(await readHookLogs(cwd)).toHaveLength(0)
  })

  it('formatHookLogSummary includes key fields', () => {
    const entry = buildHookLogEntry({
      cwd: '/tmp/project',
      hooks: DEFAULT_HOOKS,
      config: null,
      prompt: 'hello world',
      extraKeys: [],
      result: {
        optimized: false,
        skipped: 'too-short',
        outputLength: 11,
      },
    })

    const summary = formatHookLogSummary(entry)
    expect(summary).toContain('skipped:too-short')
    expect(summary).toContain('in:11')
    expect(summary).toContain('out:11')
  })
})
