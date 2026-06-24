import { defineCommand } from 'citty'
import { runDoctor, resolveInitCwd, type AgentProbeResult } from '@rimping/core'
import consola from 'consola'
import { checkLine, boldText, highlight, ok, padVisible, section, statusIcon, title, warn } from '../style.js'

export function formatAgentLine(agent: AgentProbeResult): string {
  const icon =
    agent.status === 'detected'
      ? statusIcon('ok')
      : agent.status === 'unknown'
        ? statusIcon('unknown')
        : statusIcon('fail')
  const detail =
    agent.status === 'detected'
      ? agent.evidence.join(', ')
      : agent.status === 'unknown'
        ? (agent.notes ?? 'unknown')
        : 'not found'
  const detailText =
    agent.status === 'detected'
      ? highlight(detail)
      : agent.status === 'unknown'
        ? warn(detail)
        : highlight(detail)
  return `  ${icon} ${padVisible(boldText(agent.name), 17)}${detailText}`
}

export const doctorCommand = defineCommand({
  meta: {
    description: 'Check AI agent setup and rimping project health',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
    cwd: {
      type: 'string',
      description: 'Working directory (default: directory where rimping was invoked)',
    },
  },
  async run({ args }) {
    const cwd = resolveInitCwd(args.cwd)
    const result = await runDoctor(cwd)

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
      if (result.summary.issues.length > 0) process.exit(1)
      return
    }

    consola.log('')
    consola.log(title('Rimping Doctor'))
    consola.log('')
    consola.log(section('AI Agents'))
    for (const agent of result.agents) {
      consola.log(formatAgentLine(agent))
    }

    consola.log('')
    consola.log(section('Project'))

    if (result.config.found && result.config.valid) {
      consola.log(checkLine('ok', '.rimping/config.json'))
    } else if (result.config.found && result.config.valid === false) {
      consola.log(checkLine('fail', `.rimping/config.json — ${result.config.error}`))
    } else {
      consola.log(checkLine('fail', '.rimping/config.json — missing (run: rimping init)'))
    }

    if (result.skills.projectSkills > 0) {
      consola.log(
        checkLine('ok', `${result.skills.projectSkills} agent skill(s) in ./.agents/skills/`),
      )
    } else {
      consola.log(checkLine('neutral', 'No agent skills in ./.agents/skills/'))
    }

    if (result.skills.agentSkillInstalled) {
      consola.log(checkLine('ok', 'rimping-guidelines agent skill installed'))
    } else {
      consola.log(
        checkLine('fail', 'rimping-guidelines agent skill missing (run: rimping skills init)'),
      )
    }

    if (result.hooks.hooksJson) {
      consola.log(checkLine('ok', '.cursor/hooks.json'))
    } else {
      consola.log(checkLine('neutral', '.cursor/hooks.json — not installed'))
    }

    if (result.hooks.beforeSubmitRegistered) {
      consola.log(checkLine('ok', 'beforeSubmitPrompt hook registered'))
    } else {
      consola.log(checkLine('fail', 'beforeSubmitPrompt hook missing (run: rimping hooks init)'))
    }

    if (result.hooks.preSend) {
      consola.log(checkLine('ok', 'pre-send hook configured (rimping hooks pre-send)'))
    }

    if (result.hooks.preShell) {
      consola.log(checkLine('ok', 'pre-shell hook configured (rimping hooks pre-shell)'))
    } else if (result.hooks.shellEnabled) {
      consola.log(checkLine('fail', 'pre-shell hook missing (run: rimping hooks init --force)'))
    }

    if (result.hooks.preRead) {
      consola.log(checkLine('ok', 'pre-read hook configured (rimping hooks pre-read)'))
    } else if (result.hooks.readEnabled) {
      consola.log(checkLine('fail', 'pre-read hook missing (run: rimping hooks init --force)'))
    }

    if (result.hooks.postRead) {
      consola.log(checkLine('ok', 'post-read hook configured (rimping hooks post-read)'))
    }

    if (result.hooks.enabled) {
      consola.log(checkLine('ok', 'hooks.enabled in config'))
    }

    if (result.hooks.shellEnabled) {
      consola.log(checkLine('ok', 'shell.enabled in config'))
    }

    if (result.hooks.readEnabled) {
      consola.log(checkLine('ok', 'read.enabled in config'))
    }

    if (result.hooks.lastRun) {
      const lr = result.hooks.lastRun
      consola.log(
        checkLine(
          'neutral',
          `last run: ${lr.originalTokens}→${lr.optimizedTokens} tokens (-${lr.savingsPercent}%, ${lr.durationMs}ms)`,
        ),
      )
    }

    if (result.hooks.logStats) {
      consola.log(checkLine('ok', 'hooks.logStats enabled (run: rimping hooks log)'))
    }

    consola.log('')
    const summary =
      `${result.summary.detectedCount} agent(s) detected` +
      (result.summary.issues.length > 0 ? `, ${result.summary.issues.length} issue(s)` : '')
    consola.log(
      result.summary.issues.length > 0 ? warn(summary) : ok(summary),
    )
    consola.log('')

    if (result.summary.issues.length > 0) {
      process.exit(1)
    }
  },
})
