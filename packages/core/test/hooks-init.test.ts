import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AGENT_HOOK_SPECS } from '../src/agent-hook-specs.js'
import {
  checkCursorHooks,
  initAgentHooks,
  initCursorHooks,
  removeLegacyAgentHooks,
} from '../src/hooks-init.js'

/** Workspace temp — sandbox blocks creating `.cursor` under system tmp. */
const TEST_TMP = join(fileURLToPath(new URL('../../..', import.meta.url)), '.tmp', 'hooks-init')

describe('initAgentHooks', () => {
  let tempDir: string

  beforeAll(async () => {
    await mkdir(TEST_TMP, { recursive: true })
  })

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('creates all project-local agent hook files', async () => {
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-agent-hooks-'))
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
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-agent-hooks-global-'))
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
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-agent-hooks-merge-'))
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

  beforeAll(async () => {
    await mkdir(TEST_TMP, { recursive: true })
  })

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('creates hooks.json', async () => {
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-hooks-'))
    const result = await initCursorHooks({
      cwd: tempDir,
      hooksJsonTemplate: '{"version":1,"hooks":{}}',
    })

    expect(result.created).toEqual(['.cursor/hooks.json'])

    const hooksJson = await readFile(join(tempDir, '.cursor/hooks.json'), 'utf-8')
    expect(hooksJson).toContain('version')
  })

  it('skips existing hooks.json without force', async () => {
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-hooks-'))
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

  beforeAll(async () => {
    await mkdir(TEST_TMP, { recursive: true })
  })

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('detects rimping cli hook command', async () => {
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-hooks-check-'))
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
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-hooks-preshell-'))
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
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-hooks-read-'))
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

describe('removeLegacyAgentHooks', () => {
  let tempDir: string

  beforeAll(async () => {
    await mkdir(TEST_TMP, { recursive: true })
  })

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('deletes copilot lek-optimize.json when it has rimping hooks', async () => {
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-legacy-copilot-'))
    await mkdir(join(tempDir, '.github/hooks'), { recursive: true })
    await writeFile(
      join(tempDir, '.github/hooks/lek-optimize.json'),
      JSON.stringify({
        version: 1,
        hooks: {
          preToolUse: [{ type: 'command', bash: 'rimping hooks pre-shell' }],
        },
      }),
    )

    const removed = await removeLegacyAgentHooks({ root: tempDir })

    expect(removed).toContain('.github/hooks/lek-optimize.json')
    expect(existsSync(join(tempDir, '.github/hooks/lek-optimize.json'))).toBe(false)
  })

  it('strips windsurf rimping hooks and deletes empty file', async () => {
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-legacy-windsurf-'))
    await mkdir(join(tempDir, '.windsurf'), { recursive: true })
    await writeFile(
      join(tempDir, '.windsurf/hooks.json'),
      JSON.stringify({
        hooks: {
          pre_tool_use: [{ command: 'rimping hooks pre-shell', show_output: true }],
        },
      }),
    )

    const removed = await removeLegacyAgentHooks({ root: tempDir })

    expect(removed).toContain('.windsurf/hooks.json')
    expect(existsSync(join(tempDir, '.windsurf/hooks.json'))).toBe(false)
  })

  it('removes antigravity rimping key and deletes empty hooks.json', async () => {
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-legacy-antigravity-'))
    await mkdir(join(tempDir, '.agents'), { recursive: true })
    await writeFile(
      join(tempDir, '.agents/hooks.json'),
      JSON.stringify({
        rimping: {
          PreToolUse: [
            {
              matcher: 'run_command',
              hooks: [{ type: 'command', command: 'rimping hooks pre-shell' }],
            },
          ],
        },
      }),
    )

    const removed = await removeLegacyAgentHooks({ root: tempDir })

    expect(removed).toContain('.agents/hooks.json')
    expect(existsSync(join(tempDir, '.agents/hooks.json'))).toBe(false)
  })

  it('strips gemini rimping hooks but keeps other settings', async () => {
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-legacy-gemini-'))
    await mkdir(join(tempDir, '.gemini'), { recursive: true })
    await writeFile(
      join(tempDir, '.gemini/settings.json'),
      JSON.stringify({
        theme: 'dark',
        hooks: {
          BeforeTool: [
            {
              matcher: 'run_shell_command',
              hooks: [
                {
                  name: 'rimping-pre-shell',
                  type: 'command',
                  command: 'rimping hooks pre-shell',
                },
              ],
            },
          ],
        },
      }),
    )

    const removed = await removeLegacyAgentHooks({ root: tempDir })

    expect(removed).toContain('.gemini/settings.json')
    expect(existsSync(join(tempDir, '.gemini/settings.json'))).toBe(true)
    const parsed = JSON.parse(await readFile(join(tempDir, '.gemini/settings.json'), 'utf-8'))
    expect(parsed.theme).toBe('dark')
    expect(parsed.hooks).toBeUndefined()
  })

  it('dry-run reports removals without writing', async () => {
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-legacy-dry-'))
    await mkdir(join(tempDir, '.github/hooks'), { recursive: true })
    const path = join(tempDir, '.github/hooks/lek-optimize.json')
    await writeFile(
      path,
      JSON.stringify({
        hooks: { preToolUse: [{ bash: 'rimping hooks pre-shell' }] },
      }),
    )

    const removed = await removeLegacyAgentHooks({ root: tempDir, dryRun: true })

    expect(removed).toContain('.github/hooks/lek-optimize.json')
    expect(existsSync(path)).toBe(true)
  })

  it('does not remove current agent hook files outside the legacy set', async () => {
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-legacy-keep-'))
    await mkdir(join(tempDir, '.codex'), { recursive: true })
    const codexPath = join(tempDir, '.codex/hooks.json')
    await writeFile(
      codexPath,
      JSON.stringify({
        hooks: {
          PreToolUse: [{ command: 'rimping hooks pre-shell' }],
        },
      }),
    )

    const removed = await removeLegacyAgentHooks({ root: tempDir })

    expect(removed).toEqual([])
    expect(existsSync(codexPath)).toBe(true)
  })

  it('initAgentHooks includes removed in result', async () => {
    tempDir = await mkdtemp(join(TEST_TMP, 'rimping-legacy-init-'))
    await mkdir(join(tempDir, '.github/hooks'), { recursive: true })
    await writeFile(
      join(tempDir, '.github/hooks/lek-optimize.json'),
      JSON.stringify({
        hooks: { preToolUse: [{ bash: 'rimping hooks pre-shell' }] },
      }),
    )

    // Empty agents list still runs legacy cleanup without scaffolding blocked paths.
    const result = await initAgentHooks({
      cwd: tempDir,
      templates: {},
      agents: [],
    })

    expect(result.removed).toContain('.github/hooks/lek-optimize.json')
    expect(result.created).toEqual([])
  })
})
