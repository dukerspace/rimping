import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { formatStatsLine, runCursorPreSendHook } from '../../src/commands/hooks-pre-send.js'
import { captureConsole } from '../helpers/run-command.js'

describe('formatStatsLine', () => {
  it('formats token savings summary', () => {
    const line = formatStatsLine({
      originalTokens: 100,
      optimizedTokens: 60,
      savingsPercent: 40,
      durationMs: 12,
    })
    expect(line).toBe('[rimping] 100→60 (-40%) 12ms')
  })
})

describe('runCursorPreSendHook', () => {
  let tempDir: string
  let stdinSpy: ReturnType<typeof spyOn>
  let consoleCapture: ReturnType<typeof captureConsole>
  const originalCwd = process.cwd()

  afterEach(async () => {
    stdinSpy?.mockRestore()
    consoleCapture?.restore()
    process.chdir(originalCwd)
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  async function setupProject(config: Record<string, unknown> = { version: 1, hooks: { enabled: false } }) {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-hook-'))
    await mkdir(join(tempDir, '.rimping'), { recursive: true })
    await writeFile(join(tempDir, '.rimping/config.json'), JSON.stringify(config))
    process.chdir(tempDir)
  }

  it('passes through non-JSON stdin as prompt wrapper', async () => {
    await setupProject()
    stdinSpy = spyOn(Bun.stdin, 'text').mockResolvedValue('plain prompt text')
    consoleCapture = captureConsole()

    await runCursorPreSendHook()

    expect(JSON.parse(consoleCapture.logs[0]!)).toEqual({ prompt: 'plain prompt text' })
  })

  it('returns input unchanged when prompt is empty', async () => {
    await setupProject()
    const input = { prompt: '   ', conversation_id: 'abc' }
    stdinSpy = spyOn(Bun.stdin, 'text').mockResolvedValue(JSON.stringify(input))
    consoleCapture = captureConsole()

    await runCursorPreSendHook()

    expect(JSON.parse(consoleCapture.logs[0]!)).toEqual(input)
  })

  it('optimizes verbose prompts when hooks are enabled', async () => {
    await setupProject({
      version: 1,
      hooks: { enabled: true, optimizeOnSubmit: true, minPromptLength: 10, minSavingsPercent: 0 },
    })
    const input = {
      prompt:
        'please could you kindly help me refactor this typescript service with dependency injection',
      conversation_id: 'abc',
    }
    stdinSpy = spyOn(Bun.stdin, 'text').mockResolvedValue(JSON.stringify(input))
    consoleCapture = captureConsole()

    await runCursorPreSendHook()

    const output = JSON.parse(consoleCapture.logs[0]!) as typeof input
    expect(output.prompt.length).toBeLessThan(input.prompt.length)
    expect(output.user_message).toBe(output.prompt)
    expect(output.conversation_id).toBe('abc')
  })

  it('returns original prompt on optimization error', async () => {
    await setupProject({
      version: 1,
      hooks: {
        enabled: true,
        optimizeOnSubmit: true,
        minPromptLength: 10,
        minSavingsPercent: 0,
        logStats: true,
      },
    })
    const input = { user_message: 'please could you help me refactor this code for a long time' }
    stdinSpy = spyOn(Bun.stdin, 'text').mockResolvedValue(JSON.stringify(input))
    consoleCapture = captureConsole()

    const optimizeSpy = spyOn(await import('@rimping/core'), 'preSend').mockRejectedValue(
      new Error('boom'),
    )

    try {
      await runCursorPreSendHook()
      expect(JSON.parse(consoleCapture.logs[0]!)).toEqual(input)
      expect(consoleCapture.errors.some((line) => line.includes('skipped: error'))).toBe(true)
    } finally {
      optimizeSpy.mockRestore()
    }
  })
})
