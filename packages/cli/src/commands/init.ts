import { defineCommand } from 'citty'
import {
  buildInitConfig,
  detectAgents,
  formatAgentHooksStatus,
  formatConfigStatus,
  getDetectedAgentIds,
  initConfig,
  resolveInitCwd,
  resolveInitTarget,
  type AgentId,
  type AgentProbeResult,
  type ConfigInitResult,
} from '@rimping/core'
import consola from 'consola'
import { formatAgentHookLine, formatKeyValueLine, muted, section, title } from '../style.js'
import { printHooksInitStatus, runHooksInit, type HooksProjectInitResult } from './hooks-init.js'

function printConfigOnlyStatus(
  result: ConfigInitResult,
  options: {
    heading: string
    dryRun?: boolean
    detectedAgents?: AgentId[]
    agentProbes?: AgentProbeResult[]
    showAgentHooks?: boolean
    global?: boolean
  },
): void {
  if (options.dryRun) {
    consola.info('Dry run — no files written')
  }

  consola.log('')
  consola.log(title(options.heading))
  consola.log('')

  const configChanged =
    result.created.length > 0 || result.updated.length > 0 || result.skipped.length > 0

  if (configChanged) {
    consola.log('')
    consola.log(section('Config'))

    for (const file of result.created) {
      consola.success(`Created ${file}`)
    }
    for (const file of result.updated) {
      consola.success(
        options.global
          ? `Updated ${file} (added missing providers and hooks)`
          : `Updated ${file} (provider, agents, hooks, shell, read)`,
      )
    }
    for (const file of result.skipped) {
      consola.info(`Up to date ${file}`)
    }

    consola.log('')
    consola.log(section('Settings'))
    for (const line of formatConfigStatus(result.config, { detectedAgents: options.detectedAgents })) {
      consola.log(formatKeyValueLine(line))
    }
  }

  if (options.showAgentHooks) {
    consola.log('')
    consola.log(section('Agent Hooks'))
    for (const line of formatAgentHooksStatus(result.config, options.agentProbes)) {
      consola.log(formatAgentHookLine(line))
    }
  }

  if (result.created.length === 0 && result.updated.length === 0 && result.skipped.length === 0) {
    consola.log(muted('Nothing to do.'))
  }

  consola.log('')
}

export const initCommand = defineCommand({
  meta: {
    description: 'Initialize .rimping/config.json and agent hooks (project-local; use -g for global)',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Overwrite existing config.json and hook files',
      default: false,
    },
    'dry-run': {
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
    'no-detect': {
      type: 'boolean',
      description: 'Skip agent detection when generating config',
      default: false,
    },
    'no-hooks': {
      type: 'boolean',
      description: 'Skip scaffolding agent hooks (config only)',
      default: false,
    },
    global: {
      type: 'boolean',
      alias: 'g',
      description: 'Initialize ~/.rimping/config.json instead of project .rimping/config.json',
      default: false,
    },
  },
  async run({ args }) {
    const global = args.global
    const projectCwd = resolveInitCwd(args.cwd)
    const configCwd = resolveInitTarget({ global, cwd: args.cwd })

    let agentProbes: AgentProbeResult[] | undefined
    let detectedAgents: AgentId[] | undefined

    if (!args['no-detect']) {
      agentProbes = await detectAgents(configCwd)
      detectedAgents = getDetectedAgentIds(agentProbes)
    }

    const useHooksInit = !args['no-hooks']

    let hooksResult: HooksProjectInitResult | undefined
    let configResult: ConfigInitResult | undefined

    if (useHooksInit) {
      hooksResult = await runHooksInit({
        cwd: projectCwd,
        global,
        force: args.force,
        dryRun: args['dry-run'],
        detectedAgents: args['no-detect'] ? [] : detectedAgents,
        agents: agentProbes,
      })
    } else {
      configResult = await initConfig({
        cwd: configCwd,
        global,
        force: args.force,
        dryRun: args['dry-run'],
        detectedAgents,
        templateConfig: buildInitConfig(detectedAgents, undefined, { detectedOnly: global }),
      })
    }

    if (args.json) {
      console.log(JSON.stringify(hooksResult ?? configResult, null, 2))
      return
    }

    if (hooksResult) {
      printHooksInitStatus(hooksResult, {
        heading: global ? 'Rimping Init (global)' : 'Rimping Init',
        dryRun: args['dry-run'],
      })
      return
    }

    printConfigOnlyStatus(configResult!, {
      heading: global ? 'Rimping Init (global)' : 'Rimping Init',
      dryRun: args['dry-run'],
      detectedAgents,
      agentProbes,
      showAgentHooks: global,
      global,
    })
  },
})
