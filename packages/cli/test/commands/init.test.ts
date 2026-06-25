import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { initCommand } from '../../src/commands/init.js'
import { hooksInitCommand } from '../../src/commands/hooks-init.js'
import { skillsInitCommand } from '../../src/commands/skills-init.js'
import { captureConsole, runCommand } from '../helpers/run-command.js'
import { mergeHooksConfig } from '@rimping/core'

describe('init command', () => {
  let tempDir: string
  let consoleCapture: ReturnType<typeof captureConsole>

  afterEach(async () => {
    consoleCapture?.restore()
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('dry-run json reports project config files to create', async () => {
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
    expect(mergeHooksConfig(result.config, 'cursor').optimizeOnSubmit).toBe(true)
    expect(result.skipped).toEqual([])
  })

  it('dry-run json reports global config path with -g', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-init-'))
    consoleCapture = captureConsole()

    await runCommand(initCommand, {
      cwd: tempDir,
      global: true,
      json: true,
      'dry-run': true,
      force: false,
      'no-detect': true,
      'no-hooks': true,
    })

    const result = JSON.parse(consoleCapture.logs[0]!)
    expect(result.path).toContain('.rimping/config.json')
    expect(result.config.version).toBe(1)
    expect(mergeHooksConfig(result.config, 'cursor').optimizeOnSubmit).toBe(true)
    expect(
      result.created.length + result.updated.length + result.skipped.length,
    ).toBeGreaterThan(0)
  })

  it('dry-run json skips when existing config is up to date', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-init-'))
    consoleCapture = captureConsole()

    await runCommand(initCommand, {
      cwd: tempDir,
      json: true,
      'dry-run': false,
      force: false,
      'no-detect': true,
      'no-hooks': true,
    })

    consoleCapture.restore()
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
    expect(result.updated).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)
    expect(mergeHooksConfig(result.config, 'cursor').enabled).toBe(false)
  })

  it('dry-run json updates config and cursor hooks like hooks init', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-init-hooks-'))
    consoleCapture = captureConsole()

    await runCommand(initCommand, {
      cwd: tempDir,
      json: true,
      'dry-run': true,
      force: false,
      'no-detect': true,
    })

    const result = JSON.parse(consoleCapture.logs[0]!)
    expect(result.hooks.created).toContain('.cursor/hooks.json')
    expect(result.hooks.created.length).toBeGreaterThan(1)
    expect(result.config.created.some((path: string) => path.endsWith('.rimping/config.json'))).toBe(
      true,
    )
    expect(result.config.config.agents?.cursor?.hooks).toBeUndefined()
    expect(mergeHooksConfig(result.config.config, 'cursor').optimizeOnSubmit).toBe(true)
    expect(Array.isArray(result.agents)).toBe(true)
  })
})

describe('hooks init command', () => {
  let tempDir: string
  let consoleCapture: ReturnType<typeof captureConsole>

  afterEach(async () => {
    consoleCapture?.restore()
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('dry-run json reports cursor hook files and config', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-hooks-init-'))
    consoleCapture = captureConsole()

    await runCommand(hooksInitCommand, {
      cwd: tempDir,
      json: true,
      dryRun: true,
      force: false,
      'no-detect': true,
    })

    const result = JSON.parse(consoleCapture.logs[0]!)
    expect(result.hooks.created).toContain('.cursor/hooks.json')
    expect(result.hooks.created.length).toBeGreaterThan(1)
    expect(result.config.created.some((path: string) => path.endsWith('.rimping/config.json'))).toBe(
      true,
    )
    expect(result.config.config.provider).toBeUndefined()
    expect(result.config.config.hooks?.enabled).toBe(true)
    expect(result.config.config.read?.autoLimit).toBe(true)
    expect(Array.isArray(result.agents)).toBe(true)
  })

  it('includes full config in json output', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-cli-hooks-init-json-'))
    consoleCapture = captureConsole()

    await runCommand(hooksInitCommand, {
      cwd: tempDir,
      json: true,
      dryRun: true,
      force: false,
      'no-detect': true,
    })

    const result = JSON.parse(consoleCapture.logs[0]!)
    expect(result.config.config.shell?.enabled).toBe(true)
    expect(mergeHooksConfig(result.config.config, 'cursor').optimizeOnSubmit).toBe(true)
    expect(result.detectedAgents).toEqual([])
    expect(result.agents.length).toBeGreaterThanOrEqual(10)
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
