import { defineCommand } from 'citty'
import {
  AGENT_HOOK_IDS,
  AGENT_HOOK_SPECS,
  buildInitConfig,
  detectAgents,
  formatAgentHooksStatus,
  formatConfigStatus,
  getDetectedAgentIds,
  initAgentHooks,
  initConfig,
  resolveInitCwd,
  resolveInitTarget,
  type AgentId,
  type AgentHookId,
  type AgentProbeResult,
  type ConfigInitResult,
  type HooksInitResult,
} from '@rimping/core'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import consola from 'consola'
import { formatAgentHookLine, formatKeyValueLine, muted, section, title } from '../style.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface HooksProjectInitResult {
  root: string
  global: boolean
  config: ConfigInitResult
  hooks: HooksInitResult
  detectedAgents?: AgentId[]
  agents: AgentProbeResult[]
}

async function loadAgentHookTemplates(): Promise<Partial<Record<AgentHookId, string>>> {
  const templatesDir = join(__dirname, '..', '..', 'templates', 'agent-hooks')
  const templates: Partial<Record<AgentHookId, string>> = {}

  await Promise.all(
    AGENT_HOOK_IDS.map(async (id) => {
      templates[id] = await readFile(join(templatesDir, `${id}.json`), 'utf-8')
    }),
  )

  return templates
}

export async function runHooksInit(options: {
  cwd: string
  global?: boolean
  force?: boolean
  dryRun?: boolean
  detectedAgents?: AgentId[]
  agents?: AgentProbeResult[]
  skipConfig?: boolean
}): Promise<HooksProjectInitResult> {
  const global = options.global === true
  const configCwd = resolveInitTarget({ global, cwd: options.cwd })
  const hooksRoot = global ? configCwd : options.cwd

  const agents = options.agents ?? (await detectAgents(options.cwd))
  const detectedAgents =
    options.detectedAgents !== undefined
      ? options.detectedAgents
      : getDetectedAgentIds(agents)

  const config = options.skipConfig
    ? ({
        created: [],
        updated: [],
        skipped: [],
        path: '',
        config: buildInitConfig(detectedAgents),
      } satisfies ConfigInitResult)
    : await initConfig({
        cwd: configCwd,
        global,
        force: options.force,
        dryRun: options.dryRun,
        detectedAgents,
        templateConfig: buildInitConfig(detectedAgents, undefined, { detectedOnly: global }),
      })

  const hooks = await initAgentHooks({
    cwd: hooksRoot,
    global,
    force: options.force,
    dryRun: options.dryRun,
    templates: await loadAgentHookTemplates(),
  })

  return {
    root: hooksRoot,
    global,
    config,
    hooks,
    detectedAgents,
    agents,
  }
}

function agentNameForPath(path: string): string | undefined {
  const normalized = path.replace(/^~\//, '')
  const spec = AGENT_HOOK_SPECS.find((entry) => {
    const project = entry.projectPath
    const globalPath = entry.globalPath
    return normalized === project || normalized === globalPath || path.endsWith(project)
  })
  return spec?.name
}

export function printHooksInitStatus(
  result: HooksProjectInitResult,
  options: { heading: string; dryRun?: boolean },
): void {
  if (options.dryRun) {
    consola.info('Dry run — no files written')
  }

  consola.log('')
  consola.log(title(options.heading))
  consola.log('')

  printConfigStatus(result, {
    showSettings:
      result.config.created.length > 0 ||
      result.config.updated.length > 0 ||
      result.config.skipped.length > 0,
  })

  printAgentHooksStatus(result)

  if (result.hooks.created.length > 0 || result.hooks.skipped.length > 0) {
    consola.log('')
    consola.log(section(result.global ? 'Global Agent Hooks' : 'Project Agent Hooks'))
  }

  for (const file of result.hooks.created) {
    const agent = agentNameForPath(file)
    consola.success(agent ? `Created ${file} (${agent})` : `Created ${file}`)
  }

  for (const file of result.hooks.skipped) {
    const agent = agentNameForPath(file)
    consola.warn(
      agent
        ? `Skipped ${file} (${agent}, already exists — use --force to overwrite)`
        : `Skipped ${file} (already exists, use --force to overwrite)`,
    )
  }

  if (
    result.config.created.length === 0 &&
    result.config.updated.length === 0 &&
    result.config.skipped.length === 0 &&
    result.hooks.created.length === 0 &&
    result.hooks.skipped.length === 0
  ) {
    consola.log(muted('Nothing to do.'))
  }

  if (result.hooks.created.length > 0) {
    consola.log('')
    if (result.global) {
      consola.log(muted('Restart your AI agents to load the new global hooks.'))
    } else {
      consola.log(muted('Restart your AI agents (e.g. Cursor) to load the new hooks.'))
    }
  }

  consola.log('')
}

function printConfigStatus(
  result: HooksProjectInitResult,
  options: { showSettings: boolean },
): void {
  const configChanged =
    result.config.created.length > 0 ||
    result.config.updated.length > 0 ||
    result.config.skipped.length > 0

  if (!configChanged && !options.showSettings) return

  consola.log('')
  consola.log(section('Config'))

  for (const file of result.config.created) {
    consola.success(`Created ${file}`)
  }
  for (const file of result.config.updated) {
    consola.success(
      result.global
        ? `Updated ${file} (added missing providers and hooks)`
        : `Updated ${file} (provider, agents, hooks, shell, read)`,
    )
  }
  for (const file of result.config.skipped) {
    consola.info(`Up to date ${file}`)
  }

  if (options.showSettings) {
    consola.log('')
    consola.log(section('Settings'))
    for (const line of formatConfigStatus(result.config.config, {
      detectedAgents: result.detectedAgents,
      includeAgentSummary: false,
    })) {
      consola.log(formatKeyValueLine(line))
    }
  }
}

function printAgentHooksStatus(result: HooksProjectInitResult): void {
  consola.log('')
  consola.log(section('Agent Hooks'))
  for (const line of formatAgentHooksStatus(result.config.config, result.agents)) {
    consola.log(formatAgentHookLine(line))
  }
}

export const hooksInitCommand = defineCommand({
  meta: {
    description:
      'Initialize agent hook files and .rimping/config.json (project-local by default, use -g for global)',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Overwrite existing hook and config files',
      default: false,
    },
    dryRun: {
      type: 'boolean',
      description: 'Show what would be created without writing files',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
    cwd: {
      type: 'string',
      description: 'Working directory (default: directory where rimping was invoked)',
    },
    global: {
      type: 'boolean',
      alias: 'g',
      description:
        'Write global hook files (~/.cursor, ~/.claude, ~/.codex, ~/.gemini) instead of project-local',
      default: false,
    },
    'no-detect': {
      type: 'boolean',
      description: 'Skip agent detection when generating config',
      default: false,
    },
  },
  async run({ args }) {
    const projectCwd = resolveInitCwd(args.cwd)
    const global = args.global

    const agentProbes = await detectAgents(projectCwd)
    const detectedAgents = args['no-detect'] ? [] : getDetectedAgentIds(agentProbes)

    const result = await runHooksInit({
      cwd: projectCwd,
      global,
      force: args.force,
      dryRun: args.dryRun,
      detectedAgents,
      agents: agentProbes,
    })

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    printHooksInitStatus(result, {
      heading: global ? 'Rimping Hooks Init (global)' : 'Rimping Hooks Init',
      dryRun: args.dryRun,
    })
  },
})
