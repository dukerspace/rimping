import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ProviderName } from './types.js'

export const CONFIG_DIR = '.rimping'
export const CONFIG_FILE = 'config.json'
export const GLOBAL_CONFIG_DIR = join(homedir(), '.rimping')

export type AgentId =
  | 'cursor'
  | 'claude'
  | 'codex'
  | 'chatgpt'
  | 'gemini'
  | 'antigravity'
  | 'windsurf'
  | 'copilot'
  | 'continue'
  | 'cline'
  | 'aider'

export interface AgentConfig {
  enabled?: boolean
  hooks?: HooksConfig
}

export interface HooksConfig {
  enabled?: boolean
  optimizeOnSubmit?: boolean
  injectDiff?: boolean
  minPromptLength?: number
  minSavingsPercent?: number
  logStats?: boolean
}

export interface ShellConfig {
  enabled?: boolean
  minSavingsPercent?: number
  maxTokens?: number
}

export interface ReadConfig {
  enabled?: boolean
  autoLimit?: boolean
  compressOutput?: boolean
  maxLines?: number
  minSavingsPercent?: number
  maxTokens?: number
}

export interface RimpingConfig {
  version: 1
  provider?: ProviderName
  maxTokens?: number
  defaultSkills?: string[]
  diff?: boolean
  hooks?: HooksConfig
  shell?: ShellConfig
  read?: ReadConfig
  agents?: Partial<Record<AgentId, AgentConfig>>
}

const VALID_PROVIDERS: ProviderName[] = ['openai', 'claude', 'gemini', 'copilot', 'mock']

export function getConfigPath(cwd: string): string {
  return join(cwd, CONFIG_DIR, CONFIG_FILE)
}

export function getGlobalConfigPath(): string {
  return join(GLOBAL_CONFIG_DIR, CONFIG_FILE)
}

export function defaultConfig(): RimpingConfig {
  const config: RimpingConfig = {
    version: 1,
    maxTokens: 8000,
    defaultSkills: [],
    diff: false,
    hooks: {
      enabled: true,
      optimizeOnSubmit: true,
      injectDiff: false,
      minPromptLength: 80,
      minSavingsPercent: 5,
      logStats: false,
    },
    shell: {
      enabled: true,
      minSavingsPercent: 10,
      maxTokens: 4000,
    },
    read: {
      enabled: true,
      autoLimit: true,
      compressOutput: true,
      maxLines: 200,
      minSavingsPercent: 10,
      maxTokens: 4000,
    },
  }

  return config
}

export function validateConfig(raw: unknown): RimpingConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Config must be a JSON object')
  }

  const obj = raw as Record<string, unknown>

  if (obj.version !== 1) {
    throw new Error(`Unsupported config version: ${String(obj.version)}`)
  }

  if (obj.provider !== undefined) {
    if (typeof obj.provider !== 'string' || !VALID_PROVIDERS.includes(obj.provider as ProviderName)) {
      throw new Error(`Invalid provider: ${String(obj.provider)}`)
    }
  }

  if (obj.maxTokens !== undefined && typeof obj.maxTokens !== 'number') {
    throw new Error('maxTokens must be a number')
  }

  if (obj.defaultSkills !== undefined && !Array.isArray(obj.defaultSkills)) {
    throw new Error('defaultSkills must be an array')
  }

  if (obj.diff !== undefined && typeof obj.diff !== 'boolean') {
    throw new Error('diff must be a boolean')
  }

  if (obj.hooks !== undefined) {
    if (typeof obj.hooks !== 'object' || obj.hooks === null) {
      throw new Error('hooks must be an object')
    }
    const hooks = obj.hooks as Record<string, unknown>
    if (hooks.enabled !== undefined && typeof hooks.enabled !== 'boolean') {
      throw new Error('hooks.enabled must be a boolean')
    }
    if (hooks.optimizeOnSubmit !== undefined && typeof hooks.optimizeOnSubmit !== 'boolean') {
      throw new Error('hooks.optimizeOnSubmit must be a boolean')
    }
    if (hooks.injectDiff !== undefined && typeof hooks.injectDiff !== 'boolean') {
      throw new Error('hooks.injectDiff must be a boolean')
    }
    if (hooks.minPromptLength !== undefined && typeof hooks.minPromptLength !== 'number') {
      throw new Error('hooks.minPromptLength must be a number')
    }
    if (hooks.minSavingsPercent !== undefined && typeof hooks.minSavingsPercent !== 'number') {
      throw new Error('hooks.minSavingsPercent must be a number')
    }
    if (hooks.logStats !== undefined && typeof hooks.logStats !== 'boolean') {
      throw new Error('hooks.logStats must be a boolean')
    }
  }

  if (obj.shell !== undefined) {
    if (typeof obj.shell !== 'object' || obj.shell === null) {
      throw new Error('shell must be an object')
    }
    const shell = obj.shell as Record<string, unknown>
    if (shell.enabled !== undefined && typeof shell.enabled !== 'boolean') {
      throw new Error('shell.enabled must be a boolean')
    }
    if (shell.minSavingsPercent !== undefined && typeof shell.minSavingsPercent !== 'number') {
      throw new Error('shell.minSavingsPercent must be a number')
    }
    if (shell.maxTokens !== undefined && typeof shell.maxTokens !== 'number') {
      throw new Error('shell.maxTokens must be a number')
    }
  }

  if (obj.read !== undefined) {
    if (typeof obj.read !== 'object' || obj.read === null) {
      throw new Error('read must be an object')
    }
    const read = obj.read as Record<string, unknown>
    if (read.enabled !== undefined && typeof read.enabled !== 'boolean') {
      throw new Error('read.enabled must be a boolean')
    }
    if (read.autoLimit !== undefined && typeof read.autoLimit !== 'boolean') {
      throw new Error('read.autoLimit must be a boolean')
    }
    if (read.compressOutput !== undefined && typeof read.compressOutput !== 'boolean') {
      throw new Error('read.compressOutput must be a boolean')
    }
    if (read.maxLines !== undefined && typeof read.maxLines !== 'number') {
      throw new Error('read.maxLines must be a number')
    }
    if (read.minSavingsPercent !== undefined && typeof read.minSavingsPercent !== 'number') {
      throw new Error('read.minSavingsPercent must be a number')
    }
    if (read.maxTokens !== undefined && typeof read.maxTokens !== 'number') {
      throw new Error('read.maxTokens must be a number')
    }
  }

  return obj as unknown as RimpingConfig
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function readConfigFile(path: string): Promise<RimpingConfig | null> {
  if (!(await fileExists(path))) return null
  const content = await readFile(path, 'utf-8')
  const raw = JSON.parse(content) as unknown
  return validateConfig(raw)
}

function mergeAgentConfigs(
  base?: Partial<Record<AgentId, AgentConfig>>,
  overlay?: Partial<Record<AgentId, AgentConfig>>,
): Partial<Record<AgentId, AgentConfig>> | undefined {
  if (!base && !overlay) return undefined

  const ids = new Set<AgentId>([
    ...(Object.keys(base ?? {}) as AgentId[]),
    ...(Object.keys(overlay ?? {}) as AgentId[]),
  ])
  const result: Partial<Record<AgentId, AgentConfig>> = {}

  for (const id of ids) {
    const prev = base?.[id]
    const next = overlay?.[id]
    if (!prev && !next) continue
    result[id] = {
      enabled: next?.enabled ?? prev?.enabled,
      hooks:
        prev?.hooks || next?.hooks ? { ...prev?.hooks, ...next?.hooks } : undefined,
    }
  }

  return result
}

export function mergeConfigs(base: RimpingConfig, overlay: Partial<RimpingConfig>): RimpingConfig {
  const result: RimpingConfig = {
    ...base,
    ...overlay,
    version: 1,
  }

  if (base.hooks || overlay.hooks) {
    result.hooks = { ...base.hooks, ...overlay.hooks }
  }
  if (base.shell || overlay.shell) {
    result.shell = { ...base.shell, ...overlay.shell }
  }
  if (base.read || overlay.read) {
    result.read = { ...base.read, ...overlay.read }
  }
  if (base.agents || overlay.agents) {
    result.agents = mergeAgentConfigs(base.agents, overlay.agents)
  }

  return result
}

/** Project-local config only (no global merge). */
export async function loadProjectConfig(cwd: string): Promise<RimpingConfig | null> {
  return readConfigFile(getConfigPath(cwd))
}

export async function loadConfig(cwd: string): Promise<RimpingConfig | null> {
  const global = await readConfigFile(getGlobalConfigPath())
  const project = await readConfigFile(getConfigPath(cwd))

  if (!global && !project) return null
  if (!global) return project
  if (!project) return global
  return mergeConfigs(global, project)
}
