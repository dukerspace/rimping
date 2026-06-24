import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { initCommand } from '../../src/commands/init.js'
import { hooksInitCommand } from '../../src/commands/hooks-init.js'
import { skillsInitCommand } from '../../src/commands/skills-init.js'
import { captureConsole, runCommand } from '../helpers/run-command.js'

describe('init command', () => {
  let tempDir: string
  let consoleCapture: ReturnType<typeof captureConsole>

  afterEach(async () => {
    consoleCapture?.restore()
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('dry-run json reports files to create', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-init-'))
    consoleCapture = captureConsole()

    await runCommand(initCommand, {
      cwd: tempDir,
      json: true,
      'dry-run': true,
      force: false,
      'no-detect': true,
      'no-hooks': true,
    })

    const result = JSON.parse(consoleCapture.logs[0]!)
    expect(result.created.some((path: string) => path.endsWith('.rimping/config.json'))).toBe(true)
    expect(result.skipped).toEqual([])
  })
})

describe('hooks init command', () => {
  let tempDir: string
  let consoleCapture: ReturnType<typeof captureConsole>

  afterEach(async () => {
    consoleCapture?.restore()
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('dry-run json reports cursor hook files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-hooks-init-'))
    consoleCapture = captureConsole()

    await runCommand(hooksInitCommand, {
      cwd: tempDir,
      json: true,
      dryRun: true,
      force: false,
    })

    const result = JSON.parse(consoleCapture.logs[0]!)
    expect(result.created).toContain('.cursor/hooks.json')
  })
})

describe('skills init command', () => {
  let tempDir: string
  let consoleCapture: ReturnType<typeof captureConsole>

  afterEach(async () => {
    consoleCapture?.restore()
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('dry-run json reports agent skill file', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-skills-init-'))
    consoleCapture = captureConsole()

    await runCommand(skillsInitCommand, {
      cwd: tempDir,
      json: true,
      dryRun: true,
      force: false,
    })

    const result = JSON.parse(consoleCapture.logs[0]!)
    expect(
      result.created.some((path: string) =>
        path.endsWith('.agents/skills/rimping-guidelines/SKILL.md'),
      ),
    ).toBe(true)
  })
})
