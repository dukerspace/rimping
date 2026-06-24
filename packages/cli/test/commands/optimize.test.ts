import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { optimizeCommand } from '../../src/commands/optimize.js'
import { captureConsole, runCommand } from '../helpers/run-command.js'

describe('optimize command', () => {
  let tempDir: string
  let consoleCapture: ReturnType<typeof captureConsole>

  afterEach(async () => {
    consoleCapture?.restore()
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('optimizes a verbose prompt and prints stats', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-optimize-'))
    await mkdir(join(tempDir, '.rimping'), { recursive: true })
    await writeFile(join(tempDir, '.rimping/config.json'), JSON.stringify({ version: 1 }))
    consoleCapture = captureConsole()

    await runCommand(optimizeCommand, {
      cwd: tempDir,
      prompt: 'please could you help me refactor this typescript code',
      'no-cache': true,
      explain: false,
      json: false,
      stdin: false,
    })

    const optimized = consoleCapture.logs[0]!
    expect(optimized.length).toBeLessThan('please could you help me refactor this typescript code'.length)
    expect(optimized.toLowerCase()).not.toContain('please')
  })

  it('outputs json result when --json is set', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-optimize-'))
    consoleCapture = captureConsole()

    await runCommand(optimizeCommand, {
      cwd: tempDir,
      prompt: 'please could you help me fix this bug',
      'no-cache': true,
      json: true,
      explain: false,
      stdin: false,
    })

    const result = JSON.parse(consoleCapture.logs[0]!)
    expect(result.optimized).toBeTruthy()
    expect(result.stats.originalTokens).toBeGreaterThan(0)
    expect(result.stats.optimizedTokens).toBeLessThanOrEqual(result.stats.originalTokens)
  })
})
