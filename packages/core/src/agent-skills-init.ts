import { access, cp, mkdir, rm } from 'node:fs/promises'
import { constants, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

export interface AgentSkillsInitOptions {
  cwd?: string
  force?: boolean
  dryRun?: boolean
}

export interface AgentSkillsInitResult {
  created: string[]
  skipped: string[]
  root: string
}

const SOURCE_SKILL_DIR = join('.skills', 'rimping-guidelines')
const SKILL_DIR = join('.agents', 'skills', 'rimping-guidelines')
const SKILL_FILE = 'SKILL.md'

export function findProjectRoot(start: string): string {
  let dir = start
  while (true) {
    if (existsSync(join(dir, '.git'))) return dir
    if (existsSync(join(dir, 'turbo.json'))) return dir
    if (existsSync(join(dir, '.rimping', 'config.json'))) return dir
    const parent = dirname(dir)
    if (parent === dir) return start
    dir = parent
  }
}

/** @deprecated Use findProjectRoot */
export const findGitRoot = findProjectRoot

export function resolveInitCwd(explicit?: string): string {
  if (explicit) return explicit
  if (process.env.INIT_CWD) return process.env.INIT_CWD
  return findProjectRoot(process.cwd())
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function initAgentSkills(
  options: AgentSkillsInitOptions,
): Promise<AgentSkillsInitResult> {
  const cwd = options.cwd ?? process.cwd()
  const root = join(cwd, SKILL_DIR)
  const source = join(cwd, SOURCE_SKILL_DIR)
  const skillPath = join(root, SKILL_FILE)
  const created: string[] = []
  const skipped: string[] = []

  const exists = await fileExists(skillPath)

  if (exists && !options.force) {
    skipped.push(skillPath)
    return { created, skipped, root }
  }

  if (options.dryRun) {
    created.push(skillPath)
    return { created, skipped, root }
  }

  await access(join(source, SKILL_FILE), constants.R_OK)
  await mkdir(dirname(root), { recursive: true })
  if (options.force) await rm(root, { recursive: true, force: true })
  await cp(source, root, { recursive: true, force: true })
  created.push(skillPath)

  return { created, skipped, root }
}
