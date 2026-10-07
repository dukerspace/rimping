import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync } from 'node:fs'
import {
  initAgentsPack,
  mapAgentsPackDestPath,
  rewriteAgentsPackSkillPaths,
} from '../src/agents-pack-init.js'

async function writePack(sourceRoot: string): Promise<void> {
  await mkdir(join(sourceRoot, 'core'), { recursive: true })
  await mkdir(join(sourceRoot, 'skills', 'implement'), { recursive: true })
  await mkdir(join(sourceRoot, 'agents'), { recursive: true })
  await mkdir(join(sourceRoot, 'commands'), { recursive: true })
  await writeFile(
    join(sourceRoot, 'AGENTS.md'),
    'Skills: `skills/{implement,debug}/SKILL.md`.\n',
  )
  await writeFile(join(sourceRoot, 'budgets.yaml'), 'version: 1\n')
  await writeFile(join(sourceRoot, 'core', 'router.md'), '| Implement | `skills/implement/SKILL.md` |\n')
  await writeFile(join(sourceRoot, 'skills', 'implement', 'SKILL.md'), '# implement\n')
  await writeFile(join(sourceRoot, 'agents', 'general.md'), '# general\n')
  await writeFile(join(sourceRoot, 'commands', 'rimping-init.md'), '# command\n')
}

describe('mapAgentsPackDestPath', () => {
  it('nests skills under skills/rimping', () => {
    expect(mapAgentsPackDestPath('skills/implement/SKILL.md')).toBe(
      join('skills', 'rimping', 'implement', 'SKILL.md'),
    )
  })

  it('keeps agents under agents/', () => {
    expect(mapAgentsPackDestPath('agents/general.md')).toBe(join('agents', 'general.md'))
  })
})

describe('rewriteAgentsPackSkillPaths', () => {
  it('prefixes skills paths once', () => {
    expect(rewriteAgentsPackSkillPaths('`skills/implement/SKILL.md`')).toBe(
      '`skills/rimping/implement/SKILL.md`',
    )
    expect(rewriteAgentsPackSkillPaths('`skills/rimping/implement/SKILL.md`')).toBe(
      '`skills/rimping/implement/SKILL.md`',
    )
  })
})

describe('initAgentsPack', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('creates skills under skills/rimping and agents under agents/', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-pack-'))
    const sourceRoot = join(tempDir, 'templates')
    await writePack(sourceRoot)

    const result = await initAgentsPack({ cwd: tempDir, sourceRoot })

    expect(result.created.some((p) => p.endsWith('.agents/AGENTS.md'))).toBe(true)
    expect(
      result.created.some((p) =>
        p.endsWith(join('.agents', 'skills', 'rimping', 'implement', 'SKILL.md')),
      ),
    ).toBe(true)
    expect(
      result.created.some((p) => p.endsWith(join('.agents', 'agents', 'general.md'))),
    ).toBe(true)
    expect(result.created.some((p) => p.includes('commands'))).toBe(false)
    expect(existsSync(join(tempDir, '.agents/skills/implement'))).toBe(false)
    expect(existsSync(join(tempDir, '.agents/commands'))).toBe(false)

    expect(await readFile(join(tempDir, '.agents/AGENTS.md'), 'utf-8')).toBe(
      'Skills: `skills/rimping/{implement,debug}/SKILL.md`.\n',
    )
    expect(await readFile(join(tempDir, '.agents/core/router.md'), 'utf-8')).toBe(
      '| Implement | `skills/rimping/implement/SKILL.md` |\n',
    )
  })

  it('skips existing files without force', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-pack-'))
    const sourceRoot = join(tempDir, 'templates')
    await writePack(sourceRoot)
    await initAgentsPack({ cwd: tempDir, sourceRoot })
    await writeFile(join(sourceRoot, 'AGENTS.md'), '# updated\n')

    const result = await initAgentsPack({ cwd: tempDir, sourceRoot })

    expect(result.created).toHaveLength(0)
    expect(result.skipped.length).toBeGreaterThan(0)
    expect(await readFile(join(tempDir, '.agents/AGENTS.md'), 'utf-8')).toContain(
      'skills/rimping/',
    )
  })

  it('overwrites with force', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-pack-'))
    const sourceRoot = join(tempDir, 'templates')
    await writePack(sourceRoot)
    await initAgentsPack({ cwd: tempDir, sourceRoot })
    await writeFile(join(sourceRoot, 'AGENTS.md'), '# updated\n')

    const result = await initAgentsPack({ cwd: tempDir, sourceRoot, force: true })

    expect(result.created.some((p) => p.endsWith('.agents/AGENTS.md'))).toBe(true)
    expect(await readFile(join(tempDir, '.agents/AGENTS.md'), 'utf-8')).toBe('# updated\n')
  })

  it('dry-run does not write files', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-pack-'))
    const sourceRoot = join(tempDir, 'templates')
    await writePack(sourceRoot)

    const result = await initAgentsPack({ cwd: tempDir, sourceRoot, dryRun: true })

    expect(result.created.length).toBeGreaterThan(0)
    expect(existsSync(join(tempDir, '.agents/AGENTS.md'))).toBe(false)
  })

  it('removes legacy rimping-guidelines skill folder', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-pack-legacy-'))
    const sourceRoot = join(tempDir, 'templates')
    await writePack(sourceRoot)
    await mkdir(join(tempDir, '.agents/skills/rimping-guidelines'), { recursive: true })
    await writeFile(join(tempDir, '.agents/skills/rimping-guidelines/SKILL.md'), '# old\n')

    const result = await initAgentsPack({ cwd: tempDir, sourceRoot })

    expect(
      result.removed.some((p) => p.endsWith(join('.agents', 'skills', 'rimping-guidelines'))),
    ).toBe(true)
    expect(existsSync(join(tempDir, '.agents/skills/rimping-guidelines'))).toBe(false)
    expect(
      existsSync(join(tempDir, '.agents/skills/rimping/implement/SKILL.md')),
    ).toBe(true)
  })

  it('dry-run reports legacy guidelines removal without deleting', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-pack-legacy-dry-'))
    const sourceRoot = join(tempDir, 'templates')
    await writePack(sourceRoot)
    const legacyDir = join(tempDir, '.agents/skills/rimping-guidelines')
    await mkdir(legacyDir, { recursive: true })
    await writeFile(join(legacyDir, 'SKILL.md'), '# old\n')

    const result = await initAgentsPack({ cwd: tempDir, sourceRoot, dryRun: true })

    expect(
      result.removed.some((p) => p.endsWith(join('.agents', 'skills', 'rimping-guidelines'))),
    ).toBe(true)
    expect(existsSync(legacyDir)).toBe(true)
  })
})
