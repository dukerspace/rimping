import { access, mkdir, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  CONFIG_DIR,
  GLOBAL_CONFIG_DIR,
  defaultConfig,
  getConfigPath,
  getGlobalConfigPath,
  readConfigFile,
  type AgentConfig,
  type AgentId,
  type HooksConfig,
  type RimpingConfig,
} from './config.js'
import { KNOWN_AGENT_IDS, getAgentName, type AgentProbeResult } from './agent-detect.js'
import { resolveInitCwd } from './agent-skills-init.js'
import { mergeHooksConfig } from './resolve-options.js'

const HOOK_KEYS = [
  'enabled',
  'optimizeOnSubmit',
  'injectDiff',
  'minPromptLength',
  'minSavingsPercent',
  'logStats',
] as const satisfies readonly (keyof HooksConfig)[]

export function buildAgentHooksConfig(
  agentEnabled: boolean,
  topLevelHooks?: HooksConfig,
): HooksConfig {
  const base = { ...defaultConfig().hooks!, ...topLevelHooks }
  return {
    enabled: agentEnabled && base.enabled !== false,
    optimizeOnSubmit: base.optimizeOnSubmit ?? true,
    injectDiff: base.injectDiff ?? false,
    minPromptLength: base.minPromptLength ?? 80,
    minSavingsPercent: base.minSavingsPercent ?? 5,
    logStats: base.logStats ?? false,
  }
}

/** Strip hook fields that match top-level defaults for this agent's enabled state. */
export function compactAgentConfig(
  agent: AgentConfig,
  topLevelHooks?: HooksConfig,
): AgentConfig {
  const enabled = agent.enabled ?? false
  const defaults = buildAgentHooksConfig(enabled, topLevelHooks)
  if (!agent.hooks) {
    return { enabled }
  }

  const effective = { ...defaults, ...agent.hooks }
  if (!enabled) {
    effective.enabled = false
  }

  const hooks: HooksConfig = {}
  for (const key of HOOK_KEYS) {
    const value = effective[key]
    if (value !== defaults[key]) {
      Object.assign(hooks, { [key]: value })
    }
  }

  return Object.keys(hooks).length > 0 ? { enabled, hooks } : { enabled }
}

export function compactAgentsConfig(
  agents: Partial<Record<AgentId, AgentConfig>> | undefined,
  topLevelHooks?: HooksConfig,
): Partial<Record<AgentId, AgentConfig>> | undefined {
  if (!agents) return undefined
  return Object.fromEntries(
    Object.entries(agents).map(([id, agent]) => [
      id,
      compactAgentConfig(agent, topLevelHooks),
    ]),
  ) as Partial<Record<AgentId, AgentConfig>>
}

export function buildAgentsConfig(
  detectedAgents?: AgentId[],
  _topLevelHooks?: HooksConfig,
): Partial<Record<AgentId, AgentConfig>> {
  const detected = new Set(detectedAgents ?? [])
  return Object.fromEntries(
    KNOWN_AGENT_IDS.map((id) => [id, { enabled: detected.has(id) }]),
  ) as Partial<Record<AgentId, AgentConfig>>
}

/** Only detected agents — for `init -g` first run. */
export function buildDetectedAgentsConfig(
  detectedAgents?: AgentId[],
  _topLevelHooks?: HooksConfig,
): Partial<Record<AgentId, AgentConfig>> {
  const detected = detectedAgents ?? []
  return Object.fromEntries(detected.map((id) => [id, { enabled: true }])) as Partial<
    Record<AgentId, AgentConfig>
  >
}

export function mergeAgentsConfig(
  existing: Partial<Record<AgentId, AgentConfig>> | undefined,
  detectedAgents?: AgentId[],
  topLevelHooks?: HooksConfig,
): Partial<Record<AgentId, AgentConfig>> {
  const detected = new Set(detectedAgents ?? [])
  return Object.fromEntries(
    KNOWN_AGENT_IDS.map((id) => {
      const enabled = detected.has(id)
      const prev = existing?.[id]
      return [
        id,
        compactAgentConfig(
          {
            enabled,
            ...(prev?.hooks ? { hooks: prev.hooks } : {}),
          },
          topLevelHooks,
        ),
      ]
    }),
  ) as Partial<Record<AgentId, AgentConfig>>
}

/** Add missing detected agents only — never overwrite existing entries (`init -g`). */
export function mergeAgentsConfigAdditive(
  existing: Partial<Record<AgentId, AgentConfig>> | undefined,
  detectedAgents?: AgentId[],
  topLevelHooks?: HooksConfig,
): Partial<Record<AgentId, AgentConfig>> {
  const detected = new Set(detectedAgents ?? [])
  const result: Partial<Record<AgentId, AgentConfig>> = {}

  for (const [id, agent] of Object.entries(existing ?? {})) {
    result[id as AgentId] = compactAgentConfig(agent, topLevelHooks)
  }

  for (const id of KNOWN_AGENT_IDS) {
    if (result[id]) continue
    if (!detected.has(id)) continue
    result[id] = { enabled: true }
  }

  return result
}

export function mergeInitConfig(
  existing: RimpingConfig,
  detectedAgents?: AgentId[],
): RimpingConfig {
  const defaults = defaultConfig()
  const hooks = { ...defaults.hooks, ...existing.hooks }
  return {
    ...existing,
    hooks,
    shell: { ...defaults.shell, ...existing.shell },
    read: { ...defaults.read, ...existing.read },
    agents: compactAgentsConfig(
      mergeAgentsConfig(existing.agents, detectedAgents, hooks),
      hooks,
    ),
  }
}

/** Add missing top-level sections and agents only — preserve existing values (`init -g`). */
export function mergeInitConfigAdditive(
  existing: RimpingConfig,
  detectedAgents?: AgentId[],
): RimpingConfig {
  const defaults = defaultConfig()
  const hooks = existing.hooks ?? defaults.hooks
  return {
    ...existing,
    hooks,
    shell: existing.shell ?? defaults.shell,
    read: existing.read ?? defaults.read,
    agents: compactAgentsConfig(
      mergeAgentsConfigAdditive(existing.agents, detectedAgents, hooks),
      hooks,
    ),
  }
}

export function resolveInitTarget(options?: { global?: boolean; cwd?: string }): string {
  if (options?.global) return homedir()
  return resolveInitCwd(options?.cwd)
}

export interface ConfigInitOptions {
  cwd?: string
  global?: boolean
  force?: boolean
  dryRun?: boolean
  detectedAgents?: AgentId[]
  templateConfig?: RimpingConfig
}

export interface ConfigInitResult {
  created: string[]
  updated: string[]
  skipped: string[]
  path: string
  config: RimpingConfig
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export function formatHooksBrief(hooks?: HooksConfig): string {
  if (!hooks?.enabled) return 'hooks disabled'
  const parts: string[] = []
  if (hooks.optimizeOnSubmit) parts.push('optimizeOnSubmit')
  if (hooks.injectDiff) parts.push('injectDiff')
  if (hooks.logStats) parts.push('logStats')
  return parts.length > 0 ? `hooks: ${parts.join(', ')}` : 'hooks enabled'
}

export function formatAgentHookStatusLine(
  probe: AgentProbeResult,
  agentConfig?: AgentConfig,
  resolvedHooks?: HooksConfig,
): string {
  const name = probe.name.padEnd(16)
  const status =
    probe.status === 'detected'
      ? 'detected'
      : probe.status === 'unknown'
        ? 'unknown'
        : 'not found'
  const evidence =
    probe.status === 'detected' && probe.evidence.length > 0
      ? ` (${probe.evidence.slice(0, 2).join(', ')})`
      : probe.status === 'unknown' && probe.notes
        ? ` (${probe.notes})`
        : ''
  const agentState = agentConfig?.enabled ? 'agent on' : 'agent off'
  const hooks = formatHooksBrief(resolvedHooks ?? agentConfig?.hooks)
  return `${name} ${status}${evidence} · ${agentState} · ${hooks}`
}

export function formatAgentHooksStatus(
  config: RimpingConfig,
  agents?: AgentProbeResult[],
): string[] {
  const byId = agents ? Object.fromEntries(agents.map((agent) => [agent.id, agent])) : {}

  return KNOWN_AGENT_IDS.map((id) => {
    const probe: AgentProbeResult = byId[id] ?? {
      id,
      name: getAgentName(id),
      status: 'not_found',
      evidence: [],
    }
    return formatAgentHookStatusLine(
      probe,
      config.agents?.[id],
      mergeHooksConfig(config, id),
    )
  })
}

export function formatConfigStatus(
  config: RimpingConfig,
  options?: { detectedAgents?: AgentId[]; includeAgentSummary?: boolean },
): string[] {
  const lines: string[] = []
  lines.push(`maxTokens: ${config.maxTokens ?? 8000}`)
  if (config.provider) {
    lines.push(`provider: ${config.provider}`)
  }
  lines.push(`diff: ${String(config.diff ?? false)}`)

  const hooks = config.hooks
  if (hooks) {
    const parts = [hooks.enabled ? 'enabled' : 'disabled']
    if (hooks.optimizeOnSubmit) parts.push('optimizeOnSubmit')
    if (hooks.injectDiff) parts.push('injectDiff')
    if (hooks.logStats) parts.push('logStats')
    lines.push(`hooks: ${parts.join(', ')}`)
  }

  const shell = config.shell
  if (shell) {
    lines.push(
      `shell: ${shell.enabled ? 'enabled' : 'disabled'} (maxTokens ${shell.maxTokens ?? 4000})`,
    )
  }

  const read = config.read
  if (read) {
    const parts = [read.enabled ? 'enabled' : 'disabled']
    if (read.autoLimit) parts.push('autoLimit')
    if (read.compressOutput) parts.push('compressOutput')
    lines.push(`read: ${parts.join(', ')} (maxLines ${read.maxLines ?? 200})`)
  }

  if (options?.detectedAgents?.length) {
    lines.push(`detected on machine: ${options.detectedAgents.join(', ')}`)
  }

  if (options?.includeAgentSummary !== false) {
    const enabledAgents = Object.entries(config.agents ?? {})
      .filter(([, agent]) => agent.enabled)
      .map(([id]) => id)
    if (enabledAgents.length > 0) {
      lines.push(`enabled in config: ${enabledAgents.join(', ')}`)
    }
  }

  return lines
}

export function buildInitConfig(
  detectedAgents?: AgentId[],
  overrides?: Partial<RimpingConfig>,
  options?: { detectedOnly?: boolean },
): RimpingConfig {
  const base = defaultConfig()
  const hooks = { ...base.hooks, ...overrides?.hooks }
  const agents = options?.detectedOnly
    ? buildDetectedAgentsConfig(detectedAgents, hooks)
    : buildAgentsConfig(detectedAgents, hooks)
  return {
    ...base,
    ...overrides,
    hooks,
    shell: { ...base.shell, ...overrides?.shell },
    read: { ...base.read, ...overrides?.read },
    agents: compactAgentsConfig(agents, hooks),
  }
}

export async function initConfig(options: ConfigInitOptions): Promise<ConfigInitResult> {
  const cwd = resolveInitTarget({ global: options.global, cwd: options.cwd })
  const configPath = options.global ? getGlobalConfigPath() : getConfigPath(cwd)
  const configDir = options.global ? GLOBAL_CONFIG_DIR : join(cwd, CONFIG_DIR)
  const created: string[] = []
  const updated: string[] = []
  const skipped: string[] = []

  const freshConfig =
    options.templateConfig ??
    buildInitConfig(options.detectedAgents, undefined, { detectedOnly: options.global })
  const exists = await fileExists(configPath)

  let config: RimpingConfig
  let writeAction: 'create' | 'update' | 'overwrite' | 'skip'

  if (exists && options.force) {
    config = freshConfig
    writeAction = 'overwrite'
  } else if (exists) {
    const existing = await readConfigFile(configPath)
    if (!existing) {
      config = freshConfig
      writeAction = 'create'
    } else {
      config = options.global
        ? mergeInitConfigAdditive(existing, options.detectedAgents)
        : mergeInitConfig(existing, options.detectedAgents)
      writeAction =
        JSON.stringify(existing) === JSON.stringify(config) ? 'skip' : 'update'
    }
  } else {
    config = freshConfig
    writeAction = 'create'
  }

  if (writeAction === 'skip') {
    skipped.push(configPath)
    return { created, updated, skipped, path: configPath, config }
  }

  const outputConfig: RimpingConfig = {
    ...config,
    agents: compactAgentsConfig(config.agents, config.hooks),
  }

  if (options.dryRun) {
    if (writeAction === 'update') updated.push(configPath)
    else created.push(configPath)
    return { created, updated, skipped, path: configPath, config: outputConfig }
  }

  await mkdir(configDir, { recursive: true })
  await writeFile(configPath, JSON.stringify(outputConfig, null, 2) + '\n', 'utf-8')

  if (writeAction === 'update') updated.push(configPath)
  else created.push(configPath)

  return { created, updated, skipped, path: configPath, config: outputConfig }
}
