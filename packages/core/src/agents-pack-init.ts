import { access, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { constants, existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

export interface AgentsPackInitOptions {
  cwd?: string
  /** Absolute path to leanstack templates root (contains AGENTS.md). */
  sourceRoot: string
  force?: boolean
  dryRun?: boolean
}

export interface AgentsPackInitResult {
  created: string[]
  skipped: string[]
  removed: string[]
  root: string
}

/** Legacy skill path from `rimping skills init` before Leanstack pack layout. */
const LEGACY_GUIDELINES_DIR = join('skills', 'rimping-guidelines')

/** Top-level pack entries copied into `.agents/`. `commands/` is never included. */
export const AGENTS_PACK_ENTRIES = [
  'AGENTS.md',
  'budgets.yaml',
  'core',
  'principles',
  'skills',
  'agents',
  'adapters',
] as const

/** Project install nests mode skills under `.agents/skills/<namespace>/`. */
export const AGENTS_PACK_SKILLS_NAMESPACE = 'rimping'

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(full)))
    } else if (entry.isFile()) {
      files.push(full)
    }
  }
  return files
}

async function collectPackFiles(sourceRoot: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of AGENTS_PACK_ENTRIES) {
    const full = join(sourceRoot, entry)
    if (!(await pathExists(full))) continue
    const info = await stat(full)
    if (info.isDirectory()) {
      files.push(...(await listFilesRecursive(full)))
    } else if (info.isFile()) {
      files.push(full)
    }
  }
  return files.sort()
}

/**
 * Map template-relative path → `.agents/`-relative path.
 * `skills/...` → `skills/rimping/...`; `agents/...` stays under `agents/`.
 */
export function mapAgentsPackDestPath(rel: string): string {
  const normalized = rel.split(/[/\\]/).join('/')
  if (normalized === 'skills' || normalized.startsWith('skills/')) {
    const rest = normalized === 'skills' ? '' : normalized.slice('skills/'.length)
    return rest
      ? join('skills', AGENTS_PACK_SKILLS_NAMESPACE, ...rest.split('/'))
      : join('skills', AGENTS_PACK_SKILLS_NAMESPACE)
  }
  return join(...normalized.split('/'))
}

/** Rewrite template skill paths so installed pack points at `skills/rimping/`. */
export function rewriteAgentsPackSkillPaths(content: string): string {
  return content.replace(/(?<!skills\/rimping\/)skills\/(?!rimping\/)/g, 'skills/rimping/')
}

function needsSkillPathRewrite(rel: string): boolean {
  return /\.(md|mdc|markdown|txt|yaml|yml)$/i.test(rel)
}

/**
 * Copy the Leanstack pack into `<cwd>/.agents/`.
 * Skills install under `.agents/skills/rimping/`; agents under `.agents/agents/`.
 * Creates missing files only; skips existing unless `force`. Never copies `commands/`.
 */
export async function initAgentsPack(
  options: AgentsPackInitOptions,
): Promise<AgentsPackInitResult> {
  const cwd = options.cwd ?? process.cwd()
  const root = join(cwd, '.agents')
  const sourceRoot = options.sourceRoot
  const created: string[] = []
  const skipped: string[] = []
  const removed: string[] = []

  if (!(await pathExists(join(sourceRoot, 'AGENTS.md')))) {
    throw new Error(`Leanstack templates not found at ${sourceRoot} (missing AGENTS.md)`)
  }

  const sourceFiles = await collectPackFiles(sourceRoot)

  for (const sourceFile of sourceFiles) {
    const rel = relative(sourceRoot, sourceFile)
    const destRel = mapAgentsPackDestPath(rel)
    const destFile = join(root, destRel)
    const exists = await pathExists(destFile)

    if (exists && !options.force) {
      skipped.push(destFile)
      continue
    }

    created.push(destFile)
    if (options.dryRun) continue

    await mkdir(dirname(destFile), { recursive: true })

    if (needsSkillPathRewrite(rel)) {
      const raw = await readFile(sourceFile, 'utf-8')
      await writeFile(destFile, rewriteAgentsPackSkillPaths(raw), 'utf-8')
    } else {
      await cp(sourceFile, destFile, { force: true })
    }
  }

  const legacyGuidelines = join(root, LEGACY_GUIDELINES_DIR)
  if (await pathExists(legacyGuidelines)) {
    removed.push(legacyGuidelines)
    if (!options.dryRun) {
      await rm(legacyGuidelines, { recursive: true, force: true })
    }
  }

  return { created, skipped, removed, root }
}

/** Resolve a leanstack templates directory if it contains AGENTS.md. */
export function resolveAgentsPackSource(...candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'AGENTS.md'))) return candidate
  }
  return undefined
}
