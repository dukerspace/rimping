import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectAgents, getDetectedAgentIds, runDoctor } from '../src/agent-detect.js'
import { initConfig } from '../src/config-init.js'

describe('detectAgents', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('detects cursor from project markers', async () => {
    tempDir = join(tmpdir(), `rimping-detect-${Date.now()}`)
    await mkdir(join(tempDir, '.cursor'), { recursive: true })
    await writeFile(join(tempDir, '.cursor/hooks.json'), '{}')

    const agents = await detectAgents(tempDir)
    const cursor = agents.find((a) => a.id === 'cursor')
    expect(cursor?.status).toBe('detected')
    expect(cursor?.evidence).toContain('.cursor/hooks.json')
  })

  it('detects copilot from project .copilot directory', async () => {
    tempDir = join(tmpdir(), `rimping-detect-${Date.now()}`)
    await mkdir(join(tempDir, '.copilot'), { recursive: true })

    const agents = await detectAgents(tempDir)
    const copilot = agents.find((a) => a.id === 'copilot')
    expect(copilot?.status).toBe('detected')
    expect(copilot?.evidence).toContain('.copilot/')
  })

  it('reports chatgpt as unknown', async () => {
    tempDir = join(tmpdir(), `rimping-detect-${Date.now()}`)
    const agents = await detectAgents(tempDir)
    const chatgpt = agents.find((a) => a.id === 'chatgpt')
    expect(chatgpt?.status).toBe('unknown')
    expect(chatgpt?.notes).toContain('No reliable local install marker')
  })

  it('returns not_found when no project markers present', async () => {
    tempDir = join(tmpdir(), `rimping-detect-${Date.now()}`)
    await mkdir(tempDir, { recursive: true })

    const agents = await detectAgents(tempDir)
    const cline = agents.find((a) => a.id === 'cline')
    expect(cline?.status).toBe('not_found')
    expect(cline?.evidence).toHaveLength(0)
  })
})

describe('getDetectedAgentIds', () => {
  it('filters detected agents only', () => {
    const ids = getDetectedAgentIds([
      { id: 'cursor', name: 'Cursor', status: 'detected', evidence: ['.cursor/'] },
      { id: 'codex', name: 'Codex', status: 'not_found', evidence: [] },
    ])
    expect(ids).toEqual(['cursor'])
  })
})

describe('runDoctor', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('reports missing config and agent skill', async () => {
    tempDir = join(tmpdir(), `rimping-doctor-${Date.now()}`)
    await mkdir(tempDir, { recursive: true })

    const result = await runDoctor(tempDir)
    expect(result.config.found).toBe(false)
    expect(result.skills.agentSkillInstalled).toBe(false)
    expect(result.summary.issues.some((i) => i.includes('rimping init'))).toBe(true)
    expect(result.summary.issues.some((i) => i.includes('skills init'))).toBe(true)
  })

  it('reports valid config when present', async () => {
    tempDir = join(tmpdir(), `rimping-doctor-${Date.now()}`)
    await mkdir(tempDir, { recursive: true })
    await initConfig({ cwd: tempDir })
    await mkdir(join(tempDir, '.agents/skills/rimping-guidelines'), { recursive: true })
    await writeFile(join(tempDir, '.agents/skills/rimping-guidelines/SKILL.md'), '# test')
    await mkdir(join(tempDir, '.cursor/hooks'), { recursive: true })
    await writeFile(
      join(tempDir, '.cursor/hooks.json'),
      JSON.stringify({
        version: 1,
        hooks: {
          beforeSubmitPrompt: [{ command: 'rimping hooks pre-send' }],
          preToolUse: [
            { command: 'rimping hooks pre-shell', matcher: 'Shell' },
            { command: 'rimping hooks pre-read', matcher: 'Read' },
          ],
          postToolUse: [{ command: 'rimping hooks post-read', matcher: 'Read' }],
        },
      }),
    )

    const result = await runDoctor(tempDir)
    expect(result.config.found).toBe(true)
    expect(result.config.valid).toBe(true)
    expect(result.skills.agentSkillInstalled).toBe(true)
    expect(result.summary.issues).toHaveLength(0)
  })

  it('counts project skills', async () => {
    tempDir = join(tmpdir(), `rimping-doctor-${Date.now()}`)
    await mkdir(join(tempDir, '.agents/skills/foo'), { recursive: true })
    await mkdir(join(tempDir, '.agents/skills/bar'), { recursive: true })
    await writeFile(join(tempDir, '.agents/skills/foo/SKILL.md'), '# foo')
    await writeFile(join(tempDir, '.agents/skills/bar/SKILL.md'), '# bar')

    const result = await runDoctor(tempDir)
    expect(result.skills.projectSkills).toBe(2)
  })
})
