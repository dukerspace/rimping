import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { initAgentSkills } from '../src/agent-skills-init.js'

const TEMPLATE = '---\nname: rimping-guidelines\n---\n# Guidelines\n'

describe('initAgentSkills', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('creates SKILL.md on first run', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-init-'))
    const result = await initAgentSkills({ cwd: tempDir, templateContent: TEMPLATE })

    expect(result.created).toHaveLength(1)
    expect(result.skipped).toHaveLength(0)
    expect(result.created[0]).toEndWith('rimping-guidelines/SKILL.md')

    const content = await readFile(join(tempDir, '.agents/skills/rimping-guidelines/SKILL.md'), 'utf-8')
    expect(content).toBe(TEMPLATE)
  })

  it('skips existing file without force', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-init-'))
    await initAgentSkills({ cwd: tempDir, templateContent: TEMPLATE })
    const result = await initAgentSkills({ cwd: tempDir, templateContent: 'updated' })

    expect(result.created).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)

    const content = await readFile(join(tempDir, '.agents/skills/rimping-guidelines/SKILL.md'), 'utf-8')
    expect(content).toBe(TEMPLATE)
  })

  it('overwrites with force', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-init-'))
    await initAgentSkills({ cwd: tempDir, templateContent: TEMPLATE })
    const result = await initAgentSkills({ cwd: tempDir, templateContent: 'updated', force: true })

    expect(result.created).toHaveLength(1)
    expect(result.skipped).toHaveLength(0)

    const content = await readFile(join(tempDir, '.agents/skills/rimping-guidelines/SKILL.md'), 'utf-8')
    expect(content).toBe('updated')
  })

  it('dry-run does not write files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-init-'))
    const result = await initAgentSkills({ cwd: tempDir, templateContent: TEMPLATE, dryRun: true })

    expect(result.created).toHaveLength(1)
    expect(result.skipped).toHaveLength(0)

    const exists = await fileExists(join(tempDir, '.agents/skills/rimping-guidelines/SKILL.md'))
    expect(exists).toBe(false)
  })
})

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path)
    return true
  } catch {
    return false
  }
}
