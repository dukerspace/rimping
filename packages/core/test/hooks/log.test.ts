import { describe, expect, it } from 'bun:test'
import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  appendHookLog,
  aggregateHookStatsByDate,
  aggregateHookStatsByDateAndEvent,
  buildHookLogEntry,
  buildPostReadLogEntry,
  buildShellRunLogEntry,
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
      hookInput: { conversation_id: 'abc', cursor_version: '1.0.0', model: 'gpt-4' },
      result: {
        optimized: true,
        outputLength: 20,
        stats: {
          originalTokens: 10,
          optimizedTokens: 7,
          savingsPercent: 30,
          strategiesApplied: ['filler-removal'],
          skillsUsed: ['my-skill'],
          durationMs: 12,
          cacheHit: false,
        },
        explain: [
          {
            stage: 'skill-engine',
            tokensBefore: 10,
            tokensAfter: 9,
            detail: 'Applied skills: my-skill',
          },
        ],
      },
    })

    await appendHookLog(cwd, entry)
    await appendHookLog(cwd, { ...entry, timestamp: '2026-01-02T00:00:00.000Z' })

    const all = await readHookLogs(cwd)
    expect(all).toHaveLength(2)
    expect(all[0]?.agent.id).toBe('cursor')
    expect(all[0]?.agent.model).toBe('gpt-4')

    const last = await readHookLogs(cwd, { last: 1 })
    expect(last).toHaveLength(1)
    expect(last[0]?.timestamp).toBe('2026-01-02T00:00:00.000Z')

    const raw = await readFile(getHooksLogPath(cwd), 'utf-8')
    expect(raw.split('\n').filter(Boolean)).toHaveLength(2)

    await clearHookLogs(cwd)
    expect(await readHookLogs(cwd)).toHaveLength(0)
  })

  it('aggregateHookStatsByDate groups runs with stats by date', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'rimping-hook-stats-'))
    const base = buildHookLogEntry({
      cwd,
      hooks: DEFAULT_HOOKS,
      config: null,
      prompt: 'please help me refactor this service',
      extraKeys: [],
      result: {
        optimized: true,
        outputLength: 20,
        stats: {
          originalTokens: 100,
          optimizedTokens: 70,
          savingsPercent: 30,
          strategiesApplied: ['filler-removal'],
          skillsUsed: [],
          durationMs: 12,
          cacheHit: false,
        },
      },
    })

    const byDate = aggregateHookStatsByDate([
      { ...base, timestamp: '2026-06-24T10:00:00.000Z' },
      { ...base, timestamp: '2026-06-24T15:00:00.000Z' },
      { ...base, timestamp: '2026-06-23T09:00:00.000Z' },
      {
        ...base,
        timestamp: '2026-06-23T12:00:00.000Z',
        result: { optimized: false, skipped: 'too-short', outputLength: 11 },
      },
    ])

    expect(byDate).toEqual([
      { date: '2026-06-24', runs: 2, tokensSaved: 60, avgSavingsPercent: 30 },
      { date: '2026-06-23', runs: 1, tokensSaved: 30, avgSavingsPercent: 30 },
    ])
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
    expect(summary).toContain('event:pre-send')
    expect(summary).toContain('agent:Unknown')
    expect(summary).toContain('skipped:too-short')
    expect(summary).toContain('in:11')
    expect(summary).toContain('out:11')
  })

  it('logs and aggregates shell-run and post-read entries', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'rimping-hook-shell-read-'))
    const shellEntry = buildShellRunLogEntry({
      cwd,
      hooks: DEFAULT_HOOKS,
      config: null,
      command: 'git status',
      exitCode: 0,
      result: {
        optimized: true,
        stats: {
          originalTokens: 200,
          compressedTokens: 80,
          savingsPercent: 60,
          strategiesApplied: ['git-status'],
        },
      },
    })
    const postReadEntry = buildPostReadLogEntry({
      cwd,
      hooks: DEFAULT_HOOKS,
      config: null,
      filePath: 'src/foo.ts',
      result: {
        optimized: true,
        stats: {
          originalTokens: 100,
          compressedTokens: 70,
          savingsPercent: 30,
          strategiesApplied: ['strip-comments'],
        },
      },
    })

    await appendHookLog(cwd, shellEntry)
    await appendHookLog(cwd, postReadEntry)

    const all = await readHookLogs(cwd)
    expect(all).toHaveLength(2)
    expect(all[0]?.event).toBe('shell-run')
    expect(all[1]?.event).toBe('post-read')

    const byDate = aggregateHookStatsByDate(all)
    expect(byDate[0]?.tokensSaved).toBe(150)

    const byEvent = aggregateHookStatsByDateAndEvent(all)
    expect(byEvent.some((row) => row.event === 'shell-run' && row.tokensSaved === 120)).toBe(true)
    expect(byEvent.some((row) => row.event === 'post-read' && row.tokensSaved === 30)).toBe(true)

    expect(formatHookLogSummary(shellEntry)).toContain('event:shell-run')
    expect(formatHookLogSummary(shellEntry)).toContain('cmd:git status')
    expect(formatHookLogSummary(postReadEntry)).toContain('event:post-read')
    expect(formatHookLogSummary(postReadEntry)).toContain('file:src/foo.ts')
  })
})
