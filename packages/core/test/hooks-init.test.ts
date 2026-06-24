import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { AGENT_HOOK_SPECS } from '../src/agent-hook-specs.js'
import { checkCursorHooks, initAgentHooks, initCursorHooks } from '../src/hooks-init.js'

describe('initAgentHooks', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('creates all project-local agent hook files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-agent-hooks-'))
    const templates = Object.fromEntries(
      AGENT_HOOK_SPECS.map((spec) => [spec.id, `{"agent":"${spec.id}"}`]),
    )

    const result = await initAgentHooks({
      cwd: tempDir,
      templates,
    })

    for (const spec of AGENT_HOOK_SPECS) {
      if (!spec.projectPath) continue
      expect(result.created).toContain(spec.projectPath)
    }
    expect(result.created.length).toBe(AGENT_HOOK_SPECS.length)
  })

  it('creates only global hook files with global: true', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-agent-hooks-global-'))
    const homeDir = join(tempDir, 'home')
    await mkdir(homeDir, { recursive: true })

    const templates = Object.fromEntries(
      AGENT_HOOK_SPECS.map((spec) => [spec.id, `{"agent":"${spec.id}"}`]),
    )

    const result = await initAgentHooks({
      root: homeDir,
      global: true,
      templates,
    })

    const globalSpecs = AGENT_HOOK_SPECS.filter((spec) => spec.globalPath)
    expect(result.created.length).toBe(globalSpecs.length)
    for (const spec of globalSpecs) {
      expect(result.created).toContain('~/' + spec.globalPath!)
    }
    expect(result.created).not.toContain('.github/hooks/lek-optimize.json')
  })

  it('merges hooks into existing claude settings without force', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-agent-hooks-merge-'))
    await mkdir(join(tempDir, '.claude'), { recursive: true })
    await writeFile(
      join(tempDir, '.claude/settings.local.json'),
      JSON.stringify({ permissions: { allow: ['Bash'] } }, null, 2),
    )

    const result = await initAgentHooks({
      cwd: tempDir,
      templates: {
        claude: JSON.stringify({
          hooks: {
            PreToolUse: [
              {
                matcher: 'Bash',
                hooks: [{ type: 'command', command: 'rimping hooks pre-shell' }],
              },
            ],
          },
        }),
      },
      agents: ['claude'],
    })

    expect(result.created).toContain('.claude/settings.local.json')
    const merged = JSON.parse(await readFile(join(tempDir, '.claude/settings.local.json'), 'utf-8'))
    expect(merged.permissions.allow).toEqual(['Bash'])
    expect(merged.hooks.PreToolUse).toHaveLength(1)
  })
})

describe('initCursorHooks', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('creates hooks.json', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-hooks-'))
    const result = await initCursorHooks({
      cwd: tempDir,
      hooksJsonTemplate: '{"version":1,"hooks":{}}',
    })

    expect(result.created).toEqual(['.cursor/hooks.json'])

    const hooksJson = await readFile(join(tempDir, '.cursor/hooks.json'), 'utf-8')
    expect(hooksJson).toContain('version')
  })

  it('skips existing hooks.json without force', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-hooks-'))
    await initCursorHooks({
      cwd: tempDir,
      hooksJsonTemplate: 'v1',
      templates: { cursor: 'v1' },
    })
    const result = await initCursorHooks({
      cwd: tempDir,
      hooksJsonTemplate: 'v2',
      templates: { cursor: 'v2' },
    })
    expect(result.skipped).toContain('.cursor/hooks.json')
    const content = await readFile(join(tempDir, '.cursor/hooks.json'), 'utf-8')
    expect(content).toBe('v1')
  })
})

describe('checkCursorHooks', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('detects rimping cli hook command', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-hooks-check-'))
    await mkdir(join(tempDir, '.cursor'), { recursive: true })
    await writeFile(
      join(tempDir, '.cursor/hooks.json'),
      JSON.stringify({
        version: 1,
        hooks: {
          beforeSubmitPrompt: [{ command: 'rimping hooks pre-send', timeout: 5 }],
        },
      }),
    )

    const status = await checkCursorHooks(tempDir)
    expect(status.hooksJson).toBe(true)
    expect(status.beforeSubmitRegistered).toBe(true)
    expect(status.preSend).toBe(true)
  })

  it('detects pre-shell hook registration', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-hooks-preshell-'))
    await mkdir(join(tempDir, '.cursor'), { recursive: true })
    await writeFile(
      join(tempDir, '.cursor/hooks.json'),
      JSON.stringify({
        version: 1,
        hooks: {
          preToolUse: [{ command: 'rimping hooks pre-shell', matcher: 'Shell', timeout: 10 }],
        },
      }),
    )

    const status = await checkCursorHooks(tempDir)
    expect(status.preToolUseRegistered).toBe(true)
    expect(status.preShell).toBe(true)
  })

  it('detects pre-read and post-read hook registration', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-hooks-read-'))
    await mkdir(join(tempDir, '.cursor'), { recursive: true })
    await writeFile(
      join(tempDir, '.cursor/hooks.json'),
      JSON.stringify({
        version: 1,
        hooks: {
          preToolUse: [{ command: 'rimping hooks pre-read', matcher: 'Read', timeout: 10 }],
          postToolUse: [{ command: 'rimping hooks post-read', matcher: 'Read', timeout: 10 }],
        },
      }),
    )

    const status = await checkCursorHooks(tempDir)
    expect(status.preRead).toBe(true)
    expect(status.postRead).toBe(true)
    expect(status.postToolUseRegistered).toBe(true)
  })
})
