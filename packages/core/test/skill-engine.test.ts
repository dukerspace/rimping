import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { clearSkillCache, composeSkills, loadSkills, reconcileSkillsUsed, selectSkills } from '../src/skill-engine.js'

const SOFTWARE_ENGINEER_SKILL = `---
id: software-engineer
name: Software Engineer
tags: [engineering]
priority: 10
triggers: [bug, fix]
---

## Goal
Write terse prompts.

## Rules
- Drop pleasantries
- Use imperative mood

## Transformation
Compress and trim filler. Drop pleasantries.

## Output Style
Terse, imperative.
`

const TYPESCRIPT_REFACTOR_SKILL = `---
id: typescript-refactor
name: TypeScript Refactor
tags: [typescript, refactor]
priority: 20
triggers: [typescript, refactor, interface]
---

## Goal
Refactor TS code.

## Rules
- Keep types verbatim

## Transformation
Use imperative mood.

## Output Style
Terse.
`

async function writeSkillFixtures(root: string): Promise<void> {
  const skillsDir = join(root, 'skills')
  await mkdir(skillsDir, { recursive: true })
  await writeFile(join(skillsDir, 'software-engineer.md'), SOFTWARE_ENGINEER_SKILL)
  await writeFile(join(skillsDir, 'typescript-refactor.md'), TYPESCRIPT_REFACTOR_SKILL)
}

describe('skill-engine', () => {
  let tempDir: string

  beforeEach(async () => {
    clearSkillCache()
    tempDir = await mkdtemp(join(tmpdir(), 'rimping-skills-'))
    await writeSkillFixtures(tempDir)
  })

  afterEach(async () => {
    clearSkillCache()
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('loads skills from project skills directory', async () => {
    const skills = await loadSkills(tempDir)
    const ids = skills.map((s) => s.id)
    expect(ids).toContain('software-engineer')
    expect(ids).toContain('typescript-refactor')
  })

  it('auto-detects typescript-refactor skill', async () => {
    const skills = await loadSkills(tempDir)
    const selected = selectSkills(skills, {
      prompt: 'refactor this typescript interface',
      autoDetect: true,
    })
    expect(selected.some((s) => s.id === 'typescript-refactor')).toBe(true)
  })

  it('applies skill rules to prompt', async () => {
    const skills = await loadSkills(tempDir)
    const engineer = skills.find((s) => s.id === 'software-engineer')
    expect(engineer).toBeDefined()
    const { text, skillIds } = composeSkills([engineer!], 'please help me fix the bug')
    expect(skillIds).toContain('software-engineer')
    expect(text.toLowerCase()).not.toContain('please')
    expect(text.length).toBeLessThan('please help me fix the bug'.length)
  })

  it('selects skills by explicit ids', async () => {
    const skills = await loadSkills(tempDir)
    const selected = selectSkills(skills, {
      ids: ['typescript-refactor'],
      prompt: 'anything',
    })
    expect(selected).toHaveLength(1)
    expect(selected[0].id).toBe('typescript-refactor')
  })

  it('returns no skills when auto-detect finds nothing', async () => {
    const skills = await loadSkills(tempDir)
    const selected = selectSkills(skills, {
      prompt: 'unrelated generic text',
      autoDetect: true,
    })
    expect(selected).toHaveLength(0)
  })

  it('returns prompt unchanged when no skills selected', () => {
    const { text, skillIds } = composeSkills([], 'please help me fix the bug')
    expect(text).toBe('please help me fix the bug')
    expect(skillIds).toHaveLength(0)
  })

  it('does not report skills that had no effect on the prompt', async () => {
    const skills = await loadSkills(tempDir)
    const refactor = skills.find((s) => s.id === 'typescript-refactor')
    expect(refactor).toBeDefined()
    const { text, skillIds } = composeSkills([refactor!], 'refactor this typescript interface')
    expect(text).toBe('refactor this typescript interface')
    expect(skillIds).toHaveLength(0)
  })

  it('reconcileSkillsUsed drops skills that are no longer available', async () => {
    const skills = await loadSkills(tempDir)
    const reconciled = await reconcileSkillsUsed(tempDir, [
      'software-engineer',
      'git-diff-analyzer',
      'missing-skill',
    ])
    expect(reconciled).toEqual(['software-engineer'])
    expect(skills.some((skill) => skill.id === 'software-engineer')).toBe(true)
  })
})
