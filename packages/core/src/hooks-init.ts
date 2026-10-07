import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { constants, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  AGENT_HOOK_IDS,
  AGENT_HOOK_SPECS,
  resolveAgentHookPath,
  type AgentHookId,
  type AgentHookMergeStrategy,
} from './agent-hook-specs.js'

export interface HooksInitOptions {
  cwd?: string
  /** Override install root (for tests). Defaults to cwd or homedir when global. */
  root?: string
  global?: boolean
  force?: boolean
  dryRun?: boolean
  /** Per-agent JSON template contents keyed by agent hook id. */
  templates: Partial<Record<AgentHookId, string>>
  /** Limit which agents to scaffold (default: all with a template). */
  agents?: AgentHookId[]
  /** @deprecated Use templates.cursor — kept for tests. */
  hooksJsonTemplate?: string
}

export interface HooksInitResult {
  created: string[]
  skipped: string[]
  removed: string[]
  root: string
}

export interface RemoveLegacyAgentHooksOptions {
  /** Install root (project cwd or home when global). */
  root: string
  global?: boolean
  dryRun?: boolean
}

const PRE_SEND = join('.cursor', 'hooks', 'pre-send.ts')
const CURSOR_HOOKS_JSON = join('.cursor', 'hooks.json')

function hookCommandMatches(command: string, fragment: string): boolean {
  return /\brimping\b/.test(command) && command.includes(fragment)
}

function parseJsonObject(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

function collectHookCommands(value: unknown, commands: string[]): void {
  if (!value) return
  if (Array.isArray(value)) {
    for (const entry of value) collectHookCommands(entry, commands)
    return
  }
  if (typeof value !== 'object') return
  const record = value as Record<string, unknown>
  if (typeof record.command === 'string') commands.push(record.command)
  if (typeof record.bash === 'string') commands.push(record.bash)
  for (const nested of Object.values(record)) {
    if (nested !== record.command && nested !== record.bash) {
      collectHookCommands(nested, commands)
    }
  }
}

function hasRimpingHook(content: string): boolean {
  const commands: string[] = []
  collectHookCommands(parseJsonObject(content), commands)
  return commands.some((command) => hookCommandMatches(command, 'hooks'))
}

function isRimpingCommandEntry(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (typeof record.command === 'string' && /\brimping\b/.test(record.command)) return true
  if (typeof record.bash === 'string' && /\brimping\b/.test(record.bash)) return true
  return false
}

function isHooksSectionEmpty(hooks: unknown): boolean {
  if (!hooks || typeof hooks !== 'object') return true
  if (Array.isArray(hooks)) return hooks.length === 0
  return Object.keys(hooks as object).length === 0
}

/** Remove array/object entries that invoke rimping hook commands. */
function stripRimpingEntries(value: unknown): unknown {
  if (Array.isArray(value)) {
    const next: unknown[] = []
    for (const entry of value) {
      if (isRimpingCommandEntry(entry)) continue
      const stripped = stripRimpingEntries(entry)
      if (stripped === undefined) continue
      if (Array.isArray(stripped) && stripped.length === 0) continue
      if (stripped && typeof stripped === 'object' && !Array.isArray(stripped)) {
        const rec = stripped as Record<string, unknown>
        const keys = Object.keys(rec)
        if (keys.length === 0) continue
        if (
          keys.every((key) => key === 'matcher' || key === 'hooks') &&
          isHooksSectionEmpty(rec.hooks)
        ) {
          continue
        }
      }
      next.push(stripped)
    }
    return next
  }
  if (value && typeof value === 'object') {
    if (isRimpingCommandEntry(value)) return undefined
    const record = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(record)) {
      const stripped = stripRimpingEntries(nested)
      if (stripped === undefined) continue
      if (Array.isArray(stripped) && stripped.length === 0) continue
      if (
        stripped &&
        typeof stripped === 'object' &&
        !Array.isArray(stripped) &&
        Object.keys(stripped as object).length === 0
      ) {
        continue
      }
      out[key] = stripped
    }
    return out
  }
  return value
}

function mergeHookArrays(existing: unknown, incoming: unknown): unknown {
  const existingList = Array.isArray(existing) ? [...existing] : []
  const incomingList = Array.isArray(incoming) ? incoming : []
  const merged = [...existingList]

  for (const entry of incomingList) {
    const commands: string[] = []
    collectHookCommands(entry, commands)
    const duplicate = commands.some((command) =>
      merged.some((other) => {
        const otherCommands: string[] = []
        collectHookCommands(other, otherCommands)
        return otherCommands.includes(command)
      }),
    )
    if (!duplicate) merged.push(entry)
  }

  return merged
}

function mergeHooksSection(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing }
  for (const [event, entries] of Object.entries(incoming)) {
    merged[event] = mergeHookArrays(existing[event], entries)
  }
  return merged
}

function mergeTemplate(
  strategy: AgentHookMergeStrategy,
  existingContent: string | undefined,
  templateContent: string,
): string {
  if (!existingContent) {
    try {
      const parsed = JSON.parse(templateContent) as Record<string, unknown>
      return JSON.stringify(parsed, null, 2) + '\n'
    } catch {
      return templateContent
    }
  }

  const template = parseJsonObject(templateContent)
  const existing = parseJsonObject(existingContent)
  let merged: Record<string, unknown>

  switch (strategy) {
    case 'merge-hooks':
      merged = {
        ...existing,
        hooks: mergeHooksSection(
          (existing.hooks ?? {}) as Record<string, unknown>,
          (template.hooks ?? {}) as Record<string, unknown>,
        ),
      }
      break
    case 'replace':
    default:
      merged = template
      break
  }

  return JSON.stringify(merged, null, 2) + '\n'
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function displayPath(root: string, absolutePath: string, global: boolean): string {
  if (absolutePath.startsWith(root)) {
    const rel = absolutePath.slice(root.length).replace(/^\//, '')
    if (global && rel) return '~/' + rel
    return rel || '.'
  }
  const home = homedir()
  if (absolutePath.startsWith(home)) return '~' + absolutePath.slice(home.length)
  return absolutePath
}

async function deleteLegacyFile(
  absolutePath: string,
  display: string,
  dryRun: boolean | undefined,
  removed: string[],
): Promise<void> {
  if (!(await fileExists(absolutePath))) return
  removed.push(display)
  if (!dryRun) await rm(absolutePath, { force: true })
}

async function stripOrDeleteHooksFile(options: {
  absolutePath: string
  display: string
  dryRun?: boolean
  removed: string[]
  /** When true, never delete the file — only rewrite stripped content. */
  keepFile: boolean
  /** Transform parsed JSON; return undefined to skip (no rimping found). */
  transform: (parsed: Record<string, unknown>) => { next: Record<string, unknown>; changed: boolean }
}): Promise<void> {
  if (!(await fileExists(options.absolutePath))) return
  const content = await readFile(options.absolutePath, 'utf-8')
  const parsed = parseJsonObject(content)
  const { next, changed } = options.transform(parsed)
  if (!changed) return

  options.removed.push(options.display)

  if (options.dryRun) return

  if (!options.keepFile && Object.keys(next).length === 0) {
    await rm(options.absolutePath, { force: true })
    return
  }

  if (
    !options.keepFile &&
    Object.keys(next).length === 1 &&
    isHooksSectionEmpty(next.hooks)
  ) {
    await rm(options.absolutePath, { force: true })
    return
  }

  await writeFile(options.absolutePath, JSON.stringify(next, null, 2) + '\n', { mode: 0o644 })
}

/**
 * Remove dropped-agent hook scaffolding (Gemini/Copilot/Windsurf/Antigravity).
 * Always runs (not gated on --force). Honors dryRun.
 */
export async function removeLegacyAgentHooks(
  options: RemoveLegacyAgentHooksOptions,
): Promise<string[]> {
  const root = options.root
  const global = options.global === true
  const removed: string[] = []

  if (global) {
    const geminiRel = '.gemini/settings.json'
    const geminiPath = join(root, geminiRel)
    await stripOrDeleteHooksFile({
      absolutePath: geminiPath,
      display: displayPath(root, geminiPath, true),
      dryRun: options.dryRun,
      removed,
      keepFile: true,
      transform: (parsed) => {
        if (!hasRimpingHook(JSON.stringify(parsed))) {
          return { next: parsed, changed: false }
        }
        const stripped = stripRimpingEntries(parsed) as Record<string, unknown>
        return { next: stripped, changed: true }
      },
    })
    return removed
  }

  // Copilot: rimping-owned file — delete when it contains rimping hooks.
  {
    const rel = '.github/hooks/lek-optimize.json'
    const absolutePath = join(root, rel)
    if (await fileExists(absolutePath)) {
      const content = await readFile(absolutePath, 'utf-8')
      if (hasRimpingHook(content)) {
        await deleteLegacyFile(absolutePath, displayPath(root, absolutePath, false), options.dryRun, removed)
      }
    }
  }

  // Windsurf: strip rimping entries; delete if hooks empty afterward.
  {
    const rel = '.windsurf/hooks.json'
    const absolutePath = join(root, rel)
    await stripOrDeleteHooksFile({
      absolutePath,
      display: displayPath(root, absolutePath, false),
      dryRun: options.dryRun,
      removed,
      keepFile: false,
      transform: (parsed) => {
        if (!hasRimpingHook(JSON.stringify(parsed))) {
          return { next: parsed, changed: false }
        }
        const stripped = stripRimpingEntries(parsed) as Record<string, unknown>
        return { next: stripped, changed: true }
      },
    })
  }

  // Antigravity: remove top-level "rimping" key; delete file if empty.
  {
    const rel = '.agents/hooks.json'
    const absolutePath = join(root, rel)
    await stripOrDeleteHooksFile({
      absolutePath,
      display: displayPath(root, absolutePath, false),
      dryRun: options.dryRun,
      removed,
      keepFile: false,
      transform: (parsed) => {
        if (!('rimping' in parsed) && !hasRimpingHook(JSON.stringify(parsed))) {
          return { next: parsed, changed: false }
        }
        const next = { ...parsed }
        delete next.rimping
        const stripped = stripRimpingEntries(next) as Record<string, unknown>
        return { next: stripped, changed: true }
      },
    })
  }

  // Gemini: strip rimping entries; never delete the settings file.
  {
    const rel = '.gemini/settings.json'
    const absolutePath = join(root, rel)
    await stripOrDeleteHooksFile({
      absolutePath,
      display: displayPath(root, absolutePath, false),
      dryRun: options.dryRun,
      removed,
      keepFile: true,
      transform: (parsed) => {
        if (!hasRimpingHook(JSON.stringify(parsed))) {
          return { next: parsed, changed: false }
        }
        const stripped = stripRimpingEntries(parsed) as Record<string, unknown>
        return { next: stripped, changed: true }
      },
    })
  }

  return removed
}

export async function initAgentHooks(options: HooksInitOptions): Promise<HooksInitResult> {
  const root =
    options.root ?? (options.global ? homedir() : (options.cwd ?? process.cwd()))
  const created: string[] = []
  const skipped: string[] = []

  const removed = await removeLegacyAgentHooks({
    root,
    global: options.global,
    dryRun: options.dryRun,
  })

  const agentIds =
    options.agents ??
    AGENT_HOOK_IDS.filter((id) => options.templates[id] ?? (id === 'cursor' && options.hooksJsonTemplate))

  for (const spec of AGENT_HOOK_SPECS) {
    if (!agentIds.includes(spec.id)) continue

    const relativePath = resolveAgentHookPath(spec, options.global === true)
    if (!relativePath) continue

    const template =
      options.templates[spec.id] ??
      (spec.id === 'cursor' ? options.hooksJsonTemplate : undefined)
    if (!template) continue

    const absolutePath = join(root, relativePath)
    const display = displayPath(root, absolutePath, options.global === true)
    const exists = await fileExists(absolutePath)

    if (exists && !options.force) {
      const existingContent = await readFile(absolutePath, 'utf-8')
      if (hasRimpingHook(existingContent)) {
        skipped.push(display)
        continue
      }
      if (spec.mergeStrategy === 'replace') {
        skipped.push(display)
        continue
      }
    }

    const content =
      exists && !options.force && spec.mergeStrategy !== 'replace'
        ? mergeTemplate(spec.mergeStrategy, await readFile(absolutePath, 'utf-8'), template)
        : mergeTemplate(spec.mergeStrategy, undefined, template)

    if (!options.dryRun) {
      await mkdir(dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, content, { mode: 0o644 })
    }

    created.push(display)
  }

  return { created, skipped, removed, root }
}

/** @deprecated Use initAgentHooks — initializes Cursor hooks only. */
export async function initCursorHooks(
  options: HooksInitOptions & { hooksJsonTemplate: string },
): Promise<HooksInitResult> {
  return initAgentHooks({
    ...options,
    templates: { cursor: options.hooksJsonTemplate, ...options.templates },
    agents: ['cursor'],
  })
}

function parseCursorHooksJson(content: string): {
  beforeSubmitPrompt?: Array<{ command?: string }>
  preToolUse?: Array<{ command?: string; matcher?: string }>
  postToolUse?: Array<{ command?: string; matcher?: string }>
} {
  const parsed = parseJsonObject(content)
  const hooks = (parsed.hooks ?? parsed) as {
    beforeSubmitPrompt?: Array<{ command?: string }>
    preToolUse?: Array<{ command?: string; matcher?: string }>
    postToolUse?: Array<{ command?: string; matcher?: string }>
  }
  return hooks
}

export async function checkCursorHooks(cwd: string): Promise<{
  hooksJson: boolean
  preSend: boolean
  preShell: boolean
  preRead: boolean
  postRead: boolean
  beforeSubmitRegistered: boolean
  preToolUseRegistered: boolean
  postToolUseRegistered: boolean
}> {
  const hooksJsonPath = join(cwd, CURSOR_HOOKS_JSON)
  const preSendPath = join(cwd, PRE_SEND)
  const hooksJson = existsSync(hooksJsonPath)

  let beforeSubmitRegistered = false
  let preToolUseRegistered = false
  let postToolUseRegistered = false
  let usesPreSendCli = false
  let usesPreShellCli = false
  let usesPreReadCli = false
  let usesPostReadCli = false

  if (hooksJson) {
    const content = await readFile(hooksJsonPath, 'utf-8')
    const hooks = parseCursorHooksJson(content)
    const submitEntries = hooks.beforeSubmitPrompt ?? []
    const toolEntries = hooks.preToolUse ?? []
    const postEntries = hooks.postToolUse ?? []

    beforeSubmitRegistered = submitEntries.length > 0
    preToolUseRegistered = toolEntries.length > 0
    postToolUseRegistered = postEntries.length > 0

    usesPreSendCli = submitEntries.some(
      (entry) => typeof entry.command === 'string' && hookCommandMatches(entry.command, 'pre-send'),
    )
    usesPreShellCli = toolEntries.some(
      (entry) => typeof entry.command === 'string' && hookCommandMatches(entry.command, 'pre-shell'),
    )
    usesPreReadCli = toolEntries.some(
      (entry) => typeof entry.command === 'string' && hookCommandMatches(entry.command, 'pre-read'),
    )
    usesPostReadCli = postEntries.some(
      (entry) => typeof entry.command === 'string' && hookCommandMatches(entry.command, 'post-read'),
    )
  }

  const preSend = existsSync(preSendPath) || usesPreSendCli
  const preShell = usesPreShellCli
  const preRead = usesPreReadCli
  const postRead = usesPostReadCli

  return {
    hooksJson,
    preSend,
    preShell,
    preRead,
    postRead,
    beforeSubmitRegistered,
    preToolUseRegistered,
    postToolUseRegistered,
  }
}
