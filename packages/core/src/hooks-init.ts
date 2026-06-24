import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
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
  root: string
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

function mergeNamedHooksSection(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing }
  for (const [name, config] of Object.entries(incoming)) {
    const prev = (merged[name] ?? {}) as Record<string, unknown>
    const next = config as Record<string, unknown>
    const events: Record<string, unknown> = { ...prev }
    for (const [event, entries] of Object.entries(next)) {
      if (event === 'enabled') {
        events.enabled = next.enabled
        continue
      }
      events[event] = mergeHookArrays(prev[event], entries)
    }
    merged[name] = events
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
    case 'merge-named-hooks':
      merged = mergeNamedHooksSection(existing, template)
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

export async function initAgentHooks(options: HooksInitOptions): Promise<HooksInitResult> {
  const root =
    options.root ?? (options.global ? homedir() : (options.cwd ?? process.cwd()))
  const created: string[] = []
  const skipped: string[] = []

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

  return { created, skipped, root }
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
