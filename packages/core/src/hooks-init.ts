import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { constants, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface HooksInitOptions {
  cwd?: string
  force?: boolean
  dryRun?: boolean
  hooksJsonTemplate: string
}

export interface HooksInitResult {
  created: string[]
  skipped: string[]
  root: string
}

const HOOKS_JSON = join('.cursor', 'hooks.json')
const PRE_SEND = join('.cursor', 'hooks', 'pre-send.ts')

function hookCommandUsesRimping(command: string): boolean {
  return /\brimping\b/.test(command) && command.includes('pre-send')
}

export async function initCursorHooks(options: HooksInitOptions): Promise<HooksInitResult> {
  const cwd = options.cwd ?? process.cwd()
  const created: string[] = []
  const skipped: string[] = []

  const fullPath = join(cwd, HOOKS_JSON)
  const exists = await fileExists(fullPath)

  if (exists && !options.force) {
    skipped.push(HOOKS_JSON)
    return { created, skipped, root: cwd }
  }

  if (!options.dryRun) {
    await mkdir(join(cwd, '.cursor'), { recursive: true })
    await writeFile(fullPath, options.hooksJsonTemplate, { mode: 0o644 })
  }
  created.push(HOOKS_JSON)

  return { created, skipped, root: cwd }
}

export async function checkCursorHooks(cwd: string): Promise<{
  hooksJson: boolean
  preSend: boolean
  beforeSubmitRegistered: boolean
}> {
  const hooksJsonPath = join(cwd, HOOKS_JSON)
  const preSendPath = join(cwd, PRE_SEND)
  const hooksJson = existsSync(hooksJsonPath)

  let beforeSubmitRegistered = false
  let usesRimpingCli = false
  if (hooksJson) {
    try {
      const content = await readFile(hooksJsonPath, 'utf-8')
      const parsed = JSON.parse(content) as {
        hooks?: { beforeSubmitPrompt?: Array<{ command?: string }> }
      }
      const entries = parsed.hooks?.beforeSubmitPrompt ?? []
      beforeSubmitRegistered = entries.length > 0
      usesRimpingCli = entries.some(
        (entry) => typeof entry.command === 'string' && hookCommandUsesRimping(entry.command),
      )
    } catch {
      beforeSubmitRegistered = false
      usesRimpingCli = false
    }
  }

  const preSend = existsSync(preSendPath) || usesRimpingCli

  return { hooksJson, preSend, beforeSubmitRegistered }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}
