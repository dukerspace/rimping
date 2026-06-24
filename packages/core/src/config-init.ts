import { access, mkdir, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'
import {
  CONFIG_DIR,
  defaultConfig,
  getConfigPath,
  type AgentConfig,
  type AgentId,
  type RimpingConfig,
} from './config.js'
import { KNOWN_AGENT_IDS } from './agent-detect.js'

export function buildAgentsConfig(
  detectedAgents?: AgentId[],
): Partial<Record<AgentId, AgentConfig>> {
  const detected = new Set(detectedAgents ?? [])
  return Object.fromEntries(
    KNOWN_AGENT_IDS.map((id) => [id, { enabled: detected.has(id) }]),
  ) as Partial<Record<AgentId, AgentConfig>>
}

export interface ConfigInitOptions {
  cwd?: string
  force?: boolean
  dryRun?: boolean
  detectedAgents?: AgentId[]
  templateConfig?: RimpingConfig
}

export interface ConfigInitResult {
  created: string[]
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

export function buildInitConfig(
  detectedAgents?: AgentId[],
  overrides?: Partial<RimpingConfig>,
): RimpingConfig {
  const base = defaultConfig()
  return {
    ...base,
    ...overrides,
    hooks: { ...base.hooks, ...overrides?.hooks },
    agents: buildAgentsConfig(detectedAgents),
  }
}

export async function initConfig(options: ConfigInitOptions): Promise<ConfigInitResult> {
  const cwd = options.cwd ?? process.cwd()
  const configPath = getConfigPath(cwd)
  const configDir = join(cwd, CONFIG_DIR)
  const created: string[] = []
  const skipped: string[] = []

  const config =
    options.templateConfig ?? buildInitConfig(options.detectedAgents)

  const exists = await fileExists(configPath)

  if (exists && !options.force) {
    skipped.push(configPath)
    return { created, skipped, path: configPath, config }
  }

  if (options.dryRun) {
    created.push(configPath)
    return { created, skipped, path: configPath, config }
  }

  await mkdir(configDir, { recursive: true })
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  created.push(configPath)

  return { created, skipped, path: configPath, config }
}
