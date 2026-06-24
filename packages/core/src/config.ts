import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'
import type { ProviderName } from './types.js'

export const CONFIG_DIR = '.rimping'
export const CONFIG_FILE = 'config.json'

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
}

export interface HooksConfig {
  enabled?: boolean
  optimizeOnSubmit?: boolean
  injectDiff?: boolean
  minPromptLength?: number
  minSavingsPercent?: number
  logStats?: boolean
}

export interface RimpingConfig {
  version: 1
  provider?: ProviderName
  maxTokens?: number
  defaultSkills?: string[]
  diff?: boolean
  hooks?: HooksConfig
  agents?: Partial<Record<AgentId, AgentConfig>>
}

const VALID_PROVIDERS: ProviderName[] = ['openai', 'claude', 'gemini', 'mock']

export function getConfigPath(cwd: string): string {
  return join(cwd, CONFIG_DIR, CONFIG_FILE)
}

export function defaultConfig(): RimpingConfig {
  const config: RimpingConfig = {
    version: 1,
    provider: 'openai',
    maxTokens: 8000,
    defaultSkills: [],
    diff: false,
    hooks: {
      enabled: true,
      optimizeOnSubmit: true,
      injectDiff: false,
      minPromptLength: 80,
      minSavingsPercent: 5,
      logStats: true,
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

export async function loadConfig(cwd: string): Promise<RimpingConfig | null> {
  const path = getConfigPath(cwd)
  if (!(await fileExists(path))) return null

  const content = await readFile(path, 'utf-8')
  const raw = JSON.parse(content) as unknown
  return validateConfig(raw)
}
